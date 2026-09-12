/**
 * Supercanvas Database - Query and Aggregation Types
 */

import { FilterGroup, SortRule } from './views';

export type AggregationType =
  | 'none'
  | 'count_all'
  | 'count_values'
  | 'count_unique'
  | 'count_empty'
  | 'count_not_empty'
  | 'percent_empty'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'range'
  | 'count_checked'
  | 'count_unchecked';

export interface GroupConfig {
  propertyId: string;
  collapsedGroups?: string[];
}

export interface QueryState {
  searchQuery: string;
  filterGroup: FilterGroup;
  sorts: SortRule[];
  groupBy?: string;
}

export interface AggregationOptionItem {
  type: AggregationType;
  label: string;
  compatibleTypes: string[];
}

export const AGGREGATION_OPTIONS: AggregationOptionItem[] = [
  { type: 'none', label: 'None', compatibleTypes: ['all'] },
  { type: 'count_all', label: 'Count All', compatibleTypes: ['all'] },
  { type: 'count_values', label: 'Count Values', compatibleTypes: ['all'] },
  { type: 'count_unique', label: 'Count Unique', compatibleTypes: ['all'] },
  { type: 'count_empty', label: 'Count Empty', compatibleTypes: ['all'] },
  { type: 'count_not_empty', label: 'Count Not Empty', compatibleTypes: ['all'] },
  { type: 'percent_empty', label: 'Percent Empty', compatibleTypes: ['all'] },
  { type: 'sum', label: 'Sum', compatibleTypes: ['number'] },
  { type: 'average', label: 'Average', compatibleTypes: ['number'] },
  { type: 'median', label: 'Median', compatibleTypes: ['number'] },
  { type: 'min', label: 'Min', compatibleTypes: ['number', 'date'] },
  { type: 'max', label: 'Max', compatibleTypes: ['number', 'date'] },
  { type: 'range', label: 'Range', compatibleTypes: ['number'] },
  { type: 'count_checked', label: 'Count Checked', compatibleTypes: ['checkbox'] },
  { type: 'count_unchecked', label: 'Count Unchecked', compatibleTypes: ['checkbox'] },
];
