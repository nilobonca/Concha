import React, { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  MoreVertical,
  MoreHorizontal,
  Check,
  Sparkles,
  Code,
  Eye,
  BookmarkPlus,
  Trash2,
  Search,
  Copy,
  PanelRight,
  Maximize2,
  Expand,
  Palette,
  Focus,
  BookOpen,
  SquarePen,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { FORMATTING_COMMANDS, CATEGORY_LABELS, FormattingCommand } from '../utils/formattingCommands';
import { DatabaseRow, PropertyDefinition } from '@/modules/database/types';
import { DatabaseCellRenderer } from '@/modules/database/components/cells/DatabaseCellRenderer';
import { useClickOutside } from '@/hooks/useClickOutside';

export type PeekMode = 'side' | 'center' | 'full';
export type NoteViewMode = 'live' | 'source' | 'reading';

export interface NoteOptionsMenuProps {
  editor?: Editor | null;
  content?: string;
  viewMode?: NoteViewMode;
  onViewModeChange?: (mode: NoteViewMode) => void;
  peekMode?: PeekMode;
  onPeekModeChange?: (mode: PeekMode) => void;
  color?: string;
  colors?: Record<string, { border: string; bg: string; name: string }>;
  onColorChange?: (color: string) => void;
  properties?: PropertyDefinition[];
  row?: DatabaseRow | null;
  onUpdateProperty?: (rowId: string, propertyId: string, value: any) => void;
  onOpenAddProperty?: () => void;
  onToggleSearch?: () => void;
  onToggleProperties?: () => void;
  onCopyTitle?: () => void;
  onCopyContent?: () => void;
  onMakeTemplate?: () => void;
  templateSuccess?: boolean;
  onCenterElement?: () => void;
  onOpenInVault?: () => void;
  onToggleEdit?: () => void;
  isEditing?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  disabled?: boolean;
  buttonClassName?: string;
  iconType?: 'vertical' | 'horizontal';
  title?: string;
}

/**
 * Extrai estatísticas detalhadas do texto da nota:
 * - palavras (words)
 * - letras / caracteres (letters)
 * - parágrafos (quebras de bloco)
 * - linhas (linhas visuais formadas no editor/texto)
 */
function calculateTextStats(content?: string, editor?: Editor | null) {
  let plainText = '';
  if (editor && !editor.isDestroyed) {
    try {
      const text = editor.getText({ blockSeparator: '\n' });
      if (text) plainText = text;
    } catch {
      // Fallback
    }
  }

  if (!plainText && content) {
    const hasHtml = /<[a-z][\s\S]*>/i.test(content);
    if (hasHtml) {
      plainText = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
    } else {
      plainText = content;
    }
  }

  const trimmed = plainText.trim();
  if (!trimmed) {
    return { words: 0, letters: 0, paragraphs: 0, lines: 0 };
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const letters = plainText.length;

  // Parágrafos: blocos de texto separados por quebra de linha (linhas com conteúdo)
  const paragraphs = plainText.split(/\n+/).filter((p) => p.trim().length > 0).length || 1;

  // Linhas visuais formadas
  let lines = 0;
  if (editor && !editor.isDestroyed && editor.view?.dom) {
    try {
      const dom = editor.view.dom as HTMLElement;
      const blocks = dom.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
      if (blocks && blocks.length > 0) {
        blocks.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.height === 0) return;
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize) || 15;
          let lineHeight = parseFloat(style.lineHeight);
          if (isNaN(lineHeight)) lineHeight = fontSize * 1.4;
          const paddingTop = parseFloat(style.paddingTop) || 0;
          const paddingBottom = parseFloat(style.paddingBottom) || 0;
          const contentHeight = Math.max(0, rect.height - paddingTop - paddingBottom);
          lines += Math.max(1, Math.round(contentHeight / lineHeight));
        });
      }
    } catch {
      // Ignora erro se DOM não puder ser lido
    }
  }

  // Se a contagem DOM for 0 ou editor não estiver disponível, calcula visualmente as linhas quebradas por limite de colunas (~65 caracteres por linha)
  if (lines === 0) {
    const rawLines = plainText.split('\n');
    lines = rawLines.reduce((acc, line) => {
      if (line.length === 0) return acc + 1;
      return acc + Math.max(1, Math.ceil(line.length / 65));
    }, 0);
  }

  return { words, letters, paragraphs, lines };
}

export const NoteOptionsMenu: React.FC<NoteOptionsMenuProps> = ({
  editor,
  content,
  viewMode,
  onViewModeChange,
  peekMode,
  onPeekModeChange,
  color,
  colors,
  onColorChange,
  properties,
  row,
  onUpdateProperty,
  onOpenAddProperty,
  onToggleSearch,
  onToggleProperties,
  onCopyTitle,
  onCopyContent,
  onMakeTemplate,
  templateSuccess = false,
  onCenterElement,
  onOpenInVault,
  onToggleEdit,
  isEditing = false,
  onDelete,
  deleteLabel = 'Excluir Nota',
  disabled = false,
  buttonClassName,
  iconType = 'vertical',
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [, forceUpdate] = useState({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !isOpen) return;
    const handleUpdate = () => forceUpdate({});
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, isOpen]);

  const { words, letters, paragraphs, lines } = calculateTextStats(content, editor);

  useClickOutside({
    ref: menuRef,
    onClose: () => {
      setIsOpen(false);
      setShowColorPicker(false);
    },
    enabled: isOpen,
  });

  const categories: FormattingCommand['category'][] = ['headings', 'lists', 'blocks', 'inline'];

  const handleCommandClick = (cmd: FormattingCommand) => {
    if (!editor) return;
    cmd.execute(editor);
    setIsOpen(false);
  };

  const IconComponent = iconType === 'horizontal' ? MoreHorizontal : MoreVertical;

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={
          buttonClassName ||
          `p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
            isOpen
              ? 'bg-stone-200/80 dark:bg-white/15 text-stone-900 dark:text-neutral-100'
              : 'text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/10'
          } disabled:opacity-40 disabled:cursor-not-allowed`
        }
        title="Mais opções da nota (...)"
        aria-label="Menu de Opções da Nota"
      >
        <IconComponent className="w-4 h-4 pointer-events-none" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 z-[999] w-76 max-h-[80vh] overflow-y-auto bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-lg shadow-2xl p-2 custom-scrollbar select-none animate-in fade-in zoom-in-95 duration-100 text-xs font-normal"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-2.5 py-1 text-[11px] font-semibold text-stone-500 dark:text-neutral-400 border-b border-stone-100 dark:border-white/5 mb-2 flex items-center justify-between">
            <span>Opções da Nota</span>
            <span className="text-[10px] text-stone-400 dark:text-neutral-500 font-normal">
              {editor ? 'Dica: digite / para comandos' : 'Ações e Visualização'}
            </span>
          </div>

          {/* Quick Actions: Search & Copy */}
          {(onToggleSearch || onToggleProperties || onCopyTitle || onCopyContent) && (
            <div className="space-y-0.5 px-1 mb-2">
              {onToggleSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onToggleSearch();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300 group"
                  title="Localizar e Substituir na nota (Ctrl+F)"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Search className="w-3.5 h-3.5 text-stone-700 dark:text-neutral-200 shrink-0" />
                    <span className="text-xs font-normal">Localizar na Nota</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400 dark:text-neutral-500 px-1 py-0.5 rounded bg-stone-100 dark:bg-white/5 group-hover:bg-stone-200/70 dark:group-hover:bg-white/10">
                    Ctrl+F
                  </span>
                </button>
              )}

              {onToggleProperties && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onToggleProperties();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                >
                  <PanelRight className="w-3.5 h-3.5 text-stone-700 dark:text-neutral-200 shrink-0" />
                  <span className="text-xs font-normal">Propriedades da Nota</span>
                </button>
              )}

              {onCopyTitle && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCopyTitle();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                >
                  <Copy className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-xs">Copiar Título</span>
                </button>
              )}

              {onCopyContent && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCopyContent();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                >
                  <Copy className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-xs">Copiar Conteúdo</span>
                </button>
              )}
            </div>
          )}

          {/* Peek Window View Mode (Painel Lateral, Centralizado, Tela Cheia) */}
          {peekMode && onPeekModeChange && (
            <div className="px-1 mb-3">
              <div className="text-[10px] font-semibold tracking-wider text-stone-400 dark:text-neutral-500 uppercase mb-1.5">
                Modo de Exibição da Janela
              </div>
              <div className="grid grid-cols-3 gap-1 bg-stone-100/80 dark:bg-white/5 p-1 rounded-lg border border-stone-200/70 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    onPeekModeChange('side');
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md text-xs transition-colors cursor-pointer ${
                    peekMode === 'side'
                      ? 'bg-white dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-semibold shadow-xs'
                      : 'text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                  title="Painel Lateral"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Lateral</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPeekModeChange('center');
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md text-xs transition-colors cursor-pointer ${
                    peekMode === 'center'
                      ? 'bg-white dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-semibold shadow-xs'
                      : 'text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                  title="Centralizado"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Centro</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPeekModeChange('full');
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md text-xs transition-colors cursor-pointer ${
                    peekMode === 'full'
                      ? 'bg-white dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-semibold shadow-xs'
                      : 'text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                  title="Tela Cheia"
                >
                  <Expand className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Tela Cheia</span>
                </button>
              </div>
            </div>
          )}

          {/* Editor View Mode Switcher (Live Preview | Fonte | Leitura) */}
          {onViewModeChange && (
            <div className="px-1 mb-3">
              <div className="text-[10px] font-semibold tracking-wider text-stone-400 dark:text-neutral-500 uppercase mb-1.5">
                Modo do Editor
              </div>
              <div className="grid grid-cols-3 gap-1 bg-stone-100/80 dark:bg-white/5 p-1 rounded-lg border border-stone-200/70 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange('live');
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md text-xs transition-colors cursor-pointer ${
                    viewMode === 'live'
                      ? 'bg-white dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-semibold shadow-xs'
                      : 'text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                  title="Live Preview"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange('source');
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md text-xs transition-colors cursor-pointer ${
                    viewMode === 'source'
                      ? 'bg-white dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-semibold shadow-xs'
                      : 'text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                  title="Modo Fonte (Markdown)"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Fonte</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange('reading');
                    setIsOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-md text-xs transition-colors cursor-pointer ${
                    viewMode === 'reading'
                      ? 'bg-white dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-semibold shadow-xs'
                      : 'text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
                  }`}
                  title="Modo Leitura"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Leitura</span>
                </button>
              </div>
            </div>
          )}

          {/* Palette Color Picker (For Board/Canvas notes) */}
          {colors && onColorChange && (
            <div className="px-1 mb-3">
              <button
                type="button"
                onClick={() => setShowColorPicker((prev) => !prev)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Palette className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="text-xs">Cor da Nota</span>
                </div>
                {color && (
                  <span
                    className="w-3 h-3 rounded-full border border-stone-300 dark:border-white/20"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>

              {showColorPicker && (
                <div className="mt-2 p-2 bg-stone-50 dark:bg-white/5 rounded-xl border border-stone-200 dark:border-white/10 grid grid-cols-6 gap-1.5">
                  {Object.entries(colors).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onColorChange(t.border);
                        setShowColorPicker(false);
                        setIsOpen(false);
                      }}
                      className="w-6 h-6 rounded-lg transition-transform hover:scale-110 cursor-pointer"
                      style={{
                        backgroundColor: t.bg,
                        border: `2px solid ${t.border}`,
                      }}
                      title={t.name}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text Formatting Commands */}
          {editor && (viewMode === undefined || viewMode === 'live') && (
            <>
              <div className="border-t border-stone-100 dark:border-white/5 my-2" />
              <div className="space-y-3 px-1">
                {categories.map((cat) => {
                  const catCommands = FORMATTING_COMMANDS.filter((cmd) => cmd.category === cat);
                  return (
                    <div key={cat} className="space-y-0.5">
                      <div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-stone-400 dark:text-neutral-500 uppercase">
                        {CATEGORY_LABELS[cat]}
                      </div>

                      {catCommands.map((cmd) => {
                        const isActive = cmd.isActive ? cmd.isActive(editor) : false;
                        const CmdIcon = cmd.icon;

                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            onClick={() => handleCommandClick(cmd)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-stone-200/80 dark:bg-white/15 text-stone-900 dark:text-neutral-100 font-normal'
                                : 'hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CmdIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive
                                    ? 'text-stone-900 dark:text-neutral-100'
                                    : 'text-stone-400 dark:text-neutral-400'
                                }`}
                              />
                              <span className="text-xs truncate">{cmd.title}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {cmd.shortcut && (
                                <span className="text-[10px] font-mono text-stone-400 dark:text-neutral-500 px-1 py-0.5 rounded bg-stone-100 dark:bg-white/5">
                                  {cmd.shortcut}
                                </span>
                              )}
                              {isActive && <Check className="w-3 h-3 text-stone-900 dark:text-neutral-100" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* General Actions (Vault Editor, Center, Edit Toggle, Make Template, Delete) */}
          {(onOpenInVault || onCenterElement || onToggleEdit || onMakeTemplate || onDelete) && (
            <>
              <div className="border-t border-stone-100 dark:border-white/5 my-2" />
              <div className="space-y-1 px-1">
                <div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-stone-400 dark:text-neutral-500 uppercase">
                  Ações da Nota
                </div>

                {onOpenInVault && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenInVault();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-stone-700 dark:text-neutral-200 shrink-0" />
                    <span className="text-xs">Abrir no Editor do Vault</span>
                  </button>
                )}

                {onCenterElement && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onCenterElement();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                  >
                    <Focus className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="text-xs">Centralizar no Quadro</span>
                  </button>
                )}

                {onToggleEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onToggleEdit();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                  >
                    <SquarePen className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="text-xs">{isEditing ? 'Concluir Edição' : 'Editar Nota'}</span>
                  </button>
                )}

                {onMakeTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      onMakeTemplate();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      templateSuccess
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-normal'
                        : 'hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300'
                    }`}
                    title="Salvar esta nota como um modelo reutilizável (Template)"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {templateSuccess ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <BookmarkPlus className="w-3.5 h-3.5 text-stone-700 dark:text-neutral-200 shrink-0" />
                      )}
                      <span className="text-xs truncate">
                        {templateSuccess ? 'Template Salvo com Sucesso!' : 'Tornar Template'}
                      </span>
                    </div>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                    title="Excluir permanentemente"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="text-xs truncate font-normal">{deleteLabel}</span>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Rodapé: Contagem de Palavras, Letras, Parágrafos e Linhas */}
          <div className="border-t border-stone-100 dark:border-white/5 pt-2 mt-2 px-1 pb-0.5 select-none">
            <div className="grid grid-cols-4 items-center justify-between text-center bg-stone-50 dark:bg-white/[0.03] border border-stone-200/60 dark:border-white/5 rounded-lg py-1.5 px-0.5 divide-x divide-stone-200/80 dark:divide-white/10">
              <div className="flex flex-col items-center px-0.5 min-w-0">
                <span className="text-[11px] font-bold text-stone-700 dark:text-neutral-200 font-mono leading-tight truncate w-full">
                  {words.toLocaleString('pt-BR')}
                </span>
                <span className="text-[8.5px] font-medium uppercase tracking-wider text-stone-400 dark:text-neutral-500 truncate w-full" title="Total de palavras">
                  palavras
                </span>
              </div>
              <div className="flex flex-col items-center px-0.5 min-w-0">
                <span className="text-[11px] font-bold text-stone-700 dark:text-neutral-200 font-mono leading-tight truncate w-full">
                  {letters.toLocaleString('pt-BR')}
                </span>
                <span className="text-[8.5px] font-medium uppercase tracking-wider text-stone-400 dark:text-neutral-500 truncate w-full" title="Total de letras / caracteres">
                  letras
                </span>
              </div>
              <div className="flex flex-col items-center px-0.5 min-w-0">
                <span className="text-[11px] font-bold text-stone-700 dark:text-neutral-200 font-mono leading-tight truncate w-full">
                  {paragraphs.toLocaleString('pt-BR')}
                </span>
                <span className="text-[8.5px] font-medium uppercase tracking-wider text-stone-400 dark:text-neutral-500 truncate w-full" title="Parágrafos (quebras de bloco)">
                  parágrafos
                </span>
              </div>
              <div className="flex flex-col items-center px-0.5 min-w-0">
                <span className="text-[11px] font-bold text-stone-700 dark:text-neutral-200 font-mono leading-tight truncate w-full">
                  {lines.toLocaleString('pt-BR')}
                </span>
                <span className="text-[8.5px] font-medium uppercase tracking-wider text-stone-400 dark:text-neutral-500 truncate w-full" title="Linhas visuais formadas no texto">
                  linhas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
