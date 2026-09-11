import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useBoardCanvas } from '../hooks/useBoardCanvas';
import { BoardElement, HandlePosition, BoardElementType } from '../types';
import { useIDB } from '@/utils/indexedDB';
import { Layer } from '@/interfaces/utils/indexedDB';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { BoardHeader } from './BoardHeader';
import { BoardToolbar } from './BoardToolbar';
import { BoardCanvasContainer } from './BoardCanvasContainer';
import { BoardArrowLayer } from './BoardArrowLayer';
import { BoardDropContextMenu } from './BoardDropContextMenu';
import { BoardNoteElement } from './elements/BoardNoteElement';
import { BoardTextElement } from './elements/BoardTextElement';
import { BoardAudioElement } from './elements/BoardAudioElement';
import { BoardImageElement } from './elements/BoardImageElement';
import { BoardCanvasPreviewElement } from './elements/BoardCanvasPreviewElement';
import { SelectAudioModal } from './modals/SelectAudioModal';
import { SelectImageModal } from './modals/SelectImageModal';
import { SelectCanvasModal } from './modals/SelectCanvasModal';
import { BoardVaultSearchModal } from './modals/BoardVaultSearchModal';
import ContextMenu from '@/components/ContextMenu';
import { StickyNote, Type, Music, Image as ImageIcon, FolderKanban, Search } from 'lucide-react';
import { cleanLegacyPlaceholder, cleanDuplicateTitle } from '@/utils/cleanLegacyPlaceholder';

interface BoardViewProps {
  boardId: string;
  isEmbeddedInVault?: boolean;
  onCloseEmbedded?: () => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  boardId,
  isEmbeddedInVault,
  onCloseEmbedded,
}) => {
  const { activeLayers, updateLayer, addLayer } = useIDB();
  const currentLayer = activeLayers.find(l => l.id === boardId);
  const folderPath = currentLayer?.folderPath;

  const {
    boardData,
    isLoading,
    selectedElementId,
    setSelectedElementId,
    selectedElementIds,
    handleSelectElement,
    clearSelection,
    viewport,
    setViewport,
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
    editingElementId,
    setEditingElementId,
  } = useBoardCanvas(boardId, currentLayer?.name);

  // Sincronizar nome caso a camada seja alterada externamente (apenas após carregamento concluído)
  useEffect(() => {
    if (!isLoading && currentLayer?.name && currentLayer.name !== boardData.name) {
      updateBoardName(currentLayer.name);
    }
  }, [isLoading, currentLayer?.name, boardData.name, updateBoardName]);

  // Inicialização e conexão com o Vault correspondente ao quadro
  useEffect(() => {
    const initBoardVault = async () => {
      const targetVaultId = currentLayer?.vaultId;
      const vaultStore = useVaultStore.getState();

      if (!vaultStore.provider) {
        await vaultStore.initializeStorage();
      }

      if (targetVaultId && vaultStore.vaultId !== targetVaultId && vaultStore.storageType !== 'fsa') {
        await vaultStore.connectIDB(targetVaultId, currentLayer?.vaultName || undefined);
      }
    };
    initBoardVault();
  }, [currentLayer?.vaultId, currentLayer?.vaultName]);

  // Handler completo de renomeação disparado pelo BoardHeader
  const handleUpdateBoardName = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // 1. Atualiza dados internos do quadro e salva no IndexedDB
    updateBoardName(trimmed);

    // 2. Atualiza a camada (Layer) no IndexedDB para sincronizar com a árvore de arquivos, baú e dashboard
    if (currentLayer) {
      if (currentLayer.name !== trimmed) {
        updateLayer({ ...currentLayer, name: trimmed });
      }
    } else {
      const newLayer: Layer = {
        id: boardId,
        type: 'group',
        name: trimmed,
        visible: true,
        locked: false,
        parentId: null,
        depth: 0,
        isProject: false,
        isProjectMetadata: true,
        projectId: boardId,
        order: 0,
        canvasType: 'board',
        folderPath: null,
      };
      addLayer(newLayer);
    }

    // 3. Atualiza títulos das abas abertas no Vault Store e layout persistido
    useVaultStore.getState().updateCanvasTitleInTabs(boardId, trimmed);

    // 4. Dispara evento customizado para outros componentes ouvintes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas_renamed', {
        detail: { canvasId: boardId, newName: trimmed }
      }));
    }
  }, [boardId, currentLayer, updateBoardName, updateLayer, addLayer]);

  const { provider, getFileUrl } = useVaultStore();
  const [vaultSearchModalOpen, setVaultSearchModalOpen] = useState(false);
  const [draggingTool, setDraggingTool] = useState<BoardElementType | 'vault-search' | null>(null);
  const dropPlacementPosRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    x: number;
    y: number;
    worldPos: { x: number; y: number };
  } | null>(null);

  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('board_canvas_theme');
    if (saved === 'light' || saved === 'dark') {
      setCanvasTheme(saved);
    }
  }, []);

  const toggleCanvasTheme = () => {
    setCanvasTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('board_canvas_theme', next);
      }
      return next;
    });
  };

  // Shortcut Ctrl+K to open Vault Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setVaultSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDropTool = (toolType: BoardElementType | 'vault-search', worldPos: { x: number; y: number }) => {
    switch (toolType) {
      case 'note':
        createNote({ x: worldPos.x - 110, y: worldPos.y - 90 });
        break;
      case 'text':
        createText({ x: worldPos.x - 100, y: worldPos.y - 35 });
        break;
      case 'vault-search':
        dropPlacementPosRef.current = { x: worldPos.x - 130, y: worldPos.y - 75 };
        setVaultSearchModalOpen(true);
        break;
      case 'audio':
        dropPlacementPosRef.current = { x: worldPos.x - 140, y: worldPos.y - 60 };
        setAudioModalOpen(true);
        break;
      case 'image':
        dropPlacementPosRef.current = { x: worldPos.x - 130, y: worldPos.y - 100 };
        setImageModalOpen(true);
        break;
      case 'canvas-preview':
        dropPlacementPosRef.current = { x: worldPos.x - 130, y: worldPos.y - 75 };
        setCanvasModalOpen(true);
        break;
    }
  };

  const handleDropNote = async (note: { path: string; name: string }, worldPos: { x: number; y: number }) => {
    let noteContent = '';
    try {
      if (provider) {
        noteContent = await provider.readDocument(note.path);
      }
    } catch (err) {
      console.warn('Could not read dropped note content from vault:', err);
    }

    const cleanedContent = cleanDuplicateTitle(cleanLegacyPlaceholder(noteContent || ''), note.name);

    await createNote(
      worldPos,
      '#fef08a',
      note.name,
      cleanedContent,
      note.path
    );
  };

  const handleDropVaultMedia = async (media: { path: string; name: string; fileType: 'audio' | 'image' }, worldPos: { x: number; y: number }) => {
    try {
      const url = await getFileUrl(media.path);
      if (media.fileType === 'audio') {
        createAudio({
          name: media.name,
          url,
          volume: 1,
          loop: false,
          filePath: media.path,
        }, worldPos);
      } else if (media.fileType === 'image') {
        createImage({
          name: media.name,
          src: url,
          filePath: media.path,
        }, worldPos);
      }
    } catch (err) {
      console.error('Erro ao processar mídia do Vault no canvas:', err);
    }
  };

  const centerElement = (element: BoardElement) => {
    const containerW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const containerH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const elCenterX = element.x + element.width / 2;
    const elCenterY = element.y + element.height / 2;

    setViewport(prev => ({
      ...prev,
      x: containerW / 2 - elCenterX * prev.k,
      y: containerH / 2 - elCenterY * prev.k,
    }));
  };

  if (isLoading) {
    return (
      <div className={isEmbeddedInVault ? "w-full h-full bg-neutral-950 flex flex-col items-center justify-center gap-3 text-white" : "w-screen h-screen bg-neutral-950 flex flex-col items-center justify-center gap-3 text-white"}>
        <div className="w-8 h-8 rounded-full border-2 border-[#7F95FF] border-t-transparent animate-spin" />
        <p className="text-xs text-neutral-400 font-mono">Carregando Canvas de Conexões...</p>
      </div>
    );
  }

  return (
    <div 
      data-board-canvas="true"
      className={`board-container relative overflow-hidden font-sans transition-colors duration-200 ${
        canvasTheme === 'light' ? "bg-[#F8F9FA] text-stone-900" : "bg-neutral-950 text-white"
      } ${isEmbeddedInVault ? "w-full h-full" : "w-screen h-screen"}`}>
      {/* Barra Superior */}
      <BoardHeader
        boardName={boardData.name}
        onUpdateName={handleUpdateBoardName}
        elementsCount={boardData.elements.length}
        connectionsCount={boardData.connections.length}
        isEmbeddedInVault={isEmbeddedInVault}
        onCloseEmbedded={onCloseEmbedded}
        folderPath={folderPath}
        onMoveToGeneral={() => currentLayer && updateLayer({ ...currentLayer, folderPath: null })}
      />

      {/* Viewport Interativo com Pan & Zoom */}
      <BoardCanvasContainer
        viewport={viewport}
        setViewport={setViewport}
        canvasTheme={canvasTheme}
        onToggleTheme={toggleCanvasTheme}
        onPointerMoveOnCanvas={connectionsHook.updateArrowDrag}
        onPointerUpOnCanvas={connectionsHook.finishArrowDrag}
        onDropNote={handleDropNote}
        onDropVaultMedia={handleDropVaultMedia}
        onDropTool={handleDropTool}
        draggingTool={draggingTool}
        onCanvasContextMenu={(e, worldPos, screenPos) => {
          setCanvasContextMenu({ x: screenPos.x, y: screenPos.y, worldPos });
        }}
        onCanvasClick={() => {
          clearSelection();
          connectionsHook.setSelectedConnectionId(null);
          setCanvasContextMenu(null);
        }}
      >
        {/* Camada SVG de Conexões e Setas */}
        <BoardArrowLayer
          elements={boardData.elements}
          connections={boardData.connections}
          activeDrag={connectionsHook.activeDrag}
          selectedConnectionId={connectionsHook.selectedConnectionId}
          onSelectConnection={connectionsHook.setSelectedConnectionId}
          onDeleteConnection={connectionsHook.deleteConnection}
        />

        {/* Camada de Elementos do Board */}
        {boardData.elements.map((element) => {
          const isSelected = selectedElementIds.has(element.id);
          const snappedHandle =
            connectionsHook.activeDrag?.snappedTarget?.elementId === element.id
              ? connectionsHook.activeDrag.snappedTarget.handle
              : null;

          const commonProps = {
            key: element.id,
            element,
            isSelected,
            snappedHandle,
            zoom: viewport.k,
            canvasTheme,
            onSelect: (e?: React.MouseEvent | React.PointerEvent) => {
              handleSelectElement(element.id, e);
              connectionsHook.setSelectedConnectionId(null);
            },
            onUpdate: (updates: Partial<BoardElement>) => updateElement(element.id, updates),
            onDelete: () => deleteElement(element.id),
            onStartArrow: (handle: HandlePosition, e: React.PointerEvent) =>
              connectionsHook.startArrowDrag(element.id, handle, e),
            onCenterElement: () => centerElement(element),
          };

          switch (element.type) {
            case 'note':
              return (
                <BoardNoteElement
                  {...commonProps}
                  onSetEditing={(isEd) => setEditingElementId(isEd ? element.id : null)}
                />
              );
            case 'text':
              return <BoardTextElement {...commonProps} />;
            case 'audio':
              return <BoardAudioElement {...commonProps} />;
            case 'image':
              return <BoardImageElement {...commonProps} />;
            case 'canvas-preview':
              return <BoardCanvasPreviewElement {...commonProps} />;
            default:
              return null;
          }
        })}
      </BoardCanvasContainer>

      {/* Dock Inferior de Criação */}
      <BoardToolbar
        onAddNote={() => createNote()}
        onAddText={() => createText()}
        onOpenVaultSearch={() => setVaultSearchModalOpen(true)}
        onToolDragStart={setDraggingTool}
        onToolDragEnd={() => setDraggingTool(null)}
      />

      {/* Menu de Contexto ao Soltar Seta no Vazio */}
      {connectionsHook.pendingArrowContext && (
        <BoardDropContextMenu
          context={connectionsHook.pendingArrowContext}
          onSelectOption={(type, payload) => createConnectedElement(type, payload)}
          onOpenVaultSearchModal={() => setVaultSearchModalOpen(true)}
          onClose={connectionsHook.closePendingArrowContext}
        />
      )}

      {/* Modal Unificado de Busca do Vault */}
      <BoardVaultSearchModal
        isOpen={vaultSearchModalOpen}
        currentBoardId={boardId}
        onClose={() => {
          setVaultSearchModalOpen(false);
          dropPlacementPosRef.current = null;
        }}
        onSelectNote={async (note) => {
          let noteContent = '';
          try {
            if (provider) {
              noteContent = await provider.readDocument(note.path);
            }
          } catch (err) {
            console.warn('Could not read dropped note content from vault:', err);
          }

          const cleanedContent = cleanDuplicateTitle(cleanLegacyPlaceholder(noteContent), note.name);

          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('note', {
              color: '#fef08a',
              title: note.name,
              content: cleanedContent,
              filePath: note.path,
            });
          } else {
            createNote(
              dropPlacementPosRef.current || undefined,
              '#fef08a',
              note.name,
              cleanedContent,
              note.path
            );
            dropPlacementPosRef.current = null;
          }
        }}
        onSelectAudio={(audioData) => {
          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('audio', audioData);
          } else {
            createAudio(audioData, dropPlacementPosRef.current || undefined);
            dropPlacementPosRef.current = null;
          }
        }}
        onSelectImage={(imageData) => {
          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('image', imageData);
          } else {
            createImage(imageData, dropPlacementPosRef.current || undefined);
            dropPlacementPosRef.current = null;
          }
        }}
        onSelectCanvas={(previewData) => {
          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('canvas-preview', previewData);
          } else {
            createCanvasPreview(previewData, dropPlacementPosRef.current || undefined);
            dropPlacementPosRef.current = null;
          }
        }}
      />

      {/* Menu de Contexto do Canvas */}
      {canvasContextMenu && (
        <ContextMenu
          x={canvasContextMenu.x}
          y={canvasContextMenu.y}
          onClose={() => setCanvasContextMenu(null)}
          options={[
            {
              label: 'Adicionar Nota',
              icon: <StickyNote size={18} className="text-amber-500" />,
              onClick: () => {
                createNote({
                  x: canvasContextMenu.worldPos.x - 110,
                  y: canvasContextMenu.worldPos.y - 90,
                });
                setCanvasContextMenu(null);
              },
              subMenu: [
                {
                  label: 'Nota Cobalto',
                  icon: <span className="w-3.5 h-3.5 rounded-full bg-[#1831D7] border border-black/20" />,
                  onClick: () => {
                    createNote({ x: canvasContextMenu.worldPos.x - 110, y: canvasContextMenu.worldPos.y - 90 }, '#1831D7');
                    setCanvasContextMenu(null);
                  },
                },
                {
                  label: 'Nota Periwinkle',
                  icon: <span className="w-3.5 h-3.5 rounded-full bg-[#7F95FF] border border-black/20" />,
                  onClick: () => {
                    createNote({ x: canvasContextMenu.worldPos.x - 110, y: canvasContextMenu.worldPos.y - 90 }, '#7F95FF');
                    setCanvasContextMenu(null);
                  },
                },
                {
                  label: 'Nota Celeste',
                  icon: <span className="w-3.5 h-3.5 rounded-full bg-[#52B1FF] border border-black/20" />,
                  onClick: () => {
                    createNote({ x: canvasContextMenu.worldPos.x - 110, y: canvasContextMenu.worldPos.y - 90 }, '#52B1FF');
                    setCanvasContextMenu(null);
                  },
                },
                {
                  label: 'Nota Gelo',
                  icon: <span className="w-3.5 h-3.5 rounded-full bg-[#B4D3F1] border border-black/20" />,
                  onClick: () => {
                    createNote({ x: canvasContextMenu.worldPos.x - 110, y: canvasContextMenu.worldPos.y - 90 }, '#B4D3F1');
                    setCanvasContextMenu(null);
                  },
                },
                {
                  label: 'Nota Meia-Noite',
                  icon: <span className="w-3.5 h-3.5 rounded-full bg-[#17192A] border border-black/20" />,
                  onClick: () => {
                    createNote({ x: canvasContextMenu.worldPos.x - 110, y: canvasContextMenu.worldPos.y - 90 }, '#17192A');
                    setCanvasContextMenu(null);
                  },
                },
              ],
            },
            {
              label: 'Adicionar Texto',
              icon: <Type size={18} className="text-[#7F95FF]" />,
              onClick: () => {
                createText({
                  x: canvasContextMenu.worldPos.x - 100,
                  y: canvasContextMenu.worldPos.y - 35,
                });
                setCanvasContextMenu(null);
              },
            },
            {
              label: 'Buscar no Vault...',
              icon: <Search size={18} className="text-emerald-400" />,
              onClick: () => {
                dropPlacementPosRef.current = {
                  x: canvasContextMenu.worldPos.x - 130,
                  y: canvasContextMenu.worldPos.y - 75,
                };
                setVaultSearchModalOpen(true);
                setCanvasContextMenu(null);
              },
            },
            {
              label: 'Adicionar Áudio...',
              icon: <Music size={18} className="text-blue-400" />,
              onClick: () => {
                dropPlacementPosRef.current = {
                  x: canvasContextMenu.worldPos.x - 140,
                  y: canvasContextMenu.worldPos.y - 60,
                };
                setAudioModalOpen(true);
                setCanvasContextMenu(null);
              },
            },
            {
              label: 'Adicionar Imagem...',
              icon: <ImageIcon size={18} className="text-rose-400" />,
              onClick: () => {
                dropPlacementPosRef.current = {
                  x: canvasContextMenu.worldPos.x - 130,
                  y: canvasContextMenu.worldPos.y - 100,
                };
                setImageModalOpen(true);
                setCanvasContextMenu(null);
              },
            },
            {
              label: 'Adicionar Quadro de Conexões...',
              icon: <FolderKanban size={18} className="text-amber-400" />,
              onClick: () => {
                dropPlacementPosRef.current = {
                  x: canvasContextMenu.worldPos.x - 130,
                  y: canvasContextMenu.worldPos.y - 75,
                };
                setCanvasModalOpen(true);
                setCanvasContextMenu(null);
              },
            },
          ]}
        />
      )}

      {/* Modais de Seleção */}
      <SelectAudioModal
        isOpen={audioModalOpen}
        onClose={() => {
          setAudioModalOpen(false);
          dropPlacementPosRef.current = null;
        }}
        onSelect={(audioData) => {
          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('audio', audioData);
          } else {
            createAudio(audioData, dropPlacementPosRef.current || undefined);
            dropPlacementPosRef.current = null;
          }
        }}
      />

      <SelectImageModal
        isOpen={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          dropPlacementPosRef.current = null;
        }}
        onSelect={(imageData) => {
          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('image', imageData);
          } else {
            createImage(imageData, dropPlacementPosRef.current || undefined);
            dropPlacementPosRef.current = null;
          }
        }}
      />

      <SelectCanvasModal
        isOpen={canvasModalOpen}
        currentBoardId={boardId}
        onClose={() => {
          setCanvasModalOpen(false);
          dropPlacementPosRef.current = null;
        }}
        onSelect={(previewData) => {
          if (connectionsHook.pendingArrowContext) {
            createConnectedElement('canvas-preview', previewData);
          } else {
            createCanvasPreview(previewData, dropPlacementPosRef.current || undefined);
            dropPlacementPosRef.current = null;
          }
        }}
      />
    </div>
  );
};
