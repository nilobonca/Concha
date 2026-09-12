import React, { useState } from 'react';
import { MoreHorizontal, Trash2, Copy, Maximize2 } from 'lucide-react';
import { DatabaseRow, PropertyDefinition, RowHeight, PropertyOptionColor } from '../../../types';
import { DatabaseCellRenderer } from '../../cells/DatabaseCellRenderer';

export interface TableRowItemProps {
  row: DatabaseRow;
  index: number;
  properties: PropertyDefinition[];
  columnWidths: Record<string, number>;
  rowHeight?: RowHeight;
  isSelected?: boolean;
  onToggleSelect?: (rowId: string) => void;
  onAddRowAbove?: () => void;
  onAddRowBelow?: () => void;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onOpenPeek?: (rowId: string) => void;
  onDuplicateRow?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  onOpenUploadPopover?: (rowId: string, propertyId: string) => void;
  onCreateOption?: (propertyId: string, name: string, color: PropertyOptionColor) => void;
  showRowNumbers?: boolean;
}

const ROW_HEIGHT_CLASSES: Record<RowHeight, string> = {
  compact: 'min-h-[32px] h-[32px]',
  normal: 'min-h-[38px] h-[38px]',
  spacious: 'min-h-[48px] h-[48px]',
};

export const TableRowItem: React.FC<TableRowItemProps> = ({
  row,
  index,
  properties,
  columnWidths,
  rowHeight = 'normal',
  isSelected = false,
  onToggleSelect,
  onAddRowAbove,
  onAddRowBelow,
  onUpdateProperty,
  onOpenPeek,
  onDuplicateRow,
  onDeleteRow,
  onOpenUploadPopover,
  onCreateOption,
  showRowNumbers = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const heightClass = ROW_HEIGHT_CLASSES[rowHeight] || ROW_HEIGHT_CLASSES.normal;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group flex border-b border-stone-200/80 dark:border-white/5 transition-colors min-w-max ${heightClass} ${
        isSelected
          ? 'bg-[#1831D7]/8 dark:bg-[#52B1FF]/10'
          : 'hover:bg-stone-50/80 dark:hover:bg-white/[0.02]'
      }`}
    >
      {/* Index & Selection Checkbox Column */}
      {showRowNumbers && (
        <div className="w-10 min-w-[40px] flex items-center justify-center border-r border-stone-200/50 dark:border-white/5 select-none relative shrink-0">
          {isHovered || isSelected ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect?.(row.id);
              }}
              className="w-3.5 h-3.5 rounded border-stone-300 dark:border-white/20 text-[#1831D7] dark:text-[#52B1FF] focus:ring-0 cursor-pointer accent-[#1831D7] dark:accent-[#52B1FF]"
              title="Selecionar nota"
            />
          ) : (
            <span className="text-[11px] font-mono tabular-nums text-stone-400 dark:text-[#B4D3F1]/30">
              {index + 1}
            </span>
          )}
        </div>
      )}

      {/* Cells for each property */}
      {properties.map((prop) => {
        const width = columnWidths[prop.id] || prop.width || 180;

        return (
          <div
            key={prop.id}
            style={{ width: `${width}px`, minWidth: `${width}px` }}
            className="border-r border-stone-200/80 dark:border-white/5 overflow-hidden flex items-center shrink-0"
          >
            <DatabaseCellRenderer
              row={row}
              property={prop}
              onUpdateProperty={onUpdateProperty}
              onOpenPeek={onOpenPeek}
              onAddRowAbove={onAddRowAbove}
              onAddRowBelow={onAddRowBelow}
              onOpenUploadPopover={onOpenUploadPopover}
              onCreateOption={onCreateOption}
            />
          </div>
        );
      })}
    </div>
  );
};
