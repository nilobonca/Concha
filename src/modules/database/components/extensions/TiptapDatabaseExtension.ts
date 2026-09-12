import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { TiptapDatabaseNodeView } from './TiptapDatabaseNodeView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    databaseBlock: {
      insertDatabaseBlock: (attributes?: {
        databaseId?: string;
        databasePath?: string;
        initialData?: any;
      }) => ReturnType;
    };
  }
}

export const TiptapDatabaseExtension = Node.create({
  name: 'databaseBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      databaseId: {
        default: '',
        parseHTML: element => element.getAttribute('data-database-id') || '',
        renderHTML: attributes => ({
          'data-database-id': attributes.databaseId,
        }),
      },
      databasePath: {
        default: '',
        parseHTML: element => element.getAttribute('data-database-path') || '',
        renderHTML: attributes => ({
          'data-database-path': attributes.databasePath,
        }),
      },
      databaseData: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('data-database-raw');
          if (!raw) return null;
          try {
            return JSON.parse(decodeURIComponent(raw));
          } catch {
            return null;
          }
        },
        renderHTML: attributes => {
          if (!attributes.databaseData) return {};
          try {
            return {
              'data-database-raw': encodeURIComponent(JSON.stringify(attributes.databaseData)),
            };
          } catch {
            return {};
          }
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="database-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'database-block',
        class: 'my-6 rounded-xl overflow-hidden border border-stone-200/80 dark:border-white/10 shadow-xs bg-white dark:bg-[#17192A]',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TiptapDatabaseNodeView);
  },

  addCommands() {
    return {
      insertDatabaseBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
