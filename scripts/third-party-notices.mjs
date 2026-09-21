import fs from 'node:fs'
const packages = ['react', 'react-dom', 'scheduler', 'marked', 'dompurify']
const notices = packages.map((name) => {
  const root = `node_modules/${name}`
  const metadata = JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8'))
  const file = fs.readdirSync(root).find((name) => /^licen[cs]e(?:\.|$)/i.test(name))
  if (!file) throw new Error(`No license found for ${name}`)
  return `${name} ${metadata.version}\n${fs.readFileSync(`${root}/${file}`, 'utf8')}`
})
fs.writeFileSync('dist/THIRD_PARTY_NOTICES.txt', notices.join('\n\n--------------------\n\n'))
