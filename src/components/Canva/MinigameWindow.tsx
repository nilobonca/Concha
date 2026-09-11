import React, { ReactNode, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Minus, Pin, PinOff, Gamepad2, Flame, Sparkles, Coins, MousePointerClick, KeyRound } from 'lucide-react';
import clsx from 'clsx';
import { useMinigamesStore } from '@/store/minigamesStore';
import { useCanvasGlobalStore } from '@/store/canvasStore';
import { useViewportResize } from '@/hooks/useViewportResize';
import { useSmoothHorizontalScroll } from '@/hooks/useSmoothHorizontalScroll';

interface MinigameWindowProps {
  id: string;
  title: string;
  children: ReactNode;
}

export const MinigameWindow: React.FC<MinigameWindowProps> = ({ id, title, children }) => {
  const shortcutsStripRef = useSmoothHorizontalScroll<HTMLDivElement>({ speed: 1.15, easing: 0.16 });
  const { toggleMinimize, removeGame, activeGames, addGame } = useMinigamesStore();
  const menuZIndices = useCanvasGlobalStore(state => state.menuZIndices);
  const bringToFront = useCanvasGlobalStore(state => state.bringToFront);
  const dragControls = useDragControls();

  const [isPinned, setIsPinned] = useState(false);

  const game = activeGames.find(g => g.id === id);

  const menuKey = `minigame-${id}`;
  const zIndex = menuZIndices[menuKey] || 60;

  const defaultX = typeof window !== 'undefined' ? window.innerWidth / 2 - 170 : 300;
  const defaultY = typeof window !== 'undefined' ? window.innerHeight / 2 - 120 : 200;

  const { size, setSize, position, onDragEnd, handleResizeStart, constraintRef, x, y, width, height, startDragHeader } = useViewportResize({
    menuId: menuKey,
    initialSize: { width: 360, height: 280 },
    initialPosition: { x: defaultX, y: defaultY },
    minWidth: 320,
    minHeight: 220
  });

  if (!game || game.isMinimized) return null;

  // Determine game type luminous icon theme
  const getHeaderIconTheme = () => {
    switch (game.gameId) {
      case 'clicker':
        return {
          icon: <Flame size={15} className="drop-shadow-[0_0_8px_rgba(82,177,255,0.8)]" />,
          badgeClass: "bg-[#52B1FF]/20 text-[#52B1FF] border-[#52B1FF]/40 shadow-[0_0_15px_rgba(82,177,255,0.35)]",
          dotClass: "bg-[#52B1FF] shadow-[0_0_8px_#52B1FF]"
        };
      case 'cards':
        return {
          icon: <Sparkles size={15} className="drop-shadow-[0_0_8px_rgba(127,149,255,0.8)]" />,
          badgeClass: "bg-[#7F95FF]/20 text-[#7F95FF] border-[#7F95FF]/40 shadow-[0_0_15px_rgba(127,149,255,0.35)]",
          dotClass: "bg-[#7F95FF] shadow-[0_0_8px_#7F95FF]"
        };
      case 'coin_flip':
        return {
          icon: <Coins size={15} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />,
          badgeClass: "bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.35)]",
          dotClass: "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
        };
      case 'dial_lock':
        return {
          icon: <KeyRound size={15} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />,
          badgeClass: "bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.35)]",
          dotClass: "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
        };
      default:
        return {
          icon: <Gamepad2 size={15} className="drop-shadow-[0_0_8px_rgba(24,49,215,0.8)]" />,
          badgeClass: "bg-[#1831D7]/20 text-[#7F95FF] border-[#1831D7]/40 shadow-[0_0_15px_rgba(24,49,215,0.35)]",
          dotClass: "bg-[#7F95FF] shadow-[0_0_8px_#7F95FF]"
        };
    }
  };

  const themeConfig = getHeaderIconTheme();

  const handleShortcutClick = (shortcutGameId: string, defaultTitle: string) => {
    const existing = activeGames.find(g => g.gameId === shortcutGameId);
    if (existing) {
      if (existing.isMinimized) {
        toggleMinimize(existing.id);
      }
      bringToFront(`minigame-${existing.id}`);
    } else {
      addGame({
        id: `${shortcutGameId}-${Date.now()}`,
        gameId: shortcutGameId,
        title: defaultTitle,
        isMinimized: false
      });
    }
  };

  const PINNED_SHORTCUTS = [
    { gameId: 'clicker', label: 'Cliques', title: 'Desafio de Cliques', icon: MousePointerClick, activeBg: 'border-[#52B1FF]/40 text-[#52B1FF] bg-[#52B1FF]/10' },
    { gameId: 'cards', label: 'Cartas', title: 'Escolha uma Carta', icon: Sparkles, activeBg: 'border-[#7F95FF]/40 text-[#7F95FF] bg-[#7F95FF]/10' },
    { gameId: 'coin_flip', label: 'Moeda', title: 'Cara ou Coroa', icon: Coins, activeBg: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
    { gameId: 'dial_lock', label: 'Lockpick', title: 'Lockpicker de Precisão', icon: KeyRound, activeBg: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  ];

  return (
    <motion.div
      drag={!isPinned}
      dragMomentum={false}
      dragElastic={0}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={constraintRef}
      onDragEnd={onDragEnd}
      onPointerDownCapture={() => bringToFront(menuKey)}
      onMouseDown={() => bringToFront(menuKey)}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: width,
        height: height,
        x,
        y,
        zIndex
      }}
      className={clsx(
        "flex flex-col overflow-hidden rounded-2xl select-none",
        "bg-neutral-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80",
        "min-w-[320px] min-h-[220px] max-w-[85vw] max-h-[85vh]"
      )}
    >
      {/* Title bar / Header with luminous icon and window action controls */}
      <div 
        onPointerDown={(e) => {
          bringToFront(menuKey);
          if (!isPinned) {
            startDragHeader(e, dragControls);
          }
        }}
        className={clsx(
          "flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.03] select-none touch-none",
          isPinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="flex items-center gap-2.5 pointer-events-none select-none">
          <div className={clsx("p-1.5 rounded-xl border flex items-center justify-center transition-all", themeConfig.badgeClass)}>
            {themeConfig.icon}
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx("w-2 h-2 rounded-full animate-pulse", themeConfig.dotClass)} />
            <span className="font-semibold select-none text-xs sm:text-sm tracking-wide text-white drop-shadow-sm">
              {title}
            </span>
          </div>
        </div>

        {/* Action Controls: Pino (Pin), Minimizar (Minimize), Fechar (Close) */}
        <div className="flex items-center gap-1.5">
          {/* Pino Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(!isPinned);
            }}
            className={clsx(
              "p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center",
              isPinned
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                : "bg-white/5 border-white/10 text-neutral-400 hover:text-amber-300 hover:bg-white/10 hover:border-white/20"
            )}
            title={isPinned ? "Fixado no Canvas (Clique para destravar drag)" : "Fixar Posição da Janela"}
          >
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>

          {/* Minimizar Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize(id);
            }} 
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-center"
            title="Minimizar"
          >
            <Minus size={14} />
          </button>

          {/* Fechar Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeGame(id);
            }} 
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer flex items-center justify-center"
            title="Fechar Janela"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Atalhos de Minigames Fixados Strip */}
      <div 
        ref={shortcutsStripRef}
        className="px-3 py-1.5 border-b border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mr-1 select-none flex items-center gap-1">
          <Gamepad2 size={11} className="text-[#7F95FF]" />
          Atalhos:
        </span>
        {PINNED_SHORTCUTS.map(sc => {
          const Icon = sc.icon;
          const isActive = game.gameId === sc.gameId;
          return (
            <button
              key={sc.gameId}
              type="button"
              onClick={() => handleShortcutClick(sc.gameId, sc.title)}
              className={clsx(
                "px-2 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
                isActive 
                  ? sc.activeBg
                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20"
              )}
              title={`Alternar / Abrir ${sc.title}`}
            >
              <Icon size={12} />
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto flex flex-col">
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 p-2 cursor-nwse-resize text-gray-400 hover:text-white transition-colors touch-none"
        onPointerDown={handleResizeStart as any}
        title="Redimensionar Janela"
      >
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M 10 0 L 10 10 L 0 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
    </motion.div>
  );
};

