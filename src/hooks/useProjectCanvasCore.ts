import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useIDB } from '@/utils/indexedDB';
import { useCanvasUI } from '@/hooks/useCanvasUI';
import { useCanvasSelection } from '@/hooks/useCanvasSelection';
import { useProjectState } from '@/hooks/useProjectState';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { useWebRTCHostSession } from '@/hooks/useWebRTCHostSession';
import { useWebRTCAudioStreamer } from '@/hooks/useWebRTCAudioStreamer';
import { useCanvasItemHandlers } from '@/hooks/useCanvasItemHandlers';
import { useCanvasCreators } from '@/hooks/useCanvasCreators';
import { useCanvasDragAndDrop } from '@/hooks/useCanvasDragAndDrop';
import { useCanvasShortcuts } from '@/hooks/useCanvasShortcuts';
import { useCanvasModeration } from '@/hooks/useCanvasModeration';
import { useLayerManagerActions } from '@/hooks/useLayerManagerActions';
import { useCanvasDrawingTools } from '@/hooks/useCanvasDrawingTools';
import { useCanvasSelectionBox } from '@/hooks/useCanvasSelectionBox';
import { useBatchAudioUpload } from '@/hooks/useBatchAudioUpload';
import { useCanvasGlobalStore } from '@/store/canvasStore';
import { useMinigamesStore } from '@/store/minigamesStore';
import { useThemeStore } from '@/store/themeStore';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { ActiveImage } from '@/interfaces/utils/indexedDB';

export const useProjectCanvasCore = () => {
  const router = useRouter();
  const { id: projectId } = router.query;

  const {
    chatMessages, setChatMessages, isChatOpen, setIsChatOpen,
    hasUnreadMessages, setHasUnreadMessages, chatClearedAt, setChatClearedAt,
    saveChatHistory, setSaveChatHistory, chatSoundEnabled, setChatSoundEnabled,
    isChatOpenRef, saveChatHistoryRef, chatSoundEnabledRef,
    toggleChat, playPing, handleHostSendMessage, handleToggleSaveChat,
    handleIncomingChatMessage, connectionsRef
  } = useWebRTCHostSession(projectId);

  const isTheaterMode = useCanvasGlobalStore(state => state.isTheaterMode);
  const setIsTheaterMode = useCanvasGlobalStore(state => state.setIsTheaterMode);

  const setBroadcastEvent = useMinigamesStore(state => state.setBroadcastEvent);
  useEffect(() => {
    setBroadcastEvent((event) => {
      if (connectionsRef.current) {
        Object.values(connectionsRef.current).forEach((conn: any) => {
          if (conn && conn.open) conn.send(event);
        });
      }
    });
  }, [setBroadcastEvent, connectionsRef]);

  const isEthereal = false;

  const [isDiceTrayOpen, setIsDiceTrayOpen] = useState(false);

  const idb = useIDB();
  const ui = useCanvasUI(projectId);
  const selection = useCanvasSelection();
  const [projectName, setProjectName] = useState('Projeto Sem Nome');

  const projectState = useProjectState(
    projectId, idb.activeLayers, idb.isLoading, idb.addLayer, idb.updateLayer, idb.resetCanvas
  );

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [listenersOpen, setListenersOpen] = useState(false);
  const [sessionListeners, setSessionListeners] = useState<{ listenerId: string; name: string }[]>([]);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [listenerPings, setListenerPings] = useState<Record<string, number>>({});

  const batchUpload = useBatchAudioUpload({ saveAudio: idb.saveAudio });
  const canvasRef = useRef<any>(null);

  const historyHook = useCanvasHistory({
    currentState: {
      activePlayers: idb.activePlayers, activeImages: idb.activeImages,
      activeAreas: idb.activeAreas, activePins: idb.activePins,
      activeLayers: idb.activeLayers, activeSoundboardItems: idb.activeSoundboardItems,
      activeNotes: idb.activeNotes, activeGlobalTracks: idb.activeGlobalTracks,
      activeWalls: idb.activeWalls
    },
    restoreCanvasState: idb.restoreCanvasState
  });

  const streamer = useWebRTCAudioStreamer({
    isSessionActive, projectId, activeProjectId: projectState.activeProjectId,
    sessionListeners, setSessionListeners, savedAudios: idb.savedAudios,
    activePins: idb.activePins, addPinPersisted: idb.addPinPersisted,
    deletePinPersisted: idb.deletePinPersisted, connectionsRef,
    setListenerPings, isPreviewMode: idb.isPreviewMode, isLoading: idb.isLoading,
    handleIncomingChatMessage
  });

  const dragStartPositions = useRef<Record<string, any>>({});

  const itemHandlers = useCanvasItemHandlers({
    dragStartPositions, selectedItemIds: selection.selectedItemIds,
    calculateInteractions: streamer.calculateInteractions, projectId
  });

  const creators = useCanvasCreators({
    activeProjectId: projectState.activeProjectId, addToHistory: historyHook.addToHistory,
    addAreaPersisted: idb.addAreaPersisted, addPinPersisted: idb.addPinPersisted,
    addNotePersisted: idb.addNotePersisted, addSoundboardItem: idb.addSoundboardItem,
    addSoundboardItemPersisted: idb.addSoundboardItemPersisted, soundboardItems: idb.soundboardItems,
    activeSoundboardItems: idb.activeSoundboardItems, updateSoundboardItem: idb.updateSoundboardItem,
    savedAudios: idb.savedAudios, activeAreas: idb.activeAreas,
    handleUpdateArea: itemHandlers.handleUpdateArea, setContextMenu: projectState.setContextMenu,
    setSelectedItemIds: selection.setSelectedItemIds, activePins: idb.activePins,
    setEditingSoundboardItemId: selection.setEditingSoundboardItemId
  });

  const drawingTools = useCanvasDrawingTools({
    activeProjectId: projectState.activeProjectId, addToHistory: historyHook.addToHistory,
    addAreaPersisted: idb.addAreaPersisted, addWallPersisted: idb.addWallPersisted,
    activeAreas: idb.activeAreas, activeWalls: idb.activeWalls,
    isPreviewMode: idb.isPreviewMode, startPreview: idb.startPreview, discardPreview: idb.discardPreview
  });

  const dragAndDrop = useCanvasDragAndDrop({
    activeProjectId: projectState.activeProjectId, selectedItemIds: selection.selectedItemIds,
    setSelectedItemIds: selection.setSelectedItemIds, activeImages: idb.activeImages,
    activePins: idb.activePins, activeAreas: idb.activeAreas, activeWalls: idb.activeWalls,
    activeSoundboardItems: idb.activeSoundboardItems, savedImages: idb.savedImages,
    savedAudios: idb.savedAudios, soundboardItems: idb.soundboardItems,
    addToHistory: historyHook.addToHistory, addImagePersisted: idb.addImagePersisted,
    addAreaPersisted: idb.addAreaPersisted, addSoundboardItemPersisted: idb.addSoundboardItemPersisted,
    addNotePersisted: idb.addNotePersisted, activeNotes: idb.activeNotes, createPin: creators.createPin,
    saveAudio: idb.saveAudio, saveImage: idb.saveImage, setPendingUploads: batchUpload.setPendingUploads,
    tool: drawingTools.tool, currentAreaPoints: drawingTools.currentAreaPoints
  });

  useCanvasShortcuts({
    selectedItemIds: selection.selectedItemIds, setSelectedItemIds: selection.setSelectedItemIds,
    activePlayers: idb.activePlayers, activeImages: idb.activeImages, activeAreas: idb.activeAreas,
    activePins: idb.activePins, activeNotes: idb.activeNotes, activeSoundboardItems: idb.activeSoundboardItems,
    activeWalls: idb.activeWalls, deletePlayer: idb.deletePlayer, deleteImagePersisted: idb.deleteImagePersisted,
    deleteArea: idb.deleteArea, deletePinPersisted: idb.deletePinPersisted, deleteNotePersisted: idb.deleteNotePersisted,
    deleteSoundboardItemPersisted: idb.deleteSoundboardItemPersisted, deleteWallPersisted: idb.deleteWallPersisted,
    addToHistory: historyHook.addToHistory, handleUndo: historyHook.handleUndo, handleRedo: historyHook.handleRedo,
    toggleDiceTray: () => setIsDiceTrayOpen(prev => !prev), toggleChat: () => toggleChat(!isChatOpen),
    setTool: drawingTools.setTool as any, isPreviewMode: idb.isPreviewMode, startPreview: idb.startPreview,
    discardPreview: idb.discardPreview, isTheaterMode, setIsTheaterMode,
    stopAllAudio: () => {
      idb.activeGlobalTracks.forEach(track => {
        if (track.isPlaying) idb.updateGlobalTrackPersisted({ ...track, isPlaying: false });
      });
    },
    updateNotePersisted: idb.updateNotePersisted,
    updateImagePersisted: idb.updateImagePersisted,
    updatePinPersisted: idb.updatePinPersisted,
    updateSoundboardItemPersisted: idb.updateSoundboardItemPersisted,
  });

  useEffect(() => {
    const vaultStore = useVaultStore.getState();
    if (!vaultStore.provider) {
      vaultStore.initializeStorage();
    }
  }, []);

  const moderation = useCanvasModeration({ activePins: idb.activePins, connectionsRef, canvasRef });
  const handleEditImage = (id: string) => selection.setEditingImageId(id);
  const layerActions = useLayerManagerActions({
    activeAreas: idb.activeAreas, activePins: idb.activePins, activeImages: idb.activeImages,
    setActiveAreaIds: selection.setActiveAreaIds, handleEditImage
  });

  const selectionBox = useCanvasSelectionBox({
    activeImages: idb.activeImages, activePins: idb.activePins, activeAreas: idb.activeAreas,
    activeSoundboardItems: idb.activeSoundboardItems, activeNotes: idb.activeNotes,
    selectedItemIds: selection.selectedItemIds, setSelectedItemIds: selection.setSelectedItemIds
  });

  const changePositionImage = (image: ActiveImage, position: { x: number; y: number }) => {
    const foundImage = idb.activeImages.find((i: ActiveImage) => i.id === image.id);
    if (foundImage) {
      idb.updateImagePersisted({ ...foundImage, position: { x: position.x, y: position.y } });
    }
  };

  const projectGlobalTracks = useMemo(() => {
    return idb.activeGlobalTracks.filter(t => t.projectId === (projectId ? projectId.toString() : "0") || !t.projectId);
  }, [idb.activeGlobalTracks, projectId]);

  const realProjectGlobalTracks = useMemo(() => {
    return idb.realActiveGlobalTracks.filter(t => t.projectId === (projectId ? projectId.toString() : "0") || !t.projectId);
  }, [idb.realActiveGlobalTracks, projectId]);

  const interactionsDependenciesHash = useMemo(() => {
    const pinsStr = idb.activePins.map(p => `${p.id}:${p.position.x},${p.position.y}:${p.enabled}`).join('|');
    const areasStr = idb.activeAreas.map(a => `${a.id}:${a.points.map(pt => `${pt.x},${pt.y}`).join(';')}:${a.audioRotation}:${a.filterType}:${a.linkedAudioId}:${a.volumeMode}:${a.proximityRadius}:${a.volume}:${a.pitch}`).join('|');
    const wallsStr = idb.activeWalls.map(w => `${w.id}:${w.points.map(pt => `${pt.x},${pt.y}`).join(';')}:${w.mufflingFactor}`).join('|');
    const tracksStr = projectGlobalTracks.map(t => `${t.id}:${t.linkedAudioId}:${t.isPlaying}:${t.volume}`).join('|');
    const realTracksStr = realProjectGlobalTracks.map(t => `${t.id}:${t.linkedAudioId}:${t.isPlaying}:${t.volume}`).join('|');
    const realPinsStr = idb.realActivePins.map(p => `${p.id}:${p.position.x},${p.position.y}:${p.enabled}`).join('|');
    const realAreasStr = idb.realActiveAreas.map(a => `${a.id}:${a.points.map(pt => `${pt.x},${pt.y}`).join(';')}:${a.audioRotation}:${a.filterType}:${a.linkedAudioId}:${a.volumeMode}:${a.proximityRadius}:${a.volume}:${a.pitch}`).join('|');
    const realWallsStr = idb.realActiveWalls.map(w => `${w.id}:${w.points.map(pt => `${pt.x},${pt.y}`).join(';')}:${w.mufflingFactor}`).join('|');

    return `${pinsStr}#${areasStr}#${wallsStr}#${tracksStr}#${realPinsStr}#${realAreasStr}#${realWallsStr}#${realTracksStr}`;
  }, [idb.activePins, idb.activeAreas, idb.activeWalls, projectGlobalTracks, idb.realActivePins, idb.realActiveAreas, idb.realActiveWalls, realProjectGlobalTracks]);

  useEffect(() => {
    streamer.calculateInteractions(idb.activePins, idb.activeAreas, idb.activeWalls, projectGlobalTracks, idb.realActivePins, idb.realActiveAreas, idb.realActiveWalls, realProjectGlobalTracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionsDependenciesHash, streamer.calculateInteractions]);

  return {
    projectId, isTheaterMode, setIsTheaterMode, isEthereal, isDiceTrayOpen, setIsDiceTrayOpen,
    idb, ui, selection, projectName, setProjectName, projectState, isSessionActive, setIsSessionActive,
    showInviteModal, setShowInviteModal, listenersOpen, setListenersOpen, sessionListeners,
    cursorPosition, setCursorPosition, listenerPings, batchUpload, canvasRef, historyHook,
    streamer, dragStartPositions, itemHandlers, creators, drawingTools, dragAndDrop,
    moderation, handleEditImage, layerActions, selectionBox, changePositionImage,
    chatMessages, isChatOpen, hasUnreadMessages, chatClearedAt, handleHostSendMessage, toggleChat, setChatClearedAt,
    saveChatHistory, handleToggleSaveChat, chatSoundEnabled, setChatSoundEnabled, chatSoundEnabledRef
  };
};
