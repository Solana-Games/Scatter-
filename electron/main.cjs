const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 800, webPreferences: { contextIsolation: true } });
  win.loadURL(process.env.SCATERX_WEB_URL || 'http://localhost:3000');
}

app.whenReady().then(createWindow);
