import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, FileText, Plus } from 'lucide-react';

export interface TitleCellProps {
  rowId: string;
  value: string;
  icon?: string;
  onUpdate: (newTitle: string) => void;
  onOpenPeek?: (rowId: string) => void;
  onAddRowAbove?: () => void;
  onAddRowBelow?: () => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  autoFocus?: boolean;
}

export const TitleCell: React.FC<TitleCellProps> = ({
  rowId,
  value,
  icon,
  onUpdate,
  onOpenPeek,
  onAddRowAbove,
  onAddRowBelow,
  isEditing: controlledIsEditing,
  onStartEditing,
  onStopEditing,
  autoFocus = false,
}) => {
  const [internalEditing, setInternalEditing] = useState<boolean>(autoFocus);
  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : internalEditing;
  const [draft, setDraft] = useState<string>(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    if (onStartEditing) {
      onStartEditing();
    } else {
      setInternalEditing(true);
    }
  };

  const stopEdit = () => {
    if (onStopEditing) {
      onStopEditing();
    } else {
      setInternalEditing(false);
    }
  };

  const handleCommit = () => {
    stopEdit();
    if (draft.trim() !== (value || '')) {
      onUpdate(draft.trim() || 'Sem título');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(value || '');
      stopEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center w-full h-full px-2">
        {icon ? (
          <span className="mr-2 text-base select-none">{icon}</span>
        ) : (
          <FileText className="w-4 h-4 mr-2 text-stone-400 dark:text-[#B4D3F1]/60 shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm font-medium text-stone-800 dark:text-[#F4F0E6] outline-none border-b border-[#52B1FF] dark:border-[#52B1FF] py-0.5"
          placeholder="Sem título"
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEdit}
      className="group relative flex items-center justify-between w-full h-full px-2 py-1 cursor-pointer select-none rounded hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors"
    >
      <div className="flex items-center min-w-0 pr-2 gap-1.5 flex-1">
        {icon ? (
          <span className="text-base leading-none select-none">{icon}</span>
        ) : (
          <FileText className="w-4 h-4 text-stone-400 dark:text-[#B4D3F1]/60 shrink-0" />
        )}
        <span
          className={`text-sm truncate font-medium ${
            value
              ? 'text-stone-900 dark:text-[#F4F0E6]'
              : 'text-stone-400 dark:text-[#B4D3F1]/40 italic'
          }`}
        >
          {value || 'Sem título'}
        </span>
      </div>

      {/* Hover Actions: "+" (below or Ctrl+click above) & "Abrir" */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
        {(onAddRowAbove || onAddRowBelow) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                onAddRowAbove?.();
              } else {
                onAddRowBelow?.();
              }
            }}
            className="flex items-center justify-center w-5 h-5 rounded text-stone-500 hover:text-stone-800 dark:text-[#B4D3F1]/70 dark:hover:text-[#F4F0E6] hover:bg-stone-200/80 dark:hover:bg-white/10 transition-all cursor-pointer"
            title="Adicionar nota abaixo (Ctrl+Clique para adicionar acima)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenPeek && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPeek(rowId);
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-stone-600 dark:text-[#B4D3F1] bg-stone-200/80 dark:bg-white/10 hover:bg-[#1831D7] hover:text-white dark:hover:bg-[#1831D7] dark:hover:text-white transition-all shadow-xs cursor-pointer"
            title="Abrir nota"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Abrir</span>
          </button>
        )}
      </div>
    </div>
  );
};
