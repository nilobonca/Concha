import React from 'react';
import { 
  HardDrive, 
  Database, 
  Layers, 
  ArrowRight, 
  Check, 
  Trash2, 
  Plus, 
  FolderKanban, 
  FileText 
} from 'lucide-react';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { SafeIcon } from '@/components/common/SafeIcon';
import clsx from 'clsx';

interface VaultOptionsGridProps {
  vaults: RegisteredVault[];
  activeVaultId: string;
  totalCanvasesCount: number;
  onSelectVault: (vault: RegisteredVault) => void;
  onConnectFSA: () => void;
  onCreateIDBVault: () => void;
  onRemoveVault: (id: string) => void;
  onOpenQuickCanvas: () => void;
}

export const VaultOptionsGrid: React.FC<VaultOptionsGridProps> = ({
  vaults,
  activeVaultId,
  totalCanvasesCount,
  onSelectVault,
  onConnectFSA,
  onCreateIDBVault,
  onRemoveVault,
  onOpenQuickCanvas,
}) => {
  return (
    <div className="space-y-8">
      {/* ============================================================
          SECTION: OPÇÕES DE VAULT & MODALIDADES DE ARMAZENAMENTO
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-stone-900 dark:text-[#F4F0E6] flex items-center gap-2">
              <SafeIcon size={18} className="text-[#1831D7] dark:text-[#7F95FF]" />
              <span>Opções de Vault</span>
            </h3>
            <p className="text-xs text-[#6B6864] dark:text-[#B4D3F1]/80">
              Escolha como deseja estruturar, conectar ou criar suas bases de conhecimento
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Option 1: Vincular Pasta Windows (HD / Obsidian) */}
          <div 
            onClick={onConnectFSA}
            className="surface-bezel-outer group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="surface-bezel-inner h-full flex flex-col justify-between p-6 bg-white dark:bg-[#131524] hover:border-[#52B1FF]/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#52B1FF]/15 border border-[#52B1FF]/30 text-[#52B1FF] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HardDrive size={24} />
                </div>
                <h4 className="text-base font-bold text-stone-900 dark:text-[#F4F0E6] group-hover:text-[#52B1FF] transition-colors">
                  Pasta Local do Windows
                </h4>
                <p className="text-xs text-[#6B6864] dark:text-[#B4D3F1]/80 mt-1.5 leading-relaxed">
                  Conecte qualquer pasta do seu computador (incluindo vaults do Obsidian). Seus arquivos <code className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">.md</code> são sincronizados em tempo real no seu HD.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#52B1FF]">
                <span>Vincular Pasta HD</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Option 2: Criar Vault IndexedDB (Navegador) */}
          <div 
            onClick={onCreateIDBVault}
            className="surface-bezel-outer group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="surface-bezel-inner h-full flex flex-col justify-between p-6 bg-white dark:bg-[#131524] hover:border-[#7F95FF]/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#1831D7]/20 border border-[#7F95FF]/30 text-[#7F95FF] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <SafeIcon size={24} />
                </div>
                <h4 className="text-base font-bold text-stone-900 dark:text-[#F4F0E6] group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] transition-colors">
                  Novo Vault IndexedDB
                </h4>
                <p className="text-xs text-[#6B6864] dark:text-[#B4D3F1]/80 mt-1.5 leading-relaxed">
                  Crie uma base de dados isolada salva localmente no navegador. Ideal para campanhas fechadas de RPG, regras de sistema e anotações rápidas sem configurar pastas locais.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#1831D7] dark:text-[#7F95FF]">
                <span>Criar Novo Vault</span>
                <Plus size={14} className="group-hover:scale-125 transition-transform" />
              </div>
            </div>
          </div>

          {/* Option 3: Baú de Canvas */}
          <div 
            onClick={onOpenQuickCanvas}
            className="surface-bezel-outer group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="surface-bezel-inner h-full flex flex-col justify-between p-6 bg-white dark:bg-[#131524] hover:border-[#7F95FF]/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#7F95FF]/15 border border-[#7F95FF]/30 text-[#7F95FF] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FolderKanban size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-stone-900 dark:text-[#F4F0E6] group-hover:text-[#7F95FF] transition-colors">
                    Baú de Canvas
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1831D7]/20 text-[#1831D7] dark:text-[#B4D3F1]">
                    {totalCanvasesCount}
                  </span>
                </div>
                <p className="text-xs text-[#6B6864] dark:text-[#B4D3F1]/80 mt-1.5 leading-relaxed">
                  Navegue por todos os seus Quadros de Conexões e Mesas de Áudio RPG organizados e separados pelos vaults onde foram salvos ou em visualização unificada.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#7F95FF]">
                <span>Ver Todos os Canvas</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION: MEUS VAULTS CADASTRADOS & ACESSÍVEIS
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
              <span>Meus Vaults Cadastrados</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-stone-600 dark:text-stone-300">
                {vaults.length}
              </span>
            </h3>
            <p className="text-xs text-[#6B6864] dark:text-[#A0A0B0]">
              Alterne facilmente entre diferentes vaults e campanhas com um único clique
            </p>
          </div>

          <button
            onClick={onCreateIDBVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-stone-700 dark:text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Adicionar Vault</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults.map((vault) => {
            const isActive = vault.id === activeVaultId;
            const isFSA = vault.storageType === 'fsa';

            return (
              <div
                key={vault.id}
                onClick={() => onSelectVault(vault)}
                className={clsx(
                  "p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 group relative",
                  isActive
                    ? "bg-white dark:bg-[#17192A] border-[#1831D7] dark:border-[#7F95FF] shadow-md ring-2 ring-[#7F95FF]/20"
                    : "bg-white/70 dark:bg-[#131524] border-black/[0.08] dark:border-white/[0.08] hover:border-[#7F95FF]/40 hover:bg-white dark:hover:bg-[#17192A]"
                )}
              >
                {/* Header Row: Icon, Title, Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                      isFSA
                        ? "bg-[#52B1FF]/10 text-[#52B1FF] border-[#52B1FF]/30"
                        : "bg-[#1831D7]/15 text-[#1831D7] border-[#1831D7]/30 dark:bg-[#7F95FF]/15 dark:border-[#7F95FF]/30 dark:text-[#7F95FF]"
                    )}>
                      {isFSA ? <HardDrive size={20} /> : <Database size={20} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-stone-900 dark:text-[#F4F0E6] line-clamp-1 group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] transition-colors">
                          {vault.name}
                        </h4>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] border border-[#7F95FF]/30">
                            <Check size={11} className="stroke-[3]" />
                            Ativo
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-stone-500 dark:text-[#B4D3F1]/70 block mt-0.5">
                        {isFSA ? 'HD Local (Windows)' : 'IndexedDB'}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Delete for non-active vaults, or default if other vaults exist) */}
                  {!isActive && (!vault.isDefault || vaults.length > 1) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Deseja remover "${vault.name}" do registro de vaults?`)) {
                          onRemoveVault(vault.id);
                        }
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Remover Vault do Registro"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Footer Metrics & Open Indicator */}
                <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.06] text-xs text-stone-500 dark:text-[#B4D3F1]/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText size={12} className="text-[#7F95FF]" />
                      {vault.documentCount || 0} notas
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={12} className="text-[#52B1FF]" />
                      {vault.canvasCount || 0} canvas
                    </span>
                  </div>

                  <span className={clsx(
                    "font-semibold text-xs flex items-center gap-1 transition-transform group-hover:translate-x-0.5",
                    isActive ? "text-[#1831D7] dark:text-[#7F95FF]" : "text-stone-400 group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF]"
                  )}>
                    {isActive ? 'Conectado' : 'Alternar'} &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
