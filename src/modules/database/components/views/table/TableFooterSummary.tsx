import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { DatabaseRow, PropertyDefinition, AggregationType, AGGREGATION_OPTIONS } from '../../../types';
import { calculateAggregation } from '../../../utils/databaseCalculations';

export interface TableFooterSummaryProps {
  rows: DatabaseRow[];
  properties: PropertyDefinition[];
  columnWidths: Record<string, number>;
}

export const TableFooterSummary: React.FC<TableFooterSummaryProps> = ({
  rows,
  properties,
  columnWidths,
}) => {
  // Store custom selected aggregations per property
  const [aggregations, setAggregations] = useState<Record<string, AggregationType>>({});
  const [activeMenuPropId, setActiveMenuPropId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuPropId(null);
      }
    }
    if (activeMenuPropId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuPropId]);

  const handleSelectAggregation = (propId: string, agg: AggregationType) => {
    setAggregations((prev) => ({ ...prev, [propId]: agg }));
    setActiveMenuPropId(null);
  };

  return (
    <div className="sticky bottom-0 z-10 flex border-t border-stone-200 dark:border-white/10 bg-stone-100/90 dark:bg-[#1E2238] backdrop-blur-xs min-w-max">
      {/* Index spacer */}
      <div className="w-10 min-w-[40px] h-8 border-r border-stone-200 dark:border-white/10 shrink-0" />

      {/* Column Summaries */}
      {properties.map((prop) => {
        const width = columnWidths[prop.id] || prop.width || 180;
        // Default aggregation: Count all for title, sum for number, none for others
        const currentAgg =
          aggregations[prop.id] !== undefined
            ? aggregations[prop.id]
            : prop.type === 'title'
            ? 'count_all'
            : prop.type === 'number'
            ? 'sum'
            : 'none';

        const summaryValue =
          currentAgg !== 'none' ? calculateAggregation(currentAgg, rows, prop) : '';

        const compatibleOptions = AGGREGATION_OPTIONS.filter(
          (opt) =>
            opt.compatibleTypes.includes('all') ||
            opt.compatibleTypes.includes(prop.type)
        );

        return (
          <div
            key={prop.id}
            style={{ width: `${width}px`, minWidth: `${width}px` }}
            className="relative h-8 flex items-center justify-between px-2 border-r border-stone-200 dark:border-white/10 select-none shrink-0"
          >
            <button
              type="button"
              onClick={() =>
                setActiveMenuPropId(activeMenuPropId === prop.id ? null : prop.id)
              }
              className="group flex items-center justify-between w-full h-full px-1 rounded hover:bg-stone-200/50 dark:hover:bg-white/5 cursor-pointer text-right transition-colors"
            >
              <span className="text-[11px] font-mono tabular-nums text-stone-600 dark:text-[#B4D3F1] truncate">
                {summaryValue !== '' && `${currentAgg.replace(/_/g, ' ')}: `}
                <strong>{summaryValue}</strong>
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-[#B4D3F1]/40 dark:group-hover:text-[#F4F0E6] shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Aggregation Picker Menu */}
            {activeMenuPropId === prop.id && (
              <div
                ref={menuRef}
                className="absolute bottom-full left-0 mb-1 w-44 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-1 backdrop-blur-md max-h-48 overflow-y-auto"
              >
                {compatibleOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleSelectAggregation(prop.id, opt.type)}
                    className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left ${
                      currentAgg === opt.type
                        ? 'bg-[#1831D7] text-white font-medium'
                        : 'text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
