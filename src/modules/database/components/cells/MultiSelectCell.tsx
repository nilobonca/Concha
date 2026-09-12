import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Plus, Search } from 'lucide-react';
import { SelectOption, PropertyOptionColor, SELECT_OPTION_COLOR_MAP } from '../../types';

export interface MultiSelectCellProps {
  value: string[] | null | undefined;
  options?: SelectOption[];
  onUpdate: (optionIds: string[]) => void;
  onCreateOption?: (name: string, color: PropertyOptionColor) => void;
}

const DEFAULT_COLOR_ORDER: PropertyOptionColor[] = [
  'cyan',
  'purple',
  'rose',
  'blue',
  'amber',
  'green',
  'indigo',
  'gray',
];

export const MultiSelectCell: React.FC<MultiSelectCellProps> = ({
  value,
  options = [],
  onUpdate,
  onCreateOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedIds = Array.isArray(value) ? value : [];

  const selectedOptions = selectedIds
    .map((id) => options.find((opt) => opt.id === id || opt.name === id))
    .filter((opt): opt is SelectOption => opt !== undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      onUpdate(selectedIds.filter((id) => id !== optionId));
    } else {
      onUpdate([...selectedIds, optionId]);
    }
  };

  const removeOption = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(selectedIds.filter((id) => id !== optionId));
  };

  const handleCreateOption = () => {
    if (!search.trim() || !onCreateOption) return;
    const randomColor =
      DEFAULT_COLOR_ORDER[Math.floor(Math.random() * DEFAULT_COLOR_ORDER.length)];
    onCreateOption(search.trim(), randomColor);
    setSearch('');
  };

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center px-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-1 w-full min-h-[28px] px-2 py-0.5 rounded-md hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer text-left overflow-hidden"
      >
        <div className="flex flex-wrap gap-1 items-center overflow-hidden max-h-12 py-0.5">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => {
              const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
              return (
                <span
                  key={opt.id}
                  style={{
                    backgroundColor: color.bg,
                    color: color.text,
                    borderColor: color.border,
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.2 rounded-full border shrink-0 select-none shadow-xs"
                >
                  <span className="truncate max-w-[100px]">{opt.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeOption(opt.id, e)}
                    className="hover:text-white rounded-full p-0.2 hover:bg-black/20"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </span>
              );
            })
          ) : (
            <span className="text-sm text-stone-400 dark:text-[#B4D3F1]/30 italic select-none">
              Vazio
            </span>
          )}
        </div>
        <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-[#B4D3F1]/40 dark:group-hover:text-[#B4D3F1] shrink-0 transition-transform ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-1.5 backdrop-blur-md">
          {/* Search Box */}
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-200/50 dark:border-white/5">
            <Search className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ou criar tag..."
              className="w-full bg-transparent text-xs text-stone-800 dark:text-[#F4F0E6] outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 py-1">
            {filteredOptions.map((opt) => {
              const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
              const isSelected = selectedIds.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleOption(opt.id)}
                  className="flex items-center justify-between w-full px-2 py-1 rounded-md text-xs hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <span
                    style={{
                      backgroundColor: color.bg,
                      color: color.text,
                      borderColor: color.border,
                    }}
                    className="px-2 py-0.5 rounded-full border text-xs font-medium truncate"
                  >
                    {opt.name}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#52B1FF] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {filteredOptions.length === 0 && search.trim() && onCreateOption && (
              <button
                type="button"
                onClick={handleCreateOption}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-[#52B1FF] hover:bg-[#52B1FF]/10 rounded-md cursor-pointer transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar &quot;{search.trim()}&quot;</span>
              </button>
            )}

            {filteredOptions.length === 0 && !search.trim() && (
              <div className="px-2 py-2 text-center text-xs text-stone-400 dark:text-[#B4D3F1]/40">
                Nenhuma tag
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
