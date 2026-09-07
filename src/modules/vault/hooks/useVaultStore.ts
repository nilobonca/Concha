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

export type { VaultTab };
export type { VaultLayoutNode, VaultPaneLeaf, SplitDirection, DraggedTabInfo, DropPreviewState };

export interface FlatNoteItem {
  path: string;
  name: string;
  folder: string;
  fileType?: 'note' | 'audio' | 'image' | 'file';
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
  openDocument: (path: string, targetPaneId?: string) => Promise<void>;
  openMediaTab: (path: string, type: 'audio' | 'image', title?: string, targetPaneId?: string) => void;
  openOrCreateDocumentByTitle: (title: string, targetPaneId?: string) => Promise<void>;
  openCanvasTab: (canvasId: string, title?: string, targetPaneId?: string) => void;
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
  syncCanvasNote: (path: string, markdown: string) => void;

  createFile: (folderPath?: string, name?: string, initialContent?: string, shouldOpen?: boolean) => Promise<string>;
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

    if (isFSA) {
      const fsa = new FSAStorageProvider(savedActiveId, currentVaultMeta?.name || savedVaultName || 'Pasta Windows (HD)');
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
          nodes: sortNodes(nodes),
          layout: effectiveLayout,
          activePaneId: initialActivePaneId,
        });

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
      const fsa = new FSAStorageProvider(effectiveVaultId);
      let connected = false;

      // Se for alternar para um vault existente e forcePicker for falso, tenta carregar o handle salvo
      if (!forcePicker && !isNewConnection) {
        connected = await fsa.init();
        if (!connected) {
          return false;
        }
      } else {
        // Se forcePicker for true ou for uma nova conexão, abre o seletor nativo do Windows
        connected = await fsa.pickDirectory();
      }

      if (!connected) return false;

      const folderVaultName = customName || fsa.vaultName || 'Pasta Local (HD)';
      if (typeof window !== 'undefined') {
        localStorage.setItem('vault_active_id', effectiveVaultId);
        localStorage.setItem('vault_custom_name', folderVaultName);
      }
      set({ isLoading: true });
      const nodes = await fsa.listNodes();
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
      });

      return true;
    } catch (err) {
      console.error('Error connecting to local folder:', err);
      set({ isLoading: false });
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
      isEditing: Boolean(nextActivePath && !nextActivePath.startsWith('canvas:')),
    });

    if (nextActivePath && !nextActivePath.startsWith('canvas:')) {
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
    });

    if (!path.startsWith('canvas:')) {
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
    });
  },

  resizeSplit: (splitId: string, newSizes: number[]) => {
    const { layout } = get();
    const updated = resizeSplitInTree(layout, splitId, newSizes);
    saveLayoutToStorage(updated, get().vaultId);
    set({ layout: updated });
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

    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const title = path.split('/').pop()?.replace(/\.(md|txt)$/, '') || 'Sem título';
    const tab: VaultTab = { path, title, type: 'markdown' };

    const updatedLayout = insertTabInPane(layout, targetId, tab);
    saveLayoutToStorage(updatedLayout, get().vaultId);

    const targetPane = findPaneLeaf(updatedLayout, targetId);

    set({
      layout: updatedLayout,
      activePaneId: targetId,
      activePath: path,
      tabs: targetPane?.tabs || [tab],
      isEditing: true
    });

    await get().loadDocumentContent(path);
  },

  openMediaTab: (path: string, type: 'audio' | 'image', title?: string, targetPaneId?: string) => {
    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const cleanTitle = title || path.split('/').pop() || 'Mídia';
    const tab: VaultTab = { path, title: cleanTitle, type };

    const updatedLayout = insertTabInPane(layout, targetId, tab);
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
    const [docTitle, sectionHeader] = title.split('#');
    const normalized = normalizeNoteTitle(docTitle);
    const { canvases, getAllFiles } = get();

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
        // Audio project canvas: navigate to /project/[id]
        if (Router && Router.push) {
          Router.push(`/project/${matchingCanvas.id}`);
        } else if (typeof window !== 'undefined') {
          window.location.href = `/project/${matchingCanvas.id}`;
        }
        return;
      }
    }

    const allFiles = getAllFiles();

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
    const cleanTitle = docTitle.trim();
    const newPath = await get().createFile('', cleanTitle);
    await get().openDocument(newPath, targetPaneId);
  },

  openCanvasTab: (canvasId: string, title?: string, targetPaneId?: string) => {
    const { layout, activePaneId } = get();
    const targetId = targetPaneId || activePaneId;
    const path = `canvas:${canvasId}`;
    const cleanTitle = title || 'Quadro de Conexões';
    const tab: VaultTab = { path, title: cleanTitle, type: 'canvas', canvasId };

    const updatedLayout = insertTabInPane(layout, targetId, tab);
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
    if (!path || path.startsWith('canvas:')) return '';
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
      return '';
    }
  },

  updateDocumentContent: (path: string, content: string) => {
    if (!path || path.startsWith('canvas:')) return;
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
    if (!path || path.startsWith('canvas:')) return;
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
    if (!path || path.startsWith('canvas:')) return;
    const { provider, documentCache } = get();
    if (!provider || !path) return;

    const doc = documentCache[path];
    if (!doc) return;

    try {
      let markdown = htmlToMarkdown(doc.content);
      if (doc.frontmatter && Object.keys(doc.frontmatter).length > 0) {
        markdown = stringifyFrontmatter(doc.frontmatter, markdown);
      }
      await provider.saveDocument(path, markdown);

      set(state => ({
        isSaving: false,
        lastSavedAt: Date.now(),
        documentCache: {
          ...state.documentCache,
          [path]: { ...doc, isDirty: false, lastSavedAt: Date.now() }
        }
      }));
    } catch (err) {
      console.error(`Falha ao salvar documento em ${path}:`, err);
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

    let finalName = rawName?.trim() || '';
    if (!finalName) {
      const allFiles = get().getAllFiles();
      const prefix = folderPath ? `${folderPath}/` : '';
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

    const fileName = finalName.endsWith('.md') ? finalName : `${finalName}.md`;
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

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

  saveMediaFile: async (file: File, folderPath: string = '') => {
    const { provider } = get();
    if (!provider) throw new Error('Storage não inicializado');

    const fileName = file.name;
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

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

    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    await provider.createFolder(fullPath);

    set(state => {
      const next = new Set(state.expandedFolders);
      next.add(fullPath);
      return { expandedFolders: next };
    });

    await get().refreshNodes();
  },

  renameNode: async (oldPath: string, newPath: string, isFolder: boolean = false) => {
    const { provider, layout, activePath, documentCache } = get();
    if (!provider || oldPath === newPath) return;

    await provider.renameNode(oldPath, newPath, isFolder);

    // Atualiza árvore de layout
    const allPanes = getAllPanes(layout);
    let updatedLayout = layout;

    for (const pane of allPanes) {
      const hasOldTab = pane.tabs.some(t => t.path === oldPath || (isFolder && t.path.startsWith(`${oldPath}/`)));
      if (hasOldTab) {
        updatedLayout = updatePaneInTree(updatedLayout, pane.id, (p) => {
          const nextTabs = p.tabs.map(t => {
            if (t.path === oldPath) {
              const newTitle = newPath.split('/').pop()?.replace(/\.(md|txt)$/, '') || 'Sem título';
              return { ...t, path: newPath, title: newTitle };
            }
            if (isFolder && t.path.startsWith(`${oldPath}/`)) {
              const updatedP = newPath + t.path.slice(oldPath.length);
              return { ...t, path: updatedP };
            }
            return t;
          });
          let nextActive = p.activePath;
          if (p.activePath === oldPath) {
            nextActive = newPath;
          } else if (isFolder && p.activePath?.startsWith(`${oldPath}/`)) {
            nextActive = newPath + p.activePath.slice(oldPath.length);
          }
          return { ...p, tabs: nextTabs, activePath: nextActive };
        });
      }
    }

    saveLayoutToStorage(updatedLayout, get().vaultId);

    // Atualiza cache de documentos
    const nextDocCache = { ...documentCache };
    if (nextDocCache[oldPath]) {
      nextDocCache[newPath] = nextDocCache[oldPath];
      delete nextDocCache[oldPath];
    }

    let nextActivePath = activePath;
    if (activePath === oldPath) {
      nextActivePath = newPath;
    } else if (isFolder && activePath?.startsWith(`${oldPath}/`)) {
      nextActivePath = newPath + activePath.slice(oldPath.length);
    }

    // Atualiza orderMap persistente
    const orderMap = getCustomOrder();
    let orderChanged = false;
    const newOrderMap: Record<string, string[]> = {};

    for (const [folderKey, list] of Object.entries(orderMap)) {
      let nextFolderKey = folderKey;
      if (isFolder) {
        if (folderKey === oldPath) {
          nextFolderKey = newPath;
          orderChanged = true;
        } else if (folderKey.startsWith(`${oldPath}/`)) {
          nextFolderKey = newPath + folderKey.slice(oldPath.length);
          orderChanged = true;
        }
      }
      const nextList = list.map(itemPath => {
        if (itemPath === oldPath || itemPath === oldPath.replace(/\.(md|txt)$/, '')) {
          orderChanged = true;
          return newPath;
        }
        if (isFolder && itemPath.startsWith(`${oldPath}/`)) {
          orderChanged = true;
          return newPath + itemPath.slice(oldPath.length);
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
