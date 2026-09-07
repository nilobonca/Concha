import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface UpdateOriginalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlwaysUpdate: () => void;
  onJustOnce: () => void;
  onDoNotUpdate: () => void;
  fileName?: string;
}

export const UpdateOriginalNoteModal: React.FC<UpdateOriginalNoteModalProps> = ({
  isOpen,
  onClose,
  onAlwaysUpdate,
  onJustOnce,
  onDoNotUpdate,
  fileName,
}) => {
  // Trata tecla Escape para fechar sem atualizar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const displayName = useMemo(() => {
    if (!fileName) return '';
    const clean = fileName.split('/').pop() || fileName;
    return clean.endsWith('.md') ? clean : `${clean}.md`;
  }, [fileName]);

  if (!isOpen || typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/40 dark:bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 flex flex-col animate-in zoom-in-95 duration-150 text-stone-900 dark:text-neutral-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho: Título e Botão Fechar */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-base font-semibold text-stone-900 dark:text-neutral-100 tracking-tight">
            Atualizar nota original
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Informativo */}
        <div className="mt-4 space-y-2">
          <p className="text-sm text-stone-700 dark:text-neutral-300 leading-normal">
            Deseja atualizar a nota original correspondente a este arquivo?
          </p>
          <p className="text-sm text-stone-500 dark:text-neutral-400 leading-normal">
            Isso afetará 1 arquivo no seu Vault{displayName ? ` (${displayName})` : ''}.
          </p>
        </div>

        {/* Ações Inferiores (Alinhadas à Direita conforme referência) */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          {/* Sempre atualizar: Destaque de borda idêntico à imagem */}
          <button
            type="button"
            onClick={onAlwaysUpdate}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border-2 border-stone-400 dark:border-neutral-500 bg-transparent text-stone-900 dark:text-neutral-100 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Sempre sincronizar notas originais automaticamente"
          >
            Sempre atualizar
          </button>

          {/* Apenas uma vez */}
          <button
            type="button"
            onClick={onJustOnce}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-stone-200 dark:border-neutral-700 bg-transparent text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-neutral-800 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Atualizar o arquivo original apenas para esta alteração"
          >
            Apenas uma vez
          </button>

          {/* Não atualizar */}
          <button
            type="button"
            onClick={onDoNotUpdate}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-stone-200 dark:border-neutral-700 bg-transparent text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-neutral-800 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Manter as alterações apenas no canvas, sem alterar o arquivo no Vault"
          >
            Não atualizar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
