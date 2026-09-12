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

  // Vaults Registry Persistence API
  loadVaultsRegistry: () => Promise<{
    vaults: Array<{
      id: string;
      name: string;
      storageType: 'fsa' | 'idb';
      folderName?: string;
      path?: string;
      updatedAt: number;
      documentCount?: number;
      canvasCount?: number;
      isDefault?: boolean;
    }>;
    activeVaultId?: string;
  } | null>;
  saveVaultsRegistry: (data: {
    vaults: Array<{
      id: string;
      name: string;
      storageType: 'fsa' | 'idb';
      folderName?: string;
      path?: string;
      updatedAt: number;
      documentCount?: number;
      canvasCount?: number;
      isDefault?: boolean;
    }>;
    activeVaultId?: string;
  }) => Promise<boolean>;
  resolveVaultPath?: (vault: {
    id?: string;
    name?: string;
    folderName?: string;
    path?: string;
    storageType?: string;
  }) => Promise<string | undefined>;

  // Spell Checker API
  setSpellCheckerConfig?: (enabled: boolean, languages: string[] | string) => Promise<boolean>;
  getSpellCheckerConfig?: () => Promise<{ enabled: boolean; language: string; languages?: string[] } | null>;
  getAvailableSpellCheckerLanguages?: () => Promise<string[]>;
  addWordToSpellCheckerDictionary?: (word: string) => Promise<boolean>;
  replaceMisspelling?: (suggestion: string) => Promise<boolean>;
  onSpellCheckMenuData?: (callback: (data: {
    misspelledWord: string | null;
    suggestions: string[];
    x: number;
    y: number;
    isEditable: boolean;
    selectionText: string;
  }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
