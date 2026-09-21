import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createPackage } from '@electron/asar'
import { inspectArchive } from '../scripts/check-release.mjs'

test('release gate rejects bundled private files and likely credentials', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'taffy-archive-test-'))
  try {
    const source = path.join(root, 'app')
    await fs.mkdir(path.join(source, 'dist'), { recursive: true })
    await fs.mkdir(path.join(source, 'electron'))
    await fs.writeFile(path.join(source, 'package.json'), '{}')
    await fs.writeFile(path.join(source, 'dist/index.html'), '<html></html>')
    for (const name of ['main.cjs','preload.cjs','review.cjs','review.mjs','repositoryAnalysis.cjs']) await fs.writeFile(path.join(source, 'electron', name), '// placeholder')
    const archive = path.join(root, 'safe.asar')
    await createPackage(source, archive)
    assert.doesNotThrow(() => inspectArchive(archive))
    await fs.writeFile(path.join(source, 'secure.json'), JSON.stringify({ key: 'private encrypted data' }))
    const unexpected = path.join(root, 'unexpected.asar')
    await createPackage(source, unexpected)
    assert.throws(() => inspectArchive(unexpected), /secure.json: unexpected/)
    await fs.rm(path.join(source, 'secure.json'))
    await fs.writeFile(path.join(source, 'electron/main.cjs'), '// ' + 'sk-' + 'a'.repeat(30))
    const credential = path.join(root, 'credential.asar')
    await createPackage(source, credential)
    assert.throws(() => inspectArchive(credential), /possible OpenAI key/)
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})
