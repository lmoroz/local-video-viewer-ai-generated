const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onBackendPort: (cb) => ipcRenderer.on('backend-port', (_, port) => cb(port)),
  openNewWindow: (path) => ipcRenderer.send('open-new-window', path),
});
