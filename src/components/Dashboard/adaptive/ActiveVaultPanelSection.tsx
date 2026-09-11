import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Database, 
  Edit2, 
  Check, 
  X, 
  ArrowRight 
} from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { isElectron, setWindowMode } from '@/utils/electronHelper';
import { SafeIcon } from '@/components/common/SafeIcon';
import { VaultListSection } from './VaultListSection';
import { VaultMetricsCompact } from './VaultMetricsCompact';
import { VaultOptionsMenu } from './VaultOptionsMenu';

export interface ActiveVaultPanelSectionProps {
  activeVault: RegisteredVault;
  vaults?: RegisteredVault[];
  onSwitchVault?: (vault: RegisteredVault, forcePicker?: boolean) => Promise<boolean | void> | void;
  onCreateVault?: () => void;
  onRemoveVault?: (id: string, deleteDiskFolder?: boolean) => Promise<boolean | void> | void;
  onRenameVault: (id: string, newName: string) => void;
  onConnectFSA: () => Promise<boolean | void> | void;
  onOpenSettings?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  isConnectingFSA?: boolean;
}

export const ActiveVaultPanelSection: React.FC<ActiveVaultPanelSectionProps> = ({
  activeVault,
  vaults = [],
  onSwitchVault,
  onCreateVault,
  onRemoveVault,
  onRenameVault,
  onConnectFSA,
  onOpenSettings,
  onExportBackup,
  onImportBackup,
  isConnectingFSA = false,
}) => {
  const router = useRouter();
  const isFSA = activeVault.storageType === 'fsa';

  // Inline editing for vault name
  const [isEditingName, setIsEditingName] = useState(false);
  const [vaultNameInput, setVaultNameInput] = useState(activeVault.name);

  // Copy path feedback
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setVaultNameInput(activeVault.name);
  }, [activeVault.name]);

  const handleSaveName = () => {
    const trimmed = vaultNameInput.trim();
    if (trimmed && trimmed !== activeVault.name) {
      onRenameVault(activeVault.id, trimmed);
    }
    setIsEditingName(false);
  };

  const displayPath = activeVault.path || (
    isFSA 
      ? (activeVault.folderName ? `D:\\RPG\\Campanhas\\${activeVault.folderName}` : 'D:\\RPG\\Campanhas\\Baróvia')
      : 'indexeddb://rpgsa-vault-storage'
  );

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(displayPath);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenExplorer = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openFolderInExplorer) {
      await window.electronAPI.openFolderInExplorer(displayPath);
    } else {
      handleCopyPath();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-3 animate-in fade-in duration-200">
      {/* ============================================================
          HEADER & STATUS BADGE WITH 3-DOTS OPTIONS MENU
          ============================================================ */}
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#1831D7] dark:text-[#7F95FF] font-bold">
            Vault Selecionado
          </span>

          <div className="flex items-center gap-1.5">
            {/* Tag de Status */}
            {isFSA ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#52B1FF]/10 text-[#52B1FF] border border-[#52B1FF]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#52B1FF] shadow-[0_0_8px_rgba(82,177,255,0.8)] animate-pulse" />
                <span>HD LOCAL (WINDOWS)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1831D7]/15 text-[#1831D7] dark:text-[#7F95FF] border border-[#7F95FF]/30">
                <Database size={11} />
                <span>INDEXEDDB</span>
              </div>
            )}

            {/* Menu de Opções (3 Pontinhos) */}
            <VaultOptionsMenu
              displayPath={displayPath}
              isCopied={isCopied}
              onCopyPath={handleCopyPath}
              onOpenExplorer={handleOpenExplorer}
              isFSA={isFSA}
              onConnectFSA={onConnectFSA}
              isConnectingFSA={isConnectingFSA}
              onRename={() => setIsEditingName(true)}
              onOpenSettings={onOpenSettings}
              onExportBackup={onExportBackup}
              onImportBackup={onImportBackup}
              placement="bottom"
            />
          </div>
        </div>
      </div>

      {/* ============================================================
          VAULT NAME (INLINE EDITABLE, SEM CAMINHO)
          ============================================================ */}
      <div className="shrink-0 p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03]">
        <span className="text-[10px] uppercase font-bold text-stone-600 dark:text-[#B4D3F1]/70 tracking-wider">
          Nome do Vault
        </span>

        {isEditingName ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              type="text"
              value={vaultNameInput}
              onChange={(e) => setVaultNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
              className="w-full bg-white dark:bg-black/60 border border-[#7F95FF] rounded-lg px-2.5 py-1 text-base sm:text-lg font-bold text-stone-900 dark:text-white outline-none"
            />
            <button
              onClick={handleSaveName}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shrink-0"
              title="Salvar"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => {
                setVaultNameInput(activeVault.name);
                setIsEditingName(false);
              }}
              className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 text-stone-700 dark:text-white transition-colors cursor-pointer shrink-0"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-1 group">
            <h4 
              className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tracking-tight truncate"
              title={activeVault.name}
            >
              {activeVault.name}
            </h4>
            <button
              onClick={() => setIsEditingName(true)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-all cursor-pointer shrink-0"
              title="Renomear Vault"
            >
              <Edit2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          COMPACT METRICS: NOTAS SALVAS & CANVASES VINCULADOS
          ============================================================ */}
      <div className="shrink-0">
        <VaultMetricsCompact 
          documentCount={activeVault.documentCount} 
          canvasCount={activeVault.canvasCount} 
        />
      </div>

      {/* ============================================================
          PRIMARY CTA: ABRIR VAULT NO EDITOR →
          ============================================================ */}
      <button
        onClick={async () => {
          useVaultStore.getState().startEnteringVault(activeVault.name);
          try {
            if (activeVault.storageType === 'fsa') {
              try {
                await onConnectFSA();
              } catch (err) {
                console.warn('[ActiveVaultPanelSection] Falha ao conectar antes de abrir:', err);
              }
            }
            if (isElectron()) {
              setWindowMode('workspace');
            }
            await router.push('/vault');
          } catch (err) {
            console.error('[ActiveVaultPanelSection] Erro ao navegar para vault:', err);
            useVaultStore.getState().finishEnteringVault();
          }
        }}
        className="shrink-0 w-full group relative overflow-hidden rounded-xl p-2.5 bg-[#1831D7] text-[#F4F0E6] hover:bg-[#1831D7]/90 font-bold text-xs flex items-center justify-between transition-all duration-200 active:scale-[0.98] shadow-md shadow-[#1831D7]/20 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <SafeIcon size={16} className="text-[#B4D3F1]" />
          <span>Abrir Vault no Editor</span>
        </div>

        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
          <ArrowRight size={13} />
        </div>
      </button>

      {/* ============================================================
          INTEGRATED VAULTS LIST (EXPANDS DOWN TO NEAR WINDOW BOTTOM)
          ============================================================ */}
      {vaults && vaults.length > 0 && onSwitchVault && (
        <div className="flex-1 min-h-0 flex flex-col pt-3 sm:pt-4">
          <VaultListSection
            vaults={vaults}
            activeVaultId={activeVault.id}
            onSwitchVault={onSwitchVault}
            onCreateVault={onCreateVault}
            onRemoveVault={onRemoveVault}
            onRenameVault={onRenameVault}
          />
        </div>
      )}
    </div>
  );
};
