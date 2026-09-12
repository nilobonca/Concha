import { create } from 'zustand';
import Router from 'next/router';
import type { Editor } from '@tiptap/react';
import { v4 as uuidv4 } from 'uuid';
import { Layer } from '@/interfaces/utils/indexedDB';
import { IVaultStorageProvider } from '../storage/VaultStorageAdapter';
import { FSAStorageProvider } from '../storage/FSAStorageProvider';
import { IDBStorageProvider } from '../storage/IDBStorageProvider';
import { VaultNode } from '../interfaces/vault';
import { normalizeNoteTitle } from '../utils/wikilinkUtils';
import { sanitizeVaultFileName, sanitizeVaultPath } from '../utils/fileNameUtils';
import { useVaultRegistryStore, RegisteredVault } from './useVaultRegistryStore';
import Fuse from 'fuse.js';
import { markdownToHtml, htmlToMarkdown } from '../utils/markdownConverter';
import { parseFrontmatter, stringifyFrontmatter } from '../utils/frontmatterUtils';
import { 
  VaultTab, 
  VaultLayoutNode, 
  VaultPaneLeaf, 
  SplitDirection, 
  DraggedTabInfo, 
  DropPreviewState,
  CachedDocument
} from '../interfaces/layout';
import { 
  createPaneLeaf, 
  findPaneLeaf, 
  getAllPanes, 
  insertTabInPane, 
  removeTabFromPane, 
  splitPaneInTree, 
  resizeSplitInTree, 
  saveLayoutToStorage, 
  loadLayoutFromStorage,
  updatePaneInTree,
  isTabPathMatch
} from '../utils/layoutUtils';
import { parseCanvasDataFromDisk, saveCanvasToDisk } from '../utils/canvasDiskSync';
import { saveBoardDataToStorage } from '@/modules/board/hooks/useBoardStorage';

export type { VaultTab };
export type { VaultLayoutNode, VaultPaneLeaf, SplitDirection, DraggedTabInfo, DropPreviewState };

export interface FlatNoteItem {
  path: string;
  name: string;
  folder: string;
  fileType?: 'note' | 'audio' | 'image' | 'file' | 'canvas';
  extension?: string;
  size?: number;
}

interface VaultState {
  provider: IVaultStorageProvider | null;
  storageType: 'fsa' | 'idb';
  vaultId: string;
  vaultName: string;
  isConnected: boolean;
  isLoading: boolean;
  isEnteringVault: boolean;
  enteringVaultName: string | null;
  isSaving: boolean;
  lastSavedAt: number | null;

  // File tree
  nodes: VaultNode[];
  expandedFolders: Set<string>;
  customOrderVersion: number;

  // Multi-window docking layout
  layout: VaultLayoutNode;
  activePaneId: string;
  documentCache: Record<string, CachedDocument>;
  draggedTab: DraggedTabInfo | null;
  dropPreview: DropPreviewState | null;

  // Legacy tab & active doc compatibility
  tabs: VaultTab[];
  activePath: string | null;
  activeContent: string;
  isEditing: boolean;
  viewMode: 'live' | 'source' | 'reading';
  isNoteSearchOpen: boolean;
  activeEditorRef: Editor | null;

  // UI state
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarTab: 'files' | 'canvases';
  searchQuery: string;
  commandPaletteOpen: boolean;
  backlinksPanelOpen: boolean;
  detailsSidebarTab: 'properties' | 'backlinks';
  settingsOpen: boolean;
  templateModalOpen: boolean;

  // Canvases for linking & references
  canvases: Layer[];
  setCanvases: (canvases: Layer[]) => void;

  // Actions
  initializeStorage: () => Promise<void>;
  connectFSA: (targetVaultIdOrForcePicker?: string | boolean, forcePicker?: boolean, customName?: string) => Promise<boolean>;
  connectIDB: (vaultId?: string, vaultName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshNodes: () => Promise<void>;
  toggleFolder: (path: string) => void;
  startEnteringVault: (vaultName?: string) => void;
  finishEnteringVault: () => void;

  setVaultName: (name: string) => Promise<void>;
  setSidebarWidth: (width: number) => void;
  setIsEditing: (isEditing: boolean) => void;
  toggleIsEditing: () => void;
  setViewMode: (mode: 'live' | 'source' | 'reading') => void;
  setIsNoteSearchOpen: (open: boolean) => void;
  toggleNoteSearch: () => void;
  setActiveEditorRef: (editor: Editor | null) => void;

  // Multi-window actions
  setActivePane: (paneId: string) => void;
  splitPane: (targetPaneId: string, tab: VaultTab, direction: SplitDirection, position: 'before' | 'after', sourcePaneId?: string) => void;
  closeTabInPane: (paneId: string, path: string) => void;
  setActiveTabInPane: (paneId: string, path: string) => void;
  moveTabToPane: (sourcePaneId: string, targetPaneId: string, tabPath: string, insertIndex?: number) => void;
  resizeSplit: (splitId: string, newSizes: number[]) => void;
  setDraggedTab: (draggedTab: DraggedTabInfo | null) => void;
  setDropPreview: (dropPreview: DropPreviewState | null) => void;

  // Documents & Tabs
  openNewTab: (targetPaneId?: string) => void;
  openDocument: (path: string, targetPaneId?: string) => Promise<void>;
  openMediaTab: (path: string, type: 'audio' | 'image', title?: string, targetPaneId?: string) => void;
  openOrCreateDocumentByTitle: (title: string, targetPaneId?: string) => Promise<void>;
  openCanvasTab: (canvasId: string, title?: string, targetPaneId?: string) => void;
  updateCanvasTitleInTabs: (canvasId: string, newTitle: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  
  // Content and Saving
  getDocumentContent: (path: string) => string;
  updateDocumentContent: (path: string, content: string) => void;
  updateDocumentFrontmatter: (path: string, frontmatter: Record<string, unknown>) => void;
  loadDocumentContent: (path: string) => Promise<string>;
  saveDocumentContent: (path: string) => Promise<void>;
  updateContent: (content: string) => void;
  saveCurrentDocument: () => Promise<void>;
  flushPendingSaves: () => Promise<void>;
  syncCanvasNote: (path: string, markdown: string) => void;

  createFile: (folderPath?: string, name?: string, initialContent?: string, shouldOpen?: boolean) => Promise<string>;
  createBoardCanvas: (targetFolder?: string | null, customName?: string) => Promise<{ id: string; name: string; path: string }>;
  saveMediaFile: (file: File, folderPath?: string) => Promise<string>;
  getFileUrl: (filePath: string) => Promise<string>;
  createFolder: (parentPath?: string, name?: string) => Promise<void>;
  renameNode: (oldPath: string, newPath: string, isFolder?: boolean) => Promise<void>;
  moveNode: (sourcePath: string, targetFolderPath: string) => Promise<void>;
  reorderNodes: (parentPath: string, orderedPaths: string[]) => void;
  deleteNode: (path: string, isFolder: boolean) => Promise<void>;

  toggleSidebar: () => void;
  setSidebarTab: (tab: 'files' | 'canvases') => void;
  setSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setBacklinksPanelOpen: (open: boolean) => void;
  setDetailsSidebarTab: (tab: 'properties' | 'backlinks') => void;
  setSettingsOpen: (open: boolean) => void;
  setTemplateModalOpen: (open: boolean) => void;

  getAllFiles: () => FlatNoteItem[];
  searchNotesFuzzy: (query: string) => FlatNoteItem[];
}

// Debounce timers per document
const docSaveTimeouts = new Map<string, NodeJS.Timeout>();

// Persistent custom order helpers
export function getCustomOrder(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('vault_custom_order');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCustomOrder(order: Record<string, string[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('vault_custom_order', JSON.stringify(order));
  } catch {}
}

function sortNodes(nodes: VaultNode[], parentPath: string = ''): VaultNode[] {
  const orderMap = getCustomOrder();
  const order = orderMap[parentPath] || [];

  const getIdx = (path: string) => {
    let idx = order.indexOf(path);
    if (idx !== -1) return idx;
    idx = order.indexOf(path.replace(/\.(md|txt)$/, ''));
    if (idx !== -1) return idx;
    return order.indexOf(`${path}.md`);
  };

  const sorted = [...nodes].sort((a, b) => {
    const idxA = getIdx(a.path);
    const idxB = getIdx(b.path);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return sorted.map(node => {
    if (node.type === 'folder' && node.children) {
      return {
        ...node,
        children: sortNodes(node.children, node.path)
      };
    }
    return node;
  });
}

// Helper to flatten tree into flat file items
function flattenTree(nodes: VaultNode[], folder: string = ''): FlatNoteItem[] {
  const result: FlatNoteItem[] = [];
  for (const node of nodes) {
    if (node.type === 'file') {
      const ext = node.extension || node.name.split('.').pop()?.toLowerCase() || '';
      const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus'].includes(ext);
      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
      const fileType = node.fileType || (isAudio ? 'audio' : isImage ? 'image' : 'note');

      result.push({
        path: node.path,
        name: node.name,
        folder,
        fileType,
        extension: ext,
        size: node.size
      });
    } else if (node.type === 'folder' && node.children) {
      const subFolder = folder ? `${folder}/${node.name}` : node.name;
      result.push(...flattenTree(node.children, subFolder));
    }
  }
  return result;
}

// Helper para correspondência flexível e segura de caminho de abas ao excluir arquivos ou pastas
export { isTabPathMatch };

const initialDefaultLeaf = createPaneLeaf([], null);

export const useVaultStore = create<VaultState>((set, get) => ({
  vaultId: 'default-vault',
  provider: null,
  storageType: 'idb',
  vaultName: 'Meu Vault Local',
  isConnected: false,
  isLoading: true,
  isEnteringVault: false,
  enteringVaultName: null,
  isSaving: false,
  lastSavedAt: null,

  nodes: [],
  expandedFolders: new Set<string>(),
  customOrderVersion: 0,

  // Docking layout tree
  layout: initialDefaultLeaf,
  activePaneId: initialDefaultLeaf.id,
  documentCache: {},
  draggedTab: null,
  dropPreview: null,

  // Legacy compatibility
  tabs: [],
  activePath: null,
  activeContent: '',
  isEditing: false,
  viewMode: 'live',
  isNoteSearchOpen: false,
  activeEditorRef: null,

  sidebarOpen: true,
  sidebarWidth: typeof window !== 'undefined' 
    ? Number(localStorage.getItem('vault_sidebar_width')) || 260 
    : 260,
  sidebarTab: 'files',
  searchQuery: '',
  commandPaletteOpen: false,
  backlinksPanelOpen: false,
  detailsSidebarTab: 'properties',
  settingsOpen: false,
  templateModalOpen: false,

  canvases: [],
  setCanvases: (canvases: Layer[]) => set({ canvases }),

  setVaultName: async (name: string) => {
    const trimmed = name.trim() || 'Meu Vault';
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_custom_name', trimmed);
    }
    set({ vaultName: trimmed });
  },

  setSidebarWidth: (width: number) => {
    const clamped = Math.min(Math.max(width, 180), 550);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_sidebar_width', String(clamped));
    }
    set({ sidebarWidth: clamped });
  },

  setIsEditing: (isEditing: boolean) => set({ isEditing, viewMode: isEditing ? 'live' : 'reading' }),
  toggleIsEditing: () => set(state => {
    const nextIsEditing = !state.isEditing;
    return {
      isEditing: nextIsEditing,
      viewMode: nextIsEditing ? 'live' : 'reading'
    };
  }),
  setViewMode: (viewMode: 'live' | 'source' | 'reading') => set({
    viewMode,
    isEditing: viewMode !== 'reading'
  }),
  setIsNoteSearchOpen: (isNoteSearchOpen: boolean) => set({ isNoteSearchOpen }),
  toggleNoteSearch: () => set(state => ({ isNoteSearchOpen: !state.isNoteSearchOpen })),
  setActiveEditorRef: (activeEditorRef: Editor | null) => set({ activeEditorRef }),

  startEnteringVault: (vaultName?: string) => set({
    isEnteringVault: true,
    enteringVaultName: vaultName || get().vaultName || 'Vault',
  }),

  finishEnteringVault: () => set({
    isEnteringVault: false,
    enteringVaultName: null,
  }),

  initializeStorage: async () => {
    set({ isLoading: true });

    const savedVaultName = typeof window !== 'undefined' ? localStorage.getItem('vault_custom_name') : null;
    const savedActiveId = (typeof window !== 'undefined' ? localStorage.getItem('vault_active_id') : null) || 'default-vault';
    const storedLayout = loadLayoutFromStorage(savedActiveId);
    let effectiveLayout = storedLayout;
    let initialActivePaneId = '';

    if (effectiveLayout) {
      const panes = getAllPanes(effectiveLayout);
      if (panes.length > 0) {
        initialActivePaneId = panes[0].id;
      } else {
        effectiveLayout = createPaneLeaf([], null);
        initialActivePaneId = effectiveLayout.id;
      }
    } else {
      effectiveLayout = createPaneLeaf([], null);
      initialActivePaneId = effectiveLayout.id;
    }

    // Carregar lista de vaults registrados para identificar se o vault ativo é FSA ou IDB
    const registeredVaults: RegisteredVault[] = useVaultRegistryStore.getState().vaults;
    const currentVaultMeta = registeredVaults.find(v => v.id === savedActiveId);
    const isFSA = currentVaultMeta ? currentVaultMeta.storageType === 'fsa' : (savedActiveId.startsWith('fsa-') || savedActiveId === 'fsa-main');

    const currentProvider = get().provider;
    const isAlreadyConnected = get().isConnected && currentProvider?.isConnected && get().vaultId === savedActiveId;

    if (isFSA) {
      if (isAlreadyConnected && currentProvider instanceof FSAStorageProvider) {
        // Já está conectado e pronto! Não recria provider nem reseta estado para desconectado
        try {
          const nodes = await currentProvider.listNodes();
          set({
            nodes: sortNodes(nodes),
            isLoading: false,
            isEnteringVault: false,
            enteringVaultName: null,
            layout: effectiveLayout,
            activePaneId: initialActivePaneId,
          });
        } catch {
          set({ isLoading: false, isEnteringVault: false, enteringVaultName: null });
        }
        return;
      }

      const fsa = (currentProvider instanceof FSAStorageProvider && currentProvider.vaultId === savedActiveId)
        ? currentProvider
        : new FSAStorageProvider(savedActiveId, currentVaultMeta?.name || savedVaultName || 'Pasta Windows (HD)');
      fsa.onHandleRestored = () => {
        set({
          isConnected: true,
          vaultName: fsa.vaultName,
        });
        get().refreshNodes();
      };
      const restored = await fsa.init();

      if (restored) {
        const nodes = await fsa.listNodes();
        set({
          provider: fsa,
          storageType: 'fsa',
          vaultId: savedActiveId,
          vaultName: currentVaultMeta?.name || savedVaultName || fsa.vaultName,
          isConnected: true,
          isLoading: false,
          isEnteringVault: false,
          enteringVaultName: null,
          nodes: sortNodes(nodes),
          layout: effectiveLayout,
          activePaneId: initialActivePaneId,
        });

        // Atualiza o caminho físico no registro caso seja descoberto
        fsa.getRootPhysicalPath().then((discoveredPath) => {
          if (discoveredPath) {
            useVaultRegistryStore.getState().syncCurrentVault({
              id: savedActiveId,
              name: currentVaultMeta?.name || savedVaultName || fsa.vaultName,
              storageType: 'fsa',
              folderName: fsa.vaultName,
              path: discoveredPath,
            });
          }
        }).catch(() => {});

        // Se havia documento ativo na folha inicial, valida se o arquivo realmente existe no vault
        const firstPane = findPaneLeaf(effectiveLayout, initialActivePaneId);
        if (firstPane?.activePath) {
          if (firstPane.activePath.startsWith('canvas:')) {
            const tab = firstPane.tabs.find(t => t.path === firstPane.activePath);
            get().openCanvasTab(firstPane.activePath.replace('canvas:', ''), tab?.title, initialActivePaneId);
          } else {
            const allFiles = flattenTree(nodes);
            const fileExists = allFiles.some(f => f.path.toLowerCase() === firstPane.activePath!.toLowerCase());
            if (fileExists) {
              get().openDocument(firstPane.activePath, initialActivePaneId);
            } else {
              get().closeTabInPane(initialActivePaneId, firstPane.activePath);
            }
          }
        }
        return;
      }

      // Se não restaurou o handle silenciosamente (ex: permissão do browser requer ação do usuário),
      // mantém o vault ativo configurado sem quebrar o estado da UI
      set({
        provider: fsa,
        storageType: 'fsa',
        vaultId: savedActiveId,
        vaultName: currentVaultMeta?.name || savedVaultName || 'Pasta Windows (HD)',
        isConnected: false,
        isLoading: false,
        isEnteringVault: false,
        enteringVaultName: null,
        nodes: [],
        layout: effectiveLayout,
        activePaneId: initialActivePaneId,
      });
      return;
    }

    // Padrão: Inicializa via IDB Storage Provider (para IDB vaults isolados)
    const idb = new IDBStorageProvider(savedActiveId, currentVaultMeta?.name || savedVaultName || 'Meu Vault Local');
    await idb.init();
    const nodes = await idb.listNodes();

    set({
      provider: idb,
      storageType: 'idb',
      vaultId: savedActiveId,
      vaultName: currentVaultMeta?.name || savedVaultName || idb.vaultName,
      isConnected: true,
      isLoading: false,
      isEnteringVault: false,
      enteringVaultName: null,
      nodes: sortNodes(nodes),
      layout: effectiveLayout,
      activePaneId: initialActivePaneId,
    });

    const firstPane = findPaneLeaf(effectiveLayout, initialActivePaneId);
    if (firstPane?.activePath) {
      if (firstPane.activePath.startsWith('canvas:')) {
        const tab = firstPane.tabs.find(t => t.path === firstPane.activePath);
        get().openCanvasTab(firstPane.activePath.replace('canvas:', ''), tab?.title, initialActivePaneId);
      } else {
        const allFiles = flattenTree(nodes);
        const fileExists = allFiles.some(f => f.path.toLowerCase() === firstPane.activePath!.toLowerCase());
        if (fileExists) {
          get().openDocument(firstPane.activePath, initialActivePaneId);
        } else {
          get().closeTabInPane(initialActivePaneId, firstPane.activePath);
        }
      }
    }
  },

  connectFSA: async (targetVaultIdOrForcePicker?: string | boolean, forcePickerArg?: boolean, customName?: string): Promise<boolean> => {
    try {
      let targetVaultId: string | undefined = undefined;
      let forcePicker = true;

      if (typeof targetVaultIdOrForcePicker === 'string') {
        targetVaultId = targetVaultIdOrForcePicker;
        forcePicker = forcePickerArg !== undefined ? forcePickerArg : true;
      } else if (typeof targetVaultIdOrForcePicker === 'boolean') {
        forcePicker = targetVaultIdOrForcePicker;
      }

      const isNewConnection = !targetVaultId;
      const effectiveVaultId = targetVaultId || `fsa-${uuidv4().slice(0, 8)}`;
      const existingProvider = get().provider;
      const fsa = (existingProvider instanceof FSAStorageProvider && existingProvider.vaultId === effectiveVaultId)
        ? existingProvider
        : new FSAStorageProvider(effectiveVaultId);

      fsa.onHandleRestored = () => {
        set({
          provider: fsa,
          storageType: 'fsa',
          vaultId: effectiveVaultId,
          isConnected: true,
          vaultName: fsa.vaultName,
        });
        get().refreshNodes();
      };
      let connected = false;

      // Se for alternar/reconectar para um vault existente e forcePicker for falso, tenta carregar o handle salvo
      if (!forcePicker && !isNewConnection) {
        connected = await fsa.reconnect();
      } else {
        // Se forcePicker for true ou for uma nova conexão, abre o seletor nativo do Windows
        connected = await fsa.pickDirectory(effectiveVaultId);
      }

      if (!connected) return false;

      const folderVaultName = customName || fsa.vaultName || 'Pasta Local (HD)';
      if (typeof window !== 'undefined') {
        localStorage.setItem('vault_active_id', effectiveVaultId);
        localStorage.setItem('vault_custom_name', folderVaultName);
      }
      set({ isLoading: true });
      let nodes: VaultNode[] = [];
      try {
        nodes = await fsa.listNodes();
      } catch (nodeErr) {
        console.warn('[useVaultStore] Aviso ao listar nós do vault:', nodeErr);
      }

      let rootPhysicalPath: string | null = null;
      try {
        rootPhysicalPath = await fsa.getRootPhysicalPath();
        if (typeof window !== 'undefined' && rootPhysicalPath) {
          localStorage.setItem('vault_root_physical_path', rootPhysicalPath);
        }
      } catch (pathErr) {
        console.warn('[useVaultStore] Falha ao obter caminho físico:', pathErr);
      }

      const vaultLayout = loadLayoutFromStorage(effectiveVaultId) || createPaneLeaf([], null);
      const initialActivePaneId = getAllPanes(vaultLayout)[0]?.id || vaultLayout.id;
      const initialPane = findPaneLeaf(vaultLayout, initialActivePaneId);

      set({
        provider: fsa,
        storageType: 'fsa',
        vaultId: effectiveVaultId,
        vaultName: folderVaultName,
        isConnected: true,
        isLoading: false,
        isEnteringVault: false,
        enteringVaultName: null,
        nodes: sortNodes(nodes),
        layout: vaultLayout,
        activePaneId: initialActivePaneId,
        documentCache: {},
        tabs: initialPane?.tabs || [],
        activePath: initialPane?.activePath || null,
        activeContent: '',
        isEditing: false
      });
      saveLayoutToStorage(vaultLayout, effectiveVaultId);

      // Registra/sincroniza no registro centralizado de vaults sem sobrescrever os outros
      useVaultRegistryStore.getState().syncCurrentVault({
        id: effectiveVaultId,
        name: folderVaultName,
        storageType: 'fsa',
        folderName: fsa.vaultName,
        path: rootPhysicalPath || undefined,
      });

      return true;
    } catch (err) {
      console.error('Error connecting to local folder:', err);
      set({ isLoading: false, isEnteringVault: false, enteringVaultName: null });
      return false;
    }
  },

  connectIDB: async (vaultId = 'default-vault', defaultVaultName = 'Meu Vault') => {
    set({ isLoading: true });
    const savedVaultName = typeof window !== 'undefined' ? localStorage.getItem('vault_custom_name') : null;
    const finalName = defaultVaultName || savedVaultName || 'Meu Vault';
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_active_id', vaultId);
      localStorage.setItem('vault_custom_name', finalName);
    }
    const idb = new IDBStorageProvider(vaultId, finalName);
    await idb.init();
    const nodes = await idb.listNodes();
    const vaultLayout = loadLayoutFromStorage(vaultId) || createPaneLeaf([], null);
    const initialActivePaneId = getAllPanes(vaultLayout)[0]?.id || vaultLayout.id;
    const initialPane = findPaneLeaf(vaultLayout, initialActivePaneId);

    set({
      provider: idb,
      storageType: 'idb',
      vaultId: vaultId,
      vaultName: finalName,
      isConnected: true,
      isLoading: false,
      isEnteringVault: false,
      enteringVaultName: null,
      nodes: sortNodes(nodes),
      layout: vaultLayout,
      activePaneId: initialActivePaneId,
      documentCache: {},
      tabs: initialPane?.tabs || [],
      activePath: initialPane?.activePath || null,
      activeContent: '',
      isEditing: false
    });
    saveLayoutToStorage(vaultLayout, vaultId);

    // Registra/sincroniza no registro centralizado de vaults
    useVaultRegistryStore.getState().syncCurrentVault({
      id: vaultId,
      name: finalName,
      storageType: 'idb',
    });
  },

  disconnect: async () => {
    const { provider } = get();
    if (provider?.type === 'fsa') {
      await (provider as FSAStorageProvider).disconnect();
    }
    await get().connectIDB();
  },

  refreshNodes: async () => {
    const { provider } = get();
    if (!provider) return;
    try {
      const rawNodes = await provider.listNodes();
      set({ nodes: sortNodes(rawNodes) });
    } catch (err) {
      console.error('Error refreshing vault nodes:', err);
    }
  },

  toggleFolder: (path: string) => {
    set(state => {
      const next = new Set(state.expandedFolders);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedFolders: next };
    });
  },

  setActivePane: (paneId: string) => {
    const { layout } = get();
    const pane = findPaneLeaf(layout, paneId);
    if (!pane) return;

    set({
      activePaneId: paneId,
      activePath: pane.activePath,
      tabs: pane.tabs,
      activeContent: pane.activePath ? (get().documentCache[pane.activePath]?.content || '') : '',
    });
  },

  setDraggedTab: (draggedTab: DraggedTabInfo | null) => set({ draggedTab }),
  setDropPreview: (next: DropPreviewState | null) => {
    const current = get().dropPreview;
    if (!next && !current) return;
    if (next && current && next.zone === current.zone && next.targetPaneId === current.targetPaneId) {
      return; // Mesma zona e mesmo painel: não dispara re-render!
    }
    set({ dropPreview: next });
  },

  splitPane: (targetPaneId: string, tab: VaultTab, direction: SplitDirection, position: 'before' | 'after', sourcePaneId?: string) => {
    const { layout } = get();
    const { newLayout, newPaneId } = splitPaneInTree(layout, targetPaneId, tab, direction, position, sourcePaneId);

    saveLayoutToStorage(newLayout, get().vaultId);
    const newLeaf = findPaneLeaf(newLayout, newPaneId);

    set({
      layout: newLayout,
      activePaneId: newPaneId,
      draggedTab: null,
      dropPreview: null,
      activePath: tab.path,
      tabs: newLeaf ? newLeaf.tabs : [tab],
      activeContent: get().documentCache[tab.path]?.content || '',
    });

    if (tab.path.startsWith('canvas:') || tab.type === 'audio' || tab.type === 'image') {
      // Nenhum markdown pra carregar
    } else {
      get().loadDocumentContent(tab.path);
    }
  },

  closeTabInPane: (paneId: string, path: string) => {
    const { layout, activePaneId } = get();
    const { newLayout } = removeTabFromPane(layout, paneId, path);
    saveLayoutToStorage(newLayout, get().vaultId);

    // Se o painel ativo foi fechado, acha outro painel para ser ativo
    let nextActivePaneId = activePaneId;
    let nextPane = findPaneLeaf(newLayout, activePaneId);

    if (!nextPane) {
      const allPanes = getAllPanes(newLayout);
      if (allPanes.length > 0) {
        nextActivePaneId = allPanes[0].id;
        nextPane = allPanes[0];
      }
    }

    const nextActivePath = nextPane?.activePath || null;
    const nextTabs = nextPane?.tabs || [];

    set({
      layout: newLayout,
      activePaneId: nextActivePaneId,
      activePath: nextActivePath,
      tabs: nextTabs,
      activeContent: nextActivePath ? (get().documentCache[nextActivePath]?.content || '') : '',
      isEditing: Boolean(nextActivePath && !nextActivePath.startsWith('canvas:') && !nextActivePath.startsWith('new-tab:')),
    });

    if (nextActivePath && !nextActivePath.startsWith('canvas:') && !nextActivePath.startsWith('new-tab:')) {
      const ext = nextActivePath.split('.').pop()?.toLowerCase() || '';
      const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
      if (!isMedia) {
        get().loadDocumentContent(nextActivePath);
      }
    }
  },

  setActiveTabInPane: (paneId: string, path: string) => {
    const { layout } = get();
    const updated = updatePaneInTree(layout, paneId, (pane) => ({
      ...pane,
      activePath: path
    }));
    saveLayoutToStorage(updated, get().vaultId);

    const pane = findPaneLeaf(updated, paneId);
    set({
      layout: updated,
      activePaneId: paneId,
      activePath: path,
      tabs: pane?.tabs || [],
      activeContent: path ? (get().documentCache[path]?.content || '') : '',
      isEditing: Boolean(path && !path.startsWith('canvas:') && !path.startsWith('new-tab:')),
    });

    if (!path.startsWith('canvas:') && !path.startsWith('new-tab:')) {
      get().loadDocumentContent(path);
    }
  },

  moveTabToPane: (sourcePaneId: string, targetPaneId: string, tabPath: string, insertIndex?: number) => {
    const { layout } = get();
    const sourcePane = findPaneLeaf(layout, sourcePaneId);
    const tab = sourcePane?.tabs.find(t => t.path === tabPath);
    if (!tab) return;

    if (sourcePaneId === targetPaneId) {
      // Reordena dentro da mesma barra de abas
      const updated = updatePaneInTree(layout, sourcePaneId, (pane) => {
        const nextTabs = pane.tabs.filter(t => t.path !== tabPath);
        const idx = typeof insertIndex === 'number' ? insertIndex : nextTabs.length;
        nextTabs.splice(idx, 0, tab);
        return { ...pane, tabs: nextTabs, activePath: tabPath };
      });
      saveLayoutToStorage(updated, get().vaultId);
      set({ layout: updated, activePaneId: sourcePaneId, draggedTab: null, dropPreview: null });
      return;
    }

    // Move entre painéis diferentes
    const { newLayout: layoutWithoutTab } = removeTabFromPane(layout, sourcePaneId, tabPath);
    const finalLayout = insertTabInPane(layoutWithoutTab, targetPaneId, tab, insertIndex);
    saveLayoutToStorage(finalLayout, get().vaultId);

    const targetPane = findPaneLeaf(finalLayout, targetPaneId);
    set({
      layout: finalLayout,
      activePaneId: targetPaneId,
      draggedTab: null,
      dropPreview: null,
      activePath: tabPath,
      tabs: targetPane?.tabs || [],
      activeContent: get().documentCache[tabPath]?.content || '',
    });
  },

  resizeSplit: (splitId: string, newSizes: number[]) => {
    const { layout } = get();
    const updated = resizeSplitInTree(layout, splitId, newSizes);
    saveLayoutToStorage(updated, get().vaultId);
    set({ layout: updated });
  },

  openNewTab: (targetPaneId?: string) => {
    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const newTabId = `new-tab:${uuidv4().slice(0, 8)}`;
    const tab: VaultTab = {
      path: newTabId,
      title: 'Nova aba',
      type: 'empty'
    };

    const updatedLayout = insertTabInPane(layout, targetId, tab, undefined, false);
    saveLayoutToStorage(updatedLayout, get().vaultId);

    const targetPane = findPaneLeaf(updatedLayout, targetId);

    set({
      layout: updatedLayout,
      activePaneId: targetId,
      activePath: newTabId,
      tabs: targetPane?.tabs || [tab],
      activeContent: '',
      isEditing: false,
    });
  },

  openDocument: async (path: string, targetPaneId?: string) => {
    if (!path) return;

    if (path.startsWith('canvas:')) {
      const canvasId = path.replace('canvas:', '');
      const tab = findPaneLeaf(get().layout, targetPaneId || get().activePaneId)?.tabs.find(t => t.path === path);
      get().openCanvasTab(canvasId, tab?.title, targetPaneId);
      return;
    }

    const ext = path.split('.').pop()?.toLowerCase() || '';
    if (ext === 'canvas') {
      const fileName = path.split('/').pop() || '';
      const canvasName = fileName.replace(/\.canvas$/i, '');
      const lastSlash = path.lastIndexOf('/');
      const folderPath = lastSlash !== -1 ? path.slice(0, lastSlash) : '';

      const provider = get().provider;
      let rawContent = '';
      if (provider) {
        try {
          rawContent = await provider.readDocument(path);
        } catch (e) {
          console.warn('[useVaultStore] Erro ao ler .canvas do disco:', e);
        }
      }

      const boardData = parseCanvasDataFromDisk(rawContent, canvasName, folderPath);
      await saveBoardDataToStorage(boardData, folderPath);

      const existingLayers = get().canvases;
      const matched = existingLayers.find(l => l.id === boardData.id || (l.name === canvasName && (l.folderPath || '') === folderPath));
      const targetId = matched ? matched.id : boardData.id;

      if (!matched) {
        const projectMeta: Layer = {
          id: targetId,
          type: 'group',
          name: canvasName,
          visible: true,
          locked: false,
          parentId: null,
          depth: 0,
          isProject: false,
          isProjectMetadata: true,
          projectId: targetId,
          order: 0,
          canvasType: 'board',
          folderPath: folderPath,
          vaultId: get().vaultId || 'default-vault',
          vaultName: get().vaultName || 'Meu Vault',
        };
        set(state => ({
          canvases: [...state.canvases.filter(c => c.id !== targetId), projectMeta]
        }));
      }

      get().openCanvasTab(targetId, canvasName, targetPaneId);
      return;
    }

    const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus'].includes(ext);
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);

    if (isAudio) {
      get().openMediaTab(path, 'audio', undefined, targetPaneId);
      return;
    }
    if (isImage) {
      get().openMediaTab(path, 'image', undefined, targetPaneId);
      return;
    }

    // Salva o documento atual se estiver sujo antes de trocar de nota
    const currentActivePath = get().activePath;
    if (currentActivePath && !currentActivePath.startsWith('canvas:') && !currentActivePath.startsWith('new-tab:')) {
      const currentDoc = get().documentCache[currentActivePath];
      if (currentDoc?.isDirty) {
        await get().saveDocumentContent(currentActivePath);
      }
    }

    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const title = path.split('/').pop()?.replace(/\.(md|txt)$/, '') || 'Sem título';
    const tab: VaultTab = { path, title, type: 'markdown' };

    const updatedLayout = insertTabInPane(layout, targetId, tab, undefined, true);
    saveLayoutToStorage(updatedLayout, get().vaultId);

    const targetPane = findPaneLeaf(updatedLayout, targetId);

    set({
      layout: updatedLayout,
      activePaneId: targetId,
      activePath: path,
      tabs: targetPane?.tabs || [tab],
      activeContent: get().documentCache[path]?.content || '',
      isEditing: true
    });

    await get().loadDocumentContent(path);
  },

  openMediaTab: (path: string, type: 'audio' | 'image', title?: string, targetPaneId?: string) => {
    const currentActivePath = get().activePath;
    if (currentActivePath && !currentActivePath.startsWith('canvas:') && !currentActivePath.startsWith('new-tab:')) {
      const currentDoc = get().documentCache[currentActivePath];
      if (currentDoc?.isDirty) {
        get().saveDocumentContent(currentActivePath);
      }
    }

    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const cleanTitle = title || path.split('/').pop() || 'Mídia';
    const tab: VaultTab = { path, title: cleanTitle, type };

    const updatedLayout = insertTabInPane(layout, targetId, tab, undefined, true);
    saveLayoutToStorage(updatedLayout, get().vaultId);

    const targetPane = findPaneLeaf(updatedLayout, targetId);

    set({
      layout: updatedLayout,
      activePaneId: targetId,
      activePath: path,
      tabs: targetPane?.tabs || [tab],
      activeContent: '',
      isEditing: false,
    });
  },

  openOrCreateDocumentByTitle: async (title: string, targetPaneId?: string) => {
    const { canvases, getAllFiles } = get();
    const allFiles = getAllFiles();

    // 0. Verifica primeiro correspondência direta exata (ex: notas com "#" no nome, como "Sessão #1")
    const fullNormalized = normalizeNoteTitle(title);
    const directMatch = allFiles.find(f => normalizeNoteTitle(f.name) === fullNormalized || normalizeNoteTitle(f.path) === fullNormalized);
    if (directMatch) {
      await get().openDocument(directMatch.path, targetPaneId);
      return;
    }

    const [docTitle, sectionHeader] = title.split('#');
    const normalized = normalizeNoteTitle(docTitle);

    // 1. Check if it matches a Canvas
    const matchingCanvas = canvases.find(c =>
      (c.isProjectMetadata || !c.parentId) &&
      normalizeNoteTitle(c.name) === normalized
    );

    if (matchingCanvas) {
      if (matchingCanvas.canvasType === 'board') {
        get().openCanvasTab(matchingCanvas.id, matchingCanvas.name, targetPaneId);
        return;
      } else {
        // Audio project canvas: navigate to /project?id=[id]
        if (Router && Router.push) {
          Router.push(`/project?id=${encodeURIComponent(matchingCanvas.id)}`);
        } else if (typeof window !== 'undefined') {
          window.location.href = `/project?id=${encodeURIComponent(matchingCanvas.id)}`;
        }
        return;
      }
    }

    // 2. Check if note already exists
    const match = allFiles.find(f => normalizeNoteTitle(f.name) === normalized || normalizeNoteTitle(f.path) === normalized);
    if (match) {
      await get().openDocument(match.path, targetPaneId);
      if (sectionHeader) {
        setTimeout(() => {
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          for (const h of headings) {
            if (h.textContent?.trim().toLowerCase() === sectionHeader.trim().toLowerCase()) {
              h.scrollIntoView({ behavior: 'smooth', block: 'start' });
              break;
            }
          }
        }, 150);
      }
      return;
    }

    // 3. Doesn't exist, create it!
    const cleanTitle = sanitizeVaultFileName(docTitle.trim(), false) || 'Nova nota';
    const newPath = await get().createFile('', cleanTitle);
    await get().openDocument(newPath, targetPaneId);
  },


  openCanvasTab: (canvasId: string, title?: string, targetPaneId?: string) => {
    const currentActivePath = get().activePath;
    if (currentActivePath && !currentActivePath.startsWith('canvas:') && !currentActivePath.startsWith('new-tab:')) {
      const currentDoc = get().documentCache[currentActivePath];
      if (currentDoc?.isDirty) {
        get().saveDocumentContent(currentActivePath);
      }
    }

    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const path = `canvas:${canvasId}`;
    const cleanTitle = title || 'Quadro de Conexões';
    const tab: VaultTab = { path, title: cleanTitle, type: 'canvas', canvasId };

    const updatedLayout = insertTabInPane(layout, targetId, tab, undefined, true);
    saveLayoutToStorage(updatedLayout, get().vaultId);

    const targetPane = findPaneLeaf(updatedLayout, targetId);

    set({
      layout: updatedLayout,
      activePaneId: targetId,
      activePath: path,
      tabs: targetPane?.tabs || [tab],
      isEditing: false,
    });
  },

  updateCanvasTitleInTabs: (canvasId: string, newTitle: string) => {
    const { layout, activePaneId } = get();
    const allPanes = getAllPanes(layout);
    let updatedLayout = layout;
    let changed = false;

    for (const pane of allPanes) {
      const hasCanvasTab = pane.tabs.some(t => t.canvasId === canvasId || t.path === `canvas:${canvasId}`);
      if (hasCanvasTab) {
        changed = true;
        updatedLayout = updatePaneInTree(updatedLayout, pane.id, (p) => {
          const nextTabs = p.tabs.map(t => {
            if (t.canvasId === canvasId || t.path === `canvas:${canvasId}`) {
              return { ...t, title: newTitle };
            }
            return t;
          });
          return { ...p, tabs: nextTabs };
        });
      }
    }

    if (changed) {
      saveLayoutToStorage(updatedLayout, get().vaultId);
      const activePane = findPaneLeaf(updatedLayout, activePaneId);
      set(state => ({
        layout: updatedLayout,
        tabs: activePane?.tabs || state.tabs,
        canvases: state.canvases.map(c => c.id === canvasId ? { ...c, name: newTitle } : c),
      }));
    }
  },

  closeTab: (path: string) => {
    let hasMatchingTab = true;
    while (hasMatchingTab) {
      const currentLayout = get().layout;
      const currentPanes = getAllPanes(currentLayout);
      let found = false;
      for (const pane of currentPanes) {
        const matchingTab = pane.tabs.find(t => isTabPathMatch(t.path, path, false, t.canvasId));
        if (matchingTab) {
          get().closeTabInPane(pane.id, matchingTab.path);
          found = true;
          break;
        }
      }
      if (!found) {
        hasMatchingTab = false;
      }
    }
  },

  setActiveTab: (path: string) => {
    const { activePaneId } = get();
    get().setActiveTabInPane(activePaneId, path);
  },

  getDocumentContent: (path: string) => {
    return get().documentCache[path]?.content || '';
  },

  loadDocumentContent: async (path: string) => {
    if (!path || path.startsWith('canvas:') || path.startsWith('new-tab:')) return '';
    const { provider, documentCache } = get();
    if (documentCache[path]?.content !== undefined) {
      set({ activeContent: documentCache[path].content });
      return documentCache[path].content;
    }

    if (!provider) return '';

    try {
      const raw = await provider.readDocument(path);
      const { data: frontmatter, content: bodyMarkdown } = parseFrontmatter(raw);
      const htmlContent = markdownToHtml(bodyMarkdown);

      set(state => ({
        documentCache: {
          ...state.documentCache,
          [path]: { content: htmlContent, frontmatter, isDirty: false, lastSavedAt: Date.now() }
        },
        activeContent: htmlContent
      }));

      return htmlContent;
    } catch (err) {
      console.warn(`Documento não encontrado ou falha ao ler em ${path}:`, err);
      set(state => ({
        documentCache: {
          ...state.documentCache,
          [path]: { content: '', isDirty: false, lastSavedAt: Date.now() }
        },
        activeContent: state.activePath === path ? '' : state.activeContent
      }));
      return '';
    }
  },

  updateDocumentContent: (path: string, content: string) => {
    if (!path || path.startsWith('canvas:') || path.startsWith('new-tab:')) return;
    set(state => {
      const currentDoc = state.documentCache[path];
      return {
        documentCache: {
          ...state.documentCache,
          [path]: { ...currentDoc, content, isDirty: true }
        },
        activeContent: state.activePath === path ? content : state.activeContent,
        isSaving: true,
      };
    });

    if (docSaveTimeouts.has(path)) {
      clearTimeout(docSaveTimeouts.get(path)!);
    }

    const timer = setTimeout(() => {
      get().saveDocumentContent(path);
    }, 450);
    docSaveTimeouts.set(path, timer);
  },

  updateDocumentFrontmatter: (path: string, frontmatter: Record<string, unknown>) => {
    if (!path || path.startsWith('canvas:') || path.startsWith('new-tab:')) return;
    set(state => {
      const currentDoc = state.documentCache[path] || { content: '' };
      return {
        documentCache: {
          ...state.documentCache,
          [path]: { ...currentDoc, frontmatter, isDirty: true }
        },
        isSaving: true,
      };
    });

    if (docSaveTimeouts.has(path)) {
      clearTimeout(docSaveTimeouts.get(path)!);
    }

    const timer = setTimeout(() => {
      get().saveDocumentContent(path);
    }, 450);
    docSaveTimeouts.set(path, timer);
  },

  saveDocumentContent: async (path: string) => {
    if (!path || path.startsWith('canvas:') || path.startsWith('new-tab:')) return;
    const { provider, documentCache, storageType, isConnected } = get();
    if (!provider || !path || (storageType === 'fsa' && !isConnected)) return;

    const doc = documentCache[path];
    if (!doc) return;

    try {
      let markdown = htmlToMarkdown(doc.content);
      if (doc.frontmatter && Object.keys(doc.frontmatter).length > 0) {
        markdown = stringifyFrontmatter(doc.frontmatter, markdown);
      }
      await provider.saveDocument(path, markdown);

      set(state => {
        const currentDoc = state.documentCache[path];
        if (!currentDoc) {
          return { isSaving: false, lastSavedAt: Date.now() };
        }
        // Preserva o conteúdo atual (que pode ter novas letras digitadas durante o await)
        const contentStillSame = currentDoc.content === doc.content;
        return {
          isSaving: false,
          lastSavedAt: Date.now(),
          documentCache: {
            ...state.documentCache,
            [path]: {
              ...currentDoc,
              isDirty: !contentStillSame,
              lastSavedAt: Date.now(),
            }
          }
        };
      });

      // Se o usuário continuou digitando enquanto a gravação assíncrona ocorria,
      // agenda nova persistência para garantir integridade dos dados mais recentes
      const latestDoc = get().documentCache[path];
      if (latestDoc && latestDoc.content !== doc.content) {
        if (docSaveTimeouts.has(path)) {
          clearTimeout(docSaveTimeouts.get(path)!);
        }
        const timer = setTimeout(() => {
          get().saveDocumentContent(path);
        }, 450);
        docSaveTimeouts.set(path, timer);
      }
    } catch (err) {
      console.warn(`Falha ao salvar documento em ${path}:`, err);
      set({ isSaving: false });
    }
  },

  updateContent: (content: string) => {
    const { activePath } = get();
    if (activePath) {
      get().updateDocumentContent(activePath, content);
    }
  },

  saveCurrentDocument: async () => {
    const { activePath } = get();
    if (activePath) {
      await get().saveDocumentContent(activePath);
    }
  },

  flushPendingSaves: async () => {
    const paths = Array.from(docSaveTimeouts.keys());
    for (const p of paths) {
      const t = docSaveTimeouts.get(p);
      if (t) clearTimeout(t);
      docSaveTimeouts.delete(p);
    }
    const { documentCache } = get();
    const dirtyPaths = Object.keys(documentCache).filter(p => documentCache[p]?.isDirty);
    const allPaths = Array.from(new Set([...paths, ...dirtyPaths]));
    for (const p of allPaths) {
      await get().saveDocumentContent(p);
    }
  },

  syncCanvasNote: (path: string, markdown: string) => {
    if (!path || path.startsWith('canvas:')) return;
    const htmlContent = markdownToHtml(markdown);
    set(state => ({
      documentCache: {
        ...state.documentCache,
        [path]: { content: htmlContent, isDirty: true, lastSavedAt: Date.now() }
      },
      activeContent: state.activePath === path ? htmlContent : state.activeContent
    }));

    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('supercanvas_vault_sync');
        channel.postMessage({ type: 'sync_doc_cache', path, markdown });
        channel.close();
      } catch {}
    }

    if (docSaveTimeouts.has(path)) {
      clearTimeout(docSaveTimeouts.get(path)!);
    }

    const timer = setTimeout(async () => {
      let { provider } = get();
      if (!provider) {
        await get().initializeStorage();
        provider = get().provider;
      }
      if (provider) {
        try {
          await provider.saveDocument(path, markdown);
          set(state => ({
            documentCache: {
              ...state.documentCache,
              [path]: { ...state.documentCache[path], isDirty: false, lastSavedAt: Date.now() }
            }
          }));
        } catch (err) {
          console.error(`Falha ao sincronizar nota do canvas no Vault (${path}):`, err);
        }
      }
    }, 300);

    docSaveTimeouts.set(path, timer);
  },

  createFile: async (folderPath: string = '', rawName?: string, initialContent?: string, shouldOpen: boolean = true) => {
    let { provider } = get();
    if (!provider) {
      await get().initializeStorage();
      provider = get().provider;
    }
    if (!provider) throw new Error('Storage não inicializado');

    // Se for FSA e ainda não estiver conectado, tenta reconectar aproveitando o gesto do clique
    if (get().storageType === 'fsa' && provider instanceof FSAStorageProvider) {
      if (!provider.isConnected) {
        await provider.reconnect();
      }
      if (provider.isConnected && !get().isConnected) {
        set({ isConnected: true, vaultName: provider.vaultName });
        await get().refreshNodes();
      }
      if (!provider.isConnected) {
        throw new Error('Nenhuma pasta conectada.');
      }
    }

    let finalName = rawName?.trim() || '';
    const cleanFolder = folderPath ? sanitizeVaultPath(folderPath, true) : '';
    if (!finalName) {
      const allFiles = get().getAllFiles();
      const prefix = cleanFolder ? `${cleanFolder}/` : '';
      const existingPaths = new Set(allFiles.map(f => f.path.toLowerCase()));

      const defaultBase = 'Nova nota';
      const candidate = `${prefix}${defaultBase}.md`.toLowerCase();
      if (!existingPaths.has(candidate)) {
        finalName = defaultBase;
      } else {
        let counter = 1;
        while (existingPaths.has(`${prefix}${defaultBase} ${counter}.md`.toLowerCase())) {
          counter++;
        }
        finalName = `${defaultBase} ${counter}`;
      }
    }

    const baseName = finalName.replace(/\.(md|txt)$/i, '');
    const cleanBaseName = sanitizeVaultFileName(baseName, false) || 'Nova nota';
    const fileName = `${cleanBaseName}.md`;
    const fullPath = cleanFolder ? `${cleanFolder}/${fileName}` : fileName;

    const contentToSave = (initialContent !== undefined)
      ? initialContent
      : '';

    await provider.createDocument(fullPath, contentToSave);

    const htmlContent = markdownToHtml(contentToSave);
    set(state => ({
      documentCache: {
        ...state.documentCache,
        [fullPath]: { content: htmlContent, isDirty: false, lastSavedAt: Date.now() }
      }
    }));

    await get().refreshNodes();

    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('supercanvas_vault_sync');
        channel.postMessage({ type: 'refresh_nodes', path: fullPath });
        channel.close();
      } catch {}
    }

    if (shouldOpen) {
      try {
        await get().openDocument(fullPath);
      } catch (err) {
        console.warn('Erro ao abrir documento:', err);
      }
    }
    return fullPath;
  },

  createBoardCanvas: async (targetFolder?: string | null, customName?: string) => {
    let { provider } = get();
    if (!provider) {
      await get().initializeStorage();
      provider = get().provider;
    }
    if (!provider) throw new Error('Storage não inicializado');

    if (get().storageType === 'fsa' && provider instanceof FSAStorageProvider) {
      if (!provider.isConnected) {
        await provider.reconnect();
      }
      if (provider.isConnected && !get().isConnected) {
        set({ isConnected: true, vaultName: provider.vaultName });
        await get().refreshNodes();
      }
    }

    const resolvedFolder = targetFolder ?? '';
    const cleanFolder = resolvedFolder ? sanitizeVaultPath(resolvedFolder, true) : '';

    let finalName = customName?.trim() || '';
    if (!finalName) {
      const allFiles = get().getAllFiles();
      const existingCanvases = get().canvases;
      const prefix = cleanFolder ? `${cleanFolder}/` : '';
      const existingPaths = new Set([
        ...allFiles.map(f => f.path.toLowerCase()),
        ...existingCanvases.map(c => `${prefix}${c.name.toLowerCase()}.canvas`),
      ]);

      const defaultBase = 'Quadro de Conexões';
      const candidate = `${prefix}${defaultBase}.canvas`.toLowerCase();
      if (!existingPaths.has(candidate)) {
        finalName = defaultBase;
      } else {
        let counter = 1;
        while (existingPaths.has(`${prefix}${defaultBase} ${counter}.canvas`.toLowerCase())) {
          counter++;
        }
        finalName = `${defaultBase} ${counter}`;
      }
    }

    const cleanBaseName = sanitizeVaultFileName(finalName.replace(/\.canvas$/i, '').trim(), false) || 'Quadro de Conexões';
    const newId = uuidv4();
    const projectMeta: Layer = {
      id: newId,
      type: 'group',
      name: cleanBaseName,
      visible: true,
      locked: false,
      parentId: null,
      depth: 0,
      isProject: false,
      isProjectMetadata: true,
      projectId: newId,
      order: 0,
      canvasType: 'board',
      folderPath: cleanFolder,
      vaultId: get().vaultId || 'default-vault',
      vaultName: get().vaultName || 'Meu Vault',
    };

    set(state => ({
      canvases: [...state.canvases.filter(c => c.id !== newId), projectMeta]
    }));

    const initialData = {
      id: newId,
      name: cleanBaseName,
      elements: [],
      connections: [],
      updatedAt: new Date().toISOString(),
    };

    await saveBoardDataToStorage(initialData, cleanFolder);

    const fullPath = await saveCanvasToDisk(provider, cleanFolder, cleanBaseName, initialData);

    await get().refreshNodes();

    if (cleanFolder) {
      const currentExpanded = get().expandedFolders;
      if (!currentExpanded.has(cleanFolder)) {
        get().toggleFolder(cleanFolder);
      }
    }

    get().openCanvasTab(newId, cleanBaseName);

    return { id: newId, name: cleanBaseName, path: fullPath || `${cleanBaseName}.canvas` };
  },

  saveMediaFile: async (file: File, folderPath: string = '') => {
    const { provider } = get();
    if (!provider) throw new Error('Storage não inicializado');

    if (get().storageType === 'fsa' && provider instanceof FSAStorageProvider) {
      if (!provider.isConnected) {
        await provider.reconnect();
      }
      if (provider.isConnected && !get().isConnected) {
        set({ isConnected: true, vaultName: provider.vaultName });
        await get().refreshNodes();
      }
      if (!provider.isConnected) {
        throw new Error('Nenhuma pasta conectada.');
      }
    }

    const cleanFolder = folderPath ? sanitizeVaultPath(folderPath, true) : '';
    const fileName = sanitizeVaultFileName(file.name, true);
    const fullPath = cleanFolder ? `${cleanFolder}/${fileName}` : fileName;

    await provider.saveFile(fullPath, file);
    await get().refreshNodes();
    return fullPath;
  },

  getFileUrl: async (filePath: string) => {
    const { provider } = get();
    if (!provider) throw new Error('Storage não inicializado');
    return await provider.getFileUrl(filePath);
  },

  createFolder: async (parentPath: string = '', folderName: string = 'Nova Pasta') => {
    const { provider } = get();
    if (!provider) throw new Error('Storage não inicializado');

    if (get().storageType === 'fsa' && provider instanceof FSAStorageProvider) {
      if (!provider.isConnected) {
        await provider.reconnect();
      }
      if (provider.isConnected && !get().isConnected) {
        set({ isConnected: true, vaultName: provider.vaultName });
        await get().refreshNodes();
      }
      if (!provider.isConnected) {
        throw new Error('Nenhuma pasta conectada.');
      }
    }

    const cleanParent = parentPath ? sanitizeVaultPath(parentPath, true) : '';
    const cleanFolderName = sanitizeVaultFileName(folderName.trim() || 'Nova Pasta', false) || 'Nova Pasta';
    const fullPath = cleanParent ? `${cleanParent}/${cleanFolderName}` : cleanFolderName;
    await provider.createFolder(fullPath);

    set(state => {
      const next = new Set(state.expandedFolders);
      next.add(fullPath);
      return { expandedFolders: next };
    });

    await get().refreshNodes();
  },

  renameNode: async (oldPath: string, newPath: string, isFolder: boolean = false) => {
    let { provider } = get();
    const { layout, activePath, documentCache } = get();
    if (!provider) {
      await get().initializeStorage();
      provider = get().provider;
    }
    if (!provider) {
      throw new Error('Storage não inicializado');
    }
    const cleanNewPath = sanitizeVaultPath(newPath, isFolder);
    if (oldPath === cleanNewPath) return;

    await provider.renameNode(oldPath, cleanNewPath, isFolder);
    const actualNewPath = cleanNewPath;

    // Atualiza árvore de layout
    const allPanes = getAllPanes(layout);
    let updatedLayout = layout;

    for (const pane of allPanes) {
      const hasOldTab = pane.tabs.some(t => t.path === oldPath || (isFolder && t.path.startsWith(`${oldPath}/`)));
      if (hasOldTab) {
        updatedLayout = updatePaneInTree(updatedLayout, pane.id, (p) => {
          const nextTabs = p.tabs.map(t => {
            if (t.path === oldPath) {
              const newTitle = actualNewPath.split('/').pop()?.replace(/\.(md|txt)$/, '') || 'Sem título';
              return { ...t, path: actualNewPath, title: newTitle };
            }
            if (isFolder && t.path.startsWith(`${oldPath}/`)) {
              const updatedP = actualNewPath + t.path.slice(oldPath.length);
              return { ...t, path: updatedP };
            }
            return t;
          });
          let nextActive = p.activePath;
          if (p.activePath === oldPath) {
            nextActive = actualNewPath;
          } else if (isFolder && p.activePath?.startsWith(`${oldPath}/`)) {
            nextActive = actualNewPath + p.activePath.slice(oldPath.length);
          }
          return { ...p, tabs: nextTabs, activePath: nextActive };
        });
      }
    }

    saveLayoutToStorage(updatedLayout, get().vaultId);

    // Atualiza cache de documentos
    const nextDocCache = { ...documentCache };
    if (nextDocCache[oldPath]) {
      nextDocCache[actualNewPath] = nextDocCache[oldPath];
      delete nextDocCache[oldPath];
    }

    let nextActivePath = activePath;
    if (activePath === oldPath) {
      nextActivePath = actualNewPath;
    } else if (isFolder && activePath?.startsWith(`${oldPath}/`)) {
      nextActivePath = actualNewPath + activePath.slice(oldPath.length);
    }

    // Atualiza orderMap persistente
    const orderMap = getCustomOrder();
    let orderChanged = false;
    const newOrderMap: Record<string, string[]> = {};

    for (const [folderKey, list] of Object.entries(orderMap)) {
      let nextFolderKey = folderKey;
      if (isFolder) {
        if (folderKey === oldPath) {
          nextFolderKey = actualNewPath;
          orderChanged = true;
        } else if (folderKey.startsWith(`${oldPath}/`)) {
          nextFolderKey = actualNewPath + folderKey.slice(oldPath.length);
          orderChanged = true;
        }
      }
      const nextList = list.map(itemPath => {
        if (itemPath === oldPath || itemPath === oldPath.replace(/\.(md|txt)$/, '')) {
          orderChanged = true;
          return actualNewPath;
        }
        if (isFolder && itemPath.startsWith(`${oldPath}/`)) {
          orderChanged = true;
          return actualNewPath + itemPath.slice(oldPath.length);
        }
        return itemPath;
      });
      newOrderMap[nextFolderKey] = nextList;
    }

    if (orderChanged) {
      setCustomOrder(newOrderMap);
    }

    set(state => ({
      layout: updatedLayout,
      documentCache: nextDocCache,
      activePath: nextActivePath,
      customOrderVersion: (state.customOrderVersion || 0) + 1
    }));

    await get().refreshNodes();

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('vault_node_renamed', {
          detail: { oldPath, newPath: actualNewPath, isFolder }
        }));
      } catch {}
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel('supercanvas_vault_sync');
          channel.postMessage({ type: 'node_renamed', oldPath, newPath: actualNewPath, isFolder });
          channel.close();
        } catch {}
      }
    }
  },

  moveNode: async (sourcePath: string, targetFolderPath: string) => {
    const fileName = sourcePath.split('/').pop()!;
    const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName;
    if (newPath === sourcePath) return;

    const findIsFolder = (list: VaultNode[], path: string): boolean => {
      for (const node of list) {
        if (node.path === path) return node.type === 'folder';
        if (node.children) {
          const res = findIsFolder(node.children, path);
          if (res) return true;
        }
      }
      return false;
    };
    const isFolder = findIsFolder(get().nodes, sourcePath);
    await get().renameNode(sourcePath, newPath, isFolder);

    if (targetFolderPath) {
      set(state => {
        const next = new Set(state.expandedFolders);
        next.add(targetFolderPath);
        return { expandedFolders: next };
      });
    }
  },

  reorderNodes: (parentPath: string, orderedPaths: string[]) => {
    const orderMap = getCustomOrder();
    orderMap[parentPath] = orderedPaths;
    setCustomOrder(orderMap);
    set(state => ({
      nodes: sortNodes(state.nodes),
      customOrderVersion: (state.customOrderVersion || 0) + 1
    }));
  },

  deleteNode: async (path: string, isFolder: boolean) => {
    let { provider } = get();
    if (!provider) {
      await get().initializeStorage();
      provider = get().provider;
    }

    // 1. Cancela qualquer timeout pendente de auto-save para este arquivo ou subarquivos
    for (const [timerPath, timer] of docSaveTimeouts.entries()) {
      if (isTabPathMatch(timerPath, path, isFolder)) {
        clearTimeout(timer);
        docSaveTimeouts.delete(timerPath);
      }
    }

    // 2. Tenta deletar fisicamente/IDB
    if (provider) {
      try {
        await provider.deleteNode(path, isFolder);
      } catch (err) {
        console.warn('Erro ao deletar nó no provider (prosseguindo com fechamento de abas):', err);
      }
    }

    // 3. Se for pasta, fecha abas de qualquer canvas pertencente a ela
    if (isFolder) {
      const { canvases } = get();
      const normFolderPath = path.trim().replace(/\\/g, '/').toLowerCase().replace(/^(\.\/|\/)+/, '').replace(/\/+$/, '');
      for (const c of canvases) {
        if (c.folderPath) {
          const normCFolder = c.folderPath.trim().replace(/\\/g, '/').toLowerCase().replace(/^(\.\/|\/)+/, '').replace(/\/+$/, '');
          if (normCFolder === normFolderPath || normCFolder.startsWith(`${normFolderPath}/`)) {
            get().closeTab(`canvas:${c.id}`);
          }
        }
      }
    }

    // 4. Fechar todas as abas abertas correspondentes ao arquivo ou pasta excluída em todos os painéis
    let hasMatchingTab = true;
    while (hasMatchingTab) {
      const currentLayout = get().layout;
      const currentPanes = getAllPanes(currentLayout);
      let found = false;
      for (const pane of currentPanes) {
        const matchingTab = pane.tabs.find(t => isTabPathMatch(t.path, path, isFolder, t.canvasId));
        if (matchingTab) {
          get().closeTabInPane(pane.id, matchingTab.path);
          found = true;
          break;
        }
      }
      if (!found) {
        hasMatchingTab = false;
      }
    }

    // 5. Se o activePath atual ainda corresponder ao item excluído, seleciona fallback ou limpa
    const finalState = get();
    if (isTabPathMatch(finalState.activePath, path, isFolder)) {
      const activePane = findPaneLeaf(finalState.layout, finalState.activePaneId);
      const fallbackTab = activePane?.tabs[0];
      const nextActivePath = fallbackTab?.path || null;
      set({
        activePath: nextActivePath,
        tabs: activePane?.tabs || [],
        activeContent: nextActivePath ? (finalState.documentCache[nextActivePath]?.content || '') : '',
        isEditing: Boolean(nextActivePath && !nextActivePath.startsWith('canvas:')),
      });
      if (nextActivePath && !nextActivePath.startsWith('canvas:')) {
        const ext = nextActivePath.split('.').pop()?.toLowerCase() || '';
        const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
        if (!isMedia) {
          get().loadDocumentContent(nextActivePath);
        }
      }
    }

    // 6. Limpa do orderMap persistente
    const orderMap = getCustomOrder();
    let orderChanged = false;
    const newOrderMap: Record<string, string[]> = {};

    for (const [folderKey, list] of Object.entries(orderMap)) {
      if (isFolder && (folderKey === path || folderKey.startsWith(`${path}/`))) {
        orderChanged = true;
        continue;
      }
      const nextList = list.filter(itemPath => {
        if (itemPath === path || (isFolder && itemPath.startsWith(`${path}/`))) {
          orderChanged = true;
          return false;
        }
        return true;
      });
      newOrderMap[folderKey] = nextList;
    }

    if (orderChanged) {
      setCustomOrder(newOrderMap);
    }

    // 7. Limpa do cache de documentos
    const currentCache = { ...get().documentCache };
    let cacheChanged = false;
    for (const cachedPath of Object.keys(currentCache)) {
      if (isTabPathMatch(cachedPath, path, isFolder)) {
        delete currentCache[cachedPath];
        cacheChanged = true;
      }
    }
    if (cacheChanged) {
      set({ documentCache: currentCache });
    }

    // 8. Notifica outros contextos/janelas via BroadcastChannel
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('supercanvas_vault_sync');
        channel.postMessage({ type: 'node_deleted', path, isFolder });
        channel.close();
      } catch {}
    }

    await get().refreshNodes();
  },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarTab: (sidebarTab: 'files' | 'canvases') => set({ sidebarTab }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setCommandPaletteOpen: (commandPaletteOpen: boolean) => set({ commandPaletteOpen }),
  setBacklinksPanelOpen: (backlinksPanelOpen: boolean) => set({ backlinksPanelOpen }),
  setDetailsSidebarTab: (detailsSidebarTab: 'properties' | 'backlinks') => set({ detailsSidebarTab }),
  setSettingsOpen: (settingsOpen: boolean) => set({ settingsOpen }),
  setTemplateModalOpen: (templateModalOpen: boolean) => set({ templateModalOpen }),

  getAllFiles: () => {
    return flattenTree(get().nodes);
  },

  searchNotesFuzzy: (query: string) => {
    const allFiles = get().getAllFiles();
    if (!query.trim()) return allFiles;

    const fuse = new Fuse(allFiles, {
      keys: ['name', 'path', 'folder'],
      threshold: 0.4,
      distance: 100
    });

    return fuse.search(query).map(r => r.item);
  }
}));

// Sincronização multi-abas em tempo real para nós e cache do Vault
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    const globalSyncChannel = new BroadcastChannel('supercanvas_vault_sync');
    globalSyncChannel.onmessage = (event) => {
      if (event.data?.type === 'refresh_nodes') {
        useVaultStore.getState().refreshNodes();
      } else if (event.data?.type === 'node_deleted' && event.data.path) {
        const delPath = event.data.path;
        const isFolder = Boolean(event.data.isFolder);

        let hasMatchingTab = true;
        while (hasMatchingTab) {
          const currentLayout = useVaultStore.getState().layout;
          const currentPanes = getAllPanes(currentLayout);
          let found = false;
          for (const pane of currentPanes) {
            const matchingTab = pane.tabs.find(t => isTabPathMatch(t.path, delPath, isFolder, t.canvasId));
            if (matchingTab) {
              useVaultStore.getState().closeTabInPane(pane.id, matchingTab.path);
              found = true;
              break;
            }
          }
          if (!found) {
            hasMatchingTab = false;
          }
        }

        const state = useVaultStore.getState();
        if (isTabPathMatch(state.activePath, delPath, isFolder)) {
          const activePane = findPaneLeaf(state.layout, state.activePaneId);
          const fallbackTab = activePane?.tabs[0];
          const nextActivePath = fallbackTab?.path || null;
          useVaultStore.setState({
            activePath: nextActivePath,
            tabs: activePane?.tabs || [],
            activeContent: nextActivePath ? (state.documentCache[nextActivePath]?.content || '') : '',
            isEditing: Boolean(nextActivePath && !nextActivePath.startsWith('canvas:')),
          });
          if (nextActivePath && !nextActivePath.startsWith('canvas:')) {
            const ext = nextActivePath.split('.').pop()?.toLowerCase() || '';
            const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
            if (!isMedia) {
              useVaultStore.getState().loadDocumentContent(nextActivePath);
            }
          }
        }

        const cache = { ...useVaultStore.getState().documentCache };
        let changed = false;
        for (const k of Object.keys(cache)) {
          if (isTabPathMatch(k, delPath, isFolder)) {
            delete cache[k];
            changed = true;
          }
        }
        if (changed) {
          useVaultStore.setState({ documentCache: cache });
        }

      } else if (event.data?.type === 'node_renamed') {
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('vault_node_renamed', { detail: event.data }));
          } catch {}
        }
        useVaultStore.getState().refreshNodes();
      } else if (event.data?.type === 'sync_doc_cache' && event.data.path) {
        const htmlContent = markdownToHtml(event.data.markdown || '');
        useVaultStore.setState(state => ({
          documentCache: {
            ...state.documentCache,
            [event.data.path]: { content: htmlContent, isDirty: false, lastSavedAt: Date.now() }
          },
          activeContent: state.activePath === event.data.path ? htmlContent : state.activeContent
        }));
      }
    };
  } catch {}
}
