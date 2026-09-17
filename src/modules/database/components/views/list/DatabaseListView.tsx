import React from 'react';
import { Plus } from 'lucide-react';
import { DatabaseRow, PropertyDefinition, DatabaseViewConfig } from '../../../types';
import { ListItemRow } from './ListItemRow';

export interface DatabaseListViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  viewConfig: DatabaseViewConfig;
  databasePath?: string;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onAddNewRow: () => void;
  onOpenPeek?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  isInline?: boolean;
  onContextMenu?: (e: React.MouseEvent, row: DatabaseRow) => void;
}

export const DatabaseListView: React.FC<DatabaseListViewProps> = ({
  rows,
  properties,
  viewConfig,
  databasePath,
  onUpdateProperty,
  onAddNewRow,
  onOpenPeek,
  onDeleteRow,
  isInline = false,
  onContextMenu,
}) => {
  return (
    <div className={`flex-1 w-full h-full overflow-y-auto ${isInline ? 'pt-1.5 px-3.5 pb-3.5' : 'pt-2 px-6 pb-6'}`}>
      <div className="max-w-4xl mx-auto space-y-1">
        {rows.map((row) => (
          <ListItemRow
            key={row.id}
            row={row}
            properties={properties}
            visiblePropertyIds={viewConfig.visiblePropertyIds}
            databasePath={databasePath}
            onUpdateProperty={onUpdateProperty}
            onOpenPeek={onOpenPeek}
            onDeleteRow={onDeleteRow}
            onContextMenu={onContextMenu}
          />
        ))}

        {/* Add Row Button at bottom */}
        <button
          type="button"
          onClick={onAddNewRow}
          className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/50 dark:hover:text-[#F4F0E6] hover:bg-stone-100/60 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova linha</span>
        </button>
      </div>
    </div>
  );
};
