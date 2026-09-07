import React, { useState } from 'react';
import { SquarePen, Palette, Trash2, Focus, Check } from 'lucide-react';
import clsx from 'clsx';

export interface BoardNoteActionsProps {
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  themeBorder: string;
  themes: Record<string, { border: string; bg: string; name: string }>;
  onToggleEdit: () => void;
  onUpdateColor: (color: string) => void;
  onDelete: () => void;
  onCenterElement?: () => void;
  className?: string;
}

export const BoardNoteActions: React.FC<BoardNoteActionsProps> = ({
  isSelected,
  isHovered,
  isEditing,
  themeBorder,
  themes,
  onToggleEdit,
  onUpdateColor,
  onDelete,
  onCenterElement,
  className,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Visível no hover, na seleção ou durante edição
  const isVisible = isSelected || isHovered || isEditing || showColorPicker;

  return (
    <div
      style={{ top: -72 }}
      className={clsx(
        "absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white/95 dark:bg-[#181822]/95 backdrop-blur-md border border-stone-200/90 dark:border-white/10 rounded-xl p-1 shadow-md select-none text-stone-700 dark:text-neutral-200 transition-all duration-150 prevent-item-drag prevent-edit-trigger",
        isVisible ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-95",
        className
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Botão Excluir */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-600 dark:text-neutral-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
        title="Excluir nota"
        aria-label="Excluir nota"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* 2. Botão Cor (Palette) */}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(prev => !prev);
          }}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center relative"
          title="Cor da nota"
          aria-label="Mudar cor da nota"
        >
          <Palette className="w-3.5 h-3.5" />
          <span
            className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-black shadow-2xs"
            style={{ backgroundColor: themeBorder }}
          />
        </button>

        {showColorPicker && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-[#181822] border border-stone-200/90 dark:border-white/10 p-2.5 rounded-2xl shadow-2xl z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateColor(t.border);
                  setShowColorPicker(false);
                }}
                className={clsx(
                  "w-6 h-6 rounded-lg border-2 transition-transform hover:scale-110 cursor-pointer shrink-0",
                  t.border.toLowerCase() === themeBorder.toLowerCase() ? "border-[#1831D7] scale-105" : "border-transparent"
                )}
                style={{
                  backgroundColor: t.border,
                }}
                title={t.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Botão Centralizar Objeto */}
      {onCenterElement && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCenterElement();
          }}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          title="Centralizar objeto no quadro"
          aria-label="Centralizar nota no quadro"
        >
          <Focus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 4. Botão Editar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleEdit();
        }}
        className={clsx(
          "p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center",
          isEditing
            ? "bg-[#1831D7]/15 text-[#1831D7] dark:text-[#7F95FF] hover:bg-[#1831D7]/25"
            : "text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10"
        )}
        title={isEditing ? "Concluir edição (Esc)" : "Editar nota (Clique duplo)"}
        aria-label={isEditing ? "Concluir edição" : "Editar nota"}
      >
        {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <SquarePen className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
