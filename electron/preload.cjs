const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronHttp', {
  request: (request) => ipcRenderer.invoke('http:request', request)
});
