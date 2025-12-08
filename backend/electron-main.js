const {app, BrowserWindow} = require('electron');
const path = require('path');
const {startServer} = require('./server');

let mainWindow;

async function createWindow() {
  // Start the backend server on a fixed port to ensure localStorage persistence
  const port = await startServer(3000);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${ port }`);

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

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
