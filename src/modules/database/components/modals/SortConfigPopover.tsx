import React from 'react';
import { Plus, Trash2, X, ArrowDownUp, ArrowUp, ArrowDown } from 'lucide-react';
import { PropertyDefinition, SortRule, SortDirection } from '../../types';

export interface SortConfigPopoverProps {
  isOpen: boolean;
  properties: PropertyDefinition[];
  sorts: SortRule[];
  onUpdateSorts: (newSorts: SortRule[]) => void;
  onClose: () => void;
}

export const SortConfigPopover: React.FC<SortConfigPopoverProps> = ({
  isOpen,
  properties,
  sorts,
  onUpdateSorts,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleAddSort = () => {
    // Pick first property not already sorted
    const existingIds = new Set(sorts.map((s) => s.propertyId));
    const candidate = properties.find((p) => !existingIds.has(p.id)) || properties[0];
    if (!candidate) return;

    onUpdateSorts([...sorts, { propertyId: candidate.id, direction: 'asc' }]);
  };

  const handleUpdateSort = (index: number, updates: Partial<SortRule>) => {
    const updated = sorts.map((s, idx) => (idx === index ? { ...s, ...updates } : s));
    onUpdateSorts(updated);
  };

  const handleToggleDirection = (index: number) => {
    const current = sorts[index];
    const newDir: SortDirection = current.direction === 'asc' ? 'desc' : 'asc';
    handleUpdateSort(index, { direction: newDir });
  };

  const handleRemoveSort = (index: number) => {
    onUpdateSorts(sorts.filter((_, idx) => idx !== index));
  };

  const handleClearAll = () => {
    onUpdateSorts([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-[#52B1FF]" />
            <h3 className="text-sm font-semibold text-stone-800 dark:text-[#F4F0E6]">
              Ordenar Registros
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sort Rules List */}
        <div className="p-5 space-y-2.5 max-h-72 overflow-y-auto">
          {sorts.map((sortRule, idx) => (
            <div
              key={`${sortRule.propertyId}_${idx}`}
              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/70 dark:border-white/5 text-xs"
            >
              <div className="text-[11px] font-semibold text-stone-400 dark:text-[#B4D3F1]/60 w-6">
                #{idx + 1}
              </div>

              {/* Property Select */}
              <select
                value={sortRule.propertyId}
                onChange={(e) => handleUpdateSort(idx, { propertyId: e.target.value })}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#232742] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-[#F4F0E6] outline-none"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Direction Toggle */}
              <button
                type="button"
                onClick={() => handleToggleDirection(idx)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#232742] border border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer font-medium"
              >
                {sortRule.direction === 'asc' ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 text-[#52B1FF]" />
                    <span>Crescente</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 text-[#7F95FF]" />
                    <span>Decrescente</span>
                  </>
                )}
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemoveSort(idx)}
                className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                title="Remover ordenação"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {sorts.length === 0 && (
            <div className="py-6 text-center text-xs text-stone-400 dark:text-[#B4D3F1]/50">
              Nenhuma ordenação ativa. A ordem original das linhas será usada.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/5">
          <button
            type="button"
            onClick={handleAddSort}
            disabled={sorts.length >= properties.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1831D7] dark:text-[#52B1FF] hover:bg-[#1831D7]/10 dark:hover:bg-[#52B1FF]/10 disabled:opacity-40 rounded-lg cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar ordenação</span>
          </button>

          {sorts.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rose-500 hover:underline cursor-pointer"
            >
              Limpar todas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
