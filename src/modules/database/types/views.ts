/**
 * Supercanvas Database - View Types
 * Supports Table, Board (Kanban), Gallery, and List views with sorting and filtering.
 */

export type DatabaseViewType = 'table' | 'board' | 'gallery' | 'list';

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  propertyId: string;
  direction: SortDirection;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'is_checked'
  | 'is_not_checked'
  | 'is_today'
  | 'is_before'
  | 'is_after';

export interface FilterRule {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterConjunction = 'and' | 'or';

export interface FilterGroup {
  conjunction: FilterConjunction;
  rules: FilterRule[];
}

export type CardSize = 'small' | 'medium' | 'large';
export type RowHeight = 'compact' | 'normal' | 'spacious';

export interface DatabaseViewConfig {
  id: string;
  name: string;
  type: DatabaseViewType;
  sorts: SortRule[];
  filterGroup: FilterGroup;
  groupByPropertyId?: string;
  visiblePropertyIds: string[];
  columnWidths?: Record<string, number>;
  coverPropertyId?: string;
  cardSize?: CardSize;
  fitImage?: boolean;
  rowHeight?: RowHeight;
  showRowNumbers?: boolean;
}
