import React, { useEffect, useRef } from 'react';
import { PendingArrowContext, BoardElementType, BoardElementPayload } from '../types';
import { StickyNote, Type, Database, Search, X } from 'lucide-react';

interface BoardDropContextMenuProps {
  context: PendingArrowContext;
  onSelectOption: (type: BoardElementType, payload?: BoardElementPayload) => void;
  onOpenVaultSearchModal: () => void;
  onClose: () => void;
}

const QUICK_COLORS = [
  { bg: '#1831D7', name: 'Cobalto' },
  { bg: '#7F95FF', name: 'Periwinkle' },
  { bg: '#52B1FF', name: 'Celeste' },
  { bg: '#B4D3F1', name: 'Gelo' },
  { bg: '#17192A', name: 'Meia-Noite' },
];

export const BoardDropContextMenu: React.FC<BoardDropContextMenuProps> = ({
  context,
  onSelectOption,
  onOpenVaultSearchModal,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Ajustar posição para não sair da tela
  const screenX = Math.min(context.screenPos.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 260);
  const screenY = Math.min(context.screenPos.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 320);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: screenX,
        top: screenY,
        zIndex: 1000,
      }}
      className="w-64 bg-neutral-900/95 border border-neutral-700/80 rounded-2xl shadow-2xl p-2.5 backdrop-blur-xl flex flex-col gap-1 text-white animate-in fade-in zoom-in-95 duration-150 select-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-800 text-neutral-400">
        <span className="text-[11px] font-semibold uppercase tracking-wider">Criar & Conectar</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 pt-1">
        {/* Opção 1: Nota */}
        <div className="flex flex-col rounded-xl hover:bg-neutral-800/60 p-1.5 transition-colors">
          <button
            onClick={() => onSelectOption('note', { color: '#fef08a' })}
            className="flex items-center gap-2.5 text-xs text-neutral-200 hover:text-white w-full text-left"
          >
            <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <StickyNote className="w-3.5 h-3.5" />
            </div>
            <span className="font-normal">Adicionar Nota</span>
          </button>
          {/* Cores rápidas */}
          <div className="flex gap-1.5 mt-1.5 pl-8.5">
            {QUICK_COLORS.map(c => (
              <button
                key={c.bg}
                onClick={() => onSelectOption('note', { color: c.bg })}
                className="w-4 h-4 rounded-full border border-black/20 hover:scale-125 transition-transform"
                style={{ backgroundColor: c.bg }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Opção 2: Texto */}
        <button
          onClick={() => onSelectOption('text')}
          className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-neutral-800/60 transition-colors w-full text-left"
        >
          <div className="w-6 h-6 rounded-lg bg-[#1831D7]/20 text-[#7F95FF] flex items-center justify-center">
            <Type className="w-3.5 h-3.5" />
          </div>
          <span className="font-normal">Adicionar Texto</span>
        </button>

        {/* Opção 3: Base de Dados */}
        <button
          onClick={() => onSelectOption('database', { title: 'Nova Base de Dados' })}
          className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-neutral-800/60 transition-colors w-full text-left"
        >
          <div className="w-6 h-6 rounded-lg bg-[#52B1FF]/20 text-[#52B1FF] flex items-center justify-center">
            <Database className="w-3.5 h-3.5" />
          </div>
          <span className="font-normal">Adicionar Base de Dados</span>
        </button>

        {/* Opção 4: Adicionar do Vault (Áudios, Imagens, Quadros, Notas, Bancos) */}
        <button
          onClick={() => {
            onOpenVaultSearchModal();
            onClose();
          }}
          className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-neutral-200 hover:text-white hover:bg-neutral-800/60 transition-colors w-full text-left"
        >
          <div className="w-6 h-6 rounded-lg bg-[#1831D7]/20 text-[#7F95FF] flex items-center justify-center">
            <Search className="w-3.5 h-3.5" />
          </div>
          <span className="font-normal">Adicionar do Vault...</span>
        </button>
      </div>
    </div>
  );
};
