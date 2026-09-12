import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface CanvasUIState {
  headerOpen: boolean;
  layerManagerOpen: boolean;
  pinManagerOpen: boolean;
  historyOpen: boolean;
  soundboardOpen: boolean;
  activePlayersOpen: boolean;
  globalTracksOpen: boolean;
  mobileMenuOpen: boolean;
  listenersOpen: boolean;
  listenerSettingsOpen: boolean;
  menuPositions: Record<string, { x: number; y: number; width?: number; height?: number }>;
  setMenuPosition: (menuId: string, pos: { x: number; y: number; width?: number; height?: number }) => void;
  setListenersOpen: (open: boolean) => void;
  setListenerSettingsOpen: (open: boolean) => void;
  menuZIndices: Record<string, number>;
  setHeaderOpen: (open: boolean) => void;
  setLayerManagerOpen: (open: boolean) => void;
  setPinManagerOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setSoundboardOpen: (open: boolean) => void;
  setActivePlayersOpen: (open: boolean) => void;
  setGlobalTracksOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  bringToFront: (menuId: string) => void;
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
  guestMasterVolume: number;
  setGuestMasterVolume: (volume: number) => void;
  isTheaterMode: boolean;
  setIsTheaterMode: (val: boolean) => void;
}

interface CanvasSelectionState {
  activeAreaIds: Set<string>;
  proximityVolumes: Map<number, number>;
  spatialPans: Map<number, number>;
  spatial3D: Map<number, { x: number, y: number }>;
  is3DEnabled: boolean;
  listenerRotation: number;
  audioFilters: Map<number, 'none' | 'lowpass' | 'wall' | 'telephone'>;
  selectedItemIds: Set<string>;
  editingImageId: string | null;
  croppingImageId: string | null;
  editingSoundboardItemId: string | null;
  renamingAreaId: string | null;
  highlightedAudioId: number | null;
  activeAudioIds: Set<number>;
  editingNoteId: string | null;
  
  setActiveAreaIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setProximityVolumes: (volumes: Map<number, number> | ((prev: Map<number, number>) => Map<number, number>)) => void;
  setSpatialPans: (pans: Map<number, number> | ((prev: Map<number, number>) => Map<number, number>)) => void;
  setSpatial3D: (pans: Map<number, { x: number, y: number }> | ((prev: Map<number, { x: number, y: number }>) => Map<number, { x: number, y: number }>)) => void;
  setIs3DEnabled: (enabled: boolean) => void;
  setListenerRotation: (rot: number) => void;
  setAudioFilters: (filters: Map<number, 'none' | 'lowpass' | 'wall' | 'telephone'> | ((prev: Map<number, 'none' | 'lowpass' | 'wall' | 'telephone'>) => Map<number, 'none' | 'lowpass' | 'wall' | 'telephone'>)) => void;
  setSelectedItemIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setEditingImageId: (id: string | null) => void;
  setCroppingImageId: (id: string | null) => void;
  setEditingSoundboardItemId: (id: string | null) => void;
  setRenamingAreaId: (id: string | null) => void;
  setHighlightedAudioId: (id: number | null) => void;
  setActiveAudioIds: (ids: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setEditingNoteId: (id: string | null) => void;
  clearSelection: () => void;
}

interface CanvasLoadingState {
  isEnteringProject: boolean;
  enteringProjectName: string | null;
  isProjectLoading: boolean;
  startEnteringProject: (projectName?: string) => void;
  finishEnteringProject: () => void;
  setIsProjectLoading: (loading: boolean) => void;
}

export type CanvasGlobalStore = CanvasUIState & CanvasSelectionState & CanvasLoadingState;

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('RPGSA_DB', 9);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('keyval')) {
            request.result.createObjectStore('keyval');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keyval')) {
            resolve(null);
            return;
          }
          const tx = db.transaction('keyval', 'readonly');
          const store = tx.objectStore('keyval');
          const getReq = store.get(name);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('RPGSA_DB', 9);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('keyval')) {
            request.result.createObjectStore('keyval');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keyval')) {
            resolve();
            return;
          }
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          const putReq = store.put(value, name);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        request.onerror = () => reject(request.error);
      } catch (e) {
        reject(e);
      }
    });
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('RPGSA_DB', 9);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('keyval')) {
            request.result.createObjectStore('keyval');
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keyval')) {
            resolve();
            return;
          }
          const tx = db.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          const delReq = store.delete(name);
          delReq.onsuccess = () => resolve();
          delReq.onerror = () => resolve();
        };
        request.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }
};

export const useCanvasGlobalStore = create<CanvasGlobalStore>()(
  persist(
    (set) => ({
      // UI Initial States
      headerOpen: true,
      layerManagerOpen: false,
      pinManagerOpen: false,
      historyOpen: false,
      soundboardOpen: false,
      activePlayersOpen: false,
      globalTracksOpen: false,
      mobileMenuOpen: false,
      listenersOpen: false,
      listenerSettingsOpen: false,
      menuPositions: {},
      setMenuPosition: (menuId, pos) => set((state) => ({
        menuPositions: {
          ...state.menuPositions,
          [menuId]: {
            ...state.menuPositions[menuId],
            ...pos
          }
        }
      })),
      menuZIndices: {
        header: 50,
        layer: 50,
        pin: 50,
        history: 50,
        listeners: 50,
        soundboard: 50,
        activePlayers: 50,
        globalTracks: 50,
        cardsPreview: 50
      },
      
      setHeaderOpen: (open) => { set({ headerOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('header'); },
      setLayerManagerOpen: (open) => { set({ layerManagerOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('layer'); },
      setPinManagerOpen: (open) => { set({ pinManagerOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('pin'); },
      setHistoryOpen: (open) => { set({ historyOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('history'); },
      setSoundboardOpen: (open) => { set({ soundboardOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('soundboard'); },
      setActivePlayersOpen: (open) => { set({ activePlayersOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('activePlayers'); },
      setGlobalTracksOpen: (open) => { set({ globalTracksOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('globalTracks'); },
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setListenersOpen: (open) => { set({ listenersOpen: open }); if(open) useCanvasGlobalStore.getState().bringToFront('listeners'); },
      setListenerSettingsOpen: (open) => set({ listenerSettingsOpen: open }),
      
      bringToFront: (menuId) => set((state) => {
        const maxZ = Math.max(...Object.values(state.menuZIndices), 50);
        return {
          menuZIndices: {
            ...state.menuZIndices,
            [menuId]: maxZ + 1
          }
        };
      }),

      masterVolume: 1.0,
      setMasterVolume: (volume) => set({ masterVolume: volume }),

      guestMasterVolume: 1.0,
      setGuestMasterVolume: (volume) => set({ guestMasterVolume: volume }),

      isTheaterMode: false,
      setIsTheaterMode: (val) => set({ isTheaterMode: val }),

      // Loading Initial States
      isEnteringProject: false,
      enteringProjectName: null,
      isProjectLoading: false,
      startEnteringProject: (projectName) => set({
        isEnteringProject: true,
        enteringProjectName: projectName || null,
        isProjectLoading: true
      }),
      finishEnteringProject: () => set({
        isEnteringProject: false,
        enteringProjectName: null,
        isProjectLoading: false
      }),
      setIsProjectLoading: (loading) => set({ isProjectLoading: loading }),

      // Selection Initial States
      activeAreaIds: new Set(),
      proximityVolumes: new Map(),
      spatialPans: new Map(),
      spatial3D: new Map(),
      is3DEnabled: false,
      listenerRotation: 0,
      audioFilters: new Map(),
      selectedItemIds: new Set(),
      editingImageId: null,
      croppingImageId: null,
      editingSoundboardItemId: null,
      renamingAreaId: null,
      highlightedAudioId: null,
      activeAudioIds: new Set(),
      editingNoteId: null,

      setActiveAreaIds: (ids) => set((state) => ({
        activeAreaIds: typeof ids === 'function' ? ids(state.activeAreaIds) : ids
      })),
      setProximityVolumes: (volumes) => set((state) => ({
        proximityVolumes: typeof volumes === 'function' ? volumes(state.proximityVolumes) : volumes
      })),
      setSpatialPans: (pans) => set((state) => ({
        spatialPans: typeof pans === 'function' ? pans(state.spatialPans) : pans
      })),
      setSpatial3D: (pans) => set((state) => ({
        spatial3D: typeof pans === 'function' ? pans(state.spatial3D) : pans
      })),
      setIs3DEnabled: (enabled) => set({ is3DEnabled: enabled }),
      setListenerRotation: (rot) => set({ listenerRotation: rot }),
      setAudioFilters: (filters) => set((state) => ({
        audioFilters: typeof filters === 'function' ? filters(state.audioFilters) : filters
      })),
      setSelectedItemIds: (ids) => set((state) => ({
        selectedItemIds: typeof ids === 'function' ? ids(state.selectedItemIds) : ids
      })),
      setEditingImageId: (id) => set({ editingImageId: id }),
      setCroppingImageId: (id) => set({ croppingImageId: id }),
      setEditingSoundboardItemId: (id) => set({ editingSoundboardItemId: id }),
      setRenamingAreaId: (id) => set({ renamingAreaId: id }),
      setHighlightedAudioId: (id) => set({ highlightedAudioId: id }),
      setActiveAudioIds: (ids) => set((state) => ({
        activeAudioIds: typeof ids === 'function' ? ids(state.activeAudioIds) : ids
      })),
      setEditingNoteId: (id) => set({ editingNoteId: id }),

      clearSelection: () => set({
        selectedItemIds: new Set(),
        editingImageId: null,
        croppingImageId: null,
        editingSoundboardItemId: null,
        renamingAreaId: null,
        editingNoteId: null
      })
    }),
    {
      name: 'rpgsa_canvas_ui_v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        menuPositions: state.menuPositions,
        menuZIndices: state.menuZIndices,
        headerOpen: state.headerOpen,
        layerManagerOpen: state.layerManagerOpen,
        pinManagerOpen: state.pinManagerOpen,
        historyOpen: state.historyOpen,
        soundboardOpen: state.soundboardOpen,
        activePlayersOpen: state.activePlayersOpen,
        globalTracksOpen: state.globalTracksOpen,
        listenersOpen: state.listenersOpen
      })
    }
  )
);
