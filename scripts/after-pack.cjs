const path = require('node:path')
exports.default = async (context) => {
  const resources = context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(context.appOutDir, 'resources')
  const { inspectArchive } = await import('./check-release.mjs')
  inspectArchive(path.join(resources, 'app.asar'))
}
