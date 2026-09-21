import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { findSecrets } from './security-patterns.mjs'
const git = process.env.TAFFY_GIT || 'git'
const files = execFileSync(git, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean)
let failures = 0
for (const file of new Set(files)) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue
  const buffer = fs.readFileSync(file)
  if (buffer.includes(0)) continue
  for (const kind of findSecrets(buffer.toString('utf8'))) {
    console.error(`${file}: possible ${kind}`)
    failures++
  }
}
if (process.argv.includes('--history')) {
  const history = execFileSync(git, ['log', '--all', '-p', '--no-ext-diff', '--no-textconv'], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
  for (const kind of findSecrets(history)) { console.error(`Git history: possible ${kind}`); failures++ }
}
if (failures) process.exitCode = 1
else console.log(`Secret-pattern scan passed (${files.length} files${process.argv.includes('--history') ? ' and local Git history' : ''}).`)
