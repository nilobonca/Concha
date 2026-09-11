import { Extension, markInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const formattingShortcutsPluginKey = new PluginKey('formattingShortcuts');

export const FormattingShortcutsExtension = Extension.create({
  name: 'formattingShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.commands.toggleBold(),
      'Mod-i': () => this.editor.commands.toggleItalic(),
      'Mod-Shift-s': () => this.editor.commands.toggleStrike(),
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
      'Alt-Shift-5': () => this.editor.commands.toggleStrike(),
      'Mod-h': () => this.editor.commands.toggleHighlight(),
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight(),
      'Mod-e': () => this.editor.commands.toggleCode(),
    };
  },

  addInputRules() {
    const rules = [];

    // 1. Highlight: ==texto==
    if (this.editor.schema.marks.highlight) {
      rules.push(
        markInputRule({
          find: /(?:^|[\s(\["'])((?:==)((?:[^=]+))(?:==))$/,
          type: this.editor.schema.marks.highlight,
        })
      );
    }

    // 2. Bold: **texto** e __texto__
    if (this.editor.schema.marks.bold) {
      rules.push(
        markInputRule({
          find: /(?:^|[\s(\["'])((?:\*\*)((?:[^*]+))(?:\*\*))$/,
          type: this.editor.schema.marks.bold,
        }),
        markInputRule({
          find: /(?:^|[\s(\["'])((?:__)((?:[^_]+))(?:__))$/,
          type: this.editor.schema.marks.bold,
        })
      );
    }

    // 3. Italic: *texto* e _texto_
    if (this.editor.schema.marks.italic) {
      rules.push(
        markInputRule({
          find: /(?:^|[\s(\["'])((?:\*)((?:[^*]+))(?:\*))$/,
          type: this.editor.schema.marks.italic,
        }),
        markInputRule({
          find: /(?:^|[\s(\["'])((?:_)((?:[^_]+))(?:_))$/,
          type: this.editor.schema.marks.italic,
        })
      );
    }

    // 4. Strikethrough: ~~texto~~
    if (this.editor.schema.marks.strike) {
      rules.push(
        markInputRule({
          find: /(?:^|[\s(\["'])((?:~~)((?:[^~]+))(?:~~))$/,
          type: this.editor.schema.marks.strike,
        })
      );
    }

    return rules;
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: formattingShortcutsPluginKey,
        props: {
          handleKeyDown(view, event) {
            const { empty } = view.state.selection;

            // Auto-pairing e formatação instantânea ao digitar pontuação sobre seleção não-vazia
            if (!empty && !event.ctrlKey && !event.metaKey && !event.altKey) {
              if (event.key === '*') {
                event.preventDefault();
                if (event.shiftKey) {
                  return editor.commands.toggleBold();
                }
                return editor.commands.toggleItalic();
              }
              if (event.key === '_') {
                event.preventDefault();
                return editor.commands.toggleItalic();
              }
              if (event.key === '~') {
                event.preventDefault();
                return editor.commands.toggleStrike();
              }
              if (event.key === '=') {
                event.preventDefault();
                return editor.commands.toggleHighlight();
              }
              if (event.key === '`') {
                event.preventDefault();
                return editor.commands.toggleCode();
              }
            }

            // Intercepta atalhos do navegador para garantir funcionamento uniforme
            if (event.ctrlKey || event.metaKey) {
              const key = event.key.toLowerCase();
              if (key === 'h') {
                event.preventDefault();
                return editor.commands.toggleHighlight();
              }
              if ((key === 's' || key === 'x') && event.shiftKey) {
                event.preventDefault();
                return editor.commands.toggleStrike();
              }
              if (key === 'e') {
                event.preventDefault();
                return editor.commands.toggleCode();
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
