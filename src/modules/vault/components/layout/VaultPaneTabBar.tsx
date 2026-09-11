import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  FolderKanban, 
  Music, 
  Image as ImageIcon, 
  X, 
  Plus, 
  XSquare,
  PanelRight
} from 'lucide-react';
import { VaultPaneLeaf, VaultTab } from '../../interfaces/layout';
import { useVaultStore } from '../../hooks/useVaultStore';
import { isElectron } from '@/utils/electronHelper';
import { useSmoothHorizontalScroll } from '@/hooks/useSmoothHorizontalScroll';

interface VaultPaneTabBarProps {
  pane: VaultPaneLeaf;
  isActivePane: boolean;
  totalPanesCount: number;
  onClosePane: () => void;
}

export const VaultPaneTabBar: React.FC<VaultPaneTabBarProps> = ({
  pane,
  isActivePane,
  totalPanesCount,
  onClosePane
}) => {
  const [isElec, setIsElec] = useState(false);

  useEffect(() => {
    setIsElec(isElectron());
  }, []);

  const { 
    setActiveTabInPane, 
    closeTabInPane, 
    createFile, 
    openNewTab,
    setDraggedTab, 
    setDropPreview,
    moveTabToPane,
    draggedTab,
    backlinksPanelOpen,
    setBacklinksPanelOpen
  } = useVaultStore();

  const handleTabDragStart = (e: React.DragEvent, tab: VaultTab) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', tab.path);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTab({
      sourcePaneId: pane.id,
      tab
    });
  };

  const handleTabDragEnd = () => {
    setDraggedTab(null);
    setDropPreview(null);
  };

  const handleTabBarDragOver = (e: React.DragEvent) => {
    if (!draggedTab) return;
    if (draggedTab.sourcePaneId === pane.id && pane.tabs.length <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropPreview({
      zone: 'tab-bar',
      targetPaneId: pane.id
    });
  };

  const handleTabBarDrop = (e: React.DragEvent) => {
    if (!draggedTab) return;
    e.preventDefault();
    e.stopPropagation();
    moveTabToPane(draggedTab.sourcePaneId, pane.id, draggedTab.tab.path);
    setDraggedTab(null);
    setDropPreview(null);
  };

  // Rolagem horizontal fluida baseada em física com inércia por RAF
  const tabStripRef = useSmoothHorizontalScroll<HTMLDivElement>({ speed: 1.15, easing: 0.16 });
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  // Rolagem automática suave para manter a aba ativa sempre visível
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [pane.activePath]);

  const handleCreateNewTab = () => {
    openNewTab(pane.id);
  };

  const getTabIcon = (tab: VaultTab, isActive: boolean) => {
    if (tab.type === 'empty' || tab.path.startsWith('new-tab:')) {
      return <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1831D7] dark:text-[#7F95FF]' : 'text-stone-400 dark:text-neutral-500'}`} />;
    }
    const isCanvas = tab.type === 'canvas' || tab.path.startsWith('canvas:');
    if (isCanvas) {
      return <FolderKanban className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1831D7] dark:text-[#7F95FF]' : 'text-stone-400 dark:text-neutral-500'}`} />;
    }
    if (tab.type === 'audio') {
      return <Music className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#52B1FF] dark:text-[#52B1FF]' : 'text-stone-400 dark:text-neutral-500'}`} />;
    }
    if (tab.type === 'image') {
      return <ImageIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-neutral-500'}`} />;
    }
    return <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1831D7] dark:text-[#7F95FF]' : 'text-stone-400 dark:text-neutral-500'}`} />;
  };

  return (
    <div
      onDragOver={handleTabBarDragOver}
      onDrop={handleTabBarDrop}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={`h-9 flex items-center justify-between border-b bg-stone-100/80 dark:bg-[#121218]/90 select-none overflow-hidden px-1 transition-colors app-region-drag ${
        isActivePane 
          ? 'border-stone-200 dark:border-white/10' 
          : 'border-stone-200/60 dark:border-white/5 opacity-90'
      }`}
    >
      {/* Tab Strip: Rolagem fluida com física e sem barra de scroll visível */}
      <div 
        ref={tabStripRef}
        className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden no-scrollbar flex-1 min-w-0 app-region-drag h-full"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {pane.tabs.map((tab) => {
          const isActive = tab.path === pane.activePath;
          const isCanvas = tab.type === 'canvas' || tab.path.startsWith('canvas:');
          const isNewTab = tab.type === 'empty' || tab.path.startsWith('new-tab:');

          return (
            <div
              key={tab.path}
              ref={isActive ? activeTabRef : undefined}
              draggable
              onDragStart={(e) => handleTabDragStart(e, tab)}
              onDragEnd={handleTabDragEnd}
              onClick={() => setActiveTabInPane(pane.id, tab.path)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md cursor-pointer transition-all border-r border-stone-200/60 dark:border-white/5 max-w-[200px] shrink-0 app-region-no-drag ${
                isActive
                  ? isCanvas
                    ? 'bg-white dark:bg-[#16161F] text-stone-900 dark:text-[#B4D3F1] border-t-2 border-t-[#1831D7] dark:border-t-[#7F95FF] font-medium shadow-xs'
                    : 'bg-white dark:bg-[#16161F] text-stone-900 dark:text-neutral-100 border-t-2 border-t-[#1831D7] dark:border-t-[#7F95FF] font-medium shadow-xs'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-800 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
            >
              {getTabIcon(tab, isActive)}
              <span className="truncate">{tab.title || (isNewTab ? 'Nova aba' : 'Sem título')}</span>

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#7F95FF] shrink-0" title="Alterações não salvas" />
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTabInPane(pane.id, tab.path);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                className="opacity-0 group-hover:opacity-100 hover:bg-stone-200 dark:hover:bg-white/10 hover:text-stone-900 dark:hover:text-neutral-100 p-0.5 rounded transition-opacity ml-1 cursor-pointer app-region-no-drag"
                title="Fechar aba"
              >
                <X className="w-3 h-3 text-stone-400 dark:text-neutral-400" />
              </button>
            </div>
          );
        })}

        {/* Add Tab Button */}
        <button
          type="button"
          onClick={handleCreateNewTab}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-neutral-500 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-white/10 rounded-md transition-colors ml-1 cursor-pointer app-region-no-drag shrink-0"
          title="Nova aba (Ctrl+T)"
          aria-label="Abrir nova aba"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Window & Pane Controls */}
      <div 
        className="flex items-center gap-1 text-stone-400 dark:text-neutral-400 shrink-0 px-1.5 app-region-no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Note Details (Properties & Backlinks) Sidebar Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setBacklinksPanelOpen(!backlinksPanelOpen);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className={`p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center app-region-no-drag ${
            backlinksPanelOpen
              ? 'bg-[#1831D7]/15 dark:bg-[#7F95FF]/20 text-[#1831D7] dark:text-[#7F95FF]'
              : 'text-stone-400 dark:text-neutral-400 hover:text-stone-700 dark:hover:text-neutral-200 hover:bg-stone-200/60 dark:hover:bg-white/10'
          }`}
          title="Propriedades e Backlinks da Nota"
          aria-label="Abrir painel lateral de propriedades e backlinks"
        >
          <PanelRight className="w-3.5 h-3.5" />
        </button>

        {totalPanesCount > 1 && (
          <button
            type="button"
            onClick={onClosePane}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="p-1 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors cursor-pointer app-region-no-drag"
            title="Fechar esta janela dividida"
          >
            <XSquare className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Espaço reservado para os botões de janela do Windows (.exe Electron) com NO-DRAG estrito */}
      {isElec && (
        <div 
          className="w-28 h-full shrink-0 app-region-no-drag pointer-events-none"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        />
      )}
    </div>
  );
};
