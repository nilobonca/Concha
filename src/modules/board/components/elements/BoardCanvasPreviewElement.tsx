import React, { useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition, CanvasPreviewData } from '../../types';
import { ElementHandles } from './ElementHandles';
import { ExternalLink, Trash2, FolderKanban, Music, GripHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface BoardCanvasPreviewElementProps {
  element: BoardElement;
  isSelected: boolean;
  snappedHandle?: HandlePosition | null;
  zoom: number;
  canvasTheme?: 'dark' | 'light';
  onSelect: (e?: React.MouseEvent | React.PointerEvent) => void;
  onUpdate: (updates: Partial<BoardElement>) => void;
  onDelete: () => void;
  onStartArrow: (handle: HandlePosition, e: React.PointerEvent) => void;
  onDragStart?: () => void;
}

export const BoardCanvasPreviewElement: React.FC<BoardCanvasPreviewElementProps> = ({
  element,
  isSelected,
  snappedHandle,
  zoom,
  canvasTheme = 'dark',
  onSelect,
  onUpdate,
  onDelete,
  onStartArrow,
  onDragStart,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const data = (element.data || {}) as CanvasPreviewData;

  const isAudioType = data.targetType === 'audio';

  const handleOpenCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data.targetProjectId) return;

    const url = isAudioType ? `/project/${data.targetProjectId}` : `/board/${data.targetProjectId}`;
    window.open(url, '_blank');
  };

  const bindDrag = useGesture({
    onDrag: ({ offset: [ox, oy], event }) => {
      event.stopPropagation();
      onUpdate({
        x: ox / zoom,
        y: oy / zoom,
      });
    },
    onDragStart: ({ event }) => {
      event.stopPropagation();
      onSelect(event as any);
      onDragStart?.();
    },
  }, {
    drag: {
      from: () => [element.x * zoom, element.y * zoom],
      filterTaps: true,
    }
  });

  return (
    <div
      data-board-element="true"
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: isSelected ? 50 : element.zIndex,
      }}
      className="group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
    >
      <ElementHandles
        isVisible={isHovered || isSelected}
        snappedHandle={snappedHandle}
        onStartArrow={onStartArrow}
      />

      <div
        className={clsx(
          "w-full h-full rounded-2xl bg-white dark:bg-neutral-900/95 border backdrop-blur-md shadow-xl flex flex-col justify-between p-3.5 transition-all duration-200",
          isSelected
            ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/10"
            : "border-stone-200/90 dark:border-neutral-800 hover:border-emerald-400 dark:hover:border-neutral-700"
        )}
      >
        {/* Header / Drag */}
        <div
          {...bindDrag()}
          className="flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-stone-200/90 dark:border-neutral-800/80 pb-2"
        >
          <div className="flex items-center gap-1.5">
            <GripHorizontal className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500" />
            <span
              className={clsx(
                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1",
                isAudioType
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-500 dark:text-blue-400"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {isAudioType ? <Music className="w-2.5 h-2.5" /> : <FolderKanban className="w-2.5 h-2.5" />}
              {isAudioType ? "Canvas de Áudio" : "Canvas de Conexões"}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-stone-100 dark:hover:bg-neutral-800 text-stone-400 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Informações do Canvas Referenciado */}
        <div className="py-2">
          <h4 className="text-sm font-bold text-stone-900 dark:text-neutral-100 truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors">
            {data.targetName || 'Canvas Sem Título'}
          </h4>
          <p className="text-[11px] text-stone-500 dark:text-neutral-400 font-mono truncate mt-0.5">
            ID: {data.targetProjectId ? `${data.targetProjectId.slice(0, 8)}...` : 'N/A'}
          </p>
        </div>

        {/* Botão de Ação: Abrir Canvas */}
        <button
          onClick={handleOpenCanvas}
          className="w-full py-1.5 px-3 bg-stone-100 hover:bg-emerald-600 hover:text-white text-stone-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-emerald-600 dark:hover:text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-stone-200/90 dark:border-neutral-700/60 shadow-xs cursor-pointer"
          title="Abrir este canvas em nova aba"
        >
          <span>Abrir Canvas</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
