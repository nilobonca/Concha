import React from 'react';
import { DatabaseRow, PropertyDefinition, CardSize, SELECT_OPTION_COLOR_MAP } from '../../../types';
import { formatPropertyValue } from '../../../utils/databaseCalculations';
import { Image as ImageIcon } from 'lucide-react';
import { formatDatabaseRowPath } from '@/modules/vault/utils/databaseNodeUtils';

export interface GalleryCardItemProps {
  row: DatabaseRow;
  properties: PropertyDefinition[];
  visiblePropertyIds: string[];
  coverPropertyId?: string;
  cardSize?: CardSize;
  fitImage?: boolean;
  databasePath?: string;
  onOpenPeek?: (rowId: string) => void;
  onUpdateProperty?: (rowId: string, propertyId: string, value: any) => void;
  onContextMenu?: (e: React.MouseEvent, row: DatabaseRow) => void;
}

export const GalleryCardItem: React.FC<GalleryCardItemProps> = ({
  row,
  properties,
  visiblePropertyIds,
  coverPropertyId,
  cardSize = 'medium',
  fitImage = false,
  databasePath,
  onOpenPeek,
  onContextMenu,
}) => {
  // Determine cover preview
  let coverSrc = row.coverImage;
  if (!coverSrc && coverPropertyId) {
    const val = row.properties[coverPropertyId];
    if (Array.isArray(val) && val.length > 0 && val[0]?.url) {
      coverSrc = val[0].url;
    } else if (typeof val === 'string' && val.startsWith('http')) {
      coverSrc = val;
    }
  }

  const extraProps = properties.filter(
    (p) => p.type !== 'title' && visiblePropertyIds.includes(p.id)
  );

  const coverHeight =
    cardSize === 'small' ? 'h-28' : cardSize === 'large' ? 'h-52' : 'h-40';

  const handleDragStart = (e: React.DragEvent) => {
    if (databasePath) {
      const rowPath = formatDatabaseRowPath(databasePath, row.id);
      e.dataTransfer.setData('text/plain', rowPath);
      e.dataTransfer.setData(
        'application/rpgsa-vault-note',
        JSON.stringify({
          path: rowPath,
          name: row.title || 'Nota sem título',
          isDatabaseRow: true,
          dbPath: databasePath,
          rowId: row.id,
        })
      );
    }
  };

  return (
    <div
      draggable={Boolean(databasePath)}
      onDragStart={handleDragStart}
      onClick={() => onOpenPeek?.(row.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, row);
      }}
      className="group flex flex-col bg-white dark:bg-[#1E2238] rounded-2xl border border-stone-200 dark:border-white/10 hover:border-[#52B1FF] dark:hover:border-[#52B1FF] shadow-xs hover:shadow-lg transition-all cursor-pointer overflow-hidden select-none"
    >
      {/* Cover Image or Aesthetic Fallback */}
      <div className={`w-full ${coverHeight} bg-stone-100 dark:bg-white/5 relative overflow-hidden flex items-center justify-center`}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={row.title}
            className={`w-full h-full ${
              fitImage ? 'object-contain' : 'object-cover'
            } group-hover:scale-105 transition-transform duration-300`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-stone-300 dark:text-white/10">
            <ImageIcon className="w-8 h-8 stroke-[1.5]" />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {row.icon && <span className="text-sm leading-none shrink-0">{row.icon}</span>}
          <h4 className="text-xs font-bold text-stone-900 dark:text-[#F4F0E6] truncate">
            {row.title || 'Sem título'}
          </h4>
        </div>

        {/* Visible Property Badges */}
        {extraProps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {extraProps.slice(0, 4).map((prop) => {
              const val = row.properties[prop.id];
              if (val === null || val === undefined || val === '') return null;

              if (prop.type === 'select' && prop.options) {
                const opt = prop.options.find((o) => o.id === val || o.name === val);
                if (!opt) return null;
                const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
                return (
                  <span
                    key={prop.id}
                    style={{
                      backgroundColor: color.bg,
                      color: color.text,
                      borderColor: color.border,
                    }}
                    className="px-2 py-0.5 rounded-full border text-[10px] font-medium truncate max-w-[120px]"
                  >
                    {opt.name}
                  </span>
                );
              }

              const formatted = formatPropertyValue(val, prop);
              return (
                <span
                  key={prop.id}
                  className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/5 border border-stone-200/60 dark:border-white/5 text-[10px] text-stone-600 dark:text-[#B4D3F1] font-medium truncate max-w-[120px]"
                >
                  {formatted}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
