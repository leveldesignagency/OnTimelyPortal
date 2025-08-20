const { app, BrowserWindow } = require('electron');
const path = require('path');

// Detect dev vs production correctly
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    show: false
  });

  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show();
  });

  const devUrl = 'http://localhost:3003';
  // In production, resolve from the app.asar root
  const appPath = app.getAppPath(); // e.g. .../Resources/app.asar
  const prodFile = path.join(appPath, 'dist', 'index.html');

  if (isDev) {
    console.log('Loading URL (dev):', devUrl);
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    console.log('Loading FILE (prod):', prodFile);
    win.loadFile(prodFile);
  }

  // Handle window closed
  win.on('closed', () => {
    // Window is already closed, no need to dereference
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
