import React, { useEffect, useRef } from 'react';
import { FormattingCommand } from '../utils/formattingCommands';

interface VaultSlashMenuProps {
  items: FormattingCommand[];
  selectedIndex: number;
  onSelect: (command: FormattingCommand) => void;
  onClose: () => void;
  position?: { top: number; left: number } | null;
}

export const VaultSlashMenu: React.FC<VaultSlashMenuProps> = ({
  items,
  selectedIndex,
  onSelect,
  position
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const activeEl = menuRef.current.querySelector('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div 
        ref={menuRef}
        style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
        className="absolute z-50 w-72 bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-xl shadow-2xl p-3 text-xs text-stone-500 dark:text-neutral-400 select-none animate-in fade-in zoom-in-95 duration-100"
      >
        Nenhum comando de formatação encontrado.
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
      className="absolute z-50 w-72 max-h-80 overflow-y-auto bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 custom-scrollbar select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-stone-600 dark:text-neutral-500 uppercase border-b border-stone-100 dark:border-white/5 mb-1">
        Comandos de Formatação
      </div>

      <div className="space-y-0.5">
        {items.map((cmd, idx) => {
          const isSelected = idx === selectedIndex;
          const IconComponent = cmd.icon;

          return (
            <button
              key={cmd.id}
              data-selected={isSelected ? 'true' : 'false'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(cmd);
              }}
              onMouseEnter={() => {
                // optional highlight on hover
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF]'
                  : 'hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                  isSelected
                    ? 'bg-white dark:bg-white/10 border-[#7F95FF]/40 text-[#1831D7] dark:text-[#7F95FF]'
                    : 'bg-stone-100 dark:bg-white/5 border-stone-200/60 dark:border-white/10 text-stone-500 dark:text-neutral-400'
                }`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-stone-900 dark:text-neutral-100 truncate">{cmd.title}</div>
                  <div className="text-[10px] text-stone-600 dark:text-neutral-400 truncate leading-tight">
                    {cmd.description}
                  </div>
                </div>
              </div>

              {cmd.shortcut && (
                <span className="text-[10px] font-mono text-stone-600 dark:text-neutral-400 px-1 py-0.5 rounded bg-stone-100 dark:bg-white/5 shrink-0 ml-2 font-medium">
                  {cmd.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
