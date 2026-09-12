import React, { useState, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition, DatabaseElementData } from '../../types';
import { ElementHandles } from './ElementHandles';
import { DatabaseContainer } from '@/modules/database/components/DatabaseContainer';
import { DatabaseInstance } from '@/modules/database/types';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { Database, ExternalLink, Trash2, GripHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface BoardDatabaseElementProps {
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

export const BoardDatabaseElement: React.FC<BoardDatabaseElementProps> = ({
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
  const data = (element.data || {}) as DatabaseElementData;
  const { openDocument } = useVaultStore();

  const handleOpenFullscreen = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (data.databasePath) {
        await openDocument(data.databasePath);
      }
    },
    [data.databasePath, openDocument]
  );

  // Arraste do elemento pelo cabeçalho no Canvas
  const bindDrag = useGesture(
    {
      onDrag: ({ offset: [ox, oy], event }) => {
        event.stopPropagation();
        onUpdate({
          x: ox / zoom,
          y: oy / zoom,
        });
      },
      onDragStart: ({ event }) => {
        event.stopPropagation();
        onSelect(event as unknown as React.MouseEvent);
        onDragStart?.();
      },
    },
    {
      drag: {
        from: () => [element.x * zoom, element.y * zoom],
        filterTaps: true,
      },
    }
  );

  // Redimensionamento suave nas 8 alças (cantos e bordas)
  const handleResizePointerDown = (
    direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's' | 'w' | 'n',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(e);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const startW = element.width;
    const startH = element.height;

    const MIN_W = 340;
    const MIN_H = 240;

    const handlePointerMove = (moveEv: PointerEvent) => {
      moveEv.stopPropagation();
      moveEv.preventDefault();

      const dx = (moveEv.clientX - startClientX) / zoom;
      const dy = (moveEv.clientY - startClientY) / zoom;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (direction.includes('e')) {
        newW = Math.max(MIN_W, startW + dx);
      }
      if (direction.includes('s')) {
        newH = Math.max(MIN_H, startH + dy);
      }
      if (direction.includes('w')) {
        const proposedW = startW - dx;
        if (proposedW >= MIN_W) {
          newW = proposedW;
          newX = startX + dx;
        } else {
          newW = MIN_W;
          newX = startX + (startW - MIN_W);
        }
      }
      if (direction.includes('n')) {
        const proposedH = startH - dy;
        if (proposedH >= MIN_H) {
          newH = proposedH;
          newY = startY + dy;
        } else {
          newH = MIN_H;
          newY = startY + (startH - MIN_H);
        }
      }

      onUpdate({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      upEv.stopPropagation();
      upEv.preventDefault();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleDatabaseSave = useCallback(
    (updatedDb: DatabaseInstance) => {
      if (updatedDb.title && updatedDb.title !== data.title) {
        onUpdate({
          data: {
            ...data,
            title: updatedDb.title,
            initialData: updatedDb,
          },
        });
      }
    },
    [data, onUpdate]
  );

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
      {/* 1. Alças Centrais de Conexão de Setas */}
      <ElementHandles
        isVisible={isHovered || isSelected}
        snappedHandle={snappedHandle}
        onStartArrow={onStartArrow}
      />

      {/* 2. Zonas Invisíveis de Redimensionamento dos 4 Cantos */}
      <div
        onPointerDown={(e) => handleResizePointerDown('nw', e)}
        className="absolute -top-2 -left-2 w-6 h-6 cursor-nwse-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('ne', e)}
        className="absolute -top-2 -right-2 w-6 h-6 cursor-nesw-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('sw', e)}
        className="absolute -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('se', e)}
        className="absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />

      {/* Zonas de Redimensionamento das 4 Bordas */}
      <div
        onPointerDown={(e) => handleResizePointerDown('e', e)}
        className="absolute top-4 bottom-4 -right-1 w-3 cursor-ew-resize z-30 pointer-events-auto"
        title="Redimensionar Largura"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('w', e)}
        className="absolute top-4 bottom-4 -left-1 w-3 cursor-ew-resize z-30 pointer-events-auto"
        title="Redimensionar Largura"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('s', e)}
        className="absolute left-4 right-4 -bottom-1 h-3 cursor-ns-resize z-30 pointer-events-auto"
        title="Redimensionar Altura"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('n', e)}
        className="absolute left-4 right-4 -top-1 h-3 cursor-ns-resize z-30 pointer-events-auto"
        title="Redimensionar Altura"
      />

      {/* 3. Cartão Principal do Elemento */}
      <div
        className={clsx(
          "w-full h-full rounded-2xl border backdrop-blur-md shadow-2xl flex flex-col overflow-hidden transition-all duration-150",
          isSelected
            ? "border-[#1831D7] dark:border-[#52B1FF] ring-2 ring-[#7F95FF]/40 shadow-blue-500/15"
            : "border-stone-200/90 dark:border-neutral-800/90 hover:border-[#1831D7]/60 dark:hover:border-neutral-700",
          canvasTheme === 'light' ? "bg-[#FAF9F6]/90" : "bg-[#11121C]/95"
        )}
      >
        {/* Barra Superior de Arrasto e Controles Rápidos */}
        <div
          {...bindDrag()}
          className="h-9 px-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-stone-200/80 dark:border-white/10 bg-stone-100/75 dark:bg-white/5 backdrop-blur-xs select-none shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 shrink-0" />
            <div className="w-4 h-4 rounded bg-[#1831D7]/10 dark:bg-[#52B1FF]/20 flex items-center justify-center text-[#1831D7] dark:text-[#52B1FF] shrink-0">
              <Database className="w-2.5 h-2.5" />
            </div>
            <span className="text-xs font-semibold text-stone-800 dark:text-[#F4F0E6] truncate max-w-[240px]">
              {data.title || 'Base de Dados'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/60 dark:bg-white/10 text-stone-500 dark:text-[#B4D3F1] shrink-0 font-medium">
              Database
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            {data.databasePath && (
              <button
                type="button"
                onClick={handleOpenFullscreen}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1] dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Abrir em aba cheia no Vault"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Excluir base de dados do canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Corpo: Visualização Completa da Base de Dados com Margem para as Linhas de Borda da Janela */}
        <div
          className="flex-1 w-full min-h-0 overflow-hidden relative prevent-canvas-pan p-3 sm:p-3.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-full h-full rounded-xl border border-stone-200/80 dark:border-white/10 overflow-hidden bg-[#FAF9F6] dark:bg-[#17192A] shadow-xs flex flex-col">
            <DatabaseContainer
              key={data.databasePath || element.id}
              databasePath={data.databasePath}
              initialData={data.initialData}
              onSave={handleDatabaseSave}
              isInline={true}
            />
          </div>
        </div>

        {/* Alça visual de canto para redimensionamento no canto inferior direito quando selecionado */}
        {isSelected && (
          <div
            onPointerDown={(e) => handleResizePointerDown('se', e)}
            className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-nwse-resize flex items-center justify-center text-stone-400 dark:text-neutral-500 hover:text-[#1831D7] dark:hover:text-[#52B1FF] z-30"
            title="Redimensionar"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 6 6" fill="currentColor">
              <circle cx="5" cy="5" r="1" />
              <circle cx="5" cy="2" r="1" />
              <circle cx="2" cy="5" r="1" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
