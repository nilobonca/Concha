import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { 
  BookOpen, 
  HardDrive, 
  Database, 
  Settings, 
  Edit2, 
  Check, 
  X, 
  ArrowRight, 
  Layers, 
  FileText, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { SafeIcon } from '@/components/common/SafeIcon';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { isElectron, setWindowMode } from '@/utils/electronHelper';
import clsx from 'clsx';

interface VaultActiveHeroProps {
  activeVault: RegisteredVault;
  onRenameVault: (id: string, newName: string) => void;
  onConnectFSA: () => Promise<boolean | void>;
  onOpenSettings: () => void;
  onOpenQuickCanvas: () => void;
  isConnecting?: boolean;
}

export const VaultActiveHero: React.FC<VaultActiveHeroProps> = ({
  activeVault,
  onRenameVault,
  onConnectFSA,
  onOpenSettings,
  onOpenQuickCanvas,
  isConnecting = false,
}) => {
  const router = useRouter();
  const isFSA = activeVault.storageType === 'fsa';
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(activeVault.name);

  const handleStartEditing = () => {
    setEditName(activeVault.name);
    setIsEditing(true);
  };

  const handleSaveName = () => {
    if (editName.trim() && editName.trim() !== activeVault.name) {
      onRenameVault(activeVault.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setEditName(activeVault.name);
    setIsEditing(false);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-linear-to-b from-white/90 to-stone-50/70 dark:from-[#16161F]/90 dark:to-[#111118]/80 shadow-xl backdrop-blur-xl p-6 sm:p-8 transition-all">
      {/* Glow highlight for aesthetics */}
      <div className={clsx(
        "absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-40",
        isFSA ? "bg-[#52B1FF]/25" : "bg-[#1831D7]/25"
      )} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Side: Vault Identity & Details */}
        <div className="flex-1 space-y-4">
          {/* Storage Type & Status Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className={clsx(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs border transition-all",
              isFSA
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 dark:border-emerald-500/30"
                : "bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] border-[#7F95FF]/25 dark:border-[#7F95FF]/30"
            )}>
              <span className={clsx(
                "w-2 h-2 rounded-full animate-pulse",
                isFSA ? "bg-[#52B1FF]" : "bg-[#1831D7]"
              )} />
              {isFSA ? (
                <span className="flex items-center gap-1.5">
                  <HardDrive size={13} />
                  HD Local (Windows) — Sincronizado
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Database size={13} />
                  Armazenamento no Navegador (IndexedDB)
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-stone-500 dark:text-neutral-400 border border-black/5 dark:border-white/5">
              <SafeIcon size={12} className="text-[#1831D7] dark:text-[#7F95FF]" />
              Vault Ativo
            </span>
          </div>

          {/* Vault Name and Editable Title */}
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditing();
                  }}
                  autoFocus
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-white dark:bg-black/50 border-2 border-[#1831D7] rounded-xl px-3 py-1 text-stone-900 dark:text-white outline-none w-full"
                />
                <button
                  onClick={handleSaveName}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  title="Salvar Nome"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={handleCancelEditing}
                  className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 text-rose-600 transition-colors"
                  title="Cancelar"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900 dark:text-white line-clamp-1">
                  {activeVault.name}
                </h2>
                <button
                  onClick={handleStartEditing}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-all cursor-pointer"
                  title="Renomear Vault"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}

            <p className="mt-1 text-xs sm:text-sm text-[#6B6864] dark:text-[#A0A0B0] max-w-2xl leading-relaxed">
              {isFSA
                ? "Conectado a uma pasta local no seu computador. Todas as suas anotações em Markdown (.md), arquivos e wikilinks são salvos em tempo real no seu disco rígido."
                : "Suas anotações, wikilinks e pastas estão salvos no banco de dados interno do navegador. Você pode vincular uma pasta local do Windows a qualquer momento."}
            </p>
          </div>

          {/* Key Metrics Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
              <FileText size={15} className="text-[#1831D7] dark:text-[#7F95FF]" />
              <div className="text-xs">
                <span className="font-bold text-stone-900 dark:text-white mr-1">
                  {activeVault.documentCount || 0}
                </span>
                <span className="text-stone-500 dark:text-neutral-400">arquivos & notas</span>
              </div>
            </div>

            <button
              onClick={onOpenQuickCanvas}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/5 dark:border-white/5 transition-all text-xs cursor-pointer group"
              title="Ver Canvas salvos neste Vault"
            >
              <Layers size={15} className="text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white mr-1">
                  {activeVault.canvasCount || 0}
                </span>
                <span className="text-stone-500 dark:text-neutral-400">canvas vinculados</span>
              </div>
              <ArrowRight size={13} className="text-stone-400 group-hover:translate-x-0.5 transition-transform ml-1" />
            </button>
          </div>
        </div>

        {/* Right Side: Primary Actions & Vault Controls */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:min-w-[240px]">
          {/* Main Action: Abrir Vault no Editor */}
          <button
            onClick={async () => {
              useVaultStore.getState().startEnteringVault(activeVault.name);
              try {
                if (activeVault.storageType === 'fsa') {
                  try {
                    await onConnectFSA();
                  } catch (err) {
                    console.warn('[VaultActiveHero] Falha ao conectar antes de abrir:', err);
                  }
                }
                if (isElectron()) {
                  setWindowMode('workspace');
                }
                await router.push('/vault');
              } catch (err) {
                console.error('[VaultActiveHero] Erro ao navegar para vault:', err);
                useVaultStore.getState().finishEnteringVault();
              }
            }}
            className="w-full btn-island bg-[#1831D7] text-white hover:bg-[#1831D7]/90 shadow-lg shadow-[#1831D7]/20 font-bold px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all group"
          >
            <SafeIcon size={18} className="group-hover:scale-105 transition-transform" />
            <span>Abrir Vault no Editor</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary Actions Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={onConnectFSA}
              disabled={isConnecting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 border border-black/10 dark:border-white/10 font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Vincular ou trocar pasta local do Windows"
            >
              {isConnecting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <FolderOpen size={14} className="text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{isFSA ? 'Trocar Pasta HD' : 'Vincular Pasta HD'}</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-neutral-200 border border-black/10 dark:border-white/10 transition-colors shadow-xs cursor-pointer"
              title="Configurações do Vault"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
