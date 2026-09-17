import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Folder, Box, Check, Search, FolderTree, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface BoardFolderPickerDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder: string | null;
  allFolders: string[];
  onSelectFolder: (folderPath: string | null) => void;
}

export const BoardFolderPickerDropdown: React.FC<BoardFolderPickerDropdownProps> = ({
  isOpen,
  onClose,
  currentFolder,
  allFolders,
  onSelectFolder,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useClickOutside({
    ref: dropdownRef,
    onClose,
    enabled: isOpen,
  });

  // Focus search input on open if search is visible
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      if (allFolders.length > 5) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, allFolders.length]);

  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return allFolders;
    const query = searchQuery.toLowerCase().trim();
    return allFolders.filter((f) => f.toLowerCase().includes(query));
  }, [allFolders, searchQuery]);

  if (!isOpen) return null;

  const isGeneral = currentFolder === null;
  const isVaultRoot = currentFolder === '';

  return (
    <div
      ref={dropdownRef}
      className={clsx(
        "absolute top-full left-0 mt-2 w-72 z-50",
        "bg-white/95 dark:bg-[#14141C]/95 backdrop-blur-2xl",
        "border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl",
        "p-2 flex flex-col gap-1 text-stone-900 dark:text-white select-none",
        "animate-in fade-in zoom-in-95 duration-150 app-region-no-drag"
      )}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-tight text-stone-700 dark:text-neutral-300">
          Localização do Canvas
        </span>
        <span className="text-[10px] text-stone-400 dark:text-neutral-500 uppercase font-mono">
          Mover para
        </span>
      </div>

      {/* Search Input (se houver mais de 5 pastas) */}
      {allFolders.length > 5 && (
        <div className="relative px-1 pt-1 pb-1">
          <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-stone-400 dark:text-neutral-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pasta..."
            className="w-full bg-stone-100 dark:bg-black/30 border border-black/5 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#1831D7] dark:focus:border-[#7F95FF] transition-colors"
          />
        </div>
      )}

      {/* Lista de Opções */}
      <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5 py-1 pr-0.5 custom-scrollbar">
        {/* Opção 1: Baú de Canvas (Geral) */}
        <button
          onClick={() => {
            onSelectFolder(null);
            onClose();
          }}
          className={clsx(
            "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left group",
            isGeneral
              ? "bg-[#1831D7]/10 dark:bg-[#7F95FF]/15 text-[#1831D7] dark:text-[#7F95FF] font-semibold"
              : "hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={clsx(
              "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
              isGeneral
                ? "bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF]"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/25"
            )}>
              <Box className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="block truncate">Baú de Canvas</span>
              <span className="text-[10px] text-stone-400 dark:text-neutral-500 block -mt-0.5">Geral (não associado a pasta)</span>
            </div>
          </div>
          {isGeneral && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-[#1831D7] dark:text-[#7F95FF]" />}
        </button>

        {/* Opção 2: Raiz do Vault */}
        <button
          onClick={() => {
            onSelectFolder('');
            onClose();
          }}
          className={clsx(
            "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left group",
            isVaultRoot
              ? "bg-[#1831D7]/10 dark:bg-[#7F95FF]/15 text-[#1831D7] dark:text-[#7F95FF] font-semibold"
              : "hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={clsx(
              "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
              isVaultRoot
                ? "bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF]"
                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/25"
            )}>
              <FolderTree className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="block truncate">Raiz do Vault</span>
              <span className="text-[10px] text-stone-400 dark:text-neutral-500 block -mt-0.5">Diretório raiz da árvore de arquivos</span>
            </div>
          </div>
          {isVaultRoot && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-[#1831D7] dark:text-[#7F95FF]" />}
        </button>

        {/* Divisor se houver pastas */}
        {filteredFolders.length > 0 && (
          <div className="my-1 border-t border-black/5 dark:border-white/5" />
        )}

        {/* Pastas do Vault */}
        {filteredFolders.map((folder) => {
          const isSelected = currentFolder === folder;
          const segments = folder.split('/');
          const displayName = segments[segments.length - 1];
          const parentPath = segments.slice(0, -1).join('/');

          return (
            <button
              key={folder}
              onClick={() => {
                onSelectFolder(folder);
                onClose();
              }}
              className={clsx(
                "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left group",
                isSelected
                  ? "bg-[#1831D7]/10 dark:bg-[#7F95FF]/15 text-[#1831D7] dark:text-[#7F95FF] font-semibold"
                  : "hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-neutral-300"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={clsx(
                  "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                  isSelected
                    ? "bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF]"
                    : "bg-stone-100 dark:bg-white/5 text-stone-500 dark:text-neutral-400 group-hover:bg-stone-200 dark:group-hover:bg-white/10"
                )}>
                  <Folder className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="block truncate">{displayName}</span>
                  {parentPath && (
                    <span className="text-[10px] text-stone-400 dark:text-neutral-500 flex items-center gap-0.5 truncate -mt-0.5">
                      {parentPath} <ChevronRight className="w-2.5 h-2.5 shrink-0 opacity-60" />
                    </span>
                  )}
                </div>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-[#1831D7] dark:text-[#7F95FF]" />}
            </button>
          );
        })}

        {filteredFolders.length === 0 && searchQuery && (
          <div className="text-center py-4 text-xs text-stone-400 dark:text-neutral-500">
            Nenhuma pasta correspondente encontrada.
          </div>
        )}
      </div>
    </div>
  );
};
