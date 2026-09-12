import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { DatabaseContainer } from '../DatabaseContainer';
import { DatabaseInstance } from '../../types';
import { createDefaultDatabase } from '../../utils/databaseDefaults';
import { Maximize2, Database, Trash2 } from 'lucide-react';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';

export const TiptapDatabaseNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { openDocument } = useVaultStore();
  const databasePath = node.attrs.databasePath as string;
  const initialRawData = node.attrs.databaseData as DatabaseInstance | null;

  const [data, setData] = useState<DatabaseInstance>(() => {
    if (initialRawData) return initialRawData;
    return createDefaultDatabase('Base de Dados');
  });

  const handleDataChange = (updated: DatabaseInstance) => {
    setData(updated);
    updateAttributes({
      databaseData: updated,
      databaseId: updated.id,
    });
  };

  const handleOpenFullscreen = async () => {
    if (databasePath) {
      await openDocument(databasePath);
    }
  };

  return (
    <NodeViewWrapper
      className={`not-prose my-6 rounded-2xl border transition-all overflow-hidden ${
        selected
          ? 'border-[#1831D7] ring-2 ring-[#7F95FF]/50 shadow-md'
          : 'border-stone-200/90 dark:border-white/10 shadow-xs'
      } bg-[#FAF9F6]/90 dark:bg-[#17192A]`}
    >
      {/* Barra de cabeçalho do bloco inline */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xs text-xs select-none">
        <div className="flex items-center gap-2 font-medium text-stone-700 dark:text-[#F4F0E6]">
          <div className="w-5 h-5 rounded-md bg-[#1831D7]/10 dark:bg-[#52B1FF]/20 flex items-center justify-center text-[#1831D7] dark:text-[#52B1FF]">
            <Database className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold">{data.title || 'Base de Dados'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-[#B4D3F1]">
            Inline
          </span>
        </div>

        <div className="flex items-center gap-1">
          {databasePath && (
            <button
              type="button"
              onClick={handleOpenFullscreen}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-stone-500 hover:text-stone-900 dark:text-[#B4D3F1] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Abrir em página inteira"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Expandir</span>
            </button>
          )}

          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Remover bloco"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo do Database */}
      <div className="max-h-[550px] overflow-hidden flex flex-col">
        <DatabaseContainer
          initialData={data}
          onSave={handleDataChange}
          isInline={true}
        />
      </div>
    </NodeViewWrapper>
  );
};
