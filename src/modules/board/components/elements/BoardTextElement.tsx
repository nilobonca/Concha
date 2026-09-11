import React, { useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition, TextData } from '../../types';
import { ElementHandles } from './ElementHandles';
import { Trash2, Bold, Type } from 'lucide-react';
import clsx from 'clsx';

interface BoardTextElementProps {
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

const FONT_SIZES = [14, 18, 24, 32];

export const BoardTextElement: React.FC<BoardTextElementProps> = ({
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
  const isLight = canvasTheme === 'light';
  const data = (element.data || {}) as TextData;

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

  const bindResize = useGesture({
    onDrag: ({ delta: [dx, dy], event }) => {
      event.stopPropagation();
      const newWidth = Math.max(120, element.width + dx / zoom);
      const newHeight = Math.max(40, element.height + dy / zoom);
      onUpdate({ width: newWidth, height: newHeight });
    },
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

      {/* Floating Toolbar when selected */}
      {isSelected && (
        <div
          className="absolute -top-9 left-0 flex items-center gap-1 bg-white/95 dark:bg-neutral-900/90 border border-stone-200/90 dark:border-neutral-700/80 rounded-lg px-2 py-1 shadow-lg z-50 backdrop-blur-sm text-stone-700 dark:text-neutral-200"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Tamanho da Fonte */}
          <div className="flex items-center gap-1 border-r border-stone-200 dark:border-neutral-700 pr-1">
            <Type className="w-3 h-3 text-stone-400 dark:text-neutral-400" />
            <select
              value={data.fontSize || 18}
              onChange={(e) => {
                onUpdate({
                  data: { ...data, fontSize: Number(e.target.value) }
                });
              }}
              className="bg-transparent text-stone-800 dark:text-neutral-200 text-xs outline-none cursor-pointer"
            >
              {FONT_SIZES.map(s => (
                <option key={s} value={s} className="bg-white text-stone-900 dark:bg-neutral-900 dark:text-white">
                  {s}px
                </option>
              ))}
            </select>
          </div>

          {/* Negrito */}
          <button
            onClick={() => {
              onUpdate({
                data: { ...data, isBold: !data.isBold }
              });
            }}
            className={clsx(
              "p-1 rounded text-xs transition-colors cursor-pointer",
              data.isBold ? "bg-[#1831D7] text-white" : "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white"
            )}
            title="Negrito"
          >
            <Bold className="w-3 h-3" />
          </button>

          {/* Excluir */}
          <button
            onClick={() => onDelete()}
            className="p-1 text-stone-400 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 rounded transition-colors ml-1 cursor-pointer"
            title="Excluir"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Caixa do Texto */}
      <div
        {...bindDrag()}
        className={clsx(
          "w-full h-full p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 flex flex-col justify-center border",
          isSelected
            ? "border-[#1831D7]/60 bg-[#1831D7]/5 ring-1 ring-[#1831D7]/40"
            : isHovered
            ? (isLight ? "border-stone-300 bg-stone-100/70" : "border-neutral-700/80 bg-neutral-800/20")
            : "border-transparent bg-transparent"
        )}
      >
        <textarea
          value={data.text || ''}
          placeholder="Digite seu texto..."
          onChange={(e) => {
            onUpdate({
              data: { ...data, text: e.target.value }
            });
          }}
          onKeyDownCapture={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full h-full bg-transparent resize-none outline-none leading-normal placeholder-stone-400 dark:placeholder-neutral-500"
          style={{
            fontSize: `${data.fontSize || 18}px`,
            fontWeight: data.isBold ? 'bold' : 'normal',
            color: data.color && data.color !== '#f8fafc' && data.color !== '#0f172a'
              ? data.color
              : (isLight ? '#0f172a' : '#f8fafc'),
            textAlign: data.align || 'left',
          }}
        />

        {isSelected && (
          <div
            {...bindResize()}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center text-[#7F95FF]"
          >
            <svg className="w-2 h-2" viewBox="0 0 6 6" fill="currentColor">
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
