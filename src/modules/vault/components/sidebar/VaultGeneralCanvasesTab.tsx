import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layer } from '@/interfaces/utils/indexedDB';
import { useIDB } from '@/utils/indexedDB';
import { useVaultStore, getCustomOrder, setCustomOrder } from '../../hooks/useVaultStore';
import { updateBoardNameInIDB } from '@/modules/board/hooks/useBoardStorage';
import ContextMenu from '@/components/ContextMenu';
import { DeleteConfirmModal } from '../DeleteConfirmModal';
import { PromptInputModal } from '../PromptInputModal';
import { 
  Box, 
  FolderKanban, 
  Music, 
  Search, 
  Edit2, 
  Trash2, 
  FolderInput,
  Sparkles
} from 'lucide-react';

export interface VaultGeneralCanvasesTabProps {
  allFolders: string[];
  onCreateBoardCanvas: (targetFolderPath?: string | null) => void;
  onCreateAudioCanvas: (targetFolderPath?: string | null) => void;
  selectedPath?: string | null;
  onSelectPath?: (path: string | null) => void;
}

export const VaultGeneralCanvasesTab: React.FC<VaultGeneralCanvasesTabProps> = ({
  allFolders,
  onCreateBoardCanvas,
  onCreateAudioCanvas,
  selectedPath,
  onSelectPath,
}) => {
  const router = useRouter();
  const { openCanvasTab, closeTab, vaultId } = useVaultStore();
  const { activeLayers, updateLayer, deleteLayer } = useIDB();

  const [searchQuery, setSearchQuery] = useState('');
  const [draggedCanvas, setDraggedCanvas] = useState<Layer | null>(null);
  const [isDragOverPanel, setIsDragOverPanel] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvas: Layer;
  } | null>(null);

  // Modals state
  const [deleteTarget, setDeleteTarget] = useState<Layer | null>(null);
  const [renameTarget, setRenameTarget] = useState<Layer | null>(null);

  // Filter general canvases belonging to active vault (where folderPath is null or empty)
  const isDefaultVault = vaultId === 'default-vault' || !vaultId;
  const allCanvases = useMemo(() => {
    return activeLayers.filter(l => {
      if (!l.isProjectMetadata) return false;
      if (l.vaultId) return l.vaultId === vaultId;
      return isDefaultVault;
    });
  }, [activeLayers, vaultId, isDefaultVault]);
  const generalCanvases = useMemo(() => allCanvases.filter(l => !l.folderPath), [allCanvases]);

  // Sort according to custom order in localStorage
  const sortedGeneralCanvases = useMemo(() => {
    const list = [...generalCanvases];
    const order = getCustomOrder()['__GENERAL_CANVASES__'] || [];

    list.sort((a, b) => {
      const idxA = order.indexOf(`canvas:${a.id}`);
      const idxB = order.indexOf(`canvas:${b.id}`);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(c => c.name.toLowerCase().includes(q));
  }, [generalCanvases, searchQuery]);

  // Reordering handler
  const handleReorder = useCallback((sourceCanvasId: string, targetCanvasId: string, position: 'before' | 'after') => {
    const currentOrder = getCustomOrder();
    const list = currentOrder['__GENERAL_CANVASES__'] 
      ? [...currentOrder['__GENERAL_CANVASES__']]
      : generalCanvases.map(c => `canvas:${c.id}`);

    const srcId = `canvas:${sourceCanvasId}`;
    const tgtId = `canvas:${targetCanvasId}`;

    const filtered = list.filter(id => id !== srcId);
    const targetIdx = filtered.indexOf(tgtId);

    if (targetIdx === -1) {
      filtered.push(srcId);
    } else {
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
      filtered.splice(insertAt, 0, srcId);
    }

    currentOrder['__GENERAL_CANVASES__'] = filtered;
    setCustomOrder(currentOrder);
  }, [generalCanvases]);

  // Global panel drag over & drop (for moving external canvas to General Box)
  const handlePanelDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/rpgsa-canvas') || draggedCanvas) {
      setIsDragOverPanel(true);
    }
  };

  const handlePanelDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverPanel(false);
  };

  const handlePanelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPanel(false);

    try {
      const canvasData = e.dataTransfer.getData('application/rpgsa-canvas');
      if (canvasData) {
        const parsed = JSON.parse(canvasData);
        const target = allCanvases.find(c => c.id === parsed.id);
        if (target && target.folderPath) {
          updateLayer({ ...target, folderPath: null });
        }
      } else if (draggedCanvas && draggedCanvas.folderPath) {
        updateLayer({ ...draggedCanvas, folderPath: null });
      }
    } catch (err) {
      console.error('Falha ao mover canvas para o Baú de Canvas:', err);
    }
    setDraggedCanvas(null);
  };

  const getContextMenuOptions = () => {
    if (!contextMenu) return [];
    const c = contextMenu.canvas;
    const isBoard = c.canvasType === 'board';

    return [
      {
        label: isBoard ? 'Abrir no Vault' : 'Abrir Canvas',
        icon: isBoard ? <FolderKanban size={16} className="text-[#1831D7] dark:text-[#7F95FF]" /> : <Music size={16} className="text-[#52B1FF]" />,
        onClick: () => {
          if (isBoard) {
            openCanvasTab(c.id, c.name);
          } else {
            router.push(`/project/${c.id}`);
          }
        }
      },
      {
        label: 'Mover para Pasta...',
        icon: <FolderInput size={16} className="text-[#7F95FF]" />,
        onClick: () => {},
        subMenu: [
          {
            label: 'Raiz do Vault',
            onClick: () => updateLayer({ ...c, folderPath: '' })
          },
          ...allFolders.map(folder => ({
            label: folder,
            onClick: () => updateLayer({ ...c, folderPath: folder })
          }))
        ]
      },
      {
        label: 'Renomear Canvas',
        icon: <Edit2 size={16} className="text-amber-500" />,
        onClick: () => {
          setRenameTarget(c);
        }
      },
      {
        label: 'Excluir Canvas',
        icon: <Trash2 size={16} className="text-red-500" />,
        onClick: () => {
          setDeleteTarget(c);
        }
      }
    ];
  };

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 bg-[#FAF9F6] dark:bg-[#111115] text-stone-900 dark:text-neutral-100 select-none overflow-hidden"
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
    >
      {/* Header do Baú de Canvas */}
      <div className="p-3 border-b border-stone-200/90 dark:border-white/10 flex flex-col gap-2.5 bg-white/70 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-stone-800 dark:text-stone-100">
                  Baú de Canvas
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/50 font-bold">
                  {generalCanvases.length}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Create Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCreateBoardCanvas(null)}
              className="p-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 hover:text-[#1831D7] dark:text-neutral-300 dark:hover:text-[#7F95FF] border border-stone-200/90 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
              title="Novo Quadro de Conexões no Baú"
            >
              <FolderKanban className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onCreateAudioCanvas(null)}
              className="p-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 hover:text-sky-600 dark:text-neutral-300 dark:hover:text-sky-300 border border-stone-200/90 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
              title="Novo Canvas de Áudio no Baú"
            >
              <Music className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Campo de Busca interno */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filtrar no Baú de Canvas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-white/5 border border-stone-200/90 dark:border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-stone-800 dark:text-neutral-200 placeholder-stone-400 dark:placeholder-neutral-500 outline-none focus:border-amber-400 dark:focus:border-amber-500/50 shadow-xs"
          />
        </div>
      </div>

      {/* Drag Over Banner (Feedback visual) */}
      {isDragOverPanel && (
        <div className="mx-2 my-2 py-2 px-3 rounded-xl border-2 border-dashed border-amber-400 dark:border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Solte para mover para o Baú de Canvas</span>
        </div>
      )}

      {/* Canvas List Area */}
      <div 
        className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1"
        onClick={() => {
          if (onSelectPath) onSelectPath(null);
        }}
      >
        {sortedGeneralCanvases.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-500">
              <Box className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700 dark:text-neutral-200">
                {searchQuery ? 'Nenhum canvas encontrado' : 'Nenhum canvas no Baú de Canvas'}
              </span>
              <p className="text-[11px] text-stone-400 dark:text-neutral-500 max-w-[200px] leading-relaxed">
                {searchQuery 
                  ? 'Tente buscar por outro termo ou limpe o filtro.' 
                  : 'Arraste quadros de pastas até aqui ou crie um novo abaixo.'}
              </p>
            </div>

            {!searchQuery && (
              <div className="flex flex-col gap-1.5 w-full mt-2 max-w-[220px]">
                <button
                  onClick={() => onCreateBoardCanvas(null)}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-[#1831D7]/10 hover:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] text-xs font-medium border border-[#7F95FF]/30 transition-colors cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Novo Quadro de Conexões</span>
                </button>
                <button
                  onClick={() => onCreateAudioCanvas(null)}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-medium border border-sky-200 dark:border-sky-800/40 transition-colors cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Novo Canvas de Áudio</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          sortedGeneralCanvases.map((canvas) => {
            const isBoard = canvas.canvasType === 'board';
            const itemId = `canvas:${canvas.id}`;
            const isSelected = selectedPath === itemId;
            const isDropBefore = dropTargetId === canvas.id && dropPosition === 'before';
            const isDropAfter = dropTargetId === canvas.id && dropPosition === 'after';

            return (
              <div
                key={canvas.id}
                tabIndex={0}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', itemId);
                  e.dataTransfer.setData('application/rpgsa-canvas', JSON.stringify({
                    id: canvas.id,
                    name: canvas.name,
                    canvasType: canvas.canvasType
                  }));
                  setDraggedCanvas(canvas);
                }}
                onDragEnd={() => {
                  setDraggedCanvas(null);
                  setDropTargetId(null);
                  setDropPosition(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mid = rect.top + rect.height / 2;
                  const pos = e.clientY < mid ? 'before' : 'after';
                  setDropTargetId(canvas.id);
                  setDropPosition(pos);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dropTargetId === canvas.id) {
                    setDropTargetId(null);
                    setDropPosition(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedCanvas && draggedCanvas.id !== canvas.id) {
                    handleReorder(draggedCanvas.id, canvas.id, dropPosition || 'after');
                  }
                  setDropTargetId(null);
                  setDropPosition(null);
                  setDraggedCanvas(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onSelectPath) onSelectPath(itemId);
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    canvas
                  });
                }}
                onClick={() => {
                  if (onSelectPath) onSelectPath(itemId);
                  if (isBoard) {
                    openCanvasTab(canvas.id, canvas.name);
                  } else {
                    router.push(`/project/${canvas.id}`);
                  }
                }}
                className={`group relative flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer transition-all outline-none border ${
                  isSelected
                    ? 'bg-amber-100/80 dark:bg-amber-500/15 border-amber-400/60 dark:border-amber-500/40 text-stone-900 dark:text-amber-200 font-medium shadow-xs ring-1 ring-amber-400/40'
                    : 'border-stone-200/60 dark:border-white/5 bg-white dark:bg-[#16161D] hover:border-amber-300 dark:hover:border-amber-500/30 hover:bg-stone-50/80 dark:hover:bg-white/[0.04] text-stone-700 dark:text-neutral-300'
                }`}
              >
                {/* Drop indicator lines */}
                {isDropBefore && (
                  <div className="absolute -top-1 left-1 right-1 h-0.5 bg-amber-500 rounded-full z-20 pointer-events-none shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                )}
                {isDropAfter && (
                  <div className="absolute -bottom-1 left-1 right-1 h-0.5 bg-amber-500 rounded-full z-20 pointer-events-none shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                )}

                <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isBoard
                      ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 border-[#7F95FF]/30 text-[#1831D7] dark:text-[#7F95FF]'
                      : 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40 text-sky-600 dark:text-sky-400'
                  }`}>
                    {isBoard ? <FolderKanban className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex flex-col min-w-0 truncate">
                    <span className="truncate text-xs font-semibold text-stone-800 dark:text-neutral-200 group-hover:text-stone-950 dark:group-hover:text-white">
                      {canvas.name}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-neutral-500 truncate">
                      {isBoard ? 'Quadro de Conexões' : 'Canvas de Áudio RPG'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                    isBoard
                      ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] border-[#7F95FF]/30'
                      : 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
                  }`}>
                    {isBoard ? 'Quadro' : 'Áudio'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={getContextMenuOptions()}
        />
      )}

      {/* Modal de Renomeação */}
      <PromptInputModal
        isOpen={renameTarget !== null}
        title="Renomear Canvas"
        description="Digite o novo nome para este canvas:"
        defaultValue={renameTarget?.name || ''}
        confirmText="Salvar"
        icon={<Edit2 className="w-5 h-5 text-amber-500" />}
        onClose={() => setRenameTarget(null)}
        onConfirm={async (newName) => {
          const trimmed = newName?.trim();
          if (renameTarget && trimmed && trimmed !== renameTarget.name) {
            updateLayer({ ...renameTarget, name: trimmed });
            useVaultStore.getState().updateCanvasTitleInTabs(renameTarget.id, trimmed);
            if (renameTarget.canvasType === 'board') {
              await updateBoardNameInIDB(renameTarget.id, trimmed);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('canvas_renamed', {
                detail: { canvasId: renameTarget.id, newName: trimmed }
              }));
            }
          }
          setRenameTarget(null);
        }}
      />

      {/* Modal de Exclusão */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        itemName={deleteTarget?.name || ''}
        itemType="canvas"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteLayer(deleteTarget.id);
            closeTab(`canvas:${deleteTarget.id}`);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
