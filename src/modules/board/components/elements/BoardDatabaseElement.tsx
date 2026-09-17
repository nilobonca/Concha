import React, { useCallback } from 'react';
import { BoardElement, HandlePosition, DatabaseElementData } from '../../types';
import { BoardBaseNoteElement } from './BoardBaseNoteElement';
import { DatabaseContainer } from '@/modules/database/components/DatabaseContainer';
import { DatabaseInstance } from '@/modules/database/types';

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
  onCenterElement?: () => void;
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
  onCenterElement,
  onDragStart,
}) => {
  const data = (element.data || {}) as DatabaseElementData & { color?: string };

  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      const cleanTitle = newTitle.trim();
      if (!cleanTitle) return;
      onUpdate({
        data: {
          ...data,
          title: cleanTitle,
        },
      });
    },
    [data, onUpdate]
  );

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
    <BoardBaseNoteElement
      element={element}
      isSelected={isSelected}
      snappedHandle={snappedHandle}
      zoom={zoom}
      canvasTheme={canvasTheme}
      color={data.color}
      title={data.title || 'Base de Dados'}
      minWidth={340}
      minHeight={240}
      onSelect={onSelect}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onStartArrow={onStartArrow}
      onUpdateTitle={handleUpdateTitle}
      onCenterElement={onCenterElement}
      onDragStart={onDragStart}
    >
      <div className="flex-1 w-full min-h-0 overflow-hidden relative prevent-canvas-pan rounded-2xl">
        <DatabaseContainer
          key={data.databasePath || element.id}
          databasePath={data.databasePath}
          initialData={data.initialData}
          onSave={handleDatabaseSave}
          isInline={true}
        />
      </div>
    </BoardBaseNoteElement>
  );
};
