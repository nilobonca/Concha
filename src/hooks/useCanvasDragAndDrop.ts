import { useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Audios,
  Images,
  ActiveImage,
  ActiveArea,
  ActivePin,
  ActiveWall,
  ActiveSoundboardItem,
  ActiveNote,
  SoundboardItem,
} from '@/interfaces/utils/indexedDB';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { cleanLegacyPlaceholder, cleanDuplicateTitle } from '@/utils/cleanLegacyPlaceholder';

export interface UseCanvasDragAndDropProps {
  activeProjectId?: string | null;
  selectedItemIds: Set<string>;
  setSelectedItemIds?: (ids: Set<string>) => void;
  activeImages: ActiveImage[];
  activePins: ActivePin[];
  activeAreas: ActiveArea[];
  activeWalls: ActiveWall[];
  activeSoundboardItems: ActiveSoundboardItem[];
  savedImages: Images[];
  savedAudios: Audios[];
  soundboardItems: SoundboardItem[];
  addToHistory: (description?: string) => void;
  addImagePersisted: (image: ActiveImage, projectId: string) => void;
  addAreaPersisted: (area: ActiveArea, projectId: string) => void;
  addSoundboardItemPersisted: (item: ActiveSoundboardItem, projectId: string) => void;
  addNotePersisted: (note: ActiveNote, projectId: string) => void;
  createPin: (position: { x: number; y: number }, icon?: 'pin' | 'person' | 'ear') => void;
  saveAudio: (file: File) => Promise<any> | void;
  saveImage: (file: File) => Promise<Images | null | undefined>;
  setPendingUploads?: (files: File[]) => void;
  tool?: string;
  currentAreaPoints?: { x: number; y: number }[];
}

export const useCanvasDragAndDrop = ({
  activeProjectId,
  selectedItemIds,
  setSelectedItemIds,
  activeImages,
  activePins,
  activeAreas,
  activeWalls,
  activeSoundboardItems,
  savedImages,
  savedAudios,
  soundboardItems,
  addToHistory,
  addImagePersisted,
  addAreaPersisted,
  addSoundboardItemPersisted,
  addNotePersisted,
  createPin,
  saveAudio,
  saveImage,
  setPendingUploads,
  tool,
  currentAreaPoints,
}: UseCanvasDragAndDropProps) => {
  const dragStartPositions = useRef<
    Record<
      string,
      {
        x: number;
        y: number;
        points?: { x: number; y: number }[];
        volumeSourcePoint?: { x: number; y: number };
      }
    >
  >({});

  const handleDragStart = useCallback(
    (e: DragEvent | any, item: Audios | Images | string, type?: string) => {
      if (typeof item === 'string') {
        e.dataTransfer.setData('itemType', item);
        if (type) {
          e.dataTransfer.setData('itemId', type);
        }
      } else {
        e.dataTransfer.setData('itemId', item.id.toString());
        if (type) {
          e.dataTransfer.setData('itemType', type);
        }
      }
    },
    []
  );

  const handleGroupDragStart = useCallback(
    (anchorId: string) => {
      addToHistory('Mover Itens');
      const positions: Record<string, any> = {};
      selectedItemIds.forEach((id) => {
        const img = activeImages.find((i) => i.id === id);
        if (img) {
          positions[id] = { x: Number(img.position.x), y: Number(img.position.y) };
          return;
        }
        const pin = activePins.find((p) => p.id === id);
        if (pin) {
          positions[id] = { x: pin.position.x, y: pin.position.y };
          return;
        }
        const area = activeAreas.find((a) => a.id === id);
        if (area) {
          positions[id] = { points: area.points, volumeSourcePoint: area.volumeSourcePoint };
          return;
        }
        const wall = activeWalls.find((w) => w.id === id);
        if (wall) {
          positions[id] = { points: wall.points };
          return;
        }
        const sbItem = activeSoundboardItems.find((i) => i.id === id);
        if (sbItem) {
          positions[id] = { x: sbItem.position.x, y: sbItem.position.y };
          return;
        }
      });
      dragStartPositions.current = positions;
    },
    [
      addToHistory,
      selectedItemIds,
      activeImages,
      activePins,
      activeAreas,
      activeWalls,
      activeSoundboardItems,
    ]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        saveAudio(file);
      }
    },
    [saveAudio]
  );

  const handleDropOnCanvas = useCallback(
    async (itemData: { id: string | number }, type: string, x: number, y: number) => {
      if (!activeProjectId) return;
      addToHistory('Adicionar Item');
      if (tool === 'area' && currentAreaPoints && currentAreaPoints.length >= 3) {
        // handle completion logic
      }
      if (type === 'image') {
        const image = savedImages.find((i: Images) => i.id === Number(itemData.id));
        if (image) {
          const newImage: ActiveImage = {
            id: uuidv4(),
            type: 'image',
            image: image,
            position: { x, y },
          };
          addImagePersisted(newImage, activeProjectId);
        }
      } else if (type === 'audio') {
        const audio = savedAudios.find((a: Audios) => a.id === Number(itemData.id));
        if (audio) {
          const newArea: ActiveArea = {
            id: uuidv4(),
            type: 'area',
            points: [
              { x: x, y: y },
              { x: x + 200, y: y },
              { x: x + 200, y: y + 200 },
              { x: x, y: y + 200 },
            ],
            linkedPlayerId: null,
            linkedAudioId: audio.id,
            name: audio.name,
            volumeMode: 'standard',
          };
          addAreaPersisted(newArea, activeProjectId);
        }
      } else if (type === 'soundboardItem') {
        const item = soundboardItems.find((i) => i.id === String(itemData.id));
        if (item) {
          const newItem: ActiveSoundboardItem = {
            id: uuidv4(),
            type: 'soundboard',
            soundboardItemId: item.id,
            position: { x, y },
          };
          addSoundboardItemPersisted(newItem, activeProjectId);
        }
      } else if (type === 'note') {
        let vaultPath: string | undefined;
        try {
          const vaultStore = useVaultStore.getState();
          if (!vaultStore.provider) {
            await vaultStore.initializeStorage();
          }
          vaultPath = await useVaultStore.getState().createFile('', '', '', false);
        } catch (err) {
          console.warn('Falha ao criar nota no Vault automaticamente:', err);
        }

        const newNote: ActiveNote = {
          id: uuidv4(),
          type: 'note',
          content: '',
          position: { x, y },
          width: 200,
          height: 100,
          color: '#ffffff',
          fontSize: 14,
          fontColor: '#000000',
          transparentBg: true,
          textAlign: 'left',
          vaultPath,
        };
        addNotePersisted(newNote, activeProjectId);
        if (setSelectedItemIds) {
          setSelectedItemIds(new Set([newNote.id]));
        }
      } else if (type === 'vault-note') {
        const notePath = (itemData as any).path || String(itemData.id);
        const noteName = (itemData as any).name || notePath.split('/').pop()?.replace(/\.(md|txt)$/, '') || 'Nota';
        let content = '';
        try {
          const vaultStore = useVaultStore.getState();
          if (!vaultStore.provider) {
            await vaultStore.initializeStorage();
          }
          if (vaultStore.provider) {
            content = await vaultStore.provider.readDocument(notePath);
          }
        } catch (err) {
          console.warn('Erro ao ler conteúdo da nota do vault:', err);
        }

        const newNote: ActiveNote = {
          id: uuidv4(),
          type: 'note',
          title: noteName,
          content: cleanDuplicateTitle(cleanLegacyPlaceholder(content || ''), noteName),
          position: { x, y },
          width: 260,
          height: 140,
          color: '#fef08a',
          fontSize: 14,
          fontColor: '#000000',
          transparentBg: false,
          textAlign: 'left',
          vaultPath: notePath,
        };
        addNotePersisted(newNote, activeProjectId);
        if (setSelectedItemIds) {
          setSelectedItemIds(new Set([newNote.id]));
        }
      } else if (type === 'vault-audio') {
        const audioPath = (itemData as any).path || String(itemData.id);
        const audioName = (itemData as any).name || audioPath.split('/').pop() || 'Áudio';

        const newArea: ActiveArea = {
          id: uuidv4(),
          type: 'area',
          points: [
            { x, y },
            { x: x + 200, y },
            { x: x + 200, y: y + 200 },
            { x, y: y + 200 },
          ],
          linkedPlayerId: null,
          linkedAudioId: null,
          name: audioName,
          volumeMode: 'standard',
        };
        addAreaPersisted(newArea, activeProjectId);
      } else if (type === 'vault-image') {
        const imagePath = (itemData as any).path || String(itemData.id);
        const imageName = (itemData as any).name || imagePath.split('/').pop() || 'Imagem';
        let imageUrl = '';
        try {
          const vaultStore = useVaultStore.getState();
          if (vaultStore.getFileUrl) {
            imageUrl = await vaultStore.getFileUrl(imagePath);
          }
        } catch (err) {
          console.warn('Erro ao obter URL da imagem do vault:', err);
        }

        if (imageUrl) {
          const newImage: ActiveImage = {
            id: uuidv4(),
            type: 'image',
            image: {
              id: Date.now(),
              name: imageName,
              file: new File([], imageName),
              url: imageUrl,
              createdAt: new Date(),
            },
            position: { x, y },
          };
          addImagePersisted(newImage, activeProjectId);
        }
      } else if (type === 'vault-link') {
        let vaultPath: string | undefined;
        let content = '';
        try {
          const vaultStore = useVaultStore.getState();
          if (!vaultStore.provider) {
            await vaultStore.initializeStorage();
          }
          const allNotes = vaultStore.getAllFiles().filter(f => !f.fileType || f.fileType === 'note');
          if (allNotes.length > 0) {
            vaultPath = allNotes[0].path;
            if (vaultStore.provider) {
              content = await vaultStore.provider.readDocument(vaultPath);
            }
          } else {
            vaultPath = await useVaultStore.getState().createFile('', 'Nova Nota', '', false);
          }
        } catch (err) {
          console.warn('Falha ao obter nota do Vault para vault-link:', err);
        }
        const noteName = vaultPath ? vaultPath.split('/').pop()?.replace(/\.(md|txt)$/, '') : 'Nota do Vault';
        const newNote: ActiveNote = {
          id: uuidv4(),
          type: 'note',
          title: noteName,
          content: cleanDuplicateTitle(cleanLegacyPlaceholder(content || ''), noteName),
          position: { x, y },
          width: 260,
          height: 140,
          color: '#fef08a',
          fontSize: 14,
          fontColor: '#000000',
          transparentBg: false,
          textAlign: 'left',
          vaultPath: vaultPath,
        };
        addNotePersisted(newNote, activeProjectId);
        if (setSelectedItemIds) {
          setSelectedItemIds(new Set([newNote.id]));
        }
      } else if (type === 'pin') {
        const icon = itemData.id as 'pin' | 'person' | 'ear';
        createPin({ x, y }, icon);
      } else if (type === 'area') {
        const shape = itemData.id as string;
        const baseX = x;
        const baseY = y;
        let points: { x: number; y: number }[] = [];

        if (shape === 'circle') {
          const radius = 100;
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            points.push({
              x: baseX + radius + Math.cos(angle) * radius,
              y: baseY + radius + Math.sin(angle) * radius,
            });
          }
        } else if (shape === 'triangle') {
          points = [
            { x: baseX + 100, y: baseY },
            { x: baseX + 200, y: baseY + 200 },
            { x: baseX, y: baseY + 200 },
          ];
        } else if (shape === 'hexagon') {
          const radius = 100;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            points.push({
              x: baseX + radius + Math.cos(angle) * radius,
              y: baseY + radius + Math.sin(angle) * radius,
            });
          }
        } else {
          points = [
            { x: baseX, y: baseY },
            { x: baseX + 200, y: baseY },
            { x: baseX + 200, y: baseY + 200 },
            { x: baseX, y: baseY + 200 },
          ];
        }

        const newArea: ActiveArea = {
          id: uuidv4(),
          type: 'area',
          name: 'Nova Área',
          points: points,
          linkedPlayerId: null,
          linkedAudioId: null,
          volumeMode: 'standard',
        };
        addAreaPersisted(newArea, activeProjectId);
      }
    },
    [
      activeProjectId,
      addToHistory,
      tool,
      currentAreaPoints,
      savedImages,
      addImagePersisted,
      savedAudios,
      addAreaPersisted,
      soundboardItems,
      addSoundboardItemPersisted,
      addNotePersisted,
      setSelectedItemIds,
      createPin,
    ]
  );

  const handleNativeDrop = useCallback(
    async (files: FileList | File[], x: number, y: number) => {
      if (!activeProjectId) return;
      addToHistory('Adicionar Arquivo');
      const fileArray = Array.from(files);

      const audioFiles = fileArray.filter((file) => file.type.startsWith('audio/'));
      if (audioFiles.length > 0 && setPendingUploads) {
        setPendingUploads(audioFiles);
      }

      for (const file of fileArray) {
        if (file.type.startsWith('audio/')) continue; // Handled by BatchAudioUploadModal

        const index = fileArray.indexOf(file);
        const offsetX = x + index * 20;
        const offsetY = y + index * 20;

        if (file.type.startsWith('image/')) {
          const savedImage = await saveImage(file);
          if (savedImage) {
            const newImage: ActiveImage = {
              id: uuidv4(),
              type: 'image',
              image: savedImage,
              position: { x: offsetX, y: offsetY },
              rotation: 0,
              scale: 1,
              flipH: false,
              flipV: false,
              brightness: 0,
              contrast: 0,
              opacity: 100,
            };
            addImagePersisted(newImage, activeProjectId);
          }
        }
      }
    },
    [activeProjectId, addToHistory, setPendingUploads, saveImage, addImagePersisted]
  );

  return {
    dragStartPositions,
    handleDragStart,
    handleGroupDragStart,
    handleDropOnCanvas,
    onDropItem: handleDropOnCanvas,
    handleFileChange,
    handleNativeDrop,
    onDropFile: handleNativeDrop,
  };
};
