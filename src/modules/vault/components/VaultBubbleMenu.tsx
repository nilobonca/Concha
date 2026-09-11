import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  Unlink,
  Check,
  X
} from 'lucide-react';

interface VaultBubbleMenuProps {
  editor: Editor | null;
}

export const VaultBubbleMenu: React.FC<VaultBubbleMenuProps> = ({ editor }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setIsVisible(false);
      return;
    }

    const { state, view } = editor;
    const { selection } = state;

    // Only show when there is a non-empty text selection and editor is focused
    if (selection.empty || !editor.isFocused) {
      if (!isLinkOpen) {
        setIsVisible(false);
      }
      return;
    }

    try {
      const fromCoords = view.coordsAtPos(selection.from);
      const toCoords = view.coordsAtPos(selection.to);

      const centerLeft = (fromCoords.left + toCoords.right) / 2;
      // Position 44px above the top of the selection
      let topPos = Math.min(fromCoords.top, toCoords.top) - 46;

      // If too close to top of viewport, flip to bottom of selection
      if (topPos < 60) {
        topPos = Math.max(fromCoords.bottom, toCoords.bottom) + 8;
      }

      // Keep within horizontal window bounds
      const clampedLeft = Math.max(160, Math.min(window.innerWidth - 160, centerLeft));

      setCoords({
        top: topPos,
        left: clampedLeft
      });
      setIsVisible(true);
    } catch {
      setIsVisible(false);
    }
  }, [editor, isLinkOpen]);

  useEffect(() => {
    if (!editor) return;

    editor.on('selectionUpdate', updatePosition);
    editor.on('transaction', updatePosition);
    editor.on('focus', updatePosition);

    const handleScrollOrResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('transaction', updatePosition);
      editor.off('focus', updatePosition);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [editor, updatePosition, isVisible]);

  // Focus link input when link popup opens
  useEffect(() => {
    if (isLinkOpen) {
      setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 50);
    }
  }, [isLinkOpen]);

  if (!editor || !isVisible) {
    return null;
  }

  const handleOpenLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setIsLinkOpen(true);
  };

  const handleApplyLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const formatted = /^(https?:\/\/|canvas:|\/)/.test(trimmed) ? trimmed : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: formatted }).run();
    }
    setIsLinkOpen(false);
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
    setIsLinkOpen(false);
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
      className="fixed z-50 -translate-x-1/2 flex items-center gap-0.5 p-1 bg-white/95 dark:bg-[#1D2035]/95 backdrop-blur-md rounded-xl border border-black/10 dark:border-white/15 shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none pointer-events-auto"
    >
      {isLinkOpen ? (
        <div className="flex items-center gap-1 px-1 py-0.5" onMouseDown={e => e.stopPropagation()}>
          <input
            ref={linkInputRef}
            type="text"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyLink();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsLinkOpen(false);
              }
            }}
            placeholder="Cole o link ou https://..."
            className="w-48 px-2 py-1 text-xs bg-stone-100 dark:bg-black/40 rounded-lg border border-black/10 dark:border-white/15 text-stone-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-[#1831D7] dark:focus:ring-[#7F95FF]"
          />
          <button
            onClick={handleApplyLink}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-pointer"
            title="Salvar link"
          >
            <Check size={14} />
          </button>
          {editor.isActive('link') && (
            <button
              onClick={handleRemoveLink}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
              title="Remover link"
            >
              <Unlink size={14} />
            </button>
          )}
          <button
            onClick={() => setIsLinkOpen(false)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-500 cursor-pointer"
            title="Cancelar"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          {/* Bold */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('bold')
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Negrito (Ctrl+B)"
          >
            <Bold size={15} strokeWidth={2.5} />
          </button>

          {/* Italic */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('italic')
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Itálico (Ctrl+I)"
          >
            <Italic size={15} strokeWidth={2.5} />
          </button>

          {/* Strikethrough */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('strike')
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Tachado (Ctrl+Shift+S)"
          >
            <Strikethrough size={15} strokeWidth={2.5} />
          </button>

          {/* Highlight / Marca-texto */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('highlight')
                ? 'bg-amber-400 text-stone-900 font-bold shadow-xs'
                : 'text-amber-500 dark:text-amber-400 hover:bg-amber-400/15'
            }`}
            title="Marca-texto (Ctrl+H)"
          >
            <Highlighter size={15} strokeWidth={2.5} />
          </button>

          {/* Inline Code */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('code')
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Código Inline (Ctrl+E)"
          >
            <Code size={15} strokeWidth={2.5} />
          </button>

          <div className="w-[1px] h-4 bg-black/10 dark:bg-white/15 mx-0.5" />

          {/* Headings */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Título 1"
          >
            <Heading1 size={15} strokeWidth={2.5} />
          </button>

          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Título 2"
          >
            <Heading2 size={15} strokeWidth={2.5} />
          </button>

          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Título 3"
          >
            <Heading3 size={15} strokeWidth={2.5} />
          </button>

          <div className="w-[1px] h-4 bg-black/10 dark:bg-white/15 mx-0.5" />

          {/* Link */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={handleOpenLink}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              editor.isActive('link')
                ? 'bg-[#1831D7] text-white dark:bg-[#7F95FF] dark:text-[#17192A]'
                : 'text-stone-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={editor.isActive('link') ? 'Editar Link' : 'Inserir Link'}
          >
            <Link2 size={15} strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
};
