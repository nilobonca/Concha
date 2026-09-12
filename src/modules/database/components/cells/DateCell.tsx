import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X, Check } from 'lucide-react';

export interface DateCellProps {
  value: string | number | null | undefined;
  onUpdate: (newDate: string | null) => void;
}

export const DateCell: React.FC<DateCellProps> = ({ value, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize initial date string YYYY-MM-DD
  const formatDateValue = (val: string | number | null | undefined): string => {
    if (!val) return '';
    try {
      const d = typeof val === 'number' ? new Date(val) : new Date(String(val));
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      // Fallback
    }
    return '';
  };

  const [dateInput, setDateInput] = useState<string>(formatDateValue(value));

  useEffect(() => {
    setDateInput(formatDateValue(value));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = (valToSet?: string | null) => {
    const finalVal = valToSet !== undefined ? valToSet : dateInput || null;
    onUpdate(finalVal);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateInput(today);
    handleApply(today);
  };

  const handleClear = () => {
    setDateInput('');
    handleApply(null);
  };

  const displayString = React.useMemo(() => {
    if (!value) return null;
    try {
      const d = typeof value === 'number' ? new Date(value) : new Date(String(value));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch {
      // Fallback
    }
    return String(value);
  }, [value]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center px-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer select-none text-left overflow-hidden"
      >
        <Calendar className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:text-[#B4D3F1]/50 dark:group-hover:text-[#52B1FF] shrink-0" />
        {displayString ? (
          <span className="text-xs font-medium text-stone-800 dark:text-[#F4F0E6] truncate">
            {displayString}
          </span>
        ) : (
          <span className="text-sm text-stone-400 dark:text-[#B4D3F1]/30 italic truncate">
            Vazio
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-3 backdrop-blur-md">
          <div className="text-xs font-semibold text-stone-500 dark:text-[#B4D3F1] mb-2">
            Selecionar Data
          </div>

          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-stone-800 dark:text-[#F4F0E6] outline-none focus:border-[#52B1FF] transition-colors mb-3"
          />

          <div className="flex items-center justify-between gap-1 border-t border-stone-200/50 dark:border-white/5 pt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2 py-1 text-[11px] font-medium text-[#1831D7] dark:text-[#52B1FF] hover:bg-[#1831D7]/10 dark:hover:bg-[#52B1FF]/10 rounded-md cursor-pointer transition-colors"
              >
                Hoje
              </button>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleApply()}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#1831D7] hover:bg-[#1831D7]/90 text-white rounded-md cursor-pointer transition-colors shadow-xs"
            >
              <Check className="w-3 h-3" />
              <span>OK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
