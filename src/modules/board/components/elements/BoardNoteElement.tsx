import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition, NoteData } from '../../types';
import { ElementHandles } from './ElementHandles';
import { BoardNoteTitle } from './BoardNoteTitle';
import { BoardNoteActions } from './BoardNoteActions';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { htmlToMarkdown } from '@/modules/vault/utils/markdownConverter';
import { marked } from 'marked';
import clsx from 'clsx';
import { cleanLegacyPlaceholder, cleanDuplicateTitle } from '@/utils/cleanLegacyPlaceholder';
import { UpdateOriginalNoteModal } from '@/modules/vault/components/UpdateOriginalNoteModal';
import { getCanvasNoteSyncPref, setCanvasNoteSyncPref } from '@/modules/vault/utils/canvasNoteSyncPref';
import { handleTextareaFormattingShortcut, handleTextareaAutoPairing } from '@/utils/textareaFormatting';

interface BoardNoteElementProps {
  element: BoardElement;
  isSelected: boolean;
  snappedHandle?: HandlePosition | null;
  zoom: number;
  onSelect: (e?: React.MouseEvent | React.PointerEvent) => void;
  onUpdate: (updates: Partial<BoardElement>) => void;
  onDelete: () => void;
  onStartArrow: (handle: HandlePosition, e: React.PointerEvent) => void;
  onCenterElement?: () => void;
  onSetEditing?: (isEditing: boolean) => void;
}

export const NOTE_THEMES: Record<string, { border: string; bg: string; name: string }> = {
  cobalt: { border: '#1831D7', bg: '#F4F0E6', name: 'Cobalto' },
  periwinkle: { border: '#7F95FF', bg: '#F4F0E6', name: 'Periwinkle' },
  cyan: { border: '#52B1FF', bg: '#F4F0E6', name: 'Celeste' },
  ice: { border: '#B4D3F1', bg: '#F4F0E6', name: 'Gelo' },
  midnight: { border: '#17192A', bg: '#F4F0E6', name: 'Meia-Noite' },
};

function getNoteTheme(color?: string) {
  if (!color) return NOTE_THEMES.cobalt;
  const lower = color.toLowerCase();
  for (const key of Object.keys(NOTE_THEMES)) {
    const t = NOTE_THEMES[key];
    if (t.border.toLowerCase() === lower || key === lower) {
      return t;
    }
  }
  if (lower.includes('cobalt') || lower.includes('1831d7')) return NOTE_THEMES.cobalt;
  if (lower.includes('periwinkle') || lower.includes('7f95ff')) return NOTE_THEMES.periwinkle;
  if (lower.includes('cyan') || lower.includes('52b1ff')) return NOTE_THEMES.cyan;
  if (lower.includes('ice') || lower.includes('b4d3f1')) return NOTE_THEMES.ice;
  if (lower.includes('midnight') || lower.includes('17192a')) return NOTE_THEMES.midnight;

  return NOTE_THEMES.cobalt;
}

function processMarkdownForPreview(markdown: string, title?: string): string {
  const cleaned = cleanDuplicateTitle(cleanLegacyPlaceholder(markdown), title);
  if (!cleaned) {
    return '';
  }

  // Convert Obsidian ==highlight== syntax to <mark>
  let processed = cleaned.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');

  // Convert wikilinks [[Target|Alias]] or [[Target]] to badges
  processed = processed.replace(/\[\[(.*?)(?:\|(.*?))?\]\]/g, (_m, target, alias) => {
    const text = alias || target;
    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded bg-black/10 font-mono text-[11px] font-semibold border border-black/10">[[${text}]]</span>`;
  });

  try {
    return marked.parse(processed, { async: false, breaks: true }) as string;
  } catch {
    return processed;
  }
}

export const BoardNoteElement: React.FC<BoardNoteElementProps> = ({
  element,
  isSelected,
  snappedHandle,
  zoom,
  onSelect,
  onUpdate,
  onDelete,
  onStartArrow,
  onCenterElement,
  onSetEditing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { provider } = useVaultStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const data = useMemo(() => (element.data || {}) as NoteData, [element.data]);
  const wasSelectedRef = useRef(isSelected);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ao entrar no modo de edição, foca a textarea e posiciona o cursor no final do texto
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // Nome/título da nota usado para filtrar duplicações
  const noteTitle = data.title || (data.filePath ? data.filePath.split('/').pop()?.replace(/\.(md|txt)$/i, '') : '') || '';

  // Notifica o hook do Board que este elemento está em modo de edição
  useEffect(() => {
    onSetEditing?.(isEditing);
    return () => {
      onSetEditing?.(false);
    };
  }, [isEditing, onSetEditing]);

  // Sincronização bidirecional do Vault para o Board em tempo real
  const cachedVaultDoc = useVaultStore(state => data.filePath ? state.documentCache[data.filePath] : undefined);
  useEffect(() => {
    if (!data.filePath || isEditing || !cachedVaultDoc?.content) return;
    const md = htmlToMarkdown(cachedVaultDoc.content);
    const cleaned = cleanDuplicateTitle(cleanLegacyPlaceholder(md), noteTitle);
    if (cleaned !== data.content) {
      setDraftContent(cleaned);
      onUpdate({ data: { ...data, content: cleaned } });
    }
  }, [cachedVaultDoc?.content, data.filePath, isEditing, data.content, noteTitle, onUpdate]);

  const handleUpdateTitle = useCallback(async (newTitle: string) => {
    const cleanTitle = newTitle.trim().replace(/\.(md|txt)$/i, '');
    if (!cleanTitle) return;

    try {
      const vaultStore = useVaultStore.getState();
      if (!vaultStore.provider) {
        await vaultStore.initializeStorage();
      }
    } catch (e) {
      console.warn('Erro ao inicializar storage do Vault no Board:', e);
    }

    if (data.filePath) {
      const normalizedPath = data.filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const parts = normalizedPath.split('/');
      const isTxt = normalizedPath.toLowerCase().endsWith('.txt');
      const ext = isTxt ? '.txt' : '.md';
      const currentFileName = parts[parts.length - 1].replace(/\.(md|txt)$/i, '');

      if (cleanTitle !== currentFileName) {
        const newFileName = `${cleanTitle}${ext}`;
        parts[parts.length - 1] = newFileName;
        const newPath = parts.join('/');

        try {
          await useVaultStore.getState().renameNode(data.filePath, newPath, false);

          onUpdate({
            data: {
              ...data,
              title: cleanTitle,
              filePath: newPath,
            }
          });
          return;
        } catch (err) {
          console.warn('Falha ao renomear nota no Vault a partir do Board, criando/recuperando no novo caminho:', err);
          try {
            const provider = useVaultStore.getState().provider;
            if (provider) {
              await provider.createDocument(newPath, data.content || '');
              await useVaultStore.getState().refreshNodes();
              onUpdate({
                data: {
                  ...data,
                  title: cleanTitle,
                  filePath: newPath,
                }
              });
              return;
            }
          } catch (createErr) {
            console.error('Falha ao recriar documento no Vault a partir do Board:', createErr);
          }
        }
      }
    } else {
      // Se não havia filePath vinculado, cria a nota no Vault para persistência real
      try {
        const createdPath = await useVaultStore.getState().createFile('', cleanTitle, data.content || '', false);
        if (createdPath) {
          onUpdate({
            data: {
              ...data,
              title: cleanTitle,
              filePath: createdPath,
            }
          });
          return;
        }
      } catch (err) {
        console.error('Erro ao criar nota no Vault a partir do título no Board:', err);
      }
    }

    onUpdate({
      data: {
        ...data,
        title: cleanTitle,
      }
    });
  }, [data, onUpdate]);

  // Observa renomeação externa da nota do Vault para manter o elemento sincronizado
  useEffect(() => {
    const handleVaultNodeRenamed = (e: Event) => {
      const customEvent = e as CustomEvent<{ oldPath: string; newPath: string }>;
      if (customEvent.detail && data.filePath) {
        const normOld = customEvent.detail.oldPath.replace(/\\/g, '/').replace(/^\/+/, '');
        const normCurrent = data.filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (normOld === normCurrent || customEvent.detail.oldPath === data.filePath) {
          const newPath = customEvent.detail.newPath.replace(/\\/g, '/').replace(/^\/+/, '');
          const newTitle = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';
          onUpdate({
            data: {
              ...data,
              filePath: newPath,
              title: newTitle,
            }
          });
        }
      }
    };

    window.addEventListener('vault_node_renamed', handleVaultNodeRenamed);
    return () => {
      window.removeEventListener('vault_node_renamed', handleVaultNodeRenamed);
    };
  }, [data, onUpdate]);

  // Estado local do rascunho de edição (limpando qualquer placeholder residual e título redundante)
  const [draftContent, setDraftContent] = useState(() => cleanDuplicateTitle(cleanLegacyPlaceholder(data.content), noteTitle));

  // Sincroniza draft quando o conteúdo externo mudar e não estivermos editando
  useEffect(() => {
    if (!isEditing) {
      setDraftContent(cleanDuplicateTitle(cleanLegacyPlaceholder(data.content), noteTitle));
    }
  }, [data.content, noteTitle, isEditing]);

  // Purga permanentemente qualquer placeholder residual gravado no banco de dados
  useEffect(() => {
    const cleaned = cleanDuplicateTitle(cleanLegacyPlaceholder(data.content), noteTitle);
    if (data.content && data.content !== cleaned) {
      onUpdate({
        data: {
          ...data,
          content: cleaned,
        }
      });
    }
  }, [data.content, noteTitle, onUpdate]);

  // Rastreia estado da seleção antes do início do clique
  const handlePointerDown = (e: React.PointerEvent) => {
    wasSelectedRef.current = isSelected;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Clique simples: se já estava selecionada antes deste clique, entra em modo de edição
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.prevent-edit-trigger')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;

    if (pointerDownPosRef.current) {
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
      if (dx > 5 || dy > 5) return;
    }

    if (wasSelectedRef.current && !isEditing) {
      setIsEditing(true);
    }
  };

  // Duplo clique: ativa seleção e edição imediatamente sem selecionar o texto nativamente
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.prevent-edit-trigger')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.stopPropagation();
    window.getSelection()?.removeAllRanges();
    prevIsSelectedRef.current = true;
    wasSelectedRef.current = true;
    onSelect(e);
    setIsEditing(true);
  };

  const [showSyncModal, setShowSyncModal] = useState(false);
  const pendingDraftRef = useRef<string>(draftContent);

  const theme = getNoteTheme(data.color);

  // Salvar nota e sair do modo edição
  const saveAndExitEdit = useCallback(() => {
    setIsEditing(false);
    wasSelectedRef.current = false;
    const cleanedDraft = cleanDuplicateTitle(cleanLegacyPlaceholder(draftContent), noteTitle);
    const hasChanged = cleanedDraft !== cleanDuplicateTitle(cleanLegacyPlaceholder(data.content || ''), noteTitle);

    if (hasChanged) {
      onUpdate({
        data: {
          ...data,
          content: cleanedDraft,
        }
      });
    }

    // Se for uma nota vinculada do Vault e o conteúdo mudou
    if (data.filePath && hasChanged) {
      const pref = getCanvasNoteSyncPref();
      if (pref === 'always') {
        useVaultStore.getState().syncCanvasNote(data.filePath, cleanedDraft);
      } else if (pref === 'never') {
        // Não sincroniza com o Vault
      } else {
        // 'ask': abre o modal de confirmação
        pendingDraftRef.current = cleanedDraft;
        setShowSyncModal(true);
      }
    }
  }, [data, draftContent, noteTitle, onUpdate]);

  const saveAndExitEditRef = useRef(saveAndExitEdit);
  saveAndExitEditRef.current = saveAndExitEdit;

  const handleAlwaysUpdate = useCallback(() => {
    setCanvasNoteSyncPref('always');
    if (data.filePath) {
      useVaultStore.getState().syncCanvasNote(data.filePath, pendingDraftRef.current);
    }
    setShowSyncModal(false);
  }, [data.filePath]);

  const handleJustOnce = useCallback(() => {
    if (data.filePath) {
      useVaultStore.getState().syncCanvasNote(data.filePath, pendingDraftRef.current);
    }
    setShowSyncModal(false);
  }, [data.filePath]);

  const handleDoNotUpdate = useCallback(() => {
    setShowSyncModal(false);
  }, []);

  // Click outside listener: ao clicar fora da nota enquanto edita, salva e volta ao modo renderizado
  useEffect(() => {
    if (!isEditing) return;

    const handlePointerDownOutside = (e: MouseEvent | PointerEvent) => {
      if (showSyncModal) return;
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        saveAndExitEditRef.current();
      }
    };

    // Pequeno atraso para evitar que eventos residuais do clique/duplo-clique inicial fechem prematuramente a edição
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDownOutside, true);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isEditing, showSyncModal]);

  // Se perder a seleção enquanto edita, salva e volta ao modo renderizado (apenas se estava selecionado anteriormente)
  const prevIsSelectedRef = useRef(isSelected);
  useEffect(() => {
    if (prevIsSelectedRef.current && !isSelected && isEditing) {
      saveAndExitEditRef.current();
    }
    prevIsSelectedRef.current = isSelected;
  }, [isSelected, isEditing]);

  const renderedHtml = useMemo(() => {
    const rawContent = isEditing
      ? draftContent
      : (draftContent !== undefined && draftContent !== '' ? draftContent : (data.content || ''));
    return processMarkdownForPreview(rawContent, noteTitle);
  }, [isEditing, draftContent, data.content, noteTitle]);

  // Arraste do elemento
  const bindDrag = useGesture({
    onDrag: ({ offset: [ox, oy], event }) => {
      event.stopPropagation();
      onUpdate({
        x: ox / zoom,
        y: oy / zoom,
      });
    },
    onDragStart: ({ event }) => {
      event.stopPropagation();
      onSelect(event as any);
    },
  }, {
    drag: {
      from: () => [element.x * zoom, element.y * zoom],
      filterTaps: false,
    }
  });

  // Redimensionamento interativo suave e preciso via Pointer Events
  const handleResizePointerDown = (
    direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's' | 'w' | 'n',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const startW = element.width;
    const startH = element.height;

    const MIN_W = 160;
    const MIN_H = 120;

    const handlePointerMove = (moveEv: PointerEvent) => {
      moveEv.stopPropagation();
      moveEv.preventDefault();

      const dx = (moveEv.clientX - startClientX) / zoom;
      const dy = (moveEv.clientY - startClientY) / zoom;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (direction.includes('e')) {
        newW = Math.max(MIN_W, startW + dx);
      }
      if (direction.includes('s')) {
        newH = Math.max(MIN_H, startH + dy);
      }
      if (direction.includes('w')) {
        const proposedW = startW - dx;
        if (proposedW >= MIN_W) {
          newW = proposedW;
          newX = startX + dx;
        } else {
          newW = MIN_W;
          newX = startX + (startW - MIN_W);
        }
      }
      if (direction.includes('n')) {
        const proposedH = startH - dy;
        if (proposedH >= MIN_H) {
          newH = proposedH;
          newY = startY + dy;
        } else {
          newH = MIN_H;
          newY = startY + (startH - MIN_H);
        }
      }

      onUpdate({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      upEv.stopPropagation();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: isSelected ? 50 : element.zIndex,
      }}
      className="group select-none outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={(e) => {
        containerRef.current?.focus({ preventScroll: true });
        handlePointerDown(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        containerRef.current?.focus({ preventScroll: true });
        onSelect(e);
        handleClick(e);
      }}
      onDoubleClick={handleDoubleClick}
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
      {/* Alças de Conexão no meio das 4 bordas */}
      <ElementHandles
        isVisible={isHovered || isSelected}
        snappedHandle={snappedHandle}
        onStartArrow={onStartArrow}
      />

      {/* Zonas de Redimensionamento Invisíveis nos 4 Ângulos da Nota */}
      <div
        onPointerDown={(e) => handleResizePointerDown('nw', e)}
        className="absolute -top-2 -left-2 w-6 h-6 cursor-nwse-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('ne', e)}
        className="absolute -top-2 -right-2 w-6 h-6 cursor-nesw-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('sw', e)}
        className="absolute -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />
      <div
        onPointerDown={(e) => handleResizePointerDown('se', e)}
        className="absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize z-40 pointer-events-auto"
        title="Redimensionar"
      />

      {/* Título/nome da nota em cima do retângulo de borda à esquerda */}
      <BoardNoteTitle
        title={noteTitle}
        onUpdateTitle={handleUpdateTitle}
      />

      {/* Botões de Opções de Interação (centralizados mais acima) */}
      <BoardNoteActions
        isSelected={isSelected}
        isHovered={isHovered}
        isEditing={isEditing}
        themeBorder={theme.border}
        themes={NOTE_THEMES}
        onToggleEdit={() => {
          if (isEditing) {
            saveAndExitEdit();
          } else {
            onSelect();
            setIsEditing(true);
          }
        }}
        onUpdateColor={(newColor) => {
          onUpdate({ data: { ...data, color: newColor } });
        }}
        onCenterElement={onCenterElement}
        onDelete={onDelete}
        onOpenInVault={data.filePath ? () => {
          useVaultStore.getState().openDocument(data.filePath!);
        } : undefined}
      />

      {/* Cartão Delimitador da Nota */}
      <div
        {...bindDrag()}
        onDoubleClick={handleDoubleClick}
        className={clsx(
          "w-full h-full rounded-2xl border-[3px] shadow-sm flex flex-col overflow-hidden relative cursor-grab active:cursor-grabbing",
          isSelected ? "shadow-lg shadow-black/10" : ""
        )}
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
        }}
      >
        {/* Corpo: Modo Edição Direto ou Preview Renderizado */}
        {isEditing ? (
          <div 
            className="w-full flex-1 min-h-0 flex flex-col p-4 cursor-text select-text"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <textarea
              ref={textareaRef}
              autoFocus
              value={draftContent}
              onChange={(e) => {
                setDraftContent(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  saveAndExitEdit();
                  return;
                }
                if (handleTextareaFormattingShortcut(e, setDraftContent)) {
                  return;
                }
                if (handleTextareaAutoPairing(e, setDraftContent)) {
                  return;
                }
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              className="w-full h-full resize-none bg-transparent outline-none font-sans text-xs leading-relaxed text-neutral-900 custom-scrollbar"
            />
          </div>
        ) : (
          <div
            className="board-note-preview w-full flex-1 min-h-0 p-4 pt-1 overflow-y-auto custom-scrollbar select-none cursor-default"
            onDoubleClick={(e) => {
              e.stopPropagation();
              window.getSelection()?.removeAllRanges();
              handleDoubleClick(e);
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

      </div>

      {/* Modal de Confirmação de Atualização da Nota Original */}
      <UpdateOriginalNoteModal
        isOpen={showSyncModal}
        onClose={handleDoNotUpdate}
        onAlwaysUpdate={handleAlwaysUpdate}
        onJustOnce={handleJustOnce}
        onDoNotUpdate={handleDoNotUpdate}
        fileName={data.filePath}
      />
    </div>
  );
};
