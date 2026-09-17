import React from 'react';
import { useVaultStore } from '../hooks/useVaultStore';
import { useBacklinks } from '../hooks/useBacklinks';
import { VaultFrontmatterEditor } from './VaultFrontmatterEditor';
import { 
  SlidersHorizontal, Link2, X, FileText, ArrowRight, RefreshCw, 
  Tag, Info, PanelRight, Layout
} from 'lucide-react';

export const VaultDetailsSidebar: React.FC = () => {
  const { 
    backlinksPanelOpen, 
    setBacklinksPanelOpen, 
    detailsSidebarTab,
    setDetailsSidebarTab,
    activePath, 
    openDocument,
    documentCache,
    updateDocumentFrontmatter,
  } = useVaultStore();

  const { backlinks, isScanning } = useBacklinks();

  if (!backlinksPanelOpen) return null;

  const currentDocTitle = activePath?.split('/').pop()?.replace(/\.(md|txt|canvas|database|db\.json)$/i, '') || '';
  const cachedDoc = activePath ? documentCache[activePath] : null;
  const frontmatter = cachedDoc?.frontmatter || {};

  // Count active properties
  const customKeys = Object.keys(frontmatter).filter(k => k !== 'tags' && k !== 'aliases');
  const tagsCount = Array.isArray(frontmatter.tags) ? frontmatter.tags.length : (frontmatter.tags ? 1 : 0);
  const aliasesCount = Array.isArray(frontmatter.aliases) ? frontmatter.aliases.length : (frontmatter.aliases ? 1 : 0);
  const totalPropsCount = (tagsCount > 0 ? 1 : 0) + (aliasesCount > 0 ? 1 : 0) + customKeys.length;

  return (
    <aside className="relative w-80 h-full bg-[#FAF9F6] dark:bg-[#111115] border-l border-stone-200/90 dark:border-white/10 flex flex-col select-none shrink-0 z-20 text-stone-900 dark:text-neutral-100 animate-in slide-in-from-right-4 duration-150">
      {/* PanelRight Toggle Button (No lado de fora, colado ao menu de propriedades) */}
      <button
        type="button"
        onClick={() => setBacklinksPanelOpen(false)}
        className="absolute -left-9 top-2 z-30 p-1.5 rounded-md transition-colors cursor-pointer bg-white dark:bg-[#16161F] text-[#1831D7] dark:text-[#7F95FF] border border-stone-200 dark:border-white/10 shadow-xs flex items-center justify-center hover:bg-stone-50 dark:hover:bg-white/10 app-region-no-drag"
        title="Fechar painel de propriedades"
        aria-label="Fechar painel de propriedades"
      >
        <PanelRight className="w-3.5 h-3.5" />
      </button>

      {/* Top Header & Tab Navigation */}
      <div className="p-2 border-b border-stone-200/90 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-white/[0.02]">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-stone-100/80 dark:bg-white/5 p-0.5 rounded-lg border border-stone-200/80 dark:border-white/5 text-xs">
            <button
              onClick={() => setDetailsSidebarTab('properties')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                detailsSidebarTab === 'properties'
                  ? 'bg-white dark:bg-white/15 text-[#1831D7] dark:text-[#7F95FF] shadow-xs'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Propriedades</span>
              {totalPropsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] font-mono">
                  {totalPropsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDetailsSidebarTab('backlinks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                detailsSidebarTab === 'backlinks'
                  ? 'bg-white dark:bg-white/15 text-[#1831D7] dark:text-[#7F95FF] shadow-xs'
                  : 'text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Backlinks</span>
              {backlinks.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1831D7]/10 text-[#1831D7] dark:text-[#7F95FF] font-mono">
                  {backlinks.length}
                </span>
              )}
            </button>
          </div>

        {/* Close Button */}
        <div className="flex items-center gap-1">
          {detailsSidebarTab === 'backlinks' && isScanning && (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-stone-400 dark:text-neutral-400 mr-1" />
          )}
          <button
            onClick={() => setBacklinksPanelOpen(false)}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Fechar painel lateral"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target doc indicator */}
      <div className="px-3.5 py-2 border-b border-stone-200/80 dark:border-white/5 bg-stone-100/50 dark:bg-white/[0.02] text-xs text-stone-500 dark:text-neutral-400 flex items-center justify-between truncate">
        <span className="truncate">
          Arquivo: <span className="text-[#1831D7] dark:text-[#7F95FF] font-medium">"{currentDocTitle || 'Nenhum ativo'}"</span>
        </span>
      </div>

      {/* Tab 1: Properties (Frontmatter) */}
      {detailsSidebarTab === 'properties' && (
        <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
          {activePath ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-neutral-300">
                  <Tag className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF]" />
                  <span>Metadados da Nota</span>
                </div>
                <span className="text-[10px] text-stone-400 dark:text-neutral-500 font-mono">YAML Frontmatter</span>
              </div>

              <VaultFrontmatterEditor
                data={frontmatter}
                onChange={(newFm) => {
                  updateDocumentFrontmatter(activePath, newFm);
                }}
              />
            </div>
          ) : (
            <div className="py-16 text-center text-stone-400 dark:text-neutral-500 text-xs flex flex-col items-center gap-2">
              <Info className="w-6 h-6 text-stone-300 dark:text-neutral-600" />
              <span>Nenhuma nota aberta no momento.</span>
              <span className="text-[11px] text-stone-400 dark:text-neutral-500">
                Selecione uma nota no explorador para editar suas propriedades.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Backlinks */}
      {detailsSidebarTab === 'backlinks' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {backlinks.length === 0 ? (
            <div className="py-16 text-center text-stone-400 dark:text-neutral-500 text-xs flex flex-col items-center gap-2">
              <Link2 className="w-6 h-6 text-stone-300 dark:text-neutral-600" />
              <span>Nenhum outro arquivo ou quadro referencia este documento ainda.</span>
              <span className="text-[11px] text-stone-400 dark:text-neutral-500 max-w-[220px] leading-relaxed">
                Insira este arquivo em um Quadro de Conexão ou digite <code className="bg-stone-100 dark:bg-white/10 px-1 py-0.5 rounded border border-stone-200 dark:border-white/10 text-[#1831D7] dark:text-[#7F95FF] font-mono">[[{currentDocTitle}]]</code> em outra nota para conectá-los!
              </span>
            </div>
          ) : (
            backlinks.map((link, idx) => {
              const isCanvasLink = Boolean(link.isCanvas || link.sourcePath.endsWith('.canvas'));
              return (
                <div
                  key={`${link.sourcePath}-${idx}`}
                  onClick={() => openDocument(link.sourcePath)}
                  className="p-2.5 rounded-lg bg-white dark:bg-white/5 border border-stone-200/90 dark:border-white/10 hover:border-[#7F95FF]/60 dark:hover:border-[#7F95FF]/40 hover:bg-stone-50 dark:hover:bg-white/[0.08] shadow-xs cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      {isCanvasLink ? (
                        <Layout className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
                      )}
                      <span className="text-xs font-medium text-stone-800 dark:text-neutral-200 group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] truncate">
                        {link.sourceTitle}
                      </span>
                      {isCanvasLink && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1831D7]/10 dark:bg-[#7F95FF]/20 text-[#1831D7] dark:text-[#7F95FF] font-medium shrink-0">
                          Canva
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {link.snippet && (
                    <p className="text-[11px] text-stone-600 dark:text-neutral-400 line-clamp-3 leading-relaxed bg-stone-50 dark:bg-black/30 p-1.5 rounded border border-stone-200/70 dark:border-white/5">
                      {link.snippet}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
};
