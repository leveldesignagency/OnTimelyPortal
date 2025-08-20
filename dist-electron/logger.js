import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'INFO';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.performanceLogs = [];
    this.userActions = [];
    
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.ensureLogDirectory();
    this.startPerformanceTracking();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  setLogLevel(level) {
    if (this.levels.hasOwnProperty(level.toUpperCase())) {
      this.logLevel = level.toUpperCase();
      this.info(`Log level changed to ${this.logLevel}`);
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formattedData = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedData}\n`;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message);
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  rotateLogsIfNeeded() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogs();
        }
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  rotateLogs() {
    try {
      // Remove oldest log file if we have max files
      const oldestLog = path.join(this.logDir, `app.${this.maxFiles}.log`);
      if (fs.existsSync(oldestLog)) {
        fs.unlinkSync(oldestLog);
      }

      // Shift existing log files
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(this.logDir, `app.${i}.log`);
        const newFile = path.join(this.logDir, `app.${i + 1}.log`);
        if (fs.existsSync(oldFile)) {
          fs.renameSync(oldFile, newFile);
        }
      }

      // Rename current log file
      const newLogFile = path.join(this.logDir, 'app.1.log');
      fs.renameSync(this.logFile, newLogFile);

      // Create new log file
      fs.writeFileSync(this.logFile, '');
      
      this.info('Log files rotated');
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  error(message, data = null) {
    if (this.shouldLog('ERROR')) {
      const formattedMessage = this.formatMessage('ERROR', message, data);
      console.error(formattedMessage.trim());
      this.writeToFile(formattedMessage);
    }
  }

  warn(message, data = null) {
    if (this.shouldLog('WARN')) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      console.warn(formattedMessage.trim());
      this.writeToFile(formattedMessage);
    }
  }

  info(message, data = null) {
    if (this.shouldLog('INFO')) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      console.log(formattedMessage.trim());
      this.writeToFile(formattedMessage);
    }
  }

  debug(message, data = null) {
    if (this.shouldLog('DEBUG')) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      console.log(formattedMessage.trim());
      this.writeToFile(formattedMessage);
    }
  }

  // Performance tracking
  startPerformanceTracking() {
    setInterval(() => {
      this.trackMemoryUsage();
    }, 60000); // Every minute
  }

  trackMemoryUsage() {
    const memUsage = process.memoryUsage();
    this.debug('Memory usage', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }

  // API call timing
  trackAPICall(endpoint, startTime, success = true, error = null) {
    const duration = Date.now() - startTime;
    const logData = {
      endpoint,
      duration: `${duration}ms`,
      success,
      error: error?.message || null
    };

    this.performanceLogs.push({
      ...logData,
      timestamp: new Date().toISOString()
    });

    if (success) {
      this.debug(`API call completed`, logData);
    } else {
      this.warn(`API call failed`, logData);
    }

    // Keep only last 1000 performance logs
    if (this.performanceLogs.length > 1000) {
      this.performanceLogs = this.performanceLogs.slice(-1000);
    }
  }

  // User action logging
  logUserAction(action, details = null) {
    const logData = {
      action,
      details,
      timestamp: new Date().toISOString()
    };

    this.userActions.push(logData);
    this.info(`User action: ${action}`, details);

    // Keep only last 1000 user actions
    if (this.userActions.length > 1000) {
      this.userActions = this.userActions.slice(-1000);
    }
  }

  // Get logs with filtering
  getLogs(options = {}) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      let lines = content.split('\n').filter(line => line.trim());

      // Filter by level
      if (options.level) {
        lines = lines.filter(line => line.includes(`[${options.level.toUpperCase()}]`));
      }

      // Filter by search term
      if (options.search) {
        lines = lines.filter(line => line.toLowerCase().includes(options.search.toLowerCase()));
      }

      // Limit results
      if (options.limit) {
        lines = lines.slice(-options.limit);
      }

      return lines;
    } catch (error) {
      this.error('Failed to get logs', error.message);
      return [];
    }
  }

  // Export logs
  exportLogs() {
    try {
      const exportPath = path.join(app.getPath('downloads'), `timely-logs-${Date.now()}.json`);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        logLevel: this.logLevel,
        performanceLogs: this.performanceLogs,
        userActions: this.userActions,
        logFiles: this.getLogFilesInfo()
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      return { success: true, path: exportPath };
    } catch (error) {
      this.error('Failed to export logs', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get info about log files
  getLogFilesInfo() {
    try {
      const files = fs.readdirSync(this.logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      return logFiles.map(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: `${Math.round(stats.size / 1024)}KB`,
          modified: stats.mtime.toISOString()
        };
      });
    } catch (error) {
      return [];
    }
  }
} 