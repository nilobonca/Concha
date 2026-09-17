import React, { useState, useEffect, useRef } from 'react';
import { SafeIcon } from '@/components/common/SafeIcon';
import { Edit2, Check, Settings, ChevronDown, Plus } from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import clsx from 'clsx';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface VaultMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  vaultName: string;
  storageType?: string;
  onSaveName: (name: string) => Promise<void> | void;
  onOpenSettings: () => void;
  vaults: RegisteredVault[];
  activeVaultId?: string;
  onSelectVault: (vault: RegisteredVault) => Promise<void> | void;
  onCreateVault: () => void;
}

export const VaultMenuPopover: React.FC<VaultMenuPopoverProps> = ({
  isOpen,
  onClose,
  vaultName,
  storageType,
  onSaveName,
  onOpenSettings,
  vaults,
  activeVaultId,
  onSelectVault,
  onCreateVault,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(vaultName);
  const [vaultsDropdownOpen, setVaultsDropdownOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameInput(vaultName);
  }, [vaultName]);

  // Click outside / interaction to close
  useClickOutside({
    ref: popoverRef,
    onClose: () => {
      onClose();
      setVaultsDropdownOpen(false);
      setIsEditingName(false);
    },
    enabled: isOpen,
  });

  const handleSave = async () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== vaultName) {
      await onSaveName(trimmed);
    }
    setIsEditingName(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className="absolute left-10 top-0 w-72 bg-white dark:bg-[#16161D] border border-stone-200 dark:border-white/10 rounded-lg shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2.5 text-stone-900 dark:text-neutral-100"
    >
      <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-white/5">
        <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-stone-400 dark:text-neutral-500">
          <SafeIcon size={11} className="text-[#1831D7] dark:text-[#7F95FF]" />
          Vault Ativo
        </span>
        <span className="flex items-center gap-1 text-[10px] text-stone-500 dark:text-neutral-400 font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${storageType === 'fsa' ? 'bg-emerald-500' : 'bg-[#1831D7]'}`} />
          {storageType === 'fsa' ? 'HD Local' : 'IndexedDB'}
        </span>
      </div>

      {/* Vault Name Display / Edit */}
      {isEditingName ? (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditingName(false);
            }}
            placeholder="Nome do Vault..."
            className="flex-1 bg-stone-50 dark:bg-black/30 border border-[#1831D7] rounded-lg px-2 py-1 text-xs text-stone-900 dark:text-neutral-100 outline-none"
          />
          <button
            onClick={handleSave}
            className="p-1 rounded-md bg-[#1831D7] hover:bg-[#1831D7]/90 text-white transition-colors cursor-pointer"
            title="Salvar nome"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div 
          onClick={() => {
            setNameInput(vaultName);
            setIsEditingName(true);
          }}
          className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
          title="Clique para renomear o Vault"
        >
          <span className="font-semibold text-xs text-stone-900 dark:text-neutral-100 truncate group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF]">
            {vaultName}
          </span>
          <Edit2 className="w-3 h-3 text-stone-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      )}

      {/* Quick Actions in Popover */}
      <div className="pt-1 border-t border-stone-100 dark:border-white/5 flex flex-col gap-1 text-xs">
        <button
          onClick={() => {
            setNameInput(vaultName);
            setIsEditingName(true);
          }}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#1831D7]/10 text-stone-700 dark:text-neutral-300 hover:text-[#1831D7] dark:hover:text-[#7F95FF] transition-colors text-left cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF]" />
          <span>Renomear Vault</span>
        </button>
        <button
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#1831D7]/10 text-stone-700 dark:text-neutral-300 hover:text-[#1831D7] dark:hover:text-[#7F95FF] transition-colors text-left cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF]" />
          <span>Configurações & Pastas</span>
        </button>
      </div>

      {/* Botão que revela o Dropdown de Vaults */}
      <div className="pt-1.5 border-t border-stone-100 dark:border-white/5 flex flex-col gap-1.5">
        <button
          onClick={() => setVaultsDropdownOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-stone-100/90 dark:bg-white/[0.06] hover:bg-stone-200/90 dark:hover:bg-white/[0.1] text-stone-800 dark:text-neutral-200 text-xs font-semibold transition-all cursor-pointer border border-stone-200/60 dark:border-white/5"
        >
          <div className="flex items-center gap-2">
            <SafeIcon size={13} className="text-[#1831D7] dark:text-[#7F95FF]" />
            <span>Alternar Vault ({vaults.length})</span>
          </div>
          <ChevronDown size={14} className={clsx("transition-transform duration-200 text-stone-400", vaultsDropdownOpen && "rotate-180")} />
        </button>

        {/* Dropdown com a lista de vaults e opção de criar novo */}
        {vaultsDropdownOpen && (
          <div className="flex flex-col gap-1.5 p-1.5 rounded-lg bg-stone-50 dark:bg-black/40 border border-stone-200/80 dark:border-white/5 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
              {vaults.map(v => {
                const isCurrent = v.id === activeVaultId;
                const isFSA = v.storageType === 'fsa';
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      onSelectVault(v);
                      onClose();
                    }}
                    className={clsx(
                      "flex items-center justify-between p-1.5 rounded-md text-left text-xs transition-colors cursor-pointer group",
                      isCurrent
                        ? "bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] font-bold border border-[#7F95FF]/30"
                        : "hover:bg-stone-200/70 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <SafeIcon size={12} className={isCurrent ? "text-[#1831D7] dark:text-[#7F95FF]" : "text-stone-400 dark:text-neutral-500"} />
                      <span className="truncate max-w-[140px]">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={clsx(
                        "text-[9px] font-mono px-1 py-0.2 rounded font-bold",
                        isFSA 
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      )}>
                        {isFSA ? 'HD' : 'IDB'}
                      </span>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Vault Ativo" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Opção de criar novo vault */}
            <button
              onClick={() => {
                onClose();
                onCreateVault();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98] mt-0.5"
            >
              <Plus size={13} className="stroke-[2.5]" />
              <span>Criar Novo Vault</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
