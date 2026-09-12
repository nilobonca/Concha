import React from 'react';
import { BoardElementType } from '../types';
import { StickyNote, Type, Music, Image as ImageIcon, FolderKanban, Search, Database } from 'lucide-react';

interface BoardGhostPreviewProps {
  toolType: BoardElementType | 'vault-search';
  worldPos: { x: number; y: number };
}

export const BoardGhostPreview: React.FC<BoardGhostPreviewProps> = ({
  toolType,
  worldPos,
}) => {
  switch (toolType) {
    case 'note': {
      const width = 220;
      const height = 180;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          {/* Nome da nota em cima do retângulo */}
          <div className="absolute -top-5 left-1 text-xs text-neutral-400 font-normal truncate">
            Nova Nota
          </div>

          {/* Cartão Nota com estilo idêntico */}
          <div className="w-full h-full rounded-2xl border-[3px] border-[#1831D7] bg-[#F4F0E6] shadow-2xl p-4 flex flex-col justify-between opacity-95 ring-4 ring-[#1831D7]/20">
            <div>
              <h1 className="text-base font-bold text-neutral-900 tracking-tight mb-1">
                Nova Nota
              </h1>
              <p className="text-xs text-neutral-500">
                Solte para criar esta nota aqui
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#1831D7] font-medium">
              <StickyNote className="w-3.5 h-3.5" />
              <span>Inserir no canvas</span>
            </div>
          </div>
        </div>
      );
    }

    case 'text': {
      const width = 200;
      const height = 70;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          <div className="w-full h-full rounded-xl border-2 border-dashed border-[#7F95FF] bg-[#17192A]/90 backdrop-blur-sm p-3 flex items-center gap-2.5 text-[#B4D3F1] shadow-xl ring-2 ring-[#7F95FF]/20">
            <Type className="w-5 h-5 text-[#7F95FF] shrink-0" />
            <div>
              <p className="text-xs font-semibold">Novo Bloco de Texto</p>
              <p className="text-[10px] text-[#B4D3F1]/70">Solte para posicionar</p>
            </div>
          </div>
        </div>
      );
    }

    case 'audio': {
      const width = 280;
      const height = 120;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-[#1831D7] bg-[#17192A]/90 shadow-2xl p-4 flex flex-col justify-between text-[#F4F0E6] ring-4 ring-[#1831D7]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1831D7]/30 flex items-center justify-center text-[#7F95FF]">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">Elemento de Áudio</p>
                <p className="text-[10px] text-neutral-400">Solte para escolher o som</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#7F95FF] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#1831D7] animate-ping" />
              <span>Pronto para soltar</span>
            </div>
          </div>
        </div>
      );
    }

    case 'image': {
      const width = 260;
      const height = 200;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-sky-500 bg-neutral-900/90 shadow-2xl p-4 flex flex-col items-center justify-center gap-2 text-center ring-4 ring-sky-500/20">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Elemento de Imagem</p>
              <p className="text-[10px] text-neutral-400">Solte para escolher a imagem</p>
            </div>
          </div>
        </div>
      );
    }

    case 'canvas-preview': {
      const width = 260;
      const height = 150;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-emerald-500 bg-neutral-900/90 shadow-2xl p-4 flex flex-col justify-between text-white ring-4 ring-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 flex items-center justify-center text-emerald-400">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">Preview de Canvas</p>
                <p className="text-[10px] text-neutral-400">Solte para vincular outro canvas</p>
              </div>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono">
              [ Vincular Quadro ]
            </div>
          </div>
        </div>
      );
    }

    case 'database': {
      const width = 360;
      const height = 220;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-[#52B1FF] bg-[#17192A]/90 shadow-2xl p-4 flex flex-col justify-between text-[#F4F0E6] ring-4 ring-[#52B1FF]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#52B1FF]/20 flex items-center justify-center text-[#52B1FF]">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">Base de Dados</p>
                <p className="text-[10px] text-neutral-400">Solte para posicionar a base de dados</p>
              </div>
            </div>
            <div className="text-[10px] text-[#52B1FF] font-mono flex items-center gap-1">
              <span>[ Inserir Database ]</span>
            </div>
          </div>
        </div>
      );
    }

    case 'vault-search': {
      const width = 260;
      const height = 140;
      const left = worldPos.x - width / 2;
      const top = worldPos.y - height / 2;

      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            zIndex: 9999,
          }}
          className="pointer-events-none select-none transition-transform duration-75 ease-out"
        >
          <div className="w-full h-full rounded-2xl border-2 border-dashed border-[#1831D7] bg-[#17192A]/90 shadow-2xl p-4 flex flex-col justify-between text-[#F4F0E6] ring-4 ring-[#1831D7]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1831D7]/30 flex items-center justify-center text-[#7F95FF]">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">Adicionar do Vault</p>
                <p className="text-[10px] text-neutral-400">Solte para buscar o elemento</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#7F95FF] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#1831D7] animate-ping" />
              <span>Buscar no Vault</span>
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
