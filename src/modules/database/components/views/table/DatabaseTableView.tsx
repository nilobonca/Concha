import React, { useState } from 'react';
import {
  DatabaseRow,
  PropertyDefinition,
  DatabaseViewConfig,
  SortDirection,
  PropertyOptionColor,
  PropertyType,
} from '../../../types';
import { createDefaultProperty } from '../../../utils/databaseDefaults';
import { useColumnResize } from '../../../hooks/useColumnResize';
import { TableHeaderRow } from './TableHeaderRow';
import { TableRowItem } from './TableRowItem';
import { TableAddRow } from './TableAddRow';
import { SortConfirmModal } from './SortConfirmModal';

export interface DatabaseTableViewProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  viewConfig: DatabaseViewConfig;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onAddNewRow: () => void;
  onAddNewRowAtIndex?: (targetIndex: number) => void;
  onOpenPeek?: (rowId: string) => void;
  onDuplicateRow?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  onUpdateViewConfig: (updates: Partial<DatabaseViewConfig>) => void;
  onOpenAddProperty?: () => void;
  onAddProperty?: (prop: PropertyDefinition) => void;
  onEditProperty?: (prop: PropertyDefinition) => void;
  onDeleteProperty?: (propId: string) => void;
  onOpenUploadPopover?: (rowId: string, propertyId: string) => void;
  onCreateOption?: (propertyId: string, name: string, color: PropertyOptionColor) => void;
  isInline?: boolean;
}

export const DatabaseTableView: React.FC<DatabaseTableViewProps> = ({
  rows,
  properties,
  viewConfig,
  onUpdateProperty,
  onAddNewRow,
  onAddNewRowAtIndex,
  onOpenPeek,
  onDuplicateRow,
  onDeleteRow,
  onUpdateViewConfig,
  onOpenAddProperty,
  onAddProperty,
  onEditProperty,
  onDeleteProperty,
  onOpenUploadPopover,
  onCreateOption,
  isInline = false,
}) => {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [sortConfirmState, setSortConfirmState] = useState<{
    isOpen: boolean;
    targetIndex: number;
  }>({ isOpen: false, targetIndex: 0 });

  const handleToggleSelectRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === rows.length && rows.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(rows.map((r) => r.id)));
    }
  };

  const allSelected = rows.length > 0 && selectedRowIds.size === rows.length;
  const someSelected = selectedRowIds.size > 0 && selectedRowIds.size < rows.length;

  const handleAddRowNear = (index: number, isAbove: boolean) => {
    const targetIndex = isAbove ? index : index + 1;
    const hasActiveSorts = viewConfig.sorts && viewConfig.sorts.length > 0;

    if (hasActiveSorts) {
      setSortConfirmState({
        isOpen: true,
        targetIndex,
      });
    } else {
      if (onAddNewRowAtIndex) {
        onAddNewRowAtIndex(targetIndex);
      } else {
        onAddNewRow();
      }
    }
  };

  const handleConfirmRemoveSortAndAdd = () => {
    onUpdateViewConfig({ sorts: [] });
    if (onAddNewRowAtIndex) {
      onAddNewRowAtIndex(sortConfirmState.targetIndex);
    } else {
      onAddNewRow();
    }
    setSortConfirmState({ isOpen: false, targetIndex: 0 });
  };

  const handleCancelSortConfirm = () => {
    setSortConfirmState({ isOpen: false, targetIndex: 0 });
  };
  // Filter visible properties (fallback to all if visiblePropertyIds is not set or empty)
  const visibleProps = properties.filter((p) =>
    !viewConfig.visiblePropertyIds ||
    viewConfig.visiblePropertyIds.length === 0 ||
    viewConfig.visiblePropertyIds.includes(p.id)
  );

  const { columnWidths, handleResizeStart } = useColumnResize({
    initialWidths: viewConfig.columnWidths,
    onResizeEnd: (widths) => {
      onUpdateViewConfig({ columnWidths: widths });
    },
  });

  const handleSortChange = (propertyId: string, direction: SortDirection | null) => {
    if (!direction) {
      onUpdateViewConfig({
        sorts: viewConfig.sorts.filter((s) => s.propertyId !== propertyId),
      });
    } else {
      const existing = viewConfig.sorts.find((s) => s.propertyId === propertyId);
      if (existing) {
        onUpdateViewConfig({
          sorts: viewConfig.sorts.map((s) =>
            s.propertyId === propertyId ? { ...s, direction } : s
          ),
        });
      } else {
        onUpdateViewConfig({
          sorts: [...viewConfig.sorts, { propertyId, direction }],
        });
      }
    }
  };

  const handleHideProperty = (propertyId: string) => {
    onUpdateViewConfig({
      visiblePropertyIds: viewConfig.visiblePropertyIds.filter((id) => id !== propertyId),
    });
  };

  const handleAddProperty = (type: PropertyType, name?: string) => {
    const newProp = createDefaultProperty(type, name);
    if (onAddProperty) {
      onAddProperty(newProp);
    } else if (onOpenAddProperty) {
      onOpenAddProperty();
    }
  };

  return (
    <div className={`flex-1 w-full h-full overflow-auto bg-transparent relative flex flex-col ${isInline ? 'pt-1 px-2 pb-2' : 'pt-1.5 px-3.5 pb-3.5 sm:px-5 sm:pb-5'}`}>
      <div className="flex-1 flex flex-col min-w-max overflow-hidden">
        {/* Table Sticky Header */}
        <TableHeaderRow
          properties={visibleProps}
          columnWidths={columnWidths}
          sorts={viewConfig.sorts}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onSortChange={handleSortChange}
          onEditProperty={onEditProperty}
          onHideProperty={handleHideProperty}
          onDeleteProperty={onDeleteProperty}
          onResizeStart={handleResizeStart}
          onOpenAddProperty={onOpenAddProperty}
          onAddProperty={handleAddProperty}
          showRowNumbers={Boolean(viewConfig.showRowNumbers)}
          onToggleRowNumbers={() =>
            onUpdateViewConfig({ showRowNumbers: !viewConfig.showRowNumbers })
          }
        />

        {/* Rows */}
        <div className="flex-1 divide-y divide-stone-100 dark:divide-white/[0.03]">
          {rows.map((row, index) => (
            <TableRowItem
              key={row.id}
              row={row}
              index={index}
              properties={visibleProps}
              columnWidths={columnWidths}
              rowHeight={viewConfig.rowHeight}
              isSelected={selectedRowIds.has(row.id)}
              onToggleSelect={handleToggleSelectRow}
              onAddRowAbove={() => handleAddRowNear(index, true)}
              onAddRowBelow={() => handleAddRowNear(index, false)}
              onUpdateProperty={onUpdateProperty}
              onOpenPeek={onOpenPeek}
              onDuplicateRow={onDuplicateRow}
              onDeleteRow={onDeleteRow}
              onOpenUploadPopover={onOpenUploadPopover}
              onCreateOption={onCreateOption}
              showRowNumbers={Boolean(viewConfig.showRowNumbers)}
            />
          ))}

          {/* Rapid Entry Row */}
          <TableAddRow
            onAddRow={onAddNewRow}
            showRowNumbers={Boolean(viewConfig.showRowNumbers)}
          />
        </div>
      </div>

      {/* Sort Confirmation Dialog */}
      <SortConfirmModal
        isOpen={sortConfirmState.isOpen}
        onConfirm={handleConfirmRemoveSortAndAdd}
        onCancel={handleCancelSortConfirm}
      />
    </div>
  );
};
