import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useVaultStore } from '../hooks/useVaultStore';
import { navigateToProject } from '@/utils/navigationHelper';
import { Search, FileText, Plus, CornerDownLeft, Music, Image as ImageIcon, FolderKanban } from 'lucide-react';

export type CommandPaletteItem = 
  | { kind: 'note'; path: string; name: string; folder?: string; fileType?: string }
  | { kind: 'canvas'; id: string; name: string; canvasType: 'board' | 'audio'; folderPath?: string | null };

export const VaultCommandPalette: React.FC = () => {
  const router = useRouter();
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    searchNotesFuzzy, 
    openDocument, 
    openCanvasTab,
    canvases,
    createFile,
    getAllFiles
  } = useVaultStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<CommandPaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    // Canvases
    const canvasItems: CommandPaletteItem[] = (canvases || [])
      .filter(c => {
        if (!q) return true;
        const nameMatch = c.name.toLowerCase().includes(q);
        const folderMatch = c.folderPath?.toLowerCase().includes(q);
        const typeMatch = (c.canvasType === 'board' ? 'quadro conexoes canvas board' : 'audio musica canvas').includes(q);
        return nameMatch || folderMatch || typeMatch;
      })
      .map(c => ({
        kind: 'canvas' as const,
        id: c.id,
        name: c.name,
        canvasType: c.canvasType === 'audio' ? ('audio' as const) : ('board' as const),
        folderPath: c.folderPath,
      }));

    // Notes
    const noteItems: CommandPaletteItem[] = (
      q ? searchNotesFuzzy(q) : getAllFiles()
    ).map(f => ({
      kind: 'note' as const,
      path: f.path,
      name: f.name,
      folder: f.folder,
      fileType: f.fileType,
    }));

    if (q) {
      return [...canvasItems.slice(0, 4), ...noteItems.slice(0, 8)].slice(0, 10);
    }
    return [...canvasItems.slice(0, 3), ...noteItems.slice(0, 6)];
  }, [query, canvases, searchNotesFuzzy, getAllFiles]);

  const exactMatch = results.some(
    r => r.name.toLowerCase() === query.trim().toLowerCase()
  );

  // Global shortcut handler for Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  const handleSelect = async (item?: CommandPaletteItem) => {
    if (item) {
      if (item.kind === 'canvas') {
        if (item.canvasType === 'board') {
          openCanvasTab(item.id, item.name);
        } else {
          navigateToProject(router, item.id, item.name);
        }
      } else {
        await openDocument(item.path);
      }
      setCommandPaletteOpen(false);
    } else if (query.trim()) {
      // Create new note
      const newPath = await createFile('', query.trim());
      await openDocument(newPath);
      setCommandPaletteOpen(false);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    const totalItems = results.length + (query.trim() && !exactMatch ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else {
        handleSelect(); // Create new
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 sm:pt-28 px-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#14141B] border border-stone-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-stone-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-black/20">
          <Search className="w-5 h-5 text-[#1831D7] dark:text-[#7F95FF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar nota ou digitar nome para criar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            className="w-full bg-transparent text-sm text-stone-900 dark:text-neutral-100 placeholder-stone-500 dark:placeholder-neutral-500 outline-none"
          />
          <kbd className="px-2.5 py-0.5 text-[11px] font-semibold text-stone-600 dark:text-neutral-400 bg-stone-200/80 dark:bg-white/10 border border-stone-300 dark:border-white/10 rounded-full font-mono tracking-wider">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
          {results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const itemKey = item.kind === 'canvas' ? `canvas-${item.id}` : `note-${item.path}`;
            return (
              <div
                key={itemKey}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3.5 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
                  isSelected
                    ? 'bg-[#1831D7] text-white font-medium shadow-sm'
                    : 'text-stone-800 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-white/5 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.kind === 'canvas' ? (
                    item.canvasType === 'board' ? (
                      <FolderKanban className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#1831D7] dark:text-[#7F95FF]'}`} />
                    ) : (
                      <Music className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-cyan-600 dark:text-cyan-400'}`} />
                    )
                  ) : item.fileType === 'audio' ? (
                    <Music className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
                  ) : item.fileType === 'image' ? (
                    <ImageIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  ) : (
                    <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#1831D7] dark:text-[#7F95FF]'}`} />
                  )}
                  <span className="truncate">{item.name}</span>
                  {item.kind === 'note' && item.folder && (
                    <span className={`text-xs truncate ${isSelected ? 'text-[#B4D3F1]' : 'text-stone-600 dark:text-neutral-400'}`}>
                      em {item.folder}
                    </span>
                  )}
                  {item.kind === 'canvas' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : item.canvasType === 'board'
                          ? 'bg-[#1831D7]/10 dark:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF]'
                          : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                    }`}>
                      {item.canvasType === 'board' ? 'Quadro de Conexões' : 'Canvas de Áudio'}
                    </span>
                  )}
                </div>
                <CornerDownLeft className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-stone-500 dark:text-neutral-500'}`} />
              </div>
            );
          })}

          {/* Option to create new note if query provided and not exact match */}
          {query.trim() && !exactMatch && (
            <div
              onClick={() => handleSelect()}
              onMouseEnter={() => setSelectedIndex(results.length)}
              className={`flex items-center justify-between px-3.5 py-2 rounded-xl cursor-pointer transition-colors text-sm border border-dashed ${
                selectedIndex === results.length
                  ? 'bg-[#1831D7] text-white border-[#7F95FF] font-medium'
                  : 'text-[#1831D7] dark:text-[#7F95FF] border-[#7F95FF]/40 bg-[#1831D7]/10 hover:bg-[#1831D7]/20 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Plus className="w-4 h-4 shrink-0" />
                <span>Criar nova nota: <strong className="underline">&quot;{query.trim()}&quot;</strong></span>
              </div>
              <CornerDownLeft className="w-4 h-4 shrink-0" />
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="py-8 text-center text-xs text-stone-400 dark:text-neutral-500">
              Nenhuma nota encontrada. Digite um nome para criar!
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2.5 border-t border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-black/20 flex items-center justify-between text-[11px] text-stone-500 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <span>↑↓ para navegar</span>
            <span>↵ para abrir</span>
          </div>
          <span className="font-mono text-[10px]">Ctrl+P</span>
        </div>
      </div>
    </div>
  );
};
