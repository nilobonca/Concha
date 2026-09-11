import { useEffect, useCallback, useMemo } from 'react';
import { useVaultStore } from './useVaultStore';
import { useIDB } from '@/utils/indexedDB';
import { FSAStorageProvider } from '../storage/FSAStorageProvider';
import {
  RegisteredVault,
  VAULT_REGISTRY_KEY,
  DEFAULT_VAULT,
  useVaultRegistryStore,
} from './useVaultRegistryStore';

export type { RegisteredVault };
export { VAULT_REGISTRY_KEY, DEFAULT_VAULT, useVaultRegistryStore };

export function useVaultRegistry() {
  const { 
    vaultId: currentVaultId, 
    vaultName: currentVaultName, 
    storageType: currentStorageType, 
    isConnected, 
    connectIDB, 
    connectFSA, 
    setVaultName,
    getAllFiles,
  } = useVaultStore();

  const { activeLayers } = useIDB();

  const rawVaults = useVaultRegistryStore(s => s.vaults);
  const isLoaded = useVaultRegistryStore(s => s.isLoaded);
  const loadFromStorage = useVaultRegistryStore(s => s.loadFromStorage);
  const registerVault = useVaultRegistryStore(s => s.registerVault);
  const removeVaultAction = useVaultRegistryStore(s => s.removeVault);
  const renameVaultAction = useVaultRegistryStore(s => s.renameVault);
  const syncCurrentVault = useVaultRegistryStore(s => s.syncCurrentVault);

  // Inicializar o store a partir do localStorage no mount (uma única vez por app)
  useEffect(() => {
    if (!isLoaded) {
      loadFromStorage();
    }
  }, [isLoaded, loadFromStorage]);

  // Listener nativo de storage para sincronizar entre abas/janelas
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === VAULT_REGISTRY_KEY) {
        loadFromStorage();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadFromStorage]);

  // Sincronizar o vault atualmente conectado com a lista registrada
  useEffect(() => {
    if (!isLoaded || !currentVaultId) return;
    const existing = rawVaults.find(v => v.id === currentVaultId);
    syncCurrentVault({
      id: currentVaultId,
      name: currentVaultName,
      storageType: currentStorageType,
      folderName: existing?.folderName,
      path: existing?.path,
    });
  }, [currentVaultId, currentVaultName, currentStorageType, isLoaded, rawVaults, syncCurrentVault]);

  // Contagem de canvases por vault
  const allCanvases = useMemo(() => {
    return activeLayers.filter(l => l.isProjectMetadata);
  }, [activeLayers]);

  // Enriquecer vaults com estatísticas em tempo real
  const vaults = useMemo(() => {
    return rawVaults.map(vault => {
      const isCurrent = vault.id === currentVaultId;
      // Contar canvases que pertencem a este vault
      const linkedCanvases = allCanvases.filter(c => {
        if (c.vaultId) {
          return c.vaultId === vault.id;
        }
        // Se não tiver vaultId e este for o default, associa como fallback
        return vault.isDefault;
      });

      return {
        ...vault,
        canvasCount: linkedCanvases.length,
        documentCount: isCurrent ? getAllFiles().length : vault.documentCount || 0,
      };
    });
  }, [rawVaults, currentVaultId, allCanvases, getAllFiles]);

  const activeVault = useMemo(() => {
    return vaults.find(v => v.id === currentVaultId) || {
      id: currentVaultId || 'default-vault',
      name: currentVaultName || 'Meu Vault Local',
      storageType: currentStorageType,
      updatedAt: 0,
      canvasCount: allCanvases.filter(c => !c.vaultId || c.vaultId === currentVaultId).length,
      documentCount: getAllFiles().length,
      isDefault: currentVaultId === 'default-vault',
    };
  }, [vaults, currentVaultId, currentVaultName, currentStorageType, allCanvases, getAllFiles]);

  // Alternar para outro vault (ou reconectar o atual caso esteja desconectado)
  const switchVault = useCallback(async (targetVault: RegisteredVault, forcePicker = false): Promise<boolean> => {
    if (targetVault.id === currentVaultId && isConnected) return true;

    if (targetVault.storageType === 'fsa') {
      const success = await connectFSA(targetVault.id, forcePicker, targetVault.name);
      return Boolean(success);
    } else {
      await connectIDB(targetVault.id, targetVault.name);
      return true;
    }
  }, [currentVaultId, isConnected, connectFSA, connectIDB]);

  // Remover vault do registro (com opção de excluir também os arquivos físicos do computador)
  const removeVault = useCallback(async (vaultId: string, deleteDiskFolder: boolean = false): Promise<boolean> => {
    const targetVault = rawVaults.find(v => v.id === vaultId);

    // Se o vault a ser excluído for o que está atualmente ativo, alterna para outro vault
    if (vaultId === currentVaultId) {
      const otherVault = rawVaults.find(v => v.id !== vaultId) || DEFAULT_VAULT;
      try {
        await switchVault(otherVault);
      } catch (err) {
        console.warn('[useVaultRegistry] Falha ao alternar de vault antes de excluir ativo:', err);
      }
    }

    // Se solicitada a exclusão física da pasta do computador
    if (deleteDiskFolder) {
      const physicalPath = targetVault?.path || (targetVault?.folderName && typeof window !== 'undefined' && window.electronAPI ? `D:\\RPG\\Campanhas\\${targetVault.folderName}` : undefined);
      await FSAStorageProvider.deletePhysicalDirectory(vaultId, physicalPath);
    }

    // Limpar o handle salvo no IndexedDB se for FSA
    if (vaultId.startsWith('fsa-') || vaultId === 'fsa-main') {
      await FSAStorageProvider.removeSavedHandleFromIDB(vaultId);
    }

    // Remover do store Zustand e localStorage
    removeVaultAction(vaultId);
    return true;
  }, [currentVaultId, rawVaults, switchVault, removeVaultAction]);

  // Renomear vault
  const renameVault = useCallback(async (vaultId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (vaultId === currentVaultId) {
      await setVaultName(trimmed);
    }

    renameVaultAction(vaultId, trimmed);
  }, [currentVaultId, setVaultName, renameVaultAction]);

  return {
    vaults,
    activeVault,
    activeVaultId: currentVaultId,
    allCanvases,
    registerVault,
    removeVault,
    switchVault,
    renameVault,
    connectFSA,
    connectIDB,
    isConnected,
  };
}
