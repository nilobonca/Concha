import React from 'react';
import {
  DatabaseRow,
  PropertyDefinition,
  CardSize,
  SELECT_OPTION_COLOR_MAP,
} from '../../../types';
import { Check, Calendar, Paperclip, Link } from 'lucide-react';
import { formatPropertyValue } from '../../../utils/databaseCalculations';

export interface BoardCardItemProps {
  row: DatabaseRow;
  properties: PropertyDefinition[];
  visiblePropertyIds: string[];
  coverPropertyId?: string;
  cardSize?: CardSize;
  onOpenPeek?: (rowId: string) => void;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onDragStart?: (e: React.DragEvent, rowId: string) => void;
}

export const BoardCardItem: React.FC<BoardCardItemProps> = ({
  row,
  properties,
  visiblePropertyIds,
  coverPropertyId,
  cardSize = 'medium',
  onOpenPeek,
  onUpdateProperty,
  onDragStart,
}) => {
  // Determine cover image
  let coverImageSrc = row.coverImage;
  if (!coverImageSrc && coverPropertyId) {
    const coverVal = row.properties[coverPropertyId];
    if (Array.isArray(coverVal) && coverVal.length > 0 && coverVal[0]?.url) {
      coverImageSrc = coverVal[0].url;
    } else if (typeof coverVal === 'string' && coverVal.startsWith('http')) {
      coverImageSrc = coverVal;
    }
  }

  const extraProps = properties.filter(
    (p) => p.type !== 'title' && visiblePropertyIds.includes(p.id)
  );

  const checkboxProp = extraProps.find((p) => p.type === 'checkbox');
  const otherProps = extraProps.filter((p) => p.type !== 'checkbox');

  const handleCardClick = () => {
    onOpenPeek?.(row.id);
  };

  const coverHeight =
    cardSize === 'small' ? 'h-24' : cardSize === 'large' ? 'h-44' : 'h-32';

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart?.(e, row.id)}
      onClick={handleCardClick}
      className="group relative bg-white dark:bg-[#1E2238] rounded-xl border border-stone-200 dark:border-white/10 hover:border-[#52B1FF] dark:hover:border-[#52B1FF] shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden select-none p-3 space-y-2.5"
    >
      {/* Cover Image */}
      {coverImageSrc && (
        <div className={`-mx-3 -mt-3 mb-2 ${coverHeight} overflow-hidden bg-stone-100 dark:bg-white/5`}>
          <img
            src={coverImageSrc}
            alt={row.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Title & Checkbox */}
      <div className="flex items-start gap-2">
        {checkboxProp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const currentVal = Boolean(row.properties[checkboxProp.id]);
              onUpdateProperty(row.id, checkboxProp.id, !currentVal);
            }}
            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
              row.properties[checkboxProp.id]
                ? 'bg-[#1831D7] dark:bg-[#7F95FF] text-white dark:text-[#17192A]'
                : 'border border-stone-300 dark:border-white/20 hover:border-[#52B1FF]'
            }`}
          >
            {row.properties[checkboxProp.id] && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        )}

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {row.icon && <span className="text-sm leading-none shrink-0">{row.icon}</span>}
          <h4 className="text-xs font-semibold text-stone-900 dark:text-[#F4F0E6] line-clamp-2">
            {row.title || 'Sem título'}
          </h4>
        </div>
      </div>

      {/* Visible Property Badges */}
      {otherProps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {otherProps.map((prop) => {
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

            if (prop.type === 'multi-select' && Array.isArray(val) && prop.options) {
              return val.map((itemVal) => {
                const opt = prop.options?.find((o) => o.id === itemVal || o.name === itemVal);
                if (!opt) return null;
                const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
                return (
                  <span
                    key={opt.id}
                    style={{
                      backgroundColor: color.bg,
                      color: color.text,
                      borderColor: color.border,
                    }}
                    className="px-1.5 py-0.2 rounded-full border text-[10px] font-medium truncate max-w-[100px]"
                  >
                    {opt.name}
                  </span>
                );
              });
            }

            const formatted = formatPropertyValue(val, prop);
            return (
              <span
                key={prop.id}
                className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-white/5 border border-stone-200/60 dark:border-white/5 text-[10px] text-stone-600 dark:text-[#B4D3F1] font-medium truncate max-w-[130px]"
              >
                {formatted}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
