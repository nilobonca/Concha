import React, { useState } from 'react';
import {
  DatabaseRow,
  PropertyDefinition,
  CardSize,
} from '../../../types';
import { BoardCardItem } from './BoardCardItem';
import { BoardAddCard } from './BoardAddCard';

export interface BoardColumnProps {
  groupKey: string;
  groupLabel: string;
  groupColor?: string;
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  visiblePropertyIds: string[];
  coverPropertyId?: string;
  cardSize?: CardSize;
  onOpenPeek?: (rowId: string) => void;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onAddCardToGroup: (groupKey: string, title: string) => void;
  onDropCardInGroup: (rowId: string, targetGroupKey: string) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  groupKey,
  groupLabel,
  groupColor = '#7F95FF',
  rows,
  properties,
  visiblePropertyIds,
  coverPropertyId,
  cardSize,
  onOpenPeek,
  onUpdateProperty,
  onAddCardToGroup,
  onDropCardInGroup,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const rowId = e.dataTransfer.getData('text/plain');
    if (rowId) {
      onDropCardInGroup(rowId, groupKey);
    }
  };

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('text/plain', rowId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-72 shrink-0 flex flex-col max-h-full rounded-2xl p-2.5 transition-colors ${
        isDragOver
          ? 'bg-[#1831D7]/10 dark:bg-[#52B1FF]/10 ring-2 ring-[#52B1FF]'
          : 'bg-stone-100/70 dark:bg-white/[0.03]'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-2 select-none">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: groupColor }}
          />
          <span className="text-xs font-bold text-stone-800 dark:text-[#F4F0E6] truncate max-w-[170px]">
            {groupLabel}
          </span>
          <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-[#B4D3F1]">
            {rows.length}
          </span>
        </div>
      </div>

      {/* Cards Scrollable Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-[50px]">
        {rows.map((row) => (
          <BoardCardItem
            key={row.id}
            row={row}
            properties={properties}
            visiblePropertyIds={visiblePropertyIds}
            coverPropertyId={coverPropertyId}
            cardSize={cardSize}
            onOpenPeek={onOpenPeek}
            onUpdateProperty={onUpdateProperty}
            onDragStart={handleDragStart}
          />
        ))}
      </div>

      {/* Add Card Footer */}
      <div className="pt-2">
        <BoardAddCard onAddCard={(title) => onAddCardToGroup(groupKey, title)} />
      </div>
    </div>
  );
};
