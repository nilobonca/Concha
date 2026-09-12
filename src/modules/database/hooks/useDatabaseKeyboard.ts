/**
 * Supercanvas Database - Keyboard Navigation Hook
 * Handles grid cell navigation (Arrow keys, Tab, Enter, Escape) and automatic row insertion on Tab.
 */

import { useState, useCallback } from 'react';

export interface DatabaseCellCoordinate {
  rowId: string;
  propertyId: string;
}

export interface UseDatabaseKeyboardOptions {
  rowIds: string[];
  propertyIds: string[];
  onCellSelect?: (coord: DatabaseCellCoordinate) => void;
  onAddNewRow?: () => string | void;
  onCellCommit?: (coord: DatabaseCellCoordinate) => void;
}

export interface UseDatabaseKeyboardReturn {
  activeCell: DatabaseCellCoordinate | null;
  isEditing: boolean;
  setActiveCell: (cell: DatabaseCellCoordinate | null) => void;
  setIsEditing: (editing: boolean) => void;
  selectCell: (rowId: string, propertyId: string, startEditing?: boolean) => void;
  isCellActive: (rowId: string, propertyId: string) => boolean;
  isCellEditing: (rowId: string, propertyId: string) => boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  blurCell: () => void;
}

export function useDatabaseKeyboard(
  options: UseDatabaseKeyboardOptions
): UseDatabaseKeyboardReturn {
  const { rowIds, propertyIds, onCellSelect, onAddNewRow, onCellCommit } = options;

  const [activeCell, setActiveCellState] = useState<DatabaseCellCoordinate | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const setActiveCell = useCallback(
    (cell: DatabaseCellCoordinate | null) => {
      setActiveCellState(cell);
      if (cell) {
        onCellSelect?.(cell);
      }
    },
    [onCellSelect]
  );

  const selectCell = useCallback(
    (rowId: string, propertyId: string, startEditing: boolean = false) => {
      setActiveCell({ rowId, propertyId });
      setIsEditing(startEditing);
    },
    [setActiveCell]
  );

  const blurCell = useCallback(() => {
    if (activeCell && isEditing) {
      onCellCommit?.(activeCell);
    }
    setIsEditing(false);
    setActiveCellState(null);
  }, [activeCell, isEditing, onCellCommit]);

  const isCellActive = useCallback(
    (rowId: string, propertyId: string): boolean => {
      return activeCell?.rowId === rowId && activeCell?.propertyId === propertyId;
    },
    [activeCell]
  );

  const isCellEditing = useCallback(
    (rowId: string, propertyId: string): boolean => {
      return isEditing && activeCell?.rowId === rowId && activeCell?.propertyId === propertyId;
    },
    [activeCell, isEditing]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return;

      const rowIndex = rowIds.indexOf(activeCell.rowId);
      const colIndex = propertyIds.indexOf(activeCell.propertyId);

      if (rowIndex === -1 || colIndex === -1) return;

      // 1. ESCAPE - exit editing or clear focus
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isEditing) {
          setIsEditing(false);
        } else {
          setActiveCellState(null);
        }
        return;
      }

      // 2. ENTER - toggle edit mode or advance row
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        if (!isEditing) {
          setIsEditing(true);
        } else {
          onCellCommit?.(activeCell);
          setIsEditing(false);
          // Move down to next row if available
          if (rowIndex < rowIds.length - 1) {
            setActiveCell({
              rowId: rowIds[rowIndex + 1],
              propertyId: activeCell.propertyId,
            });
          }
        }
        return;
      }

      // 3. TAB - navigate horizontally, loop or create new row at end
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        if (isEditing) {
          onCellCommit?.(activeCell);
          setIsEditing(false);
        }

        if (e.shiftKey) {
          // Backward tab
          if (colIndex > 0) {
            setActiveCell({
              rowId: activeCell.rowId,
              propertyId: propertyIds[colIndex - 1],
            });
          } else if (rowIndex > 0) {
            setActiveCell({
              rowId: rowIds[rowIndex - 1],
              propertyId: propertyIds[propertyIds.length - 1],
            });
          }
        } else {
          // Forward tab
          if (colIndex < propertyIds.length - 1) {
            setActiveCell({
              rowId: activeCell.rowId,
              propertyId: propertyIds[colIndex + 1],
            });
          } else if (rowIndex < rowIds.length - 1) {
            setActiveCell({
              rowId: rowIds[rowIndex + 1],
              propertyId: propertyIds[0],
            });
          } else {
            // Reached last cell of last row! Trigger new row creation
            if (onAddNewRow) {
              const newRowId = onAddNewRow();
              if (typeof newRowId === 'string') {
                setActiveCell({
                  rowId: newRowId,
                  propertyId: propertyIds[0],
                });
              }
            }
          }
        }
        return;
      }

      // 4. ARROW KEYS - grid navigation (only when not in edit mode)
      if (!isEditing) {
        switch (e.key) {
          case 'ArrowUp':
            if (rowIndex > 0) {
              e.preventDefault();
              setActiveCell({
                rowId: rowIds[rowIndex - 1],
                propertyId: activeCell.propertyId,
              });
            }
            break;

          case 'ArrowDown':
            if (rowIndex < rowIds.length - 1) {
              e.preventDefault();
              setActiveCell({
                rowId: rowIds[rowIndex + 1],
                propertyId: activeCell.propertyId,
              });
            }
            break;

          case 'ArrowLeft':
            if (colIndex > 0) {
              e.preventDefault();
              setActiveCell({
                rowId: activeCell.rowId,
                propertyId: propertyIds[colIndex - 1],
              });
            }
            break;

          case 'ArrowRight':
            if (colIndex < propertyIds.length - 1) {
              e.preventDefault();
              setActiveCell({
                rowId: activeCell.rowId,
                propertyId: propertyIds[colIndex + 1],
              });
            }
            break;
        }
      }
    },
    [activeCell, isEditing, rowIds, propertyIds, onCellCommit, onAddNewRow, setActiveCell]
  );

  return {
    activeCell,
    isEditing,
    setActiveCell,
    setIsEditing,
    selectCell,
    isCellActive,
    isCellEditing,
    handleKeyDown,
    blurCell,
  };
}
