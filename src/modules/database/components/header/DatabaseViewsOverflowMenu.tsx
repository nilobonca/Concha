import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, Reorder } from 'framer-motion';
import { Search, MoreHorizontal, Plus, Pencil, Trash2, Table2, Kanban, LayoutGrid, List as ListIcon } from 'lucide-react';
import { DatabaseViewConfig, DatabaseViewType } from '../../types';
import clsx from 'clsx';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface DatabaseViewsOverflowMenuProps {
  views: DatabaseViewConfig[];
  activeViewId: string;
  onSelectView: (viewId: string) => void;
  onAddView: (type: DatabaseViewType, name?: string) => void;
  onRenameView: (viewId: string, newName: string) => void;
  onDeleteView: (viewId: string) => void;
  onReorderViews?: (newViews: DatabaseViewConfig[]) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const VIEW_TYPE_META: Record<DatabaseViewType, { label: string; icon: React.ReactNode }> = {
  table: { label: 'Tabela', icon: <Table2 className="w-3.5 h-3.5" /> },
  board: { label: 'Quadro', icon: <Kanban className="w-3.5 h-3.5" /> },
  gallery: { label: 'Galeria', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  list: { label: 'Lista', icon: <ListIcon className="w-3.5 h-3.5" /> },
};

export const DatabaseViewsOverflowMenu: React.FC<DatabaseViewsOverflowMenuProps> = ({
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
  onReorderViews,
  onClose,
  position,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeContextMenuViewId, setActiveContextMenuViewId] = useState<string | null>(null);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Estado local de reordenação para o menu popover
  const [orderedViews, setOrderedViews] = useState<DatabaseViewConfig[]>(views);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedViews(views);
    }
  }, [views]);

  useClickOutside({
    ref: menuRef,
    onClose,
    enabled: true,
  });

  const filteredViews = orderedViews.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartRename = (view: DatabaseViewConfig) => {
    setActiveContextMenuViewId(null);
    setEditingViewId(view.id);
    setRenameDraft(view.name);
  };

  const handleCommitRename = (viewId: string) => {
    if (renameDraft.trim()) {
      onRenameView(viewId, renameDraft.trim());
    }
    setEditingViewId(null);
  };

  const handleReorderFilteredViews = (newFilteredOrder: DatabaseViewConfig[]) => {
    isDraggingRef.current = true;
    let nextFullOrder: DatabaseViewConfig[];
    if (filteredViews.length === orderedViews.length) {
      nextFullOrder = newFilteredOrder;
    } else {
      const hiddenViews = orderedViews.filter((v) => !newFilteredOrder.some((fv) => fv.id === v.id));
      nextFullOrder = [...newFilteredOrder, ...hiddenViews];
    }
    setOrderedViews(nextFullOrder);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    if (onReorderViews) {
      onReorderViews(orderedViews);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      className="fixed w-64 bg-white dark:bg-[#1E2238] rounded-xl shadow-2xl border border-stone-200 dark:border-white/10 z-[9999] p-2 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none pointer-events-auto"
    >
      {/* 1. Search Bar at Top */}
      <div className="mb-2 relative">
        <Search className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 absolute left-2.5 top-2.5 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Procurar visualização..."
          autoFocus
          className="w-full bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 focus:border-[#52B1FF] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-stone-800 dark:text-[#F4F0E6] outline-none"
        />
      </div>

      {/* 2. List of Views using Reorder.Group and Reorder.Item */}
      <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
        {filteredViews.length === 0 ? (
          <div className="px-2.5 py-3 text-center text-xs text-stone-400 dark:text-neutral-500">
            Nenhuma visualização encontrada
          </div>
        ) : (
          <Reorder.Group
            as="div"
            axis="y"
            values={filteredViews}
            onReorder={handleReorderFilteredViews}
            className="space-y-0.5"
          >
            {filteredViews.map((view) => {
              const isActive = view.id === activeViewId;
              const meta = VIEW_TYPE_META[view.type] || VIEW_TYPE_META.table;

              if (editingViewId === view.id) {
                return (
                  <div key={view.id} className="p-1">
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
                      className="w-full text-xs font-semibold bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-[#F4F0E6] px-2 py-1 rounded border border-[#52B1FF] outline-none"
                    />
                  </div>
                );
              }

              return (
                <Reorder.Item
                  as="div"
                  key={view.id}
                  value={view}
                  transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.4 }}
                  whileDrag={{
                    scale: 1.02,
                    zIndex: 50,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                  }}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    onSelectView(view.id);
                    onClose();
                  }}
                  className={clsx(
                    "relative rounded-lg transition-colors cursor-pointer select-none",
                    isActive
                      ? 'bg-stone-200/70 dark:bg-white/10 text-[#1831D7] dark:text-[#52B1FF] font-semibold'
                      : 'text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5'
                  )}
                >
                  <div className="group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                    <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                      <span className="shrink-0">{meta.icon}</span>
                      <span className="truncate">{view.name}</span>
                    </div>

                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveContextMenuViewId(
                          activeContextMenuViewId === view.id ? null : view.id
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 dark:hover:bg-white/10 rounded transition-opacity shrink-0 cursor-pointer"
                      title="Opções da visualização"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-stone-500 dark:text-neutral-400" />
                    </button>
                  </div>

                  {/* Submenu de contexto da visualização */}
                  {activeContextMenuViewId === view.id && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="my-1 ml-6 p-1 bg-stone-100 dark:bg-white/10 rounded-lg border border-stone-200 dark:border-white/10 flex items-center justify-between text-xs animate-in fade-in duration-100"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(view);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 hover:bg-white dark:hover:bg-white/10 rounded text-stone-700 dark:text-[#F4F0E6] font-medium"
                      >
                        <Pencil className="w-3 h-3 text-[#52B1FF]" />
                        <span>Renomear</span>
                      </button>
                      {views.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteView(view.id);
                            setActiveContextMenuViewId(null);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded text-rose-600 dark:text-rose-400 font-medium"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </div>

      {/* 3. Divider */}
      <div className="my-1.5 border-t border-stone-200 dark:border-white/10" />

      {/* 4. Bottom Actions */}
      {!showAddMenu ? (
        <button
          type="button"
          onClick={() => setShowAddMenu(true)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[#52B1FF]" />
          <span>Nova visualização</span>
        </button>
      ) : (
        <div className="space-y-0.5 pt-0.5">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-stone-400 dark:text-neutral-500">
            Escolher tipo:
          </div>
          {(['table', 'board', 'gallery', 'list'] as DatabaseViewType[]).map((type) => {
            const meta = VIEW_TYPE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAddView(type, meta.label);
                  onClose();
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left font-medium"
              >
                <span className="text-[#52B1FF]">{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
};
