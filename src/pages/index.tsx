import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useIDB } from '@/utils/indexedDB';
import { Layer } from '@/interfaces/utils/indexedDB';
import { updateBoardNameInIDB } from '@/modules/board/hooks/useBoardStorage';
import { useThemeStore } from '@/store/themeStore';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { useVaultRegistry, RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { useVaultRealGraphData } from '@/modules/vault/hooks/useVaultRealGraphData';
import { 
  DashboardSidebarRibbon, 
  DashboardTab 
} from '@/components/Dashboard/DashboardSidebarRibbon';
import { DashboardAdaptivePanel } from '@/components/Dashboard/DashboardAdaptivePanel';
import { AmbientGraphBackdrop } from '@/components/Dashboard/AmbientGraphBackdrop';
import { CreateVaultModal } from '@/components/Dashboard/CreateVaultModal';
import { CanvasCreateModal } from '@/components/Dashboard/CanvasCreateModal';
import { VaultSettingsModal } from '@/modules/vault/components/VaultSettingsModal';
import { DeleteConfirmModal } from '@/modules/vault/components/DeleteConfirmModal';
import { ExportModal } from '@/components/ExportModal';
import { ImportConflictModal } from '@/components/ImportConflictModal';
import { parseBackupFile, ParsedImportData } from '@/utils/exportSystem/importUtils';
import { isElectron, setWindowMode } from '@/utils/electronHelper';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

export default function Dashboard() {
  const router = useRouter();
  const { activeLayers, addLayer, updateLayer, deleteLayer } = useIDB();

  // Vault Store & Registry
  const { 
    initializeStorage, 
    setSettingsOpen, 
    refreshNodes 
  } = useVaultStore();

  const {
    vaults,
    activeVault,
    activeVaultId,
    registerVault,
    removeVault,
    switchVault,
    renameVault,
    connectFSA,
    connectIDB,
    isConnected,
  } = useVaultRegistry();

  // Active Dashboard Tab (Default: 'active-vault')
  const [activeTab, setActiveTab] = useState<DashboardTab>('active-vault');

  // Sync tab from URL parameter if present
  useEffect(() => {
    if (router.isReady && router.query.tab) {
      const tab = router.query.tab as string;
      if (tab === 'canvases') {
        setActiveTab('canvases');
      } else {
        setActiveTab('active-vault');
      }
    }
  }, [router.isReady, router.query.tab]);

  // Initialize vault storage on mount
  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  // Projects & Canvases State
  const [projects, setProjects] = useState<Layer[]>([]);
  const [projectPageCounts, setProjectPageCounts] = useState<Record<string, number>>({});

  // Real Vault Graph & Connections Data (Real files, wikilinks, and canvases)
  const {
    nodes: realGraphNodes,
    links: realGraphLinks,
    isLoading: isGraphLoading,
  } = useVaultRealGraphData(activeVault, projects);

  // Modals State
  const [isCreateVaultModalOpen, setIsCreateVaultModalOpen] = useState(false);
  const [isCreateCanvasModalOpen, setIsCreateCanvasModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<ParsedImportData | null>(null);
  const [isConnectingFSA, setIsConnectingFSA] = useState(false);

  // Delete canvas modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    canvas: Layer | null;
  }>({ isOpen: false, canvas: null });

  // Escape key handler for delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModal.isOpen) setDeleteModal({ isOpen: false, canvas: null });
        if (isCreateVaultModalOpen) setIsCreateVaultModalOpen(false);
        if (isCreateCanvasModalOpen) setIsCreateCanvasModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteModal.isOpen, isCreateVaultModalOpen, isCreateCanvasModalOpen]);

  // Sync projects and compute page counts
  useEffect(() => {
    const pMap = new Map<string, Layer>();
    const pGroups = new Map<string, Layer[]>();

    let migrationNeeded = false;
    const actionsToPerform: (() => void)[] = [];

    activeLayers.forEach(l => {
      if (l.isProjectMetadata) {
        pMap.set(l.id, l);
      } else if (l.isProject) {
        const pid = l.projectId || l.id;
        if (!pGroups.has(pid)) pGroups.set(pid, []);
        pGroups.get(pid)?.push(l);
      }
    });

    // Check for orphaned groups (legacy migration)
    pGroups.forEach((pages, pid) => {
      if (!pMap.has(pid)) {
        const firstPage = pages[0];
        const metaLayer: Layer = {
          id: pid,
          type: 'group',
          name: firstPage.name,
          visible: true,
          locked: false,
          parentId: null,
          depth: 0,
          isProject: false,
          isProjectMetadata: true,
          projectId: pid,
          order: 0,
        };
        pMap.set(pid, metaLayer);
        actionsToPerform.push(() => addLayer(metaLayer));
        migrationNeeded = true;
      }
    });

    // Compute page counts
    const counts: Record<string, number> = {};
    pGroups.forEach((pages, pid) => {
      counts[pid] = pages.length;
    });
    setProjectPageCounts(counts);

    setProjects(Array.from(pMap.values()));

    if (migrationNeeded && actionsToPerform.length > 0) {
      actionsToPerform.forEach(action => action());
    }
  }, [activeLayers, addLayer]);

  // Navigate to Canvas
  const handleOpenCanvas = (canvas: Layer) => {
    if (isElectron()) {
      setWindowMode('workspace');
    }
    if (canvas.canvasType === 'board') {
      router.push(`/board/${canvas.id}`);
    } else {
      router.push(`/project/${canvas.id}`);
    }
  };

  // Create new canvas with assigned vault
  const handleCreateCanvas = (
    canvasType: 'audio' | 'board',
    targetVaultId: string | null = null,
    targetVaultName: string | null = null
  ) => {
    const prefix = canvasType === 'board' ? 'Quadro de Conexões' : 'Projeto de Áudio';
    let newName = `${prefix} 1`;
    let counter = 1;
    const existingNames = new Set(projects.map(p => p.name.trim()));

    while (existingNames.has(`${prefix} ${counter}`)) {
      counter++;
    }
    newName = `${prefix} ${counter}`;

    const newProjectId = uuidv4();

    const projectMeta: Layer = {
      id: newProjectId,
      type: 'group',
      name: newName,
      visible: true,
      locked: false,
      parentId: null,
      depth: 0,
      isProject: false,
      isProjectMetadata: true,
      projectId: newProjectId,
      order: 0,
      canvasType,
      vaultId: targetVaultId,
      vaultName: targetVaultName,
      folderPath: null,
    };
    addLayer(projectMeta);

    if (isElectron()) {
      setWindowMode('workspace');
    }

    if (canvasType === 'audio') {
      const newPage: Layer = {
        id: uuidv4(),
        type: 'group',
        name: 'Página 1',
        visible: true,
        locked: false,
        parentId: null,
        depth: 0,
        isProject: true,
        projectId: newProjectId,
        order: 0,
      };
      addLayer(newPage);
      router.push(`/project/${newProjectId}`);
    } else {
      router.push(`/board/${newProjectId}`);
    }
  };

  // Canvas Update / Rename flow
  const handleUpdateCanvas = useCallback(async (canvas: Layer) => {
    updateLayer(canvas);
    if (canvas.canvasType === 'board') {
      await updateBoardNameInIDB(canvas.id, canvas.name);
    }
    useVaultStore.getState().updateCanvasTitleInTabs(canvas.id, canvas.name);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas_renamed', {
        detail: { canvasId: canvas.id, newName: canvas.name }
      }));
    }
  }, [updateLayer]);

  // Canvas Delete flow
  const handleDeleteConfirm = () => {
    const canvas = deleteModal.canvas;
    if (!canvas) return;

    deleteLayer(canvas.id);
    useVaultStore.getState().closeTab(`canvas:${canvas.id}`);
    const pages = activeLayers.filter(l => l.projectId === canvas.id || (l.projectId === undefined && l.id === canvas.id));
    pages.forEach(p => {
      deleteLayer(p.id);
      useVaultStore.getState().closeTab(`canvas:${p.id}`);
    });
    setDeleteModal({ isOpen: false, canvas: null });
  };

  // FSA Connection trigger: Reconectar o vault ativo atual
  const handleReconnectActiveFSA = async () => {
    try {
      setIsConnectingFSA(true);
      const success = await connectFSA(activeVaultId, false);
      if (success) {
        await refreshNodes();
      }
      return success;
    } finally {
      setIsConnectingFSA(false);
    }
  };

  // FSA Connection trigger: Conectar uma NOVA pasta do Windows (gera novo vault ID)
  const handleTriggerConnectNewFSA = async () => {
    try {
      setIsConnectingFSA(true);
      const success = await connectFSA();
      if (success) {
        await refreshNodes();
      }
      return success;
    } finally {
      setIsConnectingFSA(false);
    }
  };

  // Theme Management
  const { setIsSettingsOpen, theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme : 'dark';
  const isLight = currentTheme === 'light';

  // Guard de montagem para garantir hidratação SSR determinística e sem warnings
  if (!mounted) {
    return (
      <>
        <Head>
          <title>Concha</title>
          <meta name="description" content="Editor Markdown, base de conhecimento integrada e quadros de conexões do Concha." />
        </Head>
        <div 
          suppressHydrationWarning
          className="w-full h-full overflow-hidden flex flex-row select-none bg-[#17192A] text-[#F4F0E6] relative"
        >
          <div className="w-11 h-full bg-[#131524] border-r border-white/[0.07] shrink-0" />
          <div className="w-full sm:w-[370px] lg:w-[380px] h-full bg-[#131524] border-r border-white/[0.07] shrink-0" />
          <main className="flex-1 h-full bg-[#17192A] hidden md:block" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Concha</title>
        <meta name="description" content="Editor Markdown, base de conhecimento integrada e quadros de conexões do Concha." />
      </Head>

      <div 
        suppressHydrationWarning
        className={clsx(
          "w-full h-full overflow-hidden flex flex-row select-none transition-colors duration-200 relative",
          isLight 
            ? "bg-[#F4F0E6] text-[#17192A]" 
            : "bg-[#17192A] text-[#F4F0E6]"
        )}
      >
        {/* ============================================================
            1. MENU LATERAL DE ÍCONES (RIBBON w-11 / 44px)
            ============================================================ */}
        <DashboardSidebarRibbon
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          theme={currentTheme}
          onToggleTheme={toggleTheme}
        />

        {/* ============================================================
            2. JANELA LATERAL ADAPTATIVA (~370px)
            ============================================================ */}
        <DashboardAdaptivePanel
          activeTab={activeTab}
          activeVault={activeVault}
          vaults={vaults}
          onRenameVault={renameVault}
          onSwitchVault={(targetVault: RegisteredVault, forcePicker?: boolean) => switchVault(targetVault, forcePicker)}
          onConnectFSA={handleReconnectActiveFSA}
          onCreateVault={() => setIsCreateVaultModalOpen(true)}
          onRemoveVault={removeVault}
          onOpenSettings={() => setSettingsOpen(true)}
          onExportBackup={() => setIsExportModalOpen(true)}
          onImportBackup={async (file: File) => {
            try {
              const parsed = await parseBackupFile(file);
              setParsedImportData(parsed);
              setIsImportModalOpen(true);
            } catch (err) {
              console.error(err);
              alert("Arquivo zip inválido ou corrompido.");
            }
          }}
          isConnectingFSA={isConnectingFSA}
          canvases={projects}
          projectPageCounts={projectPageCounts}
          onCreateCanvas={() => setIsCreateCanvasModalOpen(true)}
          onOpenCanvas={handleOpenCanvas}
          onDeleteCanvas={(canvas) => setDeleteModal({ isOpen: true, canvas })}
          onUpdateCanvas={handleUpdateCanvas}
          theme={currentTheme}
        />

        {/* ============================================================
            3. ÁREA PRINCIPAL: GRAFO DE CONEXÕES AMBIENTE (WEB VIEWPORT)
            ============================================================ */}
        <main className="flex-1 h-full relative overflow-hidden hidden md:block">
          <AmbientGraphBackdrop
            vaultName={activeVault.name}
            realNodes={realGraphNodes}
            realLinks={realGraphLinks}
            isLoading={isGraphLoading}
            onSelectNode={async (pathOrTitle, isCanvas) => {
              if (activeVault.storageType === 'fsa' && !isConnected) {
                try {
                  await connectFSA(activeVaultId, false);
                } catch {}
              }
              if (isElectron()) {
                setWindowMode('workspace');
              }
              if (isCanvas) {
                const found = projects.find(p => p.id === pathOrTitle || p.name === pathOrTitle);
                if (found) {
                  handleOpenCanvas(found);
                  return;
                }
              }
              useVaultStore.getState().startEnteringVault(activeVault.name);
              router.push(`/vault?doc=${encodeURIComponent(pathOrTitle)}`);
            }}
          />
        </main>
      </div>

      {/* ============================================================
          MODALS DE APOIO
          ============================================================ */}
      <CreateVaultModal
        isOpen={isCreateVaultModalOpen}
        onClose={() => setIsCreateVaultModalOpen(false)}
        onConnectFSA={handleTriggerConnectNewFSA}
        onCreateIDB={connectIDB}
        onRegisterVault={registerVault}
      />

      <CanvasCreateModal
        isOpen={isCreateCanvasModalOpen}
        onClose={() => setIsCreateCanvasModalOpen(false)}
        vaults={vaults}
        activeVaultId={activeVaultId}
        onCreate={handleCreateCanvas}
      />

      {/* Modal de Exclusão de Canvas */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteModal.isOpen && deleteModal.canvas)}
        itemName={deleteModal.canvas?.name || ''}
        itemPath={deleteModal.canvas ? `canvas:${deleteModal.canvas.id}` : undefined}
        itemType="canvas"
        onClose={() => setDeleteModal({ isOpen: false, canvas: null })}
        onConfirm={handleDeleteConfirm}
      />

      {/* Modal de Configurações do Vault */}
      <VaultSettingsModal />

      {/* Modais de Backup / Importação */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeLayers={activeLayers}
        currentProjectId={null}
      />

      <ImportConflictModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        parsedData={parsedImportData}
        onSuccess={() => {
          setIsImportModalOpen(false);
          alert('Importação concluída com sucesso! Recarregando a página.');
          window.location.reload();
        }}
      />
    </>
  );
}
