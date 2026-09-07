import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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

interface BoardNoteElementProps {
  element: BoardElement;
  isSelected: boolean;
  snappedHandle?: HandlePosition | null;
  zoom: number;
  onSelect: () => void;
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

  // Convert wikilinks [[Target|Alias]] or [[Target]] to badges
  const withWikilinks = cleaned.replace(/\[\[(.*?)(?:\|(.*?))?\]\]/g, (_m, target, alias) => {
    const text = alias || target;
    return `<span class="inline-flex items-center px-1.5 py-0.2 rounded bg-black/10 font-mono text-[11px] font-semibold border border-black/10">[[${text}]]</span>`;
  });

  try {
    return marked.parse(withWikilinks, { async: false, breaks: true }) as string;
  } catch {
    return withWikilinks;
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
  }, [cachedVaultDoc?.content, data.filePath, isEditing, data, noteTitle, onUpdate]);

  const handleUpdateTitle = useCallback((newTitle: string) => {
    onUpdate({
      data: {
        ...data,
        title: newTitle,
      }
    });
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
  }, [data.content, noteTitle, onUpdate, data]);

  // Rastreia estado da seleção antes do início do clique
  const handlePointerDown = (e: React.PointerEvent) => {
    wasSelectedRef.current = isSelected;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Clique simples: se já estava selecionada antes deste clique, entra em modo de edição
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.prevent-edit-trigger')) return;

    if (pointerDownPosRef.current) {
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
      if (dx > 5 || dy > 5) return;
    }

    if (wasSelectedRef.current && !isEditing) {
      setIsEditing(true);
    }
  };

  // Duplo clique: ativa edição imediatamente
  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.prevent-edit-trigger')) return;
    e.stopPropagation();
    setIsEditing(true);
  };

  const [showSyncModal, setShowSyncModal] = useState(false);
  const pendingDraftRef = useRef<string>(draftContent);

  const theme = getNoteTheme(data.color);

  // Salvar nota e sair do modo edição
  const saveAndExitEdit = useCallback(() => {
    setIsEditing(false);
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        saveAndExitEdit();
      }
    };

    window.addEventListener('pointerdown', handlePointerDownOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isEditing, saveAndExitEdit, showSyncModal]);

  // Se perder a seleção enquanto edita, salva e volta ao modo renderizado
  useEffect(() => {
    if (!isSelected && isEditing) {
      saveAndExitEdit();
    }
  }, [isSelected, isEditing, saveAndExitEdit]);

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
      onSelect();
    },
  }, {
    drag: {
      from: () => [element.x * zoom, element.y * zoom],
      filterTaps: true,
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
        onSelect();
        handleClick(e);
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDownCapture={(e) => {
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
        title={data.title}
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
            setIsEditing(true);
          }
        }}
        onUpdateColor={(newColor) => {
          onUpdate({ data: { ...data, color: newColor } });
        }}
        onCenterElement={onCenterElement}
        onDelete={onDelete}
      />

      {/* Cartão Delimitador da Nota */}
      <div
        {...bindDrag()}
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
              autoFocus
              value={draftContent}
              onChange={(e) => {
                setDraftContent(e.target.value);
              }}
              onKeyDownCapture={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                if (e.key === 'Escape') {
                  saveAndExitEdit();
                }
              }}
              className="w-full h-full resize-none bg-transparent outline-none font-sans text-xs leading-relaxed text-neutral-900 custom-scrollbar"
            />
          </div>
        ) : (
          <div
            className="board-note-preview w-full flex-1 min-h-0 p-4 pt-1 overflow-y-auto custom-scrollbar select-text cursor-default"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
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
