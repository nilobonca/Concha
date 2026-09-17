import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Check, Edit2, FolderKanban, Folder, Box, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { WindowControls } from '@/components/common/WindowControls';
import { isElectron } from '@/utils/electronHelper';
import { BoardFolderPickerDropdown } from './BoardFolderPickerDropdown';

interface BoardHeaderProps {
  boardName: string;
  onUpdateName: (name: string) => void;
  elementsCount: number;
  connectionsCount: number;
  isEmbeddedInVault?: boolean;
  onCloseEmbedded?: () => void;
  folderPath?: string | null;
  onMoveToGeneral?: () => void;
  allFolders?: string[];
  onSelectFolder?: (folderPath: string | null) => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  boardName,
  onUpdateName,
  elementsCount,
  connectionsCount,
  isEmbeddedInVault,
  onCloseEmbedded,
  folderPath,
  onMoveToGeneral,
  allFolders,
  onSelectFolder,
}) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(boardName);
  const [isElec, setIsElec] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  useEffect(() => {
    setIsElec(isElectron());
  }, []);

  useEffect(() => {
    setTempName(boardName);
  }, [boardName]);

  const handleSave = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim());
    }
    setIsEditing(false);
  };

  return (
    <header 
      className="absolute top-0 inset-x-0 h-16 pt-4 px-4 z-40 pointer-events-auto flex items-center justify-between select-none app-region-drag"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Lado Esquerdo: Voltar + Nome + Badge */}
      <div 
        className="pointer-events-auto flex items-center gap-3 bg-white/85 dark:bg-[#14141C]/85 border border-black/10 dark:border-white/10 rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-xl text-stone-900 dark:text-white app-region-no-drag"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(!isEmbeddedInVault || onCloseEmbedded) && (
          <>
            <button
              onClick={() => {
                if (isEmbeddedInVault && onCloseEmbedded) {
                  onCloseEmbedded();
                } else {
                  router.push('/');
                }
              }}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl text-stone-500 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              title={isEmbeddedInVault ? "Fechar Canvas no Vault" : "Voltar aos Projetos"}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10" />
          </>
        )}

        {/* Nome do Board */}
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              onBlur={handleSave}
              autoFocus
              className="bg-stone-50 dark:bg-black/40 border border-[#1831D7] rounded-lg px-2 py-0.5 text-sm font-semibold outline-none w-48 text-stone-900 dark:text-white"
            />
            <button
              onClick={handleSave}
              className="p-1 hover:bg-[#1831D7]/20 text-[#1831D7] dark:text-[#7F95FF] rounded-lg"
              title="Salvar nome"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => {
              setTempName(boardName);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 cursor-pointer group"
            title="Clique para renomear"
          >
            <h1 className="text-sm font-bold group-hover:text-[#1831D7] dark:group-hover:text-[#7F95FF] transition-colors">
              {boardName}
            </h1>
            <Edit2 className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Localização da Pasta / Baú de Canvas com Dropdown Seletor */}
        <div className="relative">
          <button
            type="button"
            onClick={() => onSelectFolder && setIsFolderPickerOpen((prev) => !prev)}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all group",
              folderPath !== null && folderPath !== undefined
                ? "badge-pastel-lavender"
                : "badge-pastel-amber",
              onSelectFolder && "cursor-pointer hover:opacity-85 ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/15"
            )}
            title={onSelectFolder ? "Clique para alterar a pasta deste Canvas" : undefined}
          >
            {folderPath !== null && folderPath !== undefined ? (
              <>
                <Folder className="w-3 h-3 text-[#1831D7] dark:text-[#7F95FF]" />
                <span className="truncate max-w-[130px]">
                  {folderPath === '' ? 'Raiz do Vault' : folderPath}
                </span>
              </>
            ) : (
              <>
                <Box className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Baú de Canvas</span>
              </>
            )}

            {onSelectFolder && (
              <ChevronDown
                className={clsx(
                  "w-3 h-3 opacity-60 transition-transform duration-150",
                  isFolderPickerOpen && "rotate-180"
                )}
              />
            )}
          </button>

          {onSelectFolder && (
            <BoardFolderPickerDropdown
              isOpen={isFolderPickerOpen}
              onClose={() => setIsFolderPickerOpen(false)}
              currentFolder={folderPath ?? null}
              allFolders={allFolders || []}
              onSelectFolder={(newFolder) => {
                onSelectFolder(newFolder);
                setIsFolderPickerOpen(false);
              }}
            />
          )}
        </div>

        {/* Badge do Tipo de Canvas */}
        <span className="badge-pastel-lavender text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <FolderKanban className="w-3 h-3" />
          <span>Canvas de Conexões</span>
        </span>
      </div>

      {/* Centro: Área Livre de Drag da Janela */}
      <div 
        className="flex-1 h-full min-w-8 app-region-drag cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        title="Arrastar Janela"
      />

      {/* Lado Direito: Estatísticas / Resumo (elementos e setas) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Componente de Estatísticas (Elementos e Setas) */}
        <div 
          className="pointer-events-auto flex items-center gap-2 bg-white/85 dark:bg-[#14141C]/85 border border-black/10 dark:border-white/10 rounded-2xl px-3 py-1.5 shadow-xl backdrop-blur-xl text-stone-500 dark:text-neutral-400 text-xs font-mono select-none app-region-no-drag"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span>{elementsCount} elementos</span>
          <span>•</span>
          <span>{connectionsCount} setas</span>
        </div>

        {/* Controles da Janela (.exe Electron) fora do componente de elementos e setas (apenas em modo standalone fora do Vault) */}
        {!isEmbeddedInVault && isElec && (
          <div 
            className="pointer-events-auto flex items-center bg-white/85 dark:bg-[#14141C]/85 border border-black/10 dark:border-white/10 rounded-2xl px-2 py-1.5 shadow-xl backdrop-blur-xl app-region-no-drag"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <WindowControls variant="compact" />
          </div>
        )}
      </div>
    </header>
  );
};
