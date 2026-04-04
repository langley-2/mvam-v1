const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getApiKey: () => ipcRenderer.invoke('safe-key:get'),
  setApiKey: (key) => ipcRenderer.invoke('safe-key:set', key),
  clearApiKey: () => ipcRenderer.invoke('safe-key:clear'),
})
