import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowDownUp,
  SlidersHorizontal,
  Plus,
  X,
} from 'lucide-react';

export interface DatabaseToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilterCount: number;
  onOpenFilterConfig: () => void;
  activeSortCount: number;
  onOpenSortConfig: () => void;
  onOpenViewSettings: () => void;
  onAddNewRow: () => void;
  isInline?: boolean;
}

export const DatabaseToolbar: React.FC<DatabaseToolbarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilterCount,
  onOpenFilterConfig,
  activeSortCount,
  onOpenSortConfig,
  onOpenViewSettings,
  onAddNewRow,
  isInline = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));

  return (
    <div className={`flex items-center ${isInline ? 'px-4 py-1.5' : 'px-6 py-2'} border-b border-stone-200 dark:border-white/10 select-none overflow-x-auto`}>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* 1. Filter Button */}
        <button
          type="button"
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

        {/* 2. Sort Button */}
        <button
          type="button"
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

        {/* 3. Search Bar behind a Button */}
        {isSearchOpen || searchQuery ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-300 dark:border-white/10 w-56 shrink-0 transition-all">
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
            onClick={() => setIsSearchOpen(true)}
            className="p-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Pesquisar"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 4. View Settings Button */}
        <button
          type="button"
          onClick={onOpenViewSettings}
          className="p-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          title="Visualização"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* 5. New Row Button */}
        <button
          type="button"
          onClick={onAddNewRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1831D7] hover:bg-[#1831D7]/90 text-white dark:bg-[#7F95FF] dark:text-[#17192A] transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo</span>
        </button>
      </div>
    </div>
  );
};
