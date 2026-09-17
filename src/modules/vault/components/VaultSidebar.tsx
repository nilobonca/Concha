import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useVaultStore, getCustomOrder, setCustomOrder } from '../hooks/useVaultStore';
import { VaultNode } from '../interfaces/vault';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { PromptInputModal } from './PromptInputModal';
import ContextMenu from '@/components/ContextMenu';
import { VaultGeneralCanvasesTab } from './sidebar/VaultGeneralCanvasesTab';
import { useIDB } from '@/utils/indexedDB';
import { Layer } from '@/interfaces/utils/indexedDB';
import { updateBoardNameInIDB, saveBoardDataToStorage, getBoardDataFromStorage } from '@/modules/board/hooks/useBoardStorage';
import { BoardData } from '@/modules/board/types';
import { saveCanvasToDisk, renameCanvasOnDisk, moveCanvasOnDisk, deleteCanvasFromDisk } from '../utils/canvasDiskSync';
import { saveUserTemplate } from '../utils/templateStore';
import { navigateToProject } from '@/utils/navigationHelper';
import { v4 as uuidv4 } from 'uuid';
import { 
  Folder, FolderOpen, FileText, File, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, Trash2, Search, HardDrive, Database,
  RefreshCw, FolderSync, LayoutTemplate, Edit2, BookmarkPlus,
  Copy, FolderInput, Music, Check, FolderKanban, Box, Upload, Image as ImageIcon,
  Settings, Loader2, X
} from 'lucide-react';
import { FSAStorageProvider } from '../storage/FSAStorageProvider';
import { InlineRenameInput } from './sidebar/InlineRenameInput';
import { createDefaultDatabase } from '@/modules/database/utils/databaseDefaults';
import { 
  parseDatabaseRowPath,
  formatDatabaseRowPath,
  convertRowsToVaultNodes,
  parseDatabaseContent,
  createDatabaseRowInInstance,
  renameDatabaseRowInInstance,
  deleteDatabaseRowFromInstance,
  syncRowToVaultFile,
  deleteRowVaultFile,
  DatabaseRowVaultNode
} from '../utils/databaseNodeUtils';

interface FolderInputRowProps {
  parentPath: string;
  depth: number;
  defaultName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

const FolderInputRow: React.FC<FolderInputRowProps> = ({
  depth,
  defaultName,
  onSubmit,
  onCancel,
}) => {
  return (
    <div
      style={{ paddingLeft: `${depth * 14 + 12}px` }}
      className="flex items-center gap-2 py-1.5 pr-2 my-0.5 rounded-lg bg-[#1831D7]/10 border border-[#7F95FF]/50 shadow-xs animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-stone-400 dark:text-neutral-400">
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
      <Folder className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
      <InlineRenameInput
        initialName={defaultName}
        isFolder={true}
        onSubmit={onSubmit}
        onCancel={onCancel}
        className="flex-1 bg-transparent text-xs text-stone-900 dark:text-neutral-100 outline-none font-medium selection:bg-[#7F95FF]/30 dark:selection:bg-[#1831D7]/50"
        placeholder={defaultName}
      />
    </div>
  );
};

export const VaultSidebar: React.FC = () => {
  const router = useRouter();
  const { 
    vaultId,
    vaultName, 
    setVaultName,
    storageType, 
    isConnected,
    nodes, 
    expandedFolders, 
    customOrderVersion,
    activePath, 
    searchQuery,
    setSearchQuery,
    toggleFolder, 
    openDocument, 
    openCanvasTab,
    closeTab,
    createFile, 
    saveMediaFile,
    createFolder, 
    deleteNode,
    renameNode,
    moveNode,
    reorderNodes,
    refreshNodes,
    connectFSA,
    provider,
    sidebarWidth, 
    setSidebarWidth,
    sidebarTab,
    setSidebarTab,
    setSettingsOpen,
    setTemplateModalOpen
  } = useVaultStore();

  const { activeLayers, addLayer, updateLayer, deleteLayer } = useIDB();

  // Canvases from IndexedDB pertencentes a este vault específico
  const isDefaultVault = vaultId === 'default-vault' || !vaultId;
  const allCanvases = useMemo(() => {
    return activeLayers.filter(l => {
      if (!l.isProjectMetadata) return false;
      if (l.vaultId) return l.vaultId === vaultId;
      return isDefaultVault;
    });
  }, [activeLayers, vaultId, isDefaultVault]);
  const generalCanvases = useMemo(() => allCanvases.filter(l => !l.folderPath), [allCanvases]);
  const hasSavedFolder = useMemo(() => {
    return provider instanceof FSAStorageProvider ? provider.hasSavedHandle : false;
  }, [provider]);

  const [isConnectingFolder, setIsConnectingFolder] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  // Cache de registros de bancos de dados mapeados como notas filhas no explorador
  const [dbRowsCache, setDbRowsCache] = useState<Record<string, VaultNode[]>>({});

  const loadDatabaseRows = React.useCallback(async (dbPath: string) => {
    if (!dbPath) return;
    try {
      let rawJson = '';
      const activeProvider = provider || useVaultStore.getState().provider;
      if (activeProvider) {
        try {
          rawJson = await activeProvider.readDocument(dbPath);
        } catch (readErr) {
          console.warn('[VaultSidebar] Falha ao ler documento pelo provider:', readErr);
        }
      }

      const db = parseDatabaseContent(rawJson);
      if (db && Array.isArray(db.rows)) {
        const rowNodes = convertRowsToVaultNodes(dbPath, db.rows);
        setDbRowsCache(prev => ({ ...prev, [dbPath]: rowNodes }));
      } else {
        setDbRowsCache(prev => ({ ...prev, [dbPath]: [] }));
      }
    } catch (err) {
      console.warn('[VaultSidebar] Erro ao carregar notas do banco de dados:', err);
    }
  }, [provider]);

  // Atualização reativa de registros de banco quando salvos ou editados
  React.useEffect(() => {
    const handleDbUpdated = (e: Event) => {
      const customEv = e as CustomEvent<{ dbPath: string }>;
      if (customEv.detail && customEv.detail.dbPath) {
        loadDatabaseRows(customEv.detail.dbPath);
      }
    };

    window.addEventListener('supercanvas-db-updated', handleDbUpdated);
    return () => {
      window.removeEventListener('supercanvas-db-updated', handleDbUpdated);
    };
  }, [loadDatabaseRows]);

  // Carrega automaticamente os registros das bases ativas na árvore de arquivos expandidas
  React.useEffect(() => {
    expandedFolders.forEach((folderPath) => {
      if (
        folderPath.toLowerCase().includes('.db.json') ||
        folderPath.toLowerCase().includes('.database') ||
        folderPath.toLowerCase().endsWith('.db.json.md')
      ) {
        loadDatabaseRows(folderPath);
      }
    });
  }, [expandedFolders, loadDatabaseRows, nodes, provider]);

  // New file / folder creation states
  const [newFileInputFolder, setNewFileInputFolder] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderInputParent, setNewFolderInputParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingNodePath, setRenamingNodePath] = useState<string | null>(null);

  // Drag and drop states
  const [draggedNode, setDraggedNode] = useState<VaultNode | null>(null);
  const [draggedCanvas, setDraggedCanvas] = useState<Layer | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'before' | 'after' | 'inside';
    parentPath: string;
  } | null>(null);
  const dropTargetRef = useRef<{
    id: string;
    position: 'before' | 'after' | 'inside';
    parentPath: string;
  } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  // Right-click Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node?: VaultNode;
    canvas?: Layer;
  } | null>(null);

  // Selected items in the file explorer (Multi-selection support)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Derived primary selectedPath for legacy compatibility
  const selectedPath = useMemo(() => {
    if (lastSelectedPath && selectedPaths.has(lastSelectedPath)) {
      return lastSelectedPath;
    }
    const first = Array.from(selectedPaths)[0];
    return first || null;
  }, [selectedPaths, lastSelectedPath]);

  const setSelectedPath = React.useCallback((path: string | null) => {
    if (!path) {
      setSelectedPaths(new Set());
      setLastSelectedPath(null);
    } else {
      setSelectedPaths(new Set([path]));
      setLastSelectedPath(path);
    }
  }, []);

  // Synchronize selectedPaths with activePath whenever activePath changes
  React.useEffect(() => {
    if (activePath) {
      setSelectedPaths((prev) => {
        if (prev.has(activePath)) return prev;
        return new Set([activePath]);
      });
      setLastSelectedPath((prev) => prev || activePath);
    }
  }, [activePath]);

  // In-app Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    name: string;
    isFolder: boolean;
    itemType?: 'file' | 'folder' | 'canvas';
    canvasId?: string;
  } | null>(null);

  // In-app Prompt Input Modal state (substitui prompt nativo do navegador)
  const [promptModal, setPromptModal] = useState<{
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    icon?: React.ReactNode;
    onConfirm: (value: string) => void | Promise<void>;
  } | null>(null);

  // Recursive helper to find a node by its path
  const findNodeByPath = (nodeList: VaultNode[], path: string): VaultNode | null => {
    for (const item of nodeList) {
      if (item.path === path) return item;
      if (item.children) {
        const found = findNodeByPath(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Multi-delete execution helper
  const handleBatchDelete = async (pathsToDelete: string[]) => {
    for (const path of pathsToDelete) {
      if (path.startsWith('canvas:')) {
        const canvasId = path.replace('canvas:', '');
        const c = allCanvases.find(item => item.id === canvasId);
        if (c && c.canvasType === 'board' && provider) {
          await deleteCanvasFromDisk(provider, c.folderPath, c.name);
        }
        if (c) {
          deleteLayer(c.id);
          closeTab(`canvas:${c.id}`);
        }
      } else {
        const node = findNodeByPath(nodes, path);
        const isFolder = node ? node.type === 'folder' : false;
        await deleteNode(path, isFolder);
      }
    }
    refreshNodes();
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  };

  // Helper to trigger deletion modal for currently selected item(s)
  const triggerDeleteSelected = (customPath?: string) => {
    const targetPaths = (selectedPaths.size > 1 && (!customPath || selectedPaths.has(customPath)))
      ? Array.from(selectedPaths)
      : [customPath || selectedPath || activePath].filter(Boolean) as string[];

    if (targetPaths.length === 0) return;

    const skipConfirm = typeof window !== 'undefined' && localStorage.getItem('vault_skip_delete_confirm') === 'true';

    if (targetPaths.length > 1) {
      if (skipConfirm) {
        handleBatchDelete(targetPaths);
        return;
      }
      setDeleteTarget({
        path: '__BATCH__',
        name: `${targetPaths.length} itens`,
        isFolder: false,
        itemType: 'file'
      });
      return;
    }

    const targetPath = targetPaths[0];

    if (targetPath.startsWith('canvas:')) {
      const canvasId = targetPath.replace('canvas:', '');
      const c = allCanvases.find(item => item.id === canvasId);
      if (c) {
        if (skipConfirm) {
          if (c.canvasType === 'board') {
            deleteCanvasFromDisk(provider, c.folderPath, c.name).then(() => {
              refreshNodes();
            });
          }
          deleteLayer(c.id);
          closeTab(`canvas:${c.id}`);
          return;
        }
        setDeleteTarget({
          path: targetPath,
          name: c.name,
          isFolder: false,
          itemType: 'canvas',
          canvasId: c.id
        });
      }
      return;
    }

    const node = findNodeByPath(nodes, targetPath);
    if (!node) return;

    const isFolder = node.type === 'folder';
    const isNote = node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt')));
    const displayName = isFolder
      ? node.name
      : (isNote ? node.name.replace(/\.(md|txt)$/i, '') : node.name);

    if (skipConfirm) {
      deleteNode(node.path, isFolder);
      setSelectedPaths(prev => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
      return;
    }

    setDeleteTarget({
      path: node.path,
      name: displayName,
      isFolder,
      itemType: isFolder ? 'folder' : 'file'
    });
  };






  // Sidebar resize states & handlers
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const handleSidebarResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetSidebarWidth = () => {
    setSidebarWidth(260);
  };

  // Hidden media input ref and target folder
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<string>('');

  const triggerMediaUpload = (folderPath: string = '') => {
    setUploadTargetFolder(folderPath);
    mediaInputRef.current?.click();
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await saveMediaFile(file, uploadTargetFolder);
      } catch (err) {
        console.error('Erro ao salvar mídia no Vault:', err);
      }
    }
    e.target.value = '';
  };

  const handleSidebarContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };


  const handleCreateBoardCanvas = async (targetFolderPath: string | null = null) => {
    let resolvedFolder: string = targetFolderPath ?? '';
    if (!resolvedFolder) {
      if (selectedPath && !selectedPath.startsWith('canvas:')) {
        const selectedNode = findNodeByPath(nodes, selectedPath);
        if (selectedNode?.type === 'folder') {
          resolvedFolder = selectedNode.path;
        } else if (selectedPath.includes('/')) {
          resolvedFolder = selectedPath.slice(0, selectedPath.lastIndexOf('/'));
        }
      } else if (activePath && !activePath.startsWith('canvas:') && activePath.includes('/')) {
        resolvedFolder = activePath.slice(0, activePath.lastIndexOf('/'));
      }
    }

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

    let newName = 'Quadro de Conexões 1';
    let counter = 1;
    const existingNames = new Set(allCanvases.map(p => p.name.trim()));
    while (existingNames.has(`Quadro de Conexões ${counter}`)) {
      counter++;
    }
    newName = `Quadro de Conexões ${counter}`;

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
      canvasType: 'board',
      folderPath: resolvedFolder,
      vaultId: vaultId || 'default-vault',
      vaultName: vaultName || 'Meu Vault',
    };
    addLayer(projectMeta);

    const initialData: BoardData = {
      id: newProjectId,
      name: newName,
      elements: [],
      connections: [],
      updatedAt: new Date().toISOString(),
    };
    await saveBoardDataToStorage(initialData, resolvedFolder);

    const currentProvider = useVaultStore.getState().provider;
    if (currentProvider && currentProvider.isConnected) {
      await saveCanvasToDisk(currentProvider, resolvedFolder, newName, initialData);
      await refreshNodes();
    }

    // Auto-expande a pasta destino para que o novo canvas fique visível imediatamente
    if (resolvedFolder) {
      if (!expandedFolders.has(resolvedFolder)) {
        toggleFolder(resolvedFolder);
      }
    }
    setSelectedPath(`canvas:${newProjectId}`);

    openCanvasTab(newProjectId, newName);
  };

  const handleCreateFileSubmit = async (folderPath: string, enteredName?: string) => {
    const rawName = (enteredName !== undefined ? enteredName : newFileName).trim();
    if (!rawName) {
      setNewFileInputFolder(null);
      return;
    }

    const isDbFolder =
      folderPath.toLowerCase().endsWith('.db.json') ||
      folderPath.toLowerCase().endsWith('.database') ||
      folderPath.toLowerCase().endsWith('.db.json.md');

    if (isDbFolder) {
      try {
        let rawJson = (await provider?.readDocument(folderPath)) || '';
        const db = parseDatabaseContent(rawJson) || createDefaultDatabase(folderPath.split('/').pop()?.replace(/\.(db\.json|database)$/i, '') || 'Base de Dados');
        const { updatedDb, newRow } = createDatabaseRowInInstance(db, rawName);
        const updatedJson = JSON.stringify(updatedDb, null, 2);
        if (provider) {
          await provider.saveDocument(folderPath, updatedJson);
          await syncRowToVaultFile(folderPath, newRow, updatedDb.properties, provider);
          await loadDatabaseRows(folderPath);
          await useVaultStore.getState().refreshNodes();
        }
        window.dispatchEvent(new CustomEvent('supercanvas-db-updated', { detail: { dbPath: folderPath } }));
        if (!expandedFolders.has(folderPath)) {
          toggleFolder(folderPath);
        }
        const newRowPath = formatDatabaseRowPath(folderPath, newRow.id);
        await openDocument(newRowPath);
      } catch (err) {
        console.error('[VaultSidebar] Erro ao criar nota no banco de dados:', err);
      } finally {
        setNewFileName('');
        setNewFileInputFolder(null);
      }
      return;
    }

    try {
      await createFile(folderPath, rawName);
    } catch (err) {
      console.error('Erro ao criar arquivo:', err);
    } finally {
      setNewFileName('');
      setNewFileInputFolder(null);
    }
  };

  const getNextFolderName = (parentPath: string) => {
    let existingNames = new Set<string>();
    if (!parentPath) {
      existingNames = new Set(nodes.filter(n => n.type === 'folder').map(n => n.name.toLowerCase()));
    } else {
      const findParentNode = (items: VaultNode[]): VaultNode | null => {
        for (const item of items) {
          if (item.path === parentPath) return item;
          if (item.children) {
            const found = findParentNode(item.children);
            if (found) return found;
          }
        }
        return null;
      };
      const parent = findParentNode(nodes);
      if (parent && parent.children) {
        existingNames = new Set(parent.children.filter(n => n.type === 'folder').map(n => n.name.toLowerCase()));
      }
    }

    if (!existingNames.has('nova pasta')) return 'Nova Pasta';
    let counter = 1;
    while (existingNames.has(`nova pasta ${counter}`)) {
      counter++;
    }
    return `Nova Pasta ${counter}`;
  };

  const handleStartCreateFolder = (parentPath: string = '') => {
    if (searchQuery) setSearchQuery('');
    setNewFolderInputParent(parentPath);
    if (parentPath && !expandedFolders.has(parentPath)) {
      toggleFolder(parentPath);
    }
  };

  const cancelFolderCreation = () => {
    setNewFolderName('');
    setNewFolderInputParent(null);
  };

  const handleCreateFolderSubmit = async (parentPath: string, enteredName?: string) => {
    const rawName = (enteredName !== undefined ? enteredName : newFolderName).trim();
    const finalName = rawName || getNextFolderName(parentPath);
    setNewFolderName('');
    setNewFolderInputParent(null);
    try {
      await createFolder(parentPath, finalName);
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
    }
  };

  const handleRenameFolderSubmit = async (folderPath: string, newName: string) => {
    setRenamingNodePath(null);
    const trimmed = newName.trim();
    if (!trimmed) return;
    const parts = folderPath.split('/');
    const oldName = parts[parts.length - 1];
    if (trimmed === oldName) return;
    parts[parts.length - 1] = trimmed;
    const newPath = parts.join('/');
    try {
      await renameNode(folderPath, newPath, true);
    } catch (err) {
      console.error('Erro ao renomear pasta:', err);
    }
  };

  const handleRenameNodeSubmit = async (node: VaultNode, newName: string) => {
    setRenamingNodePath(null);
    const trimmed = newName.trim();
    if (!trimmed) return;

    const { isRow: isDbRow, dbPath: parentDbPath, rowId } = parseDatabaseRowPath(node.path);
    if (isDbRow) {
      try {
        let rawJson = (await provider?.readDocument(parentDbPath)) || '';
        const db = parseDatabaseContent(rawJson);
        if (db) {
          const updatedDb = renameDatabaseRowInInstance(db, rowId, trimmed);
          const updatedJson = JSON.stringify(updatedDb, null, 2);
          if (provider) {
            await provider.saveDocument(parentDbPath, updatedJson);
          }
          window.dispatchEvent(new CustomEvent('supercanvas-db-updated', { detail: { dbPath: parentDbPath } }));
        }
      } catch (err) {
        console.error('[VaultSidebar] Erro ao renomear nota do DB:', err);
      }
      return;
    }

    const isFolder = node.type === 'folder';
    const isDatabase =
      node.fileType === 'database' ||
      node.extension === 'database' ||
      node.extension === 'db.json' ||
      node.name.toLowerCase().endsWith('.db.json') ||
      node.name.toLowerCase().endsWith('.database') ||
      node.path.toLowerCase().endsWith('.db.json') ||
      node.path.toLowerCase().endsWith('.database') ||
      node.path.toLowerCase().endsWith('.db.json.md');
    const isCanvas =
      node.fileType === 'canvas' ||
      node.extension === 'canvas' ||
      node.name.toLowerCase().endsWith('.canvas') ||
      node.path.toLowerCase().endsWith('.canvas');
    const isNote =
      !isDatabase && !isCanvas &&
      (node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt'))));

    let finalFileName = trimmed;
    if (isFolder) {
      finalFileName = trimmed;
    } else if (isDatabase) {
      if (!finalFileName.toLowerCase().endsWith('.db.json') && !finalFileName.toLowerCase().endsWith('.database')) {
        const ext = node.path.toLowerCase().endsWith('.database') ? 'database' : 'db.json';
        finalFileName = `${finalFileName}.${ext}`;
      }
    } else if (isCanvas) {
      if (!finalFileName.toLowerCase().endsWith('.canvas')) {
        finalFileName = `${finalFileName}.canvas`;
      }
    } else if (isNote) {
      const isTxt = node.path.toLowerCase().endsWith('.txt');
      const defaultExt = isTxt ? 'txt' : 'md';
      if (!finalFileName.toLowerCase().endsWith('.md') && !finalFileName.toLowerCase().endsWith('.txt')) {
        finalFileName = `${finalFileName}.${defaultExt}`;
      }
    } else {
      const lastDot = node.name.lastIndexOf('.');
      const originalExt = lastDot > 0 ? node.name.slice(lastDot + 1) : '';
      if (originalExt && !finalFileName.includes('.')) {
        finalFileName = `${finalFileName}.${originalExt}`;
      }
    }

    if (finalFileName === node.name) return;

    const parts = node.path.split('/');
    parts[parts.length - 1] = finalFileName;
    const newPath = parts.join('/');

    try {
      await renameNode(node.path, newPath, isFolder);
    } catch (err) {
      console.error('Erro ao renomear item:', err);
    }
  };

  const handleCreateAudioCanvas = (targetFolderPath: string | null = null) => {
    let resolvedFolder = targetFolderPath;
    if (resolvedFolder === null) {
      if (selectedPath && !selectedPath.startsWith('canvas:')) {
        const selectedNode = findNodeByPath(nodes, selectedPath);
        if (selectedNode?.type === 'folder') {
          resolvedFolder = selectedNode.path;
        } else if (selectedPath.includes('/')) {
          resolvedFolder = selectedPath.slice(0, selectedPath.lastIndexOf('/'));
        }
      } else if (activePath && !activePath.startsWith('canvas:') && activePath.includes('/')) {
        resolvedFolder = activePath.slice(0, activePath.lastIndexOf('/'));
      }
    }

    let newName = 'Canvas de Áudio 1';
    let counter = 1;
    const existingNames = new Set(allCanvases.map(p => p.name.trim()));
    while (existingNames.has(`Canvas de Áudio ${counter}`)) {
      counter++;
    }
    newName = `Canvas de Áudio ${counter}`;

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
      canvasType: 'audio',
      folderPath: resolvedFolder,
      vaultId: vaultId || 'default-vault',
      vaultName: vaultName || 'Meu Vault',
    };
    addLayer(projectMeta);

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
      order: 0
    };
    addLayer(newPage);

    if (resolvedFolder) {
      if (!expandedFolders.has(resolvedFolder)) {
        toggleFolder(resolvedFolder);
      }
    }
    setSelectedPath(`canvas:${newProjectId}`);

    navigateToProject(router, newProjectId, newName);
  };

  // Helper to extract all folder paths for "Mover para..." submenu
  const extractFolders = (nodeList: VaultNode[]): string[] => {
    const list: string[] = [];
    const traverse = (items: VaultNode[]) => {
      for (const item of items) {
        if (item.type === 'folder') {
          list.push(item.path);
          if (item.children) traverse(item.children);
        }
      }
    };
    traverse(nodeList);
    return list;
  };
  const allFolders = extractFolders(nodes);

  const filterNodes = (nodeList: VaultNode[], query: string): VaultNode[] => {
    if (!query) return nodeList;
    const lower = query.toLowerCase();

    return nodeList.reduce<VaultNode[]>((acc, node) => {
      const isDbNode =
        node.fileType === 'database' ||
        node.extension === 'database' ||
        node.extension === 'db.json' ||
        node.name.toLowerCase().endsWith('.db.json') ||
        node.name.toLowerCase().endsWith('.database') ||
        node.path.toLowerCase().endsWith('.db.json');

      if (isDbNode) {
        const rowNodes = dbRowsCache[node.path] || [];
        const matchingRows = rowNodes.filter(r => r.name.toLowerCase().includes(lower));
        if (node.name.toLowerCase().includes(lower) || matchingRows.length > 0) {
          acc.push(node);
        }
      } else if (node.type === 'file') {
        if (node.name.toLowerCase().includes(lower)) {
          acc.push(node);
        }
      } else if (node.type === 'folder') {
        const matchingChildren = node.children ? filterNodes(node.children, query) : [];
        if (matchingChildren.length > 0 || node.name.toLowerCase().includes(lower)) {
          acc.push({ ...node, children: matchingChildren });
        }
      }
      return acc;
    }, []);
  };

  const filteredNodes = filterNodes(nodes, searchQuery);

  const handleContextMenu = (e: React.MouseEvent, node: VaultNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  type TreeItem = 
    | { kind: 'node'; id: string; node: VaultNode }
    | { kind: 'canvas'; id: string; canvas: Layer };

  const getSortedFolderItems = (itemList: TreeItem[], parentPath: string): TreeItem[] => {
    if (searchQuery) return itemList;

    const orderMap = getCustomOrder();
    const order = orderMap[parentPath] || [];

    const getIdx = (id: string) => {
      let idx = order.indexOf(id);
      if (idx !== -1) return idx;
      idx = order.indexOf(id.replace(/\.(md|txt)$/, ''));
      if (idx !== -1) return idx;
      return order.indexOf(`${id}.md`);
    };

    return [...itemList].sort((a, b) => {
      const idxA = getIdx(a.id);
      const idxB = getIdx(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      // Default sorting: folders first
      const isFolderA = a.kind === 'node' && a.node.type === 'folder';
      const isFolderB = b.kind === 'node' && b.node.type === 'folder';
      if (isFolderA !== isFolderB) return isFolderA ? -1 : 1;

      const nameA = a.kind === 'node' ? a.node.name : a.canvas.name;
      const nameB = b.kind === 'node' ? b.node.name : b.canvas.name;
      return nameA.localeCompare(nameB);
    });
  };

  const getExistingKeysInParent = (p: string): string[] => {
    let pNodes: VaultNode[] = [];
    if (dbRowsCache[p]) {
      pNodes = dbRowsCache[p];
    } else if (p === '') {
      pNodes = nodes;
    } else if (p === '__GENERAL_CANVASES__') {
      pNodes = [];
    } else {
      const findChildren = (list: VaultNode[]): VaultNode[] | null => {
        for (const n of list) {
          if (n.path === p) return n.children || [];
          if (n.children) {
            const found = findChildren(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      pNodes = findChildren(nodes) || [];
    }
    const filteredPNodes = pNodes.filter(
      n => !(n.type === 'file' && (n.extension === 'canvas' || n.name.toLowerCase().endsWith('.canvas')))
    );
    const pCanvases = p === '__GENERAL_CANVASES__'
      ? allCanvases.filter(c => !c.folderPath)
      : allCanvases.filter(c => (c.folderPath || '') === p || (p === '' && c.folderPath === '__ROOT__'));

    const items: TreeItem[] = [
      ...filteredPNodes.map(n => ({ kind: 'node' as const, id: n.path, node: n })),
      ...pCanvases.map(c => ({ kind: 'canvas' as const, id: `canvas:${c.id}`, canvas: c }))
    ];

    return getSortedFolderItems(items, p).map(i => i.id);
  };

  // Recursively collect ordered list of currently visible paths in the explorer tree
  const getVisibleNodeList = React.useCallback((): string[] => {
    const result: string[] = [];

    const traverse = (parentPath: string, childNodes: VaultNode[]) => {
      const childCanvases = allCanvases.filter(c => {
        const cFolder = c.folderPath || '';
        const matchFolder = parentPath === '' ? (cFolder === '' || cFolder === '__ROOT__') : cFolder === parentPath;
        if (!matchFolder) return false;
        if (searchQuery) return c.name.toLowerCase().includes(searchQuery.toLowerCase());
        return true;
      });

      const childCanvasNames = new Set(
        childCanvases.map(c => `${c.name.toLowerCase().replace(/\.canvas$/i, '')}.canvas`)
      );

      const filteredChildNodes = childNodes.filter(n => {
        if (n.type === 'file' && (n.extension === 'canvas' || n.name.toLowerCase().endsWith('.canvas'))) {
          return !childCanvasNames.has(n.name.toLowerCase());
        }
        return true;
      });

      const items: TreeItem[] = [
        ...filteredChildNodes.map(n => ({ kind: 'node' as const, id: n.path, node: n })),
        ...childCanvases.map(c => ({ kind: 'canvas' as const, id: `canvas:${c.id}`, canvas: c }))
      ];

      const sortedItems = getSortedFolderItems(items, parentPath);

      for (const item of sortedItems) {
        if (item.kind === 'node') {
          const node = item.node;
          result.push(node.path);
          const isFolder = node.type === 'folder';
          const isDbRow = (node as DatabaseRowVaultNode).isDatabaseRow || parseDatabaseRowPath(node.path).isRow;
          const isDatabaseNode =
            !isDbRow &&
            (node.fileType === 'database' ||
              node.extension === 'database' ||
              node.extension === 'db.json' ||
              node.name.toLowerCase().endsWith('.db.json') ||
              node.name.toLowerCase().endsWith('.database') ||
              node.path.toLowerCase().endsWith('.db.json') ||
              node.path.toLowerCase().endsWith('.database') ||
              node.path.toLowerCase().endsWith('.db.json.md'));

          if (isFolder && expandedFolders.has(node.path)) {
            traverse(node.path, node.children || []);
          } else if (isDatabaseNode && expandedFolders.has(node.path)) {
            const rows = dbRowsCache[node.path] || [];
            rows.forEach(r => result.push(r.path));
          }
        } else {
          result.push(`canvas:${item.canvas.id}`);
        }
      }
    };

    if (sidebarTab === 'canvases') {
      const order = getCustomOrder()['__GENERAL_CANVASES__'] || [];
      const list = [...generalCanvases];
      list.sort((a, b) => {
        const idxA = order.indexOf(`canvas:${a.id}`);
        const idxB = order.indexOf(`canvas:${b.id}`);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      const filtered = searchQuery.trim() 
        ? list.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
        : list;
      return filtered.map(c => `canvas:${c.id}`);
    }

    traverse('', filteredNodes);
    return result;
  }, [allCanvases, searchQuery, expandedFolders, dbRowsCache, sidebarTab, generalCanvases, filteredNodes, getSortedFolderItems]);

  // Handle multi-selection click (Shift / Ctrl / Cmd)
  const handleItemSelectClick = React.useCallback((
    e: React.MouseEvent,
    path: string,
    onOpenAction?: () => void
  ) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedPath) {
      const visibleList = getVisibleNodeList();
      const anchorIdx = visibleList.indexOf(lastSelectedPath);
      const targetIdx = visibleList.indexOf(path);

      if (anchorIdx !== -1 && targetIdx !== -1) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        const range = visibleList.slice(start, end + 1);

        if (e.ctrlKey || e.metaKey) {
          setSelectedPaths((prev) => {
            const next = new Set(prev);
            range.forEach((p) => next.add(p));
            return next;
          });
        } else {
          setSelectedPaths(new Set(range));
        }
        setLastSelectedPath(path);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
      setLastSelectedPath(path);
      return;
    }

    // Single click without modifiers
    setSelectedPaths(new Set([path]));
    setLastSelectedPath(path);
    if (onOpenAction) {
      onOpenAction();
    }
  }, [lastSelectedPath, getVisibleNodeList]);

  // Keyboard shortcut handler (Delete, F2 rename, Ctrl+A select all, Escape) for explorer items
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;

      const isEditable = (el: HTMLElement | null) => {
        if (!el) return false;
        return (
          el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable ||
          !!el.closest('input') ||
          !!el.closest('textarea') ||
          !!el.closest('[contenteditable="true"]') ||
          !!el.closest('.tiptap') ||
          !!el.closest('.ProseMirror') ||
          !!el.closest('.monaco-editor') ||
          !!el.closest('[data-editor-container]')
        );
      };

      if (isEditable(target) || isEditable(activeEl)) {
        return;
      }

      // Atalho Ctrl+A / Cmd+A para selecionar todos os arquivos visíveis na barra lateral
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        const isInsideSidebar = Boolean(sidebarRef.current && (sidebarRef.current.contains(target) || sidebarRef.current.contains(activeEl)));
        if (isInsideSidebar) {
          e.preventDefault();
          e.stopPropagation();
          const visibleList = getVisibleNodeList();
          setSelectedPaths(new Set(visibleList));
          if (visibleList.length > 0) {
            setLastSelectedPath(visibleList[0]);
          }
          return;
        }
      }

      // Atalho Escape para desmarcar a seleção atual na sidebar
      if (e.key === 'Escape') {
        const isInsideSidebar = Boolean(sidebarRef.current && (sidebarRef.current.contains(target) || sidebarRef.current.contains(activeEl)));
        if (isInsideSidebar && selectedPaths.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedPaths(new Set());
          setLastSelectedPath(null);
          return;
        }
      }

      // Atalho F2 para renomear item selecionado diretamente no explorer
      if (e.key === 'F2') {
        const isInsideSidebar = 
          Boolean(sidebarRef.current && (sidebarRef.current.contains(target) || sidebarRef.current.contains(activeEl)));
        if (isInsideSidebar && selectedPath && !selectedPath.startsWith('canvas:')) {
          e.preventDefault();
          e.stopPropagation();
          setRenamingNodePath(selectedPath);
          return;
        }
      }

      if (e.key !== 'Delete') return;

      // O atalho Delete do teclado NUNCA deve excluir um canvas/quadro sob nenhuma hipótese!
      if (selectedPath?.startsWith('canvas:') || activePath?.startsWith('canvas:')) {
        return;
      }

      // Block if any modal or input row is currently open
      if (
        deleteTarget !== null ||
        promptModal !== null ||
        renamingNodePath !== null ||
        newFileInputFolder !== null ||
        newFolderInputParent !== null
      ) {
        return;
      }

      // Block if modifiers like Ctrl or Alt are held
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // NUNCA interceptar se a interação ocorreu no workspace principal, canvas de conexões ou editor
      if (
        target?.closest('main') ||
        activeEl?.closest('main') ||
        target?.closest('[data-board-canvas]') ||
        activeEl?.closest('[data-board-canvas]') ||
        target?.closest('[data-pane-container]') ||
        activeEl?.closest('[data-pane-container]') ||
        target?.closest('.board-container') ||
        activeEl?.closest('.board-container')
      ) {
        return;
      }

      // O Delete do explorer só deve agir se o evento originou ou o foco está dentro da própria sidebar
      const isInsideSidebar = 
        Boolean(sidebarRef.current && (sidebarRef.current.contains(target) || sidebarRef.current.contains(activeEl)));
      if (!isInsideSidebar) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      triggerDeleteSelected();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedPath,
    selectedPaths,
    activePath,
    deleteTarget,
    promptModal,
    renamingNodePath,
    newFileInputFolder,
    newFolderInputParent,
    nodes,
    allCanvases,
    getVisibleNodeList,
    triggerDeleteSelected
  ]);

  const handleItemDragOver = (e: React.DragEvent, targetItem: TreeItem, parentPath: string) => {
    const isVaultNoteDrag =
      e.dataTransfer.types.includes('application/rpgsa-vault-note') ||
      e.dataTransfer.types.includes('text/plain');
    const isExternalFiles = e.dataTransfer.types.includes('Files');

    if (!draggedNode && !draggedCanvas && !isVaultNoteDrag && !isExternalFiles) return;

    const currentKey = draggedNode ? draggedNode.path : `canvas:${draggedCanvas?.id}`;
    if (currentKey && currentKey === targetItem.id) return;

    // Prevent folder inside itself or its children
    if (draggedNode && draggedNode.type === 'folder') {
      if (targetItem.id === draggedNode.path || targetItem.id.startsWith(draggedNode.path + '/')) {
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    const isTargetFolder = targetItem.kind === 'node' && targetItem.node.type === 'folder';
    const isTargetDatabase = targetItem.kind === 'node' && (
      targetItem.node.fileType === 'database' ||
      targetItem.node.extension === 'database' ||
      targetItem.node.extension === 'db.json' ||
      targetItem.node.name.toLowerCase().endsWith('.db.json') ||
      targetItem.node.name.toLowerCase().endsWith('.database') ||
      targetItem.node.path.toLowerCase().endsWith('.db.json') ||
      targetItem.node.path.toLowerCase().endsWith('.database') ||
      targetItem.node.path.toLowerCase().endsWith('.db.json.md')
    );
    const isTargetContainer = isTargetFolder || isTargetDatabase;

    let position: 'before' | 'after' | 'inside';
    if (isTargetContainer) {
      if (y < height * 0.25) {
        position = 'before';
        clearHoverTimer();
      } else if (y > height * 0.75) {
        position = 'after';
        clearHoverTimer();
      } else {
        position = 'inside';
        if (!expandedFolders.has(targetItem.node.path) && !hoverTimerRef.current) {
          hoverTimerRef.current = setTimeout(() => {
            toggleFolder(targetItem.node.path);
            hoverTimerRef.current = null;
          }, 700);
        }
      }
    } else {
      if (y < height * 0.5) {
        position = 'before';
      } else {
        position = 'after';
      }
    }

    dropTargetRef.current = { id: targetItem.id, position, parentPath };
    setDropTarget(prev => {
      if (prev?.id === targetItem.id && prev?.position === position && prev?.parentPath === parentPath) {
        return prev;
      }
      return { id: targetItem.id, position, parentPath };
    });
  };

  const handleItemDragLeave = (e: React.DragEvent, targetItemId: string) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      clearHoverTimer();
      if (dropTargetRef.current?.id === targetItemId) {
        dropTargetRef.current = null;
        setDropTarget(null);
      }
    }
  };

  const handleItemDrop = async (e: React.DragEvent, targetItem: TreeItem, parentPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    clearHoverTimer();

    // Determine position reliably with fallback to direct coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const isTargetFolder = targetItem.kind === 'node' && targetItem.node.type === 'folder';
    const isTargetDatabase = targetItem.kind === 'node' && (
      targetItem.node.fileType === 'database' ||
      targetItem.node.extension === 'database' ||
      targetItem.node.extension === 'db.json' ||
      targetItem.node.name.toLowerCase().endsWith('.db.json') ||
      targetItem.node.name.toLowerCase().endsWith('.database') ||
      targetItem.node.path.toLowerCase().endsWith('.db.json') ||
      targetItem.node.path.toLowerCase().endsWith('.database') ||
      targetItem.node.path.toLowerCase().endsWith('.db.json.md')
    );
    const isTargetContainer = isTargetFolder || isTargetDatabase;

    let position: 'before' | 'after' | 'inside';
    if (dropTargetRef.current && dropTargetRef.current.id === targetItem.id) {
      position = dropTargetRef.current.position;
    } else if (isTargetContainer) {
      if (y < height * 0.25) position = 'before';
      else if (y > height * 0.75) position = 'after';
      else position = 'inside';
    } else {
      position = y < height * 0.5 ? 'before' : 'after';
    }

    dropTargetRef.current = null;
    setDropTarget(null);

    // External files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const destFolder = (isTargetFolder && position === 'inside')
        ? targetItem.node.path
        : parentPath;
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await saveMediaFile(e.dataTransfer.files[i], destFolder);
      }
      return;
    }

    const noteDataRaw = e.dataTransfer.getData('application/rpgsa-vault-note');
    const plainPath = e.dataTransfer.getData('text/plain');

    let draggedPath = draggedNode ? draggedNode.path : '';
    if (!draggedPath && noteDataRaw) {
      try {
        const parsed = JSON.parse(noteDataRaw);
        draggedPath = parsed.path;
      } catch {}
    }
    if (!draggedPath && plainPath && (plainPath.includes('/') || plainPath.includes('#row:'))) {
      draggedPath = plainPath;
    }

    if (!draggedPath && !draggedCanvas) return;

    // 1. Drop INSIDE database node
    if (position === 'inside' && isTargetDatabase) {
      const targetDbPath = targetItem.node.path;
      if (draggedPath) {
        await moveNode(draggedPath, targetDbPath);
        if (!expandedFolders.has(targetDbPath)) {
          toggleFolder(targetDbPath);
        }
        setDraggedNode(null);
        return;
      }
    }

    // 2. Drop INSIDE folder
    if (position === 'inside' && isTargetFolder) {
      const targetFolderPath = targetItem.node.path;

      if (draggedPath) {
        const { isRow: isDbRow } = parseDatabaseRowPath(draggedPath);
        if (isDbRow) {
          const newPath = await moveNode(draggedPath, targetFolderPath);
          if (!expandedFolders.has(targetFolderPath)) {
            toggleFolder(targetFolderPath);
          }
          if (newPath) {
            const cleanNewName = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';
            const currentKeys = getExistingKeysInParent(targetFolderPath).filter(k => 
              k !== newPath && 
              k !== draggedPath && 
              k !== cleanNewName &&
              k !== `${targetFolderPath}/${cleanNewName}`
            );
            currentKeys.push(newPath);
            reorderNodes(targetFolderPath, currentKeys);
          }
          setDraggedNode(null);
          return;
        }

        const draggedName = draggedNode ? draggedNode.name : (draggedPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '');
        if (draggedPath === targetFolderPath || targetFolderPath.startsWith(draggedPath + '/')) {
          setDraggedNode(null);
          return;
        }
        const fileName = draggedPath.split('/').pop()!;
        const oldParent = draggedPath.includes('/') ? draggedPath.split('/').slice(0, -1).join('/') : '';
        const newPath = `${targetFolderPath}/${fileName}`;

        if (oldParent !== targetFolderPath) {
          await moveNode(draggedPath, targetFolderPath);
        }
        if (!expandedFolders.has(targetFolderPath)) {
          toggleFolder(targetFolderPath);
        }
        const currentKeys = getExistingKeysInParent(targetFolderPath).filter(k => 
          k !== newPath && 
          k !== draggedPath && 
          k !== draggedName &&
          k !== `${targetFolderPath}/${draggedName}`
        );
        currentKeys.push(newPath);
        reorderNodes(targetFolderPath, currentKeys);

        if (oldParent !== targetFolderPath) {
          const orderMap = getCustomOrder();
          if (orderMap[oldParent]) {
            orderMap[oldParent] = orderMap[oldParent].filter(k => 
              k !== draggedPath && 
              k !== draggedName
            );
            setCustomOrder(orderMap);
          }
        }
        setDraggedNode(null);
      } else if (draggedCanvas) {
        const oldFolder = draggedCanvas.folderPath || '';
        if (oldFolder !== targetFolderPath) {
          updateLayer({ ...draggedCanvas, folderPath: targetFolderPath });
          if (draggedCanvas.canvasType === 'board') {
            moveCanvasOnDisk(provider, oldFolder, targetFolderPath, draggedCanvas.name, () => getBoardDataFromStorage(draggedCanvas.id)).then(() => {
              refreshNodes();
            });
          }
        }
        if (!expandedFolders.has(targetFolderPath)) {
          toggleFolder(targetFolderPath);
        }
        const canvasKey = `canvas:${draggedCanvas.id}`;
        const currentKeys = getExistingKeysInParent(targetFolderPath).filter(k => k !== canvasKey);
        currentKeys.push(canvasKey);
        reorderNodes(targetFolderPath, currentKeys);

        if (oldFolder !== targetFolderPath) {
          const orderMap = getCustomOrder();
          if (orderMap[oldFolder]) {
            orderMap[oldFolder] = orderMap[oldFolder].filter(k => k !== canvasKey);
            setCustomOrder(orderMap);
          }
        }
        setDraggedCanvas(null);
      }
      return;
    }

    // 2. Drop BEFORE or AFTER in parentPath
    const targetParent = parentPath;

    if (draggedPath) {
      const draggedName = draggedNode ? draggedNode.name : (draggedPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '');
      const { isRow: isDbRow, dbPath: parentDbPath } = parseDatabaseRowPath(draggedPath);
      if (isDbRow) {
        if (targetParent === parentDbPath) {
          const currentKeys = getExistingKeysInParent(targetParent).filter(k => 
            k !== draggedPath && 
            k !== draggedName
          );

          let targetIdx = currentKeys.indexOf(targetItem.id);
          if (targetIdx === -1) {
            targetIdx = currentKeys.findIndex(k => 
              k === targetItem.id.replace(/\.(md|txt)$/, '') || 
              `${k}.md` === targetItem.id
            );
          }

          const insertIdx = position === 'before'
            ? (targetIdx !== -1 ? targetIdx : 0)
            : (targetIdx !== -1 ? targetIdx + 1 : currentKeys.length);

          currentKeys.splice(insertIdx, 0, draggedPath);
          reorderNodes(targetParent, currentKeys);
        } else {
          const newPath = await moveNode(draggedPath, targetParent);
          if (newPath) {
            const cleanNewName = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';
            const currentKeys = getExistingKeysInParent(targetParent).filter(k => 
              k !== newPath && 
              k !== draggedPath && 
              k !== cleanNewName &&
              k !== (targetParent ? `${targetParent}/${cleanNewName}` : cleanNewName)
            );

            let targetIdx = currentKeys.indexOf(targetItem.id);
            if (targetIdx === -1) {
              targetIdx = currentKeys.findIndex(k => 
                k === targetItem.id.replace(/\.(md|txt)$/, '') || 
                `${k}.md` === targetItem.id
              );
            }

            const insertIdx = position === 'before'
              ? (targetIdx !== -1 ? targetIdx : 0)
              : (targetIdx !== -1 ? targetIdx + 1 : currentKeys.length);

            currentKeys.splice(insertIdx, 0, newPath);
            reorderNodes(targetParent, currentKeys);
          }
        }
        setDraggedNode(null);
        return;
      }

      const fileName = draggedPath.split('/').pop()!;
      const oldParent = draggedPath.includes('/') ? draggedPath.split('/').slice(0, -1).join('/') : '';
      const newPath = targetParent ? `${targetParent}/${fileName}` : fileName;

      if (oldParent !== targetParent) {
        await moveNode(draggedPath, targetParent);
      }

      const currentKeys = getExistingKeysInParent(targetParent).filter(k => 
        k !== draggedPath && 
        k !== newPath && 
        k !== draggedName &&
        k !== (targetParent ? `${targetParent}/${draggedName}` : draggedName)
      );

      let targetIdx = currentKeys.indexOf(targetItem.id);
      if (targetIdx === -1) {
        targetIdx = currentKeys.findIndex(k => 
          k === targetItem.id.replace(/\.(md|txt)$/, '') || 
          `${k}.md` === targetItem.id
        );
      }

      const insertIdx = position === 'before'
        ? (targetIdx !== -1 ? targetIdx : 0)
        : (targetIdx !== -1 ? targetIdx + 1 : currentKeys.length);

      currentKeys.splice(insertIdx, 0, newPath);
      reorderNodes(targetParent, currentKeys);

      if (oldParent !== targetParent) {
        const orderMap = getCustomOrder();
        if (orderMap[oldParent]) {
          orderMap[oldParent] = orderMap[oldParent].filter(k => 
            k !== draggedPath && 
            k !== draggedName
          );
          setCustomOrder(orderMap);
        }
      }
      setDraggedNode(null);
    } else if (draggedCanvas) {
      const oldFolder = draggedCanvas.folderPath || '';
      const destFolder = targetParent === '' ? '' : targetParent;
      if (oldFolder !== destFolder) {
        updateLayer({ ...draggedCanvas, folderPath: destFolder });
        if (draggedCanvas.canvasType === 'board') {
          moveCanvasOnDisk(provider, oldFolder, destFolder, draggedCanvas.name, () => getBoardDataFromStorage(draggedCanvas.id)).then(() => {
            refreshNodes();
          });
        }
      }

      const canvasKey = `canvas:${draggedCanvas.id}`;
      const currentKeys = getExistingKeysInParent(targetParent).filter(k => k !== canvasKey);
      const targetIdx = currentKeys.indexOf(targetItem.id);
      const insertIdx = position === 'before'
        ? (targetIdx !== -1 ? targetIdx : 0)
        : (targetIdx !== -1 ? targetIdx + 1 : currentKeys.length);

      currentKeys.splice(insertIdx, 0, canvasKey);
      reorderNodes(targetParent, currentKeys);

      if (oldFolder !== targetParent) {
        const orderMap = getCustomOrder();
        if (orderMap[oldFolder]) {
          orderMap[oldFolder] = orderMap[oldFolder].filter(k => k !== canvasKey);
          setCustomOrder(orderMap);
        }
      }
      setDraggedCanvas(null);
    }
  };

  const handleRootContainerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dropTargetRef.current = null;
    setDropTarget(null);
    clearHoverTimer();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await saveMediaFile(e.dataTransfer.files[i], '');
      }
      return;
    }

    const noteDataRaw = e.dataTransfer.getData('application/rpgsa-vault-note');
    const plainPath = e.dataTransfer.getData('text/plain');

    let draggedPath = draggedNode ? draggedNode.path : '';
    if (!draggedPath && noteDataRaw) {
      try {
        const parsed = JSON.parse(noteDataRaw);
        draggedPath = parsed.path;
      } catch {}
    }
    if (!draggedPath && plainPath && (plainPath.includes('/') || plainPath.includes('#row:'))) {
      draggedPath = plainPath;
    }

    if (draggedPath) {
      const { isRow: isDbRow } = parseDatabaseRowPath(draggedPath);
      if (isDbRow) {
        const newPath = await moveNode(draggedPath, '');
        if (newPath) {
          const cleanNewName = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';
          const currentKeys = getExistingKeysInParent('').filter(k => 
            k !== newPath && 
            k !== draggedPath && 
            k !== cleanNewName
          );
          currentKeys.push(newPath);
          reorderNodes('', currentKeys);
        }
        setDraggedNode(null);
        return;
      }

      const fileName = draggedPath.split('/').pop()!;
      const oldParent = draggedPath.includes('/') ? draggedPath.split('/').slice(0, -1).join('/') : '';
      const newPath = fileName;
      if (oldParent !== '') {
        await moveNode(draggedPath, '');
      }
      const currentKeys = getExistingKeysInParent('').filter(k => 
        k !== draggedPath && 
        k !== newPath && 
        k !== (draggedNode ? draggedNode.name : '')
      );
      currentKeys.push(newPath);
      reorderNodes('', currentKeys);

      if (oldParent !== '') {
        const draggedName = draggedNode ? draggedNode.name : (draggedPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '');
        const orderMap = getCustomOrder();
        if (orderMap[oldParent]) {
          orderMap[oldParent] = orderMap[oldParent].filter(k => 
            k !== draggedPath && 
            k !== draggedName
          );
          setCustomOrder(orderMap);
        }
      }
      setDraggedNode(null);
    } else if (draggedCanvas) {
      if (draggedCanvas.folderPath) {
        const oldFolder = draggedCanvas.folderPath;
        updateLayer({ ...draggedCanvas, folderPath: '' });
        if (draggedCanvas.canvasType === 'board') {
          moveCanvasOnDisk(provider, oldFolder, '', draggedCanvas.name, () => getBoardDataFromStorage(draggedCanvas.id)).then(() => {
            refreshNodes();
          });
        }
      }
      const canvasKey = `canvas:${draggedCanvas.id}`;
      const currentKeys = getExistingKeysInParent('').filter(k => k !== canvasKey);
      currentKeys.push(canvasKey);
      reorderNodes('', currentKeys);

      const oldFolder = draggedCanvas.folderPath || '';
      if (oldFolder) {
        const orderMap = getCustomOrder();
        if (orderMap[oldFolder]) {
          orderMap[oldFolder] = orderMap[oldFolder].filter(k => k !== canvasKey);
          setCustomOrder(orderMap);
        }
      }
      setDraggedCanvas(null);
    }
  };

  const renderCanvasItem = (canvas: Layer, depth: number = 0, parentPath: string = '') => {
    const isBoard = canvas.canvasType === 'board';
    const isCanvasActive = activePath === `canvas:${canvas.id}`;
    const canvasItemId = `canvas:${canvas.id}`;
    const isCanvasSelected = selectedPaths.has(canvasItemId) || (!selectedPath && isCanvasActive);
    const isDropBefore = dropTarget?.id === canvasItemId && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.id === canvasItemId && dropTarget.position === 'after';

    return (
      <div
        key={`canvas-${canvas.id}`}
        tabIndex={0}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/rpgsa-canvas', JSON.stringify({ id: canvas.id, name: canvas.name, canvasType: canvas.canvasType }));
          if (selectedPaths.has(canvasItemId) && selectedPaths.size > 1) {
            e.dataTransfer.setData('application/rpgsa-vault-multi-paths', JSON.stringify(Array.from(selectedPaths)));
          }
          setDraggedCanvas(canvas);
          setDraggedNode(null);
        }}
        onDragEnd={() => {
          setDraggedCanvas(null);
          setDropTarget(null);
          clearHoverTimer();
        }}
        onDragOver={(e) => {
          handleItemDragOver(e, { kind: 'canvas', id: canvasItemId, canvas }, parentPath);
        }}
        onDragLeave={(e) => {
          handleItemDragLeave(e, canvasItemId);
        }}
        onDrop={(e) => {
          handleItemDrop(e, { kind: 'canvas', id: canvasItemId, canvas }, parentPath);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!selectedPaths.has(canvasItemId)) {
            setSelectedPaths(new Set([canvasItemId]));
            setLastSelectedPath(canvasItemId);
          }
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            canvas,
          });
        }}
        onClick={(e) => {
          handleItemSelectClick(e, canvasItemId, () => {
            if (isBoard) {
              openCanvasTab(canvas.id, canvas.name);
            } else {
              navigateToProject(router, canvas.id, canvas.name);
            }
          });
        }}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-all outline-none ${
          isCanvasSelected
            ? 'bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] font-medium ring-1 ring-[#7F95FF]/50'
            : 'text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-950 dark:hover:text-white'
        }`}
      >
        {isDropBefore && (
          <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-[#1831D7] rounded-full z-20 pointer-events-none shadow-[0_0_6px_rgba(127,149,255,0.8)] flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1831D7] -ml-0.5 shadow-xs" />
          </div>
        )}
        {isDropAfter && (
          <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-[#1831D7] rounded-full z-20 pointer-events-none shadow-[0_0_6px_rgba(127,149,255,0.8)] flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1831D7] -ml-0.5 shadow-xs" />
          </div>
        )}

        <div className="flex items-center gap-2 truncate">
          <span className="w-3.5 h-3.5" />
          {isBoard ? (
            <FolderKanban className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
          ) : (
            <Music className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          )}
          <span className="truncate text-xs">{canvas.name}</span>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-neutral-400 border border-stone-200 dark:border-white/10 shrink-0">
            {isBoard ? 'Quadro' : 'Áudio'}
          </span>
        </div>
      </div>
    );
  };

  const renderNode = (node: VaultNode, depth: number = 0, parentPath: string = '') => {
    const isFolder = node.type === 'folder';
    const isDbRow = (node as DatabaseRowVaultNode).isDatabaseRow || parseDatabaseRowPath(node.path).isRow;
    const isDatabaseNode =
      !isDbRow &&
      (node.fileType === 'database' ||
        node.extension === 'database' ||
        node.extension === 'db.json' ||
        node.name.toLowerCase().endsWith('.db.json') ||
        node.name.toLowerCase().endsWith('.database') ||
        node.path.toLowerCase().endsWith('.db.json') ||
        node.path.toLowerCase().endsWith('.database') ||
        node.path.toLowerCase().endsWith('.db.json.md'));

    const isExpandable = isFolder || isDatabaseNode;
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activePath === node.path;
    const isSelected = selectedPaths.has(node.path) || (!selectedPath && isActive);
    const isDropBefore = dropTarget?.id === node.path && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.id === node.path && dropTarget.position === 'after';
    const isDropInside = dropTarget?.id === node.path && dropTarget.position === 'inside';

    return (
      <div 
        key={node.path} 
        className="select-none text-xs"
      >
        <div
          tabIndex={0}
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', node.path);
            if (selectedPaths.has(node.path) && selectedPaths.size > 1) {
              e.dataTransfer.setData('application/rpgsa-vault-multi-paths', JSON.stringify(Array.from(selectedPaths)));
            }
            if (!isFolder && !isDatabaseNode) {
              if (node.fileType === 'audio') {
                e.dataTransfer.setData('application/rpgsa-vault-audio', JSON.stringify({
                  path: node.path,
                  name: node.name
                }));
              } else if (node.fileType === 'image') {
                e.dataTransfer.setData('application/rpgsa-vault-image', JSON.stringify({
                  path: node.path,
                  name: node.name
                }));
              } else {
                e.dataTransfer.setData('application/rpgsa-vault-note', JSON.stringify({
                  path: node.path,
                  name: node.name.replace(/\.(md|txt)$/, '')
                }));
              }
            } else if (isDatabaseNode) {
              e.dataTransfer.setData('application/rpgsa-vault-database', JSON.stringify({
                path: node.path,
                name: node.name.replace(/\.(database|db\.json|db\.json\.md)$/i, '')
              }));
            }
            setDraggedNode(node);
            setDraggedCanvas(null);
          }}
          onDragEnd={() => {
            setDraggedNode(null);
            setDropTarget(null);
            clearHoverTimer();
          }}
          onDragOver={(e) => {
            handleItemDragOver(e, { kind: 'node', id: node.path, node }, parentPath);
          }}
          onDragLeave={(e) => {
            handleItemDragLeave(e, node.path);
          }}
          onDrop={(e) => {
            handleItemDrop(e, { kind: 'node', id: node.path, node }, parentPath);
          }}
          onContextMenu={(e) => {
            if (!selectedPaths.has(node.path)) {
              setSelectedPaths(new Set([node.path]));
              setLastSelectedPath(node.path);
            }
            handleContextMenu(e, node);
          }}
          onClick={(e) => {
            handleItemSelectClick(e, node.path, () => {
              if (isFolder) {
                toggleFolder(node.path);
              } else if (isDatabaseNode) {
                if (!isExpanded) toggleFolder(node.path);
                openDocument(node.path);
              } else {
                openDocument(node.path);
              }
            });
          }}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
          className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-all outline-none ${
            isDropInside && (isFolder || isDatabaseNode)
              ? 'bg-[#1831D7]/20 ring-1 ring-[#1831D7] text-[#1831D7] dark:text-[#7F95FF] shadow-sm'
              : isSelected
                ? 'bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] font-medium ring-1 ring-[#7F95FF]/50'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-950 dark:hover:text-white'
          }`}
        >
          {isDropBefore && (
            <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-[#1831D7] rounded-full z-20 pointer-events-none shadow-[0_0_6px_rgba(127,149,255,0.8)] flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1831D7] -ml-0.5 shadow-xs" />
            </div>
          )}
          {isDropAfter && (
            <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-[#1831D7] rounded-full z-20 pointer-events-none shadow-[0_0_6px_rgba(127,149,255,0.8)] flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1831D7] -ml-0.5 shadow-xs" />
            </div>
          )}

          <div className={`flex gap-2 min-w-0 items-center ${renamingNodePath === node.path ? 'flex-1' : 'truncate'}`}>
            {isExpandable ? (
              <span 
                className="text-stone-400 dark:text-neutral-400 hover:text-stone-700 dark:hover:text-neutral-200 cursor-pointer p-0.5 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.path);
                }}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 h-3.5" />
            )}

            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-[#1831D7]/80 dark:text-[#7F95FF]/80 shrink-0" />
              )
            ) : isDatabaseNode ? (
              <Database className="w-3.5 h-3.5 text-[#52B1FF] shrink-0" />
            ) : node.fileType === 'audio' ? (
              <Music className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            ) : node.fileType === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : node.fileType === 'canvas' || node.extension === 'canvas' || node.name.toLowerCase().endsWith('.canvas') ? (
              <FolderKanban className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
            ) : node.fileType === 'file' ? (
              <File className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 shrink-0" />
            )}

            {renamingNodePath === node.path ? (
              <InlineRenameInput
                initialName={
                  isFolder
                    ? node.name
                    : (node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt'))))
                      ? node.name.replace(/\.(md|txt)$/i, '')
                      : (node.fileType === 'canvas' || node.extension === 'canvas' || node.name.toLowerCase().endsWith('.canvas'))
                        ? node.name.replace(/\.canvas$/i, '')
                        : isDatabaseNode
                          ? node.name.replace(/\.(db\.json\.md|db\.json|database)$/i, '')
                          : (() => {
                              const lastDot = node.name.lastIndexOf('.');
                              return lastDot > 0 ? node.name.slice(0, lastDot) : node.name;
                            })()
                }
                isFolder={isFolder}
                onSubmit={(newName) => handleRenameNodeSubmit(node, newName)}
                onCancel={() => setRenamingNodePath(null)}
              />
            ) : (
              <span className="truncate text-xs">
                {isDatabaseNode
                  ? node.name.replace(/\.(db\.json\.md|db\.json|database)$/i, '')
                  : (node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt'))))
                    ? node.name.replace(/\.(md|txt)$/i, '')
                    : (node.fileType === 'canvas' || node.extension === 'canvas' || node.name.toLowerCase().endsWith('.canvas'))
                      ? node.name.replace(/\.canvas$/i, '')
                      : node.name}
              </span>
            )}
          </div>

          {/* Botão de adicionar nota rápida ao passar o mouse em um nó de Banco de Dados */}
          {isDatabaseNode && (
            <button
              type="button"
              title="Nova Nota neste Banco de Dados"
              onClick={(e) => {
                e.stopPropagation();
                if (!isExpanded) toggleFolder(node.path);
                setNewFileInputFolder(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-stone-200 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-opacity"
            >
              <FilePlus className="w-3.5 h-3.5 text-[#7F95FF]" />
            </button>
          )}
        </div>

        {/* Inputs for inline file/folder creation in Folders */}
        {isFolder && isExpanded && (
          <div>
            {newFileInputFolder === node.path && (
              <div style={{ paddingLeft: `${(depth + 1) * 14 + 12}px` }} className="py-1 pr-2">
                <InlineRenameInput
                  initialName=""
                  placeholder="Nome da nota..."
                  onSubmit={(name) => handleCreateFileSubmit(node.path, name)}
                  onCancel={() => setNewFileInputFolder(null)}
                />
              </div>
            )}

            {newFolderInputParent === node.path && (
              <FolderInputRow
                parentPath={node.path}
                depth={depth + 1}
                defaultName={getNextFolderName(node.path)}
                onSubmit={(name) => handleCreateFolderSubmit(node.path, name)}
                onCancel={cancelFolderCreation}
              />
            )}
            {renderTreeItems(node.path, node.children || [], depth + 1)}
          </div>
        )}

        {/* Child Row Notes for Database Nodes */}
        {isDatabaseNode && isExpanded && (
          <div>
            {newFileInputFolder === node.path && (
              <div style={{ paddingLeft: `${(depth + 1) * 14 + 12}px` }} className="py-1 pr-2">
                <InlineRenameInput
                  initialName=""
                  placeholder="Nome da nota no DB..."
                  onSubmit={(name) => handleCreateFileSubmit(node.path, name)}
                  onCancel={() => setNewFileInputFolder(null)}
                />
              </div>
            )}
            {(() => {
              if (dbRowsCache[node.path] === undefined) {
                loadDatabaseRows(node.path);
              }
              return (dbRowsCache[node.path] || []).map((rowNode) =>
                renderNode(rowNode, depth + 1, node.path)
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderTreeItems = (parentPath: string, childNodes: VaultNode[], depth: number = 0) => {
    const childCanvases = allCanvases.filter(c => {
      const cFolder = c.folderPath || '';
      const matchFolder = parentPath === '' ? (cFolder === '' || cFolder === '__ROOT__') : cFolder === parentPath;
      if (!matchFolder) return false;
      if (searchQuery) return c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return true;
    });

    const childCanvasNames = new Set(
      childCanvases.map(c => `${c.name.toLowerCase().replace(/\.canvas$/i, '')}.canvas`)
    );

    const filteredChildNodes = childNodes.filter(n => {
      if (n.type === 'file' && (n.extension === 'canvas' || n.name.toLowerCase().endsWith('.canvas'))) {
        return !childCanvasNames.has(n.name.toLowerCase());
      }
      return true;
    });

    const items: TreeItem[] = [
      ...filteredChildNodes.map(n => ({ kind: 'node' as const, id: n.path, node: n })),
      ...childCanvases.map(c => ({ kind: 'canvas' as const, id: `canvas:${c.id}`, canvas: c }))
    ];

    const sortedItems = getSortedFolderItems(items, parentPath);

    return sortedItems.map(item => {
      if (item.kind === 'node') {
        return renderNode(item.node, depth, parentPath);
      } else {
        return renderCanvasItem(item.canvas, depth, parentPath);
      }
    });
  };

  const getContextMenuOptions = () => {
    if (!contextMenu) return [];

    if (selectedPaths.size > 1) {
      return [
        {
          label: `Excluir (${selectedPaths.size} itens)`,
          icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            triggerDeleteSelected();
          }
        },
        {
          label: `Mover ${selectedPaths.size} itens para...`,
          icon: <FolderInput size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {},
          subMenu: [
            {
              label: 'Raiz do Vault',
              onClick: async () => {
                for (const path of Array.from(selectedPaths)) {
                  if (path.startsWith('canvas:')) {
                    const canvasId = path.replace('canvas:', '');
                    const c = allCanvases.find(item => item.id === canvasId);
                    if (c && c.folderPath !== '') {
                      const oldFolder = c.folderPath;
                      updateLayer({ ...c, folderPath: '' });
                      if (c.canvasType === 'board') {
                        await moveCanvasOnDisk(provider, oldFolder, '', c.name, () => getBoardDataFromStorage(c.id));
                      }
                    }
                  } else {
                    await moveNode(path, '');
                  }
                }
                refreshNodes();
              }
            },
            ...allFolders.map(folder => ({
              label: folder,
              onClick: async () => {
                for (const path of Array.from(selectedPaths)) {
                  if (path.startsWith('canvas:')) {
                    const canvasId = path.replace('canvas:', '');
                    const c = allCanvases.find(item => item.id === canvasId);
                    if (c && c.folderPath !== folder) {
                      const oldFolder = c.folderPath;
                      updateLayer({ ...c, folderPath: folder });
                      if (c.canvasType === 'board') {
                        await moveCanvasOnDisk(provider, oldFolder, folder, c.name, () => getBoardDataFromStorage(c.id));
                      }
                    }
                  } else {
                    await moveNode(path, folder);
                  }
                }
                if (!expandedFolders.has(folder)) {
                  toggleFolder(folder);
                }
                refreshNodes();
              }
            }))
          ]
        },
        {
          label: 'Desmarcar Seleção',
          icon: <X size={16} className="text-stone-400" />,
          onClick: () => {
            setSelectedPaths(new Set());
            setLastSelectedPath(null);
          }
        }
      ];
    }

    // Context menu on Canvas item
    if (contextMenu.canvas) {
      const c = contextMenu.canvas;
      const isBoard = c.canvasType === 'board';
      return [
        {
          label: isBoard ? 'Abrir no Vault' : 'Abrir Canvas',
          icon: isBoard ? <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" /> : <Music size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            if (isBoard) {
              openCanvasTab(c.id, c.name);
            } else {
              navigateToProject(router, c.id, c.name);
            }
          }
        },
        ...(c.folderPath ? [{
          label: 'Mover para a Caixa de Canvas Gerais',
          icon: <Box size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            const oldFolder = c.folderPath;
            updateLayer({ ...c, folderPath: null });
            setSelectedPath(`canvas:${c.id}`);
            if (c.canvasType === 'board') {
              moveCanvasOnDisk(provider, oldFolder, null, c.name, () => getBoardDataFromStorage(c.id)).then(() => {
                refreshNodes();
              });
            }
          }
        }] : []),
        {
          label: 'Mover para Pasta...',
          icon: <FolderInput size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {},
          subMenu: [
            ...(c.folderPath ? [{
              label: 'Caixa de Canvas Gerais',
              onClick: () => {
                const oldFolder = c.folderPath;
                updateLayer({ ...c, folderPath: null });
                setSelectedPath(`canvas:${c.id}`);
                if (c.canvasType === 'board') {
                  moveCanvasOnDisk(provider, oldFolder, null, c.name, () => getBoardDataFromStorage(c.id)).then(() => {
                    refreshNodes();
                  });
                }
              }
            }] : []),
            {
              label: 'Raiz do Vault',
              onClick: () => {
                const oldFolder = c.folderPath;
                updateLayer({ ...c, folderPath: '' });
                setSelectedPath(`canvas:${c.id}`);
                if (c.canvasType === 'board') {
                  moveCanvasOnDisk(provider, oldFolder, '', c.name, () => getBoardDataFromStorage(c.id)).then(() => {
                    refreshNodes();
                  });
                }
              }
            },
            ...allFolders
              .filter(f => f !== c.folderPath)
              .map(folder => ({
                label: folder,
                onClick: () => {
                  const oldFolder = c.folderPath;
                  updateLayer({ ...c, folderPath: folder });
                  if (!expandedFolders.has(folder)) {
                    toggleFolder(folder);
                  }
                  setSelectedPath(`canvas:${c.id}`);
                  if (c.canvasType === 'board') {
                    moveCanvasOnDisk(provider, oldFolder, folder, c.name, () => getBoardDataFromStorage(c.id)).then(() => {
                      refreshNodes();
                    });
                  }
                }
              }))
          ]
        },
        {
          label: 'Renomear Canvas',
          icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setPromptModal({
              title: 'Renomear Canvas',
              description: 'Digite o novo nome para o canvas:',
              defaultValue: c.name,
              confirmText: 'Salvar',
              icon: <Edit2 className="w-5 h-5 text-stone-700 dark:text-neutral-200" />,
              onConfirm: async (newName) => {
                const trimmed = newName?.trim();
                if (trimmed && trimmed !== c.name) {
                  const oldName = c.name;
                  updateLayer({ ...c, name: trimmed });
                  useVaultStore.getState().updateCanvasTitleInTabs(c.id, trimmed);
                  if (c.canvasType === 'board') {
                    await updateBoardNameInIDB(c.id, trimmed);
                    if (provider && provider.isConnected) {
                      await renameCanvasOnDisk(provider, c.folderPath || '', oldName, trimmed);
                      refreshNodes();
                    }
                  }
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('canvas_renamed', {
                      detail: { canvasId: c.id, newName: trimmed }
                    }));
                  }
                }
              }
            });
          }
        },
        {
          label: 'Excluir Canvas',
          icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            triggerDeleteSelected(`canvas:${c.id}`);
          }
        }
      ];
    }

    // Lateral menu creation options (when right-clicking sidebar background or empty space)
    if (!contextMenu.node) {
      return [
        {
          label: 'Nova Nota',
          icon: <FilePlus size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: async () => {
            try {
              await createFile('');
            } catch (err: unknown) {
              console.warn('Criação de nota cancelada ou falhou:', err);
            }
          }
        },
        {
          label: 'Salvar Áudio ou Imagem...',
          icon: <Upload size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            triggerMediaUpload('');
          }
        },
        {
          label: 'Novo Canvas de Conexões',
          icon: <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            handleCreateBoardCanvas();
          }
        },
        {
          label: 'Novo Canvas de Áudio',
          icon: <Music size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            handleCreateAudioCanvas();
          }
        },
        {
          label: 'Nova Base de Dados',
          icon: <Database size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: async () => {
            try {
              await useVaultStore.getState().createDatabase('');
            } catch (err: unknown) {
              console.warn('Criação de database falhou:', err);
            }
          }
        },
        {
          label: 'Nova Pasta',
          icon: <FolderPlus size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            handleStartCreateFolder('');
          }
        },
        {
          label: 'Criar a partir de Template',
          icon: <LayoutTemplate size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setTemplateModalOpen(true);
          }
        },
        {
          label: 'Recarregar Arquivos',
          icon: <RefreshCw size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            refreshNodes();
          }
        },
        {
          label: 'Renomear Vault',
          icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setPromptModal({
              title: 'Renomear Vault',
              description: 'Digite o novo nome para o Vault:',
              defaultValue: vaultName,
              confirmText: 'Salvar',
              icon: <Edit2 className="w-5 h-5 text-stone-700 dark:text-neutral-200" />,
              onConfirm: (newName) => {
                if (newName && newName.trim() && newName.trim() !== vaultName) {
                  setVaultName(newName.trim());
                }
              }
            });
          }
        },
        {
          label: 'Configurações do Vault...',
          icon: <Settings size={16} className="text-stone-400" />,
          onClick: () => {
            setSettingsOpen(true);
          }
        }
      ];
    }

    const { node } = contextMenu;

    if (node.type === 'file') {
      const currentParent = node.path.includes('/') ? node.path.split('/').slice(0, -1).join('/') : '';
      const isDbRow = (node as DatabaseRowVaultNode).isDatabaseRow || parseDatabaseRowPath(node.path).isRow;
      const isDb = node.fileType === 'database' || node.extension === 'database' || node.name.endsWith('.database') || node.name.endsWith('.db.json');

      if (isDbRow) {
        return [
          {
            label: 'Abrir Nota',
            icon: <FileText size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              openDocument(node.path);
            }
          },
          {
            label: 'Adicionar ao Canvas Ativo',
            icon: <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('add_vault_item_to_board', {
                  detail: {
                    type: 'note',
                    path: node.path,
                    name: node.name,
                  }
                })
              );
            }
          },
          {
            label: 'Renomear Nota',
            icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              setRenamingNodePath(node.path);
            }
          },
          {
            label: 'Excluir Nota',
            icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              setSelectedPath(node.path);
              triggerDeleteSelected(node.path);
            }
          }
        ];
      }

      if (isDb) {
        return [
          {
            label: 'Nova Nota no DB',
            icon: <FilePlus size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              if (!expandedFolders.has(node.path)) {
                toggleFolder(node.path);
              }
              setNewFileInputFolder(node.path);
            }
          },
          {
            label: 'Abrir Base de Dados',
            icon: <Database size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              openDocument(node.path);
            }
          },
          {
            label: 'Adicionar ao Canvas Ativo',
            icon: <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('add_vault_item_to_board', {
                  detail: {
                    type: 'database',
                    path: node.path,
                    name: node.name.replace(/\.(database|db\.json|db\.json\.md)$/i, ''),
                  }
                })
              );
            }
          },
          {
            label: 'Renomear DB',
            icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              setRenamingNodePath(node.path);
            }
          },
          {
            label: 'Excluir DB',
            icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              setSelectedPath(node.path);
              triggerDeleteSelected(node.path);
            }
          }
        ];
      }

      const isMedia = node.fileType === 'audio' || node.fileType === 'image';
      const isNote = node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt')));

      if (isMedia || (!isNote && node.fileType === 'file')) {
        const isDb = node.fileType === 'database' || node.extension === 'database' || node.name.endsWith('.database') || node.name.endsWith('.db.json');
        return [
          {
            label: node.fileType === 'audio' ? 'Abrir Áudio' : node.fileType === 'image' ? 'Visualizar Imagem' : 'Abrir Arquivo',
            icon: node.fileType === 'audio' ? <Music size={16} className="text-stone-700 dark:text-neutral-200" /> : node.fileType === 'image' ? <ImageIcon size={16} className="text-stone-700 dark:text-neutral-200" /> : <File size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              openDocument(node.path);
            }
          },
          {
            label: 'Adicionar ao Canvas Ativo',
            icon: <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('add_vault_item_to_board', {
                  detail: {
                    type: isDb ? 'database' : 'note',
                    path: node.path,
                    name: node.name.replace(/\.(database|db\.json|db\.json\.md)$/i, ''),
                  }
                })
              );
            }
          },
          {
            label: 'Renomear Arquivo',
            icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              setRenamingNodePath(node.path);
            }
          },
          {
            label: 'Mover para...',
            icon: <FolderInput size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {},
            subMenu: [
              ...(currentParent ? [{
                label: 'Raiz do Vault',
                onClick: () => moveNode(node.path, '')
              }] : []),
              ...allFolders
                .filter(f => f !== currentParent)
                .map(folder => ({
                  label: folder,
                  onClick: () => moveNode(node.path, folder)
                }))
            ]
          },
          {
            label: 'Excluir Arquivo',
            icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
            onClick: () => {
              setSelectedPath(node.path);
              triggerDeleteSelected(node.path);
            }
          }
        ];
      }

      return [
        {
          label: 'Abrir Nota',
          icon: <FileText size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            openDocument(node.path);
          }
        },
        {
          label: 'Adicionar ao Canvas Ativo',
          icon: <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: async () => {
            let content = '';
            try {
              content = (await provider?.readDocument(node.path)) || '';
            } catch (err) {
              console.warn('Erro ao ler nota para adicionar ao canvas:', err);
            }
            window.dispatchEvent(
              new CustomEvent('add_vault_item_to_board', {
                detail: {
                  type: 'note',
                  path: node.path,
                  name: node.name.replace(/\.(md|txt)$/i, ''),
                  content,
                }
              })
            );
          }
        },
        {
          label: 'Renomear Nota',
          icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setRenamingNodePath(node.path);
          }
        },
        {
          label: 'Tornar Template',
          icon: <BookmarkPlus size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: async () => {
            const content = await provider?.readDocument(node.path) || '';
            saveUserTemplate({
              name: node.name.replace(/\.md$/, ''),
              content,
              description: `Criado a partir da nota ${node.name}`
            });
            alert(`Nota "${node.name}" salva como modelo de template!`);
          }
        },
        {
          label: 'Copiar [[Wikilink]]',
          icon: <Copy size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            const wikilink = `[[${node.name.replace(/\.md$/, '')}]]`;
            navigator.clipboard.writeText(wikilink);
          }
        },
        {
          label: 'Mover para...',
          icon: <FolderInput size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {},
          subMenu: [
            ...(currentParent ? [{
              label: 'Raiz do Vault',
              onClick: () => moveNode(node.path, '')
            }] : []),
            ...allFolders
              .filter(f => f !== currentParent)
              .map(folder => ({
                label: folder,
                onClick: () => moveNode(node.path, folder)
              }))
          ]
        },
        {
          label: 'Excluir Nota',
          icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setSelectedPath(node.path);
            triggerDeleteSelected(node.path);
          }
        }
      ];
    } else {
      return [
        {
          label: 'Nova Nota nesta pasta',
          icon: <FilePlus size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: async () => {
            try {
              await createFile(node.path);
            } catch (err: unknown) {
              console.warn('Criação de nota nesta pasta cancelada ou falhou:', err);
            }
          }
        },
        {
          label: 'Salvar Áudio ou Imagem nesta pasta',
          icon: <Upload size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            triggerMediaUpload(node.path);
          }
        },
        {
          label: 'Novo Canvas de Conexões nesta pasta',
          icon: <FolderKanban size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            handleCreateBoardCanvas(node.path);
          }
        },
        {
          label: 'Novo Canvas de Áudio nesta pasta',
          icon: <Music size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            handleCreateAudioCanvas(node.path);
          }
        },
        {
          label: 'Nova Base de Dados nesta pasta',
          icon: <Database size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: async () => {
            try {
              await useVaultStore.getState().createDatabase(node.path);
            } catch (err: unknown) {
              console.warn('Criação de database falhou:', err);
            }
          }
        },
        {
          label: 'Nova Subpasta',
          icon: <FolderPlus size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            handleStartCreateFolder(node.path);
          }
        },
        {
          label: 'Renomear Pasta',
          icon: <Edit2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setRenamingNodePath(node.path);
          }
        },
        {
          label: 'Excluir Pasta',
          icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => {
            setSelectedPath(node.path);
            triggerDeleteSelected(node.path);
          }
        }
      ];
    }
  };

  return (
    <div 
      ref={sidebarRef}
      onContextMenu={handleSidebarContextMenu}
      style={{ 
        width: `${sidebarWidth}px`, 
        minWidth: '180px', 
        maxWidth: '550px',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
      className="h-full bg-[#FAF9F6] dark:bg-[#111115] border-r border-stone-200/90 dark:border-white/10 flex flex-col select-none relative shrink-0 text-stone-900 dark:text-neutral-100"
    >
      {sidebarTab === 'canvases' ? (
        <VaultGeneralCanvasesTab
          allFolders={allFolders}
          onCreateBoardCanvas={handleCreateBoardCanvas}
          onCreateAudioCanvas={handleCreateAudioCanvas}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
          selectedPaths={selectedPaths}
          onSelectPaths={(paths, lastPath) => {
            setSelectedPaths(paths);
            if (lastPath !== undefined) {
              setLastSelectedPath(lastPath);
            }
          }}
          lastSelectedPath={lastSelectedPath}
        />
      ) : (
        <>
          {/* Sidebar Header: Search */}
          <div className="p-2.5 border-b border-stone-200/90 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] flex flex-col gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar notas e arquivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-stone-200/90 dark:border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-stone-800 dark:text-neutral-200 placeholder-stone-400 dark:placeholder-neutral-500 outline-none focus:border-[#7F95FF] shadow-xs"
              />
            </div>
          </div>

      {/* Hidden file input for saving media files into Vault */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="audio/*,image/*"
        multiple
        className="hidden"
        onChange={handleMediaFileChange}
      />

      {/* Files Tree */}
      <div 
        className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedPath(null);
          }
        }}
        onDragOver={(e) => {
          if (
            draggedNode ||
            draggedCanvas ||
            e.dataTransfer.types.includes('Files') ||
            e.dataTransfer.types.includes('application/rpgsa-vault-note') ||
            e.dataTransfer.types.includes('text/plain')
          ) {
            e.preventDefault();
          }
        }}
        onDrop={handleRootContainerDrop}
      >
        {/* Root level inputs */}
        {newFileInputFolder === '' && (
          <div className="py-1 px-2">
            <InlineRenameInput
              initialName=""
              placeholder="Nome da nota raiz..."
              onSubmit={(name) => handleCreateFileSubmit('', name)}
              onCancel={() => setNewFileInputFolder(null)}
            />
          </div>
        )}

        {newFolderInputParent === '' && (
          <FolderInputRow
            parentPath=""
            depth={0}
            defaultName={getNextFolderName('')}
            onSubmit={(name) => handleCreateFolderSubmit('', name)}
            onCancel={cancelFolderCreation}
          />
        )}

        {storageType === 'fsa' && !isConnected ? (
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-stone-800 dark:text-neutral-200">
                Pasta Desconectada
              </p>
              <p className="text-[11px] text-stone-500 dark:text-neutral-400 max-w-[200px] mx-auto">
                {hasSavedFolder
                  ? 'Autorize o acesso à pasta física deste Vault para visualizar e criar notas.'
                  : 'Vincule uma pasta física do Windows para visualizar e criar notas.'}
              </p>
              {reconnectError && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 max-w-[220px] mx-auto mt-1">
                  {reconnectError}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              {hasSavedFolder ? (
                <>
                  <button
                    disabled={isConnectingFolder}
                    onClick={async () => {
                      setReconnectError(null);
                      setIsConnectingFolder(true);
                      try {
                        const ok = await connectFSA(vaultId, false);
                        if (!ok) {
                          setReconnectError('Permissão não concedida. Clique em "Escolher outra..." para vincular.');
                        }
                      } catch (err) {
                        console.warn('Erro ao reconectar pasta:', err);
                        setReconnectError('Erro ao reconectar. Tente selecionar novamente.');
                      } finally {
                        setIsConnectingFolder(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isConnectingFolder ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderSync className="w-3.5 h-3.5" />
                    )}
                    Reconectar Pasta
                  </button>
                  <button
                    disabled={isConnectingFolder}
                    onClick={async () => {
                      setReconnectError(null);
                      setIsConnectingFolder(true);
                      try {
                        await connectFSA(vaultId, true);
                      } catch (err) {
                        console.error('Erro ao escolher pasta:', err);
                      } finally {
                        setIsConnectingFolder(false);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15 text-stone-700 dark:text-neutral-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-60"
                    title="Selecionar outra pasta no computador"
                  >
                    Escolher outra...
                  </button>
                </>
              ) : (
                <button
                  disabled={isConnectingFolder}
                  onClick={async () => {
                    setReconnectError(null);
                    setIsConnectingFolder(true);
                    try {
                      await connectFSA(vaultId, true);
                    } catch (err) {
                      console.error('Erro ao escolher pasta:', err);
                    } finally {
                      setIsConnectingFolder(false);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isConnectingFolder ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="w-3.5 h-3.5" />
                  )}
                  Selecionar Pasta do Windows
                </button>
              )}
            </div>
          </div>
        ) : filteredNodes.length === 0 && allCanvases.filter(c => c.folderPath === '' || c.folderPath === '__ROOT__').length === 0 ? (
          <div className="py-8 text-center text-stone-400 dark:text-neutral-500 text-xs">
            {searchQuery ? 'Nenhum resultado' : 'Pasta vazia. Crie uma nota ou canvas acima!'}
          </div>
        ) : (
          renderTreeItems('', filteredNodes, 0)
        )}
      </div>

        </>
      )}

      {/* In-app Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        itemName={deleteTarget?.name || ''}
        itemPath={deleteTarget?.path}
        isFolder={deleteTarget?.isFolder}
        itemType={deleteTarget?.itemType}
        itemCount={deleteTarget?.path === '__BATCH__' ? selectedPaths.size : 1}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            if (deleteTarget.path === '__BATCH__') {
              await handleBatchDelete(Array.from(selectedPaths));
              setDeleteTarget(null);
              return;
            }
            if (deleteTarget.itemType === 'canvas' && deleteTarget.canvasId) {
              const c = allCanvases.find(item => item.id === deleteTarget.canvasId);
              if (c && c.canvasType === 'board' && provider) {
                await deleteCanvasFromDisk(provider, c.folderPath, c.name);
                refreshNodes();
              }
              deleteLayer(deleteTarget.canvasId);
              closeTab(`canvas:${deleteTarget.canvasId}`);
              if (deleteTarget.path) {
                closeTab(deleteTarget.path);
              }
            } else {
              await deleteNode(deleteTarget.path, deleteTarget.isFolder);
            }
            setSelectedPaths(prev => {
              const next = new Set(prev);
              next.delete(deleteTarget.path);
              return next;
            });
            setDeleteTarget(null);
          }
        }}
      />

      {/* In-app Prompt Input Modal */}
      <PromptInputModal
        isOpen={promptModal !== null}
        title={promptModal?.title || ''}
        description={promptModal?.description}
        defaultValue={promptModal?.defaultValue || ''}
        placeholder={promptModal?.placeholder}
        confirmText={promptModal?.confirmText}
        icon={promptModal?.icon}
        onClose={() => setPromptModal(null)}
        onConfirm={async (val) => {
          if (promptModal?.onConfirm) {
            await promptModal.onConfirm(val);
          }
        }}
      />

      {/* Right-click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={getContextMenuOptions()}
        />
      )}

      {/* Drag Handle on right border */}
      <div
        onMouseDown={handleSidebarResizeMouseDown}
        onDoubleClick={handleResetSidebarWidth}
        className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 transition-colors ${
          isResizingSidebar
            ? 'bg-[#1831D7] shadow-[0_0_8px_rgba(127,149,255,0.8)]'
            : 'hover:bg-[#1831D7]/50'
        }`}
        title="Arraste para redimensionar o menu lateral (Duplo clique para redefinir)"
      />
    </div>
  );
};
