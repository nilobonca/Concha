import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { useIDB } from '@/utils/indexedDB';
import { AudioData, ImageData, CanvasPreviewData } from '../../types';
import { Search, FileText, Music, Image as ImageIcon, FolderKanban, CornerDownLeft, Upload, Plus, Database } from 'lucide-react';
import { useSmoothHorizontalScroll } from '@/hooks/useSmoothHorizontalScroll';

export type VaultSearchCategory = 'all' | 'notes' | 'database' | 'audio' | 'image' | 'canvas';

export type UnifiedVaultItem = 
  | { type: 'note'; id: string; title: string; subtitle: string; path: string }
  | { type: 'database'; id: string; title: string; subtitle: string; path: string }
  | { type: 'audio'; id: string; title: string; subtitle: string; audioId?: number; url?: string; path?: string }
  | { type: 'image'; id: string; title: string; subtitle: string; imageId?: number; src?: string; path?: string }
  | { type: 'canvas'; id: string; title: string; subtitle: string; projectId: string; canvasType: 'board' | 'audio' }
  | { type: 'action'; id: string; title: string; actionType: 'upload-audio' | 'upload-image' | 'create-note' | 'create-database' };

interface BoardVaultSearchModalProps {
  isOpen: boolean;
  currentBoardId: string;
  initialCategory?: VaultSearchCategory;
  onClose: () => void;
  onSelectNote: (note: { path: string; name: string }) => void;
  onSelectDatabase?: (database: { path: string; name: string }) => void;
  onSelectAudio: (audioData: AudioData) => void;
  onSelectImage: (imageData: ImageData) => void;
  onSelectCanvas: (canvasData: CanvasPreviewData) => void;
}

export const BoardVaultSearchModal: React.FC<BoardVaultSearchModalProps> = ({
  isOpen,
  currentBoardId,
  initialCategory = 'all',
  onClose,
  onSelectNote,
  onSelectDatabase,
  onSelectAudio,
  onSelectImage,
  onSelectCanvas,
}) => {
  const categoryTabsRef = useSmoothHorizontalScroll<HTMLDivElement>({ speed: 1.15, easing: 0.16 });
  const { getAllFiles, createFile, saveMediaFile, getFileUrl, vaultName } = useVaultStore();
  const { savedAudios, savedImages, activeLayers, saveAudio, saveImage } = useIDB();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<VaultSearchCategory>(initialCategory);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Focus and initialize category on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCategory(initialCategory || 'all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialCategory]);

  // Reset selected index on query/category change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, category]);

  // Combine items from Vault and IDB
  const allItems = useMemo<UnifiedVaultItem[]>(() => {
    const items: UnifiedVaultItem[] = [];

    // 1. Vault Files (Notes, Audios, Images, Databases)
    const vaultFiles = getAllFiles();
    vaultFiles.forEach((file) => {
      const ext = file.extension || file.name.split('.').pop()?.toLowerCase() || '';
      const isAudio = file.fileType === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus'].includes(ext);
      const isImage = file.fileType === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
      const isDatabase = file.fileType === 'database' || ext === 'database' || file.name.toLowerCase().endsWith('.db.json') || file.name.toLowerCase().endsWith('.db.json.md') || file.path.toLowerCase().endsWith('.database');

      if (isAudio && (category === 'all' || category === 'audio')) {
        items.push({
          type: 'audio',
          id: `vault-audio-${file.path}`,
          title: file.name,
          subtitle: file.folder ? `Áudio no Vault (${file.folder})` : 'Áudio no Vault',
          path: file.path,
        });
      } else if (isImage && (category === 'all' || category === 'image')) {
        items.push({
          type: 'image',
          id: `vault-image-${file.path}`,
          title: file.name,
          subtitle: file.folder ? `Imagem no Vault (${file.folder})` : 'Imagem no Vault',
          path: file.path,
        });
      } else if (isDatabase && (category === 'all' || category === 'database')) {
        items.push({
          type: 'database',
          id: `database-${file.path}`,
          title: file.name.replace(/\.(database|db\.json|db\.json\.md)$/i, ''),
          subtitle: file.folder ? `Base de dados em ${file.folder}` : 'Base de Dados',
          path: file.path,
        });
      } else if (!isAudio && !isImage && !isDatabase && (category === 'all' || category === 'notes')) {
        items.push({
          type: 'note',
          id: `note-${file.path}`,
          title: file.name.replace(/\.(md|txt)$/, ''),
          subtitle: file.folder ? `Nota em ${file.folder}` : 'Nota do Vault',
          path: file.path,
        });
      }
    });

    // 2. Saved Audios from library
    if (category === 'all' || category === 'audio') {
      savedAudios.forEach((a) => {
        items.push({
          type: 'audio',
          id: `audio-${a.id}`,
          title: a.name || 'Áudio sem título',
          subtitle: 'Áudio da biblioteca',
          audioId: a.id,
          url: a.url,
        });
      });
    }

    // 3. Saved Images from library
    if (category === 'all' || category === 'image') {
      savedImages.forEach((img) => {
        items.push({
          type: 'image',
          id: `image-${img.id}`,
          title: img.name || 'Imagem sem título',
          subtitle: 'Imagem da biblioteca',
          imageId: img.id,
          src: img.url,
        });
      });
    }

    // 4. Other Canvases
    if (category === 'all' || category === 'canvas') {
      const otherProjects = activeLayers.filter((l) => l.isProjectMetadata && l.id !== currentBoardId);
      otherProjects.forEach((p) => {
        const isBoard = p.canvasType === 'board';
        items.push({
          type: 'canvas',
          id: `canvas-${p.id}`,
          title: p.name,
          subtitle: isBoard ? 'Canvas de Conexões' : 'Canvas de Áudio',
          projectId: p.id,
          canvasType: isBoard ? 'board' : 'audio',
        });
      });
    }

    return items;
  }, [category, getAllFiles, savedAudios, savedImages, activeLayers, currentBoardId]);

  // Filter items by query
  const filteredItems = useMemo<UnifiedVaultItem[]>(() => {
    const q = query.trim().toLowerCase();
    let res = allItems;
    if (q) {
      res = allItems.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          ('subtitle' in it && it.subtitle.toLowerCase().includes(q))
      );
    }

    const actionItems: UnifiedVaultItem[] = [];

    // Quick upload / create actions
    if (q && (category === 'all' || category === 'notes')) {
      const exactNoteMatch = res.some((i) => i.type === 'note' && i.title.toLowerCase() === q);
      if (!exactNoteMatch) {
        actionItems.push({
          type: 'action',
          id: 'action-create-note',
          title: `Criar e vincular nova nota: "${query.trim()}"`,
          actionType: 'create-note',
        });
      }
    }

    if (q && (category === 'all' || category === 'database')) {
      const exactDbMatch = res.some((i) => i.type === 'database' && i.title.toLowerCase() === q);
      if (!exactDbMatch) {
        actionItems.push({
          type: 'action',
          id: 'action-create-database',
          title: `Criar e vincular nova base de dados: "${query.trim()}"`,
          actionType: 'create-database',
        });
      }
    }

    if (category === 'all' || category === 'audio') {
      actionItems.push({
        type: 'action',
        id: 'action-upload-audio',
        title: 'Enviar novo áudio do computador...',
        actionType: 'upload-audio',
      });
    }

    if (category === 'all' || category === 'image') {
      actionItems.push({
        type: 'action',
        id: 'action-upload-image',
        title: 'Enviar nova imagem do computador...',
        actionType: 'upload-image',
      });
    }

    return [...res, ...actionItems];
  }, [allItems, query, category]);

  const handleExecuteItem = async (item: UnifiedVaultItem) => {
    if (item.type === 'note') {
      onSelectNote({ path: item.path, name: item.title });
      onClose();
    } else if (item.type === 'audio') {
      let audioUrl = item.url || '';
      if (!audioUrl && item.path) {
        try {
          audioUrl = await getFileUrl(item.path);
        } catch (err) {
          console.error('Erro ao obter URL do áudio do vault:', err);
        }
      }
      onSelectAudio({
        audioId: item.audioId,
        name: item.title,
        url: audioUrl,
        volume: 1,
        loop: false,
        filePath: item.path,
      });
      onClose();
    } else if (item.type === 'image') {
      let imageSrc = item.src || '';
      if (!imageSrc && item.path) {
        try {
          imageSrc = await getFileUrl(item.path);
        } catch (err) {
          console.error('Erro ao obter URL da imagem do vault:', err);
        }
      }
      onSelectImage({
        imageId: item.imageId,
        name: item.title,
        src: imageSrc,
        filePath: item.path,
      });
      onClose();
    } else if (item.type === 'canvas') {
      onSelectCanvas({
        targetProjectId: item.projectId,
        targetName: item.title,
        targetType: item.canvasType,
        previewInfo: `ID: ${item.projectId.slice(0, 8)}...`,
      });
      onClose();
    } else if (item.type === 'database') {
      onSelectDatabase?.({ path: item.path, name: item.title });
      onClose();
    } else if (item.type === 'action') {
      if (item.actionType === 'upload-audio') {
        audioInputRef.current?.click();
      } else if (item.actionType === 'upload-image') {
        imageInputRef.current?.click();
      } else if (item.actionType === 'create-note') {
        const newPath = await createFile('', query.trim());
        const cleanName = newPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') || query.trim();
        onSelectNote({ path: newPath, name: cleanName });
        onClose();
      } else if (item.actionType === 'create-database') {
        const dbName = query.trim() || 'Nova Base de Dados';
        try {
          const { createDefaultDatabase } = await import('@/modules/database/utils/databaseDefaults');
          const defaultDb = createDefaultDatabase(dbName);
          const newPath = await createFile('', `${dbName}.database`, JSON.stringify(defaultDb, null, 2), false);
          const cleanName = newPath.split('/').pop()?.replace(/\.(database|db\.json|db\.json\.md)$/i, '') || dbName;
          onSelectDatabase?.({ path: newPath, name: cleanName });
        } catch (err) {
          console.error('Falha ao criar base de dados:', err);
        }
        onClose();
      }
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      try {
        await saveMediaFile(file, '');
      } catch (vaultErr) {
        console.warn('Não foi possível salvar no vault diretamente:', vaultErr);
      }
      const saved = await saveAudio(file);
      if (saved) {
        onSelectAudio({
          audioId: saved.id,
          name: saved.name || file.name,
          url: saved.url,
          volume: 1,
          loop: false,
        });
        onClose();
      }
    } catch (err) {
      console.error('Erro ao fazer upload de áudio:', err);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      try {
        await saveMediaFile(file, '');
      } catch (vaultErr) {
        console.warn('Não foi possível salvar no vault diretamente:', vaultErr);
      }
      const saved = await saveImage(file);
      if (saved) {
        onSelectImage({
          imageId: saved.id,
          name: saved.name || file.name,
          src: saved.url,
        });
        onClose();
      }
    } catch (err) {
      console.error('Erro ao fazer upload de imagem:', err);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    const total = filteredItems.length;
    if (total === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < total) {
        handleExecuteItem(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 sm:pt-28 px-4"
      onClick={onClose}
    >
      {/* Hidden file inputs for quick uploads */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <div
        className="w-full max-w-xl bg-[#0f0f12] border border-neutral-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-800/70">
          <Search className="w-5 h-5 text-[#7F95FF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              category === 'notes'
                ? `Buscar notas no Vault ${vaultName ? `(${vaultName})` : ''}...`
                : category === 'audio'
                ? `Buscar áudios no Vault ${vaultName ? `(${vaultName})` : ''}...`
                : category === 'image'
                ? `Buscar imagens no Vault ${vaultName ? `(${vaultName})` : ''}...`
                : `Buscar nota, áudio, imagem ou quadro do Vault ${vaultName ? `(${vaultName})` : ''}...`
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 outline-none"
          />
          <kbd
            onClick={onClose}
            className="px-2.5 py-0.5 text-[11px] font-semibold text-neutral-400 bg-neutral-800/80 border border-neutral-700/60 rounded-full font-mono tracking-wider cursor-pointer hover:bg-neutral-700/80 hover:text-white transition-colors"
          >
            ESC
          </kbd>
        </div>

        {/* Category Pills */}
        <div 
          ref={categoryTabsRef}
          className="flex items-center gap-1.5 px-5 py-2 border-b border-neutral-800/40 bg-neutral-900/20 overflow-x-auto overflow-y-hidden no-scrollbar text-[11px]"
        >
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'notes', label: 'Notas' },
              { key: 'database', label: 'Bancos de Dados' },
              { key: 'audio', label: 'Áudios' },
              { key: 'image', label: 'Imagens' },
              { key: 'canvas', label: 'Quadros' },
            ] as const
          ).map((cat) => {
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                  isActive
                    ? 'bg-[#1831D7]/30 text-[#B4D3F1] border border-[#7F95FF]/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;

            if (item.type === 'action') {
              return (
                <div
                  key={item.id}
                  onClick={() => handleExecuteItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-2xl cursor-pointer transition-colors text-sm border border-dashed ${
                    isSelected
                      ? 'bg-[#1831D7] text-white border-[#7F95FF] font-semibold'
                      : 'text-[#7F95FF] border-[#7F95FF]/30 hover:bg-[#1831D7]/10 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {item.actionType === 'create-note' || item.actionType === 'create-database' ? (
                      <Plus className="w-4 h-4 shrink-0" />
                    ) : (
                      <Upload className="w-4 h-4 shrink-0" />
                    )}
                    <span>{item.title}</span>
                  </div>
                  <CornerDownLeft className="w-4 h-4 shrink-0" />
                </div>
              );
            }

            // Regular items (Note, Database, Audio, Image, Canvas)
            return (
              <div
                key={item.id}
                onClick={() => handleExecuteItem(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-2xl cursor-pointer transition-colors text-sm ${
                  isSelected
                    ? 'bg-[#1831D7] text-white font-semibold shadow-sm'
                    : 'text-neutral-200 hover:bg-neutral-800/40 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {item.type === 'note' && (
                    <FileText
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#7F95FF]'}`}
                    />
                  )}
                  {item.type === 'database' && (
                    <Database
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#52B1FF]'}`}
                    />
                  )}
                  {item.type === 'audio' && (
                    <Music
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#7F95FF]'}`}
                    />
                  )}
                  {item.type === 'image' && (
                    <ImageIcon
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#7F95FF]'}`}
                    />
                  )}
                  {item.type === 'canvas' && (
                    <FolderKanban
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#7F95FF]'}`}
                    />
                  )}

                  <span className="truncate">{item.title}</span>

                  <span
                    className={`text-xs truncate ${
                      isSelected ? 'text-[#B4D3F1]' : 'text-neutral-500'
                    }`}
                  >
                    • {item.subtitle}
                  </span>
                </div>

                <CornerDownLeft
                  className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-600'}`}
                />
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500">
              Nenhum elemento encontrado no Vault ou biblioteca para "{query}".
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-3 border-t border-neutral-800/70 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-4">
            <span>↑↓ para navegar</span>
            <span>↵ para adicionar ao canvas</span>
          </div>
          <span>Buscar no Vault</span>
        </div>
      </div>
    </div>
  );
};
