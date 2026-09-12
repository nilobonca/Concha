/**
 * Supercanvas Database - Query Hook
 * Fast, memoized filtering (AND/OR), multi-level sorting, global search, and Kanban grouping.
 */

import { useMemo } from 'react';
import {
  DatabaseRow,
  PropertyDefinition,
  DatabaseViewConfig,
  FilterRule,
  SortRule,
} from '../types';

export interface UseDatabaseQueryOptions {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  activeViewConfig: DatabaseViewConfig;
  searchQuery?: string;
}

export interface UseDatabaseQueryReturn {
  filteredAndSortedRows: DatabaseRow[];
  groupedRows: Record<string, DatabaseRow[]>;
  groupKeys: string[];
  activeFilterCount: number;
  activeSortCount: number;
  hasActiveQuery: boolean;
}

function evaluateFilterRule(
  row: DatabaseRow,
  rule: FilterRule,
  propertyMap: Map<string, PropertyDefinition>
): boolean {
  const prop = propertyMap.get(rule.propertyId);
  const rawValue =
    prop?.type === 'title' ? row.title : row.properties[rule.propertyId];

  const isEmpty =
    rawValue === null ||
    rawValue === undefined ||
    rawValue === '' ||
    (Array.isArray(rawValue) && rawValue.length === 0);

  switch (rule.operator) {
    case 'is_empty':
      return isEmpty;

    case 'is_not_empty':
      return !isEmpty;

    case 'is_checked':
      return Boolean(rawValue) === true;

    case 'is_not_checked':
      return Boolean(rawValue) === false;

    case 'equals': {
      if (isEmpty) return rule.value === '' || rule.value === null;
      if (typeof rawValue === 'number') {
        return rawValue === Number(rule.value);
      }
      if (typeof rawValue === 'boolean') {
        return rawValue === Boolean(rule.value);
      }
      return (
        String(rawValue).trim().toLowerCase() ===
        String(rule.value ?? '').trim().toLowerCase()
      );
    }

    case 'not_equals': {
      if (isEmpty) return rule.value !== '' && rule.value !== null;
      if (typeof rawValue === 'number') {
        return rawValue !== Number(rule.value);
      }
      if (typeof rawValue === 'boolean') {
        return rawValue !== Boolean(rule.value);
      }
      return (
        String(rawValue).trim().toLowerCase() !==
        String(rule.value ?? '').trim().toLowerCase()
      );
    }

    case 'contains': {
      if (isEmpty) return false;
      const searchTarget = String(rule.value ?? '').trim().toLowerCase();
      if (Array.isArray(rawValue)) {
        return rawValue.some((item) =>
          String(item).toLowerCase().includes(searchTarget)
        );
      }
      return String(rawValue).toLowerCase().includes(searchTarget);
    }

    case 'not_contains': {
      if (isEmpty) return true;
      const searchTarget = String(rule.value ?? '').trim().toLowerCase();
      if (Array.isArray(rawValue)) {
        return !rawValue.some((item) =>
          String(item).toLowerCase().includes(searchTarget)
        );
      }
      return !String(rawValue).toLowerCase().includes(searchTarget);
    }

    case 'greater_than': {
      if (isEmpty) return false;
      if (prop?.type === 'date') {
        const rowTime = new Date(rawValue).getTime();
        const ruleTime = new Date(String(rule.value)).getTime();
        return !isNaN(rowTime) && !isNaN(ruleTime) && rowTime > ruleTime;
      }
      const numRow = Number(rawValue);
      const numRule = Number(rule.value);
      return !isNaN(numRow) && !isNaN(numRule) && numRow > numRule;
    }

    case 'less_than': {
      if (isEmpty) return false;
      if (prop?.type === 'date') {
        const rowTime = new Date(rawValue).getTime();
        const ruleTime = new Date(String(rule.value)).getTime();
        return !isNaN(rowTime) && !isNaN(ruleTime) && rowTime < ruleTime;
      }
      const numRow = Number(rawValue);
      const numRule = Number(rule.value);
      return !isNaN(numRow) && !isNaN(numRule) && numRow < numRule;
    }

    case 'is_today': {
      if (isEmpty) return false;
      try {
        const rowDate = new Date(rawValue).toISOString().split('T')[0];
        const todayDate = new Date().toISOString().split('T')[0];
        return rowDate === todayDate;
      } catch {
        return false;
      }
    }

    case 'is_before': {
      if (isEmpty) return false;
      try {
        const rowTime = new Date(rawValue).getTime();
        const targetTime = new Date(String(rule.value)).getTime();
        return !isNaN(rowTime) && !isNaN(targetTime) && rowTime < targetTime;
      } catch {
        return false;
      }
    }

    case 'is_after': {
      if (isEmpty) return false;
      try {
        const rowTime = new Date(rawValue).getTime();
        const targetTime = new Date(String(rule.value)).getTime();
        return !isNaN(rowTime) && !isNaN(targetTime) && rowTime > targetTime;
      } catch {
        return false;
      }
    }

    default:
      return true;
  }
}

function compareRowValues(
  valA: any,
  valB: any,
  sort: SortRule,
  property?: PropertyDefinition
): number {
  const isEmptyA =
    valA === null ||
    valA === undefined ||
    valA === '' ||
    (Array.isArray(valA) && valA.length === 0);
  const isEmptyB =
    valB === null ||
    valB === undefined ||
    valB === '' ||
    (Array.isArray(valB) && valB.length === 0);

  // Empty values always sink to the bottom
  if (isEmptyA && isEmptyB) return 0;
  if (isEmptyA) return 1;
  if (isEmptyB) return -1;

  let comparison = 0;

  if (property?.type === 'number') {
    comparison = Number(valA) - Number(valB);
  } else if (
    property?.type === 'date' ||
    property?.type === 'created_time' ||
    property?.type === 'last_edited_time'
  ) {
    const timeA = new Date(valA).getTime();
    const timeB = new Date(valB).getTime();
    comparison = timeA - timeB;
  } else if (property?.type === 'checkbox') {
    comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
  } else {
    // String or array comparison
    const strA = Array.isArray(valA) ? valA.join(', ') : String(valA);
    const strB = Array.isArray(valB) ? valB.join(', ') : String(valB);
    comparison = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  }

  return sort.direction === 'desc' ? -comparison : comparison;
}

export function useDatabaseQuery(options: UseDatabaseQueryOptions): UseDatabaseQueryReturn {
  const { rows, properties, activeViewConfig, searchQuery = '' } = options;

  const propertyMap = useMemo(() => {
    return new Map<string, PropertyDefinition>(properties.map((p) => [p.id, p]));
  }, [properties]);

  const activeFilterCount = activeViewConfig.filterGroup?.rules?.length || 0;
  const activeSortCount = activeViewConfig.sorts?.length || 0;
  const hasActiveQuery = Boolean(
    searchQuery.trim() || activeFilterCount > 0 || activeSortCount > 0
  );

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // 1. Search Query Filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((row) => {
        if (row.title && row.title.toLowerCase().includes(query)) return true;
        if (row.content && row.content.toLowerCase().includes(query)) return true;

        for (const prop of properties) {
          const val = row.properties[prop.id];
          if (val === null || val === undefined) continue;

          if (prop.type === 'select' && prop.options) {
            const opt = prop.options.find((o) => o.id === val);
            if (opt && opt.name.toLowerCase().includes(query)) return true;
          } else if (prop.type === 'status' && prop.statusOptions) {
            const opt = prop.statusOptions.find((o) => o.id === val);
            if (opt && opt.name.toLowerCase().includes(query)) return true;
          } else if (prop.type === 'multi-select' && prop.options && Array.isArray(val)) {
            for (const tagId of val) {
              const opt = prop.options.find((o) => o.id === tagId);
              if (opt && opt.name.toLowerCase().includes(query)) return true;
            }
          } else if (String(val).toLowerCase().includes(query)) {
            return true;
          }
        }
        return false;
      });
    }

    // 2. View Filter Group (AND / OR)
    const filterGroup = activeViewConfig.filterGroup;
    if (filterGroup && filterGroup.rules && filterGroup.rules.length > 0) {
      const { conjunction, rules } = filterGroup;

      result = result.filter((row) => {
        if (conjunction === 'or') {
          return rules.some((rule) => evaluateFilterRule(row, rule, propertyMap));
        }
        return rules.every((rule) => evaluateFilterRule(row, rule, propertyMap));
      });
    }

    // 3. Multi-level Sorting
    const sorts = activeViewConfig.sorts;
    if (sorts && sorts.length > 0) {
      result.sort((rowA, rowB) => {
        for (const sort of sorts) {
          const prop = propertyMap.get(sort.propertyId);
          const valA = prop?.type === 'title' ? rowA.title : rowA.properties[sort.propertyId];
          const valB = prop?.type === 'title' ? rowB.title : rowB.properties[sort.propertyId];

          const cmp = compareRowValues(valA, valB, sort, prop);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    return result;
  }, [rows, properties, propertyMap, activeViewConfig, searchQuery]);

  // Grouping for Board / Kanban view
  const { groupedRows, groupKeys } = useMemo(() => {
    const groupByPropId = activeViewConfig.groupByPropertyId;
    if (!groupByPropId) {
      return {
        groupedRows: { all: filteredAndSortedRows },
        groupKeys: ['all'],
      };
    }

    const groupProp = propertyMap.get(groupByPropId);
    const groups: Record<string, DatabaseRow[]> = {};
    const orderedKeys: string[] = [];

    // Pre-populate with defined options for status or select
    if (groupProp?.type === 'status' && groupProp.statusOptions) {
      groupProp.statusOptions.forEach((opt) => {
        groups[opt.id] = [];
        orderedKeys.push(opt.id);
      });
    } else if (groupProp?.type === 'select' && groupProp.options) {
      groupProp.options.forEach((opt) => {
        groups[opt.id] = [];
        orderedKeys.push(opt.id);
      });
    }

    // Uncategorized group
    const uncategorizedKey = '__uncategorized__';
    groups[uncategorizedKey] = [];

    filteredAndSortedRows.forEach((row) => {
      const val = row.properties[groupByPropId];
      if (val === null || val === undefined || val === '') {
        groups[uncategorizedKey].push(row);
      } else {
        const key = String(val);
        if (!groups[key]) {
          groups[key] = [];
          orderedKeys.push(key);
        }
        groups[key].push(row);
      }
    });

    // Only include uncategorized if it has items
    if (groups[uncategorizedKey].length > 0) {
      orderedKeys.push(uncategorizedKey);
    } else {
      delete groups[uncategorizedKey];
    }

    return {
      groupedRows: groups,
      groupKeys: orderedKeys,
    };
  }, [filteredAndSortedRows, activeViewConfig.groupByPropertyId, propertyMap]);

  return {
    filteredAndSortedRows,
    groupedRows,
    groupKeys,
    activeFilterCount,
    activeSortCount,
    hasActiveQuery,
  };
}
