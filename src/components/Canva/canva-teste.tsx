import React, { useState, useRef, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Minus, Plus, RotateCcw, Grip, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import clsx from 'clsx';

/**
 * Configurações do Canvas
 */
// Retiramos a exportação da constante fixa, agora é dinâmico
const MIN_CANVAS_SIZE = 3000; // Tamanho mínimo
const MINIMAP_SIZE = 180;
const MAX_SCALE = 4;

// Contexto para compartilhar o estado do Canvas (Zoom/Pan) com os filhos
interface CanvasContextType {
  transform: { x: number; y: number; k: number };
  centerOn: (worldX: number, worldY: number) => void;
}
export const CanvasContext = createContext<CanvasContextType>({ 
  transform: { x: 0, y: 0, k: 1 },
  centerOn: () => {}
});
export const useCanvas = () => useContext(CanvasContext);

interface CanvasContainerProps {
  children: ReactNode;
  items?: Array<{ id: string; type?: string; position?: { x: number; y: number }; points?: Array<{ x: number; y: number }>; width?: number; height?: number; color?: string }>;
  onDropItem?: (item: { id: string | number; path?: string; name?: string; [key: string]: any }, type: string, x: number, y: number) => void;
  onDropFile?: (files: FileList, x: number, y: number) => void;
  onCanvasRightClick?: (e: React.MouseEvent, worldX: number, worldY: number) => void;
  onSelectionChange?: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  onCanvasClick?: (e: React.MouseEvent, worldX: number, worldY: number) => void;
  onCanvasMouseMove?: (e: React.MouseEvent, worldX: number, worldY: number) => void;
  isSelectionEnabled?: boolean;
}

export interface CanvasContainerHandle {
  centerOn: (x: number, y: number) => void;
  getTransform: () => { x: number; y: number; k: number };
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
}

const CanvasContainer = React.forwardRef<CanvasContainerHandle, CanvasContainerProps>(
  ({ children, items = [], onDropItem, onDropFile, onCanvasRightClick, onSelectionChange, onCanvasClick, onCanvasMouseMove, isSelectionEnabled = true }, ref) => {
  
  const { theme } = useThemeStore();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const isEthereal = false;

  const [canvasTheme, setCanvasTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const saved = localStorage.getItem('audio_canvas_theme');
    if (saved === 'light' || saved === 'dark') {
      setCanvasTheme(saved);
    }
  }, []);

  const toggleCanvasTheme = () => {
    setCanvasTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('audio_canvas_theme', next);
      return next;
    });
  };

  // Estado do Viewport (Posição X, Y e Zoom)
  const [transform, setTransform] = useState({ x: -500, y: -500, k: 1 });

  // Estados de Dragging
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingMinimap, setIsDraggingMinimap] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Refs para manipulação direta e cálculos
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const minimapDragStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef<{ x: number, y: number } | null>(null);

  // Helper: Clamping (Limitar valor entre min e max)
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  // --- Dynamic Size Calculation (Monotonic Session Growth) ---
  const [dynamicCanvasSize, setDynamicCanvasSize] = useState(MIN_CANVAS_SIZE);

    // Create a hash of all item positions and sizes to ONLY recalculate canvas size when items are dragged/resized
  const itemsPositionHash = React.useMemo(() => {
    return items.map(i => {
      if (i.position) return `${i.id}:${i.position.x},${i.position.y},${i.width},${i.height}`;
      if (i.points) return `${i.id}:` + i.points.map((p: any) => `${p.x},${p.y}`).join(';');
      return i.id;
    }).join('|');
  }, [items]);

  useEffect(() => {
    const calculateRequiredSize = () => {
      let maxX = 0;
      let maxY = 0;

      items.forEach(item => {
        if (item.position) {
          maxX = Math.max(maxX, item.position.x + (item.width || 100)); // Add basic buffer/width
          maxY = Math.max(maxY, item.position.y + (item.height || 100));
        } else if (item.points) {
          item.points.forEach(p => {
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        }
      });

      const maxDim = Math.max(maxX, maxY);
      const rawSize = Math.max(MIN_CANVAS_SIZE, maxDim + 1000);

      // Round up to nearest 100
      return Math.ceil(rawSize / 100) * 100;
    };

    const neededSize = calculateRequiredSize();

    // Only update if the required size is strictly greater than the current size
    // Checking this OUTSIDE of setState prevents flooding React's update queue
    if (neededSize > dynamicCanvasSize) {
      setDynamicCanvasSize(neededSize);
    }

  }, [itemsPositionHash, dynamicCanvasSize]); // Omit items to prevent re-running on color/metadata changes

  /**
   * Função Mágica Atualizada: Restrição de Bordas E Zoom
   */
  const constrainBounds = useCallback((targetX: number, targetY: number, targetK: number) => {
    if (!containerRef.current) return { x: targetX, y: targetY, k: targetK };

    // We need to fetch current dynamic size inside callback or pass it?
    // Since enable dependency on items for recalculation might be heavy, 
    // let's assume we can use the latest dynamicCanvasSize in render cycle if available via ref or closure if deps updated.
    // Adding dynamicCanvasSize to deps.
    const currentSize = dynamicCanvasSize;

    const { width: viewW, height: viewH } = containerRef.current.getBoundingClientRect();

    const minScaleW = viewW / currentSize;
    const minScaleH = viewH / currentSize;
    const dynamicMinScale = Math.max(minScaleW, minScaleH);

    const constrainedK = Math.max(dynamicMinScale, Math.min(targetK, MAX_SCALE));

    const contentSize = currentSize * constrainedK;

    let fixedX = targetX;
    let fixedY = targetY;

    // Calculate slack (space remaining)
    const diffW = viewW - contentSize;
    const diffH = viewH - contentSize;

    // X Axis Clamping - Bias Top/Left (Stable Origin)
    if (diffW < 0) {
      // Content larger than view: standard pan clamping
      fixedX = clamp(targetX, diffW, 0);
    } else {
      // Content smaller than view: allow panning within slack, but don't force center
      // Range: [0 ... diffW] (or [0 ... 0] if we want strict TL lock)
      // Allowing [0, diffW] lets user pan slightly if they want, but default is stable.
      fixedX = clamp(targetX, 0, diffW);
    }

    // Y Axis Clamping
    if (diffH < 0) {
      fixedY = clamp(targetY, diffH, 0);
    } else {
      fixedY = clamp(targetY, 0, diffH);
    }

    return { x: fixedX, y: fixedY, k: constrainedK };
  }, [dynamicCanvasSize]);

  const centerOn = useCallback((worldX: number, worldY: number) => {
    if (!containerRef.current) return;
    const { width: viewW, height: viewH } = containerRef.current.getBoundingClientRect();
    const targetX = viewW / 2 - worldX * transform.k;
    const targetY = viewH / 2 - worldY * transform.k;
    setTransform(constrainBounds(targetX, targetY, transform.k));
  }, [transform.k, constrainBounds]);

  React.useImperativeHandle(ref, () => ({
    centerOn,
    getTransform: () => transform,
    screenToWorld: (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: screenX, y: screenY };
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = screenX - rect.left;
      const mouseY = screenY - rect.top;
      return {
        x: (mouseX - transform.x) / transform.k,
        y: (mouseY - transform.y) / transform.k,
      };
    }
  }), [centerOn, transform]);

  // Handle Context Menu (Right Click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onCanvasRightClick && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - transform.x) / transform.k;
      const worldY = (mouseY - transform.y) / transform.k;
      onCanvasRightClick(e, worldX, worldY);
    }
  };

  /**
   * 1. Lógica de PANNING DO CANVAS (Arrastar o fundo)
   */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;

    // Only allow panning if Space is pressed
    if (!isSpacePressed) return;

    setIsDraggingCanvas(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };

  /**
   * 1.5 Selection Logic
   */
  const handleContainerMouseUp = (e: React.MouseEvent) => {
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx <= 5 && dy <= 5 && !isDraggingCanvas && !isSpacePressed && e.button === 0) {
        if (onCanvasClick && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const worldX = (mouseX - transform.x) / transform.k;
          const worldY = (mouseY - transform.y) / transform.k;
          onCanvasClick(e, worldX, worldY);
        }
      }
      mouseDownPos.current = null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    // If clicking on an item (no-drag class) or space is pressed, don't start selection
    if ((e.target as HTMLElement).closest('.no-drag') || isSpacePressed || (e.button !== 0)) {
      handleCanvasMouseDown(e);
      return;
    }

    // Start selection box
    if (!isSelectionEnabled) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  /**
   * 2. Lógica de ZOOM (Roda do Mouse)
   */
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.minimap-container')) return;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;

    const newScaleCandidate = Math.max(0.1, transform.k + delta);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - transform.x) / transform.k;
      const worldY = (mouseY - transform.y) / transform.k;

      const rawX = mouseX - worldX * newScaleCandidate;
      const rawY = mouseY - worldY * newScaleCandidate;

      setTransform(constrainBounds(rawX, rawY, newScaleCandidate));
    }
  };

  /**
   * 3. Lógica do MINIMAP INTERATIVO
   */
  const minimapRatio = MINIMAP_SIZE / dynamicCanvasSize;

  const handleMinimapMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingMinimap(true);
    minimapDragStart.current = { x: e.clientX, y: e.clientY };
  };

  /**
   * 4. Drop Logic
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const containerX = clientX - rect.left;
      const containerY = clientY - rect.top;

      // WorldX = (ContainerX - TranslateX) / Scale
      const worldX = (containerX - transform.x) / transform.k;
      const worldY = (containerY - transform.y) / transform.k;

      // Handle File Drop from OS
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (onDropFile) {
          onDropFile(e.dataTransfer.files, worldX, worldY);
        }
        return;
      }

      // Handle Vault Note Drop from sidebar / file list
      const rawVaultNote = e.dataTransfer.getData('application/rpgsa-vault-note');
      if (rawVaultNote) {
        try {
          const noteData = JSON.parse(rawVaultNote);
          if (onDropItem) {
            onDropItem({ id: noteData.path, path: noteData.path, name: noteData.name }, 'vault-note', worldX, worldY);
          }
          return;
        } catch (err) {
          console.error('Failed to parse vault note:', err);
        }
      }

      // Handle Vault Audio Drop
      const rawVaultAudio = e.dataTransfer.getData('application/rpgsa-vault-audio');
      if (rawVaultAudio) {
        try {
          const audioData = JSON.parse(rawVaultAudio);
          if (onDropItem) {
            onDropItem({ id: audioData.path, path: audioData.path, name: audioData.name }, 'vault-audio', worldX, worldY);
          }
          return;
        } catch (err) {
          console.error('Failed to parse vault audio:', err);
        }
      }

      // Handle Vault Image Drop
      const rawVaultImage = e.dataTransfer.getData('application/rpgsa-vault-image');
      if (rawVaultImage) {
        try {
          const imageData = JSON.parse(rawVaultImage);
          if (onDropItem) {
            onDropItem({ id: imageData.path, path: imageData.path, name: imageData.name }, 'vault-image', worldX, worldY);
          }
          return;
        } catch (err) {
          console.error('Failed to parse vault image:', err);
        }
      }

      // Handle Internal Item Drop
      if (!onDropItem) return;

      const itemId = e.dataTransfer.getData('itemId');
      const itemType = e.dataTransfer.getData('itemType');

      onDropItem({ id: itemId }, itemType, worldX, worldY);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Efeito global de movimento
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDraggingCanvas) {
        e.preventDefault();
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        dragStart.current = { x: e.clientX, y: e.clientY };

        setTransform((prev) => {
          const rawX = prev.x + dx;
          const rawY = prev.y + dy;
          return constrainBounds(rawX, rawY, prev.k);
        });
      }

      if (isDraggingMinimap) {
        e.preventDefault();
        const dx = e.clientX - minimapDragStart.current.x;
        const dy = e.clientY - minimapDragStart.current.y;
        minimapDragStart.current = { x: e.clientX, y: e.clientY };

        setTransform((prev) => {
          const rawX = prev.x - (dx / minimapRatio) * prev.k;
          const rawY = prev.y - (dy / minimapRatio) * prev.k;
          return constrainBounds(rawX, rawY, prev.k);
        });
      }

      if (selectionBox && containerRef.current) {
        setSelectionBox(prev => prev ? { ...prev, currentX: e.clientX - containerRef.current!.getBoundingClientRect().left, currentY: e.clientY - containerRef.current!.getBoundingClientRect().top } : null);
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (selectionBox) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const left = Math.min(selectionBox.startX, selectionBox.currentX);
          const top = Math.min(selectionBox.startY, selectionBox.currentY);
          const width = Math.abs(selectionBox.currentX - selectionBox.startX);
          const height = Math.abs(selectionBox.currentY - selectionBox.startY);

          if (width > 5 && height > 5) {
            if (onSelectionChange) onSelectionChange({ x: left, y: top, width, height });
          } else {
            if (onSelectionChange) onSelectionChange(null); // Clicked without dragging much -> Deselect
          }
        }
      }

      setIsDraggingCanvas(false);
      setIsDraggingMinimap(false);
      setSelectionBox(null);
      document.body.style.cursor = 'default';
    };

    const handleResize = () => {
      setTransform(prev => constrainBounds(prev.x, prev.y, prev.k));
    };

    if (isDraggingCanvas || isDraggingMinimap || selectionBox) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDraggingCanvas, isDraggingMinimap, minimapRatio, constrainBounds, selectionBox, onSelectionChange]);

  // --- Mobile Touch Gestures: Pinch-to-Zoom, 1-Finger Pan & Double-Tap ---
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
      // 2 fingers: Pinch-to-Zoom + 2-Finger Pan
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

      // 1 finger: Canvas Pan & Double-Tap detector
      if (e.touches.length === 1) {
        const target = e.target as HTMLElement;
        if (target.closest('.no-drag') || target.closest('.minimap-container')) {
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

          setTransform(prev => {
            const nextK = Math.max(0.15, Math.min(prev.k * zoomRatio, MAX_SCALE));
            const worldX = (focalX - prev.x) / prev.k;
            const worldY = (focalY - prev.y) / prev.k;
            const dx = currentCenter.x - lastCenter.x;
            const dy = currentCenter.y - lastCenter.y;
            const nextX = focalX - worldX * nextK + dx;
            const nextY = focalY - worldY * nextK + dy;
            return constrainBounds(nextX, nextY, nextK);
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

        setTransform(prev => constrainBounds(prev.x + dx, prev.y + dy, prev.k));
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

          // Tap gesture
          if (duration < 320 && distMoved < 15) {
            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime;
            const distFromLastTap = Math.hypot(
              lastSingleTouch.x - lastTapPos.x,
              lastSingleTouch.y - lastTapPos.y
            );

            if (timeSinceLastTap > 50 && timeSinceLastTap < 380 && distFromLastTap < 40) {
              // --- Double Tap Action: Zoom In 2x / Reset ---
              e.preventDefault();
              const rect = container.getBoundingClientRect();
              const tapX = lastSingleTouch.x - rect.left;
              const tapY = lastSingleTouch.y - rect.top;

              setTransform(prev => {
                const targetK = prev.k > 1.25 ? 1 : Math.min(prev.k * 2, MAX_SCALE);
                const worldX = (tapX - prev.x) / prev.k;
                const worldY = (tapY - prev.y) / prev.k;
                const nextX = tapX - worldX * targetK;
                const nextY = tapY - worldY * targetK;
                return constrainBounds(nextX, nextY, targetK);
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
  }, [constrainBounds]);

  // Space Key Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
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

  // Helpers UI
  const zoomCenter = (factor: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = transform.k * factor;
    const worldX = (centerX - transform.x) / transform.k;
    const worldY = (centerY - transform.y) / transform.k;

    const rawX = centerX - worldX * newScale;
    const rawY = centerY - worldY * newScale;

    setTransform(constrainBounds(rawX, rawY, newScale));
  };

  // Minimap Rect Calculation
  const getViewRect = () => {
    if (!containerRef.current) return { x: 0, y: 0, w: 0, h: 0 };
    const { width, height } = containerRef.current.getBoundingClientRect();

    return {
      x: (-transform.x / transform.k) * minimapRatio,
      y: (-transform.y / transform.k) * minimapRatio,
      w: (width / transform.k) * minimapRatio,
      h: (height / transform.k) * minimapRatio
    };
  };
  const viewRect = getViewRect();

  // Inicialização
  useEffect(() => {
    setTransform(prev => {
      const next = constrainBounds(prev.x, prev.y, prev.k);
      if (prev.x === next.x && prev.y === next.y && prev.k === next.k) return prev;
      return next;
    });
  }, [constrainBounds]);

  return (
    <CanvasContext.Provider value={{ transform, centerOn }}>
      <div className={clsx("flex flex-col h-full w-full overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-500", isEthereal ? "bg-transparent text-white" : (canvasTheme === 'light' ? "bg-[#F8F9FA] text-stone-900" : "bg-neutral-950 text-white"))}>

        {/* Área Principal */}
        <div
          ref={containerRef}
          className={clsx("relative flex-1 overflow-hidden transition-colors duration-500 touch-none", isEthereal ? "bg-transparent" : (canvasTheme === 'light' ? "bg-[#F3F4F6]" : "bg-neutral-900"))}
          onMouseDown={handleMouseDown}
          onMouseUp={handleContainerMouseUp}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          onMouseMove={(e) => {
            if (onCanvasMouseMove && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              const worldX = (mouseX - transform.x) / transform.k;
              const worldY = (mouseY - transform.y) / transform.k;
              onCanvasMouseMove(e, worldX, worldY);
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ touchAction: 'none', cursor: isSpacePressed ? (isDraggingCanvas ? 'grabbing' : 'grab') : 'default' }}
        >

          {/* --- MUNDO (Conteúdo com Transform) --- */}
          <div
            className="origin-top-left will-change-transform"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
              width: dynamicCanvasSize,
              height: dynamicCanvasSize,
            }}
          >
            {/* Grid Infinito - Adaptive Density */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                // Calculate size so it stays roughly constant in screen space
                // 40 / k means: 40px screen distance / scale factor = world distance
                backgroundImage: `radial-gradient(#404040 ${1 / transform.k}px, transparent ${1 / transform.k}px)`,
                backgroundSize: `${40 / transform.k}px ${40 / transform.k}px`,
                opacity: 0.5
              }}
            />

            {/* Limites do Mundo */}
            <div className="absolute inset-0 border-2 border-blue-500/50 shadow-[inset_0_0_40px_rgba(59,130,246,0.2)] pointer-events-none">
              <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-mono border border-blue-500/30">0,0</div>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-mono border border-blue-500/30">{dynamicCanvasSize},{dynamicCanvasSize}</div>
            </div>

            {/* --- SEUS ELEMENTOS AQUI --- */}
            {children}

            {/* Removed Indicator Elements (Corners and Center) */}

          </div>

          {/* Minimap - Hidden on mobile */}
          <div
            className={clsx("minimap-container hidden md:block absolute bottom-16 right-6 border shadow-2xl rounded-lg overflow-hidden z-50 select-none no-drag group transition-colors duration-500 animate-in fade-in zoom-in-95", isEthereal ? "bg-black/40 backdrop-blur-md border-white/10" : "bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border-gray-200/50 dark:border-white/10")}
            style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
          >
            <div className="relative w-full h-full bg-neutral-800/50">

              <div className="absolute bg-blue-500/30 rounded-full" style={{ top: '50%', left: '50%', width: 4, height: 4, transform: 'translate(-50%, -50%)' }} />

              {/* Itens do Minimapa */}
              {items.map((item) => {
                // Determine item properties based on type
                let color = 'bg-green-500'; // Default (Player/Image)
                let opacity = 0.8;
                let finalWidth = 200 * minimapRatio;
                let finalHeight = 100 * minimapRatio;

                if (item.type === 'note') {
                  color = 'bg-yellow-400';
                  opacity = 0.9;
                  if (item.width && item.height) {
                    finalWidth = item.width * minimapRatio;
                    finalHeight = item.height * minimapRatio;
                  }
                } else if (item.type === 'soundboard') {
                  color = 'bg-[#1831D7]'; // Soundboard Item
                  finalWidth = 64 * minimapRatio; // Assuming standard button size
                  finalHeight = 64 * minimapRatio;
                } else if (item.type === 'pin') {
                  color = 'bg-red-500';
                  finalWidth = 40 * minimapRatio;
                  finalHeight = 40 * minimapRatio;
                }

                // Handle items with position (players, images, notes, soundboard, pins)
                if (item.position) {
                  return (
                    <div
                      key={item.id}
                      className={`absolute ${color} rounded-sm`}
                      style={{
                        left: item.position.x * minimapRatio,
                        top: item.position.y * minimapRatio,
                        width: finalWidth,
                        height: finalHeight,
                        opacity: opacity
                      }}
                    />
                  );
                }
                // Handle items with points (areas)
                if (item.points && item.points.length > 0) {
                  const minX = Math.min(...item.points.map((p: { x: number; y: number }) => p.x));
                  const minY = Math.min(...item.points.map((p: { x: number; y: number }) => p.y));
                  const maxX = Math.max(...item.points.map((p: { x: number; y: number }) => p.x));
                  const maxY = Math.max(...item.points.map((p: { x: number; y: number }) => p.y));
                  return (
                    <div
                      key={item.id}
                      className="absolute bg-blue-500 rounded-sm"
                      style={{
                        left: minX * minimapRatio,
                        top: minY * minimapRatio,
                        width: (maxX - minX) * minimapRatio,
                        height: (maxY - minY) * minimapRatio,
                        opacity: 0.6
                      }}
                    />
                  );
                }
                return null;
              })}

              <div
                className={`absolute border-2 border-blue-500 bg-blue-500/10 transition-colors ${isDraggingMinimap ? 'cursor-grabbing bg-blue-500/20' : 'cursor-grab hover:bg-blue-500/20'}`}
                onMouseDown={handleMinimapMouseDown}
                style={{
                  left: viewRect.x,
                  top: viewRect.y,
                  width: viewRect.w,
                  height: viewRect.h,
                  maxWidth: MINIMAP_SIZE,
                  maxHeight: MINIMAP_SIZE,
                }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Grip size={12} />
                </div>
              </div>
            </div>



          </div>
          {/* Size Indicator */}
          {/* Canvas Controls Container */}
          <div className="absolute select-none no-drag group z-[60] bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 flex flex-col items-end gap-2">

            {/* Size Indicator */}
            <div className="flex items-center gap-2 px-2 py-1 bg-white/90 dark:bg-neutral-800 rounded-lg border border-stone-200/90 dark:border-neutral-700/50 shadow-lg text-xs text-stone-600 dark:text-neutral-400 font-mono select-none backdrop-blur-sm">
              <span className="text-stone-400 dark:text-neutral-500 font-bold">TAMANHO</span>
              <span className="text-stone-800 dark:text-neutral-200">{dynamicCanvasSize} <span className="text-stone-400 dark:text-neutral-600">x</span> {dynamicCanvasSize}</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-between gap-0.5 bg-white/90 dark:bg-neutral-800 p-1 rounded-lg border border-stone-200/90 dark:border-neutral-700/50 shadow-lg w-[180px]">
              <button onClick={() => zoomCenter(0.8)} className="p-1 hover:bg-stone-100 dark:hover:bg-neutral-700 active:bg-stone-200 dark:active:bg-neutral-600 rounded transition text-stone-600 dark:text-neutral-300 hover:text-stone-900 dark:hover:text-white touch-manipulation flex-shrink-0" aria-label="Zoom Out">
                <Minus size={16} />
              </button>
              <div className="flex items-center justify-center gap-0.5 flex-1 min-w-0">
                <input
                  type="number"
                  value={Math.round(transform.k * 100)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      const newK = Math.max(0.1, Math.min(5, val / 100)); // Clamp between 10% and 500%
                      setTransform(prev => ({ ...prev, k: newK }));
                    }
                  }}
                  className="text-xs font-mono w-8 text-center text-stone-800 dark:text-neutral-200 bg-transparent border-none outline-none focus:text-stone-950 dark:focus:text-white appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none -moz-appearance-textfield p-0 font-medium"
                />
                <span className="text-stone-400 dark:text-neutral-400 select-none text-xs">%</span>
              </div>
              <button onClick={() => zoomCenter(1.2)} className="p-1 hover:bg-stone-100 dark:hover:bg-neutral-700 active:bg-stone-200 dark:active:bg-neutral-600 rounded transition text-stone-600 dark:text-neutral-300 hover:text-stone-900 dark:hover:text-white touch-manipulation flex-shrink-0" aria-label="Zoom In">
                <Plus size={16} />
              </button>
              <div className="w-px h-3 bg-stone-200 dark:bg-neutral-700 mx-0.5"></div>
              <button onClick={() => {
                const rect = containerRef.current?.getBoundingClientRect();
                // Reset para o zoom minimo possivel (Fit Screen)
                const minW = rect ? rect.width / dynamicCanvasSize : 1;
                setTransform(constrainBounds(0, 0, minW));
              }} className="p-1 hover:bg-stone-100 dark:hover:bg-neutral-700 active:bg-stone-200 dark:active:bg-neutral-600 rounded transition text-stone-600 dark:text-neutral-300 hover:text-stone-900 dark:hover:text-white touch-manipulation flex-shrink-0" title="Fit Screen" aria-label="Reset Zoom">
                <RotateCcw size={16} />
              </button>
              <div className="w-px h-3 bg-stone-200 dark:bg-neutral-700 mx-0.5"></div>
              <button
                onClick={toggleCanvasTheme}
                className="p-1 hover:bg-stone-100 dark:hover:bg-neutral-700 active:bg-stone-200 dark:active:bg-neutral-600 rounded transition text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white touch-manipulation flex-shrink-0 cursor-pointer"
                title={canvasTheme === 'light' ? "Mudar para fundo escuro" : "Mudar para fundo claro"}
              >
                {canvasTheme === 'light' ? <Moon size={15} className="text-[#1831D7]" /> : <Sun size={15} className="text-amber-500" />}
              </button>
            </div>
          </div>

          {/* Space Panning Overlay */}
          {isSpacePressed && (
            <div
              className="absolute inset-0 z-[100] cursor-grab active:cursor-grabbing"
              onMouseDown={handleCanvasMouseDown}
            />
          )}

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-[100]"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.currentX),
                top: Math.min(selectionBox.startY, selectionBox.currentY),
                width: Math.abs(selectionBox.currentX - selectionBox.startX),
                height: Math.abs(selectionBox.currentY - selectionBox.startY),
              }}
            />
          )}
        </div>
      </div>
    </CanvasContext.Provider>
  );
});

CanvasContainer.displayName = 'CanvasContainer';
export default CanvasContainer;
