import React, { useState, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Plus,
  X,
  Play,
  Pause,
  Download,
  ExternalLink,
} from 'lucide-react';
import { DatabaseAttachment } from '../../types';

export interface FileCellProps {
  value: DatabaseAttachment[] | null | undefined;
  onUpdate: (newFiles: DatabaseAttachment[]) => void;
  onOpenUploadPopover?: () => void;
}

export const FileCell: React.FC<FileCellProps> = ({
  value,
  onUpdate,
  onOpenUploadPopover,
}) => {
  const files: DatabaseAttachment[] = Array.isArray(value) ? value : [];
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleAudio = (file: DatabaseAttachment, e: React.MouseEvent) => {
    e.stopPropagation();
    const source = file.url || file.vaultPath;
    if (!source) return;

    if (activeAudioId === file.id) {
      audioRef.current?.pause();
      setActiveAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(source);
      audioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => setActiveAudioId(null);
      setActiveAudioId(file.id);
    }
  };

  const handleRemoveFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeAudioId === fileId) {
      audioRef.current?.pause();
      setActiveAudioId(null);
    }
    onUpdate(files.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-1.5 w-full h-full px-2 py-1 overflow-x-auto">
      {files.map((file) => {
        const fileSrc = file.url || file.vaultPath;

        if (file.fileType === 'image') {
          return (
            <div
              key={file.id}
              className="group relative flex items-center shrink-0 rounded-md border border-stone-200 dark:border-white/10 overflow-hidden bg-stone-100 dark:bg-white/5"
            >
              {fileSrc ? (
                <img
                  src={fileSrc}
                  alt={file.name}
                  onClick={() => setPreviewImage(fileSrc)}
                  className="w-7 h-7 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-7 h-7 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => handleRemoveFile(file.id, e)}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded-full p-0.5 hover:bg-rose-600 transition-opacity cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        }

        if (file.fileType === 'audio') {
          const isPlaying = activeAudioId === file.id;
          return (
            <div
              key={file.id}
              className="group relative flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[#52B1FF]/15 border border-[#52B1FF]/30 text-[#52B1FF] shrink-0"
            >
              <button
                type="button"
                onClick={(e) => handleToggleAudio(file, e)}
                className="w-4 h-4 rounded-full bg-[#1831D7] text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              >
                {isPlaying ? <Pause className="w-2 h-2" /> : <Play className="w-2 h-2 ml-0.5" />}
              </button>
              <span className="truncate max-w-[90px]">{file.name}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveFile(file.id, e)}
                className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-400 transition-opacity cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        }

        // PDF / Documents / Other
        return (
          <div
            key={file.id}
            className="group relative flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-700 dark:text-[#B4D3F1] shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-stone-400 dark:text-[#B4D3F1]/60 shrink-0" />
            <span className="truncate max-w-[80px] font-medium">{file.name}</span>
            {file.size && (
              <span className="text-[10px] text-stone-400 dark:text-[#B4D3F1]/40">
                {formatFileSize(file.size)}
              </span>
            )}
            {fileSrc && (
              <a
                href={fileSrc}
                target="_blank"
                rel="noreferrer"
                className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-[#52B1FF] transition-opacity"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="button"
              onClick={(e) => handleRemoveFile(file.id, e)}
              className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-400 transition-opacity cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {onOpenUploadPopover && (
        <button
          type="button"
          onClick={onOpenUploadPopover}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs text-stone-400 dark:text-[#B4D3F1]/50 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title="Adicionar anexo"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px]">Anexar</span>
        </button>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[80vh] rounded-xl overflow-hidden shadow-2xl bg-[#17192A] border border-white/10"
          >
            <img src={previewImage} alt="Visualização" className="w-full h-auto object-contain" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
