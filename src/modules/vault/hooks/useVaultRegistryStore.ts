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

export function persistVaultsToLocalStorage(vaults: RegisteredVault[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VAULT_REGISTRY_KEY, JSON.stringify(vaults));
  } catch (e) {
    console.error('Erro ao salvar vaults no localStorage:', e);
  }
}

export interface VaultRegistryStore {
  vaults: RegisteredVault[];
  isLoaded: boolean;
  loadFromStorage: () => void;
  registerVault: (vault: RegisteredVault) => void;
  removeVault: (vaultId: string) => void;
  renameVault: (vaultId: string, newName: string) => void;
  syncCurrentVault: (vault: { id: string; name: string; storageType: 'fsa' | 'idb'; folderName?: string }) => void;
}

export const useVaultRegistryStore = create<VaultRegistryStore>((set) => ({
  vaults: [DEFAULT_VAULT],
  isLoaded: false,

  loadFromStorage: () => {
    const loaded = readVaultsFromLocalStorage();
    set({ vaults: loaded, isLoaded: true });
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
      persistVaultsToLocalStorage(next);
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
          updatedAt: Date.now(),
          isDefault: current.id === 'default-vault',
        };
        const next = [newEntry, ...state.vaults];
        persistVaultsToLocalStorage(next);
        return { vaults: next, isLoaded: true };
      }

      const existing = state.vaults[index];
      // Só atualiza se o nome ou storageType diferirem do registro
      const hasNameChanged = Boolean(current.name && current.name !== existing.name);
      const hasTypeChanged = current.storageType !== existing.storageType;
      const hasFolderChanged = Boolean(current.folderName && current.folderName !== existing.folderName);

      if (hasNameChanged || hasTypeChanged || hasFolderChanged) {
        const next = [...state.vaults];
        next[index] = {
          ...existing,
          name: current.name || existing.name,
          storageType: current.storageType,
          folderName: current.folderName || existing.folderName,
          updatedAt: Date.now(),
        };
        persistVaultsToLocalStorage(next);
        return { vaults: next };
      }

      return state;
    });
  },
}));
