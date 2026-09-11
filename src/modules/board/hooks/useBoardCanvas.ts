import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  BoardElement,
  BoardConnection,
  BoardElementType,
  HandlePosition,
  NoteData,
  TextData,
  AudioData,
  ImageData,
  CanvasPreviewData,
  ViewportTransform,
  BoardElementPayload,
} from '../types';
import { useBoardStorage } from './useBoardStorage';
import { useBoardConnections, getFacingHandle, getOppositeHandle } from './useBoardConnections';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { cleanLegacyPlaceholder, cleanDuplicateTitle } from '@/utils/cleanLegacyPlaceholder';

const DEFAULT_NOTE_WIDTH = 220;
const DEFAULT_NOTE_HEIGHT = 180;
const DEFAULT_TEXT_WIDTH = 200;
const DEFAULT_TEXT_HEIGHT = 70;
const DEFAULT_AUDIO_WIDTH = 280;
const DEFAULT_AUDIO_HEIGHT = 120;
const DEFAULT_IMAGE_WIDTH = 260;
const DEFAULT_IMAGE_HEIGHT = 200;
const DEFAULT_PREVIEW_WIDTH = 260;
const DEFAULT_PREVIEW_HEIGHT = 150;

export function useBoardCanvas(boardId: string, initialName?: string, folderPath?: string | null) {
  const { boardData, setBoardData, persistBoard, isLoading, flushSave } = useBoardStorage(boardId, initialName, folderPath);

  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const selectedElementId = selectedElementIds.size === 1 ? Array.from(selectedElementIds)[0] : (selectedElementIds.size > 0 ? Array.from(selectedElementIds)[selectedElementIds.size - 1] : null);

  const setSelectedElementId = useCallback((id: string | null) => {
    if (!id) {
      setSelectedElementIds(new Set());
    } else {
      setSelectedElementIds(new Set([id]));
    }
  }, []);

  const handleSelectElement = useCallback((id: string, e?: React.MouseEvent | React.PointerEvent) => {
    const isMultiKey = e && (('ctrlKey' in e && e.ctrlKey) || ('metaKey' in e && e.metaKey) || ('shiftKey' in e && e.shiftKey));
    if (isMultiKey) {
      setSelectedElementIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedElementIds(new Set([id]));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElementIds(new Set());
  }, []);

  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportTransform>({ x: -100, y: -100, k: 1 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Modais de criação direta
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);
  const modalPlacementPos = useRef<{ x: number; y: number } | null>(null);

  // Manipulação de conexões
  const setConnections = useCallback((updater: (prev: BoardConnection[]) => BoardConnection[]) => {
    persistBoard(prev => {
      const updatedConnections = updater(prev.connections);
      return {
        ...prev,
        connections: updatedConnections,
        updatedAt: new Date().toISOString(),
      };
    }, true);
  }, [persistBoard]);

  // Criar elemento do mesmo tipo de origem e conectar ao soltar seta no espaço vazio
  const handleAutoSpawnAndConnect = useCallback(async (
    sourceId: string,
    sourceHandle: HandlePosition,
    dropPos: { x: number; y: number }
  ) => {
    const sourceEl = boardData.elements.find(el => el.id === sourceId);
    if (!sourceEl) return;

    const width = sourceEl.width || DEFAULT_NOTE_WIDTH;
    const height = sourceEl.height || DEFAULT_NOTE_HEIGHT;
    const targetHandle = getOppositeHandle(sourceHandle);

    let spawnX = dropPos.x;
    let spawnY = dropPos.y;

    switch (sourceHandle) {
      case 'right':
        spawnX = dropPos.x;
        spawnY = dropPos.y - height / 2;
        break;
      case 'left':
        spawnX = dropPos.x - width;
        spawnY = dropPos.y - height / 2;
        break;
      case 'bottom':
        spawnX = dropPos.x - width / 2;
        spawnY = dropPos.y;
        break;
      case 'top':
        spawnX = dropPos.x - width / 2;
        spawnY = dropPos.y - height;
        break;
    }

    // Criar novo elemento do mesmo tipo de origem
    let newData: NoteData | TextData | AudioData | ImageData | CanvasPreviewData | Record<string, unknown>;
    if (sourceEl.type === 'note') {
      const srcNote = (sourceEl.data || {}) as NoteData;
      let targetFilePath: string | undefined;
      let title = 'Nova Nota';

      try {
        const vaultStore = useVaultStore.getState();
        if (!vaultStore.provider) {
          await vaultStore.initializeStorage();
        }
        targetFilePath = await useVaultStore.getState().createFile('', '', '', false);
        if (targetFilePath) {
          const fileName = targetFilePath.split('/').pop()?.replace(/\.md$/, '');
          if (fileName) title = fileName;
        }
      } catch (err) {
        console.warn('Falha ao criar nota no Vault a partir da conexão de seta:', err);
      }

      newData = {
        title,
        content: '',
        color: srcNote.color || '#1831D7',
        filePath: targetFilePath,
      } as NoteData;
    } else if (sourceEl.type === 'text') {
      const srcText = (sourceEl.data || {}) as TextData;
      newData = {
        text: 'Novo Texto',
        fontSize: srcText.fontSize || 16,
        color: srcText.color,
        align: srcText.align,
        isBold: srcText.isBold,
      } as TextData;
    } else if (sourceEl.type === 'audio') {
      const srcAudio = (sourceEl.data || {}) as AudioData;
      newData = { ...srcAudio };
    } else if (sourceEl.type === 'image') {
      const srcImg = (sourceEl.data || {}) as ImageData;
      newData = { ...srcImg };
    } else if (sourceEl.type === 'canvas-preview') {
      const srcPreview = (sourceEl.data || {}) as CanvasPreviewData;
      newData = { ...srcPreview };
    } else {
      newData = { ...(sourceEl.data || {}) };
    }

    const maxZ = boardData.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);

    const newElement: BoardElement = {
      id: uuidv4(),
      boardId,
      type: sourceEl.type,
      x: spawnX,
      y: spawnY,
      width,
      height,
      zIndex: maxZ + 1,
      data: newData,
    };

    const newConnection: BoardConnection = {
      id: uuidv4(),
      boardId,
      fromId: sourceId,
      fromHandle: sourceHandle,
      toId: newElement.id,
      toHandle: targetHandle,
      color: '#818cf8',
    };

    persistBoard(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
      connections: [...prev.connections, newConnection],
      updatedAt: new Date().toISOString(),
    }), true);

    setSelectedElementId(newElement.id);
  }, [boardId, persistBoard, setSelectedElementId]);

  const connectionsHook = useBoardConnections(
    boardData.elements,
    boardData.connections,
    setConnections,
    handleAutoSpawnAndConnect
  );

  // Atualizar elemento (com suporte a movimentação em grupo e persistência imediata para conteúdo)
  const updateElement = useCallback((id: string, updates: Partial<BoardElement>, immediate = false) => {
    const isContentChange = Boolean(updates.data);
    persistBoard(prev => {
      const target = prev.elements.find(el => el.id === id);
      const dx = (updates.x !== undefined && target) ? updates.x - target.x : 0;
      const dy = (updates.y !== undefined && target) ? updates.y - target.y : 0;
      const isMovingGroup = (dx !== 0 || dy !== 0) && selectedElementIds.has(id) && selectedElementIds.size > 1;

      const updatedElements = prev.elements.map(el => {
        if (el.id === id) {
          return { ...el, ...updates };
        }
        if (isMovingGroup && selectedElementIds.has(el.id)) {
          return {
            ...el,
            x: Math.max(0, el.x + dx),
            y: Math.max(0, el.y + dy),
          };
        }
        return el;
      });
      return {
        ...prev,
        elements: updatedElements,
        updatedAt: new Date().toISOString(),
      };
    }, immediate || isContentChange);
  }, [persistBoard, selectedElementIds]);

  // Excluir elemento (e conexões vinculadas)
  const deleteElement = useCallback((id: string) => {
    persistBoard(prev => {
      const updatedElements = prev.elements.filter(el => el.id !== id);
      const updatedConnections = prev.connections.filter(
        c => c.fromId !== id && c.toId !== id
      );
      return {
        ...prev,
        elements: updatedElements,
        connections: updatedConnections,
        updatedAt: new Date().toISOString(),
      };
    }, true);
    setSelectedElementIds(prev => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      return prev;
    });
  }, [persistBoard]);

  const deleteSelectedElements = useCallback(() => {
    if (selectedElementIds.size === 0) return;
    const idsToDelete = new Set(selectedElementIds);
    persistBoard(prev => {
      const updatedElements = prev.elements.filter(el => !idsToDelete.has(el.id));
      const updatedConnections = prev.connections.filter(
        c => !idsToDelete.has(c.fromId) && !idsToDelete.has(c.toId)
      );
      return {
        ...prev,
        elements: updatedElements,
        connections: updatedConnections,
        updatedAt: new Date().toISOString(),
      };
    }, true);
    setSelectedElementIds(new Set());
  }, [persistBoard, selectedElementIds]);

  // Atualizar nome do board
  const updateBoardName = useCallback((name: string) => {
    persistBoard(prev => ({
      ...prev,
      name,
      updatedAt: new Date().toISOString(),
    }), true);
  }, [persistBoard]);

  // Adicionar elemento genérico
  const addElement = useCallback((element: Omit<BoardElement, 'boardId'>) => {
    const id = element.id || uuidv4();
    let newEl: BoardElement;

    persistBoard(prev => {
      const maxZ = prev.elements.length > 0
        ? Math.max(...prev.elements.map(e => e.zIndex || 0))
        : 0;

      newEl = {
        ...element,
        id,
        boardId,
        zIndex: maxZ + 1,
      };

      return {
        ...prev,
        elements: [...prev.elements, newEl],
        updatedAt: new Date().toISOString(),
      };
    }, true);

    setSelectedElementId(id);
    return newEl!;
  }, [boardId, persistBoard, setSelectedElementId]);

  // Criar Nota (com criação automática e vinculação no Vault)
  const createNote = useCallback(async (
    pos?: { x: number; y: number },
    color: string = '#fef08a',
    initialTitle?: string,
    initialContent?: string,
    filePath?: string
  ) => {
    const x = pos ? pos.x : (-viewportRef.current.x + 300) / viewportRef.current.k;
    const y = pos ? pos.y : (-viewportRef.current.y + 200) / viewportRef.current.k;

    let targetFilePath = filePath;
    let title = initialTitle || 'Nova Nota';

    // Se não tiver filePath, cria automaticamente no Vault
    if (!targetFilePath) {
      try {
        const vaultStore = useVaultStore.getState();
        if (!vaultStore.provider) {
          await vaultStore.initializeStorage();
        }
        targetFilePath = await useVaultStore.getState().createFile('', initialTitle || '', initialContent || '', false);
        if (targetFilePath) {
          const fileName = targetFilePath.split('/').pop()?.replace(/\.md$/, '');
          if (fileName) title = fileName;
        }
      } catch (err) {
        console.warn('Falha ao criar nota no Vault a partir do Board:', err);
      }
    }

    return addElement({
      id: uuidv4(),
      type: 'note',
      x,
      y,
      width: DEFAULT_NOTE_WIDTH,
      height: DEFAULT_NOTE_HEIGHT,
      zIndex: 1,
      data: {
        title,
        content: cleanDuplicateTitle(cleanLegacyPlaceholder(initialContent || ''), title),
        color,
        filePath: targetFilePath,
      } as NoteData,
    });
  }, [addElement]);

  // Criar Texto
  const createText = useCallback((pos?: { x: number; y: number }) => {
    const x = pos ? pos.x : (-viewportRef.current.x + 300) / viewportRef.current.k;
    const y = pos ? pos.y : (-viewportRef.current.y + 200) / viewportRef.current.k;

    return addElement({
      id: uuidv4(),
      type: 'text',
      x,
      y,
      width: DEFAULT_TEXT_WIDTH,
      height: DEFAULT_TEXT_HEIGHT,
      zIndex: 1,
      data: {
        text: 'Clique duas vezes para editar...',
        fontSize: 18,
        color: '#f8fafc',
        align: 'left',
        isBold: false,
      } as TextData,
    });
  }, [addElement]);

  // Criar Áudio
  const createAudio = useCallback((audioData: AudioData, pos?: { x: number; y: number }) => {
    const x = pos ? pos.x : (-viewportRef.current.x + 300) / viewportRef.current.k;
    const y = pos ? pos.y : (-viewportRef.current.y + 200) / viewportRef.current.k;

    return addElement({
      id: uuidv4(),
      type: 'audio',
      x,
      y,
      width: DEFAULT_AUDIO_WIDTH,
      height: DEFAULT_AUDIO_HEIGHT,
      zIndex: 1,
      data: audioData,
    });
  }, [addElement]);

  // Criar Imagem
  const createImage = useCallback((imageData: ImageData, pos?: { x: number; y: number }) => {
    const x = pos ? pos.x : (-viewportRef.current.x + 300) / viewportRef.current.k;
    const y = pos ? pos.y : (-viewportRef.current.y + 200) / viewportRef.current.k;

    return addElement({
      id: uuidv4(),
      type: 'image',
      x,
      y,
      width: DEFAULT_IMAGE_WIDTH,
      height: DEFAULT_IMAGE_HEIGHT,
      zIndex: 1,
      data: imageData,
    });
  }, [addElement]);

  // Criar Preview de Canvas
  const createCanvasPreview = useCallback((previewData: CanvasPreviewData, pos?: { x: number; y: number }) => {
    const x = pos ? pos.x : (-viewportRef.current.x + 300) / viewportRef.current.k;
    const y = pos ? pos.y : (-viewportRef.current.y + 200) / viewportRef.current.k;

    return addElement({
      id: uuidv4(),
      type: 'canvas-preview',
      x,
      y,
      width: DEFAULT_PREVIEW_WIDTH,
      height: DEFAULT_PREVIEW_HEIGHT,
      zIndex: 1,
      data: previewData,
    });
  }, [addElement]);

  // Criação contextual conectada a partir de soltura de seta no vazio!
  const createConnectedElement = useCallback(async (
    type: BoardElementType,
    payload?: BoardElementPayload
  ) => {
    const context = connectionsHook.pendingArrowContext;
    if (!context) return;

    const { sourceId, sourceHandle, dropPos } = context;

    let newEl: BoardElement;
    const spawnX = dropPos.x - 100;
    const spawnY = dropPos.y - 60;

    switch (type) {
      case 'note': {
        const notePayload = payload as Partial<NoteData> | undefined;
        newEl = await createNote(
          { x: spawnX, y: spawnY },
          notePayload?.color || '#fef08a',
          notePayload?.title,
          notePayload?.content,
          notePayload?.filePath
        );
        break;
      }
      case 'text':
        newEl = createText({ x: spawnX, y: spawnY });
        break;
      case 'audio':
        newEl = createAudio(
          (payload as AudioData) || { name: 'Áudio Sem Nome', volume: 1 },
          { x: spawnX, y: spawnY }
        );
        break;
      case 'image':
        newEl = createImage(
          (payload as ImageData) || { name: 'Imagem', src: '' },
          { x: spawnX, y: spawnY }
        );
        break;
      case 'canvas-preview':
        newEl = createCanvasPreview(
          (payload as CanvasPreviewData) || { targetProjectId: '', targetName: 'Canvas', targetType: 'audio' },
          { x: spawnX, y: spawnY }
        );
        break;
    }

    // Calcular a melhor alça de conexão voltada para a origem
    const targetHandle = getFacingHandle(dropPos, newEl);

    // Conectar elemento de origem ao novo elemento!
    setConnections(prev => [
      ...prev,
      {
        id: uuidv4(),
        boardId,
        fromId: sourceId,
        fromHandle: sourceHandle,
        toId: newEl.id,
        toHandle: targetHandle,
        color: '#818cf8',
      },
    ]);

    connectionsHook.closePendingArrowContext();
  }, [
    boardId,
    connectionsHook,
    createAudio,
    createCanvasPreview,
    createImage,
    createNote,
    createText,
    setConnections,
  ]);

  // Teclado: Excluir item ou conexão com Delete/Backspace ou Mover com Setas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueia se algum elemento estiver em modo de edição
      if (editingElementId) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement;
      const target = e.target as HTMLElement;
      const isTyping = (
        (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) ||
        (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) ||
        Boolean(activeEl?.closest('input, textarea, [contenteditable="true"]')) ||
        Boolean(target?.closest('input, textarea, [contenteditable="true"]'))
      );

      if (isTyping) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          deleteSelectedElements();
        } else if (connectionsHook.selectedConnectionId) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          connectionsHook.deleteConnection(connectionsHook.selectedConnectionId);
        }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 50 : 10;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

          persistBoard(prev => {
            const updatedElements = prev.elements.map(el => {
              if (selectedElementIds.has(el.id)) {
                return {
                  ...el,
                  x: Math.max(0, el.x + dx),
                  y: Math.max(0, el.y + dy),
                };
              }
              return el;
            });
            return {
              ...prev,
              elements: updatedElements,
              updatedAt: new Date().toISOString(),
            };
          }, false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [connectionsHook, deleteSelectedElements, selectedElementIds, boardData.elements, editingElementId, persistBoard]);

  // Observa renomeação de notas no Vault para atualizar elementos do canvas
  useEffect(() => {
    const handleVaultNodeRenamed = (e: Event) => {
      const customEvent = e as CustomEvent<{ oldPath: string; newPath: string }>;
      if (!customEvent.detail?.oldPath || !customEvent.detail?.newPath) return;
      const { oldPath, newPath } = customEvent.detail;
      const newTitle = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';

      persistBoard(prev => {
        let hasChanges = false;
        const nextElements = prev.elements.map(el => {
          if (el.type === 'note') {
            const nData = (el.data || {}) as NoteData;
            if (nData.filePath === oldPath) {
              hasChanges = true;
              return {
                ...el,
                data: {
                  ...nData,
                  filePath: newPath,
                  title: newTitle,
                }
              };
            }
          }
          return el;
        });

        if (!hasChanges) return prev;
        return {
          ...prev,
          elements: nextElements,
          updatedAt: new Date().toISOString(),
        };
      }, true);
    };

    window.addEventListener('vault_node_renamed', handleVaultNodeRenamed);
    return () => {
      window.removeEventListener('vault_node_renamed', handleVaultNodeRenamed);
    };
  }, [persistBoard]);

  // Observa renomeação do próprio canvas externamente
  useEffect(() => {
    const handleCanvasRenamed = (e: Event) => {
      const customEvent = e as CustomEvent<{ canvasId: string; newName: string }>;
      if (customEvent.detail?.canvasId === boardId && customEvent.detail?.newName) {
        persistBoard(prev => {
          if (prev.name === customEvent.detail.newName) return prev;
          return {
            ...prev,
            name: customEvent.detail.newName,
            updatedAt: new Date().toISOString(),
          };
        }, true);
      }
    };

    window.addEventListener('canvas_renamed', handleCanvasRenamed);
    return () => {
      window.removeEventListener('canvas_renamed', handleCanvasRenamed);
    };
  }, [boardId, persistBoard]);

  return {
    boardData,
    isLoading,
    flushSave,
    selectedElementId,
    setSelectedElementId,
    selectedElementIds,
    setSelectedElementIds,
    handleSelectElement,
    clearSelection,
    deleteSelectedElements,
    editingElementId,
    setEditingElementId,
    viewport,
    setViewport,
    viewportRef,
    updateBoardName,
    updateElement,
    deleteElement,
    createNote,
    createText,
    createAudio,
    createImage,
    createCanvasPreview,
    createConnectedElement,
    connectionsHook,
    audioModalOpen,
    setAudioModalOpen,
    imageModalOpen,
    setImageModalOpen,
    canvasModalOpen,
    setCanvasModalOpen,
    modalPlacementPos,
  };
}
