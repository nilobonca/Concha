import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  X, 
  AlertTriangle, 
  HardDrive, 
  Database, 
  RefreshCw 
} from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import clsx from 'clsx';

export interface VaultDeleteConfirmationModalProps {
  isOpen: boolean;
  vault: RegisteredVault | null;
  isActive?: boolean;
  onClose: () => void;
  onConfirmDelete: (vault: RegisteredVault, deleteLocalFolder: boolean) => Promise<void> | void;
}

export const VaultDeleteConfirmationModal: React.FC<VaultDeleteConfirmationModalProps> = ({
  isOpen,
  vault,
  isActive = false,
  onClose,
  onConfirmDelete,
}) => {
  const [deleteLocalFolder, setDeleteLocalFolder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeleteLocalFolder(false);
      setIsDeleting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !vault) return null;

  const isFSA = vault.storageType === 'fsa';
  const displayLocation = vault.path || (
    isFSA 
      ? (vault.folderName ? `D:\\RPG\\Campanhas\\${vault.folderName}` : 'Pasta Local no Computador')
      : 'Armazenamento interno (IndexedDB)'
  );

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete(vault, deleteLocalFolder);
      onClose();
    } catch (err) {
      console.error('[VaultDeleteConfirmationModal] Erro ao excluir vault:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isDeleting && onClose()}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-[#181A29] rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl p-5 sm:p-6 text-stone-900 dark:text-[#F4F0E6] flex flex-col gap-4 animate-in zoom-in-95 duration-150 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-4 ring-rose-500/10 shrink-0">
              <Trash2 size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
                Excluir Vault
              </h3>
              <p className="text-xs text-stone-500 dark:text-neutral-400">
                Esta ação removerá o vault do aplicativo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Vault Summary Card */}
        <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={clsx(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                isFSA 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "bg-[#1831D7]/15 text-[#1831D7] dark:bg-[#7F95FF]/20 dark:text-[#7F95FF]"
              )}>
                {isFSA ? <HardDrive size={13} /> : <Database size={13} />}
              </div>
              <span className="font-bold text-xs truncate text-stone-900 dark:text-white">
                {vault.name}
              </span>
            </div>

            <span className={clsx(
              "text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase shrink-0",
              isFSA 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : "bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF]"
            )}>
              {isFSA ? 'HD Local' : 'IndexedDB'}
            </span>
          </div>

          <p className="text-[10px] font-mono text-stone-500 dark:text-neutral-400 truncate">
            {displayLocation}
          </p>
        </div>

        {/* Warning if it's the currently active vault */}
        {isActive && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="leading-snug">
              Este vault está <strong>ativo no momento</strong>. Ao confirmá-lo, o Supercanvas alternará automaticamente para outro vault registrado.
            </p>
          </div>
        )}

        {/* Pergunta se deseja excluir também a pasta física do computador (para FSA / pastas locais) */}
        {isFSA ? (
          <div className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteLocalFolder}
                onChange={(e) => setDeleteLocalFolder(e.target.value === 'true' || e.target.checked)}
                disabled={isDeleting}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-stone-300 dark:border-neutral-600 cursor-pointer accent-rose-600"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Excluir também a pasta do computador
                </span>
                <span className="text-[11px] text-stone-500 dark:text-neutral-400 leading-relaxed block mt-0.5">
                  {deleteLocalFolder
                    ? 'A pasta e todos os seus arquivos serão movidos para a Lixeira do sistema operacional.'
                    : 'A pasta e seus arquivos permanecerão intactos no HD. Apenas o vínculo deste vault será removido do Supercanvas.'}
                </span>
              </div>
            </label>

            {deleteLocalFolder && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 font-medium">
                ⚠️ <strong>Atenção</strong>: Os arquivos locais no computador serão enviados para a Lixeira!
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-500 dark:text-neutral-400 leading-relaxed">
            Tem certeza de que deseja excluir este vault? Todos os dados armazenados localmente neste vault no aplicativo serão removidos.
          </p>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className={clsx(
              "px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
              deleteLocalFolder
                ? "bg-rose-700 hover:bg-rose-800 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            )}
          >
            {isDeleting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>{deleteLocalFolder ? 'Excluir Vault e Pasta' : 'Excluir Vault'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
