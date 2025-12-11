const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onBackendPort: (cb) => ipcRenderer.on('backend-port', (_, port) => cb(port)),
});
