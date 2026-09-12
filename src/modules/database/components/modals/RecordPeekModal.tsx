import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  PanelRightClose,
  Plus,
  Trash2,
  Smile,
  Image as ImageIcon,
  Calendar,
  Clock,
} from 'lucide-react';
import { DatabaseRow, PropertyDefinition } from '../../types';
import { DatabaseCellRenderer } from '../cells/DatabaseCellRenderer';
import { RecordNoteEditor } from './RecordNoteEditor';

export type PeekMode = 'side' | 'center' | 'full';

export interface RecordPeekModalProps {
  isOpen: boolean;
  row: DatabaseRow | null;
  properties: PropertyDefinition[];
  onClose: () => void;
  onUpdateProperty: (rowId: string, propertyId: string, value: any) => void;
  onUpdateContent: (rowId: string, content: string) => void;
  onUpdateMetadata: (
    rowId: string,
    updates: Partial<Pick<DatabaseRow, 'icon' | 'coverImage' | 'title'>>
  ) => void;
  onOpenAddProperty?: () => void;
  onDeleteRow?: (rowId: string) => void;
}

export const RecordPeekModal: React.FC<RecordPeekModalProps> = ({
  isOpen,
  row,
  properties,
  onClose,
  onUpdateProperty,
  onUpdateContent,
  onUpdateMetadata,
  onOpenAddProperty,
  onDeleteRow,
}) => {
  const [peekMode, setPeekMode] = useState<PeekMode>('side');

  if (!isOpen || !row) return null;

  const handleTitleChange = (newTitle: string) => {
    onUpdateMetadata(row.id, { title: newTitle });
  };

  const handleContentChange = (newContentMarkdown: string) => {
    onUpdateContent(row.id, newContentMarkdown);
  };

  const cyclePeekMode = () => {
    if (peekMode === 'side') setPeekMode('center');
    else if (peekMode === 'center') setPeekMode('full');
    else setPeekMode('side');
  };

  // Layout wrapper classes based on peekMode
  let containerClasses = '';
  if (peekMode === 'side') {
    containerClasses =
      'fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-[#1E2238] shadow-2xl border-l border-stone-200 dark:border-white/10 flex flex-col transition-all duration-300';
  } else if (peekMode === 'center') {
    containerClasses =
      'relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1E2238] rounded-2xl shadow-2xl border border-stone-200 dark:border-white/10 flex flex-col overflow-hidden';
  } else {
    // Full
    containerClasses =
      'fixed inset-0 z-50 w-full h-full bg-white dark:bg-[#1E2238] flex flex-col overflow-hidden';
  }

  const isModalCenter = peekMode === 'center';

  return (
    <div
      className={
        isModalCenter
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs'
          : undefined
      }
    >
      <div className={containerClasses}>
        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200 dark:border-white/10 text-stone-500 dark:text-[#B4D3F1]/70 bg-stone-50/50 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cyclePeekMode}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-stone-200 dark:hover:bg-white/10 text-stone-600 dark:text-[#F4F0E6] cursor-pointer transition-colors"
              title="Alternar Modo de Exibição"
            >
              {peekMode === 'side' && <PanelRightClose className="w-3.5 h-3.5" />}
              {peekMode === 'center' && <Maximize2 className="w-3.5 h-3.5" />}
              {peekMode === 'full' && <Minimize2 className="w-3.5 h-3.5" />}
              <span className="capitalize">{peekMode} Peek</span>
            </button>

            {onDeleteRow && (
              <button
                type="button"
                onClick={() => {
                  onDeleteRow(row.id);
                  onClose();
                }}
                className="p-1 rounded text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Excluir Registro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Cover image (if exists) */}
          {row.coverImage && (
            <div className="relative h-40 -mx-8 -mt-6 mb-4 overflow-hidden">
              <img
                src={row.coverImage}
                alt="Capa"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Record Title & Icon */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {row.icon ? (
                <span className="text-3xl leading-none select-none">{row.icon}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateMetadata(row.id, { icon: '📄' })}
                  className="p-1.5 rounded-lg border border-dashed border-stone-300 dark:border-white/20 text-stone-400 hover:text-[#52B1FF] cursor-pointer"
                  title="Adicionar ícone"
                >
                  <Smile className="w-4 h-4" />
                </button>
              )}
              <input
                type="text"
                value={row.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Sem título"
                className="text-2xl font-bold bg-transparent text-stone-900 dark:text-[#F4F0E6] outline-none w-full placeholder:text-stone-300 dark:placeholder:text-[#B4D3F1]/20"
              />
            </div>
          </div>

          {/* Vertical Property Inspector */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-[#B4D3F1]/60 mb-2">
              Propriedades
            </div>

            <div className="divide-y divide-stone-100 dark:divide-white/5 border-t border-b border-stone-200 dark:border-white/10">
              {properties
                .filter((p) => p.type !== 'title')
                .map((prop) => (
                  <div
                    key={prop.id}
                    className="grid grid-cols-3 items-center py-1.5 hover:bg-stone-50/50 dark:hover:bg-white/2 rounded transition-colors"
                  >
                    <div className="text-xs font-medium text-stone-500 dark:text-[#B4D3F1]/70 truncate pr-2">
                      {prop.name}
                    </div>
                    <div className="col-span-2 min-h-[28px] flex items-center">
                      <DatabaseCellRenderer
                        row={row}
                        property={prop}
                        onUpdateProperty={onUpdateProperty}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {onOpenAddProperty && (
              <button
                type="button"
                onClick={onOpenAddProperty}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-[#1831D7] dark:text-[#B4D3F1]/60 dark:hover:text-[#52B1FF] py-2 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Propriedade</span>
              </button>
            )}
          </div>

          <div className="border-t border-stone-200 dark:border-white/10" />

          {/* Note Body / Document Content */}
          <div className="space-y-2.5 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-[#B4D3F1]/60">
              Conteúdo da Nota
            </div>
            <div className="min-h-[350px] p-4 rounded-xl bg-stone-50/70 dark:bg-white/[0.03] border border-stone-200 dark:border-white/10 focus-within:border-[#52B1FF] transition-colors">
              <RecordNoteEditor
                content={row.content || ''}
                onChange={handleContentChange}
                placeholder="Escreva suas anotações em Markdown..."
              />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-[#B4D3F1]/40 pt-4 border-t border-stone-100 dark:border-white/5">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Criado: {new Date(row.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Modificado: {new Date(row.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
