import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useIncomingLinks } from '../hooks/useIncomingLinks';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName: string;
  itemPath?: string;
  isFolder?: boolean;
  itemType?: 'file' | 'folder' | 'canvas';
  itemCount?: number;
  onNavigateToLink?: (path: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemPath,
  isFolder = false,
  itemType,
  itemCount = 1,
  onNavigateToLink
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [showLinksDetails, setShowLinksDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine effective type & label
  const effectiveType = itemType || (isFolder ? 'folder' : 'file');
  const typeTitle = itemCount > 1
    ? `Excluir ${itemCount} itens`
    : effectiveType === 'folder' 
      ? 'Excluir pasta' 
      : effectiveType === 'canvas' 
        ? 'Excluir canvas' 
        : 'Excluir arquivo';

  // Format display name (adds .md if missing for markdown files)
  const displayName = useMemo(() => {
    if (itemCount > 1) return `${itemCount} itens selecionados`;
    if (!itemName) return 'Sem título';
    if (effectiveType === 'file' && !itemName.includes('.')) {
      return `${itemName}.md`;
    }
    return itemName;
  }, [itemName, effectiveType, itemCount]);

  // Hook to detect backlinks / incoming references
  const effectivePath = itemPath || itemName;
  const { incomingLinks, totalLinksCount, isScanning } = useIncomingLinks(
    effectivePath,
    itemName,
    isFolder,
    isOpen
  );

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setDontAskAgain(false);
      setShowLinksDetails(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Handle confirmation
  const handleConfirm = async () => {
    if (dontAskAgain && typeof window !== 'undefined') {
      try {
        localStorage.setItem('vault_skip_delete_confirm', 'true');
      } catch {}
    }

    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  // Keyboard accessibility: Escape to close, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, dontAskAgain, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white dark:bg-[#1E1E1E] border border-stone-200/90 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 flex flex-col animate-in zoom-in-95 duration-150 text-stone-900 dark:text-neutral-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title and Close Button */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-neutral-100 tracking-tight">
            {typeTitle}
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

        {/* Body Content */}
        <div className="mt-4 space-y-3.5">
          <p className="text-sm text-stone-800 dark:text-neutral-200 leading-normal">
            Tem certeza de que deseja excluir &ldquo;{displayName}&rdquo;?
          </p>

          <p className="text-sm text-stone-600 dark:text-neutral-400 leading-normal">
            Ele será movido para a lixeira do sistema.
          </p>

          {/* Incoming Links Warning (Highlighted in Orange/Amber) */}
          {totalLinksCount > 0 && (
            <div className="pt-0.5">
              <div className="flex items-center justify-between text-sm font-medium text-[#E57E24] dark:text-[#F59E0B]">
                <span>
                  {totalLinksCount === 1
                    ? 'Existe atualmente 1 link apontando para este arquivo.'
                    : `Existem atualmente ${totalLinksCount} links apontando para este arquivo.`}
                </span>

                {incomingLinks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowLinksDetails((prev) => !prev)}
                    className="text-xs underline ml-2 opacity-85 hover:opacity-100 flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    {showLinksDetails ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span>{showLinksDetails ? 'ocultar' : 'ver'}</span>
                  </button>
                )}
              </div>

              {/* Expandable list of files containing links */}
              {showLinksDetails && incomingLinks.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto custom-scrollbar p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="font-semibold text-amber-800 dark:text-amber-300 pb-0.5">
                    Arquivos com referências:
                  </div>
                  {incomingLinks.map((link) => (
                    <div
                      key={link.sourcePath}
                      className="flex items-center justify-between py-0.5 text-stone-700 dark:text-neutral-300"
                    >
                      <span className="truncate" title={link.sourcePath}>
                        • {link.sourceTitle}
                      </span>
                      <span className="text-[11px] opacity-75 font-mono ml-2 shrink-0">
                        {link.linkCount}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isScanning && totalLinksCount === 0 && (
            <p className="text-xs text-stone-400 dark:text-neutral-500 italic">
              Verificando referências...
            </p>
          )}
        </div>

        {/* Footer: Don't ask again checkbox & Action Buttons */}
        <div className="mt-8 flex items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 dark:text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 dark:border-neutral-700 text-rose-600 dark:text-rose-500 focus:ring-rose-500/30 cursor-pointer"
            />
            <span>Não perguntar novamente</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3.5 py-1.5 rounded-lg border border-stone-300/90 dark:border-neutral-700 hover:bg-stone-100 dark:hover:bg-neutral-800 text-stone-700 dark:text-neutral-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              autoFocus
              disabled={isDeleting}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
