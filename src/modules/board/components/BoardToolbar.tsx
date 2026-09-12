import React from 'react';
import { StickyNote, Type, Database, Search, HelpCircle, Undo2, Redo2 } from 'lucide-react';
import { BoardElementType } from '../types';
import clsx from 'clsx';

interface BoardToolbarProps {
  onAddNote: () => void;
  onAddText: () => void;
  onAddDatabase?: () => void;
  onOpenVaultSearch: () => void;
  onToolDragStart?: (tool: BoardElementType | 'vault-search') => void;
  onToolDragEnd?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  onAddNote,
  onAddText,
  onAddDatabase,
  onOpenVaultSearch,
  onToolDragStart,
  onToolDragEnd,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const [showHint, setShowHint] = React.useState(false);

  const handleDragStart = (e: React.DragEvent, tool: BoardElementType | 'vault-search') => {
    e.dataTransfer.setData('application/rpgsa-board-tool', tool);
    e.dataTransfer.effectAllowed = 'copy';
    onToolDragStart?.(tool);

    // Usa imagem transparente de drag para que o ghost do elemento na grade do canvas seja o preview principal
    const img = new Image();
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
    if (e.dataTransfer.setDragImage) {
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
      {/* Tooltip de instrução de conexões */}
      {showHint && (
        <div className="pointer-events-auto bg-white/95 dark:bg-[#161622]/95 border border-[#7F95FF]/40 text-stone-800 dark:text-neutral-200 text-xs py-2 px-3.5 rounded-xl shadow-xl backdrop-blur-md max-w-xs text-center animate-in fade-in slide-in-from-bottom-2 duration-150">
          <p className="font-semibold text-[#1831D7] dark:text-[#7F95FF] mb-0.5">Como ligar com setas?</p>
          <p className="text-[11px] text-stone-500 dark:text-neutral-400">
            Passe o mouse sobre qualquer elemento e arraste uma seta a partir do <strong>ponto central de qualquer uma das 4 bordas</strong>. Se soltar no vazio, um novo elemento do mesmo tipo será criado e conectado automaticamente!
          </p>
        </div>
      )}

      {/* Dock de Ferramentas */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-white/85 dark:bg-[#14141C]/85 border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl text-stone-700 dark:text-neutral-300">
        {/* Adicionar Nota */}
        <button
          onClick={onAddNote}
          draggable
          onDragStart={(e) => handleDragStart(e, 'note')}
          onDragEnd={() => onToolDragEnd?.()}
          className="flex items-center gap-2 px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl hover:text-stone-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 group text-xs font-medium cursor-grab active:cursor-grabbing"
          title="Clique ou arraste para o canvas"
        >
          <div className="w-5 h-5 rounded-md badge-pastel-amber flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5" />
          </div>
          <span>Nota</span>
        </button>

        {/* Adicionar Texto */}
        <button
          onClick={onAddText}
          draggable
          onDragStart={(e) => handleDragStart(e, 'text')}
          onDragEnd={() => onToolDragEnd?.()}
          className="flex items-center gap-2 px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl hover:text-stone-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 group text-xs font-medium cursor-grab active:cursor-grabbing"
          title="Clique ou arraste para o canvas"
        >
          <div className="w-5 h-5 rounded-md badge-pastel-lavender flex items-center justify-center">
            <Type className="w-3.5 h-3.5" />
          </div>
          <span>Texto</span>
        </button>

        {/* Adicionar Base de Dados */}
        {onAddDatabase && (
          <button
            onClick={onAddDatabase}
            draggable
            onDragStart={(e) => handleDragStart(e, 'database')}
            onDragEnd={() => onToolDragEnd?.()}
            className="flex items-center gap-2 px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl hover:text-stone-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 group text-xs font-medium cursor-grab active:cursor-grabbing"
            title="Clique ou arraste para o canvas"
          >
            <div className="w-5 h-5 rounded-md bg-[#52B1FF]/20 text-[#52B1FF] flex items-center justify-center">
              <Database className="w-3.5 h-3.5" />
            </div>
            <span>Base de Dados</span>
          </button>
        )}

        {/* Adicionar do Vault (Áudio, Imagem, Preview, Notas) */}
        <button
          onClick={onOpenVaultSearch}
          draggable
          onDragStart={(e) => handleDragStart(e, 'vault-search')}
          onDragEnd={() => onToolDragEnd?.()}
          className="flex items-center gap-2 px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl hover:text-stone-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 group text-xs font-medium cursor-grab active:cursor-grabbing"
          title="Buscar e adicionar elementos do Vault (Áudios, Imagens, Quadros, Notas) - Clique ou arraste para o canvas"
        >
          <div className="w-5 h-5 rounded-md badge-pastel-mint flex items-center justify-center">
            <Search className="w-3.5 h-3.5" />
          </div>
          <span>Adicionar do Vault</span>
        </button>

        <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-1" />

        {/* Desfazer (Undo) */}
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={clsx(
              "p-2 rounded-xl transition-all",
              canUndo
                ? "hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 cursor-pointer hover:scale-105 active:scale-95"
                : "opacity-30 cursor-not-allowed text-stone-400 dark:text-neutral-600"
            )}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        )}

        {/* Refazer (Redo) */}
        {onRedo && (
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={clsx(
              "p-2 rounded-xl transition-all",
              canRedo
                ? "hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 cursor-pointer hover:scale-105 active:scale-95"
                : "opacity-30 cursor-not-allowed text-stone-400 dark:text-neutral-600"
            )}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        )}

        {/* Dica de Conexão com Setas */}
        <button
          onClick={() => setShowHint(!showHint)}
          className={clsx(
            "p-2 rounded-xl transition-all",
            showHint 
              ? "bg-[#1831D7]/15 text-[#1831D7] dark:text-[#7F95FF]" 
              : "hover:bg-stone-100 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:text-neutral-400 dark:hover:text-white"
          )}
          title="Dica de Setas"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
