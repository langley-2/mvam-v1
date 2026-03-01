const { app, BrowserWindow, shell } = require('electron')
const path = require('path')

const isDev = process.env.VITE_DEV_SERVER_URL != null

function isSafeExternalUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#111827',
  })

  // Don't show until ready to avoid flash
  win.once('ready-to-show', () => win.show())

  // Open external http/https links in the default browser (Excalidraw, Figma, etc.)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const isLocal =
      url.startsWith('file://') || url.startsWith('http://localhost')
    if (!isLocal) {
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
