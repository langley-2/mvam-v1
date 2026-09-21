import fs from 'node:fs'
import path from 'node:path'
import { listPackage, statFile, extractFile } from '@electron/asar'
import { findSecrets } from './security-patterns.mjs'

const runtimeFiles = new Set(['main.cjs', 'preload.cjs', 'review.cjs', 'review.mjs', 'repositoryAnalysis.cjs'])
export function inspectArchive(archive) {
  const failures = []
  let count = 0
  for (const entry of listPackage(archive)) {
    const name = entry.replace(/^[/\\]/, '').replaceAll('\\', '/')
    const stat = statFile(archive, name)
    if (stat.files) continue
    count++
    const allowed = name === 'package.json' || name === 'dist/index.html' || name === 'dist/favicon.svg' ||
      name === 'dist/THIRD_PARTY_NOTICES.txt' || /^dist\/assets\/[^/]+\.(js|css)$/.test(name) ||
      (name.startsWith('electron/') && runtimeFiles.has(name.slice(9)))
    if (!allowed || stat.link || stat.unpacked) failures.push(`${name}: unexpected archive entry`)
    if (!stat.link) {
      const content = extractFile(archive, name).toString('utf8')
      for (const kind of findSecrets(content)) failures.push(`${name}: possible ${kind}`)
      if (/\/Users\/[^/\s]+\/|[A-Z]:\\Users\\/.test(content)) failures.push(`${name}: developer home path`)
    }
  }
  for (const required of ['package.json', 'dist/index.html', ...[...runtimeFiles].map((f) => `electron/${f}`)]) {
    try { statFile(archive, required) } catch { failures.push(`${required}: missing`) }
  }
  if (failures.length) throw new Error(failures.join('\n'))
  console.log(`Archive check passed: ${count} files, no unexpected files or credential-pattern matches.`)
}
function archivesUnder(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? archivesUnder(file) : entry.name === 'app.asar' ? [file] : []
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const archives = process.argv[2] ? [process.argv[2]] : archivesUnder('release')
  if (!archives.length) throw new Error('No packaged app.asar found. Package the app first.')
  for (const archive of archives) inspectArchive(archive)
}
