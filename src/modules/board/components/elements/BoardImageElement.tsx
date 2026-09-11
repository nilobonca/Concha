import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition, ImageData } from '../../types';
import { ElementHandles } from './ElementHandles';
import { Trash2, GripHorizontal, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useIDB } from '@/utils/indexedDB';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import clsx from 'clsx';

interface BoardImageElementProps {
  element: BoardElement;
  isSelected: boolean;
  snappedHandle?: HandlePosition | null;
  zoom: number;
  onSelect: (e?: React.MouseEvent | React.PointerEvent) => void;
  onUpdate: (updates: Partial<BoardElement>) => void;
  onDelete: () => void;
  onStartArrow: (handle: HandlePosition, e: React.PointerEvent) => void;
  onDragStart?: () => void;
}

export const BoardImageElement: React.FC<BoardImageElementProps> = ({
  element,
  isSelected,
  snappedHandle,
  zoom,
  onSelect,
  onUpdate,
  onDelete,
  onStartArrow,
  onDragStart,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const data = (element.data || {}) as ImageData;

  const { savedImages } = useIDB();
  const { getFileUrl, getAllFiles } = useVaultStore();

  const [currentSrc, setCurrentSrc] = useState<string>(() => data.base64 || data.src || '');
  const [isResolving, setIsResolving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const savedImagesRef = useRef(savedImages);
  savedImagesRef.current = savedImages;

  const resolvingRef = useRef(false);
  const hasResolvedSuccessfullyRef = useRef(false);

  // Função central de re-resolução de imagem após F5/refresh
  const resolveSource = useCallback(async () => {
    if (resolvingRef.current || hasResolvedSuccessfullyRef.current) return;
    resolvingRef.current = true;
    setIsResolving(true);

    const currentData = dataRef.current;
    const currentSavedImages = savedImagesRef.current;

    try {
      // 1. Se já tem base64, é garantido e persistente
      if (currentData.base64) {
        setCurrentSrc(currentData.base64);
        setLoadFailed(false);
        hasResolvedSuccessfullyRef.current = true;
        return;
      }

      // 2. Tentar recuperar de savedImages pelo imageId
      if (currentData.imageId !== undefined) {
        const match = currentSavedImages.find(img => img.id === currentData.imageId);
        if (match && match.url) {
          setCurrentSrc(match.url);
          setLoadFailed(false);
          hasResolvedSuccessfullyRef.current = true;
          if (match.url !== currentData.src) {
            onUpdateRef.current({ data: { ...currentData, src: match.url } });
          }
          return;
        }
      }

      // 3. Tentar recuperar de savedImages pelo nome
      if (currentData.name) {
        const match = currentSavedImages.find(img => img.name === currentData.name);
        if (match && match.url) {
          setCurrentSrc(match.url);
          setLoadFailed(false);
          hasResolvedSuccessfullyRef.current = true;
          if (match.url !== currentData.src) {
            onUpdateRef.current({ data: { ...currentData, src: match.url } });
          }
          return;
        }
      }

      // 4. Tentar recuperar do Vault se houver filePath
      if (currentData.filePath) {
        try {
          const vaultUrl = await getFileUrl(currentData.filePath);
          if (vaultUrl) {
            setCurrentSrc(vaultUrl);
            setLoadFailed(false);
            hasResolvedSuccessfullyRef.current = true;
            if (vaultUrl !== currentData.src) {
              onUpdateRef.current({ data: { ...currentData, src: vaultUrl } });
            }
            return;
          }
        } catch (err) {
          console.warn('Erro ao resolver imagem do vault via filePath:', err);
        }
      }

      // 5. Tentar encontrar no Vault por correspondência de nome
      if (currentData.name) {
        const allFiles = getAllFiles();
        const matched = allFiles.find(f => f.fileType === 'image' && (f.name === currentData.name || f.path.endsWith(currentData.name)));
        if (matched) {
          try {
            const vaultUrl = await getFileUrl(matched.path);
            if (vaultUrl) {
              setCurrentSrc(vaultUrl);
              setLoadFailed(false);
              hasResolvedSuccessfullyRef.current = true;
              onUpdateRef.current({ data: { ...currentData, src: vaultUrl, filePath: matched.path } });
              return;
            }
          } catch {}
        }
      }

      // 6. Tentar busca direta no IndexedDB RPGSA_DB -> images
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = window.indexedDB.open('RPGSA_DB', 12);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          if (db.objectStoreNames.contains('images')) {
            const imgRecord = await new Promise<any>((resolve) => {
              const tx = db.transaction('images', 'readonly');
              const store = tx.objectStore('images');
              if (currentData.imageId !== undefined) {
                const req = store.get(currentData.imageId);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
              } else {
                const req = store.getAll();
                req.onsuccess = () => {
                  const all = req.result || [];
                  const found = all.find((item: any) => item.name === currentData.name);
                  resolve(found || null);
                };
                req.onerror = () => resolve(null);
              }
            });

            if (imgRecord && imgRecord.file) {
              const freshUrl = URL.createObjectURL(imgRecord.file);
              setCurrentSrc(freshUrl);
              setLoadFailed(false);
              hasResolvedSuccessfullyRef.current = true;
              onUpdateRef.current({ data: { ...currentData, src: freshUrl, imageId: imgRecord.id } });
              return;
            }
          }
        } catch (err) {
          console.warn('Busca direta de imagem no IndexedDB falhou:', err);
        }
      }

      setLoadFailed(true);
    } finally {
      setIsResolving(false);
      resolvingRef.current = false;
    }
  }, [getFileUrl, getAllFiles]);

  // Executa uma única vez ao montar caso não haja src
  useEffect(() => {
    if (!currentSrc) {
      resolveSource();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bindDrag = useGesture({
    onDrag: ({ offset: [ox, oy], event }) => {
      event.stopPropagation();
      onUpdate({
        x: ox / zoom,
        y: oy / zoom,
      });
    },
    onDragStart: ({ event }) => {
      event.stopPropagation();
      onSelect(event as any);
      onDragStart?.();
    },
  }, {
    drag: {
      from: () => [element.x * zoom, element.y * zoom],
      filterTaps: true,
    }
  });

  const bindResize = useGesture({
    onDrag: ({ delta: [dx, dy], event }) => {
      event.stopPropagation();
      const newWidth = Math.max(120, element.width + dx / zoom);
      const newHeight = Math.max(100, element.height + dy / zoom);
      onUpdate({ width: newWidth, height: newHeight });
    },
  });

  return (
    <div
      data-board-element="true"
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: isSelected ? 50 : element.zIndex,
      }}
      className="group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
    >
      <ElementHandles
        isVisible={isHovered || isSelected}
        snappedHandle={snappedHandle}
        onStartArrow={onStartArrow}
      />

      <div
        className={clsx(
          "w-full h-full rounded-2xl bg-white dark:bg-neutral-900/90 border backdrop-blur-md shadow-xl flex flex-col overflow-hidden relative transition-all duration-200",
          isSelected
            ? "border-sky-500 ring-2 ring-sky-500/30 shadow-sky-500/10"
            : "border-stone-200/90 dark:border-neutral-800 hover:border-sky-400/80 dark:hover:border-neutral-700"
        )}
      >
        {/* Top bar with drag handle and delete */}
        <div
          {...bindDrag()}
          className="absolute top-0 inset-x-0 h-8 bg-stone-900/75 dark:bg-neutral-950/70 backdrop-blur-sm z-20 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="flex items-center gap-1.5 text-stone-200 dark:text-neutral-300">
            <GripHorizontal className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[11px] font-medium truncate max-w-[150px]">
              {data.name || 'Imagem'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-500/20 text-stone-300 hover:text-red-400 rounded transition-colors cursor-pointer"
            title="Excluir imagem"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Image Content */}
        <div {...bindDrag()} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center bg-stone-100 dark:bg-black/40">
          {currentSrc && !loadFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSrc}
              alt={data.name || 'Imagem'}
              draggable={false}
              onError={() => {
                hasResolvedSuccessfullyRef.current = false;
                resolveSource();
              }}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : isResolving ? (
            <div className="flex flex-col items-center gap-2 text-sky-600 dark:text-sky-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-[11px] font-medium">Carregando imagem...</span>
            </div>
          ) : (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                hasResolvedSuccessfullyRef.current = false;
                resolveSource();
              }}
              className="flex flex-col items-center gap-2 text-stone-400 dark:text-neutral-500 cursor-pointer hover:text-stone-600 dark:hover:text-neutral-300 transition-colors p-2 text-center"
              title="Clique para tentar recarregar"
            >
              <ImageIcon className="w-8 h-8" />
              <span className="text-xs font-medium">Recarregar Imagem</span>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        {isSelected && (
          <div
            {...bindResize()}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-sky-500 dark:text-sky-400 z-30"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 6 6" fill="currentColor">
              <circle cx="5" cy="5" r="1" />
              <circle cx="5" cy="2" r="1" />
              <circle cx="2" cy="5" r="1" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
