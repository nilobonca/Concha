import { useCallback, MutableRefObject } from 'react';
import { useIDB } from '@/utils/indexedDB';
import {
  ActiveImage,
  ActiveWall,
  ActiveArea,
  ActivePin,
  ActiveSoundboardItem,
  ActiveGlobalTrack,
} from '@/interfaces/utils/indexedDB';

export interface DragStartPosition {
  x?: number;
  y?: number;
  points?: { x: number; y: number }[];
  volumeSourcePoint?: { x: number; y: number };
}

export interface UseCanvasItemHandlersProps {
  dragStartPositions: MutableRefObject<Record<string, DragStartPosition>>;
  selectedItemIds: Set<string>;
  calculateInteractions?: (
    pins: ActivePin[],
    areas: ActiveArea[],
    walls: ActiveWall[],
    projectTracks: ActiveGlobalTrack[],
    guestPins: ActivePin[],
    guestAreas: ActiveArea[],
    realActiveWalls: ActiveWall[],
    realProjectTracks: ActiveGlobalTrack[]
  ) => void;
  projectId?: string | string[] | number;
}

export const useCanvasItemHandlers = ({
  dragStartPositions,
  selectedItemIds,
  calculateInteractions,
  projectId,
}: UseCanvasItemHandlersProps) => {
  const {
    activeImages,
    updateImagePersisted,
    deleteImagePersisted,
    activeAreas,
    updateAreaPersisted,
    deleteArea,
    activeWalls,
    updateWallPersisted,
    deleteWallPersisted,
    activePins,
    updatePinPersisted,
    deletePinPersisted,
    activeSoundboardItems,
    updateSoundboardItemPersisted,
    activeNotes,
    updateNotePersisted,
    activeGlobalTracks,
    realActiveAreas,
    realActivePins,
    realActiveWalls,
    realActiveGlobalTracks,
    isPreviewMode,
  } = useIDB();

  const handleUpdateImage = useCallback(
    (updatedImage: ActiveImage) => {
      updateImagePersisted(updatedImage);
    },
    [updateImagePersisted]
  );

  const handleDeleteImage = useCallback(
    (id: string) => {
      deleteImagePersisted(id);
    },
    [deleteImagePersisted]
  );

  const handleImageDrag = useCallback(
    (id: string, x: number, y: number) => {
      const startPos = dragStartPositions.current[id];

      const anchorImg = activeImages.find((i) => i.id === id);
      if (anchorImg) updateImagePersisted({ ...anchorImg, position: { x, y } });

      if (selectedItemIds.has(id) && startPos && startPos.x !== undefined && startPos.y !== undefined) {
        const totalDx = x - startPos.x;
        const totalDy = y - startPos.y;

        selectedItemIds.forEach((itemId) => {
          if (itemId === id) return;

          const itemStartPos = dragStartPositions.current[itemId];
          if (!itemStartPos) return;

          const img = activeImages.find((i) => i.id === itemId);
          if (img && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateImagePersisted({
              ...img,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const pin = activePins.find((p) => p.id === itemId);
          if (pin && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updatePinPersisted({
              ...pin,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const note = activeNotes.find((n) => n.id === itemId);
          if (note && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateNotePersisted({
              ...note,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const area = activeAreas.find((a) => a.id === itemId);
          if (area && itemStartPos.points) {
            const newPoints = itemStartPos.points.map((p) => ({ x: p.x + totalDx, y: p.y + totalDy }));
            let newVolumeSource = area.volumeSourcePoint;
            if (itemStartPos.volumeSourcePoint) {
              newVolumeSource = {
                x: itemStartPos.volumeSourcePoint.x + totalDx,
                y: itemStartPos.volumeSourcePoint.y + totalDy,
              };
            }
            updateAreaPersisted({ ...area, points: newPoints, volumeSourcePoint: newVolumeSource });
          }
        });
      }
    },
    [
      activeImages,
      activePins,
      activeNotes,
      activeAreas,
      dragStartPositions,
      selectedItemIds,
      updateImagePersisted,
      updatePinPersisted,
      updateNotePersisted,
      updateAreaPersisted,
    ]
  );

  const handleUpdateWall = useCallback(
    (updatedWall: ActiveWall) => {
      updateWallPersisted(updatedWall);
    },
    [updateWallPersisted]
  );

  const handleDeleteWall = useCallback(
    (id: string) => {
      deleteWallPersisted(id);
    },
    [deleteWallPersisted]
  );

  const handleDragWall = useCallback(
    (id: string, totalDx: number, totalDy: number) => {
      const wall = activeWalls.find((w) => w.id === id);
      const startPosAnchor = dragStartPositions.current[id];
      if (wall && startPosAnchor && startPosAnchor.points) {
        const newPoints = startPosAnchor.points.map((p: { x: number; y: number }) => ({
          x: p.x + totalDx,
          y: p.y + totalDy,
        }));
        updateWallPersisted({ ...wall, points: newPoints });
      }
    },
    [activeWalls, dragStartPositions, updateWallPersisted]
  );

  const handleUpdateArea = useCallback(
    (area: ActiveArea) => {
      updateAreaPersisted(area);
    },
    [updateAreaPersisted]
  );

  const handleDeleteArea = useCallback(
    (id: string) => {
      deleteArea(id);
    },
    [deleteArea]
  );

  const handleAreaDrag = useCallback(
    (areaId: string, totalDx: number, totalDy: number) => {
      const startPosAnchor = dragStartPositions.current[areaId];

      const currentActiveAreas = [...activeAreas];
      const currentActivePins = [...activePins];

      if (startPosAnchor && startPosAnchor.points) {
        const areaIndex = currentActiveAreas.findIndex((a) => a.id === areaId);
        if (areaIndex !== -1) {
          const area = currentActiveAreas[areaIndex];
          const newPoints = startPosAnchor.points.map((p: { x: number; y: number }) => ({
            x: p.x + totalDx,
            y: p.y + totalDy,
          }));
          let newVolumeSource = area.volumeSourcePoint;
          if (startPosAnchor.volumeSourcePoint) {
            newVolumeSource = {
              x: startPosAnchor.volumeSourcePoint.x + totalDx,
              y: startPosAnchor.volumeSourcePoint.y + totalDy,
            };
          }

          const updatedArea = { ...area, points: newPoints, volumeSourcePoint: newVolumeSource };
          currentActiveAreas[areaIndex] = updatedArea;
          updateAreaPersisted(updatedArea);
        }
      }

      if (selectedItemIds.has(areaId)) {
        selectedItemIds.forEach((id) => {
          if (id === areaId) return;

          const itemStartPos = dragStartPositions.current[id];
          if (!itemStartPos) return;

          const img = activeImages.find((i) => i.id === id);
          if (img && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateImagePersisted({
              ...img,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const pinIndex = currentActivePins.findIndex((p) => p.id === id);
          if (pinIndex !== -1 && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            const pin = currentActivePins[pinIndex];
            const updatedPin = {
              ...pin,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            };
            currentActivePins[pinIndex] = updatedPin;
            updatePinPersisted(updatedPin);
          }

          const note = activeNotes.find((n) => n.id === id);
          if (note && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateNotePersisted({
              ...note,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const areaIndex = currentActiveAreas.findIndex((a) => a.id === id);
          if (areaIndex !== -1 && itemStartPos.points) {
            const area = currentActiveAreas[areaIndex];
            const newPoints = itemStartPos.points.map((p: { x: number; y: number }) => ({
              x: p.x + totalDx,
              y: p.y + totalDy,
            }));
            let newVolumeSource = area.volumeSourcePoint;
            if (itemStartPos.volumeSourcePoint) {
              newVolumeSource = {
                x: itemStartPos.volumeSourcePoint.x + totalDx,
                y: itemStartPos.volumeSourcePoint.y + totalDy,
              };
            }
            const updatedArea = { ...area, points: newPoints, volumeSourcePoint: newVolumeSource };
            currentActiveAreas[areaIndex] = updatedArea;
            updateAreaPersisted(updatedArea);
          }
        });
      }

      if (calculateInteractions) {
        const pIdStr = projectId ? projectId.toString() : '0';
        const projectTracks = activeGlobalTracks.filter((t) => t.projectId === pIdStr || !t.projectId);
        const realProjectTracks = realActiveGlobalTracks.filter(
          (t) => t.projectId === pIdStr || !t.projectId
        );

        const guestPins = isPreviewMode ? realActivePins : currentActivePins;
        const guestAreas = isPreviewMode ? realActiveAreas : currentActiveAreas;

        calculateInteractions(
          currentActivePins,
          currentActiveAreas,
          activeWalls,
          projectTracks,
          guestPins,
          guestAreas,
          realActiveWalls,
          realProjectTracks
        );
      }
    },
    [
      activeAreas,
      activePins,
      activeImages,
      activeWalls,
      activeGlobalTracks,
      realActiveAreas,
      realActivePins,
      realActiveWalls,
      realActiveGlobalTracks,
      dragStartPositions,
      selectedItemIds,
      isPreviewMode,
      projectId,
      calculateInteractions,
      updateAreaPersisted,
      updateImagePersisted,
      updatePinPersisted,
      updateNotePersisted,
      activeNotes,
    ]
  );

  const handlePinDrag = useCallback(
    (pinId: string, x: number, y: number, isDragging: boolean) => {
      const startPos = dragStartPositions.current[pinId];

      const currentActivePins = [...activePins];
      const currentActiveAreas = [...activeAreas];

      if (isDragging && selectedItemIds.has(pinId) && startPos) {
        const totalDx = startPos.x !== undefined ? x - startPos.x : 0;
        const totalDy = startPos.y !== undefined ? y - startPos.y : 0;

        selectedItemIds.forEach((id) => {
          if (id === pinId) return;

          const itemStartPos = dragStartPositions.current[id];
          if (!itemStartPos) return;

          const img = activeImages.find((i) => i.id === id);
          if (img && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateImagePersisted({
              ...img,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const pinIndex = currentActivePins.findIndex((p) => p.id === id);
          if (pinIndex !== -1 && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            const p = currentActivePins[pinIndex];
            const updatedPin = {
              ...p,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            };
            currentActivePins[pinIndex] = updatedPin;
            updatePinPersisted(updatedPin);
          }

          const note = activeNotes.find((n) => n.id === id);
          if (note && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateNotePersisted({
              ...note,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const areaIndex = currentActiveAreas.findIndex((a) => a.id === id);
          if (areaIndex !== -1 && itemStartPos.points) {
            const area = currentActiveAreas[areaIndex];
            const newPoints = itemStartPos.points.map((p: { x: number; y: number }) => ({
              x: p.x + totalDx,
              y: p.y + totalDy,
            }));
            let newVolumeSource = area.volumeSourcePoint;
            if (itemStartPos.volumeSourcePoint) {
              newVolumeSource = {
                x: itemStartPos.volumeSourcePoint.x + totalDx,
                y: itemStartPos.volumeSourcePoint.y + totalDy,
              };
            }
            const updatedArea = { ...area, points: newPoints, volumeSourcePoint: newVolumeSource };
            currentActiveAreas[areaIndex] = updatedArea;
            updateAreaPersisted(updatedArea);
          }
        });
      }

      const anchorPinIndex = currentActivePins.findIndex((p) => p.id === pinId);
      if (anchorPinIndex !== -1) {
        currentActivePins[anchorPinIndex] = {
          ...currentActivePins[anchorPinIndex],
          position: { x, y },
        };
      }

      if (!isDragging) {
        const pinToUpdate = activePins.find((p: ActivePin) => p.id === pinId);
        if (pinToUpdate) {
          updatePinPersisted({ ...pinToUpdate, position: { x, y } });
        }
      } else if (calculateInteractions) {
        const pIdStr = projectId ? projectId.toString() : '0';
        const projectTracks = activeGlobalTracks.filter((t) => t.projectId === pIdStr || !t.projectId);
        const realProjectTracks = realActiveGlobalTracks.filter(
          (t) => t.projectId === pIdStr || !t.projectId
        );

        const guestPins = isPreviewMode ? realActivePins : currentActivePins;
        const guestAreas = isPreviewMode ? realActiveAreas : currentActiveAreas;

        calculateInteractions(
          currentActivePins,
          currentActiveAreas,
          activeWalls,
          projectTracks,
          guestPins,
          guestAreas,
          realActiveWalls,
          realProjectTracks
        );
      }
    },
    [
      activePins,
      activeAreas,
      activeImages,
      activeWalls,
      activeGlobalTracks,
      realActiveAreas,
      realActivePins,
      realActiveWalls,
      realActiveGlobalTracks,
      dragStartPositions,
      selectedItemIds,
      isPreviewMode,
      projectId,
      calculateInteractions,
      updatePinPersisted,
      updateImagePersisted,
      updateAreaPersisted,
      updateNotePersisted,
      activeNotes,
    ]
  );

  const handleDeletePin = useCallback(
    (id: string) => {
      deletePinPersisted(id);
    },
    [deletePinPersisted]
  );

  const handleSoundboardItemDrag = useCallback(
    (id: string, x: number, y: number) => {
      const anchorItem = activeSoundboardItems.find((i) => i.id === id);
      if (anchorItem) updateSoundboardItemPersisted({ ...anchorItem, position: { x, y } });

      const startPos = dragStartPositions.current[id];
      if (selectedItemIds.has(id) && startPos && startPos.x !== undefined && startPos.y !== undefined) {
        const totalDx = x - startPos.x;
        const totalDy = y - startPos.y;

        selectedItemIds.forEach((itemId) => {
          if (itemId === id) return;

          const itemStartPos = dragStartPositions.current[itemId];
          if (!itemStartPos) return;

          const img = activeImages.find((i) => i.id === itemId);
          if (img && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateImagePersisted({
              ...img,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }
          const pin = activePins.find((p) => p.id === itemId);
          if (pin && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updatePinPersisted({
              ...pin,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }
          const sbItem = activeSoundboardItems.find((i) => i.id === itemId);
          if (sbItem && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateSoundboardItemPersisted({
              ...sbItem,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }
          const note = activeNotes.find((n) => n.id === itemId);
          if (note && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateNotePersisted({
              ...note,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }
          const area = activeAreas.find((a) => a.id === itemId);
          if (area && itemStartPos.points) {
            const newPoints = itemStartPos.points.map((p) => ({ x: p.x + totalDx, y: p.y + totalDy }));
            let newVolumeSource = area.volumeSourcePoint;
            if (itemStartPos.volumeSourcePoint) {
              newVolumeSource = {
                x: itemStartPos.volumeSourcePoint.x + totalDx,
                y: itemStartPos.volumeSourcePoint.y + totalDy,
              };
            }
            updateAreaPersisted({ ...area, points: newPoints, volumeSourcePoint: newVolumeSource });
          }
        });
      }
    },
    [
      activeSoundboardItems,
      activeImages,
      activePins,
      activeNotes,
      activeAreas,
      dragStartPositions,
      selectedItemIds,
      updateSoundboardItemPersisted,
      updateImagePersisted,
      updatePinPersisted,
      updateNotePersisted,
      updateAreaPersisted,
    ]
  );

  const handleNoteDrag = useCallback(
    (id: string, x: number, y: number) => {
      const anchorNote = activeNotes.find((n) => n.id === id);
      if (anchorNote) updateNotePersisted({ ...anchorNote, position: { x, y } });

      const startPos = dragStartPositions.current[id];
      if (selectedItemIds.has(id) && startPos && startPos.x !== undefined && startPos.y !== undefined) {
        const totalDx = x - startPos.x;
        const totalDy = y - startPos.y;

        selectedItemIds.forEach((itemId) => {
          if (itemId === id) return;

          const itemStartPos = dragStartPositions.current[itemId];
          if (!itemStartPos) return;

          const note = activeNotes.find((n) => n.id === itemId);
          if (note && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateNotePersisted({
              ...note,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const img = activeImages.find((i) => i.id === itemId);
          if (img && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateImagePersisted({
              ...img,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const pin = activePins.find((p) => p.id === itemId);
          if (pin && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updatePinPersisted({
              ...pin,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const sbItem = activeSoundboardItems.find((i) => i.id === itemId);
          if (sbItem && itemStartPos.x !== undefined && itemStartPos.y !== undefined) {
            updateSoundboardItemPersisted({
              ...sbItem,
              position: { x: itemStartPos.x + totalDx, y: itemStartPos.y + totalDy },
            });
          }

          const area = activeAreas.find((a) => a.id === itemId);
          if (area && itemStartPos.points) {
            const newPoints = itemStartPos.points.map((p) => ({ x: p.x + totalDx, y: p.y + totalDy }));
            let newVolumeSource = area.volumeSourcePoint;
            if (itemStartPos.volumeSourcePoint) {
              newVolumeSource = {
                x: itemStartPos.volumeSourcePoint.x + totalDx,
                y: itemStartPos.volumeSourcePoint.y + totalDy,
              };
            }
            updateAreaPersisted({ ...area, points: newPoints, volumeSourcePoint: newVolumeSource });
          }
        });
      }
    },
    [
      activeNotes,
      activeImages,
      activePins,
      activeSoundboardItems,
      activeAreas,
      dragStartPositions,
      selectedItemIds,
      updateNotePersisted,
      updateImagePersisted,
      updatePinPersisted,
      updateSoundboardItemPersisted,
      updateAreaPersisted,
    ]
  );

  return {
    handleUpdateImage,
    handleDeleteImage,
    handleImageDrag,
    handleUpdateWall,
    handleDeleteWall,
    handleDragWall,
    handleUpdateArea,
    handleDeleteArea,
    handleAreaDrag,
    handlePinDrag,
    handleDeletePin,
    handleSoundboardItemDrag,
    handleNoteDrag,
  };
};
