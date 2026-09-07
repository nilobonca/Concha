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
import { saveUserTemplate } from '../utils/templateStore';
import { v4 as uuidv4 } from 'uuid';
import { 
  Folder, FolderOpen, FileText, File, ChevronRight, ChevronDown, 
  FilePlus, FolderPlus, Trash2, Search, HardDrive, Database,
  RefreshCw, FolderSync, LayoutTemplate, Edit2, BookmarkPlus,
  Copy, FolderInput, Music, Check, FolderKanban, Box, Upload, Image as ImageIcon,
  Settings
} from 'lucide-react';

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
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  React.useEffect(() => {
    mountedAtRef.current = Date.now();
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (val?: string) => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    const finalVal = (val !== undefined ? val : name).trim();
    onSubmit(finalVal || defaultName);
  };

  const handleCancel = () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    onCancel();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Evita submissão prematura causada pelo clique de montagem do botão
    if (Date.now() - mountedAtRef.current < 250) {
      return;
    }
    handleSubmit(e.currentTarget.value);
  };

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
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e.currentTarget.value);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }}
        onBlur={handleBlur}
        className="flex-1 bg-transparent text-xs text-stone-900 dark:text-neutral-100 outline-none font-medium selection:bg-[#7F95FF]/30 dark:selection:bg-[#1831D7]/50"
        placeholder={defaultName}
      />
    </div>
  );
};

interface InlineRenameFolderInputProps {
  initialName: string;
  onSubmit: (newName: string) => void;
  onCancel: () => void;
}

const InlineRenameFolderInput: React.FC<InlineRenameFolderInputProps> = ({
  initialName,
  onSubmit,
  onCancel,
}) => {
  const [val, setVal] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());

  React.useEffect(() => {
    mountedAtRef.current = Date.now();
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSub = (newVal?: string) => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    const finalVal = (newVal !== undefined ? newVal : val).trim();
    onSubmit(finalVal || initialName);
  };

  const handleCanc = () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    onCancel();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (Date.now() - mountedAtRef.current < 250) {
      return;
    }
    handleSub(e.currentTarget.value);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSub(e.currentTarget.value);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCanc();
        }
      }}
      onBlur={handleBlur}
      className="flex-1 bg-white dark:bg-[#16161D] border border-[#7F95FF]/70 rounded px-1.5 py-0.5 text-xs text-stone-900 dark:text-neutral-100 outline-none shadow-xs selection:bg-[#7F95FF]/30 dark:selection:bg-[#1831D7]/50"
    />
  );
};

export const VaultSidebar: React.FC = () => {
  const router = useRouter();
  const { 
    vaultId,
    vaultName, 
    setVaultName,
    storageType, 
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

  // New file / folder creation states
  const [newFileInputFolder, setNewFileInputFolder] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderInputParent, setNewFolderInputParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderPath, setRenamingFolderPath] = useState<string | null>(null);

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

  // Selected item in the file explorer
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Synchronize selectedPath with activePath whenever activePath changes
  React.useEffect(() => {
    if (activePath) {
      setSelectedPath(activePath);
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

  // Helper to trigger deletion modal for currently selected item
  const triggerDeleteSelected = (customPath?: string) => {
    const targetPath = customPath || selectedPath || activePath;
    if (!targetPath) return;

    const skipConfirm = typeof window !== 'undefined' && localStorage.getItem('vault_skip_delete_confirm') === 'true';

    if (targetPath.startsWith('canvas:')) {
      const canvasId = targetPath.replace('canvas:', '');
      const c = allCanvases.find(item => item.id === canvasId);
      if (c) {
        if (skipConfirm) {
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
      if (selectedPath === node.path) {
        setSelectedPath(null);
      }
      return;
    }

    setDeleteTarget({
      path: node.path,
      name: displayName,
      isFolder,
      itemType: isFolder ? 'folder' : 'file'
    });
  };

  // Delete key handler for selected file/folder/canvas in explorer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;

      // O atalho Delete do teclado NUNCA deve excluir um canvas/quadro sob nenhuma hipótese!
      if (selectedPath?.startsWith('canvas:') || activePath?.startsWith('canvas:')) {
        return;
      }

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

      // Block if any modal or input row is currently open
      if (
        deleteTarget !== null ||
        promptModal !== null ||
        renamingFolderPath !== null ||
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

      const targetPath = selectedPath;
      if (!targetPath || targetPath.startsWith('canvas:')) return;

      e.preventDefault();
      e.stopPropagation();

      triggerDeleteSelected(targetPath);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedPath,
    activePath,
    deleteTarget,
    promptModal,
    renamingFolderPath,
    newFileInputFolder,
    newFolderInputParent,
    nodes,
    allCanvases
  ]);


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


  const handleCreateBoardCanvas = (targetFolderPath: string | null = null) => {
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
      folderPath: targetFolderPath,
      vaultId: vaultId || 'default-vault',
      vaultName: vaultName || 'Meu Vault',
    };
    addLayer(projectMeta);
    openCanvasTab(newProjectId, newName);
  };

  const handleCreateFileSubmit = async (folderPath: string) => {
    if (!newFileName.trim()) {
      setNewFileInputFolder(null);
      return;
    }
    await createFile(folderPath, newFileName.trim());
    setNewFileName('');
    setNewFileInputFolder(null);
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
    setRenamingFolderPath(null);
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

  const handleCreateAudioCanvas = (targetFolderPath: string | null = null) => {
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
      folderPath: targetFolderPath,
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

    router.push(`/project/${newProjectId}`);
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
      if (node.type === 'file') {
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
    if (p === '') {
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
    const pCanvases = p === '__GENERAL_CANVASES__'
      ? allCanvases.filter(c => !c.folderPath)
      : allCanvases.filter(c => (c.folderPath || '') === p || (p === '' && c.folderPath === '__ROOT__'));

    const items: TreeItem[] = [
      ...pNodes.map(n => ({ kind: 'node' as const, id: n.path, node: n })),
      ...pCanvases.map(c => ({ kind: 'canvas' as const, id: `canvas:${c.id}`, canvas: c }))
    ];

    return getSortedFolderItems(items, p).map(i => i.id);
  };

  const handleItemDragOver = (e: React.DragEvent, targetItem: TreeItem, parentPath: string) => {
    if (!draggedNode && !draggedCanvas) return;

    const currentKey = draggedNode ? draggedNode.path : `canvas:${draggedCanvas?.id}`;
    if (currentKey === targetItem.id) return;

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

    let position: 'before' | 'after' | 'inside';
    if (isTargetFolder) {
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

    let position: 'before' | 'after' | 'inside';
    if (dropTargetRef.current && dropTargetRef.current.id === targetItem.id) {
      position = dropTargetRef.current.position;
    } else if (isTargetFolder) {
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

    if (!draggedNode && !draggedCanvas) return;

    // 1. Drop INSIDE folder
    if (position === 'inside' && isTargetFolder) {
      const targetFolderPath = targetItem.node.path;

      if (draggedNode) {
        if (draggedNode.path === targetFolderPath || targetFolderPath.startsWith(draggedNode.path + '/')) {
          setDraggedNode(null);
          return;
        }
        const fileName = draggedNode.path.split('/').pop()!;
        const oldParent = draggedNode.path.includes('/') ? draggedNode.path.split('/').slice(0, -1).join('/') : '';
        const newPath = `${targetFolderPath}/${fileName}`;

        if (oldParent !== targetFolderPath) {
          await moveNode(draggedNode.path, targetFolderPath);
        }
        if (!expandedFolders.has(targetFolderPath)) {
          toggleFolder(targetFolderPath);
        }
        const currentKeys = getExistingKeysInParent(targetFolderPath).filter(k => 
          k !== newPath && 
          k !== draggedNode.path && 
          k !== draggedNode.name &&
          k !== `${targetFolderPath}/${draggedNode.name}`
        );
        currentKeys.push(newPath);
        reorderNodes(targetFolderPath, currentKeys);

        if (oldParent !== targetFolderPath) {
          const orderMap = getCustomOrder();
          if (orderMap[oldParent]) {
            orderMap[oldParent] = orderMap[oldParent].filter(k => 
              k !== draggedNode.path && 
              k !== draggedNode.name
            );
            setCustomOrder(orderMap);
          }
        }
        setDraggedNode(null);
      } else if (draggedCanvas) {
        const oldFolder = draggedCanvas.folderPath || '';
        if (oldFolder !== targetFolderPath) {
          updateLayer({ ...draggedCanvas, folderPath: targetFolderPath });
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

    if (draggedNode) {
      const fileName = draggedNode.path.split('/').pop()!;
      const oldParent = draggedNode.path.includes('/') ? draggedNode.path.split('/').slice(0, -1).join('/') : '';
      const newPath = targetParent ? `${targetParent}/${fileName}` : fileName;

      if (oldParent !== targetParent) {
        await moveNode(draggedNode.path, targetParent);
      }

      const currentKeys = getExistingKeysInParent(targetParent).filter(k => 
        k !== draggedNode.path && 
        k !== newPath && 
        k !== draggedNode.name &&
        k !== (targetParent ? `${targetParent}/${draggedNode.name}` : draggedNode.name)
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
            k !== draggedNode.path && 
            k !== draggedNode.name
          );
          setCustomOrder(orderMap);
        }
      }
      setDraggedNode(null);
    } else if (draggedCanvas) {
      const oldFolder = draggedCanvas.folderPath || '';
      if (oldFolder !== targetParent) {
        updateLayer({ ...draggedCanvas, folderPath: targetParent === '' ? '' : targetParent });
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

    if (draggedNode) {
      const fileName = draggedNode.path.split('/').pop()!;
      const oldParent = draggedNode.path.includes('/') ? draggedNode.path.split('/').slice(0, -1).join('/') : '';
      const newPath = fileName;
      if (oldParent !== '') {
        await moveNode(draggedNode.path, '');
      }
      const currentKeys = getExistingKeysInParent('').filter(k => 
        k !== draggedNode.path && 
        k !== newPath && 
        k !== draggedNode.name
      );
      currentKeys.push(newPath);
      reorderNodes('', currentKeys);

      if (oldParent !== '') {
        const orderMap = getCustomOrder();
        if (orderMap[oldParent]) {
          orderMap[oldParent] = orderMap[oldParent].filter(k => 
            k !== draggedNode.path && 
            k !== draggedNode.name
          );
          setCustomOrder(orderMap);
        }
      }
      setDraggedNode(null);
    } else if (draggedCanvas) {
      if (draggedCanvas.folderPath) {
        updateLayer({ ...draggedCanvas, folderPath: '' });
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
    const isCanvasSelected = selectedPath === canvasItemId || (!selectedPath && isCanvasActive);
    const isDropBefore = dropTarget?.id === canvasItemId && dropTarget.position === 'before';
    const isDropAfter = dropTarget?.id === canvasItemId && dropTarget.position === 'after';

    return (
      <div
        key={`canvas-${canvas.id}`}
        tabIndex={0}
        draggable={true}
        onFocus={() => {
          setSelectedPath(canvasItemId);
        }}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/rpgsa-canvas', JSON.stringify({ id: canvas.id, name: canvas.name, canvasType: canvas.canvasType }));
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
          setSelectedPath(canvasItemId);
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            canvas,
          });
        }}
        onClick={() => {
          setSelectedPath(canvasItemId);
          if (isBoard) {
            openCanvasTab(canvas.id, canvas.name);
          } else {
            router.push(`/project/${canvas.id}`);
          }
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
    const isExpanded = expandedFolders.has(node.path);
    const isActive = activePath === node.path;
    const isSelected = selectedPath === node.path || (!selectedPath && isActive);
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
          onFocus={() => {
            setSelectedPath(node.path);
          }}
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', node.path);
            if (!isFolder) {
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
            setSelectedPath(node.path);
            handleContextMenu(e, node);
          }}
          onClick={() => {
            setSelectedPath(node.path);
            if (isFolder) {
              toggleFolder(node.path);
            } else {
              openDocument(node.path);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
          className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-lg cursor-pointer transition-all outline-none ${
            isDropInside && isFolder
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

          <div className="flex items-center gap-2 truncate">
            {isFolder ? (
              <span className="text-stone-400 dark:text-neutral-400">
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
            ) : node.fileType === 'audio' ? (
              <Music className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            ) : node.fileType === 'image' ? (
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : node.fileType === 'file' ? (
              <File className="w-3.5 h-3.5 text-amber-600/80 dark:text-amber-400/80 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 shrink-0" />
            )}

            {isFolder && renamingFolderPath === node.path ? (
              <InlineRenameFolderInput
                initialName={node.name}
                onSubmit={(newName) => handleRenameFolderSubmit(node.path, newName)}
                onCancel={() => setRenamingFolderPath(null)}
              />
            ) : (
              <span className="truncate text-xs">
                {node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt')))
                  ? node.name.replace(/\.(md|txt)$/i, '')
                  : node.name}
              </span>
            )}
          </div>
        </div>

        {/* Inputs for inline file/folder creation */}
        {isFolder && isExpanded && (
          <div>
            {newFileInputFolder === node.path && (
              <div style={{ paddingLeft: `${(depth + 1) * 14 + 12}px` }} className="py-1 pr-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nome da nota..."
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFileSubmit(node.path);
                    if (e.key === 'Escape') setNewFileInputFolder(null);
                  }}
                  onBlur={() => handleCreateFileSubmit(node.path)}
                  className="w-full bg-white dark:bg-[#16161D] border border-[#7F95FF]/60 rounded-md px-2 py-1 text-xs text-stone-900 dark:text-neutral-100 outline-none shadow-xs"
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

    const items: TreeItem[] = [
      ...childNodes.map(n => ({ kind: 'node' as const, id: n.path, node: n })),
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

    // Context menu on Canvas item
    if (contextMenu.canvas) {
      const c = contextMenu.canvas;
      const isBoard = c.canvasType === 'board';
      return [
        {
          label: isBoard ? 'Abrir no Vault' : 'Abrir Canvas',
          icon: isBoard ? <FolderKanban size={16} className="text-[#7F95FF]" /> : <Music size={16} className="text-cyan-400" />,
          onClick: () => {
            if (isBoard) {
              openCanvasTab(c.id, c.name);
            } else {
              router.push(`/project/${c.id}`);
            }
          }
        },
        ...(c.folderPath ? [{
          label: 'Mover para a Caixa de Canvas Gerais',
          icon: <Box size={16} className="text-amber-400" />,
          onClick: () => {
            updateLayer({ ...c, folderPath: null });
          }
        }] : []),
        {
          label: 'Mover para Pasta...',
          icon: <FolderInput size={16} className="text-[#7F95FF]" />,
          onClick: () => {},
          subMenu: [
            ...(c.folderPath ? [{
              label: 'Caixa de Canvas Gerais',
              onClick: () => updateLayer({ ...c, folderPath: null })
            }] : []),
            {
              label: 'Raiz do Vault',
              onClick: () => updateLayer({ ...c, folderPath: '' })
            },
            ...allFolders
              .filter(f => f !== c.folderPath)
              .map(folder => ({
                label: folder,
                onClick: () => updateLayer({ ...c, folderPath: folder })
              }))
          ]
        },
        {
          label: 'Renomear Canvas',
          icon: <Edit2 size={16} className="text-cyan-400" />,
          onClick: () => {
            setPromptModal({
              title: 'Renomear Canvas',
              description: 'Digite o novo nome para o canvas:',
              defaultValue: c.name,
              confirmText: 'Salvar',
              icon: <Edit2 className="w-5 h-5 text-cyan-400" />,
              onConfirm: (newName) => {
                if (newName && newName.trim() && newName.trim() !== c.name) {
                  updateLayer({ ...c, name: newName.trim() });
                }
              }
            });
          }
        },
        {
          label: 'Excluir Canvas',
          icon: <Trash2 size={16} className="text-red-400" />,
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
          icon: <FilePlus size={16} className="text-[#7F95FF]" />,
          onClick: async () => {
            await createFile('');
          }
        },
        {
          label: 'Salvar Áudio ou Imagem...',
          icon: <Upload size={16} className="text-cyan-400" />,
          onClick: () => {
            triggerMediaUpload('');
          }
        },
        {
          label: 'Novo Canvas de Conexões',
          icon: <FolderKanban size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            handleCreateBoardCanvas();
          }
        },
        {
          label: 'Novo Canvas de Áudio',
          icon: <Music size={16} className="text-cyan-400" />,
          onClick: () => {
            handleCreateAudioCanvas();
          }
        },
        {
          label: 'Nova Pasta',
          icon: <FolderPlus size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            handleStartCreateFolder('');
          }
        },
        {
          label: 'Criar a partir de Template',
          icon: <LayoutTemplate size={16} className="text-amber-400" />,
          onClick: () => {
            setTemplateModalOpen(true);
          }
        },
        {
          label: 'Recarregar Arquivos',
          icon: <RefreshCw size={16} className="text-neutral-400" />,
          onClick: () => {
            refreshNodes();
          }
        },
        {
          label: 'Renomear Vault',
          icon: <Edit2 size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            setPromptModal({
              title: 'Renomear Vault',
              description: 'Digite o novo nome para o Vault:',
              defaultValue: vaultName,
              confirmText: 'Salvar',
              icon: <Edit2 className="w-5 h-5 text-[#7F95FF]" />,
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
      const isMedia = node.fileType === 'audio' || node.fileType === 'image';
      const isNote = node.fileType === 'note' || (!node.fileType && (node.name.endsWith('.md') || node.name.endsWith('.txt')));

      if (isMedia || (!isNote && node.fileType === 'file')) {
        return [
          {
            label: node.fileType === 'audio' ? 'Abrir Áudio' : node.fileType === 'image' ? 'Visualizar Imagem' : 'Abrir Arquivo',
            icon: node.fileType === 'audio' ? <Music size={16} className="text-cyan-400" /> : node.fileType === 'image' ? <ImageIcon size={16} className="text-emerald-400" /> : <File size={16} className="text-amber-500" />,
            onClick: () => {
              openDocument(node.path);
            }
          },
          {
            label: 'Renomear Arquivo',
            icon: <Edit2 size={16} className="text-[#7F95FF]" />,
            onClick: () => {
              const oldFileName = node.path.split('/').pop() || node.name;
              const lastDot = oldFileName.lastIndexOf('.');
              const originalExt = lastDot > 0 ? oldFileName.slice(lastDot + 1) : '';

              setPromptModal({
                title: 'Renomear Arquivo',
                description: 'Digite o novo nome para o arquivo:',
                defaultValue: node.name,
                confirmText: 'Renomear',
                icon: <Edit2 className="w-5 h-5 text-[#7F95FF]" />,
                onConfirm: (newName) => {
                  const trimmed = newName?.trim();
                  if (trimmed && trimmed !== node.name) {
                    let finalName = trimmed;
                    // Se o usuário não digitou extensão e o arquivo original tinha extensão, preserva a extensão original
                    if (originalExt && !finalName.includes('.')) {
                      finalName = `${finalName}.${originalExt}`;
                    }
                    const parts = node.path.split('/');
                    parts[parts.length - 1] = finalName;
                    renameNode(node.path, parts.join('/'), false);
                  }
                }
              });
            }
          },
          {
            label: 'Mover para...',
            icon: <FolderInput size={16} className="text-amber-400" />,
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
            icon: <Trash2 size={16} className="text-red-400" />,
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
          icon: <FileText size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            openDocument(node.path);
          }
        },
        {
          label: 'Renomear Nota',
          icon: <Edit2 size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            const isTxt = node.path.toLowerCase().endsWith('.txt');
            const defaultExt = isTxt ? 'txt' : 'md';
            const currentName = node.name.replace(/\.(md|txt)$/i, '');

            setPromptModal({
              title: 'Renomear Nota',
              description: 'Digite o novo nome para a nota:',
              defaultValue: currentName,
              confirmText: 'Renomear',
              icon: <Edit2 className="w-5 h-5 text-[#7F95FF]" />,
              onConfirm: (newName) => {
                const trimmed = newName?.trim();
                if (trimmed && trimmed !== currentName) {
                  let finalName = trimmed;
                  if (finalName.toLowerCase().endsWith('.md') || finalName.toLowerCase().endsWith('.txt')) {
                    // Já possui extensão de nota válida
                  } else {
                    finalName = `${finalName}.${defaultExt}`;
                  }
                  const parts = node.path.split('/');
                  parts[parts.length - 1] = finalName;
                  renameNode(node.path, parts.join('/'), false);
                }
              }
            });
          }
        },
        {
          label: 'Tornar Template',
          icon: <BookmarkPlus size={16} className="text-emerald-400" />,
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
          icon: <Copy size={16} className="text-cyan-400" />,
          onClick: () => {
            const wikilink = `[[${node.name.replace(/\.md$/, '')}]]`;
            navigator.clipboard.writeText(wikilink);
          }
        },
        {
          label: 'Mover para...',
          icon: <FolderInput size={16} className="text-amber-400" />,
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
          icon: <Trash2 size={16} className="text-red-400" />,
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
          icon: <FilePlus size={16} className="text-[#7F95FF]" />,
          onClick: async () => {
            toggleFolder(node.path);
            await createFile(node.path);
          }
        },
        {
          label: 'Salvar Áudio ou Imagem nesta pasta',
          icon: <Upload size={16} className="text-cyan-400" />,
          onClick: () => {
            toggleFolder(node.path);
            triggerMediaUpload(node.path);
          }
        },
        {
          label: 'Novo Canvas de Conexões nesta pasta',
          icon: <FolderKanban size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            toggleFolder(node.path);
            handleCreateBoardCanvas(node.path);
          }
        },
        {
          label: 'Novo Canvas de Áudio nesta pasta',
          icon: <Music size={16} className="text-cyan-400" />,
          onClick: () => {
            toggleFolder(node.path);
            handleCreateAudioCanvas(node.path);
          }
        },
        {
          label: 'Nova Subpasta',
          icon: <FolderPlus size={16} className="text-[#7F95FF]" />,
          onClick: () => {
            handleStartCreateFolder(node.path);
          }
        },
        {
          label: 'Renomear Pasta',
          icon: <Edit2 size={16} className="text-cyan-400" />,
          onClick: () => {
            setRenamingFolderPath(node.path);
          }
        },
        {
          label: 'Excluir Pasta',
          icon: <Trash2 size={16} className="text-red-400" />,
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
        />
      ) : (
        <>
          {/* Sidebar Header: Search */}
          <div className="p-2.5 border-b border-stone-200/90 dark:border-white/10 bg-white/70 dark:bg-white/[0.02]">
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
          if (draggedNode || draggedCanvas || e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
          }
        }}
        onDrop={handleRootContainerDrop}
      >
        {/* Root level inputs */}
        {newFileInputFolder === '' && (
          <div className="py-1 px-2">
            <input
              type="text"
              autoFocus
              placeholder="Nome da nota raiz..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFileSubmit('');
                if (e.key === 'Escape') setNewFileInputFolder(null);
              }}
              onBlur={() => handleCreateFileSubmit('')}
              className="w-full bg-white dark:bg-[#16161D] border border-[#7F95FF]/60 rounded-md px-2 py-1 text-xs text-stone-900 dark:text-neutral-100 outline-none shadow-xs"
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

        {filteredNodes.length === 0 && allCanvases.filter(c => c.folderPath === '' || c.folderPath === '__ROOT__').length === 0 ? (
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
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            if (deleteTarget.itemType === 'canvas' && deleteTarget.canvasId) {
              deleteLayer(deleteTarget.canvasId);
              closeTab(`canvas:${deleteTarget.canvasId}`);
            } else {
              await deleteNode(deleteTarget.path, deleteTarget.isFolder);
            }
            if (selectedPath === deleteTarget.path) {
              setSelectedPath(null);
            }
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
