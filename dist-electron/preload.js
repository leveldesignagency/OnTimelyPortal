import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  
  // OpenSky API call
  openskyApiCall: (params) => ipcRenderer.invoke('opensky-api-call', params),
  
  // Crash dialog IPC methods
  restartApp: () => ipcRenderer.invoke('restart-app'),
  exportLogs: () => ipcRenderer.invoke('export-app-logs'),
  
  // Health monitoring
  getHealthReport: () => ipcRenderer.invoke('get-health-report'),
  exportHealthData: () => ipcRenderer.invoke('export-health-data'),
  
  // Logging
  getLogs: (options) => ipcRenderer.invoke('get-logs', options),
  setLogLevel: (level) => ipcRenderer.invoke('set-log-level', level),
  exportAppLogs: () => ipcRenderer.invoke('export-app-logs'),
  
  // Crash reporting
  getCrashLogs: () => ipcRenderer.invoke('get-crash-logs'),
  exportCrashLogs: () => ipcRenderer.invoke('export-crash-logs'),
  
  // General IPC invoke method
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
}); 