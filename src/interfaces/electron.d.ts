export interface UpdateStatusPayload {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  speed?: number;
  message?: string;
  releaseName?: string;
  releaseNotes?: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  selectDirectory: () => Promise<string | null>;
  openFolderInExplorer: (folderPath: string) => Promise<boolean>;
  openExternal?: (url: string) => Promise<boolean>;
  trashItem: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  getPathForFile: (file: File) => string;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  getAppVersion: () => Promise<string>;
  setWindowSize: (width: number, height: number) => Promise<boolean>;
  setWindowMode: (mode: 'launcher' | 'workspace') => Promise<boolean>;
  onSoundboardTrigger: (callback: (slot: number) => void) => () => void;
  onMuteAll: (callback: () => void) => () => void;

  // Auto-Updater API
  checkForUpdates: () => Promise<void>;
  startDownloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
