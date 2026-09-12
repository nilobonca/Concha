import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, FolderKanban, Plus, X, Search } from 'lucide-react';
import { PropertyDefinition } from '../../types';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { VaultNode } from '@/modules/vault/interfaces/vault';

export interface RelationCellProps {
  value: string[] | string | null | undefined;
  property: PropertyDefinition;
  onUpdate: (newRelations: string[]) => void;
}

function flattenVaultNodes(nodes: VaultNode[]): VaultNode[] {
  const result: VaultNode[] = [];
  function recurse(list: VaultNode[]) {
    for (const node of list) {
      if (node.type === 'file') {
        result.push(node);
      }
      if (node.children) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes || []);
  return result;
}

export const RelationCell: React.FC<RelationCellProps> = ({
  value,
  property,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize relations array
  const relations: string[] = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [String(value)];
  }, [value]);

  const { nodes, canvases, openDocument, openCanvasTab } = useVaultStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenItem = async (rawTarget: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const cleanTarget = rawTarget.replace(/^\[\[/, '').replace(/\]\]$/, '');
      if (cleanTarget.startsWith('canvas:')) {
        const canvasId = cleanTarget.replace('canvas:', '');
        if (openCanvasTab) {
          openCanvasTab(canvasId);
        }
      } else {
        if (openDocument) {
          await openDocument(cleanTarget);
        }
      }
    } catch {
      // Safe fallback
    }
  };

  const handleRemove = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(relations.filter((r) => r !== item));
  };

  const handleAddRelation = (title: string, isCanvas = false, canvasId?: string) => {
    const formatted = isCanvas && canvasId ? `[[canvas:${canvasId}]]` : `[[${title}]]`;
    if (!relations.includes(formatted) && !relations.includes(title)) {
      onUpdate([...relations, formatted]);
    }
    setSearch('');
    setIsOpen(false);
  };

  // Candidate suggestions from vault
  const vaultCandidates = useMemo(() => {
    const allFiles = flattenVaultNodes(nodes || []);
    const noteItems = allFiles.map((f) => ({
      title: f.name.replace(/\.[^/.]+$/, ''),
      type: 'note' as const,
      path: f.path,
      id: f.id,
    }));
    const canvasItems = (canvases || []).map((cv) => ({
      title: cv.name || 'Canvas',
      type: 'canvas' as const,
      path: `canvas:${cv.id}`,
      id: cv.id,
    }));
    const all = [...noteItems, ...canvasItems];

    if (!search.trim()) return all.slice(0, 15);
    return all
      .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 15);
  }, [nodes, canvases, search]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center px-1">
      <div className="flex flex-wrap items-center gap-1 w-full min-h-[28px] px-1 py-0.5">
        {relations.map((item) => {
          const isCanvas = item.includes('canvas:') || item.toLowerCase().endsWith('.canvas');
          const cleanName = item.replace(/^\[\[/, '').replace(/\]\]$/, '').replace('canvas:', '');

          return (
            <span
              key={item}
              onClick={(e) => handleOpenItem(item, e)}
              className="group inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#1831D7]/15 border border-[#7F95FF]/30 text-[#7F95FF] hover:bg-[#1831D7]/25 cursor-pointer select-none transition-colors shrink-0"
              title={`Abrir ${cleanName}`}
            >
              {isCanvas ? (
                <FolderKanban className="w-3 h-3 text-[#52B1FF] shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-[#7F95FF] shrink-0" />
              )}
              <span className="truncate max-w-[100px]">{cleanName}</span>
              <button
                type="button"
                onClick={(e) => handleRemove(item, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-white rounded-full p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-stone-400 dark:text-[#B4D3F1]/50 hover:text-stone-700 dark:hover:text-[#B4D3F1] hover:bg-stone-100 dark:hover:bg-white/5 rounded cursor-pointer transition-colors shrink-0"
          title="Relacionar nota ou canvas"
        >
          <Plus className="w-3 h-3" />
          <span className="text-[11px]">{relations.length === 0 ? 'Relacionar' : ''}</span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[#1E2238] rounded-xl shadow-xl border border-stone-200 dark:border-white/10 z-50 p-2 backdrop-blur-md">
          <div className="flex items-center gap-1.5 px-2 py-1 mb-2 rounded-lg bg-stone-100 dark:bg-white/5 border border-stone-200/50 dark:border-white/5">
            <Search className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/50 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nota ou canvas..."
              className="w-full bg-transparent text-xs text-stone-800 dark:text-[#F4F0E6] outline-none"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {vaultCandidates.map((cand) => (
              <button
                key={cand.path}
                type="button"
                onClick={() =>
                  handleAddRelation(cand.title, cand.type === 'canvas', cand.id)
                }
                className="flex items-center gap-2 w-full px-2 py-1 text-xs text-stone-700 dark:text-[#F4F0E6] hover:bg-stone-100 dark:hover:bg-white/5 rounded-md cursor-pointer transition-colors text-left"
              >
                {cand.type === 'canvas' ? (
                  <FolderKanban className="w-3.5 h-3.5 text-[#52B1FF] shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#7F95FF] shrink-0" />
                )}
                <span className="truncate flex-1">{cand.title}</span>
              </button>
            ))}

            {vaultCandidates.length === 0 && search.trim() && (
              <button
                type="button"
                onClick={() => handleAddRelation(search.trim())}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-[#52B1FF] hover:bg-[#52B1FF]/10 rounded-md cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Vincular &quot;{search.trim()}&quot;</span>
              </button>
            )}

            {vaultCandidates.length === 0 && !search.trim() && (
              <div className="px-2 py-2 text-center text-xs text-stone-400 dark:text-[#B4D3F1]/40">
                Nenhum arquivo no Vault
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
