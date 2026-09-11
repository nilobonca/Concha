import React, { useState } from 'react';
import { 
  FolderKanban, 
  Music, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Folder, 
  ArrowUpRight 
} from 'lucide-react';
import { Layer } from '@/interfaces/utils/indexedDB';
import clsx from 'clsx';

export interface CanvasAdaptiveCardProps {
  canvas: Layer;
  pageCount?: number;
  onOpen: (canvas: Layer) => void;
  onRename?: (canvasId: string, newName: string) => void;
  onDelete?: (canvas: Layer) => void;
  onUpdateCanvas?: (updated: Layer) => void;
}

export const CanvasAdaptiveCard: React.FC<CanvasAdaptiveCardProps> = ({
  canvas,
  pageCount = 1,
  onOpen,
  onRename,
  onDelete,
  onUpdateCanvas,
}) => {
  const isBoard = canvas.canvasType === 'board';
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(canvas.name);

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(canvas.name);
    setIsEditing(true);
  };

  const handleSave = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    const trimmed = editName.trim();
    if (trimmed && trimmed !== canvas.name) {
      if (onRename) {
        onRename(canvas.id, trimmed);
      } else if (onUpdateCanvas) {
        onUpdateCanvas({ ...canvas, name: trimmed });
      }
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(canvas.name);
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(canvas);
    }
  };

  return (
    <div
      onClick={() => onOpen(canvas)}
      className="group relative rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#131524] hover:border-[#7F95FF]/40 dark:hover:border-[#7F95FF]/40 p-3 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Icon & Titles */}
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div
            className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              isBoard 
                ? "bg-[#1831D7]/20 text-[#1831D7] dark:bg-[#7F95FF]/20 dark:text-[#7F95FF]"
                : "bg-[#52B1FF]/20 text-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF]"
            )}
          >
            {isBoard ? <FolderKanban size={15} /> : <Music size={15} />}
          </div>

          <div className="flex-1 min-w-0">
            {/* Category Badge */}
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={clsx(
                  "text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                  isBoard ? "bg-[#1831D7]/15 text-[#1831D7] dark:bg-[#7F95FF]/20 dark:text-[#7F95FF] border-[#7F95FF]/30" : "bg-[#52B1FF]/15 text-[#52B1FF] border-[#52B1FF]/30"
                )}
              >
                {isBoard ? 'Conexões' : 'Áudio RPG'}
              </span>

              {canvas.folderPath && (
                <span className="text-[10px] text-stone-500 dark:text-neutral-400 flex items-center gap-0.5 truncate max-w-[120px]">
                  <Folder size={10} />
                  {canvas.folderPath}
                </span>
              )}
            </div>

            {/* Title / Inline Rename */}
            {isEditing ? (
              <div 
                className="flex items-center gap-1 mt-1" 
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(e);
                    if (e.key === 'Escape') handleCancel(e as unknown as React.MouseEvent);
                  }}
                  autoFocus
                  className="w-full bg-white dark:bg-black/60 border border-[#7F95FF] rounded px-1.5 py-0.5 text-xs font-semibold text-stone-900 dark:text-white outline-none"
                />
                <button
                  onClick={handleSave}
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  title="Salvar Nome"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Cancelar"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <h4 className="text-xs sm:text-[13px] font-bold text-stone-900 dark:text-[#F4F0E6] line-clamp-1 group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] transition-colors">
                {canvas.name}
              </h4>
            )}

            {/* Sub-metrics */}
            <div className="flex items-center gap-2 text-[10px] text-stone-600 dark:text-[#B4D3F1]/70 font-medium mt-1">
              <span>{isBoard ? 'Quadro Infinito' : `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}`}</span>
              <span>•</span>
              <span className="font-mono">#{canvas.id.slice(0, 6)}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isEditing && (
            <button
              onClick={handleStartEditing}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-all cursor-pointer"
              title="Renomear"
            >
              <Edit2 size={12} />
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
              title="Excluir Canvas"
            >
              <Trash2 size={12} />
            </button>
          )}

          {/* Quick Open Action Pill */}
          <button
            onClick={() => onOpen(canvas)}
            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#1831D7] hover:text-[#F4F0E6] dark:hover:bg-[#1831D7] dark:hover:text-[#F4F0E6] text-stone-600 dark:text-neutral-300 transition-colors"
            title="Abrir Canvas"
          >
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
