import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import our production systems
import { CrashReporter } from './crash-reporter.js';
import { Logger } from './logger.js';
import { HealthMonitor } from './health-monitor.js';

let mainWindow;
let logger;
let crashReporter;
let healthMonitor;

// Start local backend server
let localServer = null;

async function startLocalServer() {
  try {
    if (localServer) {
      logger?.info('🔄 Local server already running, stopping...');
      stopLocalServer();
    }
    
    logger?.info('🚀 Starting local backend server...');
    
    // Start the local server using child_process
    localServer = spawn('node', ['flight-proxy-server.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    localServer.stdout.on('data', (data) => {
      logger?.info(`📡 Backend: ${data.toString().trim()}`);
    });
    
    localServer.stderr.on('data', (data) => {
      logger?.warn(`📡 Backend Error: ${data.toString().trim()}`);
    });
    
    localServer.on('close', (code) => {
      logger?.info(`📡 Backend server closed with code ${code}`);
      localServer = null;
    });
    
    localServer.on('error', (error) => {
      logger?.error(`📡 Backend server error: ${error.message}`);
      localServer = null;
    });
    
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (localServer && localServer.pid) {
      logger?.info(`✅ Local backend server started (PID: ${localServer.pid})`);
    } else {
      throw new Error('Failed to start local server');
    }
    
  } catch (error) {
    logger?.error(`❌ Failed to start local server: ${error.message}`);
    throw error;
  }
}

// Stop local backend server
function stopLocalServer() {
  if (localServer) {
    try {
      logger?.info('🛑 Stopping local backend server...');
      localServer.kill();
      localServer = null;
      logger?.info('✅ Local backend server stopped');
    } catch (error) {
      logger?.error(`❌ Error stopping local server: ${error.message}`);
    }
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    logger?.info('🪟 Main window ready and shown');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    logger?.info('🪟 Main window closed');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

function setupAutoUpdater() {
  autoUpdater.logger = logger;
  
  autoUpdater.on('checking-for-update', () => {
    logger?.info('🔄 Checking for updates...');
  });
  
  autoUpdater.on('update-available', (info) => {
    logger?.info(`📦 Update available: ${info.version}`);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. The app will restart to install the update.`,
      buttons: ['OK']
    });
  });
  
  autoUpdater.on('update-not-available', () => {
    logger?.info('✅ No updates available');
  });
  
  autoUpdater.on('error', (err) => {
    logger?.error(`❌ Update error: ${err.message}`);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    logger?.info(`📥 Download progress: ${Math.round(progressObj.percent)}%`);
  });
  
  autoUpdater.on('update-downloaded', () => {
    logger?.info('✅ Update downloaded, restarting...');
    autoUpdater.quitAndInstall();
  });
  
  // Check for updates
  autoUpdater.checkForUpdates();
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Initialize production systems first
    logger = new Logger();
    logger.info('🚀 Timely Desktop App starting...');
    
    crashReporter = new CrashReporter();
    logger.info('🚨 Crash reporter initialized');
    
    healthMonitor = new HealthMonitor(logger);
    logger.info('🏥 Health monitor initialized');
    
    // Start local backend server
    await startLocalServer();
    
    const mainWindow = createWindow();
    logger.info('🪟 Main window created');
    
    setupAutoUpdater();
    logger.info('🔄 Auto-updater configured');
    
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    
    logger.info('✅ App initialization complete');
    
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    app.quit();
  }
});

// Clean up when app quits
app.on('before-quit', function () {
  if (logger) logger.info('🔄 App shutting down...');
  if (healthMonitor) healthMonitor.stopMonitoring();
  stopLocalServer();
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error, origin) => {
  if (crashReporter) {
    crashReporter.handleUncaughtException(error, origin);
  }
  if (logger) {
    logger.error(`💥 Uncaught Exception: ${error.message}`, { origin, stack: error.stack });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  if (crashReporter) {
    crashReporter.handleUnhandledRejection(reason, promise);
  }
  if (logger) {
    logger.error(`💥 Unhandled Rejection: ${reason}`, { promise });
  }
});

// Handle renderer process crashes
app.on('render-process-gone', (event, webContents, details) => {
  if (crashReporter) {
    crashReporter.handleRendererCrashed(webContents, details);
  }
  if (logger) {
    logger.error(`💥 Renderer Process Crashed: ${details.reason}`, details);
  }
});

// Handle GPU process crashes
app.on('gpu-process-crashed', (event, killed, reason) => {
  if (crashReporter) {
    crashReporter.handleGPUProcessCrashed(killed, reason);
  }
  if (logger) {
    logger.error(`💥 GPU Process Crashed: ${reason}`, { killed });
  }
});

// IPC handlers
ipcMain.handle('opensky-api-call', async (event, params) => {
  try {
    if (logger) logger.info('📡 OpenSky API call requested', params);
    
    const response = await fetch(`https://opensky-network.org/api/states/all?icao24=${params.icao24}`);
    const data = await response.json();
    
    if (logger) logger.info('📡 OpenSky API response received', { status: response.status, dataLength: data?.states?.length || 0 });
    
    return { success: true, data };
  } catch (error) {
    if (logger) logger.error('❌ OpenSky API call failed', error.message);
    return { success: false, error: error.message };
  }
});

// Health monitoring IPC handlers
ipcMain.handle('get-health-report', async () => {
  return healthMonitor ? healthMonitor.getHealthReport() : null;
});

ipcMain.handle('export-health-data', async () => {
  return healthMonitor ? healthMonitor.exportHealthData() : null;
});

// Logging IPC handlers
ipcMain.handle('get-logs', async (event, options = {}) => {
  return logger ? logger.getLogs(options) : [];
});

ipcMain.handle('set-log-level', async (event, level) => {
  if (logger) {
    logger.setLogLevel(level);
    return { success: true, level };
  }
  return { success: false, error: 'Logger not initialized' };
});

ipcMain.handle('export-app-logs', async () => {
  return logger ? logger.exportLogs() : null;
});

// Crash reporting IPC handlers
ipcMain.handle('get-crash-logs', async () => {
  return crashReporter ? crashReporter.getCrashLogs() : [];
});

ipcMain.handle('export-crash-logs', async () => {
  return crashReporter ? crashReporter.exportCrashLogs() : null;
});

// App control IPC handlers
ipcMain.handle('restart-app', async () => {
  if (logger) logger.info('🔄 Restart requested by user');
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('export-app-logs', async () => {
  if (logger) {
    const logs = logger.exportLogs();
    const crashLogs = crashReporter ? crashReporter.exportCrashLogs() : null;
    const healthData = healthMonitor ? healthMonitor.exportHealthData() : null;
    
    return {
      logs,
      crashLogs,
      healthData,
      timestamp: new Date().toISOString()
    };
  }
  return null;
}); 