import React from 'react';
import { DatabaseRow, PropertyDefinition, PropertyOptionColor } from '../../types';
import { TitleCell } from './TitleCell';
import { TextCell } from './TextCell';
import { NumberCell } from './NumberCell';
import { SelectCell } from './SelectCell';
import { MultiSelectCell } from './MultiSelectCell';
import { StatusCell } from './StatusCell';
import { DateCell } from './DateCell';
import { CheckboxCell } from './CheckboxCell';
import { UrlCell } from './UrlCell';
import { EmailCell } from './EmailCell';
import { FileCell } from './FileCell';
import { RelationCell } from './RelationCell';
import { formatPropertyValue } from '../../utils/databaseCalculations';

export interface DatabaseCellRendererProps {
  row: DatabaseRow;
  property: PropertyDefinition;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onOpenPeek?: (rowId: string) => void;
  onAddRowAbove?: () => void;
  onAddRowBelow?: () => void;
  onOpenUploadPopover?: (rowId: string, propertyId: string) => void;
  onCreateOption?: (propertyId: string, name: string, color: PropertyOptionColor) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
}

export const DatabaseCellRenderer: React.FC<DatabaseCellRendererProps> = ({
  row,
  property,
  onUpdateProperty,
  onOpenPeek,
  onAddRowAbove,
  onAddRowBelow,
  onOpenUploadPopover,
  onCreateOption,
  isEditing,
  onStartEditing,
  onStopEditing,
}) => {
  const propertyId = property.id;
  const rawValue = property.type === 'title' ? row.title : row.properties[propertyId];

  const handleUpdate = (val: any) => {
    onUpdateProperty(row.id, propertyId, val);
  };

  switch (property.type) {
    case 'title':
      return (
        <TitleCell
          rowId={row.id}
          value={row.title}
          icon={row.icon}
          onUpdate={(newTitle) => onUpdateProperty(row.id, 'title', newTitle)}
          onOpenPeek={onOpenPeek}
          onAddRowAbove={onAddRowAbove}
          onAddRowBelow={onAddRowBelow}
          isEditing={isEditing}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
        />
      );

    case 'text':
    case 'phone':
      return (
        <TextCell
          value={rawValue || ''}
          onUpdate={handleUpdate}
          isEditing={isEditing}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
        />
      );

    case 'number':
      return (
        <NumberCell
          value={rawValue}
          property={property}
          onUpdate={handleUpdate}
          isEditing={isEditing}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
        />
      );

    case 'select':
      return (
        <SelectCell
          value={rawValue}
          options={property.options}
          onUpdate={handleUpdate}
          onCreateOption={
            onCreateOption
              ? (name, color) => onCreateOption(propertyId, name, color)
              : undefined
          }
        />
      );

    case 'multi-select':
      return (
        <MultiSelectCell
          value={rawValue}
          options={property.options}
          onUpdate={handleUpdate}
          onCreateOption={
            onCreateOption
              ? (name, color) => onCreateOption(propertyId, name, color)
              : undefined
          }
        />
      );

    case 'status':
      return (
        <StatusCell
          value={rawValue}
          options={property.statusOptions}
          onUpdate={handleUpdate}
        />
      );

    case 'date':
      return <DateCell value={rawValue} onUpdate={handleUpdate} />;

    case 'checkbox':
      return <CheckboxCell value={rawValue} onUpdate={handleUpdate} />;

    case 'url':
      return (
        <UrlCell
          value={rawValue || ''}
          onUpdate={handleUpdate}
          isEditing={isEditing}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
        />
      );

    case 'email':
      return (
        <EmailCell
          value={rawValue || ''}
          onUpdate={handleUpdate}
          isEditing={isEditing}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
        />
      );

    case 'files':
      return (
        <FileCell
          value={rawValue}
          onUpdate={handleUpdate}
          onOpenUploadPopover={
            onOpenUploadPopover
              ? () => onOpenUploadPopover(row.id, propertyId)
              : undefined
          }
        />
      );

    case 'relation':
      return (
        <RelationCell
          value={rawValue}
          property={property}
          onUpdate={handleUpdate}
        />
      );

    case 'created_time':
    case 'last_edited_time': {
      const formatted = formatPropertyValue(
        property.type === 'created_time' ? row.createdAt : row.updatedAt,
        property
      );
      return (
        <div className="flex items-center w-full h-full px-2 py-1 text-xs text-stone-400 dark:text-[#B4D3F1]/50 truncate select-none">
          {formatted || '-'}
        </div>
      );
    }

    default:
      return (
        <div className="flex items-center w-full h-full px-2 py-1 text-xs text-stone-500 truncate">
          {String(rawValue ?? '')}
        </div>
      );
  }
};
