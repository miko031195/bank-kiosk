const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Əsas ekranın eni və hündürlüyü avtomatik olaraq əldə edilir
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    // Sabit rəqəmlər dinamik dəyişənlərlə əvəz edildi
    width: width,
    height: height,
    resizable: false,
    frame: false,    // Sizin orijinal kiosk rejimi ayarınız saxlanıldı
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // YENİ ƏLAVƏ: Bu sətir avtomatik səs siyasətini ləğv edir
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
