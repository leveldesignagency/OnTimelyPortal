import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auto-update functionality
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Update event listeners
  onUpdateAvailable: (callback: (data: any) => void) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update-not-available', () => callback());
  },
  onUpdateDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data));
  },
  onUpdateDownloaded: (callback: (data: any) => void) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data));
  },
  onUpdateError: (callback: (data: any) => void) => {
    ipcRenderer.on('update-error', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      checkForUpdates: () => Promise<{ success: boolean; result?: any; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => void;
      getAppVersion: () => Promise<string>;
      onUpdateAvailable: (callback: (data: any) => void) => void;
      onUpdateNotAvailable: (callback: () => void) => void;
      onUpdateDownloadProgress: (callback: (data: any) => void) => void;
      onUpdateDownloaded: (callback: (data: any) => void) => void;
      onUpdateError: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
