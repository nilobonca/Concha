import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { 
  Search, 
  Plus, 
  Layers, 
  HardDrive, 
  Database, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  X 
} from 'lucide-react';
import { Layer } from '@/interfaces/utils/indexedDB';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { CanvasAdaptiveCard } from './CanvasAdaptiveCard';
import clsx from 'clsx';

export interface CanvasesQuickPanelSectionProps {
  canvases: Layer[];
  vaults: RegisteredVault[];
  activeVaultId: string;
  projectPageCounts?: Record<string, number>;
  onCreateCanvas?: (type?: 'board' | 'audio') => void;
  onOpenCanvas?: (canvas: Layer) => void;
  onRenameCanvas?: (canvasId: string, newName: string) => void;
  onDeleteCanvas?: (canvas: Layer) => void;
  onUpdateCanvas?: (updated: Layer) => void;
}

export const CanvasesQuickPanelSection: React.FC<CanvasesQuickPanelSectionProps> = ({
  canvases,
  vaults,
  activeVaultId,
  projectPageCounts = {},
  onCreateCanvas,
  onOpenCanvas,
  onRenameCanvas,
  onDeleteCanvas,
  onUpdateCanvas,
}) => {
  const router = useRouter();
  const [tabMode, setTabMode] = useState<'by-vault' | 'all'>('by-vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedVaults, setCollapsedVaults] = useState<Record<string, boolean>>({});

  const handleToggleCollapse = (vaultKey: string) => {
    setCollapsedVaults(prev => ({
      ...prev,
      [vaultKey]: !prev[vaultKey],
    }));
  };

  const handleOpen = (canvas: Layer) => {
    if (onOpenCanvas) {
      onOpenCanvas(canvas);
    } else {
      if (canvas.canvasType === 'board') {
        router.push(`/board/${canvas.id}`);
      } else {
        router.push(`/project/${canvas.id}`);
      }
    }
  };

  // Filter canvases by search
  const filteredCanvases = useMemo(() => {
    if (!searchQuery.trim()) return canvases;
    const query = searchQuery.toLowerCase().trim();
    return canvases.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      (c.folderPath && c.folderPath.toLowerCase().includes(query))
    );
  }, [canvases, searchQuery]);

  // Group canvases by vault
  const vaultGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      vault?: RegisteredVault;
      isGeneral: boolean;
      items: Layer[];
    }> = [];

    // Existing registered vaults
    vaults.forEach(vault => {
      const items = filteredCanvases.filter(c => c.vaultId === vault.id);
      groups.push({
        key: vault.id,
        vault,
        isGeneral: false,
        items,
      });
    });

    // General / Unassigned canvases
    const generalItems = filteredCanvases.filter(c => !c.vaultId || !vaults.some(v => v.id === c.vaultId));
    if (generalItems.length > 0 || vaults.length === 0) {
      groups.push({
        key: '__general__',
        isGeneral: true,
        items: generalItems,
      });
    }

    return groups;
  }, [vaults, filteredCanvases]);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* ============================================================
          HEADER: TITLE, COUNTER & + NOVO CANVAS BUTTON
          ============================================================ */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black tracking-tight text-stone-900 dark:text-white">
            Baú de Canvas
          </h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-stone-700 dark:text-neutral-300">
            {canvases.length}
          </span>
        </div>

        {onCreateCanvas && (
          <button
            onClick={() => onCreateCanvas()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1831D7] hover:bg-[#1831D7]/90 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="Criar Novo Canvas"
          >
            <Plus size={13} className="stroke-[2.5]" />
            <span>Novo Canvas</span>
          </button>
        )}
      </div>

      {/* ============================================================
          SEARCH FIELD
          ============================================================ */}
      <div className="shrink-0 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, id ou pasta..."
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
          TAB SWITCHER: POR VAULT | TODOS
          ============================================================ */}
      <div className="shrink-0 flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
        <button
          onClick={() => setTabMode('by-vault')}
          className={clsx(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            tabMode === 'by-vault'
              ? "bg-white dark:bg-[#1C1C28] text-stone-900 dark:text-white shadow-xs"
              : "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white"
          )}
        >
          <Database size={12} />
          <span>Por Vault</span>
        </button>

        <button
          onClick={() => setTabMode('all')}
          className={clsx(
            "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            tabMode === 'all'
              ? "bg-white dark:bg-[#1C1C28] text-stone-900 dark:text-white shadow-xs"
              : "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white"
          )}
        >
          <Layers size={12} />
          <span>Todos</span>
        </button>
      </div>

      {/* ============================================================
          CONTENT CONTAINER (BY VAULT OR ALL)
          ============================================================ */}
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {filteredCanvases.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-stone-400 text-xs">
            Nenhum canvas encontrado.
          </div>
        ) : tabMode === 'by-vault' ? (
          // ==================== POR VAULT (COLLAPSIBLE GROUPS) ====================
          <div className="space-y-2.5">
            {vaultGroups.map(group => {
              const isCollapsed = Boolean(collapsedVaults[group.key]);
              const isActiveVault = group.vault?.id === activeVaultId;

              return (
                <div
                  key={group.key}
                  className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01] overflow-hidden"
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => handleToggleCollapse(group.key)}
                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors border-b border-black/[0.04] dark:border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-stone-400">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </span>

                      <div className={clsx(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                        group.isGeneral 
                          ? "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                          : group.vault?.storageType === 'fsa'
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-[#1831D7]/15 text-[#1831D7] dark:bg-[#1831D7]/30 dark:text-[#7F95FF]"
                      )}>
                        {group.isGeneral ? <Folder size={11} /> : group.vault?.storageType === 'fsa' ? <HardDrive size={11} /> : <Database size={11} />}
                      </div>

                      <span className="font-bold text-xs text-stone-900 dark:text-white truncate">
                        {group.isGeneral ? 'Geral / Sem Vault' : group.vault?.name}
                      </span>

                      {isActiveVault && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          Ativo
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-stone-500 dark:text-neutral-400 shrink-0">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Canvas Cards inside group */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-2">
                      {group.items.length === 0 ? (
                        <div className="py-4 text-center text-xs text-stone-400 dark:text-neutral-500">
                          Nenhum canvas neste vault.
                        </div>
                      ) : (
                        group.items.map(canvas => (
                          <CanvasAdaptiveCard
                            key={canvas.id}
                            canvas={canvas}
                            pageCount={projectPageCounts[canvas.id] || 1}
                            onOpen={handleOpen}
                            onRename={onRenameCanvas}
                            onDelete={onDeleteCanvas}
                            onUpdateCanvas={onUpdateCanvas}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // ==================== TODOS OS CANVAS (FLAT LIST) ====================
          <div className="space-y-2">
            {filteredCanvases.map(canvas => (
              <CanvasAdaptiveCard
                key={canvas.id}
                canvas={canvas}
                pageCount={projectPageCounts[canvas.id] || 1}
                onOpen={handleOpen}
                onRename={onRenameCanvas}
                onDelete={onDeleteCanvas}
                onUpdateCanvas={onUpdateCanvas}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
