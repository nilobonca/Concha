import React from 'react';
import { ArrowDownUp, AlertCircle, X } from 'lucide-react';

export interface SortConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SortConfirmModal: React.FC<SortConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 p-6 overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1831D7]/10 dark:bg-[#52B1FF]/20 flex items-center justify-center text-[#1831D7] dark:text-[#52B1FF] shrink-0 mt-0.5">
            <ArrowDownUp className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-semibold text-stone-900 dark:text-[#F4F0E6]">
              Desfazer ordenação?
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-600 dark:text-[#B4D3F1]/80">
              Esta visualização possui ordenação ativa. Para adicionar uma nova nota em uma posição manual específica (acima ou abaixo), é necessário remover a ordenação atual. Deseja desfazer a ordenação e continuar?
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-stone-100 dark:border-white/5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1831D7] hover:bg-[#1831D7]/90 text-white dark:bg-[#7F95FF] dark:text-[#17192A] transition-all shadow-xs cursor-pointer"
          >
            Desfazer ordenação e adicionar
          </button>
        </div>
      </div>
    </div>
  );
};
