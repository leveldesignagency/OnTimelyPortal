const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Detect dev vs production correctly
const isDev = !app.isPackaged;

// Auto-updater configuration
autoUpdater.autoDownload = false; // Don't auto-download, let user choose
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits if update is ready

// Set the update server to GitHub
if (!isDev) {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'leveldesignagency',
    repo: 'OnTimely',
    private: false
  });
}

// Update check intervals (in milliseconds)
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 24; // Check every 24 hours
const UPDATE_CHECK_INTERVAL_DEV = 1000 * 60 * 5; // Check every 5 minutes in dev

let mainWindow: any = null;
let updateCheckInterval: NodeJS.Timeout | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devUrl = 'http://localhost:3003';
  // In production, resolve from the app.asar root
  const appPath = app.getAppPath(); // e.g. .../Resources/app.asar
  const prodFile = path.join(appPath, 'dist', 'index.html');

  if (isDev) {
    console.log('Loading URL (dev):', devUrl);
    mainWindow?.loadURL(devUrl);
    mainWindow?.webContents.openDevTools();
  } else {
    console.log('Loading FILE (prod):', prodFile);
    mainWindow?.loadFile(prodFile);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    // Window is already closed, no need to dereference
  });
}

// Auto-updater event handlers
function setupAutoUpdater() {
  if (isDev) {
    console.log('Auto-updater disabled in development mode');
    return;
  }

  // Check for updates on app start
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000); // Wait 3 seconds after app starts

  // Set up periodic update checks
  const interval = isDev ? UPDATE_CHECK_INTERVAL_DEV : UPDATE_CHECK_INTERVAL;
  updateCheckInterval = setInterval(() => {
    autoUpdater.checkForUpdates();
  }, interval);

  // Update available event
  autoUpdater.on('update-available', (info: any) => {
    console.log('Update available:', info);
    
    // Send to renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'Bug fixes and improvements'
      });
    }
  });

  // Update not available event
  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
    
    // Send to renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  // Download progress event
  autoUpdater.on('download-progress', (progressObj: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        speed: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  // Update downloaded event
  autoUpdater.on('update-downloaded', (info: any) => {
    console.log('Update downloaded:', info);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
    }
  });

  // Error event
  autoUpdater.on('error', (err: any) => {
    console.error('Auto-updater error:', err);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: err.message,
        code: err.code
      });
    }
  });
}

// IPC handlers for manual update control
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

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
app.on('web-contents-created', (event: any, contents: any) => {
  contents.on('new-window', (event: any, navigationUrl: any) => {
    event.preventDefault();
  });
});

// Clean up interval on app quit
app.on('before-quit', () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }
});
