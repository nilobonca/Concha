import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, Reorder } from 'framer-motion';
import { Table2, Kanban, LayoutGrid, List as ListIcon, Plus, Pencil, Trash2 } from 'lucide-react';
import { DatabaseViewConfig, DatabaseViewType } from '../../types';
import { DatabaseViewsOverflowMenu } from './DatabaseViewsOverflowMenu';
import clsx from 'clsx';

export interface DatabaseViewTabsListProps {
  views: DatabaseViewConfig[];
  activeViewId: string;
  onSelectView: (viewId: string) => void;
  onAddView: (type: DatabaseViewType, name?: string) => void;
  onRenameView: (viewId: string, newName: string) => void;
  onDeleteView: (viewId: string) => void;
  onReorderViews?: (newViews: DatabaseViewConfig[]) => void;
}

export const VIEW_TYPE_META: Record<DatabaseViewType, { label: string; icon: React.ReactNode }> = {
  table: { label: 'Tabela', icon: <Table2 className="w-3.5 h-3.5" /> },
  board: { label: 'Quadro', icon: <Kanban className="w-3.5 h-3.5" /> },
  gallery: { label: 'Galeria', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  list: { label: 'Lista', icon: <ListIcon className="w-3.5 h-3.5" /> },
};

export const DatabaseViewTabsList: React.FC<DatabaseViewTabsListProps> = ({
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
  onReorderViews,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(views.length);
  const [overflowMenuPos, setOverflowMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [addViewMenuPos, setAddViewMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    viewId: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Estado local para reordenação fluida sem interromper a captura do drag no Framer Motion
  const [orderedViews, setOrderedViews] = useState<DatabaseViewConfig[]>(views);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedViews(views);
    }
  }, [views]);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menus de contexto e de adição ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddViewMenuPos(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Medição estável de overflow usando contêiner oculto dedicado
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureContainer = measureRef.current;
    if (!container || !measureContainer) return;

    const calculateOverflow = () => {
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;

      const tabNodes = Array.from(measureContainer.querySelectorAll('[data-measure-tab="true"]')) as HTMLElement[];
      if (tabNodes.length === 0) return;

      let totalTabsWidth = 0;
      const widths: number[] = [];

      tabNodes.forEach((node) => {
        const w = node.getBoundingClientRect().width || node.offsetWidth || 100;
        widths.push(w);
        totalTabsWidth += w;
      });

      // Espaço do botão "+" sem texto quando visível ao lado da última aba (~30px)
      const addBtnWidth = 30;

      // Se todas as abas + o botão de adicionar cabem sem concatenar:
      if (totalTabsWidth + addBtnWidth <= containerWidth) {
        setVisibleCount(orderedViews.length);
        return;
      }

      // Se transbordar e concatenar, o botão "+" SUME da barra e é reservado apenas o espaço do pill "N a mais..." (~95px)
      const pillWidth = 95;
      const maxAllowedWidth = containerWidth - pillWidth;

      let accumulated = 0;
      let fitCount = 0;

      for (let i = 0; i < widths.length; i++) {
        if (accumulated + widths[i] <= maxAllowedWidth) {
          accumulated += widths[i];
          fitCount++;
        } else {
          break;
        }
      }

      const count = Math.max(1, fitCount);
      setVisibleCount(count);
    };

    calculateOverflow();

    const observer = new ResizeObserver(() => {
      calculateOverflow();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [orderedViews]);

  // Garante que a aba ativa esteja sempre visível no painel principal
  const displayViews = useMemo(() => {
    if (visibleCount >= orderedViews.length) return orderedViews;
    const activeIdx = orderedViews.findIndex((v) => v.id === activeViewId);
    if (activeIdx < 0 || activeIdx < visibleCount) return orderedViews;

    const copy = [...orderedViews];
    const [activeItem] = copy.splice(activeIdx, 1);
    copy.splice(Math.max(0, visibleCount - 1), 0, activeItem);
    return copy;
  }, [orderedViews, activeViewId, visibleCount]);

  const visibleViews = displayViews.slice(0, visibleCount);
  const overflowCount = Math.max(0, orderedViews.length - visibleCount);

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

  const handleOpenOverflowMenu = (e: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(10, rect.left);
    const y = Math.max(10, rect.bottom + 6);
    setOverflowMenuPos((prev) => (prev ? null : { x, y }));
  };

  const handleReorderVisibleViews = (newVisibleOrder: DatabaseViewConfig[]) => {
    isDraggingRef.current = true;
    let nextFullOrder: DatabaseViewConfig[];
    if (visibleCount >= orderedViews.length) {
      nextFullOrder = newVisibleOrder;
    } else {
      const hiddenViews = orderedViews.filter((v) => !newVisibleOrder.some((rv) => rv.id === v.id));
      nextFullOrder = [...newVisibleOrder, ...hiddenViews];
    }
    setOrderedViews(nextFullOrder);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    if (onReorderViews) {
      onReorderViews(orderedViews);
    }
  };

  return (
    <>
      {/* Contêiner Invisível de Medição Estável */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none -z-50 flex items-center gap-0.5 whitespace-nowrap top-0 left-0"
      >
        {orderedViews.map((view) => {
          const meta = VIEW_TYPE_META[view.type] || VIEW_TYPE_META.table;
          return (
            <div
              key={view.id}
              data-measure-tab="true"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium shrink-0"
            >
              <span>{meta.icon}</span>
              <span className="truncate max-w-[140px]">{view.name}</span>
            </div>
          );
        })}
      </div>

      {/* Contêiner Visível das Abas com Reordenação Nativa do App (Reorder.Group) */}
      <div
        ref={containerRef}
        className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 relative"
      >
        <Reorder.Group
          as="div"
          axis="x"
          values={visibleViews}
          onReorder={handleReorderVisibleViews}
          className="flex items-center gap-0.5 min-w-0 cursor-pointer"
        >
          {visibleViews.map((view) => {
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
              <Reorder.Item
                as="div"
                key={view.id}
                value={view}
                transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.4 }}
                whileDrag={{
                  scale: 1.03,
                  zIndex: 50,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                }}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectView(view.id)}
                onDoubleClick={() => handleStartRename(view)}
                onContextMenu={(e) => handleContextMenu(e, view.id)}
                className={clsx(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none shrink-0",
                  isActive
                    ? 'bg-stone-200/70 dark:bg-white/10 text-[#1831D7] dark:text-[#52B1FF] font-semibold'
                    : 'text-stone-500 dark:text-[#B4D3F1]/70 hover:text-stone-800 dark:hover:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5'
                )}
                title="Clique para ativar | Botão direito para opções | Arraste para reordenar"
              >
                <span className="shrink-0 pointer-events-none">{meta.icon}</span>
                <span className="truncate max-w-[140px] pointer-events-none">{view.name}</span>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {/* 
          1. Botão "+" de adicionar visualização (ícone transparente sem texto) imediatamente ao lado da última aba.
             SUME (desaparece) quando as abas se concatenam (overflowCount > 0).
        */}
        {overflowCount === 0 && (
          <div className="relative shrink-0 ml-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setAddViewMenuPos((prev) => (prev ? null : { x: rect.left, y: rect.bottom + 6 }));
              }}
              className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:text-[#B4D3F1]/50 dark:hover:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 bg-transparent border border-transparent cursor-pointer transition-colors shrink-0 select-none"
              title="Adicionar visualização"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 
          2. Pill Concatenador "N a mais..." (Exibido apenas quando as abas concatenam / overflowCount > 0).
             Contém a opção de adicionar visualização dentro do menu concatenador.
        */}
        {overflowCount > 0 && (
          <div className="relative shrink-0 ml-0.5">
            <button
              type="button"
              data-overflow-menu-button="true"
              onClick={handleOpenOverflowMenu}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-stone-200/80 dark:bg-white/10 text-stone-700 dark:text-neutral-200 hover:bg-stone-300 dark:hover:bg-white/20 border border-stone-300/50 dark:border-white/10 transition-all cursor-pointer select-none shrink-0"
              title="Ver visualizações ocultas e adicionar nova"
            >
              <span>{overflowCount} a mais...</span>
            </button>
          </div>
        )}
      </div>

      {/* Menu Popover Concatenador de Visualizações Ocultas */}
      {overflowMenuPos && (
        <DatabaseViewsOverflowMenu
          views={orderedViews}
          activeViewId={activeViewId}
          onSelectView={onSelectView}
          onAddView={onAddView}
          onRenameView={onRenameView}
          onDeleteView={onDeleteView}
          onReorderViews={onReorderViews}
          onClose={() => setOverflowMenuPos(null)}
          position={overflowMenuPos}
        />
      )}

      {/* Menu Popover de Seleção de Tipo de Nova Visualização */}
      {addViewMenuPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={addMenuRef}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${addViewMenuPos.y}px`, left: `${addViewMenuPos.x}px` }}
          className="fixed w-44 bg-white dark:bg-[#1E2238] rounded-xl shadow-2xl border border-stone-200 dark:border-white/10 z-[9999] p-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
        >
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
                  setAddViewMenuPos(null);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left font-medium"
              >
                <span className="text-[#52B1FF]">{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}

      {/* Menu de Contexto do Botão Direito montado em Portal (document.body) */}
      {contextMenu && typeof document !== 'undefined' && createPortal(
        <div
          ref={contextMenuRef}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed w-40 bg-white dark:bg-[#1E2238] rounded-xl shadow-2xl border border-stone-200 dark:border-white/10 z-[9999] p-1 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => {
              const target = orderedViews.find((v) => v.id === contextMenu.viewId);
              if (target) handleStartRename(target);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer transition-colors text-left font-medium"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Renomear</span>
          </button>

          {orderedViews.length > 1 && (
            <button
              type="button"
              onClick={() => {
                onDeleteView(contextMenu.viewId);
                setContextMenu(null);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors text-left font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
