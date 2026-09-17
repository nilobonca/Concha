import React, { useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';

export interface DatabaseHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  totalRows: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateDescription?: (desc: string) => void;
  onExportMarkdown?: () => void;
  isSaving?: boolean;
  isInline?: boolean;
}

export const DatabaseHeader: React.FC<DatabaseHeaderProps> = ({
  title,
  totalRows,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onUpdateTitle,
  isSaving,
  isInline = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== title) {
      onUpdateTitle(titleDraft.trim());
    } else {
      setTitleDraft(title);
    }
  };

  return (
    <div className={`select-none ${isInline ? 'px-4 pt-3 pb-1' : 'px-6 pt-5 pb-2'}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Title Section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {!isInline && (
            isEditingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleBlur();
                }}
                autoFocus
                className="text-2xl sm:text-3xl font-bold tracking-tight bg-transparent text-stone-900 dark:text-[#F4F0E6] outline-none border-b-2 border-[#52B1FF] py-0.5 w-full max-w-xl"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-[#F4F0E6] truncate cursor-pointer hover:opacity-80 transition-opacity"
                title="Clique para renomear a base de dados"
              >
                {title || 'Base de Dados'}
              </h1>
            )
          )}

          {/* Record Count Badge */}
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-[#B4D3F1] shrink-0">
            {totalRows} {totalRows === 1 ? 'registro' : 'registros'}
          </span>

          {isSaving && (
            <span className="text-[10px] text-stone-400 dark:text-[#B4D3F1]/60 italic animate-pulse">
              Salvando...
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/60 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/60 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
