import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import { FORMATTING_COMMANDS, FormattingCommand } from '@/modules/vault/utils/formattingCommands';

export interface UseSlashMenuOptions {
  containerRef?: React.RefObject<HTMLElement | null>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  commands?: FormattingCommand[];
  enabled?: boolean;
  onTextareaChange?: (newValue: string) => void;
}

export interface UseSlashMenuReturn {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  position: { top: number; left: number } | null;
  filteredCommands: FormattingCommand[];
  close: () => void;
  executeCommand: (cmd: FormattingCommand) => void;
  handleKeyDown: (view: EditorView, event: KeyboardEvent) => boolean;
  handleUpdate: (editor: Editor) => void;
  handleSelectionUpdate: (editor: Editor) => void;
  handleTextareaKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  handleTextareaUpdate: (textarea: HTMLTextAreaElement) => void;
}

function getTextareaCommandReplacement(cmdId: string, shortcut?: string): { text: string; caretOffset: number } {
  switch (cmdId) {
    case 'heading-1':
      return { text: '# ', caretOffset: 2 };
    case 'heading-2':
      return { text: '## ', caretOffset: 3 };
    case 'heading-3':
      return { text: '### ', caretOffset: 4 };
    case 'task-list':
      return { text: '- [ ] ', caretOffset: 6 };
    case 'bullet-list':
      return { text: '- ', caretOffset: 2 };
    case 'ordered-list':
      return { text: '1. ', caretOffset: 3 };
    case 'callout-note':
      return { text: '> [!NOTE]\n', caretOffset: 11 };
    case 'callout-warning':
      return { text: '> [!WARNING]\n', caretOffset: 14 };
    case 'callout-tip':
      return { text: '> [!TIP]\n', caretOffset: 10 };
    case 'table':
      return {
        text: '| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Item 1 | Item 2 |\n',
        caretOffset: 49,
      };
    case 'code-block':
      return { text: '```\n\n```', caretOffset: 4 };
    case 'blockquote':
      return { text: '> ', caretOffset: 2 };
    case 'horizontal-rule':
      return { text: '---\n', caretOffset: 4 };
    case 'math-block':
      return { text: '$$\nE = mc^2\n$$', caretOffset: 13 };
    case 'wikilink':
      return { text: '[[', caretOffset: 2 };
    case 'bold':
      return { text: '****', caretOffset: 2 };
    case 'italic':
      return { text: '**', caretOffset: 1 };
    case 'highlight':
      return { text: '====', caretOffset: 2 };
    case 'strike':
      return { text: '~~~~', caretOffset: 2 };
    case 'inline-code':
      return { text: '``', caretOffset: 1 };
    default:
      const sc = shortcut || '';
      return { text: sc, caretOffset: sc.length };
  }
}

export function useSlashMenu({
  containerRef,
  textareaRef,
  commands = FORMATTING_COMMANDS,
  enabled = true,
  onTextareaChange,
}: UseSlashMenuOptions = {}): UseSlashMenuReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const activeEditorRef = useRef<Editor | null>(null);
  const onTextareaChangeRef = useRef(onTextareaChange);

  useEffect(() => {
    onTextareaChangeRef.current = onTextareaChange;
  }, [onTextareaChange]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [query, commands]);

  const isOpenRef = useRef(isOpen);
  const selectedIndexRef = useRef(selectedIndex);
  const filteredCommandsRef = useRef(filteredCommands);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    filteredCommandsRef.current = filteredCommands;
  }, [filteredCommands]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length && filteredCommands.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredCommands.length, selectedIndex]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const executeCommand = useCallback(
    (cmd: FormattingCommand) => {
      const editor = activeEditorRef.current;
      if (editor) {
        const { state, dispatch } = editor.view;
        const { selection } = state;
        const { $from } = selection;
        const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
        const cleanText = textBefore.replace(/[\u200B\uFFFC]/g, '');
        const slashMatch = cleanText.match(/(?:^|[\s\u00A0])\/([a-zA-Z0-9_\u00C0-\u00FF-]*)$/);

        if (slashMatch) {
          const matchLen = slashMatch[1].length + 1; // inclui o caractere '/'
          const start = $from.pos - matchLen;
          const end = $from.pos;
          const tr = state.tr.delete(start, end);
          dispatch(tr);
        }

        setIsOpen(false);
        setTimeout(() => {
          cmd.execute(editor);
        }, 10);
        return;
      }

      const textarea = textareaRef?.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const value = textarea.value;
        const textBefore = value.slice(0, start);
        const cleanText = textBefore.replace(/[\u200B\uFFFC]/g, '');
        const slashMatch = cleanText.match(/(?:^|[\s\u00A0])\/([a-zA-Z0-9_\u00C0-\u00FF-]*)$/);

        if (slashMatch) {
          const matchLen = slashMatch[1].length + 1;
          const cutStart = start - matchLen;
          const cutEnd = start;

          const { text: replacement, caretOffset } = getTextareaCommandReplacement(cmd.id, cmd.shortcut);
          const newValue = value.slice(0, cutStart) + replacement + value.slice(cutEnd);
          const newCaretPos = cutStart + caretOffset;

          onTextareaChangeRef.current?.(newValue);
          setIsOpen(false);

          setTimeout(() => {
            if (textareaRef?.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(newCaretPos, newCaretPos);
            }
          }, 10);
        } else {
          setIsOpen(false);
        }
      }
    },
    [textareaRef]
  );

  const executeCommandRef = useRef(executeCommand);
  useEffect(() => {
    executeCommandRef.current = executeCommand;
  }, [executeCommand]);

  const handleKeyDown = useCallback(
    (_view: EditorView, event: KeyboardEvent): boolean => {
      if (!enabled) return false;
      if (isOpenRef.current && filteredCommandsRef.current.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommandsRef.current.length);
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + filteredCommandsRef.current.length) % filteredCommandsRef.current.length
          );
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const currentIdx = selectedIndexRef.current;
          const currentCmd = filteredCommandsRef.current[currentIdx];
          if (currentCmd) {
            executeCommandRef.current(currentCmd);
            return true;
          }
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setIsOpen(false);
          return true;
        }
      }
      return false;
    },
    [enabled]
  );

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!enabled || !isOpenRef.current || filteredCommandsRef.current.length === 0) return false;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filteredCommandsRef.current.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredCommandsRef.current.length) % filteredCommandsRef.current.length
        );
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        const currentIdx = selectedIndexRef.current;
        const currentCmd = filteredCommandsRef.current[currentIdx];
        if (currentCmd) {
          executeCommandRef.current(currentCmd);
          return true;
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        return true;
      }
      return false;
    },
    [enabled]
  );

  const handleUpdate = useCallback(
    (editor: Editor) => {
      if (!enabled) return;
      activeEditorRef.current = editor;

      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
      const cleanText = textBefore.replace(/[\u200B\uFFFC]/g, '');

      const slashMatch = cleanText.match(/(?:^|[\s\u00A0])\/([a-zA-Z0-9_\u00C0-\u00FF-]*)$/);
      if (slashMatch) {
        setQuery(slashMatch[1]);
        setIsOpen(true);
        setSelectedIndex(0);

        try {
          const coords = editor.view.coordsAtPos($from.pos);
          const container = containerRef?.current?.getBoundingClientRect();
          if (container && coords) {
            const top = coords.bottom - container.top + (containerRef?.current?.scrollTop || 0) + 6;
            const left = Math.max(16, Math.min(coords.left - container.left, (container.width || 500) - 300));
            setPosition({ top, left });
          } else if (coords) {
            setPosition({ top: coords.bottom + 6, left: Math.max(16, coords.left) });
          }
        } catch {
          setPosition(null);
        }
      } else {
        setIsOpen(false);
      }
    },
    [containerRef, enabled]
  );

  const handleTextareaUpdate = useCallback(
    (textarea: HTMLTextAreaElement) => {
      if (!enabled) return;
      activeEditorRef.current = null;

      const start = textarea.selectionStart;
      const textBefore = textarea.value.slice(0, start);
      const cleanText = textBefore.replace(/[\u200B\uFFFC]/g, '');
      const slashMatch = cleanText.match(/(?:^|[\s\u00A0])\/([a-zA-Z0-9_\u00C0-\u00FF-]*)$/);

      if (slashMatch) {
        setQuery(slashMatch[1]);
        setIsOpen(true);
        setSelectedIndex(0);

        const lines = cleanText.split('\n');
        const currentLineIndex = lines.length - 1;
        const lineContent = lines[currentLineIndex];
        const colIndex = lineContent.length;
        const lineHeight = 20;
        const containerWidth = containerRef?.current?.clientWidth || 300;

        const top = Math.max(28, (currentLineIndex + 1) * lineHeight + 8 - textarea.scrollTop);
        const left = Math.max(12, Math.min(colIndex * 7 + 16, containerWidth - 280));
        setPosition({ top, left });
      } else {
        setIsOpen(false);
      }
    },
    [containerRef, enabled]
  );

  const handleSelectionUpdate = useCallback(
    (editor: Editor) => {
      if (!enabled || !isOpenRef.current) return;
      activeEditorRef.current = editor;

      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');
      const cleanText = textBefore.replace(/[\u200B\uFFFC]/g, '');
      const slashMatch = cleanText.match(/(?:^|[\s\u00A0])\/([a-zA-Z0-9_\u00C0-\u00FF-]*)$/);

      if (!slashMatch) {
        setIsOpen(false);
      }
    },
    [enabled]
  );

  return {
    isOpen,
    query,
    selectedIndex,
    position,
    filteredCommands,
    close,
    executeCommand,
    handleKeyDown,
    handleUpdate,
    handleSelectionUpdate,
    handleTextareaKeyDown,
    handleTextareaUpdate,
  };
}
