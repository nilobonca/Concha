import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ActiveArea,
  ActivePin,
  ActiveNote,
  ActiveSoundboardItem,
  SoundboardItem,
  Audios,
} from '@/interfaces/utils/indexedDB';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';

export interface UseCanvasCreatorsProps {
  activeProjectId?: string | string[] | number | null;
  addToHistory: (description?: string) => void;
  addAreaPersisted: (area: ActiveArea, projectId?: any) => void;
  addPinPersisted: (pin: ActivePin, projectId?: any) => void;
  addNotePersisted: (note: ActiveNote, projectId?: any) => void;
  addSoundboardItem: (item: SoundboardItem) => void;
  addSoundboardItemPersisted: (item: ActiveSoundboardItem, projectId?: any) => void;
  soundboardItems: SoundboardItem[];
  activeSoundboardItems: ActiveSoundboardItem[];
  updateSoundboardItem: (item: SoundboardItem) => void;
  savedAudios: Audios[];
  activeAreas: ActiveArea[];
  handleUpdateArea: (area: ActiveArea) => void;
  setContextMenu: (menu: any) => void;
  setSelectedItemIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  activePins?: ActivePin[];
  setEditingSoundboardItemId?: (id: string | null) => void;
  vaultCreateFile?: (folderPath?: string, name?: string, initialContent?: string, shouldOpen?: boolean) => Promise<string>;
}

export const useCanvasCreators = ({
  activeProjectId,
  addToHistory,
  addAreaPersisted,
  addPinPersisted,
  addNotePersisted,
  addSoundboardItem,
  addSoundboardItemPersisted,
  soundboardItems,
  activeSoundboardItems,
  updateSoundboardItem,
  savedAudios,
  activeAreas,
  handleUpdateArea,
  setContextMenu,
  setSelectedItemIds,
  activePins = [],
  setEditingSoundboardItemId,
  vaultCreateFile,
}: UseCanvasCreatorsProps) => {
  const effectiveProjectId = Array.isArray(activeProjectId) ? activeProjectId[0] : (activeProjectId ? String(activeProjectId) : null);

  const createArea = useCallback((position?: { x: number; y: number }) => {
    addToHistory('Criar Área');
    const baseX = position?.x || 100;
    const baseY = position?.y || 100;

    const newArea: ActiveArea = {
      id: uuidv4(),
      type: 'area',
      name: 'Nova Área',
      points: [
        { x: baseX, y: baseY },
        { x: baseX + 200, y: baseY },
        { x: baseX + 200, y: baseY + 200 },
        { x: baseX, y: baseY + 200 }
      ],
      linkedPlayerId: null,
      linkedAudioId: null,
      volumeMode: 'standard'
    };

    addAreaPersisted(newArea, effectiveProjectId);
    setContextMenu(null);
  }, [addToHistory, addAreaPersisted, effectiveProjectId, setContextMenu]);

  const createPin = useCallback((position?: { x: number; y: number }, icon?: 'pin' | 'person' | 'ear') => {
    addToHistory('Criar Pin');
    const baseX = position?.x || 100;
    const baseY = position?.y || 100;

    const newPin: ActivePin = {
      id: uuidv4(),
      type: 'pin',
      position: { x: baseX, y: baseY },
      name: 'Novo Pin',
      enabled: true,
      order: activePins.length,
      icon: icon || 'pin'
    };
    addPinPersisted(newPin, effectiveProjectId);
    setContextMenu(null);
  }, [addToHistory, activePins, addPinPersisted, effectiveProjectId, setContextMenu]);

  const createNote = useCallback(async (position?: { x: number; y: number }) => {
    addToHistory('Criar Texto');
    const baseX = position?.x || 100;
    const baseY = position?.y || 100;

    let vaultPath: string | undefined;
    try {
      if (vaultCreateFile) {
        vaultPath = await vaultCreateFile('', '', '', false);
      } else {
        const vaultStore = useVaultStore.getState();
        if (!vaultStore.provider) {
          await vaultStore.initializeStorage();
        }
        vaultPath = await useVaultStore.getState().createFile('', '', '', false);
      }
    } catch (err) {
      console.warn('Falha ao criar nota no Vault automaticamente:', err);
    }

    const title = vaultPath ? vaultPath.split('/').pop()?.replace(/\.(md|txt)$/i, '') : 'Nova Nota';

    const newNote: ActiveNote = {
      id: uuidv4(),
      type: 'note',
      title: title || 'Nova Nota',
      content: '',
      position: { x: baseX, y: baseY },
      width: 200,
      height: 100,
      color: '#ffffff',
      fontSize: 14,
      fontColor: '#000000',
      transparentBg: true,
      textAlign: 'left',
      vaultPath,
    };
    addNotePersisted(newNote, effectiveProjectId);
    setSelectedItemIds(new Set([newNote.id]));
    setContextMenu(null);
  }, [addToHistory, addNotePersisted, effectiveProjectId, setSelectedItemIds, setContextMenu, vaultCreateFile]);

  const createSoundboardButton = useCallback((position: { x: number; y: number }) => {
    addToHistory('Criar Botão Soundboard');
    const newItemId = uuidv4();
    const newDef: SoundboardItem = {
      id: newItemId, name: 'Botão', audioId: null, color: '#1831D7', order: soundboardItems.length, playbackMode: 'overlap' as any
    };
    addSoundboardItem(newDef);
    const newInstance: ActiveSoundboardItem = {
      id: uuidv4(), type: 'soundboard' as any, soundboardItemId: newItemId, position
    };
    addSoundboardItemPersisted(newInstance, effectiveProjectId);
    setContextMenu(null);
  }, [addToHistory, soundboardItems, addSoundboardItem, addSoundboardItemPersisted, effectiveProjectId, setContextMenu]);

  const handleRenameSoundboardItem = useCallback((id: string, newName: string) => {
    const definition = soundboardItems.find(d => d.id === id);
    if (definition) {
      updateSoundboardItem({ ...definition, name: newName });
    } else {
      const activeItem = activeSoundboardItems.find(i => i.id === id);
      if (activeItem) {
        const def = soundboardItems.find(d => d.id === activeItem.soundboardItemId);
        if (def) updateSoundboardItem({ ...def, name: newName });
      }
    }
    if (setEditingSoundboardItemId) {
      setEditingSoundboardItemId(null);
    }
  }, [soundboardItems, activeSoundboardItems, updateSoundboardItem, setEditingSoundboardItemId]);

  const linkSoundboardItemToAudio = useCallback((targetId: string, audioId: number) => {
    const audio = savedAudios.find(a => a.id === audioId);
    const audioName = audio ? audio.name : 'Botão';
    const definition = soundboardItems.find(d => d.id === targetId);
    if (definition) {
      updateSoundboardItem({ ...definition, audioId, name: audioName });
    } else {
      const activeItem = activeSoundboardItems.find(i => i.id === targetId);
      if (activeItem) {
        const def = soundboardItems.find(d => d.id === activeItem.soundboardItemId);
        if (def) updateSoundboardItem({ ...def, audioId, name: audioName });
      }
    }
  }, [savedAudios, soundboardItems, activeSoundboardItems, updateSoundboardItem]);

  const linkAreaToAudio = useCallback((areaId: string, audioId: number) => {
    const area = activeAreas.find((a: ActiveArea) => a.id === areaId);
    const audio = savedAudios.find((a: Audios) => a.id === audioId);

    if (area && audio) {
      const updatedArea = { ...area, linkedAudioId: audioId, linkedPlayerId: null };
      handleUpdateArea(updatedArea);
    }
  }, [activeAreas, savedAudios, handleUpdateArea]);

  return {
    createArea,
    createPin,
    createNote,
    createSoundboardButton,
    handleRenameSoundboardItem,
    linkSoundboardItemToAudio,
    linkAreaToAudio,
  };
};
