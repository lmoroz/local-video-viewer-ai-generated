import { app, protocol, net, ipcMain, shell, BrowserWindow } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
// Импортируем server ПОСЛЕ установки переменных окружения, если это возможно,
// но так как import всплывают, мы установим переменную в самом начале main.ts
// Однако лучше передать путь в функцию startServer, но для минимальных изменений кода используем env.

// !!! ВАЖНО: Устанавливаем путь для данных приложения
process.env.APP_USER_DATA = app.getPath('userData');

import { startServer } from '../server';

let mainWindow: BrowserWindow | null;
const isDev = !app.isPackaged;

// В режиме разработки (ts-node) путь отличается от продакшена (dist)
const DIST_PATH = isDev
  ? path.join(__dirname, '../../frontend/dist')
  : path.join(__dirname, '../../frontend-dist');

async function createWindow() {
  protocol.handle('lmorozlvp', (req: Request) => {
    try {
      const requestUrl = new URL(req.url);
      let pathName = decodeURIComponent(requestUrl.pathname);

      if (pathName === '/' || !pathName) pathName = '/index.html';
      const filePath = path.join(DIST_PATH, pathName);

      console.log('--- [DEBUG] Target Path:', filePath);

      if (!existsSync(filePath)) {
        console.error('--- [ERROR] File NOT found on disk!');
        return new Response(`File not found: ${filePath}`, { status: 404 });
      }

      const fileUrl = pathToFileURL(filePath).toString();
      return net.fetch(fileUrl).catch(err => {
        console.error('--- [ERROR] net.fetch failed:', err);
        return new Response('Internal Error', { status: 500 });
      });
    } catch (error) {
      console.error('--- [CRITICAL ERROR] inside protocol handler:', error);
      return new Response('Handler Error', { status: 500 });
    }
  });

  const port = await startServer();

  const windowConfig = {
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../icon.png'),
    frame: false,        // Убираем рамки
    backgroundMaterial: 'acrylic', // https://www.electronjs.org/docs/latest/api/browser-window#winsetbackgroundmaterialmaterial-windows
    autoHideMenuBar: true,
    // fullscreenable: true,
    // hasShadow: true,
    // roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // @ts-ignore
      allowRunningInsecureContent: true,
    },
  };

  const registerHandlers = (win: BrowserWindow) => {
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    win.webContents.on('did-finish-load', () => {
      win.webContents.send('backend-port', port);
    });

    win.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  };

  // @ts-ignore
  mainWindow = new BrowserWindow(windowConfig);

  ipcMain.on('open-new-window', async (_event, routePath) => {
    // @ts-ignore
    let win: BrowserWindow | null = new BrowserWindow(windowConfig);
    registerHandlers(win);
    await win.loadURL(`lmorozlvp://app/index.html#${routePath}`);
    win.on('closed', () => {
      win = null;
    });
  });

  registerHandlers(mainWindow);
  await mainWindow.loadURL('lmorozlvp://app/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Global IPC Handlers
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

protocol.registerSchemesAsPrivileged([
  { scheme: 'lmorozlvp', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
