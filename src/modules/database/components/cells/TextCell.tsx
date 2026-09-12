import React, { useState, useRef, useEffect } from 'react';

export interface TextCellProps {
  value: string;
  onUpdate: (newValue: string) => void;
  placeholder?: string;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  autoFocus?: boolean;
}

export const TextCell: React.FC<TextCellProps> = ({
  value,
  onUpdate,
  placeholder = 'Vazio',
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
    if (draft !== (value || '')) {
      onUpdate(draft);
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
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm text-stone-800 dark:text-[#F4F0E6] outline-none border-b border-[#52B1FF] py-0.5"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEdit}
      className="flex items-center w-full h-full px-2 py-1 cursor-pointer select-none rounded hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors overflow-hidden"
    >
      <span
        className={`text-sm truncate ${
          value
            ? 'text-stone-800 dark:text-[#F4F0E6]'
            : 'text-stone-400 dark:text-[#B4D3F1]/30 italic'
        }`}
      >
        {value || placeholder}
      </span>
    </div>
  );
};
