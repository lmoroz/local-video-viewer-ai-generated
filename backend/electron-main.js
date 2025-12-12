const {app, BrowserWindow, protocol, net, ipcMain, shell} = require('electron');
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

  const windowConfig = {
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: true,
    },
  };

  const registerHandlers = (win) => {
    win.webContents.setWindowOpenHandler(({url}) => {
      const {shell} = require('electron');
      shell.openExternal(url);
      return {action: 'deny'};
    });

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('backend-port', port);
    });

    win.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
        const {shell} = require('electron');
        shell.openExternal(url);
      }
    });
  };

  mainWindow = new BrowserWindow(windowConfig);
  ipcMain.on('open-new-window', async (_event, routePath) => {
    let win = new BrowserWindow(windowConfig);

    registerHandlers(win);
    await win.loadURL(`lmorozlvp://app/index.html#${ routePath }`);
    win.on('closed', function() {win = null;});
  });

  registerHandlers(mainWindow);
  await mainWindow.loadURL('lmorozlvp://app/index.html');
  mainWindow.on('closed', function() {mainWindow = null;});
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
