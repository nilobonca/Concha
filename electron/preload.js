const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Native Windows dialogs & File System
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openFolderInExplorer: (folderPath) => ipcRenderer.invoke('open-folder-in-explorer', folderPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  trashItem: (filePath) => ipcRenderer.invoke('trash-item', filePath),
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch (e) {
      // Fallback to legacy file.path
    }
    return file ? file.path || '' : '';
  },

  // Window Controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  onMaximizedChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window-maximized-change', handler);
    return () => ipcRenderer.removeListener('window-maximized-change', handler);
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),

  // Global Soundboard Hotkeys Listener
  onSoundboardTrigger: (callback) => {
    const handler = (_event, slot) => callback(slot);
    ipcRenderer.on('soundboard-trigger', handler);
    return () => ipcRenderer.removeListener('soundboard-trigger', handler);
  },

  onMuteAll: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('soundboard-mute-all', handler);
    return () => ipcRenderer.removeListener('soundboard-mute-all', handler);
  },

  // Auto-Updater API
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
