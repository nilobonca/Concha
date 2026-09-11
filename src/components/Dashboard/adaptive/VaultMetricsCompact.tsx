import React from 'react';
import { FileText, Layers } from 'lucide-react';

export interface VaultMetricsCompactProps {
  documentCount?: number;
  canvasCount?: number;
}

export const VaultMetricsCompact: React.FC<VaultMetricsCompactProps> = ({
  documentCount = 0,
  canvasCount = 0,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Notas e Arquivos */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.06]">
        <FileText size={13} className="text-stone-500 dark:text-neutral-400 shrink-0" />
        <div className="min-w-0 flex items-baseline gap-1.5 truncate">
          <span className="text-xs font-bold text-stone-900 dark:text-neutral-200 shrink-0">
            {documentCount}
          </span>
          <span className="text-[10px] text-stone-600 dark:text-neutral-400 font-semibold truncate">
            Notas & Arquivos
          </span>
        </div>
      </div>

      {/* Canvases Vinculados */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.06]">
        <Layers size={13} className="text-stone-500 dark:text-neutral-400 shrink-0" />
        <div className="min-w-0 flex items-baseline gap-1.5 truncate">
          <span className="text-xs font-bold text-stone-900 dark:text-neutral-200 shrink-0">
            {canvasCount}
          </span>
          <span className="text-[10px] text-stone-600 dark:text-neutral-400 font-semibold truncate">
            Canvases vinculados
          </span>
        </div>
      </div>
    </div>
  );
};
