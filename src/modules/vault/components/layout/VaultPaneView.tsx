import React, { useCallback, useRef, useState } from 'react';
import { VaultPaneLeaf, DropZoneType, VaultTab } from '../../interfaces/layout';
import { useVaultStore } from '../../hooks/useVaultStore';
import { VaultPaneTabBar } from './VaultPaneTabBar';
import { VaultPaneBreadcrumbs } from './VaultPaneBreadcrumbs';
import { VaultDropOverlay } from './VaultDropOverlay';
import { VaultEditor } from '../VaultEditor';
import { VaultMediaPreview } from '../VaultMediaPreview';
import { BoardView } from '@/modules/board/components/BoardView';
import { FileText, Search, Plus } from 'lucide-react';

interface VaultPaneViewProps {
  pane: VaultPaneLeaf;
  totalPanesCount: number;
}

export const VaultPaneView: React.FC<VaultPaneViewProps> = ({
  pane,
  totalPanesCount
}) => {
  const {
    activePaneId,
    setActivePane,
    splitPane,
    closeTabInPane,
    createFile,
    setCommandPaletteOpen,
    draggedTab,
    dropPreview,
    setDropPreview,
    setDraggedTab,
    moveTabToPane,
  } = useVaultStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isActivePane = pane.id === activePaneId;
  const activeTab = pane.tabs.find(t => t.path === pane.activePath);
  const isCanvas = activeTab?.type === 'canvas' || activeTab?.path.startsWith('canvas:');
  const currentCanvasId = activeTab?.canvasId || (activeTab?.path.startsWith('canvas:') ? activeTab.path.replace('canvas:', '') : null);

  const showDropOverlay = dropPreview && dropPreview.targetPaneId === pane.id && draggedTab;

  const detectDropZone = useCallback((e: React.DragEvent): DropZoneType | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (w <= 0 || h <= 0) return null;

    // Se o cursor estiver na barra de abas / topo (área superior de ~38px)
    if (y < 38) {
      return 'tab-bar';
    }

    const xRatio = x / w;
    const yRatio = y / h;

    // Distâncias relativas às bordas
    const distTop = yRatio;
    const distBottom = 1 - yRatio;
    const distLeft = xRatio;
    const distRight = 1 - xRatio;

    // Se estiver perto das bordas laterais (<= 60px ou 22% da largura): split horizontal (colunas - Imagem 2)
    if (x <= 60 || distLeft < 0.22) {
      return 'split-left';
    }
    if (x >= w - 60 || distRight < 0.22) {
      return 'split-right';
    }

    // Se estiver na metade superior (espaço acima / top 45% - Imagem 3)
    if (distTop < 0.45) {
      return 'split-top';
    }

    // Se estiver na metade inferior
    if (distBottom < 0.45) {
      return 'split-bottom';
    }

    // Caso central: atribui à borda mais próxima
    const minDist = Math.min(distTop, distBottom, distLeft, distRight);
    if (minDist === distTop) return 'split-top';
    if (minDist === distBottom) return 'split-bottom';
    if (minDist === distLeft) return 'split-left';
    if (minDist === distRight) return 'split-right';

    return 'tab-bar';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!draggedTab) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const zone = detectDropZone(e);
    if (zone) {
      // Se for a mesma aba no mesmo painel e na barra de abas, não mostra overlay
      if (draggedTab.sourcePaneId === pane.id && zone === 'tab-bar' && pane.tabs.length <= 1) {
        setDropPreview(null);
        return;
      }
      setDropPreview({ zone, targetPaneId: pane.id });
    }
  }, [draggedTab, pane.id, pane.tabs.length, detectDropZone, setDropPreview]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    // Apenas limpa o preview se o cursor realmente saiu dos limites do painel
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setDropPreview(null);
    }
  }, [setDropPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTab || !dropPreview) {
      setDraggedTab(null);
      setDropPreview(null);
      return;
    }

    const { zone } = dropPreview;
    const tab = draggedTab.tab;
    const sourcePaneId = draggedTab.sourcePaneId;

    switch (zone) {
      case 'tab-bar':
        moveTabToPane(sourcePaneId, pane.id, tab.path);
        break;
      case 'split-top':
        splitPane(pane.id, tab, 'vertical', 'before', sourcePaneId);
        break;
      case 'split-bottom':
        splitPane(pane.id, tab, 'vertical', 'after', sourcePaneId);
        break;
      case 'split-left':
        splitPane(pane.id, tab, 'horizontal', 'before', sourcePaneId);
        break;
      case 'split-right':
        splitPane(pane.id, tab, 'horizontal', 'after', sourcePaneId);
        break;
      default:
        moveTabToPane(sourcePaneId, pane.id, tab.path);
    }

    setDraggedTab(null);
    setDropPreview(null);
  }, [draggedTab, dropPreview, pane.id, splitPane, moveTabToPane, setDraggedTab, setDropPreview]);

  const handleClosePane = () => {
    // Close all tabs in pane
    for (const tab of pane.tabs) {
      closeTabInPane(pane.id, tab.path);
    }
  };

  const handlePaneFocus = () => {
    if (!isActivePane) {
      setActivePane(pane.id);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handlePaneFocus}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full w-full min-w-0 min-h-0 relative bg-white dark:bg-[#0E0E12] overflow-hidden ${
        isActivePane ? 'ring-1 ring-[#1831D7]/30 dark:ring-[#7F95FF]/30' : ''
      }`}
    >
      {/* Tab Bar */}
      <VaultPaneTabBar
        pane={pane}
        isActivePane={isActivePane}
        totalPanesCount={totalPanesCount}
        onClosePane={handleClosePane}
      />

      {/* Breadcrumbs */}
      {activeTab && activeTab.type !== 'empty' && !activeTab.path.startsWith('new-tab:') && (
        <VaultPaneBreadcrumbs
          paneId={pane.id}
          activeTab={activeTab}
        />
      )}

      {/* Content Area */}
      <div className={`flex-1 overflow-hidden relative min-h-0 ${draggedTab ? 'pointer-events-none' : ''}`}>
        {!activeTab || activeTab.type === 'empty' || activeTab.path.startsWith('new-tab:') ? (
          /* Empty pane or new tab placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500 dark:text-neutral-400 p-8 select-none bg-[#FAF9F6]/80 dark:bg-black/20 h-full">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 border border-stone-200/90 dark:border-white/10 flex items-center justify-center mb-3 text-stone-400 dark:text-neutral-400 shadow-xs">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 dark:text-neutral-300 mb-1">
              {activeTab ? 'Nova Aba' : 'Nenhum documento'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-neutral-400 max-w-xs text-center mb-4">
              Selecione uma nota no menu lateral ou crie uma nova nota.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await createFile('', '');
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1831D7] hover:bg-[#1831D7]/90 text-xs font-medium text-white shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Nota</span>
              </button>
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-medium text-stone-700 dark:text-neutral-200 border border-stone-200/90 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF]" />
                <span>Buscar (Ctrl+P)</span>
              </button>
            </div>
          </div>
        ) : isCanvas && currentCanvasId ? (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <BoardView
              boardId={currentCanvasId}
              isEmbeddedInVault={true}
              onCloseEmbedded={() => closeTabInPane(pane.id, activeTab.path)}
            />
          </div>
        ) : (activeTab.type === 'audio' || activeTab.type === 'image') ? (
          <VaultMediaPreview
            path={activeTab.path}
            type={activeTab.type}
          />
        ) : (
          <VaultEditor paneId={pane.id} documentPath={activeTab.path} />
        )}
      </div>

      {/* Drop Preview Overlay */}
      {showDropOverlay && (
        <VaultDropOverlay zone={dropPreview.zone} />
      )}
    </div>
  );
};
