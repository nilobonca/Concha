import React, { useState } from 'react';
import { Search, Filter, ArrowDownUp, SlidersHorizontal, Plus, X } from 'lucide-react';

export interface DatabaseToolbarActionsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  onOpenFilterConfig?: () => void;
  activeSortCount?: number;
  onOpenSortConfig?: () => void;
  onOpenViewSettings?: () => void;
  onAddNewRow?: () => void;
}

export const DatabaseToolbarActions: React.FC<DatabaseToolbarActionsProps> = ({
  searchQuery = '',
  onSearchChange,
  activeFilterCount = 0,
  onOpenFilterConfig,
  activeSortCount = 0,
  onOpenSortConfig,
  onOpenViewSettings,
  onAddNewRow,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));

  return (
    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
      {/* 1. Filter Button */}
      {onOpenFilterConfig && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onOpenFilterConfig}
          title="Filtro"
          className={`flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
            activeFilterCount > 0
              ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] px-2'
              : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#1831D7] dark:bg-[#52B1FF] text-white dark:text-[#17192A] text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* 2. Sort Button */}
      {onOpenSortConfig && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onOpenSortConfig}
          title="Ordenar"
          className={`flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
            activeSortCount > 0
              ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] px-2'
              : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5'
          }`}
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {activeSortCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#1831D7] dark:bg-[#52B1FF] text-white dark:text-[#17192A] text-[10px] font-bold flex items-center justify-center">
              {activeSortCount}
            </span>
          )}
        </button>
      )}

      {/* 3. Search Bar */}
      {onSearchChange && (
        isSearchOpen || searchQuery ? (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-300 dark:border-white/10 w-44 sm:w-52 shrink-0 transition-all"
          >
            <Search className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (!searchQuery) setIsSearchOpen(false);
                  else onSearchChange('');
                }
              }}
              autoFocus
              placeholder="Pesquisar..."
              className="w-full bg-transparent text-xs text-stone-800 dark:text-[#F4F0E6] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setIsSearchOpen(false);
              }}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
              title="Fechar pesquisa"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setIsSearchOpen(true)}
            className="p-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Pesquisar"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )
      )}

      {/* 4. View Settings Button */}
      {onOpenViewSettings && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onOpenViewSettings}
          className="p-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          title="Visualização"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 5. New Row Button */}
      {onAddNewRow && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onAddNewRow}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1831D7] hover:bg-[#1831D7]/90 text-white dark:bg-[#7F95FF] dark:text-[#17192A] transition-all shadow-xs cursor-pointer shrink-0 ml-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo</span>
        </button>
      )}
    </div>
  );
};
