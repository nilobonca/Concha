import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

export interface BoardAddCardProps {
  onAddCard: (title: string) => void;
}

export const BoardAddCard: React.FC<BoardAddCardProps> = ({ onAddCard }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleCommit = () => {
    if (titleDraft.trim()) {
      onAddCard(titleDraft.trim());
      setTitleDraft('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      setTitleDraft('');
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="bg-white dark:bg-[#1E2238] rounded-xl border border-[#52B1FF] p-2 shadow-xs space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCommit}
          placeholder="Nome do cartão..."
          className="w-full bg-transparent text-xs text-stone-800 dark:text-[#F4F0E6] outline-none"
        />
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-400 dark:text-[#B4D3F1]/40">Enter para salvar</span>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-1.5 w-full py-1.5 px-2 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/50 dark:hover:text-[#F4F0E6] hover:bg-stone-200/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" />
      <span>Novo cartão</span>
    </button>
  );
};
