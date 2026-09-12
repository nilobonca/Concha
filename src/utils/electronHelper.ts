/**
 * RPGSA Electron Safe Integration Helper
 * Safely guards against browser environments where window.electronAPI is undefined.
 */

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
};

export const getAppVersion = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && window.electronAPI?.getAppVersion) {
    try {
      return await window.electronAPI.getAppVersion();
    } catch (err) {
      console.warn('[RPGSA] getAppVersion error:', err);
    }
  }
  return null;
};

export const setWindowMode = async (mode: 'launcher' | 'workspace'): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.setWindowMode) {
    try {
      return await window.electronAPI.setWindowMode(mode);
    } catch (err) {
      console.warn('[RPGSA] Electron setWindowMode error:', err);
    }
  }
  return false;
};

export const setWindowSize = async (width: number, height: number): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.setWindowSize) {
    try {
      return await window.electronAPI.setWindowSize(width, height);
    } catch (err) {
      console.warn('[RPGSA] Electron setWindowSize error:', err);
    }
  }
  return false;
};

export const minimizeWindow = (): void => {
  if (typeof window !== 'undefined' && window.electronAPI?.minimize) {
    window.electronAPI.minimize();
  }
};

export const maximizeWindow = (): void => {
  if (typeof window !== 'undefined' && window.electronAPI?.maximize) {
    window.electronAPI.maximize();
  }
};

export const closeWindow = (): void => {
  if (typeof window !== 'undefined' && window.electronAPI?.close) {
    window.electronAPI.close();
  } else if (typeof window !== 'undefined' && typeof window.close === 'function') {
    window.close();
  }
};

export const isWindowMaximized = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.isMaximized) {
    try {
      return await window.electronAPI.isMaximized();
    } catch (err) {
      console.warn('[RPGSA] isMaximized error:', err);
    }
  }
  return false;
};

export const subscribeToMaximizedChange = (callback: (isMaximized: boolean) => void): (() => void) => {
  if (typeof window !== 'undefined' && window.electronAPI?.onMaximizedChange) {
    return window.electronAPI.onMaximizedChange(callback);
  }
  return () => {};
};

export const trashItem = async (filePath: string): Promise<{ success: boolean; error?: string }> => {
  if (typeof window !== 'undefined' && window.electronAPI?.trashItem) {
    try {
      return await window.electronAPI.trashItem(filePath);
    } catch (err: any) {
      console.warn('[RPGSA] trashItem error:', err);
      return { success: false, error: err?.message || 'Falha ao mover para a lixeira' };
    }
  }
  return { success: false, error: 'Electron não disponível' };
};

export const getPathForFile = (file: File): string => {
  if (typeof window !== 'undefined' && window.electronAPI?.getPathForFile) {
    try {
      return window.electronAPI.getPathForFile(file) || '';
    } catch {
      return (file as any)?.path || '';
    }
  }
  return (file as any)?.path || '';
};

export const checkForUpdates = async (): Promise<void> => {
  if (typeof window !== 'undefined' && window.electronAPI?.checkForUpdates) {
    try {
      await window.electronAPI.checkForUpdates();
    } catch (err) {
      console.warn('[RPGSA] checkForUpdates error:', err);
    }
  }
};

export const startDownloadUpdate = async (): Promise<void> => {
  if (typeof window !== 'undefined' && window.electronAPI?.startDownloadUpdate) {
    try {
      await window.electronAPI.startDownloadUpdate();
    } catch (err) {
      console.warn('[RPGSA] startDownloadUpdate error:', err);
    }
  }
};

export const quitAndInstall = async (): Promise<void> => {
  if (typeof window !== 'undefined' && window.electronAPI?.quitAndInstall) {
    try {
      await window.electronAPI.quitAndInstall();
    } catch (err) {
      console.warn('[RPGSA] quitAndInstall error:', err);
    }
  }
};

export const setSpellCheckerConfig = async (enabled: boolean, languages: string[] | string): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.setSpellCheckerConfig) {
    try {
      return await window.electronAPI.setSpellCheckerConfig(enabled, languages);
    } catch (err) {
      console.warn('[RPGSA] setSpellCheckerConfig error:', err);
    }
  }
  return false;
};

export const getSpellCheckerConfig = async (): Promise<{ enabled: boolean; language: string; languages?: string[] } | null> => {
  if (typeof window !== 'undefined' && window.electronAPI?.getSpellCheckerConfig) {
    try {
      return await window.electronAPI.getSpellCheckerConfig();
    } catch (err) {
      console.warn('[RPGSA] getSpellCheckerConfig error:', err);
    }
  }
  return null;
};

export const getAvailableSpellCheckerLanguages = async (): Promise<string[]> => {
  if (typeof window !== 'undefined' && window.electronAPI?.getAvailableSpellCheckerLanguages) {
    try {
      return await window.electronAPI.getAvailableSpellCheckerLanguages();
    } catch (err) {
      console.warn('[RPGSA] getAvailableSpellCheckerLanguages error:', err);
    }
  }
  return [];
};

export const addWordToSpellCheckerDictionary = async (word: string): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.addWordToSpellCheckerDictionary) {
    try {
      return await window.electronAPI.addWordToSpellCheckerDictionary(word);
    } catch (err) {
      console.warn('[RPGSA] addWordToSpellCheckerDictionary error:', err);
    }
  }
  return false;
};

export const replaceMisspelling = async (suggestion: string): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.electronAPI?.replaceMisspelling) {
    try {
      return await window.electronAPI.replaceMisspelling(suggestion);
    } catch (err) {
      console.warn('[RPGSA] replaceMisspelling error:', err);
    }
  }
  return false;
};

export const subscribeToSpellCheckMenuData = (
  callback: (data: {
    misspelledWord: string | null;
    suggestions: string[];
    x: number;
    y: number;
    isEditable: boolean;
    selectionText: string;
  }) => void
): (() => void) => {
  if (typeof window !== 'undefined' && window.electronAPI?.onSpellCheckMenuData) {
    return window.electronAPI.onSpellCheckMenuData(callback);
  }
  return () => {};
};




