const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  hasApiKey: () => ipcRenderer.invoke('safe-key:has'),
  setApiKey: (key) => ipcRenderer.invoke('safe-key:set', key),
  clearApiKey: () => ipcRenderer.invoke('safe-key:clear'),
  runReview: (params) => ipcRenderer.invoke('review:run', params),
  chooseRepositoryDirectory: () => ipcRenderer.invoke('repo:choose-local'),
  analyzeRepository: (params) => ipcRenderer.invoke('repo:analyze', params),
})
