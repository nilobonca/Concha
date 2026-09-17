import React, { useState, useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition } from '../../types';
import { ElementHandles } from './ElementHandles';
import { BoardNoteTitle } from './BoardNoteTitle';
import { BoardNoteActions } from './BoardNoteActions';
import clsx from 'clsx';

/**
 * Converte uma cor hex para HSL e retorna uma versão pastel
 * (alta luminosidade ~92%, saturação moderada ~55%).
 */
export function hexToPastelBg(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#F4F0E6';
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const pastelS = 55;
  const pastelL = 92;

  return `hsl(${h}, ${pastelS}%, ${pastelL}%)`;
}

export const NOTE_THEMES: Record<string, { border: string; bg: string; name: string }> = {
  // Vermelhos
  vermelho: { border: '#E53935', bg: hexToPastelBg('#E53935'), name: 'Vermelho' },
  coral: { border: '#FF6B6B', bg: hexToPastelBg('#FF6B6B'), name: 'Coral' },
  // Laranjas
  laranja: { border: '#FB8C00', bg: hexToPastelBg('#FB8C00'), name: 'Laranja' },
  tangerina: { border: '#FF9F43', bg: hexToPastelBg('#FF9F43'), name: 'Tangerina' },
  // Amarelos
  amarelo: { border: '#FDD835', bg: hexToPastelBg('#FDD835'), name: 'Amarelo' },
  ambar: { border: '#FFCA28', bg: hexToPastelBg('#FFCA28'), name: 'Âmbar' },
  // Verdes
  verde: { border: '#43A047', bg: hexToPastelBg('#43A047'), name: 'Verde' },
  esmeralda: { border: '#2ECC71', bg: hexToPastelBg('#2ECC71'), name: 'Esmeralda' },
  menta: { border: '#26DE81', bg: hexToPastelBg('#26DE81'), name: 'Menta' },
  // Cianos
  ciano: { border: '#00BCD4', bg: hexToPastelBg('#00BCD4'), name: 'Ciano' },
  turquesa: { border: '#00ACC1', bg: hexToPastelBg('#00ACC1'), name: 'Turquesa' },
  // Azuis
  cobalt: { border: '#1831D7', bg: hexToPastelBg('#1831D7'), name: 'Cobalto' },
  periwinkle: { border: '#7F95FF', bg: hexToPastelBg('#7F95FF'), name: 'Periwinkle' },
  cyan: { border: '#52B1FF', bg: hexToPastelBg('#52B1FF'), name: 'Celeste' },
  royal: { border: '#1E88E5', bg: hexToPastelBg('#1E88E5'), name: 'Azul Royal' },
  // Roxos
  roxo: { border: '#8E24AA', bg: hexToPastelBg('#8E24AA'), name: 'Roxo' },
  lavanda: { border: '#AB47BC', bg: hexToPastelBg('#AB47BC'), name: 'Lavanda' },
  violeta: { border: '#7C4DFF', bg: hexToPastelBg('#7C4DFF'), name: 'Violeta' },
  // Rosas
  rosa: { border: '#EC407A', bg: hexToPastelBg('#EC407A'), name: 'Rosa' },
  fucsia: { border: '#E040FB', bg: hexToPastelBg('#E040FB'), name: 'Fúcsia' },
  rosegold: { border: '#F48FB1', bg: hexToPastelBg('#F48FB1'), name: 'Rose Gold' },
  // Neutros e Especiais
  grafite: { border: '#455A64', bg: hexToPastelBg('#455A64'), name: 'Grafite' },
  marfim: { border: '#F4F0E6', bg: '#FDFCF8', name: 'Marfim' },
  midnight: { border: '#17192A', bg: hexToPastelBg('#17192A'), name: 'Midnight' },
};

export function getNoteTheme(color?: string) {
  if (!color) return NOTE_THEMES.cobalt;
  const lower = color.toLowerCase();

  // Procura correspondência direta por border color
  for (const key of Object.keys(NOTE_THEMES)) {
    const t = NOTE_THEMES[key];
    if (t.border.toLowerCase() === lower || key === lower) {
      return t;
    }
  }

  // Para qualquer cor hex arbitrária, gera tema com fundo pastel
  if (lower.startsWith('#') && (lower.length === 7 || lower.length === 4)) {
    return { border: color, bg: hexToPastelBg(color), name: 'Personalizada' };
  }

  return NOTE_THEMES.cobalt;
}

export interface BoardBaseNoteElementProps {
  element: BoardElement;
  isSelected: boolean;
  snappedHandle?: HandlePosition | null;
  zoom: number;
  canvasTheme?: 'dark' | 'light';
  color?: string;
  title: string;
  minWidth?: number;
  minHeight?: number;
  isEditing?: boolean;
  onSelect: (e?: React.MouseEvent | React.PointerEvent) => void;
  onUpdate: (updates: Partial<BoardElement>) => void;
  onDelete: () => void;
  onStartArrow: (handle: HandlePosition, e: React.PointerEvent) => void;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateColor?: (newColor: string) => void;
  onToggleEdit?: () => void;
  onCenterElement?: () => void;
  onOpenInVault?: () => void;
  onDragStart?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  showActions?: boolean;
  cardClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export const BoardBaseNoteElement: React.FC<BoardBaseNoteElementProps> = ({
  element,
  isSelected,
  snappedHandle,
  zoom,
  canvasTheme = 'dark',
  color,
  title,
  minWidth = 160,
  minHeight = 120,
  isEditing = false,
  onSelect,
  onUpdate,
  onDelete,
  onStartArrow,
  onUpdateTitle,
  onUpdateColor,
  onToggleEdit,
  onCenterElement,
  onOpenInVault,
  onDragStart,
  containerRef,
  onPointerDown,
  onClick,
  onDoubleClick,
  showActions = true,
  cardClassName,
  contentClassName,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);
  const targetRef = containerRef || internalRef;

  const theme = getNoteTheme(color || (element.data as { color?: string })?.color);

  // Arraste do elemento no Canvas
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
        filterTaps: false,
      },
    }
  );

  // Redimensionamento interativo suave e preciso nas 8 alças (cantos e bordas)
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
        newW = Math.max(minWidth, startW + dx);
      }
      if (direction.includes('s')) {
        newH = Math.max(minHeight, startH + dy);
      }
      if (direction.includes('w')) {
        const proposedW = startW - dx;
        if (proposedW >= minWidth) {
          newW = proposedW;
          newX = startX + dx;
        } else {
          newW = minWidth;
          newX = startX + (startW - minWidth);
        }
      }
      if (direction.includes('n')) {
        const proposedH = startH - dy;
        if (proposedH >= minHeight) {
          newH = proposedH;
          newY = startY + dy;
        } else {
          newH = minHeight;
          newY = startY + (startH - minHeight);
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
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <div
      ref={targetRef}
      tabIndex={-1}
      data-board-element="true"
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: isSelected ? 50 : element.zIndex,
      }}
      className="group select-none outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={(e) => {
        targetRef.current?.focus({ preventScroll: true });
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        targetRef.current?.focus({ preventScroll: true });
        onSelect(e);
        onClick?.(e);
      }}
      onDoubleClick={(e) => {
        onDoubleClick?.(e);
      }}
      onKeyDownCapture={(e) => {
        const targetTag = (e.target as HTMLElement)?.tagName;
        if (targetTag === 'TEXTAREA' || targetTag === 'INPUT') {
          return;
        }
        if (isEditing) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }
      }}
      onKeyDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }
      }}
    >
      {/* 1. Alças Centrais de Conexão de Setas */}
      <ElementHandles
        isVisible={isHovered || isSelected}
        snappedHandle={snappedHandle}
        onStartArrow={onStartArrow}
      />

      {/* 2. Zonas Invisíveis de Redimensionamento nos 4 Cantos */}
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

      {/* Zonas de Redimensionamento nas 4 Bordas */}
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

      {/* Título da Nota / Elemento */}
      <BoardNoteTitle
        title={title}
        onUpdateTitle={onUpdateTitle}
      />

      {/* Barra de Ações Flutuante */}
      {showActions && (
        <BoardNoteActions
          isSelected={isSelected}
          isHovered={isHovered}
          isEditing={isEditing}
          themeBorder={theme.border}
          themes={NOTE_THEMES}
          content={(element.data as { content?: string })?.content}
          onToggleEdit={onToggleEdit || (() => {})}
          onUpdateColor={
            onUpdateColor ||
            ((newColor) =>
              onUpdate({
                data: {
                  ...((element.data || {}) as Record<string, unknown>),
                  color: newColor,
                },
              }))
          }
          onCenterElement={onCenterElement}
          onDelete={onDelete}
          onOpenInVault={onOpenInVault}
        />
      )}

      {/* Cartão Delimitador Principal da Nota */}
      <div
        {...bindDrag()}
        onDoubleClick={(e) => {
          onDoubleClick?.(e);
        }}
        className={clsx(
          "w-full h-full rounded-2xl border-[3px] shadow-sm flex flex-col overflow-hidden relative cursor-grab active:cursor-grabbing transition-all duration-150",
          isSelected ? "shadow-lg shadow-black/10 ring-2 ring-[#7F95FF]/40" : "",
          cardClassName
        )}
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
        }}
      >
        <div className={clsx("w-full h-full flex flex-col min-h-0 relative rounded-2xl overflow-hidden", contentClassName)}>
          {children}
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
