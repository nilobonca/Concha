import React, { createContext, useContext, useState, ReactNode, useRef, useCallback, useMemo, startTransition } from 'react';
import { 
    Audios, Images, Players, ActiveImage, ActiveArea, 
    ActivePin, ActiveWall, Layer, SoundboardItem, 
    ActiveSoundboardItem, ActiveNote, Poll, PollResponse, 
    PollQuestion, ActiveGlobalTrack, AssetFolder 
} from '../../interfaces/utils/indexedDB';

import { useIDBAssets } from './hooks/useIDBAssets';
import { useIDBCanvasState } from './hooks/useIDBCanvasState';
import { useIDBPreview } from './hooks/useIDBPreview';
import { useIDBConnection } from './hooks/useIDBConnection';
import { stopSoundboardAudio } from '@/components/Soundboard/activeAudios';
import { useLogSystem } from '../logSystem';
import { cleanLegacyPlaceholder } from '../cleanLegacyPlaceholder';

// The Context interface remains identical so that no component breaks
interface IDBContextProps {
    db: IDBDatabase | null;
    findaudio: (id: number) => Audios | undefined;
    deleteAudio: (id: number) => void;
    updateAudioPersisted: (audio: Audios) => void;
    deleteAll: () => void;
    resetCanvas: (pageId?: string) => void;
    isLoading: boolean;
    savedAudios: Audios[];
    findPlayer: (id: string) => Players | undefined;
    activePlayers: Players[];
    deletePlayer: (id: string) => void;
    addPlayerPersisted: (player: Players) => void;
    updatePlayerPersisted: (player: Players) => void;
    setMessage: (msg: string) => void;
    saveAudio: (file: File) => Promise<Audios | undefined>;
    handleSetActivePlayers: (players: Players[]) => void;
    setActiveAudios: React.Dispatch<React.SetStateAction<Audios[]>>;
    usageLog: string | undefined;
    saveImage: (file: File) => Promise<Images | undefined>;
    savedImages: Images[];
    deleteImage: (id: number) => void;
    assetFolders: AssetFolder[];
    addAssetFolder: (name: string) => Promise<AssetFolder | undefined>;
    updateAssetFolder: (folder: AssetFolder) => void;
    deleteAssetFolder: (id: string) => void;
    activeImages: ActiveImage[];
    addImagePersisted: (image: ActiveImage, parentId?: string | null) => void;
    updateImagePersisted: (image: ActiveImage) => void;
    deleteImagePersisted: (id: string) => void;
    handleSetActiveImages: (images: ActiveImage[]) => void;
    activeAreas: ActiveArea[];
    addAreaPersisted: (area: ActiveArea, parentId?: string | null) => void;
    updateAreaPersisted: (area: ActiveArea) => void;
    handleSetActiveAreas: (areas: ActiveArea[]) => void;
    deleteArea: (id: string) => void;
    activePins: ActivePin[];
    activeWalls: ActiveWall[];
    addWallPersisted: (wall: ActiveWall, parentId?: string | null) => void;
    updateWallPersisted: (wall: ActiveWall) => void;
    deleteWallPersisted: (id: string) => void;
    handleSetActiveWalls: (walls: ActiveWall[]) => void;
    addPinPersisted: (pin: ActivePin, parentId?: string | null) => void;
    updatePinPersisted: (pin: ActivePin) => void;
    deletePinPersisted: (id: string) => void;
    handleSetActivePins: (pins: ActivePin[]) => void;
    activeLayers: Layer[];
    addLayer: (layer: Layer) => void;
    updateLayer: (layer: Layer) => void;
    deleteLayer: (id: string) => void;
    reorderLayers: (layers: Layer[]) => void;
    reorderAudios: (audios: Audios[]) => void;
    reorderImages: (images: Images[]) => void;
    reorderPins: (pins: ActivePin[]) => void;
    exportCanvasState: () => Promise<void>;
    importCanvasState: (file: File) => Promise<void>;
    restoreCanvasState: (state: any) => Promise<void>;
    soundboardItems: SoundboardItem[];
    addSoundboardItem: (item: SoundboardItem) => void;
    updateSoundboardItem: (item: SoundboardItem) => void;
    deleteSoundboardItem: (id: string) => void;
    activeSoundboardItems: ActiveSoundboardItem[];
    addSoundboardItemPersisted: (item: ActiveSoundboardItem, parentId?: string | null) => void;
    updateSoundboardItemPersisted: (item: ActiveSoundboardItem) => void;
    deleteSoundboardItemPersisted: (id: string) => void;
    handleSetActiveSoundboardItems: (items: ActiveSoundboardItem[]) => void;
    activeNotes: ActiveNote[];
    addNotePersisted: (note: ActiveNote, parentId?: string | null) => void;
    updateNotePersisted: (note: ActiveNote) => void;
    deleteNotePersisted: (id: string) => void;
    handleSetActiveNotes: (notes: ActiveNote[]) => void;
    activeGlobalTracks: ActiveGlobalTrack[];
    addGlobalTrackPersisted: (track: ActiveGlobalTrack, parentId?: string | null) => void;
    updateGlobalTrackPersisted: (track: ActiveGlobalTrack) => void;
    deleteGlobalTrackPersisted: (id: string) => void;
    handleSetActiveGlobalTracks: (tracks: ActiveGlobalTrack[]) => void;
    isPreviewMode: boolean;
    startPreview: () => void;
    commitPreview: () => void;
    discardPreview: () => void;
    realActiveAreas: ActiveArea[];
    realActivePins: ActivePin[];
    realActiveImages: ActiveImage[];
    realActiveWalls: ActiveWall[];
    realActiveGlobalTracks: ActiveGlobalTrack[];
    realActivePlayers: Players[];
    realActiveNotes: ActiveNote[];
    realActiveSoundboardItems: ActiveSoundboardItem[];
    realActiveLayers: Layer[];
}

const IndexedDBContext = createContext<IDBContextProps | undefined>(undefined);

export const IDBProvider = ({ children }: { children: ReactNode }) => {
    const [db, setDb] = useState<IDBDatabase | null>(null);
    const [message, setMessage] = useState<string>('');
    const { usageLog } = useLogSystem();

    // Shared utility for updating items in persistedCanvas store
    const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dbRef = useRef<IDBDatabase | null>(null);
    dbRef.current = db;

    const flushUpdates = useCallback(() => {
        const currentDb = dbRef.current;
        if (!currentDb || pendingUpdatesRef.current.size === 0) return;
        if (!currentDb.objectStoreNames.contains('persistedCanvas')) return;
        const transaction = currentDb.transaction(['persistedCanvas'], 'readwrite');
        const store = transaction.objectStore('persistedCanvas');
        
        pendingUpdatesRef.current.forEach((item) => {
            store.put(item);
        });
        
        transaction.onerror = (e) => console.error("Erro no flush batch:", (e.target as IDBRequest).error);
        
        pendingUpdatesRef.current.clear();
        flushTimeoutRef.current = null;
    }, []);

    // Garante que atualizações pendentes sejam salvas caso a janela seja fechada ou recarregada (F5)
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            flushUpdates();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [flushUpdates]);

    // We must pass isPreviewModeRef down to hooks manually, because hooks will use it.
    // useIDBPreview manages its state, but we can hoist the ref.
    const isPreviewModeRef = useRef(false);

    const updateItemPersisted = useCallback((item: any, type: string, immediate: boolean = false) => {
        if (isPreviewModeRef.current) return;
        pendingUpdatesRef.current.set(item.id, item);
        if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
        if (immediate) {
            flushUpdates();
        } else {
            flushTimeoutRef.current = setTimeout(flushUpdates, 300);
        }
    }, [flushUpdates]);

    const deleteItemPersisted = useCallback((id: string) => {
        const currentDb = dbRef.current;
        if (isPreviewModeRef.current || !currentDb) return;
        if (!currentDb.objectStoreNames.contains('persistedCanvas')) return;
        const transaction = currentDb.transaction(['persistedCanvas'], 'readwrite');
        const store = transaction.objectStore('persistedCanvas');
        store.delete(id);
    }, []);

    // Hook 1: Assets
    // Use refs for the canvas setters to break the chicken-and-egg dependency
    // (assets needs canvas setters, canvas needs assets setters)
    const setActivePlayersRef = useRef<React.Dispatch<React.SetStateAction<any[]>>>(() => {});
    const setActiveImagesRef = useRef<React.Dispatch<React.SetStateAction<any[]>>>(() => {});

    const stableSetActivePlayers = useCallback((v: any) => setActivePlayersRef.current(v), []);
    const stableSetActiveImages = useCallback((v: any) => setActiveImagesRef.current(v), []);

    const assets = useIDBAssets(db, {
        setMessage,
        setActivePlayers: stableSetActivePlayers,
        setActiveImages: stableSetActiveImages,
        deleteItemPersisted
    });

    // Hook 2: Preview
    // Note: To avoid chicken/egg, CanvasState uses preview state. We must hoist realStates.
    // We will just let useIDBPreview handle everything and pass its setters.
    const [previewState, setPreviewState] = useState<any>(null);

    // Hook 3: Canvas State
    const canvas = useIDBCanvasState(
        db, 
        isPreviewModeRef, 
        setPreviewState, 
        updateItemPersisted, 
        deleteItemPersisted,
        assets.setSavedAudios,
        assets.setSavedImages
    );

    // Now that canvas is initialized, wire up the refs to the real canvas setters
    setActivePlayersRef.current = canvas.setActivePlayers;
    setActiveImagesRef.current = canvas.setActiveImages;

    // Hook 4: Preview (continued)
    const preview = useIDBPreview(db, canvas, canvas, isPreviewModeRef, previewState, setPreviewState);

    // Hook 5: Connection
    // Use destructured stable setters so loadCanvas doesn't depend on the entire canvas object
    const {
        setRealActivePlayers, setRealActiveImages, setRealActiveAreas,
        setRealActivePins, setRealActiveLayers, setRealActiveWalls,
        setRealActiveSoundboardItems, setRealActiveNotes, setRealActiveGlobalTracks,
        setSoundboardItems
    } = canvas;

    const loadCanvas = useCallback((database: IDBDatabase) => {
        return new Promise<void>((resolve) => {
            if (!database.objectStoreNames.contains('persistedCanvas')) {
                resolve();
                return;
            }
            const transaction = database.transaction(['persistedCanvas'], 'readonly');
            const store = transaction.objectStore('persistedCanvas');
            const request = store.getAll();

            request.onsuccess = () => {
                const items = request.result;
                const players: Players[] = [];
                const images: ActiveImage[] = [];
                const areas: ActiveArea[] = [];
                const pins: ActivePin[] = [];
                const walls: ActiveWall[] = [];
                const layers: Layer[] = [];
                const sbItems: ActiveSoundboardItem[] = [];
                const notes: ActiveNote[] = [];
                const globalTracks: ActiveGlobalTrack[] = [];

                items.forEach((item: any) => {
                    if (item.type === 'player') {
                        if (item.audio && item.audio.file) item.audio.url = URL.createObjectURL(item.audio.file);
                        players.push(item);
                    }
                    else if (item.type === 'image') {
                        if (item.image && item.image.file) item.image.url = URL.createObjectURL(item.image.file);
                        images.push(item);
                    }
                    else if (item.type === 'area') areas.push(item);
                    else if (item.type === 'pin') pins.push(item);
                    else if (item.type === 'wall') walls.push(item);
                    else if (item.type === 'layer' || item.type === 'group' || item.type === 'item') layers.push(item);
                    else if (item.type === 'soundboard') sbItems.push(item);
                    else if (item.type === 'note') {
                        const cleaned = cleanLegacyPlaceholder(item.content);
                        if (cleaned !== item.content) {
                            item.content = cleaned;
                            try {
                                const updateTx = database.transaction(['persistedCanvas'], 'readwrite');
                                updateTx.objectStore('persistedCanvas').put(item);
                            } catch (e) {
                                console.warn('Erro ao purgar placeholder legado da nota:', e);
                            }
                        }
                        notes.push(item);
                    }
                    else if (item.type === 'globalTrack') globalTracks.push(item);
                    else if (item.file) {
                        const player = item as Players;
                        if (player.audio && player.audio.file) player.audio.url = URL.createObjectURL(player.audio.file);
                        players.push(player);
                    }
                    else if (item.image) {
                        const img = item as ActiveImage;
                        if (img.image && img.image.file) img.image.url = URL.createObjectURL(img.image.file);
                        images.push(img);
                    }
                    else if (item.points) areas.push(item as ActiveArea);
                });

                layers.sort((a, b) => (b.order || 0) - (a.order || 0));

                setRealActivePlayers(players);
                setRealActiveImages(images);
                setRealActiveAreas(areas);
                setRealActivePins(pins);
                setRealActiveLayers(layers);
                setRealActiveSoundboardItems(sbItems);
                setRealActiveNotes(notes);
                setRealActiveGlobalTracks(globalTracks);
                resolve();
            };
        });
    }, [setRealActivePlayers, setRealActiveImages, setRealActiveAreas, setRealActivePins, setRealActiveLayers, setRealActiveSoundboardItems, setRealActiveNotes, setRealActiveGlobalTracks]);

    const loadSoundboardItems = useCallback((database: IDBDatabase) => {
        return new Promise<void>((resolve) => {
            if (!database.objectStoreNames.contains('soundboard')) { resolve(); return; }
            const transaction = database.transaction(['soundboard'], 'readonly');
            const store = transaction.objectStore('soundboard');
            const request = store.getAll();
            request.onsuccess = () => {
                setSoundboardItems(request.result);
                resolve();
            };
        });
    }, [setSoundboardItems]);

    const connection = useIDBConnection({
        db, setDb,
        savedAudios: assets.savedAudios,
        savedImages: assets.savedImages,
        soundboardItems: canvas.soundboardItems,
        activePlayers: canvas.realActivePlayers,
        activeImages: canvas.realActiveImages,
        activeAreas: canvas.realActiveAreas,
        activePins: canvas.realActivePins,
        activeLayers: canvas.realActiveLayers,
        activeSoundboardItems: canvas.realActiveSoundboardItems,
        activeNotes: canvas.realActiveNotes,
        activeGlobalTracks: canvas.realActiveGlobalTracks,
        activeWalls: canvas.realActiveWalls,
        setSavedAudios: assets.setSavedAudios,
        setActivePlayers: canvas.setRealActivePlayers,
        setActiveImages: canvas.setRealActiveImages,
        setActiveAreas: canvas.setRealActiveAreas,
        setActivePins: canvas.setRealActivePins,
        setActiveSoundboardItems: canvas.setRealActiveSoundboardItems,
        setActiveNotes: canvas.setRealActiveNotes,
        setActiveLayers: canvas.setRealActiveLayers,
        setActiveGlobalTracks: canvas.setRealActiveGlobalTracks,
        setActiveWalls: canvas.setRealActiveWalls,
        setMessage,
        loadAudios: assets.loadAudios,
        loadImages: assets.loadImages,
        loadSoundboardItems,
        loadCanvas,
        loadAssetFolders: assets.loadAssetFolders
    });

    const findPlayer = useCallback((id: string) => canvas.realActivePlayers.find(p => p.id === id), [canvas.realActivePlayers]);

    // Consolidate everything to match IDBContextProps perfectly
    // useMemo prevents re-rendering the entire app tree on every state change
    const value: IDBContextProps = {
        db,
        findaudio: assets.findaudio,
        deleteAudio: assets.deleteAudio,
        updateAudioPersisted: assets.updateAudioPersisted,
        deleteAll: connection.deleteAll,
        resetCanvas: connection.resetCanvas,
        isLoading: connection.isLoading,
        savedAudios: assets.savedAudios,
        findPlayer,
        activePlayers: preview.activePlayers,
        deletePlayer: canvas.deletePlayer,
        addPlayerPersisted: canvas.addPlayerPersisted,
        updatePlayerPersisted: canvas.updatePlayerPersisted,
        setMessage,
        saveAudio: assets.saveAudio,
        handleSetActivePlayers: canvas.handleSetActivePlayers,
        setActiveAudios: assets.setSavedAudios as any,
        usageLog,
        saveImage: assets.saveImage,
        savedImages: assets.savedImages,
        deleteImage: assets.deleteImage,
        assetFolders: assets.assetFolders,
        addAssetFolder: assets.addAssetFolder,
        updateAssetFolder: assets.updateAssetFolder,
        deleteAssetFolder: assets.deleteAssetFolder,
        activeImages: preview.activeImages,
        addImagePersisted: canvas.addImagePersisted,
        updateImagePersisted: canvas.updateImagePersisted,
        deleteImagePersisted: canvas.deleteImagePersisted,
        handleSetActiveImages: canvas.handleSetActiveImages,
        activeAreas: preview.activeAreas,
        addAreaPersisted: canvas.addAreaPersisted,
        updateAreaPersisted: canvas.updateAreaPersisted,
        handleSetActiveAreas: canvas.handleSetActiveAreas,
        deleteArea: canvas.deleteArea,
        activePins: preview.activePins,
        activeWalls: preview.activeWalls,
        addWallPersisted: canvas.addWallPersisted,
        updateWallPersisted: canvas.updateWallPersisted,
        deleteWallPersisted: canvas.deleteWallPersisted,
        handleSetActiveWalls: canvas.handleSetActiveWalls,
        addPinPersisted: canvas.addPinPersisted,
        updatePinPersisted: canvas.updatePinPersisted,
        deletePinPersisted: canvas.deletePinPersisted,
        handleSetActivePins: canvas.handleSetActivePins,
        activeLayers: preview.activeLayers,
        addLayer: canvas.addLayer,
        updateLayer: canvas.updateLayer,
        deleteLayer: canvas.deleteLayer,
        reorderLayers: canvas.reorderLayers,
        reorderAudios: canvas.reorderAudios,
        reorderImages: canvas.reorderImages,
        reorderPins: canvas.reorderPins,
        exportCanvasState: connection.exportCanvasState,
        importCanvasState: connection.importCanvasState,
        restoreCanvasState: connection.restoreCanvasState,
        soundboardItems: canvas.soundboardItems,
        addSoundboardItem: canvas.addSoundboardItem,
        updateSoundboardItem: canvas.updateSoundboardItem,
        deleteSoundboardItem: canvas.deleteSoundboardItem,
        activeSoundboardItems: preview.activeSoundboardItems,
        addSoundboardItemPersisted: canvas.addSoundboardItemPersisted,
        updateSoundboardItemPersisted: canvas.updateSoundboardItemPersisted,
        deleteSoundboardItemPersisted: canvas.deleteSoundboardItemPersisted,
        handleSetActiveSoundboardItems: canvas.handleSetActiveSoundboardItems,
        activeNotes: preview.activeNotes,
        addNotePersisted: canvas.addNotePersisted,
        updateNotePersisted: canvas.updateNotePersisted,
        deleteNotePersisted: canvas.deleteNotePersisted,
        handleSetActiveNotes: canvas.handleSetActiveNotes,
        activeGlobalTracks: preview.activeGlobalTracks,
        addGlobalTrackPersisted: canvas.addGlobalTrackPersisted,
        updateGlobalTrackPersisted: canvas.updateGlobalTrackPersisted,
        deleteGlobalTrackPersisted: canvas.deleteGlobalTrackPersisted,
        handleSetActiveGlobalTracks: canvas.handleSetActiveGlobalTracks,
        isPreviewMode: preview.isPreviewMode,
        startPreview: preview.startPreview,
        commitPreview: preview.commitPreview,
        discardPreview: preview.discardPreview,
        realActiveAreas: canvas.realActiveAreas,
        realActivePins: canvas.realActivePins,
        realActiveImages: canvas.realActiveImages,
        realActiveWalls: canvas.realActiveWalls,
        realActiveGlobalTracks: canvas.realActiveGlobalTracks,
        realActivePlayers: canvas.realActivePlayers,
        realActiveNotes: canvas.realActiveNotes,
        realActiveSoundboardItems: canvas.realActiveSoundboardItems,
        realActiveLayers: canvas.realActiveLayers
    }

    return <IndexedDBContext.Provider value={value}>{children}</IndexedDBContext.Provider>;
};

export const useIDB = () => {
    const context = useContext(IndexedDBContext);
    if (context === undefined) {
        throw new Error('useIDB must be used within an IDBProvider');
    }
    return context;
};
