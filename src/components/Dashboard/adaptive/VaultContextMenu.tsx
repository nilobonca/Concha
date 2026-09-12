import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  ArrowRight, 
  Edit2, 
  FolderOpen, 
  Copy, 
  Trash2, 
  HardDrive, 
  Database,
  Check
} from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import clsx from 'clsx';

export interface VaultContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  vault: RegisteredVault | null;
  isActive?: boolean;
  onClose: () => void;
  onSelectVault: (vault: RegisteredVault) => void;
  onOpenInEditor: (vault: RegisteredVault) => void;
  onRenameVault?: (vault: RegisteredVault) => void;
  onOpenExplorer?: (vault: RegisteredVault) => void;
  onCopyPath?: (vault: RegisteredVault) => void;
  onDeleteVault: (vault: RegisteredVault) => void;
}

export const VaultContextMenu: React.FC<VaultContextMenuProps> = ({
  isOpen,
  position,
  vault,
  isActive = false,
  onClose,
  onSelectVault,
  onOpenInEditor,
  onRenameVault,
  onOpenExplorer,
  onCopyPath,
  onDeleteVault,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // Fecha ao clicar fora ou rolar a página
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  // Calcula posição ajustada para evitar transbordar a tela
  useEffect(() => {
    if (!isOpen || !position) return;

    const menuWidth = 220;
    const menuHeight = 220;
    const padding = 12;

    let posX = position.x;
    let posY = position.y;

    if (typeof window !== 'undefined') {
      if (posX + menuWidth > window.innerWidth - padding) {
        posX = window.innerWidth - menuWidth - padding;
      }
      if (posY + menuHeight > window.innerHeight - padding) {
        posY = window.innerHeight - menuHeight - padding;
      }
    }

    setCoords({ x: Math.max(padding, posX), y: Math.max(padding, posY) });
  }, [isOpen, position]);

  if (!isOpen || !vault || !position) return null;

  const isFSA = vault.storageType === 'fsa';
  const hasExplorer = Boolean(
    typeof window !== 'undefined' && 
    window.electronAPI?.openFolderInExplorer && 
    (isFSA || vault.path)
  );

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopyPath) {
      onCopyPath(vault);
    } else {
      const pathStr = vault.path || vault.folderName || vault.name;
      navigator.clipboard?.writeText(pathStr);
    }
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  const menuContent = (
    <div
      ref={menuRef}
      style={{ top: coords.y, left: coords.x }}
      className="fixed z-[9999] w-56 rounded-xl bg-white dark:bg-[#181A29] border border-black/10 dark:border-white/10 shadow-2xl p-1.5 text-xs text-stone-800 dark:text-[#F4F0E6] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header Info */}
      <div className="px-2.5 py-1.5 mb-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={clsx(
            "w-4 h-4 rounded flex items-center justify-center shrink-0",
            isFSA ? "text-emerald-600 dark:text-emerald-400" : "text-[#1831D7] dark:text-[#7F95FF]"
          )}>
            {isFSA ? <HardDrive size={11} /> : <Database size={11} />}
          </div>
          <span className="font-bold text-[11px] truncate text-stone-900 dark:text-white">
            {vault.name}
          </span>
        </div>
        <span className="text-[9px] font-mono text-stone-500 dark:text-neutral-400 shrink-0 uppercase">
          {isFSA ? 'HD' : 'IDB'}
        </span>
      </div>

      {/* Action: Ativar ou Abrir no Editor */}
      {isActive ? (
        <button
          type="button"
          onClick={() => {
            onOpenInEditor(vault);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-stone-700 dark:text-neutral-200 transition-colors cursor-pointer"
        >
          <ArrowRight size={13} className="text-[#1831D7] dark:text-[#7F95FF]" />
          <span>Abrir no Editor</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            onSelectVault(vault);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-stone-700 dark:text-neutral-200 transition-colors cursor-pointer"
        >
          <Play size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span>Ativar Vault</span>
        </button>
      )}

      {/* Action: Renomear */}
      {onRenameVault && (
        <button
          type="button"
          onClick={() => {
            onRenameVault(vault);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-stone-700 dark:text-neutral-200 transition-colors cursor-pointer"
        >
          <Edit2 size={13} className="text-stone-400" />
          <span>Renomear Vault</span>
        </button>
      )}

      {/* Action: Abrir no Explorador de Arquivos (Windows) */}
      {hasExplorer && onOpenExplorer && (
        <button
          type="button"
          onClick={() => {
            onOpenExplorer(vault);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-stone-700 dark:text-neutral-200 transition-colors cursor-pointer"
        >
          <FolderOpen size={13} className="text-amber-500" />
          <span>Abrir no Explorador</span>
        </button>
      )}

      {/* Action: Copiar Caminho */}
      {isFSA && (
        <button
          type="button"
          onClick={handleCopy}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/[0.05] dark:hover:bg-white/[0.07] text-stone-700 dark:text-neutral-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Caminho copiado!</span>
            </>
          ) : (
            <>
              <Copy size={13} className="text-stone-400" />
              <span>Copiar Caminho</span>
            </>
          )}
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-black/[0.06] dark:border-white/[0.08] my-1" />

      {/* Action: Excluir Vault (Destrutivo) */}
      <button
        type="button"
        onClick={() => {
          onDeleteVault(vault);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer group"
      >
        <Trash2 size={13} className="text-rose-500 group-hover:scale-110 transition-transform" />
        <span>Excluir Vault...</span>
      </button>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(menuContent, document.body);
};
