import React, { useRef, useEffect } from 'react';
import { useVaultStore } from '../hooks/useVaultStore';
import { FileText, FolderKanban, Music, Image as ImageIcon, X } from 'lucide-react';
import { useSmoothHorizontalScroll } from '@/hooks/useSmoothHorizontalScroll';

export const VaultTabs: React.FC = () => {
  const { tabs, activePath, setActiveTab, closeTab } = useVaultStore();
  const containerRef = useSmoothHorizontalScroll<HTMLDivElement>({ speed: 1.15, easing: 0.16 });
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  // Rolagem automática suave para manter a aba ativa sempre visível
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activePath]);

  if (tabs.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="flex items-center bg-white/90 dark:bg-[#0D0D12]/80 border-b border-stone-200 dark:border-white/10 overflow-x-auto overflow-y-hidden select-none no-scrollbar"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        const isCanvas = tab.type === 'canvas' || tab.path.startsWith('canvas:');
        const isAudio = tab.type === 'audio';
        const isImage = tab.type === 'image';

        return (
          <div
            key={tab.path}
            ref={isActive ? activeTabRef : undefined}
            onClick={() => setActiveTab(tab.path)}
            className={`group flex items-center gap-2 px-3.5 py-2 text-xs border-r border-stone-200/60 dark:border-white/5 cursor-pointer transition-colors max-w-[220px] shrink-0 ${
              isActive
                ? isCanvas 
                  ? 'bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] border-t-2 border-t-[#1831D7] font-medium'
                  : isAudio
                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-900 dark:text-sky-200 border-t-2 border-t-sky-500 font-medium'
                    : isImage
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-t-2 border-t-emerald-500 font-medium'
                      : 'bg-stone-50 dark:bg-white/5 text-stone-900 dark:text-neutral-100 border-t-2 border-t-[#1831D7] font-medium'
                : 'text-stone-600 dark:text-neutral-400 hover:text-stone-950 dark:hover:text-neutral-200 hover:bg-stone-50 dark:hover:bg-white/5 font-medium'
            }`}
          >
            {isCanvas ? (
              <FolderKanban className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1831D7] dark:text-[#7F95FF]' : 'text-stone-500 dark:text-neutral-500'}`} />
            ) : isAudio ? (
              <Music className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-stone-500 dark:text-neutral-500'}`} />
            ) : isImage ? (
              <ImageIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-neutral-500'}`} />
            ) : (
              <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1831D7] dark:text-[#7F95FF]' : 'text-stone-500 dark:text-neutral-500'}`} />
            )}
            <span className="truncate">{tab.title}</span>
            {tab.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#1831D7] dark:bg-[#7F95FF] shrink-0" title="Alterações não salvas" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.path);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-stone-100 dark:hover:bg-white/10 p-0.5 rounded transition-opacity ml-1"
              title="Fechar aba"
            >
              <X className="w-3 h-3 text-stone-500 dark:text-neutral-400 hover:text-stone-800 dark:hover:text-neutral-200" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
