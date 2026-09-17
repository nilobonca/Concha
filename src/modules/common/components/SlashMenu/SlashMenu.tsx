import React, { useEffect, useRef } from 'react';
import { FormattingCommand } from '@/modules/vault/utils/formattingCommands';

export interface SlashMenuProps {
  items: FormattingCommand[];
  selectedIndex: number;
  onSelect: (command: FormattingCommand) => void;
  onClose: () => void;
  position?: { top: number; left: number } | null;
  className?: string;
  id?: string;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({
  items,
  selectedIndex,
  onSelect,
  onClose,
  position,
  className = '',
  id = 'slash-menu',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar o menu em interações externas (pointerdown fora, scroll fora, blur da janela, Escape)
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!menuRef.current || !target) return;
      if (menuRef.current.contains(target)) return;
      const el = target as HTMLElement;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.classList?.contains('ProseMirror')) {
        return;
      }
      onClose();
    };

    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (!menuRef.current || !target) return;
      // Se o scroll ocorreu no próprio menu ou em algum container pai do menu, NÃO fecha
      if (menuRef.current.contains(target) || target.contains(menuRef.current)) {
        return;
      }
      onClose();
    };

    const handleWindowBlur = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  // Rola automaticamente o item ativo para visualização
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
        id={id}
        style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
        className={`absolute z-50 w-72 bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-xl shadow-2xl p-3 text-xs text-stone-500 dark:text-neutral-400 select-none animate-in fade-in zoom-in-95 duration-100 ${className}`}
      >
        Nenhum comando de formatação encontrado.
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      id={id}
      style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
      className={`absolute z-50 w-72 max-h-80 overflow-y-auto bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 custom-scrollbar select-none animate-in fade-in zoom-in-95 duration-100 ${className}`}
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
              onMouseDown={(e) => {
                // Previne a perda de foco do editor ao clicar com o mouse
                e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(cmd);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF]'
                  : 'hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-white dark:bg-white/10 border-[#7F95FF]/40 text-[#1831D7] dark:text-[#7F95FF]'
                      : 'bg-stone-100 dark:bg-white/5 border-stone-200/60 dark:border-white/10 text-stone-500 dark:text-neutral-400'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-normal text-stone-900 dark:text-neutral-100 truncate">
                    {cmd.title}
                  </div>
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
