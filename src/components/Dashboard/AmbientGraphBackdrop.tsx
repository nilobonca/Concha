import React, { useRef, useState, useEffect } from 'react';
import {
  useAmbientGraphSimulation,
  RealGraphNodeItem,
  RealGraphLinkItem,
} from './useAmbientGraphSimulation';
import { GraphControlsOverlay } from './GraphControlsOverlay';
import { GraphNodeTooltip } from './GraphNodeTooltip';
import { Compass, Loader2 } from 'lucide-react';
import { WindowControls } from '@/components/common/WindowControls';
import { isElectron } from '@/utils/electronHelper';
import clsx from 'clsx';

export type { RealGraphNodeItem, RealGraphLinkItem };

export interface AmbientGraphBackdropProps {
  className?: string;
  vaultName?: string;
  customNodeTitles?: string[];
  realNodes?: RealGraphNodeItem[];
  realLinks?: RealGraphLinkItem[];
  featuredCards?: unknown; // Deprecated: cards removed in favor of real connection graph
  isLoading?: boolean;
  onSelectNode?: (pathOrTitle: string, isCanvas?: boolean) => void;
  defaultShowCards?: boolean; // Deprecated
}

export const AmbientGraphBackdrop: React.FC<AmbientGraphBackdropProps> = ({
  className,
  vaultName = 'Campanha de Baróvia',
  customNodeTitles,
  realNodes,
  realLinks,
  isLoading = false,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isElec, setIsElec] = useState(false);

  useEffect(() => {
    setIsElec(isElectron());
  }, []);

  const {
    resetView,
    zoomIn,
    zoomOut,
    isPlaying,
    togglePlayPause,
    searchQuery,
    setSearchQuery,
    hoveredNode,
    nodeCount,
    linkCount,
  } = useAmbientGraphSimulation({
    canvasRef,
    containerRef,
    customNodeTitles,
    realNodes,
    realLinks,
    vaultName,
    onSelectNode,
  });

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full h-full min-h-[560px] overflow-hidden select-none bg-[#17192A]",
        "border-l border-white/[0.05] transition-colors duration-500",
        className
      )}
      style={{ backgroundColor: '#17192A' }}
    >
      {/* Top subtle synchronization shimmer line when loading */}
      {isLoading && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#7F95FF]/80 to-transparent animate-pulse z-40" />
      )}

      {/* Deep Atmospheric Gradient Glow Orbs with Brand Colors */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute -top-32 -left-20 w-[550px] h-[550px] rounded-full blur-[140px] opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(82, 177, 255, 0.14) 0%, rgba(23, 25, 42, 0) 70%)' }}
        />
        <div 
          className="absolute top-1/3 -right-24 w-[600px] h-[600px] rounded-full blur-[160px] opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(127, 149, 255, 0.12) 0%, rgba(23, 25, 42, 0) 70%)' }}
        />
        <div 
          className="absolute -bottom-24 left-1/4 w-[500px] h-[500px] rounded-full blur-[130px] opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(0, 31, 255, 0.10) 0%, rgba(23, 25, 42, 0) 70%)' }}
        />
      </div>

      {/* Subtle Arcane Grid Motif */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.025] z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* High-Performance Canvas for Connection Graph (D3 Force Simulation) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 w-full h-full block touch-none"
      />

      {/* Node Tooltip on Hover */}
      <GraphNodeTooltip node={hoveredNode} />

      {/* Top Floating Ambient HUD Bar */}
      <header 
        className="relative z-30 flex items-center justify-between px-6 pt-4 pb-3 pointer-events-auto select-none app-region-drag"
      >
        <div 
          className="flex items-center gap-3 pointer-events-auto app-region-no-drag"
        >
          {/* Status do Vault */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08] shadow-lg text-xs">
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7F95FF]" />
                <span className="font-semibold text-neutral-200 tracking-wide">
                  {vaultName}
                </span>
                <span className="text-[10px] uppercase font-bold text-[#7F95FF] tracking-widest pl-1 border-l border-white/10 animate-pulse">
                  Sincronizando
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="font-semibold text-neutral-200 tracking-wide">
                  {vaultName}
                </span>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest pl-1 border-l border-white/10">
                  Grafo de Conexões
                </span>
              </>
            )}
          </div>

          {/* Connection Graph Navigation & Filter Controls */}
          {nodeCount > 0 && (
            <GraphControlsOverlay
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetView={resetView}
              isPlaying={isPlaying}
              onTogglePlayPause={togglePlayPause}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              nodeCount={nodeCount}
              linkCount={linkCount}
            />
          )}
        </div>

        {/* Centro: Área Livre de Drag da Janela */}
        <div 
          className="flex-1 h-full min-w-8 app-region-drag cursor-default"
          title="Arrastar Janela"
        />

        {/* Lado Direito: controles de janela integrados (.exe Electron) */}
        {isElec && (
          <div 
            className="pointer-events-auto flex items-center shrink-0 app-region-no-drag"
          >
            <div 
              className="p-1 px-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.08] shadow-lg flex items-center"
            >
              <WindowControls variant="compact" />
            </div>
          </div>
        )}
      </header>

      {/* Bottom Floating Ambient Hint */}
      {nodeCount > 0 && (
        <footer className="absolute bottom-4 inset-x-6 z-30 flex items-center justify-between pointer-events-none text-[11px] text-neutral-500">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Compass className="w-3.5 h-3.5 text-[#7F95FF]/70" />
            <span className="hidden md:inline">
              Arraste os nós para interagir • Arraste o fundo para mover • Roda do mouse para zoom • Clique para abrir
            </span>
            <span className="md:hidden">
              Arraste os nós ou dê zoom no grafo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7F95FF]/50" />
            <span className="text-[10px] tracking-wider uppercase">Grafo GPU 60fps</span>
          </div>
        </footer>
      )}
    </div>
  );
};
