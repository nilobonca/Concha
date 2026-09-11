import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { 
  Search, 
  Plus, 
  HardDrive, 
  Database, 
  Trash2, 
  X,
  FileText,
  Layers
} from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { isElectron, setWindowMode } from '@/utils/electronHelper';
import { FilingCabinetIcon } from '@/components/common/FilingCabinetIcon';
import clsx from 'clsx';

export interface VaultsLibraryPanelSectionProps {
  vaults: RegisteredVault[];
  activeVaultId: string;
  onSwitchVault: (vault: RegisteredVault, forcePicker?: boolean) => Promise<boolean | void> | void;
  onCreateVault?: () => void;
  onConnectFSA?: () => Promise<boolean | void> | void;
  onRemoveVault?: (id: string) => void;
  isConnectingFSA?: boolean;
}

export const VaultsLibraryPanelSection: React.FC<VaultsLibraryPanelSectionProps> = ({
  vaults,
  activeVaultId,
  onSwitchVault,
  onCreateVault,
  onRemoveVault,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(activeVaultId);

  // Mantém sincronizado quando activeVaultId mudar
  useEffect(() => {
    if (activeVaultId) {
      setSelectedId(activeVaultId);
    }
  }, [activeVaultId]);

  const filteredVaults = useMemo(() => {
    if (!searchQuery.trim()) return vaults;
    const query = searchQuery.toLowerCase().trim();
    return vaults.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.path && v.path.toLowerCase().includes(query)) ||
      (v.folderName && v.folderName.toLowerCase().includes(query)) ||
      (v.storageType && v.storageType.toLowerCase().includes(query))
    );
  }, [vaults, searchQuery]);

  // Clique simples (1x): Seleciona o vault para atualizar o Graph Preview ao lado
  const handleSelectVault = async (vault: RegisteredVault) => {
    setSelectedId(vault.id);
    if (vault.id !== activeVaultId) {
      try {
        await onSwitchVault(vault, false);
      } catch (err) {
        console.warn('[VaultsLibrary] Falha na seleção passiva do vault:', err);
      }
    }
  };

  // Clique duplo (2x): Entra diretamente no editor do Vault
  const handleDoubleClickVault = async (vault: RegisteredVault) => {
    useVaultStore.getState().startEnteringVault(vault.name);
    try {
      if (vault.id !== activeVaultId || vault.storageType === 'fsa') {
        if (onSwitchVault) {
          await onSwitchVault(vault, false);
        }
      }
      if (isElectron()) {
        setWindowMode('workspace');
      }
      await router.push('/vault');
    } catch (err) {
      console.error('[RPGSA] Erro ao entrar no vault:', err);
      useVaultStore.getState().finishEnteringVault();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ============================================================
          HEADER: TITLE & NEW VAULT BUTTON
          ============================================================ */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#1831D7] dark:text-[#7F95FF] font-bold">
            Bases de Conhecimento
          </span>
          <h3 className="text-base font-black tracking-tight text-stone-900 dark:text-[#F4F0E6] flex items-center gap-2">
            <FilingCabinetIcon size={18} className="text-[#1831D7] dark:text-[#7F95FF]" />
            <span>Biblioteca de Vaults</span>
          </h3>
        </div>

        {onCreateVault && (
          <button
            onClick={onCreateVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17192A] hover:bg-[#22253d] text-[#F4F0E6] border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-[0.97]"
          >
            <Plus size={13} className="stroke-[2.5] text-[#7F95FF]" />
            <span>Novo Vault</span>
          </button>
        )}
      </div>

      {/* ============================================================
          SEARCH FIELD
          ============================================================ */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar vault..."
          className="w-full bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl pl-8 pr-8 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-neutral-500 outline-none focus:border-[#7F95FF] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* ============================================================
          LIST OF REGISTERED VAULTS (1 CLICK = PREVIEW, 2 CLICKS = ENTER)
          ============================================================ */}
      <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
        {filteredVaults.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-stone-400 text-xs">
            Nenhum vault encontrado com o filtro aplicado.
          </div>
        ) : (
          filteredVaults.map((vault) => {
            const isSelected = vault.id === selectedId || vault.id === activeVaultId;
            const isFSA = vault.storageType === 'fsa';

            return (
              <div
                key={vault.id}
                onClick={() => handleSelectVault(vault)}
                onDoubleClick={() => handleDoubleClickVault(vault)}
                className={clsx(
                  "p-3.5 rounded-xl border transition-all duration-200 group flex flex-col gap-2.5 cursor-pointer select-none",
                  isSelected
                    ? "bg-[#1831D7]/10 dark:bg-[#7F95FF]/15 border-[#1831D7] dark:border-[#7F95FF] ring-1 ring-[#7F95FF]/30 shadow-xs"
                    : "bg-white dark:bg-[#131524] border-black/[0.06] dark:border-white/[0.08] hover:border-[#7F95FF]/40 hover:bg-black/[0.01] dark:hover:bg-[#17192A]"
                )}
                title="Clique 1x para ver o grafo • Clique 2x para entrar"
              >
                {/* Top Row: Icon, Name & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <div className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        isFSA 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "bg-[#1831D7]/15 text-[#1831D7] dark:bg-[#7F95FF]/20 dark:text-[#7F95FF]"
                      )}>
                        {isFSA ? <HardDrive size={14} /> : <Database size={14} />}
                      </div>
                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#131524] animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className={clsx(
                          "font-bold text-xs truncate transition-colors",
                          isSelected 
                            ? "text-[#1831D7] dark:text-[#7F95FF]" 
                            : "text-stone-900 dark:text-[#F4F0E6] group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF]"
                        )}>
                          {vault.name}
                        </h4>
                      </div>

                      <span className="text-[10px] text-stone-400 dark:text-neutral-500 truncate block">
                        {isFSA ? 'HD Local (Windows)' : 'IndexedDB (Navegador)'}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button on Hover (for non-selected/non-default vaults) */}
                  {!isSelected && onRemoveVault && !vault.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveVault(vault.id);
                      }}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                      title="Remover Vault da Lista"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Bottom Row: Path / Stats */}
                <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-neutral-400 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <div className="flex items-center gap-1 truncate max-w-[200px] font-mono">
                    <span>{vault.folderName || vault.path || 'Armazenamento interno'}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-0.5">
                      <FileText size={10} />
                      {vault.documentCount || 0}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Layers size={10} />
                      {vault.canvasCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================
          INFORMATIVE FOOTER
          ============================================================ */}
      <p className="text-[10px] text-center text-stone-400 dark:text-neutral-500 pt-1">
        Clique <span className="font-semibold text-stone-600 dark:text-neutral-400">1x</span> para visualizar no grafo • <span className="font-semibold text-stone-600 dark:text-neutral-400">2x</span> para entrar
      </p>
    </div>
  );
};
