import React, { useState, useRef, useEffect } from 'react';
import { PropertyDefinition } from '../../types';
import { formatPropertyValue } from '../../utils/databaseCalculations';

export interface NumberCellProps {
  value: number | null | undefined;
  property: PropertyDefinition;
  onUpdate: (newValue: number | null) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  autoFocus?: boolean;
}

export const NumberCell: React.FC<NumberCellProps> = ({
  value,
  property,
  onUpdate,
  isEditing: controlledIsEditing,
  onStartEditing,
  onStopEditing,
  autoFocus = false,
}) => {
  const [internalEditing, setInternalEditing] = useState<boolean>(autoFocus);
  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : internalEditing;
  const [draft, setDraft] = useState<string>(
    value !== null && value !== undefined ? String(value) : ''
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value !== null && value !== undefined ? String(value) : '');
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
    const cleanStr = draft.trim();
    if (cleanStr === '') {
      if (value !== null && value !== undefined) {
        onUpdate(null);
      }
      return;
    }

    const parsed = Number(cleanStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed !== value) {
      onUpdate(parsed);
    } else if (isNaN(parsed)) {
      setDraft(value !== null && value !== undefined ? String(value) : '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDraft(value !== null && value !== undefined ? String(value) : '');
      stopEdit();
    }
  };

  const formattedDisplay = formatPropertyValue(value, property);

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
          className="w-full text-right bg-transparent text-sm font-mono text-stone-800 dark:text-[#F4F0E6] outline-none border-b border-[#52B1FF] py-0.5"
          placeholder="0"
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEdit}
      className="flex items-center justify-end w-full h-full px-2 py-1 cursor-pointer select-none rounded hover:bg-stone-100/70 dark:hover:bg-white/5 transition-colors overflow-hidden"
    >
      <span
        className={`text-sm font-mono tabular-nums truncate ${
          value !== null && value !== undefined
            ? 'text-stone-800 dark:text-[#F4F0E6]'
            : 'text-stone-400 dark:text-[#B4D3F1]/30 italic'
        }`}
      >
        {formattedDisplay || 'Vazio'}
      </span>
    </div>
  );
};
