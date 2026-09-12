import React, { useState } from 'react';
import { Plus, Hash, EyeOff, ChevronDown } from 'lucide-react';
import { PropertyDefinition, SortRule, SortDirection, PropertyType } from '../../../types';
import { TableColumnHeader } from './TableColumnHeader';
import { AddPropertyPopover } from './AddPropertyPopover';

export interface TableHeaderRowProps {
  properties: PropertyDefinition[];
  columnWidths: Record<string, number>;
  sorts: SortRule[];
  onSortChange: (propertyId: string, direction: SortDirection | null) => void;
  onEditProperty?: (property: PropertyDefinition) => void;
  onHideProperty?: (propertyId: string) => void;
  onDeleteProperty?: (propertyId: string) => void;
  onResizeStart: (propertyId: string, currentWidth: number, e: React.MouseEvent) => void;
  onOpenAddProperty?: () => void;
  onAddProperty?: (type: PropertyType, name?: string) => void;
  allSelected?: boolean;
  someSelected?: boolean;
  onToggleSelectAll?: () => void;
  showRowNumbers?: boolean;
  onToggleRowNumbers?: () => void;
}

export const TableHeaderRow: React.FC<TableHeaderRowProps> = ({
  properties,
  columnWidths,
  sorts,
  onSortChange,
  onEditProperty,
  onHideProperty,
  onDeleteProperty,
  onResizeStart,
  onOpenAddProperty,
  onAddProperty,
  allSelected = false,
  someSelected = false,
  onToggleSelectAll,
  showRowNumbers = false,
  onToggleRowNumbers,
}) => {
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="sticky top-0 z-20 flex border-b border-stone-200 dark:border-white/10 min-w-max">
      {/* Index & Select-all Column (non-fixed visually, blends seamlessly) */}
      {showRowNumbers && (
        <div
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
          className="group/index relative w-10 min-w-[40px] h-9 flex items-center justify-center border-r border-stone-200/50 dark:border-white/5 text-stone-400 dark:text-[#B4D3F1]/40 text-[11px] font-semibold select-none shrink-0"
        >
          {onToggleSelectAll && (allSelected || someSelected || isHeaderHovered) ? (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={onToggleSelectAll}
              className="w-3.5 h-3.5 rounded border-stone-300 dark:border-white/20 text-[#1831D7] dark:text-[#52B1FF] focus:ring-0 cursor-pointer accent-[#1831D7] dark:accent-[#52B1FF]"
              title={allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
            />
          ) : (
            <span>#</span>
          )}

          {/* Quick hide button on hover */}
          {onToggleRowNumbers && isHeaderHovered && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRowNumbers();
              }}
              className="absolute top-1 right-1 bg-white dark:bg-[#1E2238] shadow-xs rounded p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-white border border-stone-200 dark:border-white/10 cursor-pointer"
              title="Ocultar coluna de numeração (#)"
            >
              <EyeOff className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Property Column Headers */}
      {properties.map((prop) => {
        const width = columnWidths[prop.id] || prop.width || 180;
        const currentSort = sorts.find((s) => s.propertyId === prop.id)?.direction || null;

        return (
          <TableColumnHeader
            key={prop.id}
            property={prop}
            width={width}
            sortDirection={currentSort}
            onSortChange={onSortChange}
            onEditProperty={onEditProperty}
            onHideProperty={onHideProperty}
            onDeleteProperty={onDeleteProperty}
            onResizeStart={onResizeStart}
          />
        );
      })}

      {/* Add Property Button and Dropdown Menu */}
      <div className="relative flex items-center shrink-0">
        <button
          type="button"
          onClick={() => setIsAddOpen((prev) => !prev)}
          className={`h-9 px-3 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer select-none shrink-0 ${
            isAddOpen
              ? 'bg-stone-200/70 dark:bg-white/10 text-stone-900 dark:text-[#F4F0E6]'
              : 'text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/50 dark:hover:text-[#F4F0E6] hover:bg-stone-200/50 dark:hover:bg-white/5'
          }`}
          title="Adicionar nova propriedade"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px]">Nova Propriedade</span>
          <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isAddOpen ? 'rotate-180' : ''}`} />
        </button>

        {isAddOpen && (
          <AddPropertyPopover
            isOpen={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            onSelectType={(type, name) => {
              if (onAddProperty) {
                onAddProperty(type, name);
              } else if (onOpenAddProperty) {
                onOpenAddProperty();
              }
              setIsAddOpen(false);
            }}
            showRowNumbers={showRowNumbers}
            onToggleRowNumbers={() => {
              onToggleRowNumbers?.();
              setIsAddOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
