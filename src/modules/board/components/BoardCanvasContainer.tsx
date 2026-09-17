import React, { useRef, useEffect, useState, useCallback, ReactNode } from 'react';
import { ViewportTransform, BoardElementType } from '../types';
import { BoardGhostPreview } from './BoardGhostPreview';
import { BoardSelectionMarquee, MarqueeBox } from './BoardSelectionMarquee';
import { Minus, Plus, RotateCcw, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';

interface BoardCanvasContainerProps {
  children: ReactNode;
  viewport: ViewportTransform;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  canvasTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onPointerMoveOnCanvas?: (worldPos: { x: number; y: number }) => void;
  onPointerUpOnCanvas?: (worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
  onCanvasClick?: (e: React.MouseEvent) => void;
  onSelectionBoxStart?: (isShift: boolean) => void;
  onSelectionBoxChange?: (box: MarqueeBox | null, isShift: boolean) => void;
  onSelectionBoxEnd?: (box: MarqueeBox, isShift: boolean) => void;
  onDropNote?: (note: { path: string; name: string }, worldPos: { x: number; y: number }) => void;
  onDropVaultMedia?: (media: { path: string; name: string; fileType: 'audio' | 'image' }, worldPos: { x: number; y: number }) => void;
  onDropDatabase?: (database: { path: string; name: string }, worldPos: { x: number; y: number }) => void;
  onDropTool?: (toolType: BoardElementType | 'vault-search', worldPos: { x: number; y: number }) => void;
  draggingTool?: BoardElementType | 'vault-search' | null;
  onCanvasContextMenu?: (e: React.MouseEvent, worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
}

export const BoardCanvasContainer: React.FC<BoardCanvasContainerProps> = ({
  children,
  viewport,
  setViewport,
  canvasTheme = 'dark',
  onToggleTheme,
  onPointerMoveOnCanvas,
  onPointerUpOnCanvas,
  onCanvasClick,
  onSelectionBoxStart,
  onSelectionBoxChange,
  onSelectionBoxEnd,
  onDropNote,
  onDropVaultMedia,
  onDropDatabase,
  onDropTool,
  draggingTool,
  onCanvasContextMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragWorldPos, setDragWorldPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingVaultNote, setIsDraggingVaultNote] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; vpX: number; vpY: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isSpacePressedRef = useRef(false);
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const marqueeStartRef = useRef<{
    clientX: number;
    clientY: number;
    worldPos: { x: number; y: number };
    isShift: boolean;
  } | null>(null);
  const hasJustSelectedMarqueeRef = useRef(false);

  // Conversão de coordenadas tela -> mundo
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    return {
      x: (screenX - rect.left - viewport.x) / viewport.k,
      y: (screenY - rect.top - viewport.y) / viewport.k,
    };
  }, [viewport]);

  // Eventos de Zoom (Wheel / Pinch)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Zoom focalizado na posição do mouse
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        setViewport(prev => {
          const newK = Math.min(Math.max(0.2, prev.k * zoomFactor), 3);
          const newX = mouseScreenX - (mouseScreenX - prev.x) * (newK / prev.k);
          const newY = mouseScreenY - (mouseScreenY - prev.y) * (newK / prev.k);
          return { x: newX, y: newY, k: newK };
        });
      } else {
        const target = e.target as HTMLElement;
        const isScrollableContent = target && target.closest('.prevent-canvas-pan, .custom-scrollbar, [data-scrollable="true"]');
        if (isScrollableContent) {
          // Permite rolagem nativa de elementos internos como tabelas de bancos de dados
          return;
        }

        e.preventDefault();
        // Pan comum com scroll
        setViewport(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setViewport]);

  // Mobile Touch Gestures (Pinch-to-zoom, 1-finger pan & Double-tap)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mode: 'none' | 'pan' | 'pinch' = 'none';
    let lastDist = 0;
    let lastCenter = { x: 0, y: 0 };
    let lastSingleTouch = { x: 0, y: 0 };
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        mode = 'pinch';
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        lastDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        lastCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        return;
      }

      if (e.touches.length === 1) {
        const target = e.target as HTMLElement;
        const isBg = target === container || target.classList.contains('canvas-background');
        if (!isBg) {
          mode = 'none';
          return;
        }

        mode = 'pan';
        const t = e.touches[0];
        lastSingleTouch = { x: t.clientX, y: t.clientY };
        touchStartPos = { x: t.clientX, y: t.clientY };
        touchStartTime = Date.now();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (mode === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const currentCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };

        if (lastDist > 0) {
          const zoomRatio = dist / lastDist;
          const rect = container.getBoundingClientRect();
          const focalX = currentCenter.x - rect.left;
          const focalY = currentCenter.y - rect.top;

          setViewport(prev => {
            const nextK = Math.min(Math.max(0.2, prev.k * zoomRatio), 3);
            const worldX = (focalX - prev.x) / prev.k;
            const worldY = (focalY - prev.y) / prev.k;
            const dx = currentCenter.x - lastCenter.x;
            const dy = currentCenter.y - lastCenter.y;
            const nextX = focalX - worldX * nextK + dx;
            const nextY = focalY - worldY * nextK + dy;
            return { x: nextX, y: nextY, k: nextK };
          });
        }

        lastDist = dist;
        lastCenter = currentCenter;
      } else if (mode === 'pan' && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - lastSingleTouch.x;
        const dy = t.clientY - lastSingleTouch.y;
        lastSingleTouch = { x: t.clientX, y: t.clientY };

        setViewport(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (mode === 'pinch' && e.touches.length === 1) {
        mode = 'pan';
        const t = e.touches[0];
        lastSingleTouch = { x: t.clientX, y: t.clientY };
        return;
      }

      if (e.touches.length === 0) {
        if (mode === 'pan') {
          const duration = Date.now() - touchStartTime;
          const distMoved = Math.hypot(
            lastSingleTouch.x - touchStartPos.x,
            lastSingleTouch.y - touchStartPos.y
          );

          if (duration < 320 && distMoved < 15) {
            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime;
            const distFromLastTap = Math.hypot(
              lastSingleTouch.x - lastTapPos.x,
              lastSingleTouch.y - lastTapPos.y
            );

            if (timeSinceLastTap > 50 && timeSinceLastTap < 380 && distFromLastTap < 40) {
              e.preventDefault();
              const rect = container.getBoundingClientRect();
              const tapX = lastSingleTouch.x - rect.left;
              const tapY = lastSingleTouch.y - rect.top;

              setViewport(prev => {
                const targetK = prev.k > 1.25 ? 1 : Math.min(prev.k * 2, 3);
                const worldX = (tapX - prev.x) / prev.k;
                const worldY = (tapY - prev.y) / prev.k;
                const nextX = tapX - worldX * targetK;
                const nextY = tapY - worldY * targetK;
                return { x: nextX, y: nextY, k: targetK };
              });

              lastTapTime = 0;
            } else {
              lastTapTime = now;
              lastTapPos = { ...lastSingleTouch };
            }
          }
        }
        mode = 'none';
        lastDist = 0;
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [setViewport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (e.code === 'Space' && tag !== 'input' && tag !== 'textarea') {
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Iniciar Pan (Espaço / Middle Click) ou Seleção em Área (Arraste no fundo vazio)
  const handlePointerDown = (e: React.PointerEvent) => {
    containerRef.current?.focus({ preventScroll: true });
    const target = e.target as HTMLElement;

    // Detecta se o clique foi em um elemento interativo (cartão de nota/texto/áudio/imagem, botão, input, alça, etc.)
    const isInteractive = Boolean(
      target.closest('[data-board-element="true"]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.pointer-events-auto') ||
      target.closest('[data-no-canvas-marquee="true"]')
    );
    const isBackground = !isInteractive;

    // Pan via botão do meio ou barra de espaço pressionada
    if (e.button === 1 || isSpacePressedRef.current) {
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        vpX: viewport.x,
        vpY: viewport.y,
      };
      setIsPanning(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Seleção em área (Marquee) ao clicar e arrastar com botão esquerdo no fundo vazio
    if (isBackground && e.button === 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const isShift = Boolean(e.shiftKey || e.ctrlKey || e.metaKey);
      marqueeStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        worldPos,
        isShift,
      };
      onSelectionBoxStart?.(isShift);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStartRef.current) {
      const panStart = panStartRef.current;
      const dx = e.clientX - panStart.startX;
      const dy = e.clientY - panStart.startY;
      setViewport(prev => ({
        ...prev,
        x: panStart.vpX + dx,
        y: panStart.vpY + dy,
      }));
      return;
    }

    if (marqueeStartRef.current) {
      const marqueeStart = marqueeStartRef.current;
      const currentWorld = screenToWorld(e.clientX, e.clientY);
      const screenDist = Math.hypot(
        e.clientX - marqueeStart.clientX,
        e.clientY - marqueeStart.clientY
      );
      if (screenDist > 4) {
        const box: MarqueeBox = {
          minX: Math.min(marqueeStart.worldPos.x, currentWorld.x),
          minY: Math.min(marqueeStart.worldPos.y, currentWorld.y),
          maxX: Math.max(marqueeStart.worldPos.x, currentWorld.x),
          maxY: Math.max(marqueeStart.worldPos.y, currentWorld.y),
        };
        setMarqueeBox(box);
        onSelectionBoxChange?.(box, marqueeStart.isShift);
      }
      return;
    }

    if (onPointerMoveOnCanvas) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      onPointerMoveOnCanvas(worldPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }

    if (marqueeStartRef.current) {
      const currentWorld = screenToWorld(e.clientX, e.clientY);
      const screenDist = Math.hypot(
        e.clientX - marqueeStartRef.current.clientX,
        e.clientY - marqueeStartRef.current.clientY
      );
      if (screenDist > 4) {
        const box: MarqueeBox = {
          minX: Math.min(marqueeStartRef.current.worldPos.x, currentWorld.x),
          minY: Math.min(marqueeStartRef.current.worldPos.y, currentWorld.y),
          maxX: Math.max(marqueeStartRef.current.worldPos.x, currentWorld.x),
          maxY: Math.max(marqueeStartRef.current.worldPos.y, currentWorld.y),
        };
        hasJustSelectedMarqueeRef.current = true;
        onSelectionBoxEnd?.(box, marqueeStartRef.current.isShift);
        setTimeout(() => {
          hasJustSelectedMarqueeRef.current = false;
        }, 120);
      }
      marqueeStartRef.current = null;
      setMarqueeBox(null);
    }

    if (onPointerUpOnCanvas) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      onPointerUpOnCanvas(worldPos, { x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerCancel = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    if (marqueeStartRef.current) {
      marqueeStartRef.current = null;
      setMarqueeBox(null);
    }
  };

  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, k: Math.min(3, prev.k * 1.2) }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, k: Math.max(0.2, prev.k / 1.2) }));
  };

  const handleResetZoom = () => {
    setViewport({ x: 100, y: 100, k: 1 });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive =
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[data-no-canvas-context="true"]');

    if (!isInteractive) {
      e.preventDefault();
      e.stopPropagation();
      const worldPos = screenToWorld(e.clientX, e.clientY);
      onCanvasContextMenu?.(e, worldPos, { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={(e) => {
        if (hasJustSelectedMarqueeRef.current) {
          return;
        }
        onCanvasClick?.(e);
      }}
      onDragOver={(e) => {
        const hasVaultNote = e.dataTransfer.types.includes('application/rpgsa-vault-note');
        const hasVaultAudio = e.dataTransfer.types.includes('application/rpgsa-vault-audio');
        const hasVaultImage = e.dataTransfer.types.includes('application/rpgsa-vault-image');
        const hasVaultDatabase = e.dataTransfer.types.includes('application/rpgsa-vault-database');
        const hasBoardTool = e.dataTransfer.types.includes('application/rpgsa-board-tool');

        if (hasVaultNote || hasVaultAudio || hasVaultImage || hasVaultDatabase || hasBoardTool || draggingTool) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';

          if (hasVaultNote || hasVaultAudio || hasVaultImage || hasVaultDatabase) {
            setIsDraggingVaultNote(true);
          }

          const worldPos = screenToWorld(e.clientX, e.clientY);
          setDragWorldPos(worldPos);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setDragWorldPos(null);
          setIsDraggingVaultNote(false);
        }
      }}
      onDrop={(e) => {
        setDragWorldPos(null);
        setIsDraggingVaultNote(false);

        const rawNote = e.dataTransfer.getData('application/rpgsa-vault-note');
        if (rawNote && onDropNote) {
          try {
            const noteData = JSON.parse(rawNote);
            const worldPos = screenToWorld(e.clientX, e.clientY);
            onDropNote(noteData, worldPos);
          } catch (err) {
            console.error('Failed to parse dropped note data:', err);
          }
          return;
        }

        const rawAudio = e.dataTransfer.getData('application/rpgsa-vault-audio');
        if (rawAudio && onDropVaultMedia) {
          try {
            const audioData = JSON.parse(rawAudio);
            const worldPos = screenToWorld(e.clientX, e.clientY);
            onDropVaultMedia({ ...audioData, fileType: 'audio' }, worldPos);
          } catch (err) {
            console.error('Failed to parse dropped vault audio:', err);
          }
          return;
        }

        const rawImage = e.dataTransfer.getData('application/rpgsa-vault-image');
        if (rawImage && onDropVaultMedia) {
          try {
            const imageData = JSON.parse(rawImage);
            const worldPos = screenToWorld(e.clientX, e.clientY);
            onDropVaultMedia({ ...imageData, fileType: 'image' }, worldPos);
          } catch (err) {
            console.error('Failed to parse dropped vault image:', err);
          }
          return;
        }

        const rawDatabase = e.dataTransfer.getData('application/rpgsa-vault-database');
        if (rawDatabase && onDropDatabase) {
          try {
            const databaseData = JSON.parse(rawDatabase);
            const worldPos = screenToWorld(e.clientX, e.clientY);
            onDropDatabase(databaseData, worldPos);
          } catch (err) {
            console.error('Failed to parse dropped vault database:', err);
          }
          return;
        }

        const toolType = e.dataTransfer.getData('application/rpgsa-board-tool');
        if (toolType && onDropTool) {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          onDropTool(toolType as BoardElementType | 'vault-search', worldPos);
          return;
        }
      }}
      className={clsx(
        "relative w-full h-full overflow-hidden select-none touch-none transition-colors duration-200 outline-none",
        canvasTheme === 'light' ? "bg-[#F8F9FA]" : "bg-neutral-950",
        isPanning
          ? "cursor-grabbing"
          : isSpacePressed
            ? "cursor-grab"
            : marqueeBox
              ? "cursor-crosshair"
              : "cursor-default"
      )}
      style={{ touchAction: 'none' }}
    >
      {/* Grade de Pontos Infinita */}
      <div
        className="canvas-background absolute inset-0 pointer-events-none transition-opacity duration-200"
        style={{
          backgroundImage: canvasTheme === 'light'
            ? 'radial-gradient(circle, #94a3b8 1.1px, transparent 1.1px)'
            : 'radial-gradient(circle, #64748b 1px, transparent 1px)',
          backgroundSize: `${24 * viewport.k}px ${24 * viewport.k}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          opacity: canvasTheme === 'light' ? 0.35 : 0.25,
        }}
      />

      {/* Camada do Mundo Transformada */}
      <div
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.k})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {children}

        {/* Retângulo de Seleção em Área */}
        <BoardSelectionMarquee box={marqueeBox} />

        {/* Preview Fantasma do Elemento sendo arrastado */}
        {dragWorldPos && (draggingTool || isDraggingVaultNote) && (
          <BoardGhostPreview
            toolType={draggingTool || (isDraggingVaultNote ? 'note' : 'note')}
            worldPos={dragWorldPos}
          />
        )}
      </div>

      {/* Controles de Zoom e Tema Flutuantes no Canto Inferior Direito */}
      <div
        className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-white/90 dark:bg-[#14141C]/90 border border-stone-200/90 dark:border-white/10 rounded-2xl p-1.5 shadow-xl backdrop-blur-md z-40 text-stone-700 dark:text-neutral-200 transition-colors"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl text-stone-600 hover:text-stone-900 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
          title="Diminuir Zoom"
        >
          <Minus className="w-4 h-4" />
        </button>

        <span
          onClick={handleResetZoom}
          className="px-2 py-0.5 text-xs font-mono font-semibold text-stone-700 hover:text-stone-950 dark:text-neutral-200 dark:hover:text-white cursor-pointer select-none transition-colors"
          title="Clique para resetar"
        >
          {Math.round(viewport.k * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl text-stone-600 hover:text-stone-900 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
          title="Aumentar Zoom"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-stone-200 dark:bg-white/15 mx-0.5" />

        <button
          onClick={handleResetZoom}
          className="p-1.5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl text-stone-600 hover:text-stone-900 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
          title="Resetar Posição e Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {onToggleTheme && (
          <>
            <div className="w-[1px] h-4 bg-stone-200 dark:bg-white/15 mx-0.5" />
            <button
              onClick={onToggleTheme}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl text-stone-600 hover:text-stone-900 dark:text-neutral-300 dark:hover:text-white transition-colors cursor-pointer"
              title={canvasTheme === 'light' ? "Mudar para fundo escuro" : "Mudar para fundo claro"}
            >
              {canvasTheme === 'light' ? (
                <Moon className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
