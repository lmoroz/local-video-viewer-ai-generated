const {app, BrowserWindow, protocol, net} = require('electron');
const path = require('path');
const {startServer} = require('./server');
const {pathToFileURL} = require('url');
const {existsSync} = require('node:fs');

let mainWindow;
const isDev = !app.isPackaged;

const DIST_PATH = isDev
                  ? path.join(__dirname, '../frontend/dist')
                  : path.join(__dirname, 'frontend-dist');

async function createWindow() {

  protocol.handle('lmorozlvp', (req) => {
    try {
      const requestUrl = new URL(req.url);
      let pathName = decodeURIComponent(requestUrl.pathname);

      if (pathName === '/' || !pathName) pathName = '/index.html';
      const filePath = path.join(DIST_PATH, pathName);

      // --- ОТЛАДКА ---
      console.log('--- [DEBUG] Request:', req.url);
      console.log('--- [DEBUG] Target Path:', filePath);

      if (!existsSync(filePath)) {
        console.error('--- [ERROR] File NOT found on disk!');
        return new Response(`File not found: ${ filePath }`, {status: 404});
      }

      const fileUrl = pathToFileURL(filePath).toString();
      console.log('--- [DEBUG] Fetching:', fileUrl);

      return net.fetch(fileUrl).catch(err => {
        console.error('--- [ERROR] net.fetch failed:', err);
        return new Response('Internal Error', {status: 500});
      });
    } catch (error) {
      console.error('--- [CRITICAL ERROR] inside protocol handler:', error);
      return new Response('Handler Error', {status: 500});
    }
  });

  // Start the backend server on a fixed port to ensure localStorage persistence
  const port = await startServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    const {shell} = require('electron');
    shell.openExternal(url);
    return {action: 'deny'};
  });

  mainWindow.loadURL('lmorozlvp://app/index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('backend-port', port);
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      const {shell} = require('electron');
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

protocol.registerSchemesAsPrivileged([
  {scheme: 'lmorozlvp', privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}},
]);

app.on('ready', createWindow);

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});
