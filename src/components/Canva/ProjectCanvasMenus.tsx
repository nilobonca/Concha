import React from 'react';
import { useRouter } from 'next/router';
import { 
  Layers, Edit2, ArrowLeft, MapPin, History, Music, LayoutGrid, PenTool, MousePointer2, Globe, Headphones, Settings, Gamepad2, Coins, KeyRound, BookOpen
} from 'lucide-react';
import { useMinigamesStore } from '@/store/minigamesStore';
import { SafeIcon } from '@/components/common/SafeIcon';
import { navigateToVault } from '@/utils/navigationHelper';
import { ClickerMinigameHost } from './ClickerMinigameHost';
import { CoinFlipMinigameHost } from './CoinFlipMinigameHost';
import { CardsMinigameHost } from './CardsMinigameHost';
import { DialLockpickerHost } from './DialLockpickerHost';
import { useThemeStore } from '@/store/themeStore';
import clsx from 'clsx';
import { useCanvasUI } from '@/hooks/useCanvasUI';
import ListenersMenu from '@/components/ListenersMenu';
import HeaderCab from '@/components/header';
import Soundboard from '@/components/Soundboard';
import ActivePlayersMenu from '@/components/ActivePlayersMenu';
import HistoryMenu from '@/components/HistoryMenu';
import LayerManager from '@/components/LayerManager';
import { PinManager } from '@/components/PinManager';
import GlobalAudioMenu from '@/components/GlobalAudioMenu';
import { ActiveArea, ActiveImage, ActivePin, Audios, Layer, Players, SoundboardItem } from '@/interfaces/utils/indexedDB';

interface ProjectCanvasMenusProps {
  tool?: string;
  setTool?: (tool: any) => void;
  activeLayers: Layer[];

  tempName: string;
  setTempName: (s: string) => void;
  // NOTE: handleSaveName was passed as handleNameSave in the previous fix! 
  // Let me just add handleSaveName because that's what [id].tsx exports. Wait, the old code had handleNameSave inside ProjectCanvasMenus Props.

  isEditingName: boolean;
  setIsEditingName: (b: boolean) => void;
  projectName: string;
  setProjectName: (s: string) => void;
  handleSaveName: () => void;
  clearConfirmation: any;
  setClearConfirmation: (c: any) => void;
  confirmClear: () => void;

  // Required props for menus
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  projectId: string | string[] | undefined;
  
  // Layer Manager
  handleLayerAction: (layer: Layer) => void;
  addToHistory: (actionInfo: any) => void;
  handleClearRequest: (e: React.MouseEvent, pageId?: string) => void;
  
  // Pin Manager
  activePins: ActivePin[];
  updatePinPersisted: (pin: ActivePin) => void;
  deletePinPersisted: (id: string) => void;

  // History
  history: any[];
  future: any[];
  handleUndo: () => void;
  handleRedo: () => void;
  handleRestoreHistory: (state: any, index: number, type: 'history' | 'future') => void;

  // Listeners
  isSessionActive: boolean;
  sessionListeners: Array<{ listenerId: string, name: string, status?: string }>;
  listenerPings: Record<string, number>;
  handleLocateListener: (listenerId: string) => void;
  handleKickListener: (listenerId: string) => void;

  // HeaderCab (Assets)
  handleDragStart: (e: React.DragEvent, item: any, type: 'image' | 'audio') => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, isImage?: boolean) => void;
  isLoading: boolean;
  setMessage: (msg: string) => void;
  savedAudios: Audios[];
  deleteAudio: (id: number) => void;
  activeAudioIds: Set<number>;
  proximityVolumes: Map<number, number>;
  highlightedAudioId: number | null;
  setContextMenu: (menu: any) => void;

  // Soundboard
  editingSoundboardItemId: string | null;
  handleRenameSoundboardItem: (id: string, newName: string) => void;

  // Active Players
  activePlayers: Players[];
  activeAreas: ActiveArea[];
  activeAreaIds: Set<string>;
  spatialPans: Map<number, number>;
  spatial3D?: Map<number, {x: number, y: number}>;
  is3DEnabled?: boolean;
  audioFilters: Map<number, 'none' | 'lowpass' | 'wall' | 'telephone'>;
  deletePlayer: (id: string) => void;
  deleteArea: (id: string) => void;
  handleUpdateArea: (area: ActiveArea) => void;
  handleLocatePlayer: (x: number, y: number) => void;
  isPreviewMode?: boolean;
}

export const ProjectCanvasMenus: React.FC<ProjectCanvasMenusProps> = ({
  activeLayers,
  tempName, setTempName,
  isEditingName, setIsEditingName, projectName, setProjectName, handleSaveName, clearConfirmation, setClearConfirmation, confirmClear,
  activeProjectId, setActiveProjectId, projectId,
  handleLayerAction, addToHistory, handleClearRequest,
  activePins, updatePinPersisted, deletePinPersisted,
  history, future, handleUndo, handleRedo, handleRestoreHistory,
  isSessionActive, sessionListeners, listenerPings, handleLocateListener, handleKickListener,
  handleDragStart, handleFileChange, isLoading, setMessage, savedAudios, deleteAudio, activeAudioIds, proximityVolumes, highlightedAudioId, setContextMenu,
  editingSoundboardItemId, handleRenameSoundboardItem,
  activePlayers, activeAreas, activeAreaIds, spatialPans,
  spatial3D,
  is3DEnabled, audioFilters, deletePlayer, deleteArea, handleUpdateArea,
  handleLocatePlayer,
  tool, setTool,
  isPreviewMode
}) => {
  const router = useRouter();
  
  const {
    layerManagerOpen, setLayerManagerOpen,
    pinManagerOpen, setPinManagerOpen,
    historyOpen, setHistoryOpen,
    activePlayersOpen, setActivePlayersOpen,
    soundboardOpen, setSoundboardOpen,
    globalTracksOpen, setGlobalTracksOpen,
    headerOpen, setHeaderOpen,
    listenersOpen, setListenersOpen,
    listenerSettingsOpen, setListenerSettingsOpen,
    mobileMenuOpen, setMobileMenuOpen,
    menuZIndices, bringToFront
  } = useCanvasUI(projectId);

  const { theme, pinnedMinigames } = useThemeStore();
  const { activeGames, toggleMinimize } = useMinigamesStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isEthereal = false;

  const buttonClass = clsx(
    "p-3 shadow-lg transition-all duration-200 hover:scale-105 pointer-events-auto",
    isEthereal 
      ? "bg-white/5 hover:bg-white/10 border border-white/10 rounded-[1.5rem] text-white/60 hover:text-white backdrop-blur-md"
      : "bg-white dark:bg-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-200"
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>



      {/* Mobile Overlay */}
      {(layerManagerOpen || pinManagerOpen || mobileMenuOpen) && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setLayerManagerOpen(false);
            setPinManagerOpen(false);
            setMobileMenuOpen(false);
          }}
        />
      )}

      {/* Layer Manager - Floating */}
      {layerManagerOpen && (
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ zIndex: menuZIndices.layer }}
          onMouseDown={() => bringToFront('layer')}
        >
          <LayerManager
            onLayerAction={handleLayerAction}
            onInteraction={() => bringToFront('layer')}
            onClose={() => setLayerManagerOpen(false)}
            activeProjectId={activeProjectId}
            onSelectProject={setActiveProjectId}
            projectGroupId={typeof projectId === 'string' ? projectId : null}
            addToHistory={addToHistory}
            onClearCanvas={handleClearRequest} // Passed for structure menu
          />
        </div>
      )}



      

      {/* Listeners Menu - Floating */}
      {listenersOpen && isSessionActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: menuZIndices.listeners }}
          onMouseDown={() => bringToFront('listeners')}
        >
          <ListenersMenu
            listeners={sessionListeners.map(l => ({ ...l, ping: listenerPings[l.listenerId] ?? null }))}
            onClose={() => setListenersOpen(false)}
            onLocateListener={handleLocateListener}
            onKickListener={handleKickListener}
            onInteraction={() => bringToFront('listeners')}
          />
        </div>
      )}






      {/* HeaderCab - Floating (Assets) */}
      {headerOpen && (
        <div
          className="hidden md:block absolute inset-0 pointer-events-none"
          style={{ zIndex: menuZIndices.header }}
        >
          <HeaderCab
            HandleDragStart={handleDragStart}
            HandleFileChange={handleFileChange}
            IsLoading={isLoading}
            SetMessage={setMessage}
            SavedAudios={savedAudios}
            DeleteAudio={deleteAudio}
            activeAudioIds={activeAudioIds}
            proximityVolumes={proximityVolumes}
            highlightedAudioId={highlightedAudioId}
            onInteraction={() => bringToFront('header')}
            onClose={() => setHeaderOpen(false)}
            onAssetContextMenu={(e, id, type) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                screenX: e.clientX,
                screenY: e.clientY,
                worldX: 0,
                worldY: 0,
                type: type === 'audio' ? 'asset-audio' : type === 'image' ? 'asset-image' : 'asset-folder',
                itemId: id.toString()
              });
            }}
          />
        </div>
      )}

      {/* Soundboard - Floating */}
      {soundboardOpen && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: menuZIndices.soundboard }}
          onMouseDown={() => bringToFront('soundboard')}
        >
          <Soundboard
            onClose={() => setSoundboardOpen(false)}
            onItemContextMenu={(e, itemId) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                screenX: e.clientX,
                screenY: e.clientY,
                worldX: 0,
                worldY: 0,
                type: 'soundboard-def',
                itemId: itemId
              });
            }}
            editingItemId={editingSoundboardItemId}
            onRename={handleRenameSoundboardItem}
            onInteraction={() => bringToFront('soundboard')}
          />
        </div>
      )}

      {/* Global Audio Menu - Always mounted to persist audio playback */}
      <GlobalAudioMenu 
          projectId={projectId as string} 
          onClose={() => setGlobalTracksOpen(false)}
          onInteraction={() => bringToFront('globalTracks')}
          zIndex={menuZIndices.globalTracks || 50}
          isVisible={globalTracksOpen}
          isPreviewInstance={isPreviewMode}
      />

      {/* Active Players Menu - Floating (Always mounted to persist audio) */}
      <div
        className={`absolute inset-0 pointer-events-none ${activePlayersOpen ? '' : 'invisible'}`}
        style={{ zIndex: menuZIndices.activePlayers }}
        onMouseDown={() => bringToFront('activePlayers')}
      >
        <ActivePlayersMenu
          activePlayers={activePlayers}
          activeAreas={activeAreas}
          savedAudios={savedAudios}
          activeAudioIds={activeAudioIds}
          activeAreaIds={activeAreaIds}
          proximityVolumes={proximityVolumes}
          spatialPans={spatialPans}
            spatial3D={spatial3D}
            is3DEnabled={is3DEnabled}
          audioFilters={audioFilters}
          onClose={() => setActivePlayersOpen(false)}
          onInteraction={() => bringToFront('activePlayers')}
          onLocatePlayer={(x, y) => {
            handleLocatePlayer(x, y);
          }}
          onDeletePlayer={(id, type) => {
            if (type === 'player') deletePlayer(id);
            else if (type === 'area') deleteArea(id);
          }}
          onUpdateArea={handleUpdateArea}
          isPreviewInstance={isPreviewMode}
        />
      </div>



      {/* Minigames Overlay */}
      {activeGames.map(game => {
        if (game.gameId === 'coin_flip') {
          return <CoinFlipMinigameHost key={game.id} id={game.id} sessionListeners={sessionListeners} />;
        } else if (game.gameId === 'cards') {
          return <CardsMinigameHost key={game.id} id={game.id} sessionListeners={sessionListeners} />;
        } else if (game.gameId === 'dial_lock') {
          return <DialLockpickerHost key={game.id} id={game.id} sessionListeners={sessionListeners} />;
        }
        return <ClickerMinigameHost key={game.id} id={game.id} sessionListeners={sessionListeners} />;
      })}

      {/* Desktop Dock Bar - Bottom Left */}
      <div className="hidden md:flex fixed left-4 bottom-4 z-50 flex-col gap-2">
        {/* Layer Manager Toggle */}
        {!layerManagerOpen && (
          <button
            onClick={() => { bringToFront('layer'); setLayerManagerOpen(true); }}
            className={buttonClass}
            title="Abrir Camadas"
          >
            <Layers size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Pin Manager Toggle */}
        {!pinManagerOpen && (
          <button
            onClick={() => { bringToFront('pin'); setPinManagerOpen(true); }}
            className={buttonClass}
            title="Abrir Pins"
          >
            <MapPin size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* History Toggle */}
        {!historyOpen && (
          <button
            onClick={() => { bringToFront('history'); setHistoryOpen(true); }}
            className={buttonClass}
            title="Abrir Histórico"
          >
            <History size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Soundboard Toggle */}
        {!soundboardOpen && (
          <button
            onClick={() => { bringToFront('soundboard'); setSoundboardOpen(true); }}
            className={buttonClass}
            title="Abrir Soundboard"
          >
            <Music size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Global Tracks Toggle */}
        {!globalTracksOpen && (
          <button
            onClick={() => { bringToFront('globalTracks'); setGlobalTracksOpen(true); }}
            className={buttonClass}
            title="Abrir Áudio Global"
          >
            <Globe size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        
        {/* Active Players Toggle */}
        {!activePlayersOpen && (
          <button
            onClick={() => { bringToFront('activePlayers'); setActivePlayersOpen(true); }}
            className={buttonClass}
            title="Abrir Players Ativos"
          >
            {/* Using Volume2 icon for Active Players */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M 15.54 8.46 a 5 5 0 0 1 0 7.07"></path><path d="M 19.07 4.93 a 10 10 0 0 1 0 14.14"></path></svg>
          </button>
        )}

        {/* Header/Assets Toggle */}
        {!headerOpen && (
          <button
            onClick={() => { bringToFront('header'); setHeaderOpen(true); }}
            className={buttonClass}
            title="Abrir Assets"
          >
            <LayoutGrid size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Vault Navigation Toggle */}
        <button
          onClick={() => navigateToVault(router)}
          className={clsx(buttonClass, "border-[#1831D7]/30 hover:border-[#7F95FF]/60")}
          title="Abrir Vault de Anotações"
        >
          <SafeIcon size={20} className="text-[#7F95FF]" />
        </button>

        {/* Minimized Minigames */}
        {activeGames.map(game => game.isMinimized && (
          <button
            key={game.id}
            onClick={() => toggleMinimize(game.id)}
            className={clsx(buttonClass, "relative border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]")}
            title={`Abrir ${game.title || 'Desafio'}`}
          >
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <Gamepad2 size={20} className={isEthereal ? "text-blue-400" : "text-blue-500"} />
          </button>
        ))}

        {/* Add Clicker Minigame Toggle */}
        {pinnedMinigames?.includes('clicker') && (
          <button
            onClick={() => {
              const newId = `clicker_${Date.now()}`;
              useMinigamesStore.getState().addGame({
                id: newId,
                gameId: 'clicker',
                title: 'Desafio de Cliques',
                isMinimized: false,
                status: 'idle',
                config: { targetClicks: 100, timeLimit: 30 }
              });
            }}
            className={buttonClass}
            title="Novo Desafio de Cliques"
          >
            <MousePointer2 size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Add Coin Flip Toggle */}
        {pinnedMinigames?.includes('coin_flip') && (
          <button
            onClick={() => {
              const newId = `coin_flip_${Date.now()}`;
              useMinigamesStore.getState().addGame({
                id: newId,
                gameId: 'coin_flip',
                title: 'Cara ou Coroa',
                isMinimized: false,
                status: 'idle',
                config: { maxFlips: 1, permissions: {} }
              });
            }}
            className={buttonClass}
            title="Novo Cara ou Coroa"
          >
            <Coins size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Add Cards Toggle */}
        {pinnedMinigames?.includes('cards') && (
          <button
            onClick={() => {
              const newId = `cards_${Date.now()}`;
              useMinigamesStore.getState().addGame({
                id: newId,
                gameId: 'cards',
                title: 'Escolha uma Carta',
                isMinimized: false,
                status: 'idle',
                config: { permissions: {} }
              });
            }}
            className={buttonClass}
            title="Novo Jogo de Cartas"
          >
            <Gamepad2 size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
          </button>
        )}

        {/* Add Dial Lock Toggle */}
        {pinnedMinigames?.includes('dial_lock') && (
          <button
            onClick={() => {
              const newId = `dial_lock_${Date.now()}`;
              useMinigamesStore.getState().addGame({
                id: newId,
                gameId: 'dial_lock',
                title: 'Lockpicker de Precisão',
                isMinimized: false,
                status: 'idle',
                config: { stages: 3, tolerance: 6, maxAttempts: 5, permissions: {} }
              });
            }}
            className={buttonClass}
            title="Novo Lockpicker de Precisão"
          >
            <KeyRound size={20} className={isEthereal ? "text-amber-400" : "text-amber-500"} />
          </button>
        )}

        {/* Settings Toggle */}
        <button
          onClick={() => useThemeStore.getState().setIsSettingsOpen(true)}
          className={clsx(buttonClass, "mt-auto")}
          title="Configurações de Tema"
        >
          <Settings size={20} className={isEthereal ? "" : "text-gray-700 dark:text-neutral-200"} />
        </button>
      </div>
    </>
  );
};
