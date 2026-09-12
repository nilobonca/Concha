import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Pencil, Link as LinkIcon } from 'lucide-react';

export interface UrlCellProps {
  value: string;
  onUpdate: (newValue: string) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  autoFocus?: boolean;
}

export const UrlCell: React.FC<UrlCellProps> = ({
  value,
  onUpdate,
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
      onUpdate(draft.trim());
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

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    const url = value.startsWith('http://') || value.startsWith('https://')
      ? value
      : `https://${value}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isEditing) {
    return (
      <div className="flex items-center w-full h-full px-2">
        <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
        <input
          ref={inputRef}
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm text-stone-800 dark:text-[#F4F0E6] outline-none border-b border-[#52B1FF] py-0.5"
          placeholder="https://exemplo.com"
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEdit}
      className="group relative flex items-center justify-between w-full h-full px-2 py-1 select-none rounded hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors overflow-hidden"
    >
      <div className="flex items-center min-w-0 pr-1 gap-1.5 flex-1">
        <LinkIcon className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
        {value ? (
          <span
            onClick={handleOpenLink}
            className="text-sm truncate text-[#1831D7] dark:text-[#52B1FF] hover:underline cursor-pointer"
          >
            {value}
          </span>
        ) : (
          <span className="text-sm text-stone-400 dark:text-[#B4D3F1]/30 italic truncate cursor-default">
            Vazio
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {value && (
          <button
            type="button"
            onClick={handleOpenLink}
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/60 dark:hover:text-white cursor-pointer"
            title="Abrir link em nova aba"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startEdit();
          }}
          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/60 dark:hover:text-white cursor-pointer"
          title="Editar URL"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
