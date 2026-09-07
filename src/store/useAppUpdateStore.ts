import { create } from 'zustand';
import { UpdateStatusPayload } from '@/interfaces/electron';

export interface AppUpdateState {
  currentVersion: string | null;
  status: UpdateStatusPayload['status'] | 'idle';
  availableVersion: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  percent: number;
  speed: number;
  errorMessage: string | null;
  isChecking: boolean;
  isPromptVisible: boolean;
  dismissedVersion: string | null;
  lastCheckedAt: number | null;
  isElectron: boolean;
  hasAutoChecked: boolean;

  // Actions
  init: () => () => void;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  startDownload: () => Promise<void>;
  quitAndInstall: () => void;
  dismissPrompt: () => void;
  openPrompt: () => void;
  openReleasePage: () => void;
}

function isMissingReleaseError(message?: string | null): boolean {
  if (!message) return false;
  return (
    message.includes('Unable to find latest version on GitHub') ||
    message.includes('please ensure a production release exists') ||
    message.includes('Cannot parse releases feed') ||
    message.includes('404') ||
    message.includes('406') ||
    message.includes('No published versions on GitHub')
  );
}

export const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  currentVersion: null,
  status: 'idle',
  availableVersion: null,
  releaseName: null,
  releaseNotes: null,
  percent: 0,
  speed: 0,
  errorMessage: null,
  isChecking: false,
  isPromptVisible: false,
  dismissedVersion: null,
  lastCheckedAt: null,
  isElectron: false,
  hasAutoChecked: false,

  init: () => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const electronAvailable = Boolean(window.electronAPI?.isElectron);
    set({ isElectron: electronAvailable });

    if (!electronAvailable || !window.electronAPI) {
      return () => {};
    }

    // Retrieve installed app version
    window.electronAPI.getAppVersion()
      .then((version) => {
        if (version) {
          set({ currentVersion: version });
        }
      })
      .catch((err) => {
        console.warn('[AppUpdateStore] Failed to fetch current version:', err);
      });

    // Subscribe to IPC update status updates from Electron main process
    const unsubscribe = window.electronAPI.onUpdateStatus((payload: UpdateStatusPayload) => {
      const state = get();

      switch (payload.status) {
        case 'checking':
          set({
            status: 'checking',
            isChecking: true,
            errorMessage: null
          });
          break;

        case 'available': {
          const isDismissed = state.dismissedVersion === payload.version;
          set({
            status: 'available',
            availableVersion: payload.version || null,
            releaseName: payload.releaseName || (payload.version ? `Versão ${payload.version}` : null),
            releaseNotes: payload.releaseNotes || null,
            isChecking: false,
            isPromptVisible: !isDismissed,
            errorMessage: null,
            lastCheckedAt: Date.now()
          });
          break;
        }

        case 'not-available':
          set({
            status: 'not-available',
            isChecking: false,
            errorMessage: null,
            lastCheckedAt: Date.now()
          });
          break;

        case 'downloading':
          set({
            status: 'downloading',
            percent: payload.percent ?? 0,
            speed: payload.speed ?? 0,
            isChecking: false,
            isPromptVisible: true,
            errorMessage: null
          });
          break;

        case 'downloaded': {
          const isDismissed = state.dismissedVersion === (payload.version || state.availableVersion);
          set({
            status: 'downloaded',
            percent: 100,
            isChecking: false,
            isPromptVisible: !isDismissed,
            availableVersion: payload.version || state.availableVersion,
            errorMessage: null
          });
          break;
        }

        case 'error': {
          const errMsg = payload.message || '';
          // Only silence error as 'not-available' if we were in the checking phase
          if (state.status === 'checking' && isMissingReleaseError(errMsg)) {
            set({
              status: 'not-available',
              isChecking: false,
              errorMessage: null,
              lastCheckedAt: Date.now()
            });
            break;
          }

          set({
            status: 'error',
            isChecking: false,
            isPromptVisible: true,
            errorMessage: errMsg || 'Não foi possível verificar ou baixar a atualização.'
          });
          break;
        }
      }
    });

    // Auto-check on application launch (after 2.5 seconds to let UI settle)
    let launchTimer: NodeJS.Timeout | null = null;
    if (!get().hasAutoChecked) {
      set({ hasAutoChecked: true });
      launchTimer = setTimeout(() => {
        get().checkForUpdates(false);
      }, 2500);
    }

    return () => {
      if (launchTimer) clearTimeout(launchTimer);
      unsubscribe();
    };
  },

  checkForUpdates: async (manual = false) => {
    if (typeof window === 'undefined' || !window.electronAPI?.checkForUpdates) {
      return;
    }

    set({
      isChecking: true,
      status: 'checking',
      errorMessage: null
    });

    try {
      await window.electronAPI.checkForUpdates();
    } catch (err: any) {
      console.error('[AppUpdateStore] checkForUpdates error:', err);
      const errMsg = err?.message || '';
      if (isMissingReleaseError(errMsg)) {
        set({
          status: 'not-available',
          isChecking: false,
          errorMessage: null,
          lastCheckedAt: Date.now()
        });
      } else {
        set({
          status: 'error',
          isChecking: false,
          errorMessage: errMsg || 'Falha ao solicitar verificação de atualizações.'
        });
      }
    }
  },

  startDownload: async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.startDownloadUpdate) {
      return;
    }

    set({
      status: 'downloading',
      percent: 0,
      errorMessage: null,
      isPromptVisible: true
    });

    try {
      await window.electronAPI.startDownloadUpdate();
    } catch (err: any) {
      console.error('[AppUpdateStore] startDownload error:', err);
      set({
        status: 'error',
        errorMessage: err?.message || 'Falha ao iniciar o download da atualização.'
      });
    }
  },

  quitAndInstall: () => {
    if (typeof window !== 'undefined' && window.electronAPI?.quitAndInstall) {
      window.electronAPI.quitAndInstall();
    }
  },

  dismissPrompt: () => {
    const { availableVersion } = get();
    set({
      isPromptVisible: false,
      dismissedVersion: availableVersion
    });
  },

  openPrompt: () => {
    set({ isPromptVisible: true });
  },

  openReleasePage: () => {
    const url = 'https://github.com/nilobonca/Concha/releases/latest';
    if (typeof window !== 'undefined') {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    }
  }
}));
