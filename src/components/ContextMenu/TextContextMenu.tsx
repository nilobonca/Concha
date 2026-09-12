'use client';

import React, { useState } from 'react';
import ContextMenu from './index';
import { BookPlus, Copy, Scissors, Clipboard, CheckSquare, Check, Sparkles } from 'lucide-react';
import { useSpellCheckStore } from '@/store/spellCheckStore';
import { replaceMisspelling } from '@/utils/electronHelper';

export interface TextContextMenuState {
  x: number;
  y: number;
  word?: string | null;
  suggestions?: string[];
  target?: HTMLElement | null;
  hasSelection?: boolean;
  isEditable?: boolean;
}

interface TextContextMenuProps {
  state: TextContextMenuState | null;
  onClose: () => void;
}

export const TextContextMenu: React.FC<TextContextMenuProps> = ({ state, onClose }) => {
  const [wordAdded, setWordAdded] = useState<string | null>(null);
  const addWordToDictionary = useSpellCheckStore(s => s.addWordToDictionary);

  if (!state) return null;

  const { x, y, word, suggestions = [], target, hasSelection, isEditable } = state;

  const handleApplySuggestion = async (suggestion: string) => {
    try {
      const handled = await replaceMisspelling(suggestion);
      if (!handled && target) {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          const val = target.value;
          const start = target.selectionStart ?? 0;
          const end = target.selectionEnd ?? 0;
          if (word && start === end) {
            const leftMatch = val.slice(0, start).match(/[a-zA-Z0-9_\u00C0-\u00FF-]+$/);
            const rightMatch = val.slice(start).match(/^[a-zA-Z0-9_\u00C0-\u00FF-]+/);
            const startIdx = leftMatch ? start - leftMatch[0].length : start;
            const endIdx = rightMatch ? start + rightMatch[0].length : end;
            target.setRangeText(suggestion, startIdx, endIdx, 'end');
          } else {
            target.setRangeText(suggestion, start, end, 'end');
          }
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
          document.execCommand('insertText', false, suggestion);
        }
      }
    } catch (err) {
      console.warn('[TextContextMenu] Erro ao aplicar sugestão ortográfica:', err);
    }
    onClose();
  };

  const handleAddToDict = async (wordToAdd: string) => {
    await addWordToDictionary(wordToAdd);
    setWordAdded(wordToAdd);
    setTimeout(() => {
      setWordAdded(null);
      onClose();
    }, 800);
  };

  const handleCopy = () => {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        navigator.clipboard.writeText(selection).catch(() => {
          document.execCommand('copy');
        });
      }
    } catch {
      document.execCommand('copy');
    }
  };

  const handleCut = () => {
    if (!isEditable) return;
    try {
      document.execCommand('cut');
    } catch {
      // fallback
    }
  };

  const handlePaste = async () => {
    if (!isEditable || !target) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const start = target.selectionStart ?? 0;
        const end = target.selectionEnd ?? 0;
        target.setRangeText(text, start, end, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
        document.execCommand('insertText', false, text);
      }
    } catch (err) {
      console.warn('[TextContextMenu] Falha ao colar do clipboard:', err);
    }
  };

  const handleSelectAll = () => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.select();
    } else {
      const editableEl = target?.closest('[contenteditable="true"]') as HTMLElement || target;
      if (editableEl) {
        const range = document.createRange();
        range.selectNodeContents(editableEl);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  const options: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    custom?: React.ReactNode;
  }> = [];

  // 1. Sugestões de correção ortográfica no topo
  if (suggestions && suggestions.length > 0) {
    suggestions.slice(0, 5).forEach((suggestion) => {
      options.push({
        label: suggestion,
        icon: <Sparkles size={16} className="text-[#1831D7] dark:text-[#7F95FF]" />,
        onClick: () => handleApplySuggestion(suggestion),
      });
    });

    // Separador após sugestões
    options.push({
      label: 'sep-suggestions',
      onClick: () => {},
      custom: <div className="h-px my-1 bg-black/10 dark:bg-white/10" />,
    });
  }

  // 2. Opção "Adicionar ao dicionário" no menu do próprio app
  if (word) {
    const isSuccess = wordAdded === word;
    options.push({
      label: isSuccess ? `"${word}" Adicionada!` : `Adicionar "${word}" ao dicionário`,
      icon: isSuccess ? <Check size={16} className="text-emerald-500" /> : <BookPlus size={16} className="text-[#1831D7] dark:text-[#7F95FF]" />,
      onClick: () => handleAddToDict(word),
    });
  }

  // Separador antes das opções de edição
  const hasSpellOptions = (suggestions && suggestions.length > 0) || Boolean(word);
  const hasEditOptions = Boolean(hasSelection || isEditable);

  if (hasSpellOptions && hasEditOptions) {
    options.push({
      label: 'sep-edit',
      onClick: () => {},
      custom: <div className="h-px my-1 bg-black/10 dark:bg-white/10" />,
    });
  }

  // 3. Opções de edição (Clipboard)
  if (hasSelection) {
    options.push({
      label: 'Copiar',
      icon: <Copy size={16} />,
      onClick: handleCopy,
    });

    if (isEditable) {
      options.push({
        label: 'Recortar',
        icon: <Scissors size={16} />,
        onClick: handleCut,
      });
    }
  }

  if (isEditable) {
    options.push({
      label: 'Colar',
      icon: <Clipboard size={16} />,
      onClick: handlePaste,
    });

    options.push({
      label: 'Selecionar Tudo',
      icon: <CheckSquare size={16} />,
      onClick: handleSelectAll,
    });
  }

  // Se não houver nenhuma ação viável, não renderiza
  if (options.length === 0) {
    return null;
  }

  return (
    <ContextMenu
      x={x}
      y={y}
      onClose={onClose}
      options={options}
    />
  );
};
