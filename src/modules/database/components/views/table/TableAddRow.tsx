import React from 'react';
import { Plus } from 'lucide-react';

export interface TableAddRowProps {
  onAddRow: () => void;
  showRowNumbers?: boolean;
}

export const TableAddRow: React.FC<TableAddRowProps> = ({
  onAddRow,
  showRowNumbers = false,
}) => {
  return (
    <div
      onClick={onAddRow}
      className="group flex items-center h-8 border-b border-stone-200/80 dark:border-white/5 hover:bg-stone-100/60 dark:hover:bg-white/5 transition-colors cursor-pointer select-none min-w-max px-2"
    >
      {showRowNumbers ? (
        <div className="w-10 flex items-center justify-center shrink-0">
          <Plus className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#52B1FF] transition-colors" />
        </div>
      ) : (
        <Plus className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#52B1FF] transition-colors mr-2 ml-1 shrink-0" />
      )}
      <span className="text-xs font-medium text-stone-400 group-hover:text-stone-700 dark:text-[#B4D3F1]/40 dark:group-hover:text-[#F4F0E6] transition-colors">
        Nova linha
      </span>
    </div>
  );
};
