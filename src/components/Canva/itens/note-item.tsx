import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ActiveNote } from '@/interfaces/utils/indexedDB';
import { useCanvas } from '../canva-teste';
import { 
  Trash2, 
  Edit2, 
  Check, 
  Focus, 
  Palette, 
  Square, 
  Ban, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Plus, 
  Minus,
  BookOpen 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cleanLegacyPlaceholder, cleanDuplicateTitle } from '@/utils/cleanLegacyPlaceholder';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { htmlToMarkdown } from '@/modules/vault/utils/markdownConverter';
import { useCanvasGlobalStore } from '@/store/canvasStore';
import { UpdateOriginalNoteModal } from '@/modules/vault/components/UpdateOriginalNoteModal';
import { getCanvasNoteSyncPref, setCanvasNoteSyncPref } from '@/modules/vault/utils/canvasNoteSyncPref';
import { BoardNoteTitle } from '@/modules/board/components/elements/BoardNoteTitle';
import { handleTextareaFormattingShortcut, handleTextareaAutoPairing } from '@/utils/textareaFormatting';

interface NoteItemProps {
  note: ActiveNote;
  onUpdate: (note: ActiveNote) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => void;
  zIndex?: number;
  onContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * Calcula cor de texto de alto contraste (preto ou branco)
 * com base na luminância YIQ da cor de fundo hex.
 */
function getContrastTextColor(hexColor?: string): string {
  if (!hexColor || hexColor === 'transparent') return '#1c1917';
  const clean = hexColor.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 145 ? '#1c1917' : '#f8fafc';
  }
  return '#1c1917';
}

const PRESET_COLORS = [
  { name: 'Cobalto Oficial', hex: '#1831D7' },
  { name: 'Soft Periwinkle', hex: '#7F95FF' },
  { name: 'Sky Cyan', hex: '#52B1FF' },
  { name: 'Ice Blue Pastel', hex: '#B4D3F1' },
  { name: 'Marfim Claro', hex: '#F4F0E6' },
  { name: 'Midnight Navy', hex: '#17192A' },
  { name: 'Deep Midnight', hex: '#131524' },
];

export default function NoteItem({
  note,
  onUpdate,
  onDelete,
  isSelected = false,
  onSelect,
  zIndex,
  onContextMenu,
}: NoteItemProps) {
  const { centerOn } = useCanvas();
  const setEditingNoteId = useCanvasGlobalStore(state => state.setEditingNoteId);
  const selectedItemIds = useCanvasGlobalStore(state => state.selectedItemIds);
  const noteTitle = note.title || (note.vaultPath ? note.vaultPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') : '') || '';
  const [text, setText] = useState(() => cleanDuplicateTitle(cleanLegacyPlaceholder(note.content), noteTitle));
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const initialTextRef = useRef<string>(cleanDuplicateTitle(cleanLegacyPlaceholder(note.content), noteTitle));
  const pendingTextRef = useRef<string>(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasSelectedRef = useRef(isSelected);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sincroniza editingNoteId no store global para isolar atalhos e navegação de setas
  useEffect(() => {
    if (isEditing) {
      initialTextRef.current = text;
      setEditingNoteId(note.id);
    } else {
      setEditingNoteId(null);
    }
    return () => {
      setEditingNoteId(null);
    };
  }, [isEditing, note.id, setEditingNoteId]);

  // Conclui edição e gerencia modal de sincronização com a nota original
  const finishEditing = useCallback(() => {
    setIsEditing(false);
    const cleanedText = cleanDuplicateTitle(cleanLegacyPlaceholder(text), noteTitle);
    const hasChanged = cleanedText !== cleanDuplicateTitle(cleanLegacyPlaceholder(initialTextRef.current), noteTitle);

    if (hasChanged) {
      onUpdate({ ...note, content: cleanedText });
    }

    if (note.vaultPath && hasChanged) {
      const pref = getCanvasNoteSyncPref();
      if (pref === 'always') {
        useVaultStore.getState().syncCanvasNote(note.vaultPath, cleanedText);
      } else if (pref === 'never') {
        // Não sincroniza com o Vault
      } else {
        // 'ask': abre modal de confirmação
        pendingTextRef.current = cleanedText;
        setShowSyncModal(true);
      }
    }
  }, [note, text, noteTitle, onUpdate]);

  const handleAlwaysUpdate = useCallback(() => {
    setCanvasNoteSyncPref('always');
    if (note.vaultPath) {
      useVaultStore.getState().syncCanvasNote(note.vaultPath, pendingTextRef.current);
    }
    setShowSyncModal(false);
  }, [note.vaultPath]);

  const handleJustOnce = useCallback(() => {
    if (note.vaultPath) {
      useVaultStore.getState().syncCanvasNote(note.vaultPath, pendingTextRef.current);
    }
    setShowSyncModal(false);
  }, [note.vaultPath]);

  const handleDoNotUpdate = useCallback(() => {
    setShowSyncModal(false);
  }, []);

  const handleUpdateTitle = useCallback(async (newTitle: string) => {
    const cleanTitle = newTitle.trim().replace(/\.(md|txt)$/i, '');
    if (!cleanTitle) return;

    try {
      const vaultStore = useVaultStore.getState();
      if (!vaultStore.provider) {
        await vaultStore.initializeStorage();
      }
    } catch (e) {
      console.warn('Erro ao inicializar storage do Vault:', e);
    }

    if (note.vaultPath) {
      const normalizedPath = note.vaultPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = normalizedPath.split('/');
      const isTxt = normalizedPath.toLowerCase().endsWith('.txt');
      const ext = isTxt ? '.txt' : '.md';
      const currentFileName = parts[parts.length - 1].replace(/\.(md|txt)$/i, '');

      if (cleanTitle !== currentFileName) {
        const newFileName = `${cleanTitle}${ext}`;
        parts[parts.length - 1] = newFileName;
        const newPath = parts.join('/');

        try {
          await useVaultStore.getState().renameNode(note.vaultPath, newPath, false);

          onUpdate({
            ...note,
            title: cleanTitle,
            vaultPath: newPath,
          });
          return;
        } catch (err) {
          console.warn('Falha ao renomear arquivo existente no Vault, criando/recuperando no novo caminho:', err);
          try {
            const provider = useVaultStore.getState().provider;
            if (provider) {
              await provider.createDocument(newPath, note.content || '');
              await useVaultStore.getState().refreshNodes();
              onUpdate({
                ...note,
                title: cleanTitle,
                vaultPath: newPath,
              });
              return;
            }
          } catch (createErr) {
            console.error('Falha ao recriar documento no Vault:', createErr);
          }
        }
      }
    } else {
      // Se não havia vaultPath vinculado, cria a nota no Vault para persistência real
      try {
        const createdPath = await useVaultStore.getState().createFile('', cleanTitle, note.content || '', false);
        if (createdPath) {
          onUpdate({
            ...note,
            title: cleanTitle,
            vaultPath: createdPath,
          });
          return;
        }
      } catch (err) {
        console.error('Erro ao criar nota no Vault a partir do Canva:', err);
      }
    }

    onUpdate({
      ...note,
      title: cleanTitle,
    });
  }, [note, onUpdate]);

  // Observa renomeação externa da nota do Vault para manter a nota sincronizada
  useEffect(() => {
    const handleVaultNodeRenamed = (e: Event) => {
      const customEvent = e as CustomEvent<{ oldPath: string; newPath: string }>;
      if (customEvent.detail && note.vaultPath) {
        const normOld = customEvent.detail.oldPath.replace(/\\/g, '/').replace(/^\/+/, '');
        const normCurrent = note.vaultPath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (normOld === normCurrent || customEvent.detail.oldPath === note.vaultPath) {
          const newPath = customEvent.detail.newPath.replace(/\\/g, '/').replace(/^\/+/, '');
          const newTitle = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';
          onUpdate({
            ...note,
            vaultPath: newPath,
            title: newTitle,
          });
        }
      }
    };

    window.addEventListener('vault_node_renamed', handleVaultNodeRenamed);
    return () => {
      window.removeEventListener('vault_node_renamed', handleVaultNodeRenamed);
    };
  }, [note, onUpdate]);

  // Sincroniza conteúdo externo com estado local (sempre sanitizado quando não estiver editando)
  useEffect(() => {
    if (isEditing) return;
    setText(cleanDuplicateTitle(cleanLegacyPlaceholder(note.content), noteTitle));
  }, [note.content, noteTitle, isEditing]);

  // Purga permanentemente qualquer placeholder residual gravado no banco de dados quando não estiver editando
  useEffect(() => {
    if (isEditing) return;
    const cleaned = cleanDuplicateTitle(cleanLegacyPlaceholder(note.content), noteTitle);
    if (note.content && note.content !== cleaned) {
      onUpdate({ ...note, content: cleaned });
    }
  }, [note.content, noteTitle, onUpdate, note, isEditing]);

  // Se o item for desmarcado, fecha modo de edição e popover
  const prevIsSelectedRef = useRef(isSelected);
  useEffect(() => {
    if (prevIsSelectedRef.current && !isSelected) {
      if (isEditing) {
        finishEditing();
      }
      setShowColorPicker(false);
    }
    prevIsSelectedRef.current = isSelected;
  }, [isSelected, isEditing, finishEditing]);

  // Ao entrar no modo de edição, foca e coloca cursor no final
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Auto-ajuste de altura conforme o conteúdo digitado
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(100, textareaRef.current.scrollHeight)}px`;
    }
  }, [text, note.width, note.fontSize]);

  // Observa alterações no documento em cache do Vault para sincronização bidirecional em tempo real
  const vaultCachedDoc = useVaultStore(state => note.vaultPath ? state.documentCache[note.vaultPath] : undefined);

  useEffect(() => {
    if (!note.vaultPath || isEditing || !vaultCachedDoc?.content) return;
    const markdownFromVault = htmlToMarkdown(vaultCachedDoc.content);
    const cleaned = cleanDuplicateTitle(cleanLegacyPlaceholder(markdownFromVault), noteTitle);
    if (cleaned !== text) {
      setText(cleaned);
      onUpdate({ ...note, content: cleaned });
    }
  }, [vaultCachedDoc?.content, note.vaultPath, isEditing, text, note, noteTitle, onUpdate]);

  // Mudança de texto no canvas (sem salvar prematuramente no Vault)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    onUpdate({ ...note, content: val });
  };

  // Rastreia estado no mousedown
  const handleMouseDown = (e: React.MouseEvent) => {
    wasSelectedRef.current = isSelected;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Clique simples: se já ativo antes deste clique e não editando, ativa edição (apenas quando não houver modificadores e seleção única)
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.prevent-edit-trigger')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (selectedItemIds.size > 1) return;

    if (mouseDownPosRef.current) {
      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      if (dx > 5 || dy > 5) return;
    }

    if (wasSelectedRef.current && !isEditing) {
      setIsEditing(true);
    }
  };

  // Clique duplo: sempre ativa edição (a menos que esteja com modificadores)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.prevent-edit-trigger')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.stopPropagation();
    window.getSelection()?.removeAllRanges();
    onSelect?.(e);
    setIsEditing(true);
  };

  // Centralizar o canvas na posição da nota
  const handleCenterOnNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const w = note.width || 220;
    const h = textareaRef.current?.offsetHeight || 110;
    centerOn?.(note.position.x + w / 2, note.position.y + h / 2);
  };

  // Teclado na textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isEditing) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        finishEditing();
        textareaRef.current?.blur();
        return;
      }

      if (handleTextareaFormattingShortcut(e, (newVal) => {
        setText(newVal);
        onUpdate({ ...note, content: newVal });
      })) {
        return;
      }

      if (handleTextareaAutoPairing(e, (newVal) => {
        setText(newVal);
        onUpdate({ ...note, content: newVal });
      })) {
        return;
      }

      // Quando estiver em modo de edição, isola todos os eventos de tecla (incluindo setas direcionais)
      // para navegar exclusivamente dentro do texto da textarea sem mover a nota no canvas
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  // Blur na textarea
  const handleBlur = (e: React.FocusEvent) => {
    if (showSyncModal) return;
    // Se o clique foi no toolbar de opções, mantém o modo de edição
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest(`#note-toolbar-${note.id}`)) {
      return;
    }
    finishEditing();
  };

  // Alterações de estilo
  const handleColorChange = (color: string) => {
    onUpdate({ ...note, color, fillMode: 'filled', transparentBg: false });
  };

  const handleBorderColorChange = (borderColor: string) => {
    onUpdate({ ...note, borderColor });
  };

  const handleModeChange = (mode: 'filled' | 'transparent' | 'outlined') => {
    onUpdate({
      ...note,
      fillMode: mode,
      transparentBg: mode === 'transparent' || mode === 'outlined',
    });
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(64, (note.fontSize || 15) + delta));
    onUpdate({ ...note, fontSize: newSize });
  };

  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    onUpdate({ ...note, textAlign: align });
  };

  // Propriedades visuais do container
  const width = note.width || 220;
  const isFilled = note.fillMode === 'filled' || !note.fillMode;
  const isOutlined = note.fillMode === 'outlined';
  const isTransparent = note.fillMode === 'transparent';

  const bgColor = isFilled ? (note.color || '#F4F0E6') : 'transparent';
  const borderColor = isOutlined 
    ? (note.borderColor || '#7F95FF') 
    : isTransparent 
      ? (isSelected ? 'rgba(59, 130, 246, 0.4)' : 'transparent') 
      : 'rgba(0,0,0,0.08)';
  const borderWidth = isOutlined ? (note.borderWidth || 2) : 1;
  const textColor = note.fontColor || (isFilled ? getContrastTextColor(bgColor) : undefined);

  return (
    <div
      style={{ width }}
      className="relative select-none group"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDownCapture={(e) => {
        const targetTag = (e.target as HTMLElement)?.tagName;
        if (targetTag === 'TEXTAREA' || targetTag === 'INPUT') {
          return;
        }
        if (isEditing) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }
      }}
      onKeyDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }
      }}
    >
      {/* ============================================================
          TÍTULO / NOME DA NOTA EM CIMA DO RETÂNGULO DE BORDA À ESQUERDA
          ============================================================ */}
      <BoardNoteTitle
        title={noteTitle || 'Nota'}
        onUpdateTitle={handleUpdateTitle}
      />

      {/* ============================================================
          BOTÕES DE OPÇÕES CENTRALIZADOS MAIS ACIMA DA NOTA
          (Excluir, Cor, Centralizar Objeto, Editar)
          ============================================================ */}
      {isSelected && selectedItemIds.size <= 1 && (
        <div
          id={`note-toolbar-${note.id}`}
          style={{ top: -72 }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 dark:bg-[#181822]/95 backdrop-blur-md border border-stone-200/90 dark:border-white/10 rounded-xl p-1 shadow-md z-50 select-none prevent-item-drag prevent-edit-trigger text-stone-700 dark:text-neutral-200 animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Botão Excluir */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-stone-600 dark:text-neutral-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
            title="Excluir nota"
            aria-label="Excluir nota"
          >
            <Trash2 size={14} />
          </button>

          {/* 2. Botão Cor */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(prev => !prev);
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center relative"
              title="Cor e estilo"
              aria-label="Opções de cor e estilo"
            >
              <Palette size={14} />
              <span 
                className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-black/20 dark:border-white/20 shadow-2xs"
                style={{
                  backgroundColor: isFilled ? (note.color || '#F4F0E6') : 'transparent',
                  borderColor: isOutlined ? (note.borderColor || '#7F95FF') : undefined,
                  borderWidth: isOutlined ? 2 : 1
                }}
              />
            </button>

            {/* Menu Popover de Cores e Tipografia */}
            {showColorPicker && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-white dark:bg-[#181822] rounded-2xl shadow-2xl border border-stone-200/90 dark:border-white/10 w-64 flex flex-col gap-3 z-50 text-stone-900 dark:text-neutral-100 text-xs animate-in fade-in zoom-in-95 duration-150"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Seleção do Modo de Preenchimento */}
                <div className="flex gap-1 bg-stone-100 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleModeChange('filled')}
                    className={cn(
                      "flex-1 py-1 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-[11px] cursor-pointer",
                      isFilled 
                        ? "bg-white dark:bg-white/15 text-stone-900 dark:text-white shadow-xs" 
                        : "text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white"
                    )}
                  >
                    <Square size={12} fill="currentColor" />
                    <span>Cheio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('transparent')}
                    className={cn(
                      "flex-1 py-1 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-[11px] cursor-pointer",
                      isTransparent 
                        ? "bg-white dark:bg-white/15 text-stone-900 dark:text-white shadow-xs" 
                        : "text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white"
                    )}
                  >
                    <Ban size={12} />
                    <span>Livre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('outlined')}
                    className={cn(
                      "flex-1 py-1 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-[11px] cursor-pointer",
                      isOutlined 
                        ? "bg-white dark:bg-white/15 text-stone-900 dark:text-white shadow-xs" 
                        : "text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white"
                    )}
                  >
                    <Square size={12} />
                    <span>Borda</span>
                  </button>
                </div>

                {/* Paleta de Cores Pré-definidas */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-neutral-500">
                    {isOutlined ? 'Cor da Borda' : 'Cor de Fundo'}
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => isOutlined ? handleBorderColorChange(c.hex) : handleColorChange(c.hex)}
                        className={cn(
                          "w-7 h-7 rounded-lg border border-black/10 dark:border-white/10 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center relative",
                          (isOutlined ? note.borderColor === c.hex : note.color === c.hex) && "ring-2 ring-[#7F95FF] scale-105"
                        )}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                    {/* Seletor de Cor Livre Hex */}
                    <label 
                      className="w-7 h-7 rounded-lg border border-dashed border-stone-300 dark:border-white/20 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center relative overflow-hidden bg-stone-50 dark:bg-white/5"
                      title="Cor personalizada"
                    >
                      <input
                        type="color"
                        value={isOutlined ? (note.borderColor || '#7F95FF') : (note.color || '#F4F0E6')}
                        onChange={(e) => isOutlined ? handleBorderColorChange(e.target.value) : handleColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Palette size={13} className="text-stone-500 dark:text-neutral-400 pointer-events-none" />
                    </label>
                  </div>
                </div>

                {/* Ajuste de Tamanho de Fonte e Alinhamento */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200/80 dark:border-white/10 gap-2">
                  {/* Tamanho da Fonte */}
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-white/5 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleFontSizeChange(-2)}
                      className="p-1 hover:bg-white dark:hover:bg-white/10 rounded text-stone-600 dark:text-neutral-300 cursor-pointer"
                      title="Diminuir fonte"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-[11px] font-mono px-1 min-w-[20px] text-center font-semibold">
                      {note.fontSize || 15}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFontSizeChange(2)}
                      className="p-1 hover:bg-white dark:hover:bg-white/10 rounded text-stone-600 dark:text-neutral-300 cursor-pointer"
                      title="Aumentar fonte"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Alinhamento de Texto */}
                  <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-white/5 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleTextAlignChange('left')}
                      className={cn(
                        "p-1 rounded cursor-pointer transition-colors",
                        (note.textAlign === 'left' || !note.textAlign) 
                          ? "bg-white dark:bg-white/15 text-[#1831D7] dark:text-[#7F95FF] shadow-2xs" 
                          : "text-stone-500 hover:text-stone-900 dark:text-neutral-400"
                      )}
                      title="Alinhar à esquerda"
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTextAlignChange('center')}
                      className={cn(
                        "p-1 rounded cursor-pointer transition-colors",
                        note.textAlign === 'center' 
                          ? "bg-white dark:bg-white/15 text-[#1831D7] dark:text-[#7F95FF] shadow-2xs" 
                          : "text-stone-500 hover:text-stone-900 dark:text-neutral-400"
                      )}
                      title="Centralizar texto"
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTextAlignChange('right')}
                      className={cn(
                        "p-1 rounded cursor-pointer transition-colors",
                        note.textAlign === 'right' 
                          ? "bg-white dark:bg-white/15 text-[#1831D7] dark:text-[#7F95FF] shadow-2xs" 
                          : "text-stone-500 hover:text-stone-900 dark:text-neutral-400"
                      )}
                      title="Alinhar à direita"
                    >
                      <AlignRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Botão Centralizar Objeto */}
          <button
            type="button"
            onClick={handleCenterOnNote}
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            title="Centralizar objeto no canvas"
            aria-label="Centralizar nota no canvas"
          >
            <Focus size={14} />
          </button>

          {/* 4. Botão Abrir no Editor do Vault */}
          {note.vaultPath && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                useVaultStore.getState().openDocument(note.vaultPath!);
              }}
              onMouseDown={(e) => e.preventDefault()}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/10 text-stone-600 dark:text-neutral-300 hover:text-[#1831D7] dark:hover:text-[#7F95FF] transition-colors cursor-pointer flex items-center justify-center"
              title="Abrir nota original no editor do Vault"
              aria-label="Abrir nota no Vault"
            >
              <BookOpen size={14} />
            </button>
          )}

          {/* 5. Botão Editar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                finishEditing();
              } else {
                setIsEditing(true);
              }
            }}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center",
              isEditing 
                ? "bg-[#1831D7]/15 text-[#1831D7] dark:text-[#7F95FF] hover:bg-[#1831D7]/25" 
                : "text-stone-600 dark:text-neutral-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10"
            )}
            title={isEditing ? "Concluir edição (Esc)" : "Editar nota (Clique duplo)"}
            aria-label={isEditing ? "Concluir edição" : "Editar texto da nota"}
          >
            {isEditing ? <Check size={14} className="text-emerald-500" /> : <Edit2 size={14} />}
          </button>
        </div>
      )}

      {/* ============================================================
          CORPO DO RETÂNGULO DA NOTA (Textarea com auto-redimensionamento)
          ============================================================ */}
      <div
        className={cn(
          "rounded-2xl transition-all duration-150 relative overflow-hidden",
          isFilled && "shadow-md hover:shadow-lg",
          isEditing 
            ? "ring-2 ring-[#7F95FF] shadow-xl" 
            : (isSelected ? "ring-2 ring-[#1831D7]/80 shadow-md" : "hover:ring-1 hover:ring-black/15 dark:hover:ring-white/15")
        )}
        style={{
          backgroundColor: bgColor,
          border: `${borderWidth}px solid ${borderColor}`,
          color: textColor,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          readOnly={!isEditing}
          onSelect={() => {
            if (!isEditing) {
              window.getSelection()?.removeAllRanges();
            }
          }}
          placeholder="Digite sua nota..."
          className={cn(
            "w-full p-4 outline-none rounded-2xl font-medium leading-relaxed resize-none bg-transparent block transition-colors",
            isEditing 
              ? "prevent-item-drag cursor-text select-text" 
              : "cursor-grab select-none pointer-events-auto"
          )}
          style={{
            fontSize: note.fontSize || 15,
            textAlign: note.textAlign || 'left',
            minHeight: 110,
            color: textColor,
            userSelect: isEditing ? 'text' : 'none',
          }}
        />

        {note.vaultPath && !isEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              useVaultStore.getState().openDocument(note.vaultPath!);
            }}
            className="absolute bottom-1.5 right-2.5 flex items-center gap-1 text-[10px] text-stone-500/70 dark:text-neutral-400/70 hover:text-[#1831D7] dark:hover:text-[#7F95FF] hover:opacity-100 transition-all select-none cursor-pointer font-mono z-20 bg-white/80 dark:bg-black/40 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/10 shadow-2xs"
            title={`Abrir nota original no Vault: ${note.vaultPath}`}
          >
            <BookOpen size={10} />
            <span className="truncate max-w-[130px]">{note.vaultPath.split('/').pop()}</span>
          </button>
        )}
      </div>

      {/* Modal de Confirmação de Atualização da Nota Original */}
      <UpdateOriginalNoteModal
        isOpen={showSyncModal}
        onClose={handleDoNotUpdate}
        onAlwaysUpdate={handleAlwaysUpdate}
        onJustOnce={handleJustOnce}
        onDoNotUpdate={handleDoNotUpdate}
        fileName={note.vaultPath}
      />
    </div>
  );
}
