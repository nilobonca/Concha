/**
 * Supercanvas Database - Column Resize Hook
 * Smooth mouse drag handlers for resizing table header columns with min/max bounds.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseColumnResizeOptions {
  initialWidths?: Record<string, number>;
  minWidth?: number;
  maxWidth?: number;
  onColumnWidthChange?: (columnId: string, newWidth: number) => void;
  onResizeEnd?: (columnWidths: Record<string, number>) => void;
}

export interface UseColumnResizeReturn {
  columnWidths: Record<string, number>;
  isResizing: boolean;
  resizingColumnId: string | null;
  handleResizeStart: (columnId: string, currentWidth: number, e: React.MouseEvent) => void;
  getColumnWidth: (columnId: string, fallback?: number) => number;
  setColumnWidth: (columnId: string, width: number) => void;
}

export function useColumnResize(options: UseColumnResizeOptions = {}): UseColumnResizeReturn {
  const {
    initialWidths = {},
    minWidth = 70,
    maxWidth = 850,
    onColumnWidthChange,
    onResizeEnd,
  } = options;

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);

  // Sync external changes to initialWidths
  useEffect(() => {
    if (initialWidths && Object.keys(initialWidths).length > 0) {
      setColumnWidths((prev) => ({ ...prev, ...initialWidths }));
    }
  }, [initialWidths]);

  const widthsRef = useRef(columnWidths);
  widthsRef.current = columnWidths;

  const onColumnWidthChangeRef = useRef(onColumnWidthChange);
  onColumnWidthChangeRef.current = onColumnWidthChange;

  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;

  const handleResizeStart = useCallback(
    (columnId: string, currentWidth: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = currentWidth || widthsRef.current[columnId] || 160;

      setIsResizing(true);
      setResizingColumnId(columnId);

      // Disable text selection and apply col-resize cursor globally during drag
      const originalCursor = document.body.style.cursor;
      const originalUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      let lastWidth = startWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const boundedWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + deltaX)));
        lastWidth = boundedWidth;

        setColumnWidths((prev) => {
          const next = { ...prev, [columnId]: boundedWidth };
          widthsRef.current = next;
          return next;
        });

        onColumnWidthChangeRef.current?.(columnId, boundedWidth);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;

        setIsResizing(false);
        setResizingColumnId(null);

        const finalWidths = { ...widthsRef.current, [columnId]: lastWidth };
        onResizeEndRef.current?.(finalWidths);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [minWidth, maxWidth]
  );

  const getColumnWidth = useCallback(
    (columnId: string, fallback: number = 160): number => {
      return columnWidths[columnId] ?? fallback;
    },
    [columnWidths]
  );

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnId]: width }));
  }, []);

  return {
    columnWidths,
    isResizing,
    resizingColumnId,
    handleResizeStart,
    getColumnWidth,
    setColumnWidth,
  };
}
