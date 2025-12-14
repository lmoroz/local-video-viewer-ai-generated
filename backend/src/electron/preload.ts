import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onBackendPort: (cb: (port: number) => void) => ipcRenderer.on('backend-port', (_, port) => cb(port)),
  openNewWindow: (path: string) => ipcRenderer.send('open-new-window', path),
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
