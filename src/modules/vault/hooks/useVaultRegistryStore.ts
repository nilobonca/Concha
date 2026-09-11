import { create } from 'zustand';

export interface RegisteredVault {
  id: string;
  name: string;
  storageType: 'fsa' | 'idb';
  folderName?: string;
  path?: string;
  updatedAt: number;
  documentCount?: number;
  canvasCount?: number;
  isDefault?: boolean;
}

export const VAULT_REGISTRY_KEY = 'rpgsa_registered_vaults';

export const DEFAULT_VAULT: RegisteredVault = {
  id: 'default-vault',
  name: 'Meu Vault Local',
  storageType: 'idb',
  updatedAt: 0,
  isDefault: true,
};

export function readVaultsFromLocalStorage(): RegisteredVault[] {
  if (typeof window === 'undefined') return [DEFAULT_VAULT];
  try {
    const raw = localStorage.getItem(VAULT_REGISTRY_KEY);
    if (raw) {
      const parsed: RegisteredVault[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler registro de vaults do localStorage:', e);
  }
  return [DEFAULT_VAULT];
}

/**
 * Combina duas listas de vaults registrados sem duplicidade de ID,
 * mantendo a entrada mais recentemente atualizada.
 */
export function mergeVaultLists(listA: RegisteredVault[], listB: RegisteredVault[]): RegisteredVault[] {
  const map = new Map<string, RegisteredVault>();

  for (const v of listA) {
    if (v && v.id) {
      map.set(v.id, v);
    }
  }

  for (const v of listB) {
    if (!v || !v.id) continue;
    const existing = map.get(v.id);
    if (!existing) {
      map.set(v.id, v);
    } else {
      const useB = (v.updatedAt || 0) >= (existing.updatedAt || 0);
      map.set(v.id, {
        ...existing,
        ...v,
        path: v.path || existing.path,
        folderName: v.folderName || existing.folderName,
        name: useB ? (v.name || existing.name) : existing.name,
        updatedAt: Math.max(v.updatedAt || 0, existing.updatedAt || 0),
        isDefault: existing.isDefault || v.isDefault,
      });
    }
  }

  const merged = Array.from(map.values());
  if (merged.length === 0) {
    return [DEFAULT_VAULT];
  }
  return merged;
}

export function persistVaultsToLocalStorage(vaults: RegisteredVault[], activeVaultId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VAULT_REGISTRY_KEY, JSON.stringify(vaults));
  } catch (e) {
    console.error('Erro ao salvar vaults no localStorage:', e);
  }

  // Se estiver no Electron, grava também no arquivo permanente do disco
  if (window.electronAPI?.saveVaultsRegistry) {
    const currentActiveId = activeVaultId || localStorage.getItem('vault_active_id') || undefined;
    window.electronAPI.saveVaultsRegistry({
      vaults,
      activeVaultId: currentActiveId,
    }).catch((err) => {
      console.warn('[useVaultRegistryStore] Falha ao salvar vaults no disco via Electron:', err);
    });
  }
}

export interface VaultRegistryStore {
  vaults: RegisteredVault[];
  isLoaded: boolean;
  loadFromStorage: () => Promise<void>;
  registerVault: (vault: RegisteredVault) => void;
  removeVault: (vaultId: string) => void;
  renameVault: (vaultId: string, newName: string) => void;
  syncCurrentVault: (vault: { id: string; name: string; storageType: 'fsa' | 'idb'; folderName?: string; path?: string }) => void;
}

export const useVaultRegistryStore = create<VaultRegistryStore>((set) => ({
  vaults: [DEFAULT_VAULT],
  isLoaded: false,

  loadFromStorage: async () => {
    // 1. Carga imediata a partir do localStorage para evitar atrasos na renderização da UI
    const localVaults = readVaultsFromLocalStorage();
    set({ vaults: localVaults, isLoaded: true });

    // 2. Se estiver no Electron, consulta o arquivo permanente do disco (%APPDATA%\Concha\vaults-registry.json)
    if (typeof window !== 'undefined' && window.electronAPI?.loadVaultsRegistry) {
      try {
        const diskData = await window.electronAPI.loadVaultsRegistry();
        if (diskData && Array.isArray(diskData.vaults) && diskData.vaults.length > 0) {
          // Funde os registros do disco com os do localStorage sem perder nenhum vault
          const merged = mergeVaultLists(diskData.vaults, localVaults);
          set({ vaults: merged, isLoaded: true });

          // Atualiza o localStorage com o resultado consolidado
          localStorage.setItem(VAULT_REGISTRY_KEY, JSON.stringify(merged));

          // Restaura activeVaultId se não houver um salvo localmente ou se estiver no cofre padrão
          const currentLocalActive = localStorage.getItem('vault_active_id');
          if (diskData.activeVaultId && (!currentLocalActive || currentLocalActive === 'default-vault')) {
            localStorage.setItem('vault_active_id', diskData.activeVaultId);
          }

          // Se o merge encontrou novos itens válidos em relação ao disco, atualiza o arquivo físico
          const nonDefaultLocal = localVaults.filter(v => !v.isDefault);
          if (nonDefaultLocal.length > 0 && merged.length > diskData.vaults.length) {
            window.electronAPI.saveVaultsRegistry({
              vaults: merged,
              activeVaultId: diskData.activeVaultId || localStorage.getItem('vault_active_id') || undefined,
            }).catch(() => {});
          }
        } else if (localVaults.length > 0 && localVaults.some(v => !v.isDefault)) {
          // Salva no disco apenas se houver cofres reais criados pelo usuário
          window.electronAPI.saveVaultsRegistry({
            vaults: localVaults,
            activeVaultId: localStorage.getItem('vault_active_id') || undefined,
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[useVaultRegistryStore] Falha ao sincronizar com vaults em disco no Electron:', err);
      }
    }
  },

  registerVault: (newVault: RegisteredVault) => {
    set((state) => {
      const existsIndex = state.vaults.findIndex(v => v.id === newVault.id);
      let next: RegisteredVault[];
      if (existsIndex >= 0) {
        next = [...state.vaults];
        next[existsIndex] = { ...state.vaults[existsIndex], ...newVault, updatedAt: Date.now() };
      } else {
        next = [newVault, ...state.vaults];
      }
      persistVaultsToLocalStorage(next, newVault.id);
      return { vaults: next, isLoaded: true };
    });
  },

  removeVault: (vaultId: string) => {
    set((state) => {
      const next = state.vaults.filter(v => v.id !== vaultId);
      persistVaultsToLocalStorage(next);
      return { vaults: next };
    });
  },

  renameVault: (vaultId: string, newName: string) => {
    set((state) => {
      const next = state.vaults.map(v => v.id === vaultId ? { ...v, name: newName, updatedAt: Date.now() } : v);
      persistVaultsToLocalStorage(next);
      return { vaults: next };
    });
  },

  syncCurrentVault: (current) => {
    if (!current.id) return;
    set((state) => {
      const index = state.vaults.findIndex(v => v.id === current.id);
      if (index === -1) {
        // Vault não estava registrado ainda: insere mantendo todos os outros existentes
        const newEntry: RegisteredVault = {
          id: current.id,
          name: current.name || (current.storageType === 'fsa' ? 'Pasta Windows (HD)' : 'Meu Vault'),
          storageType: current.storageType,
          folderName: current.folderName,
          path: current.path,
          updatedAt: Date.now(),
          isDefault: current.id === 'default-vault',
        };
        const next = [newEntry, ...state.vaults];
        persistVaultsToLocalStorage(next, current.id);
        return { vaults: next, isLoaded: true };
      }

      const existing = state.vaults[index];
      // Só atualiza se o nome, storageType, folderName ou path diferirem do registro
      const hasNameChanged = Boolean(current.name && current.name !== existing.name);
      const hasTypeChanged = current.storageType !== existing.storageType;
      const hasFolderChanged = Boolean(current.folderName && current.folderName !== existing.folderName);
      const hasPathChanged = Boolean(current.path && current.path !== existing.path);

      if (hasNameChanged || hasTypeChanged || hasFolderChanged || hasPathChanged) {
        const next = [...state.vaults];
        next[index] = {
          ...existing,
          name: current.name || existing.name,
          storageType: current.storageType,
          folderName: current.folderName || existing.folderName,
          path: current.path || existing.path,
          updatedAt: Date.now(),
        };
        persistVaultsToLocalStorage(next, current.id);
        return { vaults: next };
      }

      return state;
    });
  },
}));
