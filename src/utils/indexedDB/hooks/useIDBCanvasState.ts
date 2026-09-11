import { useState, useCallback, startTransition, useRef } from 'react';
import { 
    Players, ActiveImage, ActiveArea, ActivePin, ActiveWall, Layer, 
    SoundboardItem, ActiveSoundboardItem, ActiveNote, ActiveGlobalTrack, 
    Audios, Images 
} from '../../../interfaces/utils/indexedDB';
import { v4 as uuidv4 } from 'uuid';
import { stopSoundboardAudio } from '@/components/Soundboard/activeAudios';

export function useIDBCanvasState(
    db: IDBDatabase | null,
    isPreviewModeRef: React.MutableRefObject<boolean>,
    setPreviewState: React.Dispatch<React.SetStateAction<any>>,
    updateItemPersisted: (item: any, type: string, immediate?: boolean) => void,
    deleteItemPersisted: (id: string) => void,
    setSavedAudios: React.Dispatch<React.SetStateAction<Audios[]>>,
    setSavedImages: React.Dispatch<React.SetStateAction<Images[]>>
) {
    // Use ref for db to prevent callback recreation when db changes from null to database
    const dbRef = useRef(db);
    dbRef.current = db;
    const [realActivePlayers, setRealActivePlayers] = useState<Players[]>([]);
    const [realActiveImages, setRealActiveImages] = useState<ActiveImage[]>([]);
    const [realActiveAreas, setRealActiveAreas] = useState<ActiveArea[]>([]);
    const [realActivePins, setRealActivePins] = useState<ActivePin[]>([]);
    const [realActiveLayers, setRealActiveLayers] = useState<Layer[]>([]);
    const [realActiveWalls, setRealActiveWalls] = useState<ActiveWall[]>([]);
    const [soundboardItems, setSoundboardItems] = useState<SoundboardItem[]>([]);
    const [realActiveSoundboardItems, setRealActiveSoundboardItems] = useState<ActiveSoundboardItem[]>([]);
    const [realActiveNotes, setRealActiveNotes] = useState<ActiveNote[]>([]);
    const [realActiveGlobalTracks, setRealActiveGlobalTracks] = useState<ActiveGlobalTrack[]>([]);

    const setActivePlayers = useCallback((updater: React.SetStateAction<Players[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activePlayers: typeof updater === 'function' ? (updater as any)(prev.activePlayers) : updater } : null);
        else setRealActivePlayers(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveImages = useCallback((updater: React.SetStateAction<ActiveImage[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeImages: typeof updater === 'function' ? (updater as any)(prev.activeImages) : updater } : null);
        else setRealActiveImages(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveAreas = useCallback((updater: React.SetStateAction<ActiveArea[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeAreas: typeof updater === 'function' ? (updater as any)(prev.activeAreas) : updater } : null);
        else setRealActiveAreas(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActivePins = useCallback((updater: React.SetStateAction<ActivePin[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activePins: typeof updater === 'function' ? (updater as any)(prev.activePins) : updater } : null);
        else setRealActivePins(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveLayers = useCallback((updater: React.SetStateAction<Layer[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeLayers: typeof updater === 'function' ? (updater as any)(prev.activeLayers) : updater } : null);
        else setRealActiveLayers(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveWalls = useCallback((updater: React.SetStateAction<ActiveWall[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeWalls: typeof updater === 'function' ? (updater as any)(prev.activeWalls) : updater } : null);
        else setRealActiveWalls(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveSoundboardItems = useCallback((updater: React.SetStateAction<ActiveSoundboardItem[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeSoundboardItems: typeof updater === 'function' ? (updater as any)(prev.activeSoundboardItems) : updater } : null);
        else setRealActiveSoundboardItems(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveNotes = useCallback((updater: React.SetStateAction<ActiveNote[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeNotes: typeof updater === 'function' ? (updater as any)(prev.activeNotes) : updater } : null);
        else setRealActiveNotes(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const setActiveGlobalTracks = useCallback((updater: React.SetStateAction<ActiveGlobalTrack[]>) => {
        if (isPreviewModeRef.current) setPreviewState((prev: any) => prev ? { ...prev, activeGlobalTracks: typeof updater === 'function' ? (updater as any)(prev.activeGlobalTracks) : updater } : null);
        else setRealActiveGlobalTracks(updater);
    }, [isPreviewModeRef, setPreviewState]);

    const handleSetActivePlayers = useCallback((players: Players[]) => {
        setActivePlayers(players);
    }, [setActivePlayers]);

    const handleSetActiveImages = useCallback((images: ActiveImage[]) => {
        setActiveImages(images);
    }, [setActiveImages]);

    const handleSetActiveAreas = useCallback((areas: ActiveArea[]) => {
        setActiveAreas(areas);
    }, [setActiveAreas]);

    const handleSetActivePins = useCallback((pins: ActivePin[]) => {
        setActivePins(pins);
    }, [setActivePins]);

    const handleSetActiveWalls = useCallback((walls: ActiveWall[]) => {
        setActiveWalls(walls);
    }, [setActiveWalls]);

    const handleSetActiveSoundboardItems = useCallback((items: ActiveSoundboardItem[]) => {
        setActiveSoundboardItems(items);
    }, [setActiveSoundboardItems]);

    const handleSetActiveNotes = useCallback((notes: ActiveNote[]) => {
        setActiveNotes(notes);
    }, [setActiveNotes]);

    const handleSetActiveGlobalTracks = useCallback((tracks: ActiveGlobalTrack[]) => {
        setActiveGlobalTracks(tracks);
    }, [setActiveGlobalTracks]);

    const addPlayerPersisted = useCallback((player: Players) => {
        setActivePlayers(prev => [...prev, player]);
        updateItemPersisted(player, 'Player');
    }, [setActivePlayers, updateItemPersisted]);

    const updatePlayerPersisted = useCallback((player: Players) => {
        setActivePlayers(prev => prev.map(p => p.id === player.id ? player : p));
        updateItemPersisted(player, 'Player');
    }, [setActivePlayers, updateItemPersisted]);

    const deletePlayer = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActivePlayers(prev => prev.filter(p => p.id !== id));
    }, [deleteItemPersisted, setActivePlayers]);

    const addLayer = useCallback((layer: Layer) => {
        setActiveLayers(prev => {
            const maxOrder = prev.length > 0 ? Math.max(...prev.map(l => l.order || 0)) : -1;
            const newLayer = { ...layer, order: maxOrder + 1 };
            updateItemPersisted(newLayer, 'Layer', true);
            return [newLayer, ...prev];
        });
    }, [setActiveLayers, updateItemPersisted]);

    const updateLayer = useCallback((layer: Layer) => {
        setActiveLayers(prev => prev.map(l => l.id === layer.id ? layer : l));
        updateItemPersisted(layer, 'Layer', true);
    }, [setActiveLayers, updateItemPersisted]);

    const deleteLayer = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActiveLayers(prev => prev.filter(l => l.id !== id));
    }, [deleteItemPersisted, setActiveLayers]);

    const reorderLayers = useCallback((layers: Layer[]) => {
        const updatedLayers = layers.map((l, index) => ({ ...l, order: layers.length - 1 - index }));
        setActiveLayers(updatedLayers);
        updatedLayers.forEach(l => updateItemPersisted(l, 'Layer', true));
    }, [setActiveLayers, updateItemPersisted]);

    const reorderAudios = useCallback((audios: Audios[]) => {
        const updatedAudios = audios.map((a, index) => ({ ...a, order: index }));
        setSavedAudios(updatedAudios);

        const currentDb = dbRef.current;
        if (!currentDb || !currentDb.objectStoreNames.contains('audios')) return;
        const transaction = currentDb.transaction(['audios'], 'readwrite');
        const store = transaction.objectStore('audios');
        updatedAudios.forEach(audio => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { url, ...audioData } = audio;
            store.put(audioData);
        });
    }, [setSavedAudios]);

    const reorderImages = useCallback((images: Images[]) => {
        const updatedImages = images.map((i, index) => ({ ...i, order: index }));
        setSavedImages(updatedImages);

        const currentDb = dbRef.current;
        if (!currentDb || !currentDb.objectStoreNames.contains('images')) return;
        const transaction = currentDb.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        updatedImages.forEach(image => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { url, ...imageData } = image;
            store.put(imageData);
        });
    }, [setSavedImages]);

    const reorderPins = useCallback((pins: ActivePin[]) => {
        const updatedPins = pins.map((p, index) => ({ ...p, order: index }));
        setActivePins(updatedPins);
        updatedPins.forEach(p => updateItemPersisted(p, 'Pin'));
    }, [setActivePins, updateItemPersisted]);

    const addAreaPersisted = useCallback((area: ActiveArea, parentId?: string | null) => {
        setActiveAreas(prev => [...prev, area]);
        updateItemPersisted(area, 'Area');
        const newLayer: Layer = {
            id: uuidv4(),
            type: 'item',
            name: area.name,
            visible: true,
            locked: false,
            parentId: parentId || null,
            depth: 0,
            itemId: area.id,
            itemType: 'area'
        };
        addLayer(newLayer);
    }, [setActiveAreas, updateItemPersisted, addLayer]);

    const updateAreaPersisted = useCallback((area: ActiveArea) => {
        setActiveAreas(prev => prev.map(a => a.id === area.id ? area : a));
        updateItemPersisted(area, 'Area');
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === area.id);
            if (layer && layer.name !== area.name) {
                const newLayer = { ...layer, name: area.name };
                updateItemPersisted(newLayer, 'Layer');
                return prev.map(l => l.id === newLayer.id ? newLayer : l);
            }
            return prev;
        });
    }, [setActiveAreas, updateItemPersisted, setActiveLayers]);

    const deleteArea = useCallback((id: string) => {
        setActiveAreas(prev => {
            const area = prev.find(a => a.id === id);
            if (area && area.linkedPlayerId) {
                deletePlayer(area.linkedPlayerId);
            }
            return prev.filter(a => a.id !== id);
        });
        deleteItemPersisted(id);
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === id);
            if (layer) {
                deleteItemPersisted(layer.id);
                return prev.filter(l => l.id !== layer.id);
            }
            return prev;
        });
    }, [setActiveAreas, deletePlayer, deleteItemPersisted, setActiveLayers]);

    const addPinPersisted = useCallback((pin: ActivePin, parentId?: string | null) => {
        setActivePins(prev => {
            const newPin = { ...pin, order: prev.length };
            updateItemPersisted(newPin, 'Pin');
            return [...prev, newPin];
        });
        const newLayer: Layer = {
            id: uuidv4(),
            type: 'item',
            name: pin.name,
            visible: true,
            locked: false,
            parentId: parentId || null,
            depth: 0,
            itemId: pin.id,
            itemType: 'pin'
        };
        addLayer(newLayer);
    }, [setActivePins, updateItemPersisted, addLayer]);

    const updatePinPersisted = useCallback((pin: ActivePin) => {
        setActivePins(prev => prev.map(p => p.id === pin.id ? pin : p));
        updateItemPersisted(pin, 'Pin');
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === pin.id);
            if (layer && layer.name !== pin.name) {
                const newLayer = { ...layer, name: pin.name };
                updateItemPersisted(newLayer, 'Layer');
                return prev.map(l => l.id === newLayer.id ? newLayer : l);
            }
            return prev;
        });
    }, [setActivePins, updateItemPersisted, setActiveLayers]);

    const deletePinPersisted = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActivePins(prev => prev.filter(p => p.id !== id));
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === id);
            if (layer) {
                deleteItemPersisted(layer.id);
                return prev.filter(l => l.id !== layer.id);
            }
            return prev;
        });
    }, [deleteItemPersisted, setActivePins, setActiveLayers]);

    const addWallPersisted = useCallback((wall: ActiveWall, parentId?: string | null) => {
        setActiveWalls(prev => [...prev, wall]);
        updateItemPersisted(wall, 'Wall');
        const newLayer: Layer = {
            id: uuidv4(),
            type: 'item',
            name: wall.name || 'Parede',
            visible: true,
            locked: false,
            parentId: parentId || null,
            depth: 0,
            itemId: wall.id,
            itemType: 'wall'
        };
        addLayer(newLayer);
    }, [setActiveWalls, updateItemPersisted, addLayer]);

    const updateWallPersisted = useCallback((wall: ActiveWall) => {
        setActiveWalls(prev => prev.map(w => w.id === wall.id ? wall : w));
        updateItemPersisted(wall, 'Wall');
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === wall.id);
            if (layer && layer.name !== wall.name) {
                const newLayer = { ...layer, name: wall.name || 'Parede' };
                updateItemPersisted(newLayer, 'Layer');
                return prev.map(l => l.id === newLayer.id ? newLayer : l);
            }
            return prev;
        });
    }, [setActiveWalls, updateItemPersisted, setActiveLayers]);

    const deleteWallPersisted = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActiveWalls(prev => prev.filter(w => w.id !== id));
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === id);
            if (layer) {
                deleteItemPersisted(layer.id);
                return prev.filter(l => l.id !== layer.id);
            }
            return prev;
        });
    }, [deleteItemPersisted, setActiveWalls, setActiveLayers]);

    const addImagePersisted = useCallback((image: ActiveImage, parentId?: string | null) => {
        setActiveImages(prev => [...prev, image]);
        updateItemPersisted(image, 'Image');
        const newLayer: Layer = {
            id: uuidv4(),
            type: 'item',
            name: image.image.name,
            visible: true,
            locked: false,
            parentId: parentId || null,
            depth: 0,
            itemId: image.id,
            itemType: 'image'
        };
        addLayer(newLayer);
    }, [setActiveImages, updateItemPersisted, addLayer]);

    const updateImagePersisted = useCallback((image: ActiveImage) => {
        setActiveImages(prev => prev.map(i => i.id === image.id ? image : i));
        updateItemPersisted(image, 'Image');
    }, [setActiveImages, updateItemPersisted]);

    const deleteImagePersisted = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActiveImages(prev => prev.filter(i => i.id !== id));
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === id);
            if (layer) {
                deleteItemPersisted(layer.id);
                return prev.filter(l => l.id !== layer.id);
            }
            return prev;
        });
    }, [deleteItemPersisted, setActiveImages, setActiveLayers]);

    const addSoundboardItem = useCallback((item: SoundboardItem) => {
        if (!db || !db.objectStoreNames.contains('soundboard')) return;
        const transaction = db.transaction(['soundboard'], 'readwrite');
        const store = transaction.objectStore('soundboard');
        store.add(item);
        setSoundboardItems(prev => [...prev, item]);
    }, [db]);

    const updateSoundboardItem = useCallback((item: SoundboardItem) => {
        if (!db || !db.objectStoreNames.contains('soundboard')) return;
        const transaction = db.transaction(['soundboard'], 'readwrite');
        const store = transaction.objectStore('soundboard');
        store.put(item);
        setSoundboardItems(prev => prev.map(i => i.id === item.id ? item : i));
    }, [db]);

    const deleteSoundboardItem = useCallback((id: string) => {
        if (!db || !db.objectStoreNames.contains('soundboard')) return;
        const transaction = db.transaction(['soundboard'], 'readwrite');
        const store = transaction.objectStore('soundboard');
        store.delete(id);
        setSoundboardItems(prev => prev.filter(i => i.id !== id));
        stopSoundboardAudio(id);
    }, [db]);

    const addSoundboardItemPersisted = useCallback((item: ActiveSoundboardItem, parentId?: string | null) => {
        setActiveSoundboardItems(prev => [...prev, item]);
        updateItemPersisted(item, 'SoundboardItem');
        const newLayer: Layer = {
            id: uuidv4(),
            type: 'item',
            name: 'Soundboard Button',
            visible: true,
            locked: false,
            parentId: parentId || null,
            depth: 0,
            itemId: item.id,
            itemType: 'soundboard'
        };
        addLayer(newLayer);
    }, [setActiveSoundboardItems, updateItemPersisted, addLayer]);

    const updateSoundboardItemPersisted = useCallback((item: ActiveSoundboardItem) => {
        setActiveSoundboardItems(prev => prev.map(i => i.id === item.id ? item : i));
        updateItemPersisted(item, 'SoundboardItem');
    }, [setActiveSoundboardItems, updateItemPersisted]);

    const deleteSoundboardItemPersisted = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActiveSoundboardItems(prev => prev.filter(i => i.id !== id));
        stopSoundboardAudio(id);
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === id);
            if (layer) {
                deleteItemPersisted(layer.id);
                return prev.filter(l => l.id !== layer.id);
            }
            return prev;
        });
    }, [deleteItemPersisted, setActiveSoundboardItems, setActiveLayers]);

    const addNotePersisted = useCallback((note: ActiveNote, parentId?: string | null) => {
        setActiveNotes(prev => [...prev, note]);
        updateItemPersisted(note, 'Note');
        const noteName = note.title || (note.vaultPath ? note.vaultPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') : '') || 'Nota';
        const newLayer: Layer = {
            id: uuidv4(),
            type: 'item',
            name: noteName,
            visible: true,
            locked: false,
            parentId: parentId || null,
            depth: 0,
            itemId: note.id,
            itemType: 'note'
        };
        addLayer(newLayer);
    }, [setActiveNotes, updateItemPersisted, addLayer]);

    const updateNotePersisted = useCallback((note: ActiveNote) => {
        setActiveNotes(prev => prev.map(n => n.id === note.id ? note : n));
        updateItemPersisted(note, 'Note');
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === note.id);
            const expectedName = note.title || (note.vaultPath ? note.vaultPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') : '') || 'Nota';
            if (layer && layer.name !== expectedName) {
                const newLayer = { ...layer, name: expectedName };
                updateItemPersisted(newLayer, 'Layer');
                return prev.map(l => l.id === newLayer.id ? newLayer : l);
            }
            return prev;
        });
    }, [setActiveNotes, updateItemPersisted, setActiveLayers]);

    const deleteNotePersisted = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActiveNotes(prev => prev.filter(n => n.id !== id));
        setActiveLayers(prev => {
            const layer = prev.find(l => l.itemId === id);
            if (layer) {
                deleteItemPersisted(layer.id);
                return prev.filter(l => l.id !== layer.id);
            }
            return prev;
        });
    }, [deleteItemPersisted, setActiveNotes, setActiveLayers]);

    const addGlobalTrackPersisted = useCallback((track: ActiveGlobalTrack, parentId?: string | null) => {
        const newTrack = { ...track, projectId: parentId || track.projectId };
        setActiveGlobalTracks(prev => [...prev, newTrack]);
        updateItemPersisted(newTrack, 'ActiveGlobalTrack');
    }, [setActiveGlobalTracks, updateItemPersisted]);

    const updateGlobalTrackPersisted = useCallback((track: ActiveGlobalTrack) => {
        setActiveGlobalTracks(prev => prev.map(t => t.id === track.id ? track : t));
        updateItemPersisted(track, 'ActiveGlobalTrack');
    }, [setActiveGlobalTracks, updateItemPersisted]);

    const deleteGlobalTrackPersisted = useCallback((id: string) => {
        deleteItemPersisted(id);
        setActiveGlobalTracks(prev => prev.filter(t => t.id !== id));
    }, [deleteItemPersisted, setActiveGlobalTracks]);

    return {
        realActivePlayers, setRealActivePlayers,
        realActiveImages, setRealActiveImages,
        realActiveAreas, setRealActiveAreas,
        realActivePins, setRealActivePins,
        realActiveLayers, setRealActiveLayers,
        realActiveWalls, setRealActiveWalls,
        soundboardItems, setSoundboardItems,
        realActiveSoundboardItems, setRealActiveSoundboardItems,
        realActiveNotes, setRealActiveNotes,
        realActiveGlobalTracks, setRealActiveGlobalTracks,

        setActivePlayers, setActiveImages, setActiveAreas, setActivePins,
        setActiveLayers, setActiveWalls, setActiveSoundboardItems, setActiveNotes, setActiveGlobalTracks,
        
        handleSetActivePlayers,
        addPlayerPersisted,
        updatePlayerPersisted,
        deletePlayer,
        addLayer,
        updateLayer,
        deleteLayer,
        reorderLayers,
        reorderAudios,
        reorderImages,
        reorderPins,
        addAreaPersisted,
        updateAreaPersisted,
        deleteArea,
        handleSetActiveAreas,
        addPinPersisted,
        updatePinPersisted,
        deletePinPersisted,
        handleSetActivePins,
        addWallPersisted,
        updateWallPersisted,
        deleteWallPersisted,
        handleSetActiveWalls,
        addImagePersisted,
        updateImagePersisted,
        deleteImagePersisted,
        handleSetActiveImages,
        addSoundboardItem,
        updateSoundboardItem,
        deleteSoundboardItem,
        addSoundboardItemPersisted,
        updateSoundboardItemPersisted,
        deleteSoundboardItemPersisted,
        handleSetActiveSoundboardItems,
        addNotePersisted,
        updateNotePersisted,
        deleteNotePersisted,
        handleSetActiveNotes,
        addGlobalTrackPersisted,
        updateGlobalTrackPersisted,
        deleteGlobalTrackPersisted,
        handleSetActiveGlobalTracks
    };
}
