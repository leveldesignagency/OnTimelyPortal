import os from 'os';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class HealthMonitor {
  constructor(logger) {
    this.logger = logger;
    this.metrics = [];
    this.monitoringInterval = null;
    this.startTime = Date.now();
    this.healthDataPath = path.join(app.getPath('userData'), 'health-data.json');
    
    this.startMonitoring();
    this.loadHealthData();
  }

  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Collect metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    this.logger?.info('🏥 Health monitoring started');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger?.info('🏥 Health monitoring stopped');
    }
  }

  collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        memory: this.getMemoryUsage(),
        cpu: this.getCPUUsage(),
        disk: this.getDiskUsage(),
        system: this.getSystemInfo(),
        app: this.getAppInfo()
      };

      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Check health status
      const healthStatus = this.assessHealth(metrics);
      if (healthStatus.status !== 'HEALTHY') {
        this.logger?.warn(`🏥 Health check: ${healthStatus.status}`, healthStatus);
      }

      this.saveHealthData();
      
    } catch (error) {
      this.logger?.error('🏥 Failed to collect health metrics', error.message);
    }
  }

  getUptime() {
    const uptime = Date.now() - this.startTime;
    return {
      app: Math.floor(uptime / 1000), // seconds
      system: Math.floor(os.uptime()) // seconds
    };
  }

  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      process: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      system: {
        total: Math.round(totalMem / 1024 / 1024 / 1024), // GB
        free: Math.round(freeMem / 1024 / 1024 / 1024), // GB
        used: Math.round((totalMem - freeMem) / 1024 / 1024 / 1024), // GB
        usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100)
      }
    };
  }

  getCPUUsage() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    return {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      loadAverage: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100
      }
    };
  }

  getDiskUsage() {
    try {
      const homeDir = os.homedir();
      const stats = fs.statSync(homeDir);
      
      return {
        homeDirectory: homeDir,
        available: Math.round(stats.size / 1024 / 1024 / 1024), // GB
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      type: os.type(),
      version: os.version()
    };
  }

  getAppInfo() {
    return {
      version: app.getVersion(),
      name: app.getName(),
      locale: app.getLocale(),
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      userDataPath: app.getPath('userData')
    };
  }

  assessHealth(metrics) {
    const issues = [];
    let status = 'HEALTHY';

    // Memory usage check
    if (metrics.memory.system.usagePercent > 90) {
      issues.push('High system memory usage');
      status = 'CRITICAL';
    } else if (metrics.memory.system.usagePercent > 80) {
      issues.push('Elevated system memory usage');
      status = status === 'HEALTHY' ? 'WARNING' : status;
    }

    // Process memory check
    if (metrics.memory.process.heapUsed > 1000) { // > 1GB
      issues.push('High process memory usage');
      status = status === 'HEALTHY' ? 'WARNING' : status;
    }

    // CPU load check
    if (metrics.cpu.loadAverage['5min'] > 2.0) {
      issues.push('High CPU load');
      status = status === 'HEALTHY' ? 'WARNING' : status;
    }

    // Uptime check
    if (metrics.uptime.app < 60) { // Less than 1 minute
      issues.push('App recently started');
      status = status === 'HEALTHY' ? 'WARNING' : status;
    }

    return {
      status,
      issues,
      timestamp: metrics.timestamp
    };
  }

  getHealthReport() {
    if (this.metrics.length === 0) {
      return { status: 'NO_DATA', message: 'No health metrics collected yet' };
    }

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const healthStatus = this.assessHealth(latestMetrics);
    
    // Calculate trends
    const trends = this.calculateTrends();
    
    return {
      current: {
        status: healthStatus.status,
        issues: healthStatus.issues,
        metrics: latestMetrics
      },
      trends,
      summary: {
        totalMetrics: this.metrics.length,
        monitoringStart: new Date(this.startTime).toISOString(),
        lastUpdate: latestMetrics.timestamp
      }
    };
  }

  calculateTrends() {
    if (this.metrics.length < 2) {
      return { message: 'Insufficient data for trend analysis' };
    }

    const recent = this.metrics.slice(-10); // Last 10 metrics
    const older = this.metrics.slice(-20, -10); // Previous 10 metrics

    if (older.length === 0) {
      return { message: 'Insufficient data for trend analysis' };
    }

    const trends = {};

    // Memory trend
    const recentMemAvg = recent.reduce((sum, m) => sum + m.memory.system.usagePercent, 0) / recent.length;
    const olderMemAvg = older.reduce((sum, m) => sum + m.memory.system.usagePercent, 0) / older.length;
    trends.memory = {
      current: Math.round(recentMemAvg),
      previous: Math.round(olderMemAvg),
      change: Math.round(recentMemAvg - olderMemAvg),
      direction: recentMemAvg > olderMemAvg ? 'increasing' : 'decreasing'
    };

    // CPU trend
    const recentCPULoad = recent.reduce((sum, m) => sum + m.cpu.loadAverage['5min'], 0) / recent.length;
    const olderCPULoad = older.reduce((sum, m) => sum + m.cpu.loadAverage['5min'], 0) / older.length;
    trends.cpu = {
      current: Math.round(recentCPULoad * 100) / 100,
      previous: Math.round(olderCPULoad * 100) / 100,
      change: Math.round((recentCPULoad - olderCPULoad) * 100) / 100,
      direction: recentCPULoad > olderCPULoad ? 'increasing' : 'decreasing'
    };

    return trends;
  }

  loadHealthData() {
    try {
      if (fs.existsSync(this.healthDataPath)) {
        const data = fs.readFileSync(this.healthDataPath, 'utf8');
        const parsed = JSON.parse(data);
        
        if (parsed.metrics && Array.isArray(parsed.metrics)) {
          this.metrics = parsed.metrics;
        }
        
        if (parsed.startTime) {
          this.startTime = new Date(parsed.startTime).getTime();
        }
        
        this.logger?.info('🏥 Health data loaded from file');
      }
    } catch (error) {
      this.logger?.error('🏥 Failed to load health data', error.message);
    }
  }

  saveHealthData() {
    try {
      const data = {
        startTime: new Date(this.startTime).toISOString(),
        metrics: this.metrics.slice(-100) // Keep only last 100 metrics in file
      };
      
      fs.writeFileSync(this.healthDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger?.error('🏥 Failed to save health data', error.message);
    }
  }

  exportHealthData() {
    try {
      const exportPath = path.join(app.getPath('downloads'), `timely-health-data-${Date.now()}.json`);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        startTime: new Date(this.startTime).toISOString(),
        metrics: this.metrics,
        healthReport: this.getHealthReport()
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      return { success: true, path: exportPath };
    } catch (error) {
      this.logger?.error('🏥 Failed to export health data', error.message);
      return { success: false, error: error.message };
    }
  }
} 