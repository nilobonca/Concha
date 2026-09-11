import React from 'react';
import { Trash2, X, Layers } from 'lucide-react';

interface BoardMultiSelectBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}

export const BoardMultiSelectBar: React.FC<BoardMultiSelectBarProps> = ({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}) => {
  if (selectedCount <= 1) return null;

  return (
    <div
      className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-2 bg-neutral-900/95 dark:bg-[#14141C]/95 border border-stone-300 dark:border-white/15 text-white rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-150"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 pr-1 border-r border-white/10">
        <Layers className="w-4 h-4 text-[#7F95FF]" />
        <span className="text-xs font-medium text-neutral-200">
          <strong className="text-white font-semibold font-mono">{selectedCount}</strong> selecionados
        </span>
      </div>

      <button
        onClick={onDeleteSelected}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/15 active:bg-red-500/25 rounded-xl transition-colors cursor-pointer"
        title="Excluir itens selecionados (Delete ou Backspace)"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Excluir</span>
      </button>

      <button
        onClick={onClearSelection}
        className="p-1 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        title="Desmarcar todos (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
