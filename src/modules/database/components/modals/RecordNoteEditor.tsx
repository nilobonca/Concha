import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { CustomTableView } from '@/modules/vault/extensions/CustomTableView';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Callout } from '@/modules/vault/extensions/CalloutExtension';
import { MarkdownSyntaxReveal } from '@/modules/vault/extensions/MarkdownSyntaxRevealExtension';
import { FormattingShortcutsExtension } from '@/modules/vault/extensions/FormattingShortcutsExtension';
import { markdownToHtml, htmlToMarkdown } from '@/modules/vault/utils/markdownConverter';

const lowlight = createLowlight(common);

export interface RecordNoteEditorProps {
  content: string;
  onChange: (newContentMarkdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export const RecordNoteEditor: React.FC<RecordNoteEditorProps> = ({
  content,
  onChange,
  placeholder = 'Escreva suas anotações em Markdown...',
  readOnly = false,
}) => {
  const isInternalUpdateRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
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
      CodeBlockLowlight.configure({
        lowlight,
      }),
      MarkdownSyntaxReveal,
      FormattingShortcutsExtension,
    ],
    content: markdownToHtml(content || ''),
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none focus:outline-none min-h-[320px] text-stone-900 dark:text-neutral-100 leading-relaxed text-base font-normal',
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdateRef.current = true;
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChangeRef.current(markdown);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 50);
    },
  });

  // Synchronize when external content changes (e.g. user selected another record)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdateRef.current) return;

    const currentMarkdown = htmlToMarkdown(editor.getHTML());
    if (currentMarkdown.trim() !== (content || '').trim()) {
      editor.commands.setContent(markdownToHtml(content || ''));
    }
  }, [content, editor]);

  return (
    <div className="w-full h-full cursor-text" onClick={() => editor?.commands.focus()}>
      <EditorContent editor={editor} />
    </div>
  );
};
