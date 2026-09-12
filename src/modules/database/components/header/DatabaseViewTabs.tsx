import React, { useState, useRef, useEffect } from 'react';
import {
  Table2,
  Kanban,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  ArrowDownUp,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DatabaseViewConfig, DatabaseViewType } from '../../types';

export interface DatabaseViewTabsProps {
  views: DatabaseViewConfig[];
  activeViewId: string;
  onSelectView: (viewId: string) => void;
  onAddView: (type: DatabaseViewType, name?: string) => void;
  onRenameView: (viewId: string, newName: string) => void;
  onDeleteView: (viewId: string) => void;
  isInline?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  onOpenFilterConfig?: () => void;
  activeSortCount?: number;
  onOpenSortConfig?: () => void;
  onOpenViewSettings?: () => void;
  onAddNewRow?: () => void;
}

const VIEW_TYPE_META: Record<DatabaseViewType, { label: string; icon: React.ReactNode }> = {
  table: { label: 'Tabela', icon: <Table2 className="w-3.5 h-3.5" /> },
  board: { label: 'Quadro', icon: <Kanban className="w-3.5 h-3.5" /> },
  gallery: { label: 'Galeria', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  list: { label: 'Lista', icon: <ListIcon className="w-3.5 h-3.5" /> },
};

export const DatabaseViewTabs: React.FC<DatabaseViewTabsProps> = ({
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
  isInline = false,
  searchQuery = '',
  onSearchChange,
  activeFilterCount = 0,
  onOpenFilterConfig,
  activeSortCount = 0,
  onOpenSortConfig,
  onOpenViewSettings,
  onAddNewRow,
}) => {
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    viewId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const addMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuPos(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (view: DatabaseViewConfig) => {
    setContextMenu(null);
    setEditingViewId(view.id);
    setRenameDraft(view.name);
  };

  const handleCommitRename = (viewId: string) => {
    if (renameDraft.trim()) {
      onRenameView(viewId, renameDraft.trim());
    }
    setEditingViewId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, viewId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      viewId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleToggleAddMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (addMenuPos) {
      setAddMenuPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setAddMenuPos({
        x: rect.left,
        y: rect.bottom + 4,
      });
    }
  };

  return (
    <div className="w-full flex flex-col select-none">
      {/* Linha principal com abas e botões de ação */}
      <div
        className={`flex items-center justify-between gap-1.5 ${
          isInline ? 'px-3 py-1' : 'px-6 py-1.5'
        } overflow-x-auto`}
      >
        {/* Esquerda: Abas de Visualização (espaçamento reduzido e acionamento via botão direito) */}
        <div className="flex items-center gap-0.5 shrink-0 overflow-x-auto">
          {views.map((view) => {
            const isActive = view.id === activeViewId;
            const meta = VIEW_TYPE_META[view.type] || VIEW_TYPE_META.table;

            if (editingViewId === view.id) {
              return (
                <div key={view.id} className="flex items-center px-1 py-0.5 shrink-0">
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => handleCommitRename(view.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename(view.id);
                      else if (e.key === 'Escape') setEditingViewId(null);
                    }}
                    autoFocus
                    className="text-xs font-semibold bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-[#F4F0E6] px-2 py-0.5 rounded border border-[#52B1FF] outline-none"
                  />
                </div>
              );
            }

            return (
              <div key={view.id} className="relative flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectView(view.id)}
                  onDoubleClick={() => handleStartRename(view)}
                  onContextMenu={(e) => handleContextMenu(e, view.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    isActive
                      ? 'bg-stone-200/70 dark:bg-white/10 text-[#1831D7] dark:text-[#52B1FF] font-semibold'
                      : 'text-stone-500 dark:text-[#B4D3F1]/70 hover:text-stone-800 dark:hover:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5'
                  }`}
                  title="Clique para ativar | Clique com botão direito para opções"
                >
                  <span className="shrink-0">{meta.icon}</span>
                  <span>{view.name}</span>
                </button>
              </div>
            );
          })}

          {/* Botão Adicionar Visualização */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleToggleAddMenu}
              className="flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/50 dark:hover:text-[#F4F0E6] rounded-md hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
              title="Adicionar nova visualização"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px]">Visualização</span>
            </button>
          </div>
        </div>

        {/* Direita: Botões de Ação Toolbar (Filtro, Ordenar, Pesquisa, Visualização, Novo) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* 1. Filter Button */}
          {onOpenFilterConfig && (
            <button
              type="button"
              onClick={onOpenFilterConfig}
              title="Filtro"
              className={`flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                activeFilterCount > 0
                  ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] px-2'
                  : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#1831D7] dark:bg-[#52B1FF] text-white dark:text-[#17192A] text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* 2. Sort Button */}
          {onOpenSortConfig && (
            <button
              type="button"
              onClick={onOpenSortConfig}
              title="Ordenar"
              className={`flex items-center gap-1 p-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                activeSortCount > 0
                  ? 'border-[#1831D7] bg-[#1831D7]/10 text-[#1831D7] dark:border-[#52B1FF] dark:bg-[#52B1FF]/20 dark:text-[#52B1FF] px-2'
                  : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              {activeSortCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#1831D7] dark:bg-[#52B1FF] text-white dark:text-[#17192A] text-[10px] font-bold flex items-center justify-center">
                  {activeSortCount}
                </span>
              )}
            </button>
          )}

          {/* 3. Search Bar behind a Button */}
          {onSearchChange && (
            isSearchOpen || searchQuery ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-300 dark:border-white/10 w-44 sm:w-52 shrink-0 transition-all">
                <Search className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      if (!searchQuery) setIsSearchOpen(false);
                      else onSearchChange('');
                    }
                  }}
                  autoFocus
                  placeholder="Pesquisar..."
                  className="w-full bg-transparent text-xs text-stone-800 dark:text-[#F4F0E6] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setIsSearchOpen(false);
                  }}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                  title="Fechar pesquisa"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="p-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Pesquisar"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )
          )}

          {/* 4. View Settings Button */}
          {onOpenViewSettings && (
            <button
              type="button"
              onClick={onOpenViewSettings}
              className="p-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-white/10 text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Visualização"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 5. New Row Button */}
          {onAddNewRow && (
            <button
              type="button"
              onClick={onAddNewRow}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1831D7] hover:bg-[#1831D7]/90 text-white dark:bg-[#7F95FF] dark:text-[#17192A] transition-all shadow-xs cursor-pointer shrink-0 ml-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>
          )}
        </div>
      </div>



      {/* Menu Adicionar Visualização (Posicionamento Fixo desvinculado de containers com overflow) */}
      {addMenuPos && (
        <div
          ref={addMenuRef}
          style={{ top: `${addMenuPos.y}px`, left: `${addMenuPos.x}px` }}
          className="fixed w-44 bg-white dark:bg-[#1E2238] rounded-xl shadow-2xl border border-stone-200 dark:border-white/10 z-[9999] p-1 backdrop-blur-md"
        >
          {(['table', 'board', 'gallery', 'list'] as DatabaseViewType[]).map((type) => {
            const meta = VIEW_TYPE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAddView(type, meta.label);
                  setAddMenuPos(null);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left font-medium"
              >
                <span className="text-[#52B1FF]">{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Menu de Contexto do Botão Direito (Posicionamento Fixo desvinculado de containers com overflow) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed w-40 bg-white dark:bg-[#1E2238] rounded-xl shadow-2xl border border-stone-200 dark:border-white/10 z-[9999] p-1 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => {
              const target = views.find((v) => v.id === contextMenu.viewId);
              if (target) handleStartRename(target);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Renomear</span>
          </button>

          {views.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onDeleteView(contextMenu.viewId);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
