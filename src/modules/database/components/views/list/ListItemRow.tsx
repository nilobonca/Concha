import React from 'react';
import { DatabaseRow, PropertyDefinition, SELECT_OPTION_COLOR_MAP } from '../../../types';
import { Check, Maximize2, Trash2, FileText } from 'lucide-react';
import { formatPropertyValue } from '../../../utils/databaseCalculations';
import { formatDatabaseRowPath } from '@/modules/vault/utils/databaseNodeUtils';

export interface ListItemRowProps {
  row: DatabaseRow;
  properties: PropertyDefinition[];
  visiblePropertyIds: string[];
  databasePath?: string;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onOpenPeek?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  onContextMenu?: (e: React.MouseEvent, row: DatabaseRow) => void;
}

export const ListItemRow: React.FC<ListItemRowProps> = ({
  row,
  properties,
  visiblePropertyIds,
  databasePath,
  onUpdateProperty,
  onOpenPeek,
  onDeleteRow,
  onContextMenu,
}) => {
  const checkboxProp = properties.find((p) => p.type === 'checkbox');
  const otherVisibleProps = properties.filter(
    (p) => p.type !== 'title' && p.type !== 'checkbox' && visiblePropertyIds.includes(p.id)
  );

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
      className="group flex items-center justify-between px-4 py-2 hover:bg-stone-100/70 dark:hover:bg-white/5 rounded-xl border border-transparent hover:border-stone-200 dark:hover:border-white/10 transition-all cursor-pointer select-none"
    >
      {/* Left: Checkbox, Icon, Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
        {checkboxProp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const currentVal = Boolean(row.properties[checkboxProp.id]);
              onUpdateProperty(row.id, checkboxProp.id, !currentVal);
            }}
            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
              row.properties[checkboxProp.id]
                ? 'bg-[#1831D7] dark:bg-[#7F95FF] text-white dark:text-[#17192A]'
                : 'border border-stone-300 dark:border-white/20 hover:border-[#52B1FF]'
            }`}
          >
            {row.properties[checkboxProp.id] && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        )}

        {row.icon ? (
          <span className="text-base leading-none shrink-0">{row.icon}</span>
        ) : (
          <FileText className="w-4 h-4 text-stone-400 dark:text-[#B4D3F1]/60 shrink-0" />
        )}

        <span className="text-xs font-semibold text-stone-900 dark:text-[#F4F0E6] truncate">
          {row.title || 'Sem título'}
        </span>
      </div>

      {/* Right: Property Badges & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {otherVisibleProps.map((prop) => {
          const val = row.properties[prop.id];
          if (val === null || val === undefined || val === '') return null;

          if (prop.type === 'status' && prop.statusOptions) {
            const opt = prop.statusOptions.find((o) => o.id === val || o.name === val);
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
                className="px-2 py-0.5 rounded-full border text-[10px] font-medium truncate max-w-[110px]"
              >
                {opt.name}
              </span>
            );
          }

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
                className="px-2 py-0.5 rounded-full border text-[10px] font-medium truncate max-w-[110px]"
              >
                {opt.name}
              </span>
            );
          }

          const formatted = formatPropertyValue(val, prop);
          return (
            <span
              key={prop.id}
              className="text-[11px] text-stone-500 dark:text-[#B4D3F1]/70 truncate max-w-[120px]"
            >
              {formatted}
            </span>
          );
        })}

        {/* Hover buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDeleteRow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRow(row.id);
              }}
              className="p-1 rounded text-stone-400 hover:text-rose-500 cursor-pointer"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPeek?.(row.id);
            }}
            className="p-1 rounded text-stone-400 hover:text-[#52B1FF] cursor-pointer"
            title="Abrir"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
