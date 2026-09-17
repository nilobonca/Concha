import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  X,
  Maximize2,
  Expand,
  Plus,
  Trash2,
  ChevronsRight,
  Check,
  Menu,
  MoreHorizontal,
  Copy,
  SlidersHorizontal,
  PanelRight,
} from 'lucide-react';
import { DatabaseRow, PropertyDefinition } from '../../types';
import { DatabaseCellRenderer } from '../cells/DatabaseCellRenderer';
import { RecordNoteEditor } from './RecordNoteEditor';
import { NoteOptionsMenu } from '@/modules/vault/components/NoteOptionsMenu';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';

export type PeekMode = 'side' | 'center' | 'full';

export interface RecordPeekModalProps {
  isOpen: boolean;
  row: DatabaseRow | null;
  properties: PropertyDefinition[];
  databaseName?: string;
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
  databaseName = 'Base de Dados',
  onClose,
  onUpdateProperty,
  onUpdateContent,
  onUpdateMetadata,
  onOpenAddProperty,
  onDeleteRow,
}) => {
  const [peekMode, setPeekMode] = useState<PeekMode>('side');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showPropertiesSidebar, setShowPropertiesSidebar] = useState<boolean>(false);
  const { backlinksPanelOpen, setBacklinksPanelOpen } = useVaultStore();

  const isPropertiesOpen = showPropertiesSidebar || backlinksPanelOpen;

  const toggleProperties = () => {
    const nextState = !isPropertiesOpen;
    setShowPropertiesSidebar(nextState);
    setBacklinksPanelOpen(nextState);
  };

  const [sideWidth, setSideWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('supercanvas_side_peek_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 360 && parsed <= 1600) {
          return parsed;
        }
      }
    }
    return 640;
  });
  const [isResizing, setIsResizing] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = window.innerWidth - e.clientX;
      const minW = 360;
      const maxW = Math.min(1400, window.innerWidth - 80);
      const clamped = Math.max(minW, Math.min(newWidth, maxW));
      setSideWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setSideWidth((currentWidth) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('supercanvas_side_peek_width', String(currentWidth));
        }
        return currentWidth;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen || !row) return null;
  if (typeof document === 'undefined') return null;

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

  // Layout wrapper classes based on peekMode to match note view tabs
  let wrapperAlignmentClasses = '';
  let containerClasses = '';

  if (peekMode === 'side') {
    wrapperAlignmentClasses = 'justify-end items-stretch';
    containerClasses =
      'relative z-10 w-full h-full bg-white dark:bg-[#0E0E12] shadow-2xl border-l border-stone-200/90 dark:border-white/10 flex flex-col pointer-events-auto transition-all duration-200 animate-in slide-in-from-right app-region-no-drag';
  } else if (peekMode === 'center') {
    wrapperAlignmentClasses = 'justify-center items-center p-4 sm:p-6';
    containerClasses =
      'relative z-10 w-full max-w-4xl h-full max-h-[90vh] bg-white dark:bg-[#0E0E12] rounded-2xl shadow-2xl border border-stone-200/90 dark:border-white/10 flex flex-col overflow-hidden pointer-events-auto transition-all duration-200 animate-in zoom-in-95 app-region-no-drag';
  } else {
    // Full screen
    wrapperAlignmentClasses = 'justify-center items-center p-0';
    containerClasses =
      'relative z-10 w-full h-full bg-white dark:bg-[#0E0E12] flex flex-col overflow-hidden pointer-events-auto transition-all duration-200 animate-in fade-in app-region-no-drag';
  }

  const modalContent = (
    <div
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className={`fixed top-9 bottom-0 left-0 right-0 z-[9999] flex overflow-hidden pointer-events-none app-region-no-drag ${
        isResizing ? 'select-none' : ''
      } ${wrapperAlignmentClasses}`}
    >
      {/* Backdrop overlay */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className={`absolute inset-0 z-0 pointer-events-auto transition-opacity duration-200 app-region-no-drag ${
          peekMode === 'center'
            ? 'bg-black/60 backdrop-blur-xs'
            : peekMode === 'side'
            ? 'bg-black/20'
            : 'bg-black/60'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Sidepeak panel */}
      <div
        style={{
          WebkitAppRegion: 'no-drag',
          ...(peekMode === 'side' ? { width: `${sideWidth}px`, maxWidth: '90vw' } : {}),
        } as React.CSSProperties}
        className={`${containerClasses} ${isResizing ? 'transition-none!' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {peekMode === 'side' && (
          <div
            onMouseDown={handleMouseDownResize}
            className="absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize z-50 group flex items-center justify-center select-none app-region-no-drag pointer-events-auto"
            title="Arraste para redimensionar"
          >
            <div
              className={`w-1 h-full transition-colors ${
                isResizing
                  ? 'bg-[#1831D7] dark:bg-[#7F95FF]'
                  : 'group-hover:bg-[#1831D7]/70 dark:group-hover:bg-[#7F95FF]/70 bg-transparent'
              }`}
            />
          </div>
        )}
        {/* Note View Header Bar (Option Bar) */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center justify-between px-3 py-1.5 border-b border-stone-200/80 dark:border-white/10 text-stone-600 dark:text-neutral-300 bg-stone-50/90 dark:bg-[#16161D]/90 backdrop-blur-md shrink-0 relative z-30 select-none app-region-no-drag pointer-events-auto"
        >
          {/* LADO ESQUERDO: Botão de Fechar */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-lg text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer app-region-no-drag pointer-events-auto relative z-50 flex items-center justify-center"
              title="Fechar (Esc)"
            >
              <ChevronsRight className="w-4 h-4 pointer-events-none" />
            </button>
          </div>

          {/* MEIO: Vazio */}
          <div className="flex-1" />

          {/* LADO DIREITO: Único Menu de 3 Pontinhos (sem ícone duplicado) */}
          <div className="flex items-center gap-1">
            <NoteOptionsMenu
              editor={editor}
              content={row?.content}
              peekMode={peekMode}
              onPeekModeChange={setPeekMode}
              onToggleProperties={toggleProperties}
              onCopyTitle={() => {
                if (row?.title) {
                  navigator.clipboard?.writeText(row.title);
                }
              }}
              onCopyContent={() => {
                if (row?.content) {
                  navigator.clipboard?.writeText(row.content);
                }
              }}
              onDelete={
                onDeleteRow
                  ? () => {
                      onDeleteRow(row.id);
                      onClose();
                    }
                  : undefined
              }
              deleteLabel="Excluir Registro"
              iconType="horizontal"
            />
          </div>
        </div>

        {/* Layout Principal: Canvas da Nota no Centro e Painel Lateral de Propriedades à Direita */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Scrollable Note Document Canvas */}
          <div className="flex-1 overflow-y-auto px-8 py-8 sm:px-12 custom-scrollbar relative bg-white dark:bg-[#0E0E12] text-stone-900 dark:text-stone-100">
            <div className="max-w-3xl mx-auto space-y-6 pb-28">
              {/* Optional Cover Image Banner */}
              {row.coverImage && (
                <div className="relative h-44 -mx-8 sm:-mx-12 -mt-8 mb-6 overflow-hidden rounded-b-2xl shadow-sm border-b border-stone-200/80 dark:border-white/10">
                  <img
                    src={row.coverImage}
                    alt="Capa da nota"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Document Title (VaultEditor Style) */}
              <div className="pt-2">
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Sem título"
                  className="w-full text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-neutral-100 placeholder-stone-300 dark:placeholder-neutral-600 bg-transparent outline-none border-none p-0 focus:ring-0 leading-tight selection:bg-[#1831D7]/20"
                />
              </div>

              {/* Divisor Visual de separação para o texto */}
              <div className="my-4 border-t border-stone-200/80 dark:border-white/10" />

              {/* Note Body Editor (Seamless Document Flow identical to VaultEditor) */}
              <div className="space-y-2 pt-1">
                <RecordNoteEditor
                  content={row.content || ''}
                  onChange={handleContentChange}
                  onEditorReady={setEditor}
                  placeholder="Escreva suas anotações em Markdown..."
                />
              </div>
            </div>
          </div>

          {/* Right Properties Sidebar Panel (Ativado pelo ícone PanelRight da barra superior do app ou pelo menu 3 pontinhos) */}
          {isPropertiesOpen && (
            <aside className="relative w-80 h-full bg-[#FAF9F6] dark:bg-[#111115] border-l border-stone-200/90 dark:border-white/10 flex flex-col select-none shrink-0 z-20 text-stone-900 dark:text-neutral-100 animate-in slide-in-from-right duration-150 app-region-no-drag">
              {/* PanelRight Toggle Button (No lado de fora do painel, colado à borda) */}
              <button
                type="button"
                onClick={() => {
                  setShowPropertiesSidebar(false);
                  setBacklinksPanelOpen(false);
                }}
                className="absolute -left-9 top-3 z-30 p-1.5 rounded-md transition-colors cursor-pointer bg-white dark:bg-[#16161F] text-[#1831D7] dark:text-[#7F95FF] border border-stone-200 dark:border-white/10 shadow-xs flex items-center justify-center hover:bg-stone-50 dark:hover:bg-white/10 app-region-no-drag"
                title="Fechar painel de propriedades"
                aria-label="Fechar painel de propriedades"
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>

              {/* Panel Header */}
              <div className="p-3 border-b border-stone-200/90 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-neutral-200">
                  <SlidersHorizontal className="w-4 h-4 text-[#1831D7] dark:text-[#7F95FF]" />
                  <span>Propriedades da Nota</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPropertiesSidebar(false);
                    setBacklinksPanelOpen(false);
                  }}
                  className="p-1 hover:bg-stone-200/60 dark:hover:bg-white/10 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Fechar painel de propriedades"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
                    Metadados do Registro
                  </div>

                  <div className="space-y-1 bg-stone-100/60 dark:bg-white/5 p-2 rounded-xl border border-stone-200/60 dark:border-white/5">
                    {properties
                      .filter((p) => p.type !== 'title')
                      .map((prop) => (
                        <div
                          key={prop.id}
                          className="grid grid-cols-3 items-center py-1.5 px-2 hover:bg-stone-200/40 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <div className="text-xs font-medium text-stone-500 dark:text-neutral-400 truncate pr-2">
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
                      className="w-full flex items-center gap-2 text-xs font-medium text-[#1831D7] dark:text-[#7F95FF] hover:bg-stone-100 dark:hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Propriedade</span>
                    </button>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

