/**
 * Supercanvas Database - Aggregations & Calculations
 */

import { DatabaseRow, PropertyDefinition, AggregationType } from '../types';

export function formatPropertyValue(value: any, property: PropertyDefinition): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (property.type) {
    case 'title':
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      return String(value);

    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      if (isNaN(num)) return String(value);

      switch (property.numberFormat) {
        case 'currency_usd':
          return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'currency_brl':
          return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'currency_eur':
          return `€${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'percent':
          return `${num}%`;
        case 'compact': {
          if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
          if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
          if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
          return num.toLocaleString();
        }
        default:
          return num.toLocaleString();
      }
    }

    case 'select': {
      if (property.options) {
        const option = property.options.find((opt) => opt.id === value || opt.name === value);
        if (option) return option.name;
      }
      return String(value);
    }

    case 'multi-select': {
      if (!Array.isArray(value)) return String(value);
      if (!property.options) return value.join(', ');
      return value
        .map((val) => {
          const option = property.options?.find((opt) => opt.id === val || opt.name === val);
          return option ? option.name : String(val);
        })
        .join(', ');
    }

    case 'status': {
      if (property.statusOptions) {
        const option = property.statusOptions.find(
          (opt) => opt.id === value || opt.name === value
        );
        if (option) return option.name;
      }
      return String(value);
    }

    case 'date': {
      try {
        const dateObj = typeof value === 'number' ? new Date(value) : new Date(String(value));
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch {
        // Fallback to string
      }
      return String(value);
    }

    case 'created_time':
    case 'last_edited_time': {
      try {
        const dateObj = new Date(Number(value));
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // Fallback
      }
      return String(value);
    }

    case 'checkbox':
      return value ? 'Checked' : 'Unchecked';

    case 'files':
      if (Array.isArray(value)) {
        return `${value.length} ${value.length === 1 ? 'file' : 'files'}`;
      }
      return String(value);

    case 'relation':
      if (Array.isArray(value)) {
        return `${value.length} ${value.length === 1 ? 'relation' : 'relations'}`;
      }
      return String(value);

    default:
      return String(value);
  }
}

export function calculateAggregation(
  type: AggregationType,
  rows: DatabaseRow[],
  property: PropertyDefinition
): string | number {
  if (type === 'none') {
    return '';
  }

  const totalCount = rows.length;

  if (type === 'count_all') {
    return totalCount;
  }

  // Extract raw non-empty values
  const nonNullValues = rows
    .map((row) => (property.type === 'title' ? row.title : row.properties[property.id]))
    .filter((val) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string' && val.trim() === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    });

  const countValues = nonNullValues.length;
  const countEmpty = totalCount - countValues;

  if (type === 'count_values' || type === 'count_not_empty') {
    return countValues;
  }

  if (type === 'count_empty') {
    return countEmpty;
  }

  if (type === 'percent_empty') {
    if (totalCount === 0) return '0%';
    const pct = Math.round((countEmpty / totalCount) * 100);
    return `${pct}%`;
  }

  if (type === 'count_unique') {
    const uniqueSet = new Set<string>();
    nonNullValues.forEach((v) => {
      if (Array.isArray(v)) {
        uniqueSet.add(JSON.stringify(v));
      } else {
        uniqueSet.add(String(v));
      }
    });
    return uniqueSet.size;
  }

  if (type === 'count_checked') {
    return rows.filter((row) => Boolean(row.properties[property.id])).length;
  }

  if (type === 'count_unchecked') {
    return rows.filter((row) => !Boolean(row.properties[property.id])).length;
  }

  // Number / Date based aggregations
  const numericValues: number[] = [];
  rows.forEach((row) => {
    const val = property.type === 'title' ? row.title : row.properties[property.id];
    if (val !== null && val !== undefined && val !== '') {
      if (typeof val === 'number' && !isNaN(val)) {
        numericValues.push(val);
      } else if (property.type === 'date' || property.type === 'created_time' || property.type === 'last_edited_time') {
        const time = new Date(val).getTime();
        if (!isNaN(time)) {
          numericValues.push(time);
        }
      } else if (typeof val === 'string' && !isNaN(Number(val))) {
        numericValues.push(Number(val));
      }
    }
  });

  if (type === 'sum') {
    if (numericValues.length === 0) return 0;
    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum * 100) / 100;
  }

  if (type === 'average') {
    if (numericValues.length === 0) return 0;
    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / numericValues.length) * 100) / 100;
  }

  if (type === 'median') {
    if (numericValues.length === 0) return 0;
    const sorted = [...numericValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return Math.round(sorted[mid] * 100) / 100;
    }
    const median = (sorted[mid - 1] + sorted[mid]) / 2;
    return Math.round(median * 100) / 100;
  }

  if (type === 'min') {
    if (numericValues.length === 0) return '-';
    const minVal = Math.min(...numericValues);
    if (property.type === 'date') {
      return new Date(minVal).toISOString().split('T')[0];
    }
    return minVal;
  }

  if (type === 'max') {
    if (numericValues.length === 0) return '-';
    const maxVal = Math.max(...numericValues);
    if (property.type === 'date') {
      return new Date(maxVal).toISOString().split('T')[0];
    }
    return maxVal;
  }

  if (type === 'range') {
    if (numericValues.length === 0) return 0;
    const minVal = Math.min(...numericValues);
    const maxVal = Math.max(...numericValues);
    return Math.round((maxVal - minVal) * 100) / 100;
  }

  return '';
}
