import { BrowserWindow, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CrashReporter {
  constructor() {
    this.crashLogs = [];
    this.crashWindow = null;
    this.crashLogPath = path.join(app.getPath('userData'), 'crash-logs.json');
    this.loadCrashLogs();
  }

  // Handle uncaught exceptions
  handleUncaughtException(error, origin) {
    const crashData = {
      type: 'uncaughtException',
      error: error.message,
      stack: error.stack,
      origin,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      version: process.versions.electron
    };
    
    this.logCrash(crashData);
    this.showCustomCrashDialog(crashData);
  }

  // Handle unhandled promise rejections
  handleUnhandledRejection(reason, promise) {
    const crashData = {
      type: 'unhandledRejection',
      reason: reason?.message || String(reason),
      stack: reason?.stack,
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      version: process.versions.electron
    };
    
    this.logCrash(crashData);
    this.showCustomCrashDialog(crashData);
  }

  // Handle renderer process crashes
  handleRendererCrashed(webContents, details) {
    const crashData = {
      type: 'rendererCrashed',
      reason: details.reason,
      exitCode: details.exitCode,
      killed: details.killed,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      version: process.versions.electron
    };
    
    this.logCrash(crashData);
    this.showCustomCrashDialog(crashData);
  }

  // Handle GPU process crashes
  handleGPUProcessCrashed(killed, reason) {
    const crashData = {
      type: 'gpuProcessCrashed',
      reason,
      killed,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      version: process.versions.electron
    };
    
    this.logCrash(crashData);
    this.showCustomCrashDialog(crashData);
  }

  // Log crash data
  logCrash(crashData) {
    this.crashLogs.push(crashData);
    this.saveCrashLogs();
    
    // Also log to console for immediate visibility
    console.error('🚨 CRASH DETECTED:', crashData);
  }

  // Show custom dark mode crash dialog
  showCustomCrashDialog(crashData) {
    if (this.crashWindow) {
      this.crashWindow.focus();
      return;
    }

    this.crashWindow = new BrowserWindow({
      width: 600,
      height: 700,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hidden',
      frame: false,
      transparent: false,
      icon: path.join(__dirname, '../public/icon.png')
    });

    this.crashWindow.loadURL(`data:text/html;charset=utf-8,${this.getCrashDialogHTML(crashData)}`);
    
    this.crashWindow.once('ready-to-show', () => {
      this.crashWindow.show();
    });
    
    this.crashWindow.on('closed', () => {
      this.crashWindow = null;
    });
  }

  // Generate crash dialog HTML with dark mode styling
  getCrashDialogHTML(crashData) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timely - Error Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            max-width: 600px;
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            position: relative;
        }
        
        .close-btn {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            color: #ffffff;
            font-size: 24px;
            cursor: pointer;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.3s;
        }
        
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #ff6b6b;
        }
        
        .header p {
            color: #b8c5d6;
            line-height: 1.5;
        }
        
        .content {
            margin-bottom: 20px;
        }
        
        .error-section {
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid rgba(255, 107, 107, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .error-section h3 {
            color: #ff6b6b;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .error-details {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            color: #ffd93d;
            word-break: break-word;
            max-height: 100px;
            overflow-y: auto;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .info-label {
            font-size: 12px;
            color: #b8c5d6;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #4ecdc4;
        }
        
        .progress-bar {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 8px;
            margin: 15px 0;
            overflow: hidden;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #ff6b6b, #ff8e8e);
            height: 100%;
            border-radius: 10px;
            transition: width 1s linear;
            width: 0%;
        }
        
        .actions {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .btn {
            flex: 1;
            padding: 15px 20px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #4ecdc4, #44a08d);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(78, 205, 196, 0.3);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }
        
        .countdown {
            text-align: center;
            color: #b8c5d6;
            font-size: 14px;
        }
        
        .time {
            color: #ff6b6b;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <button class="close-btn" onclick="window.close()">×</button>
        
        <div class="header">
            <h1>🚨 Timely has encountered an error</h1>
            <p>We're sorry, but Timely has encountered an unexpected error and needs to close.</p>
        </div>
        
        <div class="content">
            <div class="error-section">
                <h3>Error Details</h3>
                <div class="error-details">${crashData.error || crashData.reason || 'Unknown error occurred'}</div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Platform</div>
                    <div class="info-value">${crashData.platform}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Architecture</div>
                    <div class="info-value">${crashData.arch}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Version</div>
                    <div class="info-value">${crashData.version}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Type</div>
                    <div class="info-value">${crashData.type}</div>
                </div>
            </div>
            
            <div class="error-section">
                <h3>What happens next?</h3>
                <p>This error has been automatically logged and will be reported to our team. If this problem persists, please contact support with the error details above.</p>
                <p>The app will automatically close in <span class="time" id="countdown">30</span> seconds.</p>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress"></div>
                </div>
            </div>
            
            <div class="actions">
                <button class="btn btn-primary" onclick="restartApp()">Restart App</button>
                <button class="btn btn-secondary" onclick="exportLogs()">Export Logs</button>
            </div>
            
            <div class="countdown">
                Time remaining: <span class="time" id="timeRemaining">30s</span>
            </div>
        </div>
    </div>
    
    <script>
        let timeLeft = 30;
        const countdownEl = document.getElementById('countdown');
        const timeRemainingEl = document.getElementById('timeRemaining');
        const progressEl = document.getElementById('progress');
        
        function updateCountdown() {
            timeLeft--;
            countdownEl.textContent = timeLeft;
            timeRemainingEl.textContent = timeLeft + 's';
            
            const progress = ((30 - timeLeft) / 30) * 100;
            progressEl.style.width = progress + '%';
            
            if (timeLeft <= 0) {
                window.close();
            }
        }
        
        function restartApp() {
            if (window.electronAPI) {
                window.electronAPI.restartApp();
            }
        }
        
        function exportLogs() {
            if (window.electronAPI) {
                window.electronAPI.exportLogs();
            }
        }
        
        setInterval(updateCountdown, 1000);
        progressEl.style.width = '0%';
    </script>
</body>
</html>`;
  }

  // Load crash logs from file
  loadCrashLogs() {
    try {
      if (fs.existsSync(this.crashLogPath)) {
        const data = fs.readFileSync(this.crashLogPath, 'utf8');
        this.crashLogs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load crash logs:', error);
    }
  }

  // Save crash logs to file
  saveCrashLogs() {
    try {
      // Keep only last 100 crash logs
      if (this.crashLogs.length > 100) {
        this.crashLogs = this.crashLogs.slice(-100);
      }
      
      fs.writeFileSync(this.crashLogPath, JSON.stringify(this.crashLogs, null, 2));
    } catch (error) {
      console.error('Failed to save crash logs:', error);
    }
  }

  // Get all crash logs
  getCrashLogs() {
    return this.crashLogs;
  }

  // Export crash logs
  exportCrashLogs() {
    try {
      const exportPath = path.join(app.getPath('downloads'), `timely-crash-logs-${Date.now()}.json`);
      fs.writeFileSync(exportPath, JSON.stringify(this.crashLogs, null, 2));
      return { success: true, path: exportPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
} 