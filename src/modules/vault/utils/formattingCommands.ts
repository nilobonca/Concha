import type { Editor } from '@tiptap/react';
import React from 'react';
import {
  Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Minus, FileCode, Table as TableIcon,
  AlertCircle, AlertTriangle, Lightbulb,
  Bold, Italic, Strikethrough, Highlighter, Code,
  Binary, Link2, Database as DatabaseIcon
} from 'lucide-react';

export interface FormattingCommand {
  id: string;
  title: string;
  description: string;
  category: 'headings' | 'lists' | 'blocks' | 'inline';
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  shortcut?: string;
  isActive?: (editor: Editor) => boolean;
  execute: (editor: Editor) => void;
}

export const FORMATTING_COMMANDS: FormattingCommand[] = [
  // --- TÍTULOS ---
  {
    id: 'heading-1',
    title: 'Título 1',
    description: 'Seção principal com destaque',
    category: 'headings',
    icon: Heading1,
    keywords: ['h1', 'titulo 1', 'heading 1', 'grande', 'principal'],
    shortcut: '#',
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading-2',
    title: 'Título 2',
    description: 'Subtítulo de tamanho médio',
    category: 'headings',
    icon: Heading2,
    keywords: ['h2', 'titulo 2', 'heading 2', 'medio', 'subtitulo'],
    shortcut: '##',
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading-3',
    title: 'Título 3',
    description: 'Subseção pequena',
    category: 'headings',
    icon: Heading3,
    keywords: ['h3', 'titulo 3', 'heading 3', 'pequeno', 'secao'],
    shortcut: '###',
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  // --- LISTAS ---
  {
    id: 'task-list',
    title: 'Lista de Tarefas',
    description: 'Checklist interativa com caixas de seleção',
    category: 'lists',
    icon: CheckSquare,
    keywords: ['todo', 'tarefa', 'check', 'checklist', 'task'],
    shortcut: '[ ]',
    isActive: (editor) => editor.isActive('taskList'),
    execute: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'bullet-list',
    title: 'Lista com Marcadores',
    description: 'Lista simples com pontos',
    category: 'lists',
    icon: List,
    keywords: ['lista', 'marcador', 'bullet', 'pontos'],
    shortcut: '-',
    isActive: (editor) => editor.isActive('bulletList'),
    execute: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered-list',
    title: 'Lista Numerada',
    description: 'Lista ordenada sequencial',
    category: 'lists',
    icon: ListOrdered,
    keywords: ['numerada', 'numero', 'order', 'sequencia'],
    shortcut: '1.',
    isActive: (editor) => editor.isActive('orderedList'),
    execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },

  // --- BLOCOS & MÍDIA ---
  {
    id: 'callout-note',
    title: 'Callout de Aviso',
    description: 'Caixa de destaque para anotações e avisos',
    category: 'blocks',
    icon: AlertCircle,
    keywords: ['callout', 'aviso', 'nota', 'note', 'box'],
    shortcut: '> [!NOTE]',
    isActive: (editor) => editor.isActive('callout'),
    execute: (editor) => editor.chain().focus().toggleCallout({ type: 'note' }).run(),
  },
  {
    id: 'callout-warning',
    title: 'Callout de Atenção',
    description: 'Caixa de alerta amarela para avisos importantes',
    category: 'blocks',
    icon: AlertTriangle,
    keywords: ['warning', 'atencao', 'cuidado', 'alerta', 'perigo'],
    shortcut: '> [!WARNING]',
    execute: (editor) => editor.chain().focus().toggleCallout({ type: 'warning' }).run(),
  },
  {
    id: 'callout-tip',
    title: 'Callout de Dica',
    description: 'Caixa de sugestão e dicas úteis',
    category: 'blocks',
    icon: Lightbulb,
    keywords: ['tip', 'dica', 'truque', 'hint', 'sugestao'],
    shortcut: '> [!TIP]',
    execute: (editor) => editor.chain().focus().toggleCallout({ type: 'tip' }).run(),
  },
  {
    id: 'table',
    title: 'Tabela',
    description: 'Inserir tabela interativa com linhas e colunas',
    category: 'blocks',
    icon: TableIcon,
    keywords: ['tabela', 'table', 'grid', 'grade', 'coluna'],
    isActive: (editor) => editor.isActive('table'),
    execute: (editor) => {
      if (editor.isActive('table')) {
        editor.chain().focus().deleteTable().run();
      } else {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      }
    },
  },
  {
    id: 'database-block',
    title: 'Base de Dados',
    description: 'Tabela, kanban e galeria com propriedades tipadas e visualizações',
    category: 'blocks',
    icon: DatabaseIcon,
    keywords: ['database', 'banco', 'kanban', 'dados', 'db', 'tabela relacional', 'colecao'],
    shortcut: '/db',
    execute: (editor) => {
      editor.chain().focus().insertContent({
        type: 'databaseBlock',
        attrs: { databaseId: `db_${Date.now()}` },
      }).run();
    },
  },
  {
    id: 'code-block',
    title: 'Bloco de Código',
    description: 'Bloco com destaque de sintaxe multilíngue',
    category: 'blocks',
    icon: FileCode,
    keywords: ['codigo', 'code', 'bloco', 'pre', 'snippet', 'dev'],
    shortcut: '```',
    isActive: (editor) => editor.isActive('codeBlock'),
    execute: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'blockquote',
    title: 'Citação',
    description: 'Bloco formatado para citações e referências',
    category: 'blocks',
    icon: Quote,
    keywords: ['citacao', 'quote', 'bloco', 'referencia'],
    shortcut: '>',
    isActive: (editor) => editor.isActive('blockquote'),
    execute: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'horizontal-rule',
    title: 'Linha Divisória',
    description: 'Separador horizontal visual entre tópicos',
    category: 'blocks',
    icon: Minus,
    keywords: ['linha', 'divisor', 'hr', 'separador', 'divisoria'],
    shortcut: '---',
    execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'math-block',
    title: 'Fórmula Matemática (LaTeX)',
    description: 'Inserir bloco de matemática renderizado com KaTeX',
    category: 'blocks',
    icon: Binary,
    keywords: ['math', 'matematica', 'latex', 'formula', 'katex'],
    shortcut: '$$',
    execute: (editor) => editor.chain().focus().insertContent('$$\nE = mc^2\n$$').run(),
  },
  {
    id: 'wikilink',
    title: 'Link para Nota ou Canvas (Wikilink)',
    description: 'Criar conexão bidirecional com uma nota ou canvas do Vault',
    category: 'blocks',
    icon: Link2,
    keywords: ['link', 'nota', 'canvas', 'quadro', 'audio', 'board', 'wikilink', 'conexao', '[['],
    shortcut: '[[ ou Ctrl+K',
    execute: (editor) => editor.chain().focus().insertContent('[[').run(),
  },

  // --- FORMATAÇÃO INLINE ---
  {
    id: 'bold',
    title: 'Negrito',
    description: 'Tornar texto mais espesso',
    category: 'inline',
    icon: Bold,
    keywords: ['negrito', 'bold', 'forte'],
    shortcut: 'Ctrl+B',
    isActive: (editor) => editor.isActive('bold'),
    execute: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    title: 'Itálico',
    description: 'Inclinar o texto selecionado',
    category: 'inline',
    icon: Italic,
    keywords: ['italico', 'italic', 'enfase'],
    shortcut: 'Ctrl+I',
    isActive: (editor) => editor.isActive('italic'),
    execute: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'highlight',
    title: 'Marca-texto',
    description: 'Realçar texto com fundo amarelo brilhante',
    category: 'inline',
    icon: Highlighter,
    keywords: ['highlight', 'marca-texto', 'marcar', 'destaque', 'amarelo'],
    shortcut: '==',
    isActive: (editor) => editor.isActive('highlight'),
    execute: (editor) => editor.chain().focus().toggleHighlight().run(),
  },
  {
    id: 'strike',
    title: 'Tachado',
    description: 'Traçar uma linha no meio do texto',
    category: 'inline',
    icon: Strikethrough,
    keywords: ['tachado', 'riscado', 'strike'],
    shortcut: '~~',
    isActive: (editor) => editor.isActive('strike'),
    execute: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: 'inline-code',
    title: 'Código Inline',
    description: 'Texto monoespaçado em linha',
    category: 'inline',
    icon: Code,
    keywords: ['codigo inline', 'code inline', 'mono'],
    shortcut: '`',
    isActive: (editor) => editor.isActive('code'),
    execute: (editor) => editor.chain().focus().toggleCode().run(),
  },
];

export const CATEGORY_LABELS: Record<FormattingCommand['category'], string> = {
  headings: 'Títulos & Estrutura',
  lists: 'Listas & Tarefas',
  blocks: 'Blocos & Mídia',
  inline: 'Estilo de Texto',
};
