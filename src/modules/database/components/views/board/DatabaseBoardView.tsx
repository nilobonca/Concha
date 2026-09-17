import React from 'react';
import {
  DatabaseRow,
  PropertyDefinition,
  DatabaseViewConfig,
  SELECT_OPTION_COLOR_MAP,
} from '../../../types';
import { BoardColumn } from './BoardColumn';

export interface DatabaseBoardViewProps {
  groupedRows: Record<string, DatabaseRow[]>;
  groupKeys: string[];
  properties: PropertyDefinition[];
  viewConfig: DatabaseViewConfig;
  databasePath?: string;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onAddNewRow: (initialValues?: Partial<DatabaseRow>) => void;
  onOpenPeek?: (rowId: string) => void;
  isInline?: boolean;
  onContextMenu?: (e: React.MouseEvent, row: DatabaseRow) => void;
}

export const DatabaseBoardView: React.FC<DatabaseBoardViewProps> = ({
  groupedRows,
  groupKeys,
  properties,
  viewConfig,
  databasePath,
  onUpdateProperty,
  onAddNewRow,
  onOpenPeek,
  isInline = false,
  onContextMenu,
}) => {
  // Determine grouping property
  const groupByProp =
    properties.find((p) => p.id === viewConfig.groupByPropertyId) ||
    properties.find((p) => p.type === 'status') ||
    properties.find((p) => p.type === 'select');

  const getGroupMetadata = (key: string) => {
    if (!groupByProp) {
      return { label: key === '__no_group__' ? 'Sem Grupo' : key, color: '#7F95FF' };
    }

    if (key === '__no_group__' || key === '') {
      return { label: 'Sem Valor', color: '#94a3b8' };
    }

    if (groupByProp.type === 'status' && groupByProp.statusOptions) {
      const opt = groupByProp.statusOptions.find((o) => o.id === key || o.name === key);
      if (opt) {
        const color = SELECT_OPTION_COLOR_MAP[opt.color]?.text || '#7F95FF';
        return { label: opt.name, color };
      }
    }

    if (groupByProp.type === 'select' && groupByProp.options) {
      const opt = groupByProp.options.find((o) => o.id === key || o.name === key);
      if (opt) {
        const color = SELECT_OPTION_COLOR_MAP[opt.color]?.text || '#7F95FF';
        return { label: opt.name, color };
      }
    }

    return { label: key, color: '#7F95FF' };
  };

  const handleAddCardToGroup = (groupKey: string, title: string) => {
    const initialProperties: Record<string, any> = {};
    if (groupByProp && groupKey !== '__no_group__') {
      initialProperties[groupByProp.id] = groupKey;
    }
    onAddNewRow({
      title,
      properties: initialProperties,
    });
  };

  const handleDropCardInGroup = (rowId: string, targetGroupKey: string) => {
    if (!groupByProp) return;
    const finalVal = targetGroupKey === '__no_group__' ? null : targetGroupKey;
    onUpdateProperty(rowId, groupByProp.id, finalVal);
  };

  return (
    <div className={`flex-1 w-full h-full overflow-x-auto overflow-y-hidden ${isInline ? 'pt-1.5 px-3.5 pb-3.5' : 'pt-2 px-6 pb-6'}`}>
      <div className="flex items-start gap-4 h-full min-w-max">
        {groupKeys.map((key) => {
          const rowsInGroup = groupedRows[key] || [];
          const meta = getGroupMetadata(key);

          return (
            <BoardColumn
              key={key}
              groupKey={key}
              groupLabel={meta.label}
              groupColor={meta.color}
              rows={rowsInGroup}
              properties={properties}
              visiblePropertyIds={viewConfig.visiblePropertyIds}
              coverPropertyId={viewConfig.coverPropertyId}
              cardSize={viewConfig.cardSize}
              databasePath={databasePath}
              onOpenPeek={onOpenPeek}
              onUpdateProperty={onUpdateProperty}
              onAddCardToGroup={handleAddCardToGroup}
              onDropCardInGroup={handleDropCardInGroup}
              onContextMenu={onContextMenu}
            />
          );
        })}
      </div>
    </div>
  );
};
