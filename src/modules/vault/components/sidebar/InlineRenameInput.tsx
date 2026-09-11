import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { 
  WINDOWS_FORBIDDEN_CHARACTERS, 
  WINDOWS_FORBIDDEN_CHARS_DISPLAY, 
  stripInvalidWindowsChars 
} from '../../utils/fileNameUtils';

export interface InlineRenameInputProps {
  initialName: string;
  isFolder?: boolean;
  onSubmit: (newName: string) => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
}

export const InlineRenameInput: React.FC<InlineRenameInputProps> = ({
  initialName,
  isFolder = false,
  onSubmit,
  onCancel,
  className,
  placeholder,
}) => {
  const [val, setVal] = useState(initialName);
  const [warning, setWarning] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePopupPosition = () => {
    if (inputRef.current && typeof window !== 'undefined') {
      const rect = inputRef.current.getBoundingClientRect();
      const popupHeight = 72;
      const willOverflowBottom = rect.bottom + 4 + popupHeight > window.innerHeight;
      setPopupCoords({
        top: willOverflowBottom ? Math.max(8, rect.top - popupHeight - 4) : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
      });
    }
  };

  const showForbiddenWarning = () => {
    updatePopupPosition();
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    setWarning(WINDOWS_FORBIDDEN_CHARS_DISPLAY);
    warningTimeoutRef.current = setTimeout(() => {
      setWarning(null);
      warningTimeoutRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    mountedAtRef.current = Date.now();
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);

    const handleScrollOrResize = () => {
      if (warning) {
        updatePopupPosition();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimeout(timer);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [warning]);

  const handleSub = (newVal?: string) => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setWarning(null);
    const finalVal = (newVal !== undefined ? newVal : val).trim();
    onSubmit(finalVal || initialName);
  };

  const handleCanc = () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setWarning(null);
    onCancel();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Evita submissão prematura por cliques que criaram o elemento
    if (Date.now() - mountedAtRef.current < 250) {
      return;
    }
    handleSub(e.currentTarget.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    // Bloqueia teclas com caracteres proibidos no Windows
    if ((WINDOWS_FORBIDDEN_CHARACTERS as readonly string[]).includes(e.key)) {
      e.preventDefault();
      showForbiddenWarning();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSub(e.currentTarget.value);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCanc();
    }
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement> & { data?: string }) => {
    if (e.data && /[<>:"/\\|?*\x00-\x1f\x7f]/.test(e.data)) {
      e.preventDefault();
      showForbiddenWarning();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { clean, hadInvalid } = stripInvalidWindowsChars(raw);
    if (hadInvalid) {
      showForbiddenWarning();
    }
    setVal(clean);
  };

  return (
    <div className="flex-1 min-w-0 flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={val}
        placeholder={placeholder || (isFolder ? 'Nome da pasta' : 'Nome do arquivo')}
        onChange={handleChange}
        onBeforeInput={handleBeforeInput}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={
          className ||
          `w-full bg-white dark:bg-[#16161D] border ${
            warning
              ? 'border-amber-500 ring-2 ring-amber-500/40'
              : 'border-[#7F95FF]/80 focus:border-[#7F95FF]'
          } rounded px-1.5 py-0.5 text-xs text-stone-900 dark:text-neutral-100 outline-none shadow-xs selection:bg-[#7F95FF]/30 dark:selection:bg-[#1831D7]/50 transition-all`
        }
      />

      {/* Aviso flutuando por cima de outros arquivos sem aumentar o espaço do item */}
      {warning && popupCoords && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div 
          style={{
            position: 'fixed',
            top: `${popupCoords.top}px`,
            left: `${popupCoords.left}px`,
            zIndex: 99999,
          }}
          className="flex items-start gap-2 p-2.5 bg-[#181822] dark:bg-[#12121A] text-neutral-100 border border-amber-500/60 rounded-lg text-xs shadow-2xl w-max max-w-[290px] leading-tight select-none pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300 text-xs">
              Caractere não permitido
            </div>
            <div className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
              Nomes de arquivos não podem conter:
            </div>
            <div className="font-mono font-bold text-amber-300 mt-1 tracking-widest bg-black/60 border border-amber-500/20 px-2 py-0.5 rounded text-center text-xs">
              \ / : * ? &quot; &lt; &gt; |
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
