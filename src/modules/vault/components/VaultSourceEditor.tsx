import React, { useRef, useEffect } from 'react';
import { handleTextareaFormattingShortcut, handleTextareaAutoPairing } from '@/utils/textareaFormatting';
import { useSpellCheckStore } from '@/store/spellCheckStore';
import { SlashMenu, useSlashMenu } from '@/modules/common/components/SlashMenu';

interface VaultSourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export const VaultSourceEditor: React.FC<VaultSourceEditorProps> = ({ value, onChange, onBlur }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const spellCheckEnabled = useSpellCheckStore((s) => s.enabled);
  const spellCheckLanguages = useSpellCheckStore((s) => s.languages);
  const langAttr = (spellCheckLanguages && spellCheckLanguages.length > 0 ? spellCheckLanguages : ['pt-BR']).join(' ');

  const slashMenu = useSlashMenu({
    containerRef,
    textareaRef,
    onTextareaChange: onChange,
  });

  // Auto-resize textarea height to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMenu.handleTextareaKeyDown(e)) {
      return;
    }

    // 1. Atalhos de formatação (Ctrl+B, Ctrl+I, Ctrl+Shift+S, Ctrl+H, Ctrl+E)
    if (handleTextareaFormattingShortcut(e, onChange)) {
      return;
    }

    // 2. Auto-pairing ao digitar pontuação sobre seleção (*, _, ~, =, `, etc.)
    if (handleTextareaAutoPairing(e, onChange)) {
      return;
    }

    // Handle Tab key to insert 2 spaces instead of changing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div ref={containerRef} className="w-full min-h-[500px] flex flex-col font-mono text-sm leading-relaxed relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
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
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder="# Escreva seu Markdown puro aqui..."
        spellCheck={spellCheckEnabled}
        lang={langAttr}
        className="w-full flex-1 bg-transparent text-stone-800 dark:text-neutral-200 outline-none resize-none overflow-hidden font-mono text-sm leading-relaxed tracking-wide placeholder:text-stone-400 dark:placeholder:text-neutral-600"
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
  );
};
