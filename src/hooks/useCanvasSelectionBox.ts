import { useCallback, Dispatch, SetStateAction } from 'react';
import { ActiveImage, ActivePin, ActiveArea, ActiveSoundboardItem, ActiveNote } from '@/interfaces/utils/indexedDB';

export interface UseCanvasSelectionBoxProps {
  activeImages: ActiveImage[];
  activePins: ActivePin[];
  activeAreas: ActiveArea[];
  activeSoundboardItems: ActiveSoundboardItem[];
  activeNotes: ActiveNote[];
  selectedItemIds: Set<string>;
  setSelectedItemIds: Dispatch<SetStateAction<Set<string>>> | ((ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void);
}

export const useCanvasSelectionBox = ({
  activeImages,
  activePins,
  activeAreas,
  activeSoundboardItems,
  activeNotes,
  selectedItemIds,
  setSelectedItemIds,
}: UseCanvasSelectionBoxProps) => {
  const handleSelectionChange = useCallback((rect: { x: number; y: number; width: number; height: number } | null) => {
    if (!rect) {
      setSelectedItemIds(new Set());
      return;
    }

    const newSelectedIds = new Set<string>();

    // Check intersection with Images
    activeImages.forEach(img => {
      const el = document.getElementById(`item-${img.id}`);
      if (el) {
        const itemRect = el.getBoundingClientRect();
        const container = document.querySelector('.relative.flex-1.overflow-hidden.bg-neutral-900');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const itemLeft = itemRect.left - containerRect.left;
          const itemTop = itemRect.top - containerRect.top;

          if (
            itemLeft < rect.x + rect.width &&
            itemLeft + itemRect.width > rect.x &&
            itemTop < rect.y + rect.height &&
            itemTop + itemRect.height > rect.y
          ) {
            newSelectedIds.add(img.id);
          }
        }
      }
    });

    // Check intersection with Pins
    activePins.forEach(pin => {
      const el = document.getElementById(`item-${pin.id}`);
      if (el) {
        const container = document.querySelector('.relative.flex-1.overflow-hidden.bg-neutral-900');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();
          const itemLeft = itemRect.left - containerRect.left;
          const itemTop = itemRect.top - containerRect.top;

          if (
            itemLeft < rect.x + rect.width &&
            itemLeft + itemRect.width > rect.x &&
            itemTop < rect.y + rect.height &&
            itemTop + itemRect.height > rect.y
          ) {
            newSelectedIds.add(pin.id);
          }
        }
      }
    });

    // Check intersection with Notes
    activeNotes.forEach(note => {
      const el = document.getElementById(`item-${note.id}`);
      if (el) {
        const container = document.querySelector('.relative.flex-1.overflow-hidden.bg-neutral-900');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();
          const itemLeft = itemRect.left - containerRect.left;
          const itemTop = itemRect.top - containerRect.top;

          if (
            itemLeft < rect.x + rect.width &&
            itemLeft + itemRect.width > rect.x &&
            itemTop < rect.y + rect.height &&
            itemTop + itemRect.height > rect.y
          ) {
            newSelectedIds.add(note.id);
          }
        }
      }
    });

    // Check intersection with Areas
    activeAreas.forEach(area => {
      const el = document.getElementById(`area-${area.id}`);
      if (el) {
        const container = document.querySelector('.relative.flex-1.overflow-hidden.bg-neutral-900');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();
          const itemLeft = itemRect.left - containerRect.left;
          const itemTop = itemRect.top - containerRect.top;

          if (
            itemLeft < rect.x + rect.width &&
            itemLeft + itemRect.width > rect.x &&
            itemTop < rect.y + rect.height &&
            itemTop + itemRect.height > rect.y
          ) {
            newSelectedIds.add(area.id);
          }
        }
      }
    });

    // Check intersection with Soundboard Items
    activeSoundboardItems.forEach(item => {
      const el = document.getElementById(`item-${item.id}`);
      if (el) {
        const container = document.querySelector('.relative.flex-1.overflow-hidden.bg-neutral-900');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();
          const itemLeft = itemRect.left - containerRect.left;
          const itemTop = itemRect.top - containerRect.top;

          if (
            itemLeft < rect.x + rect.width &&
            itemLeft + itemRect.width > rect.x &&
            itemTop < rect.y + rect.height &&
            itemTop + itemRect.height > rect.y
          ) {
            newSelectedIds.add(item.id);
          }
        }
      }
    });

    setSelectedItemIds(newSelectedIds);
  }, [activeImages, activeAreas, activePins, activeSoundboardItems, activeNotes, setSelectedItemIds]);

  const handleMultiSelect = useCallback((e: React.MouseEvent | React.PointerEvent | React.TouchEvent | undefined, id: string) => {
    if (e && (('ctrlKey' in e && e.ctrlKey) || ('metaKey' in e && e.metaKey) || ('shiftKey' in e && e.shiftKey))) {
      setSelectedItemIds((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedItemIds(new Set([id]));
    }
  }, [setSelectedItemIds]);

  return { handleSelectionChange, handleMultiSelect };
};
