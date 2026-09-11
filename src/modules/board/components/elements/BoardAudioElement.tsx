import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { BoardElement, HandlePosition, AudioData } from '../../types';
import { ElementHandles } from './ElementHandles';
import { AudioVisualizer } from '@/components/ui/AudioVisualizer';
import { Play, Pause, Repeat, Volume2, Trash2, Music } from 'lucide-react';
import { useIDB } from '@/utils/indexedDB';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import clsx from 'clsx';

interface BoardAudioElementProps {
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

export const BoardAudioElement: React.FC<BoardAudioElementProps> = ({
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
  const data = (element.data || {}) as AudioData;

  const { savedAudios } = useIDB();
  const { getFileUrl, getAllFiles } = useVaultStore();

  const [currentUrl, setCurrentUrl] = useState<string>(() => data.url || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(data.volume ?? 1);
  const [isLoop, setIsLoop] = useState(data.loop ?? false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const savedAudiosRef = useRef(savedAudios);
  savedAudiosRef.current = savedAudios;

  const resolvingAudioRef = useRef(false);
  const hasResolvedAudioSuccessfullyRef = useRef(false);

  // Auto-resolução de áudio após F5/refresh
  const resolveAudioSource = useCallback(async () => {
    if (resolvingAudioRef.current || hasResolvedAudioSuccessfullyRef.current) return;
    resolvingAudioRef.current = true;

    const currentData = dataRef.current;
    const currentSavedAudios = savedAudiosRef.current;

    try {
      // 1. Tentar savedAudios pelo audioId
      if (currentData.audioId !== undefined) {
        const match = currentSavedAudios.find(a => a.id === currentData.audioId);
        if (match && match.url) {
          setCurrentUrl(match.url);
          hasResolvedAudioSuccessfullyRef.current = true;
          if (match.url !== currentData.url) {
            onUpdateRef.current({ data: { ...currentData, url: match.url } });
          }
          return;
        }
      }

      // 2. Tentar savedAudios pelo nome
      if (currentData.name) {
        const match = currentSavedAudios.find(a => a.name === currentData.name);
        if (match && match.url) {
          setCurrentUrl(match.url);
          hasResolvedAudioSuccessfullyRef.current = true;
          if (match.url !== currentData.url) {
            onUpdateRef.current({ data: { ...currentData, url: match.url } });
          }
          return;
        }
      }

      // 3. Tentar Vault se houver filePath
      if (currentData.filePath) {
        try {
          const vaultUrl = await getFileUrl(currentData.filePath);
          if (vaultUrl) {
            setCurrentUrl(vaultUrl);
            hasResolvedAudioSuccessfullyRef.current = true;
            if (vaultUrl !== currentData.url) {
              onUpdateRef.current({ data: { ...currentData, url: vaultUrl } });
            }
            return;
          }
        } catch (err) {
          console.warn('Erro ao resolver áudio do vault:', err);
        }
      }

      // 4. Tentar no Vault pelo nome
      if (currentData.name) {
        const allFiles = getAllFiles();
        const matched = allFiles.find(f => f.fileType === 'audio' && (f.name === currentData.name || f.path.endsWith(currentData.name)));
        if (matched) {
          try {
            const vaultUrl = await getFileUrl(matched.path);
            if (vaultUrl) {
              setCurrentUrl(vaultUrl);
              hasResolvedAudioSuccessfullyRef.current = true;
              onUpdateRef.current({ data: { ...currentData, url: vaultUrl, filePath: matched.path } });
              return;
            }
          } catch {}
        }
      }
    } finally {
      resolvingAudioRef.current = false;
    }
  }, [getFileUrl, getAllFiles]);

  // Se não houver url inicial, tenta resolver uma vez ao montar
  useEffect(() => {
    if (!currentUrl) {
      resolveAudioSource();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inicializar e controlar o elemento de áudio
  useEffect(() => {
    if (currentUrl) {
      const audio = new Audio(currentUrl);
      audio.volume = volume;
      audio.loop = isLoop;

      audio.onloadedmetadata = () => setDuration(audio.duration || 0);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
      audio.onended = () => {
        setIsPlaying(false);
      };
      audio.onerror = () => {
        hasResolvedAudioSuccessfullyRef.current = false;
        resolveAudioSource();
      };

      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = isLoop;
    }
  }, [volume, isLoop]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
    onUpdate({ data: { ...data, volume: newVol } });
  };

  const handleLoopToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLoop = !isLoop;
    setIsLoop(newLoop);
    if (audioRef.current) audioRef.current.loop = newLoop;
    onUpdate({ data: { ...data, loop: newLoop } });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) audioRef.current.currentTime = target;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

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
          "w-full h-full rounded-2xl bg-white dark:bg-neutral-900/90 border backdrop-blur-md shadow-xl flex flex-col p-3 transition-all duration-200 justify-between",
          isSelected
            ? "border-[#1831D7] ring-2 ring-[#7F95FF]/30 shadow-[#1831D7]/10"
            : "border-stone-200/90 dark:border-neutral-800 hover:border-[#7F95FF] dark:hover:border-neutral-700"
        )}
      >
        {/* Header com título e arraste */}
        <div
          {...bindDrag()}
          className="flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-stone-200/90 dark:border-neutral-800 pb-2"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-xl bg-[#1831D7]/10 dark:bg-[#1831D7]/20 border border-[#7F95FF]/30 flex items-center justify-center text-[#1831D7] dark:text-[#7F95FF] shrink-0 shadow-xs">
              <Music className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-stone-900 dark:text-neutral-200 truncate max-w-[150px]">
              {data.name || 'Áudio'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <AudioVisualizer isPlaying={isPlaying} barCount={12} color="#7F95FF" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:bg-rose-50 dark:hover:bg-neutral-800 text-stone-400 hover:text-rose-600 rounded transition-colors ml-1 cursor-pointer"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Controles de Reprodução */}
        <div className="flex items-center gap-2 pt-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={togglePlay}
            disabled={!currentUrl}
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer",
              currentUrl
                ? "bg-[#1831D7] hover:bg-[#1831D7]/90 text-white hover:scale-105 active:scale-95 shadow-[#1831D7]/20"
                : "bg-stone-200 dark:bg-neutral-800 text-stone-400 dark:text-neutral-500 cursor-not-allowed"
            )}
            title={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 translate-x-0.5" />}
          </button>

          {/* Seekbar e Duração */}
          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={!currentUrl}
              className="w-full h-1.5 bg-stone-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#1831D7]"
            />
            <div className="flex justify-between text-[10px] text-stone-400 dark:text-neutral-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Botão de Loop */}
          <button
            onClick={handleLoopToggle}
            className={clsx(
              "p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer",
              isLoop 
                ? "bg-[#1831D7]/15 text-[#1831D7] dark:text-[#7F95FF] border border-[#7F95FF]/40" 
                : "text-stone-400 dark:text-neutral-500 hover:text-stone-700 dark:hover:text-neutral-300"
            )}
            title={isLoop ? "Loop Ativo" : "Ativar Loop"}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 shrink-0" title={`Volume: ${Math.round(volume * 100)}%`}>
            <Volume2 className="w-3 h-3 text-stone-400 dark:text-neutral-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-10 h-1 bg-stone-200 dark:bg-neutral-800 rounded appearance-none cursor-pointer accent-[#1831D7]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
