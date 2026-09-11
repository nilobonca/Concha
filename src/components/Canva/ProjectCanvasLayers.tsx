import React from 'react';
import DraggableItem from '@/components/Canva/itens/draggable-item';
import ImageItem from '@/components/Canva/itens/image-item';
import { EditableWall } from '@/components/Canva/itens/editable-wall';
import EditableArea from '@/components/Canva/itens/editable-area';
import PinItem from '@/components/Canva/itens/pin-item';
import NoteItem from '@/components/Canva/itens/note-item';
import { CanvasSoundboardItem } from '@/components/Soundboard/CanvasSoundboardItem';
import {
  Layer,
  ActiveImage,
  ActiveWall,
  ActiveArea,
  ActivePin,
  ActiveNote,
  ActiveSoundboardItem,
  SoundboardItem,
  Audios,
} from '@/interfaces/utils/indexedDB';

export interface ProjectCanvasLayersProps {
  activeLayers: Layer[];
  isLayerVisible: (layer: Layer, allLayers: Layer[]) => boolean;
  getItemProjectId: (layer: Layer) => any;
  activeProjectId?: any;
  activeImages: ActiveImage[];
  activeWalls: ActiveWall[];
  activeAreas: ActiveArea[];
  activePins: ActivePin[];
  activeNotes: ActiveNote[];
  activeSoundboardItems: ActiveSoundboardItem[];
  soundboardItems: SoundboardItem[];
  savedAudios: Audios[];
  selectedItemIds: Set<string>;
  tool: string;
  croppingImageId: string | null;
  editingImageId: string | null;
  editingSoundboardItemId: string | null;
  renamingAreaId: string | null;
  activeAreaIds: Set<string>;
  dragStartPositions: React.MutableRefObject<Record<string, any>>;
  changePositionImage: (image: ActiveImage, pos: { x: number; y: number }) => void;
  handleImageDrag: (id: string, x: number, y: number) => void;
  handleGroupDragStart: (id: string) => void;
  deleteImagePersisted: (id: string) => void;
  handleEditImage: (id: string) => void;
  updateImagePersisted: (image: ActiveImage) => void;
  setCroppingImageId: (id: string | null) => void;
  setContextMenu: (menu: any) => void;
  setSelectedItemIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  handleUpdateWall: (wall: ActiveWall) => void;
  handleMultiSelect: (e: any, id: string) => void;
  handleDragWall: (id: string, x: number, y: number) => void;
  handleUpdateArea: (area: ActiveArea) => void;
  setHighlightedAudioId: (id: number | null) => void;
  handleAreaDrag: (id: string, totalDx: number, totalDy: number) => void;
  setRenamingAreaId: (id: string | null) => void;
  handlePinDrag: (id: string, x: number, y: number, isDragging?: boolean) => void;
  handleNoteDrag?: (id: string, x: number, y: number) => void;
  updateNotePersisted: (note: ActiveNote) => void;
  deleteNotePersisted: (id: string) => void;
  updateSoundboardItemPersisted: (item: ActiveSoundboardItem) => void;
  handleSoundboardItemDrag: (id: string, x: number, y: number) => void;
  deleteSoundboardItemPersisted: (id: string) => void;
  handleRenameSoundboardItem: (id: string, name: string) => void;
}

export const ProjectCanvasLayers: React.FC<ProjectCanvasLayersProps> = ({
  activeLayers,
  isLayerVisible,
  getItemProjectId,
  activeProjectId,
  activeImages,
  activeWalls,
  activeAreas,
  activePins,
  activeNotes,
  activeSoundboardItems,
  soundboardItems,
  savedAudios,
  selectedItemIds,
  tool,
  croppingImageId,
  editingImageId,
  editingSoundboardItemId,
  renamingAreaId,
  activeAreaIds,
  dragStartPositions,
  changePositionImage,
  handleImageDrag,
  handleGroupDragStart,
  deleteImagePersisted,
  handleEditImage,
  updateImagePersisted,
  setCroppingImageId,
  setContextMenu,
  setSelectedItemIds,
  handleUpdateWall,
  handleMultiSelect,
  handleDragWall,
  handleUpdateArea,
  setHighlightedAudioId,
  handleAreaDrag,
  setRenamingAreaId,
  handlePinDrag,
  handleNoteDrag,
  updateNotePersisted,
  deleteNotePersisted,
  updateSoundboardItemPersisted,
  handleSoundboardItemDrag,
  deleteSoundboardItemPersisted,
  handleRenameSoundboardItem,
}) => {
  return (
    <>
      {[...activeLayers].reverse().map((layer, index) => {
        if (!isLayerVisible(layer, activeLayers)) return null;

        const projectId = getItemProjectId(layer);
        if (projectId !== activeProjectId) return null;

        if (layer.itemType === 'image') {
          const image = activeImages.find(i => i.id === layer.itemId);
          if (!image) return null;
          return (
            <DraggableItem
              key={image.id}
              id={image.id}
              x={Number(image.position.x)}
              y={Number(image.position.y)}
              zIndex={index}
              isSelected={selectedItemIds.has(image.id)}
              className=""
              onPositionChange={(id, x, y) => changePositionImage(image, { x, y })}
              onDrag={handleImageDrag}
              onDragStart={handleGroupDragStart}
              onSelect={(e: any) => handleMultiSelect(e, image.id)}
              rotation={croppingImageId === image.id ? 0 : (image.rotation || 0)}
            >
              <ImageItem
                image={image}
                onDelete={() => deleteImagePersisted(image.id)}
                onEdit={() => handleEditImage(image.id)}
                onUpdate={(updatedImage) => updateImagePersisted(updatedImage)}
                isEditing={editingImageId === image.id}
                onCropStart={() => setCroppingImageId(image.id)}
                onCropEnd={() => setCroppingImageId(null)}
                onContextMenu={(e: React.MouseEvent) => {
                  if (tool !== 'cursor') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedItemIds(new Set([image.id]));
                  setContextMenu({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    worldX: 0,
                    worldY: 0,
                    type: 'image',
                    imageId: image.id
                  });
                }}
              />
            </DraggableItem>
          );
        }

        if (layer.itemType === 'wall') {
          const wall = activeWalls.find(w => w.id === layer.itemId);
          if (!wall) return null;
          return (
            <EditableWall
              key={wall.id}
              wall={wall}
              zIndex={index}
              isDrawingMode={tool !== 'cursor'}
              onUpdate={handleUpdateWall}
              isSelected={selectedItemIds.has(wall.id)}
              onSelect={(e: any) => handleMultiSelect(e, wall.id)}
              onRightClick={(e: React.MouseEvent) => {
                if (tool !== 'cursor') return;
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  type: 'wall',
                  screenX: e.clientX,
                  screenY: e.clientY,
                  worldX: 0,
                  worldY: 0,
                  itemId: wall.id
                });
              }}
              onDragStart={(id: string) => {
                const w = activeWalls.find(wl => wl.id === id);
                if (w) dragStartPositions.current[id] = { ...dragStartPositions.current[id], x: w.points[0].x, y: w.points[0].y, points: w.points };
              }}
              onDrag={handleDragWall}
            />
          );
        }

        if (layer.itemType === 'area') {
          const area = activeAreas.find(a => a.id === layer.itemId);
          if (!area) return null;
          return (
            <EditableArea
              key={area.id}
              area={area}
              zIndex={index}
              isDrawingMode={tool !== 'cursor'}
              onUpdate={handleUpdateArea}
              isSelected={selectedItemIds.has(area.id)}
              onSelect={(e: any) => handleMultiSelect(e, area.id)}
              onRightClick={(e: React.MouseEvent) => {
                if (tool !== 'cursor') return;
                e.preventDefault();
                e.stopPropagation();
                setSelectedItemIds(new Set([area.id]));
                setContextMenu({
                  screenX: e.clientX,
                  screenY: e.clientY,
                  worldX: 0,
                  worldY: 0,
                  type: 'area',
                  areaId: area.id
                });
              }}
              isActive={activeAreaIds.has(area.id)}
              onHover={setHighlightedAudioId}
              onDrag={(id, points, volumeSource) => handleAreaDrag(id, points as any, volumeSource as any)}
              onDragStart={handleGroupDragStart}
              isRenaming={renamingAreaId === area.id}
              onRenameEnd={() => setRenamingAreaId(null)}
            />
          );
        }

        if (layer.itemType === 'pin') {
          const pin = activePins.find(p => p.id === layer.itemId);
          if (!pin) return null;
          return (
            <DraggableItem
              key={pin.id}
              id={pin.id}
              x={pin.position.x}
              y={pin.position.y}
              zIndex={index + 9999}
              isSelected={selectedItemIds.has(pin.id)}
              onPositionChange={(id, x, y) => handlePinDrag(id, x, y, false)}
              onDrag={(id, x, y) => handlePinDrag(id, x, y, true)}
              onDragStart={handleGroupDragStart}
            >
              <PinItem
                pin={pin}
                onSelect={(e: any) => handleMultiSelect(e, pin.id)}
                onContextMenu={(e: React.MouseEvent) => {
                  if (tool !== 'cursor') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    worldX: 0,
                    worldY: 0,
                    type: 'pin',
                    pinId: pin.id
                  });
                }}
              />
            </DraggableItem>
          );
        }

        if (layer.itemType === 'note') {
          const note = activeNotes.find(n => n.id === layer.itemId);
          if (!note) return null;
          return (
            <DraggableItem
              key={note.id}
              id={note.id}
              x={note.position.x}
              y={note.position.y}
              zIndex={index + 200}
              isSelected={selectedItemIds.has(note.id)}
              onPositionChange={(id, x, y) => updateNotePersisted({ ...note, position: { x, y } })}
              onDrag={handleNoteDrag}
              onDragStart={handleGroupDragStart}
              onSelect={(e: any) => handleMultiSelect(e, note.id)}
            >
              <NoteItem
                note={note}
                zIndex={index + 200}
                onUpdate={updateNotePersisted}
                onDelete={deleteNotePersisted}
                isSelected={selectedItemIds.has(note.id)}
                onSelect={(e: any) => handleMultiSelect(e, note.id)}
                onContextMenu={(e: React.MouseEvent) => {
                  e.preventDefault();
                }}
              />
            </DraggableItem>
          );
        }

        if (layer.itemType === 'soundboard') {
          const item = activeSoundboardItems.find(i => i.id === layer.itemId);
          if (!item) return null;
          const soundboardItem = soundboardItems.find(sb => sb.id === item.soundboardItemId);
          if (!soundboardItem) return null;
          const audio = soundboardItem.audioId ? savedAudios.find(a => a.id === soundboardItem.audioId) : undefined;

          return (
            <DraggableItem
              key={item.id}
              id={item.id}
              x={item.position.x}
              y={item.position.y}
              zIndex={index}
              isSelected={selectedItemIds.has(item.id)}
              onPositionChange={(id, x, y) => updateSoundboardItemPersisted({ ...item, position: { x, y } })}
              onDrag={(id, x, y) => handleSoundboardItemDrag(id, x, y)}
              onDragStart={handleGroupDragStart}
              onSelect={(e: any) => handleMultiSelect(e, item.id)}
            >
              <CanvasSoundboardItem
                item={item}
                soundboardItem={soundboardItem}
                audio={audio}
                onDelete={() => deleteSoundboardItemPersisted(item.id)}
                isRenaming={editingSoundboardItemId === item.id || editingSoundboardItemId === soundboardItem.id}
                onRename={(newName: string) => handleRenameSoundboardItem(item.id, newName)}
                onContextMenu={(e: React.MouseEvent) => {
                  if (tool !== 'cursor') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedItemIds(new Set([item.id]));
                  setContextMenu({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    worldX: 0,
                    worldY: 0,
                    type: 'soundboard-active',
                    itemId: item.id
                  });
                }}
              />
            </DraggableItem>
          );
        }

        return null;
      })}
    </>
  );
};
