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
import { RefreshCw } from 'lucide-react';
import { useIDB } from '@/utils/indexedDB';
import { Layer } from '@/interfaces/utils/indexedDB';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';
import { WindowControls } from '@/components/common/WindowControls';

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

  const handleCreateBoardCanvas = () => {
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
      folderPath: null,
      vaultId: vaultId || 'default-vault',
      vaultName: vaultName || 'Meu Vault',
    };

    addLayer(projectMeta);
    openCanvasTab(newId, newName);
  };

  const [isGraphOpen, setIsGraphOpen] = useState(false);

  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

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

  // Open note from URL parameter (e.g. from canvas pin click)
  useEffect(() => {
    if (!isLoading && router.query.doc && typeof router.query.doc === 'string') {
      const docToOpen = router.query.doc;
      // Limpa imediatamente o parâmetro da URL para não reexecutar ao alternar vaults
      router.replace('/vault', undefined, { shallow: true });
      openOrCreateDocumentByTitle(docToOpen);
    }
  }, [isLoading, router.query.doc, openOrCreateDocumentByTitle, router]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-[#17192A] flex flex-col items-center justify-center text-[#B4D3F1] gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#7F95FF]" />
        <span className="text-sm font-medium">Carregando Vault e arquivos...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-row bg-white text-stone-900 dark:bg-[#17192A] dark:text-[#F4F0E6] overflow-hidden select-none transition-colors duration-200 relative">
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
