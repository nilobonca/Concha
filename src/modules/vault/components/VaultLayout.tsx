import React, { useEffect, useState } from 'react';
import { useVaultStore } from '../hooks/useVaultStore';
import { VaultSidebar } from './VaultSidebar';
import { VaultPaneContainer } from './layout/VaultPaneContainer';
import { VaultRibbon } from './layout/VaultRibbon';
import { VaultDetailsSidebar } from './VaultDetailsSidebar';
import { VaultCommandPalette } from './VaultCommandPalette';
import { VaultSettingsModal } from './VaultSettingsModal';
import { VaultTemplateModal } from './VaultTemplateModal';
import { VaultGraphView } from './VaultGraphView';
import { useIDB } from '@/utils/indexedDB';
import { Layer } from '@/interfaces/utils/indexedDB';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import { WindowControls } from '@/components/common/WindowControls';
import { saveCanvasToDisk } from '../utils/canvasDiskSync';
import { saveBoardDataToStorage } from '@/modules/board/hooks/useBoardStorage';
import { BoardData } from '@/modules/board/types';
import { FSAStorageProvider } from '../storage/FSAStorageProvider';

export const VaultLayout: React.FC = () => {
  const router = useRouter();
  const { 
    sidebarOpen, 
    initializeStorage, 
    isLoading, 
    backlinksPanelOpen,
    openOrCreateDocumentByTitle,
    openCanvasTab,
    layout,
    templateModalOpen,
    setTemplateModalOpen,
    setCanvases,
    vaultId,
    vaultName,
    activePath,
    expandedFolders,
    toggleFolder,
  } = useVaultStore();

  const { activeLayers, addLayer } = useIDB();

  // Sincronizar canvases do IDB pertencentes a este vault para resolução de links/citações
  const isDefaultVault = vaultId === 'default-vault' || !vaultId;
  useEffect(() => {
    const projectCanvases = activeLayers.filter(l => {
      const isMeta = l.isProjectMetadata || (!l.parentId && l.canvasType);
      if (!isMeta) return false;
      if (l.vaultId) return l.vaultId === vaultId;
      return isDefaultVault;
    });
    setCanvases(projectCanvases);
  }, [activeLayers, setCanvases, vaultId, isDefaultVault]);

  const handleCreateBoardCanvas = async () => {
    let { provider, initializeStorage } = useVaultStore.getState();
    if (!provider) {
      await initializeStorage();
      provider = useVaultStore.getState().provider;
    }

    if (useVaultStore.getState().storageType === 'fsa' && provider instanceof FSAStorageProvider) {
      if (!provider.isConnected) {
        await provider.reconnect();
      }
      if (provider.isConnected && !useVaultStore.getState().isConnected) {
        useVaultStore.setState({ isConnected: true, vaultName: provider.vaultName });
        await useVaultStore.getState().refreshNodes();
      }
    }

    const newId = uuidv4();
    const existingBoards = activeLayers.filter(l => {
      const isMeta = l.isProjectMetadata && l.canvasType === 'board';
      if (!isMeta) return false;
      if (l.vaultId) return l.vaultId === vaultId;
      return isDefaultVault;
    });
    let counter = 1;
    while (existingBoards.some(b => b.name === `Quadro de Conexões ${counter}`)) {
      counter++;
    }
    const newName = `Quadro de Conexões ${counter}`;

    // Determina a pasta ativa se o usuário estiver trabalhando dentro de um diretório
    let targetFolder: string = '';
    if (activePath && !activePath.startsWith('canvas:')) {
      const lastSlash = activePath.lastIndexOf('/');
      if (lastSlash !== -1) {
        targetFolder = activePath.slice(0, lastSlash);
      }
    }

    const projectMeta: Layer = {
      id: newId,
      type: 'group',
      name: newName,
      visible: true,
      locked: false,
      parentId: null,
      depth: 0,
      isProject: false,
      isProjectMetadata: true,
      projectId: newId,
      order: 0,
      canvasType: 'board',
      folderPath: targetFolder,
      vaultId: vaultId || 'default-vault',
      vaultName: vaultName || 'Meu Vault',
    };

    addLayer(projectMeta);

    const initialData: BoardData = {
      id: newId,
      name: newName,
      elements: [],
      connections: [],
      updatedAt: new Date().toISOString(),
    };
    await saveBoardDataToStorage(initialData, targetFolder);

    const vaultStore = useVaultStore.getState();
    const currentProvider = vaultStore.provider;
    if (currentProvider && currentProvider.isConnected) {
      await saveCanvasToDisk(currentProvider, targetFolder, newName, initialData);
      await vaultStore.refreshNodes();
    }

    // Se o canvas foi criado dentro de uma pasta, garante que ela esteja aberta na árvore
    if (targetFolder) {
      if (!expandedFolders.has(targetFolder)) {
        toggleFolder(targetFolder);
      }
    }

    openCanvasTab(newId, newName);
  };

  const [isGraphOpen, setIsGraphOpen] = useState(false);

  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  // Auto-reconexão silenciosa no primeiro gesto do usuário caso a pasta FSA necessite de ativação de permissão
  useEffect(() => {
    const handleFirstInteraction = async () => {
      const state = useVaultStore.getState();
      if (state.storageType === 'fsa' && !state.isConnected) {
        try {
          await state.connectFSA(state.vaultId, false);
        } catch (err) {
          console.warn('[VaultLayout] Auto-reconexão no primeiro clique:', err);
        }
      }
    };

    window.addEventListener('click', handleFirstInteraction, { once: true, capture: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true, capture: true });
    return () => {
      window.removeEventListener('click', handleFirstInteraction, { capture: true });
      window.removeEventListener('keydown', handleFirstInteraction, { capture: true });
    };
  }, []);

  // Limpeza global de drag para evitar estados presos
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      useVaultStore.getState().setDraggedTab(null);
      useVaultStore.getState().setDropPreview(null);
    };
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);

  // Atalhos globais para abas: Ctrl+T (Nova Aba) e Ctrl+W (Fechar Aba Ativa)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T ou Cmd+T: Nova Aba
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        e.stopPropagation();
        useVaultStore.getState().openNewTab();
        return;
      }

      // Ctrl+W ou Cmd+W: Fechar Aba Ativa
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        const state = useVaultStore.getState();
        if (state.activePaneId && state.activePath) {
          e.preventDefault();
          e.stopPropagation();
          state.closeTabInPane(state.activePaneId, state.activePath);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open note from URL parameter (e.g. from canvas pin click)
  useEffect(() => {
    if (!isLoading && router.query.doc && typeof router.query.doc === 'string') {
      const docToOpen = router.query.doc;
      // Limpa imediatamente o parâmetro da URL para não reexecutar ao alternar vaults
      router.replace('/vault', undefined, { shallow: true });
      openOrCreateDocumentByTitle(docToOpen);
    }
  }, [isLoading, router.query.doc, openOrCreateDocumentByTitle, router]);

  return (
    <div className="w-full h-full flex flex-row bg-white text-stone-900 dark:bg-[#17192A] dark:text-[#F4F0E6] overflow-hidden select-none transition-colors duration-200 relative">
      {/* Overlay suave durante carregamento inicial do vault (gerenciado pelo VaultLoadingModal) */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#17192A]/20 dark:bg-black/30 backdrop-blur-[1px] z-40 pointer-events-none transition-opacity duration-300" />
      )}

      {/* Controles de Janela do Windows no Canto Superior Direito (.exe Electron) */}
      <div 
        className="absolute top-0 right-0 h-9 z-50 flex items-center pr-1.5 select-none pointer-events-auto app-region-no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <WindowControls variant="compact" />
      </div>

      {/* Obsidian-Style Left Ribbon (Barra Vertical de Atalhos) */}
      <VaultRibbon
        onOpenGraph={() => setIsGraphOpen(true)}
        onCreateBoardCanvas={handleCreateBoardCanvas}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Left Sidebar */}
        {sidebarOpen && <VaultSidebar />}

        {/* Center Content: Multi-window docking split-panes */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#17192A] min-w-0 relative">
          <VaultPaneContainer node={layout} />
        </main>

        {/* Right Sidebar: Details Panel (Properties & Backlinks) */}
        {backlinksPanelOpen && <VaultDetailsSidebar />}
      </div>

      {/* Global Command Palette Modal (Ctrl+P) */}
      <VaultCommandPalette />

      {/* Vault Settings Modal (Engrenagem) */}
      <VaultSettingsModal />

      {/* Vault Templates Modal */}
      <VaultTemplateModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
      />

      {/* Interactive Graph View (D3 Force) */}
      {isGraphOpen && (
        <VaultGraphView onClose={() => setIsGraphOpen(false)} />
      )}
    </div>
  );
};
