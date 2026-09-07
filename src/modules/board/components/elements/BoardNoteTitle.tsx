import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

export interface BoardNoteTitleProps {
  title?: string;
  isEditing?: boolean;
  themeBorder?: string;
  onUpdateTitle?: (newTitle: string) => void;
  className?: string;
}

export const BoardNoteTitle: React.FC<BoardNoteTitleProps> = ({
  title,
  onUpdateTitle,
  className,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title || '');

  useEffect(() => {
    setDraftTitle(title || '');
  }, [title]);

  const handleFinish = () => {
    setIsRenaming(false);
    if (draftTitle.trim() && draftTitle.trim() !== (title || '')) {
      onUpdateTitle?.(draftTitle.trim());
    }
  };

  return (
    <div
      style={{ top: -26, left: 6 }}
      className={clsx(
        "absolute z-30 select-none pointer-events-auto flex items-center max-w-[calc(100%-12px)]",
        className
      )}
      onPointerDown={(e) => {
        if (isRenaming) e.stopPropagation();
      }}
      onClick={(e) => {
        if (isRenaming) e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onUpdateTitle) {
          setIsRenaming(true);
        }
      }}
    >
      {isRenaming ? (
        <input
          type="text"
          autoFocus
          value={draftTitle}
          placeholder="Título da nota..."
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={handleFinish}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              handleFinish();
            } else if (e.key === 'Escape') {
              setDraftTitle(title || '');
              setIsRenaming(false);
            }
          }}
          className="text-xs font-medium text-stone-700 dark:text-neutral-200 bg-white/90 dark:bg-[#181822]/90 backdrop-blur-xs border-b border-[#1831D7] dark:border-[#7F95FF] outline-none px-1 py-0.5 rounded shadow-2xs min-w-[60px] max-w-[220px]"
        />
      ) : (
        <span
          className="text-xs font-medium text-stone-600 dark:text-neutral-400 truncate tracking-tight hover:text-stone-900 dark:hover:text-neutral-200 transition-colors cursor-text"
          title={title ? `${title} (duplo clique para renomear)` : 'Sem título (duplo clique para renomear)'}
        >
          {title || 'Sem título'}
        </span>
      )}
    </div>
  );
};
