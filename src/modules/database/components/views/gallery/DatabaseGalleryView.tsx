import React from 'react';
import { Plus } from 'lucide-react';
import { DatabaseRow, PropertyDefinition, DatabaseViewConfig } from '../../../types';
import { GalleryCardItem } from './GalleryCardItem';

export interface DatabaseGalleryViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  viewConfig: DatabaseViewConfig;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onAddNewRow: () => void;
  onOpenPeek?: (rowId: string) => void;
  isInline?: boolean;
}

export const DatabaseGalleryView: React.FC<DatabaseGalleryViewProps> = ({
  rows,
  properties,
  viewConfig,
  onUpdateProperty,
  onAddNewRow,
  onOpenPeek,
  isInline = false,
}) => {
  return (
    <div className={`flex-1 w-full h-full overflow-y-auto ${isInline ? 'pt-1.5 px-3.5 pb-3.5' : 'pt-2 px-6 pb-6'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rows.map((row) => (
          <GalleryCardItem
            key={row.id}
            row={row}
            properties={properties}
            visiblePropertyIds={viewConfig.visiblePropertyIds}
            coverPropertyId={viewConfig.coverPropertyId}
            cardSize={viewConfig.cardSize}
            fitImage={viewConfig.fitImage}
            onOpenPeek={onOpenPeek}
            onUpdateProperty={onUpdateProperty}
          />
        ))}

        {/* Add Card Placeholder */}
        <button
          type="button"
          onClick={onAddNewRow}
          className="min-h-[160px] rounded-2xl border-2 border-dashed border-stone-200 dark:border-white/10 hover:border-[#52B1FF] dark:hover:border-[#52B1FF] flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-[#52B1FF] dark:text-[#B4D3F1]/40 dark:hover:text-[#52B1FF] transition-all cursor-pointer bg-stone-50/40 dark:bg-white/[0.01]"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-semibold">Novo Registro</span>
        </button>
      </div>
    </div>
  );
};
