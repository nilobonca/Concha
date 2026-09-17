import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BoardElement, HandlePosition, NoteData } from '../../types';
import {
  BoardBaseNoteElement,
  NOTE_THEMES,
  getNoteTheme,
} from './BoardBaseNoteElement';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { htmlToMarkdown } from '@/modules/vault/utils/markdownConverter';
import { marked } from 'marked';
import { cleanLegacyPlaceholder, cleanDuplicateTitle } from '@/utils/cleanLegacyPlaceholder';
import { UpdateOriginalNoteModal } from '@/modules/vault/components/UpdateOriginalNoteModal';
import { getCanvasNoteSyncPref, setCanvasNoteSyncPref } from '@/modules/vault/utils/canvasNoteSyncPref';
import { handleTextareaFormattingShortcut, handleTextareaAutoPairing } from '@/utils/textareaFormatting';
import { SlashMenu, useSlashMenu } from '@/modules/common/components/SlashMenu';

export { NOTE_THEMES, getNoteTheme };

interface BoardNoteElementProps {
  element: BoardElement;
  isSelected: boolean;
  snappedHandle?: HandlePosition | null;
  zoom: number;
  canvasTheme?: 'dark' | 'light';
  onSelect: (e?: React.MouseEvent | React.PointerEvent) => void;
  onUpdate: (updates: Partial<BoardElement>) => void;
  onDelete: () => void;
  onStartArrow: (handle: HandlePosition, e: React.PointerEvent) => void;
  onCenterElement?: () => void;
  onSetEditing?: (isEditing: boolean) => void;
  onDragStart?: () => void;
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
    let parsed = marked.parse(processed, { async: false, breaks: true }) as string;
    if (parsed.includes('type="checkbox"')) {
      parsed = parsed.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (match, liAttrs, liInner) => {
        const inputMatch = liInner.match(/<input\b[^>]*type=["']?checkbox["']?[^>]*>/i);
        if (!inputMatch) return match;
        const inputTag = inputMatch[0];
        const isChecked = /\bchecked\b/i.test(inputTag);
        let cleanContent = liInner.replace(inputTag, '').trim();
        cleanContent = cleanContent.replace(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i, '$1').trim();
        return `<li data-type="taskItem" data-checked="${isChecked ? 'true' : 'false'}"${liAttrs}><label><input type="checkbox"${isChecked ? ' checked="checked"' : ''} disabled><span></span></label><div><p>${cleanContent}</p></div></li>`;
      });
      parsed = parsed.replace(/<ul\b([^>]*)>([\s\S]*?)<\/ul>/gi, (match, attrs, inner) => {
        if (inner.includes('data-type="taskItem"')) {
          return `<ul data-type="taskList"${attrs}>${inner}</ul>`;
        }
        return match;
      });
    }
    return parsed;
  } catch {
    return processed;
  }
}

export const BoardNoteElement: React.FC<BoardNoteElementProps> = ({
  element,
  isSelected,
  snappedHandle,
  zoom,
  canvasTheme = 'dark',
  onSelect,
  onUpdate,
  onDelete,
  onStartArrow,
  onCenterElement,
  onSetEditing,
  onDragStart,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const data = useMemo(() => (element.data || {}) as NoteData, [element.data]);
  const wasSelectedRef = useRef(isSelected);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Nome/título da nota usado para filtrar duplicações
  const noteTitle = data.title || (data.filePath ? data.filePath.split('/').pop()?.replace(/\.(md|txt)$/i, '') : '') || '';

  // Estado local do rascunho de edição
  const [draftContent, setDraftContent] = useState(() => cleanDuplicateTitle(cleanLegacyPlaceholder(data.content), noteTitle));

  const slashMenu = useSlashMenu({
    containerRef,
    textareaRef,
    onTextareaChange: setDraftContent,
  });

  // Ao entrar no modo de edição, foca a textarea e posiciona o cursor no final do texto
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

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
          const actualNewPath = await useVaultStore.getState().renameNode(data.filePath, newPath, false);

          onUpdate({
            data: {
              ...data,
              title: cleanTitle,
              filePath: actualNewPath || newPath,
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
              title: data.title || newTitle,
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

  // Salvar nota e sair do modo edição
  const saveAndExitEdit = useCallback(() => {
    slashMenu.close();
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
  }, [data, draftContent, noteTitle, onUpdate, slashMenu]);

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

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDownOutside, true);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDownOutside, true);
    };
  }, [isEditing, showSyncModal]);

  // Se perder a seleção enquanto edita, salva e volta ao modo renderizado
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

  return (
    <>
      <BoardBaseNoteElement
        containerRef={containerRef}
        element={element}
        isSelected={isSelected}
        snappedHandle={snappedHandle}
        zoom={zoom}
        canvasTheme={canvasTheme}
        color={data.color}
        title={noteTitle}
        minWidth={160}
        minHeight={120}
        isEditing={isEditing}
        cardClassName={isEditing ? '!overflow-visible' : undefined}
        contentClassName={isEditing ? '!overflow-visible' : undefined}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onStartArrow={onStartArrow}
        onUpdateTitle={handleUpdateTitle}
        onUpdateColor={(newColor) => onUpdate({ data: { ...data, color: newColor } })}
        onToggleEdit={() => {
          if (isEditing) {
            saveAndExitEdit();
          } else {
            onSelect();
            setIsEditing(true);
          }
        }}
        onCenterElement={onCenterElement}
        onOpenInVault={
          data.filePath
            ? () => {
                useVaultStore.getState().openDocument(data.filePath!);
              }
            : undefined
        }
        onDragStart={onDragStart}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <div
            className="w-full flex-1 min-h-0 flex flex-col p-4 cursor-text select-text relative"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <textarea
              ref={textareaRef}
              autoFocus
              value={draftContent}
              onChange={(e) => {
                setDraftContent(e.target.value);
                slashMenu.handleTextareaUpdate(e.currentTarget);
              }}
              onClick={(e) => {
                slashMenu.handleTextareaUpdate(e.currentTarget);
              }}
              onKeyUp={(e) => {
                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== 'Escape') {
                  slashMenu.handleTextareaUpdate(e.currentTarget);
                }
              }}
              onKeyDown={(e) => {
                if (slashMenu.handleTextareaKeyDown(e)) {
                  return;
                }
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
              className="w-full h-full resize-none bg-transparent outline-none font-sans text-xs leading-relaxed text-neutral-900 dark:text-neutral-100 custom-scrollbar"
            />

            {slashMenu.isOpen && (
              <SlashMenu
                items={slashMenu.filteredCommands}
                selectedIndex={slashMenu.selectedIndex}
                onSelect={slashMenu.executeCommand}
                onClose={slashMenu.close}
                position={slashMenu.position}
              />
            )}
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
      </BoardBaseNoteElement>

      {/* Modal de Confirmação de Atualização da Nota Original */}
      <UpdateOriginalNoteModal
        isOpen={showSyncModal}
        onClose={handleDoNotUpdate}
        onAlwaysUpdate={handleAlwaysUpdate}
        onJustOnce={handleJustOnce}
        onDoNotUpdate={handleDoNotUpdate}
        fileName={data.filePath}
      />
    </>
  );
};
