import React from 'react';

/**
 * Aplica atalhos de teclado para formatação Markdown manual em elementos textarea.
 * Suporta:
 * - Ctrl+B: Negrito (**texto**)
 * - Ctrl+I: Itálico (*texto*)
 * - Ctrl+Shift+S ou Ctrl+Shift+X: Tachado (~~texto~~)
 * - Ctrl+H ou Ctrl+Shift+H: Marca-texto (==texto==)
 * - Ctrl+E ou Ctrl+`: Código inline (`texto`)
 */
export function handleTextareaFormattingShortcut(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  setValue: (newVal: string) => void
): boolean {
  const isCtrl = e.ctrlKey || e.metaKey;
  if (!isCtrl) return false;

  const key = e.key.toLowerCase();
  let prefix = '';
  let suffix = '';

  if (key === 'b' && !e.shiftKey) {
    prefix = '**';
    suffix = '**';
  } else if (key === 'i' && !e.shiftKey) {
    prefix = '*';
    suffix = '*';
  } else if ((key === 's' && e.shiftKey) || (key === 'x' && e.shiftKey)) {
    prefix = '~~';
    suffix = '~~';
  } else if (key === 'h') {
    prefix = '==';
    suffix = '==';
  } else if (key === 'e' || key === '`') {
    prefix = '`';
    suffix = '`';
  }

  if (prefix && suffix) {
    e.preventDefault();
    e.stopPropagation();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const selectedText = value.slice(start, end);

    // Se já estiver envolvido pelo prefixo e sufixo, remove a formatação (unwrap)
    if (
      selectedText.startsWith(prefix) &&
      selectedText.endsWith(suffix) &&
      selectedText.length >= prefix.length + suffix.length
    ) {
      const unwrapped = selectedText.slice(prefix.length, selectedText.length - suffix.length);
      const nextValue = value.slice(0, start) + unwrapped + value.slice(end);
      setValue(nextValue);
      setTimeout(() => {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + unwrapped.length;
      }, 0);
    } else {
      // Aplica formatação ao redor da seleção ou insere delimitadores vazios
      const nextValue = value.slice(0, start) + prefix + selectedText + suffix + value.slice(end);
      setValue(nextValue);
      setTimeout(() => {
        if (start === end) {
          // Cursor no meio dos delimitadores
          textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
        } else {
          // Seleção preservada com os delimitadores inclusos
          textarea.selectionStart = start;
          textarea.selectionEnd = end + prefix.length + suffix.length;
        }
      }, 0);
    }
    return true;
  }
  return false;
}

/**
 * Aplica auto-fechamento (auto-pairing) ao digitar pontuações de formatação quando há texto selecionado.
 * Se o usuário selecionou uma palavra e digita '*', '~', '=', '`', envolverá a seleção ao invés de apagá-la.
 */
export function handleTextareaAutoPairing(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  setValue: (newVal: string) => void
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const textarea = e.currentTarget;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return false;

  const pairs: Record<string, [string, string]> = {
    '*': ['*', '*'],
    '_': ['_', '_'],
    '~': ['~~', '~~'],
    '=': ['==', '=='],
    '`': ['`', '`'],
    '(': ['(', ')'],
    '[': ['[', ']'],
    '{': ['{', '}'],
    '"': ['"', '"'],
  };

  const pair = pairs[e.key];
  if (pair) {
    e.preventDefault();
    e.stopPropagation();
    const value = textarea.value;
    const selectedText = value.slice(start, end);
    const nextValue = value.slice(0, start) + pair[0] + selectedText + pair[1] + value.slice(end);
    setValue(nextValue);
    setTimeout(() => {
      textarea.selectionStart = start + pair[0].length;
      textarea.selectionEnd = end + pair[0].length;
    }, 0);
    return true;
  }
  return false;
}
