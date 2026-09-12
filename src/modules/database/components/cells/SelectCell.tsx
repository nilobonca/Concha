import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Plus, Search } from 'lucide-react';
import { SelectOption, PropertyOptionColor, SELECT_OPTION_COLOR_MAP } from '../../types';

export interface SelectCellProps {
  value: string | null | undefined;
  options?: SelectOption[];
  onUpdate: (optionId: string | null) => void;
  onCreateOption?: (name: string, color: PropertyOptionColor) => void;
}

const DEFAULT_COLOR_ORDER: PropertyOptionColor[] = [
  'blue',
  'cyan',
  'green',
  'amber',
  'rose',
  'purple',
  'indigo',
  'gray',
];

export const SelectCell: React.FC<SelectCellProps> = ({
  value,
  options = [],
  onUpdate,
  onCreateOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value || opt.name === value);

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

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (optionId: string | null) => {
    onUpdate(optionId);
    setIsOpen(false);
  };

  const handleCreateOption = () => {
    if (!search.trim() || !onCreateOption) return;
    const randomColor =
      DEFAULT_COLOR_ORDER[Math.floor(Math.random() * DEFAULT_COLOR_ORDER.length)];
    onCreateOption(search.trim(), randomColor);
    setSearch('');
  };

  const badgeStyle = selectedOption
    ? SELECT_OPTION_COLOR_MAP[selectedOption.color] || SELECT_OPTION_COLOR_MAP.gray
    : null;

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center px-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-1 max-w-full px-2 py-0.5 rounded-md hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer text-left overflow-hidden"
      >
        {selectedOption && badgeStyle ? (
          <span
            style={{
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
              borderColor: badgeStyle.border,
            }}
            className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border truncate select-none shadow-xs"
          >
            {selectedOption.name}
          </span>
        ) : (
          <span className="text-sm text-stone-400 dark:text-[#B4D3F1]/30 italic truncate select-none">
            Vazio
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-[#B4D3F1]/40 dark:group-hover:text-[#B4D3F1] shrink-0 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-1.5 backdrop-blur-md">
          {/* Search Box */}
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-200/50 dark:border-white/5">
            <Search className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ou criar..."
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
          <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
            {selectedOption && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="flex items-center gap-2 w-full px-2 py-1 text-xs text-stone-500 dark:text-[#B4D3F1]/70 hover:bg-stone-100 dark:hover:bg-white/5 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                <span>Limpar seleção</span>
              </button>
            )}

            {filteredOptions.map((opt) => {
              const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
              const isSelected = selectedOption?.id === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
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
                Nenhuma opção
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
