import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { EditorState } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { MarkdownSyntaxReveal } from '../extensions/MarkdownSyntaxRevealExtension';
import { FormattingShortcutsExtension } from '../extensions/FormattingShortcutsExtension';
import { VaultBubbleMenu } from './VaultBubbleMenu';
import { useVaultStore } from '../hooks/useVaultStore';
import { navigateToProject } from '@/utils/navigationHelper';
import { saveUserTemplate } from '../utils/templateStore';
import { markdownToHtml, htmlToMarkdown } from '../utils/markdownConverter';
import { parseFrontmatter, stringifyFrontmatter } from '../utils/frontmatterUtils';
import { 
  sanitizeVaultFileName, 
  WINDOWS_FORBIDDEN_CHARACTERS, 
  WINDOWS_FORBIDDEN_CHARS_DISPLAY, 
  stripInvalidWindowsChars 
} from '../utils/fileNameUtils';
import { VaultSourceEditor } from './VaultSourceEditor';
import { VaultReadingView } from './VaultReadingView';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { CustomTableView } from '../extensions/CustomTableView';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Callout } from '../extensions/CalloutExtension';
import { TiptapDatabaseExtension } from '@/modules/database/components/extensions/TiptapDatabaseExtension';
import { 
  Code, FileText, Search, 
  Sparkles, ChevronUp, 
  ChevronDown, Replace, X, Eye,
  FolderKanban, Music, AlertCircle, Loader2
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useIDB } from '@/utils/indexedDB';

const lowlight = createLowlight(common);
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { PromptInputModal } from './PromptInputModal';
import { VaultSlashMenu } from './VaultSlashMenu';
import { useSlashMenu } from '@/modules/common/components/SlashMenu';
import { FORMATTING_COMMANDS, FormattingCommand } from '../utils/formattingCommands';
import { useSpellCheckStore } from '@/store/spellCheckStore';

export interface VaultLinkSuggestion {
  kind: 'note' | 'canvas';
  id: string;
  name: string;
  folder?: string;
  fileType?: string;
  canvasType?: 'board' | 'audio';
  folderPath?: string | null;
  vaultName?: string | null;
}

interface VaultEditorProps {
  paneId?: string;
  documentPath?: string;
  isActive?: boolean;
}

export const VaultEditor: React.FC<VaultEditorProps> = ({ paneId, documentPath, isActive = true }) => {
  const { 
    activePath: globalActivePath, 
    activeContent: globalActiveContent, 
    updateContent, 
    updateDocumentContent,
    updateDocumentFrontmatter,
    loadDocumentContent,
    getDocumentContent,
    documentCache,
    storageType,
    openOrCreateDocumentByTitle,
    openCanvasTab,
    setCommandPaletteOpen,
    getAllFiles,
    searchNotesFuzzy,
    renameNode,
    deleteNode,
    viewMode,
    setViewMode,
    isNoteSearchOpen,
    setIsNoteSearchOpen,
    setActiveEditorRef,
    vaultId
  } = useVaultStore();

  const router = useRouter();
  const { activeLayers } = useIDB();
  const spellCheckEnabled = useSpellCheckStore(s => s.enabled);
  const spellCheckLanguages = useSpellCheckStore(s => s.languages);
  const langAttr = (spellCheckLanguages && spellCheckLanguages.length > 0 ? spellCheckLanguages : ['pt-BR']).join(' ');

  // Use documentPath prop if provided (multi-pane mode), otherwise fall back to global
  const activePath = documentPath || globalActivePath;
  const cachedDoc = activePath ? documentCache[activePath] : undefined;
  const activeContent = cachedDoc?.content ?? '';

  const [title, setTitle] = useState('');
  const [titleWarning, setTitleWarning] = useState<string | null>(null);
  const titleWarningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showTitleForbiddenWarning = () => {
    if (titleWarningTimerRef.current) {
      clearTimeout(titleWarningTimerRef.current);
    }
    setTitleWarning(WINDOWS_FORBIDDEN_CHARS_DISPLAY);
    titleWarningTimerRef.current = setTimeout(() => {
      setTitleWarning(null);
      titleWarningTimerRef.current = null;
    }, 3500);
  };

  const [templateSuccess, setTemplateSuccess] = useState(false);
  const [templatePromptOpen, setTemplatePromptOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isUpdatingFromStoreRef = useRef(false);
  const currentLoadedPathRef = useRef<string | null>(null);
  const prevViewModeRef = useRef(viewMode);

  // In-Note Search & Replace state (controlled via store)
  const searchOpen = isNoteSearchOpen;
  const setSearchOpen = setIsNoteSearchOpen;
  const [replaceMode, setReplaceMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<{ from: number; to: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when search is opened
  useEffect(() => {
    if (isNoteSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isNoteSearchOpen]);

  const [sourceValue, setSourceValue] = useState('');

  // Sync source editor text when switching to source mode or when active document changes
  useEffect(() => {
    if (viewMode === 'source' && activePath) {
      const bodyMd = htmlToMarkdown(activeContent || '');
      const fullMd = stringifyFrontmatter(cachedDoc?.frontmatter || {}, bodyMd);
      setSourceValue(fullMd);
    }
  }, [viewMode, activePath, cachedDoc?.frontmatter, activeContent]);

  const handleSourceChange = (newFullMd: string) => {
    setSourceValue(newFullMd);
    if (!activePath) return;

    const { data: frontmatter, content: bodyMd } = parseFrontmatter(newFullMd);
    const bodyHtml = markdownToHtml(bodyMd);

    updateDocumentFrontmatter(activePath, frontmatter);
    if (documentPath) {
      updateDocumentContent(documentPath, bodyHtml);
    } else {
      updateContent(bodyHtml);
    }
  };

  const handleSaveTitle = async () => {
    const trimmed = title.trim();
    if (trimmed && activePath) {
      const currentFileName = activePath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || '';
      const rawBase = trimmed.replace(/\.(md|txt)$/i, '');
      const cleanBase = sanitizeVaultFileName(rawBase, false) || currentFileName || 'Sem título';

      if (cleanBase !== currentFileName) {
        const parts = activePath.split('/');
        const isTxt = activePath.toLowerCase().endsWith('.txt');
        const defaultExt = isTxt ? 'txt' : 'md';
        const finalName = `${cleanBase}.${defaultExt}`;
        parts[parts.length - 1] = finalName;
        const targetPath = parts.join('/');
        try {
          await renameNode(activePath, targetPath, false);
          setTitle(cleanBase);
        } catch (err) {
          console.error('Erro ao renomear nota via título:', err);
          setTitle(currentFileName);
        }
      } else {
        setTitle(cleanBase);
      }
    }
  };

  // Autocomplete state for [[
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const isDefaultVault = vaultId === 'default-vault' || !vaultId;

  // Fechar o popup de sugestões [[ em interações externas (clique fora, scroll fora, perda de foco ou Escape)
  useEffect(() => {
    if (!suggestionOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setSuggestionOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setSuggestionOpen(false);
      }
    };

    const handleWindowBlur = () => {
      setSuggestionOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSuggestionOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [suggestionOpen]);

  // Available canvases in the Vault/database
  const allCanvases = useMemo(() => {
    return (activeLayers || []).filter(l => {
      const isMeta = l.isProjectMetadata || (!l.parentId && l.canvasType);
      if (!isMeta) return false;
      if (l.vaultId) return l.vaultId === vaultId;
      return isDefaultVault;
    });
  }, [activeLayers, vaultId, isDefaultVault]);

  // Unified suggestions combining notes and canvases
  const suggestions = useMemo<VaultLinkSuggestion[]>(() => {
    const q = suggestionQuery.trim().toLowerCase();

    // 1. Canvases from IDB
    const canvasItems: VaultLinkSuggestion[] = allCanvases
      .filter(c => {
        if (!q) return true;
        const nameMatch = c.name.toLowerCase().includes(q);
        const folderMatch = c.folderPath?.toLowerCase().includes(q);
        const typeMatch = (c.canvasType === 'board' ? 'quadro conexoes canvas board' : 'audio som musica canvas').includes(q);
        return nameMatch || folderMatch || typeMatch;
      })
      .map(c => ({
        kind: 'canvas' as const,
        id: c.id,
        name: c.name,
        canvasType: c.canvasType === 'audio' ? ('audio' as const) : ('board' as const),
        folderPath: c.folderPath,
        vaultName: c.vaultName,
      }));

    // 2. Notes from Vault
    const rawNotes = q ? searchNotesFuzzy(q) : getAllFiles();
    const noteItems: VaultLinkSuggestion[] = rawNotes.map(f => ({
      kind: 'note' as const,
      id: f.path,
      name: f.name.replace(/\.(md|txt)$/, ''),
      folder: f.folder,
      fileType: f.fileType,
    }));

    if (q) {
      // Prioritize canvases that match query alongside matched notes
      return [...canvasItems.slice(0, 5), ...noteItems.slice(0, 8)].slice(0, 10);
    }

    // Default when opening [[ without query: show canvases and top notes
    return [...canvasItems.slice(0, 4), ...noteItems.slice(0, 6)];
  }, [suggestionQuery, searchNotesFuzzy, getAllFiles, allCanvases]);

  const canCreateOption = Boolean(
    suggestionQuery.trim() &&
    !suggestions.some(s => s.name.toLowerCase() === suggestionQuery.trim().toLowerCase())
  );
  const totalSuggestionItems = suggestions.length + (canCreateOption ? 1 : 0);

  const suggestionsRef = useRef(suggestions);
  const suggestionOpenRef = useRef(suggestionOpen);
  const selectedIndexRef = useRef(selectedSuggestionIndex);
  const suggestionQueryRef = useRef(suggestionQuery);
  const canCreateRef = useRef(canCreateOption);
  const totalItemsRef = useRef(totalSuggestionItems);

  useEffect(() => {
    suggestionsRef.current = suggestions;
    canCreateRef.current = canCreateOption;
    totalItemsRef.current = totalSuggestionItems;
  }, [suggestions, canCreateOption, totalSuggestionItems]);

  useEffect(() => {
    suggestionOpenRef.current = suggestionOpen;
  }, [suggestionOpen]);

  useEffect(() => {
    selectedIndexRef.current = selectedSuggestionIndex;
  }, [selectedSuggestionIndex]);

  useEffect(() => {
    suggestionQueryRef.current = suggestionQuery;
  }, [suggestionQuery]);

  useEffect(() => {
    if (selectedSuggestionIndex >= totalSuggestionItems && totalSuggestionItems > 0) {
      setSelectedSuggestionIndex(0);
    }
  }, [totalSuggestionItems, selectedSuggestionIndex]);

  const doInsertWikilink = (view: EditorView, targetTitle: string) => {
    const { state, dispatch } = view;
    const { selection } = state;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
    const match = textBefore.match(/\[\[([^\]]*)$/);

    if (match) {
      const start = $from.pos - match[0].length;
      const end = $from.pos;
      const tr = state.tr.delete(start, end).insertText(`[[${targetTitle}]] `);
      dispatch(tr);
    }
    setSuggestionOpen(false);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Unified Slash Menu (/) Hook
  const slashMenu = useSlashMenu({ containerRef: scrollContainerRef });

  const editor = useEditor({
    editable: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Escreva suas anotações em Markdown... Dica: digite [[ para linkar com outra nota!',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#7F95FF] underline hover:text-[#52B1FF] cursor-pointer',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Table.configure({
        resizable: true,
        View: CustomTableView,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      TiptapDatabaseExtension,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      MarkdownSyntaxReveal,
      FormattingShortcutsExtension,
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[500px] text-stone-900 dark:text-neutral-100 leading-relaxed text-base font-normal',
        spellcheck: spellCheckEnabled ? 'true' : 'false',
        lang: langAttr,
      },
      handleKeyDown: (view, event) => {
        // 1. Slash command navigation (/)
        if (slashMenu.handleKeyDown(view, event)) {
          return true;
        }

        // 2. Wikilink autocomplete navigation ([[])
        if (suggestionOpenRef.current && totalItemsRef.current > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedSuggestionIndex(prev => (prev + 1) % totalItemsRef.current);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedSuggestionIndex(prev => (prev - 1 + totalItemsRef.current) % totalItemsRef.current);
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const currentIdx = selectedIndexRef.current;
            const currentSuggestions = suggestionsRef.current;
            if (currentIdx >= 0 && currentIdx < currentSuggestions.length) {
              doInsertWikilink(view, currentSuggestions[currentIdx].name);
              return true;
            } else if (canCreateRef.current && currentIdx === currentSuggestions.length) {
              doInsertWikilink(view, suggestionQueryRef.current.trim());
              return true;
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setSuggestionOpen(false);
            return true;
          }
        }
        return false;
      },
      handleClick: (view, pos, event) => {
        const mouseEvent = event as MouseEvent;
        // Follow link only when Ctrl or Cmd is held (standard Obsidian / Live Preview behavior)
        if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
          const aTag = (event.target as HTMLElement).closest('a');
          if (aTag) {
            const href = aTag.getAttribute('href');
            if (href) {
              if (href.startsWith('canvas:')) {
                event.preventDefault();
                openCanvasTab(href.replace('canvas:', ''));
                return true;
              } else if (href.startsWith('/board/')) {
                event.preventDefault();
                openCanvasTab(href.replace('/board/', ''));
                return true;
              } else if (href.startsWith('/project/') || href.startsWith('/project?')) {
                event.preventDefault();
                const projId = href.includes('?id=')
                  ? new URLSearchParams(href.split('?')[1]).get('id')
                  : href.replace('/project/', '');
                if (projId) {
                  navigateToProject(router, projId);
                } else {
                  router.push(href);
                }
                return true;
              }
            }
          }

          const target = (event.target as HTMLElement).closest('[data-wikilink-title]');
          let wikilinkTitle = target?.getAttribute('data-wikilink-title');

          if (!wikilinkTitle) {
            const { doc } = view.state;
            const $pos = doc.resolve(pos);
            const text = $pos.parent.textBetween(0, $pos.parent.content.size, undefined, '\0');
            const offset = $pos.parentOffset;
            const regex = /\[\[([^[\]|]+)(?:\|([^\]]+))?\]\]/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
              if (offset >= match.index && offset <= match.index + match[0].length) {
                wikilinkTitle = match[1].trim();
                break;
              }
            }
          }

          if (wikilinkTitle) {
            event.preventDefault();
            const normTitle = wikilinkTitle.trim().toLowerCase().replace(/\.(md|txt)$/, '');
            const matchCanvas = allCanvases.find(c => c.name.trim().toLowerCase() === normTitle);
            if (matchCanvas) {
              if (matchCanvas.canvasType === 'board') {
                openCanvasTab(matchCanvas.id, matchCanvas.name);
              } else {
                navigateToProject(router, matchCanvas.id, matchCanvas.name);
              }
              return true;
            }

            openOrCreateDocumentByTitle(wikilinkTitle);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        // 1. Paste URL over selection: converts selection into a markdown link (Obsidian behavior)
        if (/^https?:\/\/[^\s]+$/.test(text.trim())) {
          const { state } = view;
          const { selection } = state;
          if (!selection.empty) {
            event.preventDefault();
            editor?.chain().focus().setLink({ href: text.trim() }).run();
            return true;
          }
        }

        // 2. Paste raw markdown: parse if contains common markdown markers
        if (text.includes('#') || text.includes('**') || text.includes('[[') || text.includes('- ') || text.includes('> ') || text.includes('==')) {
          event.preventDefault();
          const html = markdownToHtml(text);
          editor?.commands.insertContent(html);
          return true;
        }
        return false;
      },
    },
    content: activeContent || '',
    onUpdate: ({ editor }) => {
      if (isUpdatingFromStoreRef.current) return;
      const html = editor.getHTML();
      if (documentPath) {
        updateDocumentContent(documentPath, html);
      } else {
        updateContent(html);
      }

      // Check for [[ autocomplete trigger
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
      const match = textBefore.match(/\[\[([^\]]*)$/);

        if (match) {
          setSuggestionQuery(match[1]);
          setSuggestionOpen(true);
          setSelectedSuggestionIndex(0);
          slashMenu.close();

          try {
            const coords = editor.view.coordsAtPos($from.pos);
            const container = scrollContainerRef.current?.getBoundingClientRect();
            if (container && coords) {
              const top = coords.bottom - container.top + (scrollContainerRef.current?.scrollTop || 0) + 6;
              const left = Math.max(16, Math.min(coords.left - container.left, (container.width || 500) - 330));
              setSuggestionPosition({ top, left });
            }
          } catch {
            setSuggestionPosition(null);
          }
        } else {
          setSuggestionOpen(false);
          slashMenu.handleUpdate(editor);
        }
      },
      onSelectionUpdate: ({ editor }) => {
        slashMenu.handleSelectionUpdate(editor);
        if (suggestionOpenRef.current) {
          const { selection } = editor.state;
          const { $from } = selection;
          const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
          const match = textBefore.match(/\[\[([^\]]*)$/);
          if (!match) {
            setSuggestionOpen(false);
          }
        }
      },
  });

  // Keep active editor reference synced with store
  useEffect(() => {
    if (editor && isActive) {
      setActiveEditorRef(editor);
    }
    return () => {
      if (useVaultStore.getState().activeEditorRef === editor) {
        setActiveEditorRef(null);
      }
    };
  }, [editor, isActive, setActiveEditorRef]);

  // Atualiza atributos de verificação ortográfica e idioma dinamicamente sem recriar o editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view?.dom;
    if (dom) {
      dom.setAttribute('spellcheck', spellCheckEnabled ? 'true' : 'false');
      dom.setAttribute('lang', langAttr);
    }
  }, [editor, spellCheckEnabled, langAttr]);

  // Fechar menus de comando slash (/) e autocomplete ([[]) ao trocar de documento ou alternar visualização
  useEffect(() => {
    slashMenu.close();
    setSuggestionOpen(false);
  }, [activePath, viewMode, slashMenu]);

  // Fechar menus de comando slash (/) e autocomplete ([[]) se a busca interna na nota for aberta
  useEffect(() => {
    if (searchOpen) {
      slashMenu.close();
      setSuggestionOpen(false);
    }
  }, [searchOpen, slashMenu]);

  // Sync title from activePath
  useEffect(() => {
    if (activePath) {
      const fileName = activePath.split('/').pop() || '';
      setTitle(fileName.replace(/\.(md|txt)$/, ''));
    }
  }, [activePath]);

  // Flush qualquer salvamento pendente ao fechar a janela/aba ou desmontar o editor
  useEffect(() => {
    const handleBeforeUnload = () => {
      useVaultStore.getState().flushPendingSaves();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      useVaultStore.getState().flushPendingSaves();
    };
  }, []);

  // Load document content if not yet loaded in cache
  useEffect(() => {
    if (activePath && !activePath.startsWith('canvas:') && !activePath.startsWith('new-tab:') && !documentCache[activePath]) {
      loadDocumentContent(activePath);
    }
  }, [activePath, documentCache, loadDocumentContent]);

  // Sincroniza o conteúdo quando o documento ativo muda ou ao alternar modos de visualização
  useEffect(() => {
    if (!editor || !activePath) return;

    const hasPathChanged = currentLoadedPathRef.current !== activePath;
    const switchedFromSource = prevViewModeRef.current === 'source' && viewMode === 'live';
    prevViewModeRef.current = viewMode;

    // 1. Mudança de arquivo (trocou de aba ou selecionou outra nota na barra lateral)
    // ou retorno do modo código/fonte para live
    if (hasPathChanged || switchedFromSource) {
      // Se a nota ainda está sendo carregada do disco/IndexedDB pela primeira vez:
      if (!cachedDoc) {
        // Limpa o conteúdo no editor para garantir que resquícios da nota anterior não persistam,
        // mas NÃO marca o path como carregado para aguardar a chegada dos dados do cache.
        isUpdatingFromStoreRef.current = true;
        editor.commands.setContent('');
        isUpdatingFromStoreRef.current = false;
        return;
      }

      currentLoadedPathRef.current = activePath;
      isUpdatingFromStoreRef.current = true;
      editor.commands.setContent(cachedDoc.content || '');
      try {
        const freshState = EditorState.create({
          schema: editor.state.schema,
          doc: editor.state.doc,
          plugins: editor.state.plugins,
        });
        editor.view.updateState(freshState);
      } catch (err) {
        console.warn('Erro ao resetar histórico do ProseMirror no editor:', err);
      }
      isUpdatingFromStoreRef.current = false;
      return;
    }

    // 2. Se for o mesmo documento, NUNCA sobrescreve se o editor estiver com foco (usuário digitando).
    // O editor ativo é a fonte primária da verdade e emite onUpdate para a store.
    if (editor.isFocused) {
      return;
    }

    // 3. Caso o documento ativo tenha acabado de carregar do disco ou chegado de sincronização externa
    if (cachedDoc && currentLoadedPathRef.current === activePath) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== cachedDoc.content && !cachedDoc.isDirty) {
        isUpdatingFromStoreRef.current = true;
        editor.commands.setContent(cachedDoc.content || '');
        isUpdatingFromStoreRef.current = false;
      }
    }
  }, [activePath, cachedDoc, editor, viewMode]);

  // Compute search matches whenever doc or searchTerm or caseSensitive changes
  useEffect(() => {
    if (!editor || !searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const doc = editor.state.doc;
    const found: { from: number; to: number }[] = [];
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');

    doc.descendants((node, pos) => {
      if (!node.isText) return;
      const text = node.text || '';
      let match;
      while ((match = regex.exec(text)) !== null) {
        found.push({
          from: pos + match.index,
          to: pos + match.index + match[0].length,
        });
      }
    });

    setMatches(found);
    if (found.length > 0) {
      setCurrentMatchIndex(prev => Math.min(prev, found.length - 1));
    } else {
      setCurrentMatchIndex(0);
    }
  }, [editor, searchTerm, caseSensitive, activeContent]);

  const goToMatch = (idx: number, currentMatches: { from: number; to: number }[] = matches) => {
    if (!editor || currentMatches.length === 0) return;
    const target = currentMatches[idx];
    if (target) {
      editor.chain().focus().setTextSelection({ from: target.from, to: target.to }).scrollIntoView().run();
      setCurrentMatchIndex(idx);
    }
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    goToMatch(nextIdx);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    goToMatch(prevIdx);
  };

  const handleReplaceCurrent = () => {
    if (!editor || matches.length === 0) return;
    const current = matches[currentMatchIndex];
    if (current) {
      editor.chain().focus().insertContentAt({ from: current.from, to: current.to }, replaceTerm).run();
    }
  };

  const handleReplaceAll = () => {
    if (!editor || matches.length === 0) return;
    const { state, dispatch } = editor.view;
    let tr = state.tr;
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      tr = tr.insertText(replaceTerm, m.from, m.to);
    }
    dispatch(tr);
  };

  // Keyboard shortcuts: Ctrl+F (Search), Ctrl+H (Replace), Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setReplaceMode(false);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setSearchOpen(true);
        setReplaceMode(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (editor && editor.isFocused) {
          e.preventDefault();
          const { state, dispatch } = editor.view;
          const { selection } = state;
          if (!selection.empty) {
            const selectedText = state.doc.textBetween(selection.from, selection.to);
            const tr = state.tr.replaceWith(selection.from, selection.to, state.schema.text(`[[${selectedText}]]`));
            dispatch(tr);
          } else {
            editor.chain().focus().insertContent('[[').run();
          }
          return;
        }
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          editor?.commands.focus();
        } else if (editor?.isFocused) {
          editor.commands.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, searchOpen]);

  // Handle inserting a selected suggestion
  const insertWikilink = (targetTitle: string) => {
    if (!editor) return;
    doInsertWikilink(editor.view, targetTitle);
  };

  const handleMakeTemplate = () => {
    if (!title) return;
    setTemplatePromptOpen(true);
  };

  const handleSaveTemplate = (templateName: string) => {
    if (!templateName || !templateName.trim()) return;

    saveUserTemplate({
      name: templateName.trim(),
      content: activeContent,
      description: `Criado a partir da nota ${title}`
    });

    setTemplateSuccess(true);
    setTimeout(() => setTemplateSuccess(false), 3000);
  };

  const handleDeleteNote = async () => {
    if (!activePath) return;
    const skipConfirm = typeof window !== 'undefined' && localStorage.getItem('vault_skip_delete_confirm') === 'true';
    if (skipConfirm) {
      await deleteNode(activePath, false);
      return;
    }
    setDeleteConfirmOpen(true);
  };

  if (!activePath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-stone-500 dark:text-neutral-400 p-8 select-none bg-stone-50/40 dark:bg-black/20">
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 border border-stone-200/90 dark:border-white/10 flex items-center justify-center mb-4 text-stone-400 dark:text-neutral-500 shadow-xs">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-stone-800 dark:text-stone-100 mb-1">Nenhum documento aberto</h3>
        <p className="text-xs text-stone-500 dark:text-neutral-400 max-w-sm text-center mb-4 leading-relaxed">
          Selecione uma nota na barra lateral, crie uma nova ou use a Command Palette para buscar.
        </p>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-200 border border-stone-200/90 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-400" />
          <span>Buscar Notas (Ctrl+P)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0E0E12] overflow-hidden relative">
      {/* Floating In-Note Find & Replace Widget (Ctrl+F / Ctrl+H) */}
      {searchOpen && (
        <div className="absolute top-4 right-8 z-30 bg-white/95 dark:bg-[#16161D]/95 backdrop-blur-md border border-stone-200/90 dark:border-white/10 rounded-xl shadow-2xl p-2.5 flex flex-col gap-2 w-84 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Localizar na nota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) handlePrevMatch();
                    else handleNextMatch();
                  }
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                className="w-full bg-stone-50 dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-stone-900 dark:text-neutral-100 outline-none focus:border-[#7F95FF] pr-14"
              />
              <span className="absolute right-2 text-[10px] text-stone-400 dark:text-neutral-500 font-mono select-none">
                {searchTerm ? (matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : '0/0') : ''}
              </span>
            </div>

            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`px-1.5 py-1 rounded font-mono text-[10px] border transition-colors cursor-pointer ${caseSensitive ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 border-[#7F95FF] text-[#1831D7] dark:text-[#7F95FF] font-bold' : 'border-stone-200 dark:border-white/10 text-stone-500 hover:bg-stone-100 dark:hover:bg-white/5'}`}
              title="Diferenciar maiúsculas/minúsculas"
            >
              Aa
            </button>

            <button
              onClick={handlePrevMatch}
              disabled={matches.length === 0}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-white/5 text-stone-600 dark:text-neutral-300 disabled:opacity-30 cursor-pointer"
              title="Ocorrência anterior (Shift+Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleNextMatch}
              disabled={matches.length === 0}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-white/5 text-stone-600 dark:text-neutral-300 disabled:opacity-30 cursor-pointer"
              title="Próxima ocorrência (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setReplaceMode(!replaceMode)}
              className={`p-1 rounded border transition-colors cursor-pointer ${replaceMode ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 border-[#7F95FF] text-[#1831D7] dark:text-[#7F95FF]' : 'border-stone-200 dark:border-white/10 text-stone-500 hover:bg-stone-100 dark:hover:bg-white/5'}`}
              title="Alternar modo Substituir"
            >
              <Replace className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setSearchOpen(false)}
              className="p-1 rounded hover:bg-stone-100 dark:hover:bg-white/5 text-stone-400 hover:text-stone-600 dark:hover:text-neutral-200 cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {replaceMode && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-stone-200/80 dark:border-white/10">
              <input
                type="text"
                placeholder="Substituir por..."
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleReplaceCurrent();
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                className="flex-1 bg-stone-50 dark:bg-black/40 border border-stone-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-stone-900 dark:text-neutral-100 outline-none focus:border-[#7F95FF]"
              />
              <button
                onClick={handleReplaceCurrent}
                disabled={matches.length === 0}
                className="px-2 py-1 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 rounded-lg text-stone-700 dark:text-neutral-200 text-[11px] font-medium disabled:opacity-30 cursor-pointer"
              >
                Substituir
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={matches.length === 0}
                className="px-2 py-1 bg-[#1831D7]/10 hover:bg-[#1831D7]/20 border border-[#7F95FF]/30 text-[#1831D7] dark:text-[#7F95FF] rounded-lg text-[11px] font-medium disabled:opacity-30 cursor-pointer"
              >
                Tudo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor Content Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar relative bg-white dark:bg-[#0E0E12] text-stone-900 dark:text-stone-100"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            editor?.commands.blur();
          }
        }}
      >
        <div 
          className="max-w-4xl mx-auto relative min-h-full pb-32"
          onClick={(e) => {
            if (e.target === e.currentTarget && viewMode === 'live') {
              editor?.commands.blur();
            }
          }}
        >
          {/* Quick Contextual Table Controls (when cursor is inside a table) */}
          {editor && viewMode === 'live' && editor.isActive('table') && (
            <div className="sticky top-0 z-20 mb-4 flex items-center gap-1 bg-white/95 dark:bg-[#16161F]/95 backdrop-blur-md border border-[#7F95FF]/30 p-1.5 rounded-xl shadow-md text-xs animate-in fade-in duration-100 w-fit">
              <span className="text-[10px] font-semibold text-[#1831D7] dark:text-[#7F95FF] px-1.5">Tabela:</span>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="px-2 py-0.5 text-[11px] rounded-md hover:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] font-medium cursor-pointer"
              >
                +Linha
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="px-2 py-0.5 text-[11px] rounded-md hover:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] font-medium cursor-pointer"
              >
                +Coluna
              </button>
              <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="px-1.5 py-0.5 text-[11px] rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium cursor-pointer"
              >
                -Linha
              </button>
              <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="px-1.5 py-0.5 text-[11px] rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium cursor-pointer"
              >
                -Coluna
              </button>
              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="px-1.5 py-0.5 text-[11px] rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium cursor-pointer"
              >
                Excluir
              </button>
            </div>
          )}

          {/* Integrated Document Title */}
          <div className="mb-6 pt-2">
            {viewMode === 'reading' ? (
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-neutral-100 leading-tight">
                {title || 'Sem título'}
              </h1>
            ) : (
              <div className="flex flex-col w-full">
                <input
                  type="text"
                  placeholder="Sem título"
                  value={title}
                  onChange={(e) => {
                    const { clean, hadInvalid } = stripInvalidWindowsChars(e.target.value);
                    if (hadInvalid) {
                      showTitleForbiddenWarning();
                    }
                    setTitle(clean);
                  }}
                  onBeforeInput={(e: React.FormEvent<HTMLInputElement> & { data?: string }) => {
                    if (e.data && /[<>:"/\\|?*\x00-\x1f\x7f]/.test(e.data)) {
                      e.preventDefault();
                      showTitleForbiddenWarning();
                    }
                  }}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if ((WINDOWS_FORBIDDEN_CHARACTERS as readonly string[]).includes(e.key)) {
                      e.preventDefault();
                      showTitleForbiddenWarning();
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveTitle();
                      editor?.commands.focus('start');
                    }
                  }}
                  className="w-full text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-neutral-100 placeholder-stone-400 dark:placeholder-neutral-600 bg-transparent outline-none border-none p-0 focus:ring-0 leading-tight selection:bg-[#1831D7]/20"
                />

                {titleWarning && (
                  <div 
                    className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-[#1C1814] text-stone-900 dark:text-neutral-100 border border-amber-500/50 rounded-lg text-xs shadow-md w-max max-w-[340px] leading-snug select-none"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-700 dark:text-amber-300 text-xs">Caractere não permitido</div>
                      <div className="text-[11px] text-stone-600 dark:text-neutral-300 mt-0.5">
                        O título do arquivo não pode conter:
                      </div>
                      <div className="font-mono font-bold text-amber-700 dark:text-amber-300 mt-1 tracking-widest bg-amber-500/10 dark:bg-black/50 border border-amber-500/20 px-2 py-0.5 rounded text-center text-xs">
                        \ / : * ? &quot; &lt; &gt; |
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicador de carregamento enquanto a nota é lida do disco pela primeira vez */}
          {!cachedDoc && activePath && (
            <div className="py-20 flex flex-col items-center justify-center text-stone-400 dark:text-neutral-500 animate-pulse select-none">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400 dark:text-neutral-500 mb-2" />
              <span className="text-xs font-medium">Carregando nota...</span>
            </div>
          )}

          <div className={!cachedDoc && activePath ? 'hidden' : 'contents'}>
            {viewMode === 'live' && (
              <>
                <VaultBubbleMenu editor={editor} />
                <EditorContent editor={editor} />
              </>
            )}

            {viewMode === 'source' && (
              <VaultSourceEditor
                value={sourceValue}
                onChange={handleSourceChange}
              />
            )}

            {viewMode === 'reading' && (
              <VaultReadingView
                content={htmlToMarkdown(activeContent || '')}
              />
            )}
          </div>

          {/* Slash Command Popup when user types / */}
          {slashMenu.isOpen && (
            <VaultSlashMenu
              items={slashMenu.filteredCommands}
              selectedIndex={slashMenu.selectedIndex}
              onSelect={slashMenu.executeCommand}
              onClose={slashMenu.close}
              position={slashMenu.position}
            />
          )}

          {/* Autocomplete Popup when user types [[ */}
          {suggestionOpen && (
            <div 
              ref={suggestionRef}
              style={suggestionPosition ? { top: `${suggestionPosition.top}px`, left: `${suggestionPosition.left}px` } : undefined}
              className={`absolute z-30 w-84 bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${!suggestionPosition ? 'left-0 top-12' : ''}`}
            >
              <div className="px-3 py-1.5 bg-stone-50 dark:bg-black/40 border-b border-stone-200 dark:border-white/10 text-[11px] text-stone-500 dark:text-neutral-400 flex items-center justify-between">
                <span>Linkar com nota ou canvas:</span>
                <span className="font-mono text-[#1831D7] dark:text-[#7F95FF] font-semibold truncate max-w-[120px]">[[{suggestionQuery}</span>
              </div>
              <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                {suggestions.map((item, idx) => {
                  const isSelected = idx === selectedSuggestionIndex;
                  const isCanvas = item.kind === 'canvas';
                  const isBoard = isCanvas && item.canvasType === 'board';

                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      ref={el => {
                        if (isSelected) {
                          el?.scrollIntoView({ block: 'nearest' });
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => insertWikilink(item.name)}
                      onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? isCanvas
                            ? isBoard
                              ? 'bg-[#1831D7] text-white font-medium shadow-xs'
                              : 'bg-cyan-600 text-white font-medium shadow-xs'
                            : 'bg-[#1831D7] text-white font-medium shadow-xs'
                          : 'text-stone-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {isCanvas ? (
                          isBoard ? (
                            <FolderKanban className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#1831D7] dark:text-[#7F95FF]'}`} />
                          ) : (
                            <Music className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-cyan-500 dark:text-cyan-400'}`} />
                          )
                        ) : (
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#1831D7] dark:text-[#7F95FF]'}`} />
                        )}
                        <span className="truncate font-medium">{item.name}</span>
                        {item.folder && (
                          <span className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-stone-400 dark:text-neutral-500'}`}>
                            em {item.folder}
                          </span>
                        )}
                      </div>

                      <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isCanvas
                            ? isBoard
                              ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] border border-[#7F95FF]/30'
                              : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/40'
                            : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-neutral-400'
                      }`}>
                        {isCanvas ? (isBoard ? 'Quadro' : 'Áudio') : 'Nota'}
                      </span>
                    </div>
                  );
                })}

                {canCreateOption && (
                  <div
                    ref={el => {
                      if (selectedSuggestionIndex === suggestions.length) {
                        el?.scrollIntoView({ block: 'nearest' });
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => insertWikilink(suggestionQuery.trim())}
                    onMouseEnter={() => setSelectedSuggestionIndex(suggestions.length)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors border-t border-stone-200 dark:border-white/10 mt-1 ${
                      selectedSuggestionIndex === suggestions.length
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    }`}
                  >
                    <span className="truncate">Criar nota: <strong>&quot;{suggestionQuery.trim()}&quot;</strong></span>
                  </div>
                )}
              </div>
              <div className="px-2.5 py-1 bg-stone-50 dark:bg-black/40 border-t border-stone-200 dark:border-white/10 text-[10px] text-stone-500 dark:text-neutral-500 flex items-center justify-between select-none">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-neutral-800 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-neutral-400 font-mono text-[9px]">↑↓</kbd> Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-neutral-800 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-neutral-400 font-mono text-[9px]">↵</kbd> Confirmar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-neutral-800 border border-stone-200 dark:border-white/10 text-stone-600 dark:text-neutral-400 font-mono text-[9px]">Esc</kbd>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-app Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        itemName={title || 'Sem título'}
        itemPath={activePath || undefined}
        isFolder={false}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (activePath) {
            await deleteNode(activePath, false);
            setDeleteConfirmOpen(false);
          }
        }}
      />

      {/* In-app Prompt Input Modal */}
      <PromptInputModal
        isOpen={templatePromptOpen}
        title="Criar Modelo de Template"
        description="Digite um nome para o novo modelo baseado nesta nota:"
        defaultValue={title}
        placeholder="Nome do template..."
        confirmText="Salvar Template"
        onClose={() => setTemplatePromptOpen(false)}
        onConfirm={handleSaveTemplate}
      />
    </div>
  );
};
