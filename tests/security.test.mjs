import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { isAllowedRemoteUrl, readCandidateFile, isSensitivePath, redactTextWithReport } from '../electron/repositoryAnalysis.cjs'
import { createProjectData, createVersionData, loadStore, saveStore } from '../src/storage.js'
import { loadApiKeyState, setApiKey, clearApiKey } from '../src/secureKey.js'

test('remote URLs reject credentials, queries and executable transports', () => {
  for (const url of ['https://github.com/owner/repo.git', 'ssh://git@github.com/owner/repo', 'git@github.com:owner/repo.git']) assert.equal(isAllowedRemoteUrl(url), true, url)
  for (const url of ['http://example.com/repo', 'file:///tmp/repo', 'ext::sh -c evil', '--upload-pack=evil', 'https://' + 'user:pass@github.com/repo', 'https://github.com/repo?token=secret', 'ssh://git@host/repo#secret']) assert.equal(isAllowedRemoteUrl(url), false, url)
})
test('repository reads cannot escape through parent symlinks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'taffy-test-'))
  try {
    await fs.mkdir(path.join(root, 'repo')); await fs.mkdir(path.join(root, 'outside'))
    await fs.writeFile(path.join(root, 'outside', 'README.md'), 'outside private text')
    await fs.symlink(path.join(root, 'outside'), path.join(root, 'repo', 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
    assert.equal(await readCandidateFile(path.join(root, 'repo'), 'linked/README.md'), null)
    assert.equal(await readCandidateFile(path.join(root, 'repo'), '../outside/README.md'), null)
    await fs.writeFile(path.join(root, 'repo', 'README.md'), 'safe architecture')
    assert.equal((await readCandidateFile(path.join(root, 'repo'), 'README.md')).text, 'safe architecture')
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})
test('repository evidence excludes known sensitive paths and redacts assignments', () => {
  for (const file of ['.env.production', '.aws/config', 'credentials.json', 'private.key']) assert.equal(isSensitivePath(file), true)
  assert.doesNotMatch(redactTextWithReport('password=' + JSON.stringify('sample-sensitive-value')).text, /sample-sensitive-value/)
})
test('project guidance persists across versions and remains isolated per project', () => {
  const map = new Map()
  globalThis.localStorage = { getItem: (key) => map.get(key), setItem: (key, value) => map.set(key, value) }
  try {
    const a = createProjectData('A'); const b = createProjectData('B')
    a.guided = true; a.interviewContext = 'Backend interview'
    for (const name of ['v1', 'v2']) { const version = createVersionData(name); a.versions[version.id] = version }
    saveStore({ projects: { [a.id]: a, [b.id]: b } })
    const loaded = loadStore().projects
    assert.equal(loaded[a.id].guided, true)
    assert.equal(loaded[a.id].interviewContext, 'Backend interview')
    assert.equal(Object.keys(loaded[a.id].versions).length, 2)
    assert.equal(loaded[b.id].guided, false)
    assert.equal(loaded[b.id].interviewContext, '')
  } finally { delete globalThis.localStorage }
})
test('browser keys use memory and remove legacy plaintext storage', async () => {
  const map = new Map([['taffy_api_key_v1', 'legacy-test-key']])
  globalThis.localStorage = { getItem: (key) => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) }
  try {
    assert.equal((await loadApiKeyState()).configured, false)
    assert.equal(map.size, 0)
    await setApiKey('session-test-key')
    assert.deepEqual(await loadApiKeyState(), { configured: true, key: 'session-test-key' })
    assert.equal(map.size, 0)
    await clearApiKey()
    assert.equal((await loadApiKeyState()).configured, false)
  } finally { delete globalThis.localStorage }
})
