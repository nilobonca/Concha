import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
  Copy, 
  Check, 
  FolderOpen, 
  HardDrive,
  RefreshCw,
  Edit2, 
  Settings, 
  DownloadCloud, 
  UploadCloud 
} from 'lucide-react';
import clsx from 'clsx';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface VaultOptionsMenuProps {
  displayPath: string;
  isCopied: boolean;
  onCopyPath: () => void;
  onOpenExplorer: () => void;
  isFSA: boolean;
  onConnectFSA: () => Promise<boolean | void> | void;
  isConnectingFSA?: boolean;
  onRename: () => void;
  onOpenSettings?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  placement?: 'top' | 'bottom';
}

export const VaultOptionsMenu: React.FC<VaultOptionsMenuProps> = ({
  displayPath,
  isCopied,
  onCopyPath,
  onOpenExplorer,
  isFSA,
  onConnectFSA,
  isConnectingFSA = false,
  onRename,
  onOpenSettings,
  onExportBackup,
  onImportBackup,
  placement = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useClickOutside({
    ref: menuRef,
    onClose: () => setIsOpen(false),
    enabled: isOpen,
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBackup) {
      onImportBackup(file);
    }
    e.target.value = '';
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={clsx(
          "w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer",
          isOpen
            ? "bg-[#1831D7]/15 text-[#1831D7] dark:bg-white/15 dark:text-white border border-[#1831D7]/30 dark:border-white/20"
            : "bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-stone-600 dark:text-neutral-300 border border-black/10 dark:border-white/10"
        )}
        aria-expanded={isOpen}
        aria-label="Opções do Vault"
        title="Opções do Vault"
      >
        <MoreVertical size={13} />
      </button>

      {isOpen && (
        <div 
          className={clsx(
            "absolute right-0 w-64 rounded-lg bg-white dark:bg-[#181824] border border-black/10 dark:border-white/10 shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-150",
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-1.5'
          )}
        >
          {/* Header com o caminho de armazenamento */}
          <div className="px-2.5 py-2 mb-1 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.04]">
            <div className="text-[9px] uppercase font-bold text-stone-400 dark:text-neutral-400 tracking-wider">
              Armazenamento
            </div>
            <div 
              className="font-mono text-[10px] text-stone-600 dark:text-neutral-300 truncate mt-0.5 select-all" 
              title={displayPath}
            >
              {displayPath}
            </div>
          </div>

          {/* Opção: Copiar Caminho */}
          <button
            onClick={onCopyPath}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {isCopied ? (
                <Check size={13} className="text-emerald-500 shrink-0" />
              ) : (
                <Copy size={13} className="shrink-0" />
              )}
              <span>{isCopied ? 'Caminho Copiado!' : 'Copiar Caminho'}</span>
            </div>
            {isCopied && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                ✓
              </span>
            )}
          </button>

          {/* Opção: Abrir no Explorador */}
          <button
            onClick={() => {
              onOpenExplorer();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium text-left transition-colors cursor-pointer"
          >
            <FolderOpen size={13} className="shrink-0" />
            <span>Abrir no Explorador</span>
          </button>

          {/* Opção: Vincular / Trocar Pasta HD */}
          <button
            onClick={() => {
              setIsOpen(false);
              onConnectFSA();
            }}
            disabled={isConnectingFSA}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium text-left transition-colors cursor-pointer disabled:opacity-50"
          >
            {isConnectingFSA ? (
              <RefreshCw size={13} className="animate-spin text-emerald-500 shrink-0" />
            ) : (
              <HardDrive size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span>{isFSA ? 'Trocar Pasta HD' : 'Vincular Pasta HD'}</span>
          </button>

          <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />

          {/* Opção: Renomear Vault */}
          <button
            onClick={() => {
              setIsOpen(false);
              onRename();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium text-left transition-colors cursor-pointer"
          >
            <Edit2 size={13} className="shrink-0" />
            <span>Renomear Vault</span>
          </button>

          {/* Opção: Configurações do Vault */}
          {onOpenSettings && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium text-left transition-colors cursor-pointer"
            >
              <Settings size={13} className="shrink-0" />
              <span>Configurações do Vault</span>
            </button>
          )}

          {(onExportBackup || onImportBackup) && (
            <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />
          )}

          {/* Opção: Exportar Backup */}
          {onExportBackup && (
            <button
              onClick={() => {
                setIsOpen(false);
                onExportBackup();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium text-left transition-colors cursor-pointer"
            >
              <DownloadCloud size={13} className="shrink-0" />
              <span>Exportar Backup (.zip)</span>
            </button>
          )}

          {/* Opção: Importar Backup */}
          {onImportBackup && (
            <label className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 font-medium cursor-pointer transition-colors">
              <UploadCloud size={13} className="shrink-0" />
              <span>Importar Backup (.zip)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
};
