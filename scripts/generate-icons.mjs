import fs from 'node:fs/promises'
import sharp from 'sharp'
const svg = await fs.readFile('public/favicon.svg')
await fs.writeFile('build/icon.svg', svg)
const png = await sharp(svg).resize(1024, 1024).png().toBuffer()
await fs.writeFile('build/icon.png', png)
const icoPng = await sharp(svg).resize(256, 256).png().toBuffer()
const ico = Buffer.alloc(22)
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4)
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12)
ico.writeUInt32LE(icoPng.length, 14); ico.writeUInt32LE(22, 18)
await fs.writeFile('build/icon.ico', Buffer.concat([ico, icoPng]))
const chunks = []
for (const [type, size] of [['icp4',16], ['icp5',32], ['icp6',64], ['ic07',128], ['ic08',256], ['ic09',512], ['ic10',1024]]) {
  const data = await sharp(svg).resize(size, size).png().toBuffer()
  const header = Buffer.alloc(8); header.write(type); header.writeUInt32BE(data.length + 8, 4)
  chunks.push(header, data)
}
const header = Buffer.alloc(8); header.write('icns'); header.writeUInt32BE(8 + chunks.reduce((n, b) => n + b.length, 0), 4)
await fs.writeFile('build/icon.icns', Buffer.concat([header, ...chunks]))
console.log('Generated PNG, ICO and ICNS icons from public/favicon.svg.')
