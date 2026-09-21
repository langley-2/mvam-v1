const { app, BrowserWindow, shell, ipcMain, safeStorage, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { fileURLToPath } = require('url')
const { callReviewWithKey } = require('./review.cjs')
const { analyzeRepositoryWithKey } = require('./repositoryAnalysis.cjs')

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL != null
const devServerOrigin = isDev ? new URL(process.env.VITE_DEV_SERVER_URL).origin : null
const packagedIndexPath = path.resolve(__dirname, '../dist/index.html')

function isSafeExternalUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

function isTrustedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl)
    if (isDev && devServerOrigin && url.origin === devServerOrigin) return true
    if (!isDev && url.protocol === 'file:') {
      return path.resolve(fileURLToPath(url)) === packagedIndexPath
    }
  } catch {
    return false
  }
  return false
}

function assertTrustedSender(event) {
  if (event.senderFrame !== event.sender.mainFrame) throw new Error('Blocked request from child frame.')
  const senderUrl = event.senderFrame?.url || event.sender.getURL()
  if (!isTrustedAppUrl(senderUrl)) {
    throw new Error('Blocked request from untrusted renderer.')
  }
}

// ─── Secure key storage ───────────────────────────────────────────────────────

function getSecureFilePath() {
  return path.join(app.getPath('userData'), 'secure.json')
}

function readStoredApiKey() {
  if (!safeStorage.isEncryptionAvailable()) return ''
  try {
    const raw = fs.readFileSync(getSecureFilePath(), 'utf8')
    const { key } = JSON.parse(raw)
    if (!key) return ''
    return safeStorage.decryptString(Buffer.from(key, 'base64'))
  } catch {
    return ''
  }
}

function clearStoredApiKey() {
  try {
    fs.unlinkSync(getSecureFilePath())
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Could not remove the stored API key.')
  }
}

ipcMain.handle('safe-key:has', (event) => {
  assertTrustedSender(event)
  return !!readStoredApiKey()
})

ipcMain.handle('safe-key:set', (event, key) => {
  assertTrustedSender(event)
  if (!String(key || '').trim()) {
    clearStoredApiKey()
    return true
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is not available on this device.')
  }
  try {
    const encrypted = safeStorage.encryptString(String(key))
    fs.writeFileSync(getSecureFilePath(), JSON.stringify({ key: encrypted.toString('base64') }), { encoding: 'utf8', mode: 0o600 })
    fs.chmodSync(getSecureFilePath(), 0o600)
    return true
  } catch {
    throw new Error('Failed to save API key securely.')
  }
})

ipcMain.handle('safe-key:clear', (event) => {
  assertTrustedSender(event)
  clearStoredApiKey()
  return true
})

ipcMain.handle('review:run', async (event, params) => {
  assertTrustedSender(event)
  return callReviewWithKey({
    apiKey: readStoredApiKey(),
    model: params?.model,
    provider: params?.provider,
    sectionId: params?.sectionId,
    sectionData: params?.sectionData,
    customSections: params?.customSections,
    guided: params?.guided === true,
    interviewContext: params?.guided === true ? params?.interviewContext : '',
  })
})

const approvedRepositoryPaths = new Set()

// ─── Repository analysis ─────────────────────────────────────────────────────

ipcMain.handle('repo:choose-local', async (event) => {
  assertTrustedSender(event)
  const browserWindow = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(browserWindow, {
    title: 'Choose a git repository',
    properties: ['openDirectory'],
  })

  if (result.canceled || !result.filePaths?.[0]) return null
  approvedRepositoryPaths.add(path.resolve(result.filePaths[0]))
  return {
    type: 'local',
    path: result.filePaths[0],
    displayName: path.basename(result.filePaths[0]),
  }
})

ipcMain.handle('repo:analyze', async (event, params) => {
  assertTrustedSender(event)
  if (params?.source?.type === 'local' && !approvedRepositoryPaths.has(path.resolve(String(params.source.path || '')))) {
    throw new Error('Choose this repository again using the folder picker before analyzing it.')
  }
  return analyzeRepositoryWithKey({
    apiKey: readStoredApiKey(),
    provider: params?.provider,
    model: params?.model,
    source: params?.source,
    options: params?.options,
    userDataPath: app.getPath('userData'),
  })
})

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    // Align native controls with the centre of the renderer's 64px header.
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 25 } } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#f3f8fc',
  })

  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  win.webContents.session.setPermissionCheckHandler(() => false)
  win.webContents.on('will-attach-webview', (event) => event.preventDefault())

  // Don't show until ready to avoid flash
  win.once('ready-to-show', () => win.show())

  // Open external http/https links in the default browser (Excalidraw, Figma, etc.)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedAppUrl(url)) {
      event.preventDefault()
      if (isSafeExternalUrl(url)) shell.openExternal(url)
    }
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

// Re-open window when clicking dock icon (Mac behaviour)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
