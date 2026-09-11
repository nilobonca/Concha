import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  X, 
  Search, 
  Layers, 
  FolderKanban, 
  Music, 
  ArrowRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Folder, 
  Database, 
  HardDrive,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Layer } from '@/interfaces/utils/indexedDB';
import { RegisteredVault } from '@/modules/vault/hooks/useVaultRegistry';
import { SafeIcon } from '@/components/common/SafeIcon';
import { useSmoothHorizontalScroll } from '@/hooks/useSmoothHorizontalScroll';
import clsx from 'clsx';

interface CanvasQuickAccessDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  canvases: Layer[];
  vaults: RegisteredVault[];
  activeVaultId: string;
  projectPageCounts: Record<string, number>;
  onOpenCreateCanvas: () => void;
  onDeleteCanvas: (canvas: Layer) => void;
  onUpdateCanvas: (updated: Layer) => void;
}

type TabMode = 'by-vault' | 'all';
type TypeFilter = 'all' | 'board' | 'audio';

export const CanvasQuickAccessDrawer: React.FC<CanvasQuickAccessDrawerProps> = ({
  isOpen,
  onClose,
  canvases,
  vaults,
  activeVaultId,
  projectPageCounts,
  onOpenCreateCanvas,
  onDeleteCanvas,
  onUpdateCanvas,
}) => {
  const filterPillsRef = useSmoothHorizontalScroll<HTMLDivElement>({ speed: 1.15, easing: 0.16 });
  const router = useRouter();
  const [tabMode, setTabMode] = useState<TabMode>('by-vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedVaultFilter, setSelectedVaultFilter] = useState<string>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Expand/collapse state for vault groups
  const [expandedVaults, setExpandedVaults] = useState<Record<string, boolean>>({});

  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingId, onClose]);

  // Filter canvases
  const filteredCanvases = useMemo(() => {
    return canvases.filter(c => {
      const isBoard = c.canvasType === 'board';
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'board' && isBoard) ||
        (typeFilter === 'audio' && !isBoard);

      const matchesVault =
        selectedVaultFilter === 'all' ||
        (selectedVaultFilter === '__general__' && !c.vaultId) ||
        c.vaultId === selectedVaultFilter;

      const matchesSearch =
        searchQuery.trim() === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (c.folderPath && c.folderPath.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      return matchesType && matchesVault && matchesSearch;
    });
  }, [canvases, typeFilter, selectedVaultFilter, searchQuery]);

  // Group canvases by vault
  const canvasesByVault = useMemo(() => {
    const map = new Map<string, { vault: RegisteredVault | null; items: Layer[] }>();

    // Initial groups for registered vaults
    vaults.forEach(v => {
      map.set(v.id, { vault: v, items: [] });
    });

    // Group for General / Unassigned
    map.set('__general__', { vault: null, items: [] });

    // Distribute filtered canvases
    filteredCanvases.forEach(c => {
      const targetVaultId = c.vaultId;
      if (targetVaultId && map.has(targetVaultId)) {
        map.get(targetVaultId)!.items.push(c);
      } else if (targetVaultId) {
        // Unknown or custom vault ID
        const customVault: RegisteredVault = {
          id: targetVaultId,
          name: c.vaultName || `Vault (${targetVaultId.slice(0, 6)})`,
          storageType: 'idb',
          updatedAt: Date.now(),
        };
        map.set(targetVaultId, { vault: customVault, items: [c] });
      } else {
        // Unassigned or fallback
        map.get('__general__')!.items.push(c);
      }
    });

    return Array.from(map.entries()).filter(([key, group]) => {
      // Show group if it has items OR if it's the active vault
      return group.items.length > 0 || key === activeVaultId;
    });
  }, [filteredCanvases, vaults, activeVaultId]);

  const toggleVaultGroup = (key: string) => {
    setExpandedVaults(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  const handleOpenCanvas = (canvas: Layer) => {
    onClose();
    if (canvas.canvasType === 'board') {
      router.push(`/board/${canvas.id}`);
    } else {
      router.push(`/project/${canvas.id}`);
    }
  };

  const handleStartEditing = (e: React.MouseEvent, canvas: Layer) => {
    e.stopPropagation();
    setEditingId(canvas.id);
    setEditName(canvas.name);
  };

  const handleSaveEditing = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editingId && editName.trim()) {
      const target = canvases.find(c => c.id === editingId);
      if (target) {
        onUpdateCanvas({ ...target, name: editName.trim() });
      }
      setEditingId(null);
    }
  };

  const handleChangeCanvasVault = (canvas: Layer, newVaultId: string) => {
    const v = vaults.find(v => v.id === newVaultId);
    onUpdateCanvas({
      ...canvas,
      vaultId: newVaultId === '__general__' ? null : newVaultId,
      vaultName: v ? v.name : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl h-full bg-white dark:bg-[#13131A] border-l border-black/10 dark:border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 text-stone-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            DRAWER HEADER
            ============================================================ */}
        <div className="p-5 sm:p-6 border-b border-black/[0.08] dark:border-white/[0.08] bg-stone-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <FolderKanban size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-white">
                    Acesso Rápido aos Canvas
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                    {canvases.length}
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
                  Navegue, filtre e abra seus projetos de Conexões e Áudio RPG
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCreateCanvas}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6] font-semibold text-xs transition-colors shadow-xs"
                title="Criar Novo Canvas"
              >
                <Plus size={14} className="stroke-[2.5]" />
                <span className="hidden sm:inline">Novo Canvas</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs: Separados por Vault vs Todos os Canvas */}
          <div className="flex items-center gap-2 mt-5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <button
              onClick={() => setTabMode('by-vault')}
              className={clsx(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                tabMode === 'by-vault'
                  ? "bg-white dark:bg-[#1E1E28] text-stone-900 dark:text-white shadow-xs font-bold"
                  : "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white"
              )}
            >
              <SafeIcon size={14} />
              <span>Separados por Vault</span>
            </button>

            <button
              onClick={() => setTabMode('all')}
              className={clsx(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                tabMode === 'all'
                  ? "bg-white dark:bg-[#1E1E28] text-stone-900 dark:text-white shadow-xs font-bold"
                  : "text-stone-500 hover:text-stone-900 dark:text-neutral-400 dark:hover:text-white"
              )}
            >
              <Layers size={14} />
              <span>Todos os Canvas</span>
            </button>
          </div>

          {/* Search & Secondary Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mt-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-neutral-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nome, pasta ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-neutral-500 outline-none focus:border-[#7F95FF] shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Type Filter Pills */}
            <div 
              ref={filterPillsRef}
              className="flex items-center gap-1 shrink-0 overflow-x-auto overflow-y-hidden no-scrollbar"
            >
              <button
                onClick={() => setTypeFilter('all')}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
                  typeFilter === 'all'
                    ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-stone-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('board')}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap",
                  typeFilter === 'board'
                    ? "bg-[#1831D7] text-[#F4F0E6] shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-stone-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                <FolderKanban size={11} />
                <span>Conexões</span>
              </button>
              <button
                onClick={() => setTypeFilter('audio')}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap",
                  typeFilter === 'audio'
                    ? "bg-[#52B1FF] text-[#17192A] shadow-xs"
                    : "bg-black/5 dark:bg-white/5 text-stone-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                <Music size={11} />
                <span>Áudio RPG</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            DRAWER BODY: LIST OF CANVASES
            ============================================================ */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* TAB 1: SEPARADOS POR VAULT */}
          {tabMode === 'by-vault' && (
            <div className="space-y-6">
              {canvasesByVault.map(([key, group]) => {
                const vault = group.vault;
                const isGeneral = key === '__general__';
                const isActive = key === activeVaultId;
                const isCollapsed = expandedVaults[key] === false; // default expanded

                return (
                  <div 
                    key={key}
                    className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50/50 dark:bg-white/[0.02] overflow-hidden"
                  >
                    {/* Vault Group Header */}
                    <div
                      onClick={() => toggleVaultGroup(key)}
                      className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors border-b border-black/[0.04] dark:border-white/[0.04]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-stone-400">
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </div>

                        <div className={clsx(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                          isGeneral
                            ? "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                            : vault?.storageType === 'fsa'
                              ? "bg-[#52B1FF]/15 text-[#52B1FF] dark:bg-[#52B1FF]/20"
                              : "bg-[#1831D7]/15 text-[#1831D7] dark:bg-[#7F95FF]/20 dark:text-[#7F95FF]"
                        )}>
                          {isGeneral ? <Folder size={14} /> : vault?.storageType === 'fsa' ? <HardDrive size={14} /> : <SafeIcon size={14} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-stone-900 dark:text-white">
                              {isGeneral ? 'Caixa Geral / Sem Vault Vinculado' : vault?.name}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] border border-[#7F95FF]/30">
                                Ativo
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 dark:text-neutral-500">
                            {isGeneral ? 'Canvases globais' : vault?.storageType === 'fsa' ? 'HD Local (Windows)' : 'IndexedDB'}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-stone-600 dark:text-stone-300">
                        {group.items.length} {group.items.length === 1 ? 'canvas' : 'canvas'}
                      </span>
                    </div>

                    {/* Canvases inside Vault */}
                    {!isCollapsed && (
                      <div className="p-3 space-y-2.5">
                        {group.items.length === 0 ? (
                          <div className="text-center py-6 px-4">
                            <p className="text-xs text-stone-400 dark:text-neutral-500">
                              Nenhum canvas salvo neste vault.
                            </p>
                            <button
                              onClick={onOpenCreateCanvas}
                              className="mt-2 text-xs font-semibold text-[#1831D7] dark:text-[#7F95FF] hover:underline inline-flex items-center gap-1"
                            >
                              <Plus size={12} />
                              <span>Criar primeiro canvas aqui</span>
                            </button>
                          </div>
                        ) : (
                          group.items.map(canvas => renderCanvasCard(canvas))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: TODOS OS CANVAS (LISTA PLANA) */}
          {tabMode === 'all' && (
            <div className="space-y-3">
              {filteredCanvases.length === 0 ? (
                <div className="text-center py-16">
                  <Layers size={32} className="mx-auto text-stone-300 dark:text-neutral-600 mb-2" />
                  <p className="text-stone-500 dark:text-neutral-400 text-xs">
                    Nenhum canvas encontrado com os filtros selecionados.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                      setSelectedVaultFilter('all');
                    }}
                    className="mt-2 text-xs font-semibold text-[#1831D7] dark:text-[#7F95FF] hover:underline"
                  >
                    Limpar filtros de busca
                  </button>
                </div>
              ) : (
                filteredCanvases.map(canvas => renderCanvasCard(canvas))
              )}
            </div>
          )}
        </div>

        {/* ============================================================
            DRAWER FOOTER
            ============================================================ */}
        <div className="p-4 sm:p-5 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-stone-50/70 dark:bg-white/[0.02]">
          <span className="text-xs text-stone-500 dark:text-neutral-400">
            Total: <strong>{canvases.length}</strong> projetos disponíveis
          </span>

          <button
            onClick={onOpenCreateCanvas}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1831D7] hover:bg-[#1831D7]/90 text-[#F4F0E6] font-semibold text-xs transition-all shadow-md shadow-[#1831D7]/20 cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Criar Novo Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Helper renderer for each canvas item
  function renderCanvasCard(canvas: Layer) {
    const isBoard = canvas.canvasType === 'board';
    const pageCount = projectPageCounts[canvas.id] || 1;
    const isEditingThis = editingId === canvas.id;

    // Resolve vault display
    const vaultDisplay = canvas.vaultName || (
      canvas.vaultId
        ? vaults.find(v => v.id === canvas.vaultId)?.name || 'Vault'
        : 'Caixa Geral'
    );

    return (
      <div
        key={canvas.id}
        onClick={() => handleOpenCanvas(canvas)}
        className="p-3.5 sm:p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#131524] hover:border-[#7F95FF]/50 hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 group"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              isBoard 
                ? "bg-[#1831D7]/20 text-[#1831D7] dark:bg-[#7F95FF]/20 dark:text-[#7F95FF]"
                : "bg-[#52B1FF]/20 text-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF]"
            )}>
              {isBoard ? <FolderKanban size={16} /> : <Music size={16} />}
            </div>

            <div className="flex-1 min-w-0">
              {isEditingThis ? (
                <div 
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white dark:bg-black/50 border border-[#7F95FF] rounded px-2 py-0.5 text-xs font-semibold outline-none w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditing(e);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button
                    onClick={handleSaveEditing}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Salvar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-[#F4F0E6] line-clamp-1 group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] transition-colors">
                  {canvas.name}
                </h4>
              )}

              <div className="flex items-center gap-2 text-[10px] text-stone-400 dark:text-neutral-500 mt-0.5">
                <span>{isBoard ? 'Quadro Infinito' : `${pageCount} páginas`}</span>
                <span>•</span>
                <span className="font-mono">ID: {canvas.id.slice(0, 6)}</span>
                {canvas.folderPath && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-[#1831D7] dark:text-[#7F95FF]">
                      <Folder size={10} />
                      {canvas.folderPath}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Rename / Delete / Vault Select) */}
          <div 
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Vault Switcher Select */}
            <select
              value={canvas.vaultId || '__general__'}
              onChange={(e) => handleChangeCanvasVault(canvas, e.target.value)}
              className="text-[10px] bg-stone-100 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-md px-1.5 py-1 text-stone-700 dark:text-neutral-300 outline-none"
              title="Vincular a outro Vault"
            >
              <option value="__general__">Caixa Geral</option>
              {vaults.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>

            <button
              onClick={(e) => handleStartEditing(e, canvas)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors"
              title="Renomear"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCanvas(canvas);
              }}
              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 transition-colors"
              title="Excluir"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Footer info: Vault badge and Abrir link */}
        <div className="flex items-center justify-between pt-2 border-t border-black/[0.04] dark:border-white/[0.04] text-[11px]">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-500 dark:text-[#B4D3F1]/70 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
            <Database size={9} />
            {vaultDisplay}
          </span>

          <span className="font-semibold text-[#1831D7] dark:text-[#7F95FF] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Abrir</span>
            <ArrowRight size={11} />
          </span>
        </div>
      </div>
    );
  }
};
