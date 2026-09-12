import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Circle, Clock, CheckCircle2 } from 'lucide-react';
import { StatusOption, StatusCategory, SELECT_OPTION_COLOR_MAP } from '../../types';
import { DEFAULT_STATUS_OPTIONS } from '../../utils/databaseDefaults';

export interface StatusCellProps {
  value: string | null | undefined;
  options?: StatusOption[];
  onUpdate: (statusId: string) => void;
}

const CATEGORY_LABELS: Record<StatusCategory, { label: string; icon: React.ReactNode }> = {
  to_do: {
    label: 'A Fazer',
    icon: <Circle className="w-3 h-3 text-stone-400" />,
  },
  in_progress: {
    label: 'Em Progresso',
    icon: <Clock className="w-3 h-3 text-[#52B1FF]" />,
  },
  done: {
    label: 'Concluído',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  },
};

export const StatusCell: React.FC<StatusCellProps> = ({
  value,
  options = DEFAULT_STATUS_OPTIONS,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((opt) => opt.id === value || opt.name === value) || options[0];

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

  const handleSelect = (optionId: string) => {
    onUpdate(optionId);
    setIsOpen(false);
  };

  const badgeStyle = activeOption
    ? SELECT_OPTION_COLOR_MAP[activeOption.color] || SELECT_OPTION_COLOR_MAP.gray
    : SELECT_OPTION_COLOR_MAP.gray;

  const categories: StatusCategory[] = ['to_do', 'in_progress', 'done'];

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center px-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center justify-between gap-1.5 px-2 py-1 rounded-md hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer select-none overflow-hidden"
      >
        {activeOption ? (
          <span
            style={{
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
              borderColor: badgeStyle.border,
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border truncate shadow-xs"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: badgeStyle.text }}
            />
            {activeOption.name}
          </span>
        ) : (
          <span className="text-sm text-stone-400 dark:text-[#B4D3F1]/30 italic">
            Sem status
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-[#B4D3F1]/40 dark:group-hover:text-[#B4D3F1] shrink-0 transition-transform" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-2 backdrop-blur-md">
          {categories.map((cat) => {
            const catOptions = options.filter((opt) => opt.category === cat);
            if (catOptions.length === 0) return null;
            const meta = CATEGORY_LABELS[cat];

            return (
              <div key={cat} className="mb-2 last:mb-0">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-stone-400 dark:text-[#B4D3F1]/60">
                  {meta.icon}
                  <span>{meta.label}</span>
                </div>
                <div className="space-y-0.5">
                  {catOptions.map((opt) => {
                    const color = SELECT_OPTION_COLOR_MAP[opt.color] || SELECT_OPTION_COLOR_MAP.gray;
                    const isSelected = activeOption?.id === opt.id;

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
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color.text }}
                          />
                          {opt.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#52B1FF] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
