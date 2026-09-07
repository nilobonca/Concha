import { useEffect } from 'react';
import { Players, ActiveImage, ActiveArea, ActivePin, ActiveSoundboardItem, ActiveNote, ActiveWall } from '@/interfaces/utils/indexedDB';
import { useShortcutStore } from '@/store/shortcutStore';
import { useCanvasGlobalStore } from '@/store/canvasStore';
import { useThemeStore } from '@/store/themeStore';

interface UseCanvasShortcutsProps {
  selectedItemIds: Set<string>;
  setSelectedItemIds: (ids: Set<string>) => void;
  activePlayers: Players[];
  activeImages: ActiveImage[];
  activeAreas: ActiveArea[];
  activePins: ActivePin[];
  activeNotes: ActiveNote[];
  activeSoundboardItems: ActiveSoundboardItem[];
  activeWalls: ActiveWall[];
  deletePlayer: (id: string) => void;
  deleteImagePersisted: (id: string) => void;
  deleteArea: (id: string) => void;
  deletePinPersisted: (id: string) => void;
  deleteNotePersisted: (id: string) => void;
  deleteSoundboardItemPersisted: (id: string) => void;
  deleteWallPersisted: (id: string) => void;
  addToHistory: (description?: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  toggleDiceTray?: () => void;
  toggleChat?: () => void;
  setTool?: (tool: string) => void;
  isPreviewMode?: boolean;
  startPreview?: () => void;
  discardPreview?: () => void;
  isTheaterMode?: boolean;
  setIsTheaterMode?: (val: boolean) => void;
  stopAllAudio?: () => void;
  updateNotePersisted?: (note: ActiveNote) => void;
  updateImagePersisted?: (image: ActiveImage) => void;
  updatePinPersisted?: (pin: ActivePin) => void;
  updateSoundboardItemPersisted?: (item: ActiveSoundboardItem) => void;
}

const isMatch = (event: KeyboardEvent, combo: string) => {
  if (!combo) return false;
  const parts = combo.toLowerCase().split('+').map(p => p.trim());
  const needsCtrl = parts.includes('control') || parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');
  const needsMeta = parts.includes('meta');
  
  const key = parts.find(p => !['control', 'ctrl', 'shift', 'alt', 'meta'].includes(p));
  
  if (needsCtrl !== (event.ctrlKey || event.metaKey)) return false; // macOS command acts as ctrl
  if (needsShift !== event.shiftKey) return false;
  if (needsAlt !== event.altKey) return false;
  
  if (key) {
    if (key === 'space' && event.code === 'Space') return true;
    return event.key.toLowerCase() === key;
  }
  return true;
};

export const useCanvasShortcuts = ({
  selectedItemIds,
  setSelectedItemIds,
  activePlayers,
  activeImages,
  activeAreas,
  activePins,
  activeNotes,
  activeSoundboardItems,
  activeWalls,
  deletePlayer,
  deleteImagePersisted,
  deleteArea,
  deletePinPersisted,
  deleteNotePersisted,
  deleteSoundboardItemPersisted,
  deleteWallPersisted,
  addToHistory,
  handleUndo,
  handleRedo,
  toggleDiceTray,
  toggleChat,
  setTool,
  isPreviewMode,
  startPreview,
  discardPreview,
  isTheaterMode,
  setIsTheaterMode,
  stopAllAudio,
  updateNotePersisted,
  updateImagePersisted,
  updatePinPersisted,
  updateSoundboardItemPersisted,
}: UseCanvasShortcutsProps) => {

  const bindings = useShortcutStore(state => state.bindings);
  const {
    layerManagerOpen, setLayerManagerOpen,
    historyOpen, setHistoryOpen,
    soundboardOpen, setSoundboardOpen,
    globalTracksOpen, setGlobalTracksOpen,
    masterVolume, setMasterVolume,
    editingNoteId,
  } = useCanvasGlobalStore();
  
  const { isSettingsOpen, setIsSettingsOpen } = useThemeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueia qualquer atalho quando alguma nota ou elemento estiver em modo de edição
      if (editingNoteId) {
        return;
      }

      // Avoid triggering shortcuts when actively typing in editable inputs/textareas
      const target = e.target as HTMLElement;
      const activeEl = document.activeElement as HTMLElement;
      const isTyping = (
        (target && (
          (target.tagName === 'INPUT' && !(target as HTMLInputElement).readOnly) ||
          (target.tagName === 'TEXTAREA' && !(target as HTMLTextAreaElement).readOnly) ||
          target.isContentEditable ||
          Boolean(target.closest('input, textarea, [contenteditable="true"]'))
        )) ||
        (activeEl && (
          (activeEl.tagName === 'INPUT' && !(activeEl as HTMLInputElement).readOnly) ||
          (activeEl.tagName === 'TEXTAREA' && !(activeEl as HTMLTextAreaElement).readOnly) ||
          activeEl.isContentEditable ||
          Boolean(activeEl.closest('input, textarea, [contenteditable="true"]'))
        ))
      );
      if (isTyping) {
        return;
      }

      // Menus e Painéis
      if (isMatch(e, bindings.toggleChat) && toggleChat) { e.preventDefault(); toggleChat(); }
      if (isMatch(e, bindings.toggleDiceTray) && toggleDiceTray) { e.preventDefault(); toggleDiceTray(); }
      if (isMatch(e, bindings.toggleHistory)) { e.preventDefault(); setHistoryOpen(!historyOpen); }
      if (isMatch(e, bindings.toggleSoundboard)) { e.preventDefault(); setSoundboardOpen(!soundboardOpen); }
      if (isMatch(e, bindings.toggleGlobalAudio)) { e.preventDefault(); setGlobalTracksOpen(!globalTracksOpen); }
      if (isMatch(e, bindings.toggleLayers)) { e.preventDefault(); setLayerManagerOpen(!layerManagerOpen); }
      if (isMatch(e, bindings.toggleSettings)) { e.preventDefault(); setIsSettingsOpen(!isSettingsOpen); }

      // Ferramentas
      if (isMatch(e, bindings.toolCursor) && setTool) { e.preventDefault(); setTool('cursor'); }
      if (isMatch(e, bindings.toolArea) && setTool) { e.preventDefault(); setTool('area'); }
      if (isMatch(e, bindings.toolWall) && setTool) { e.preventDefault(); setTool('wall'); }
      if (isMatch(e, bindings.toolPin) && setTool) { e.preventDefault(); setTool('pin'); }
      if (isMatch(e, bindings.toolNote) && setTool) { e.preventDefault(); setTool('note'); }
      if (isMatch(e, bindings.toolEraser) && setTool) { e.preventDefault(); setTool('eraser'); }

      // Áudio
      if (isMatch(e, bindings.muteMaster)) {
        e.preventDefault();
        setMasterVolume(masterVolume > 0 ? 0 : 1);
      }
      if (isMatch(e, bindings.stopAllAudio) && stopAllAudio) {
        e.preventDefault();
        stopAllAudio();
      }

      // Sistema
      if (isMatch(e, bindings.toggleTheaterMode) && setIsTheaterMode) {
        e.preventDefault();
        setIsTheaterMode(!isTheaterMode);
      }
      if (isMatch(e, bindings.togglePreviewMode)) {
        e.preventDefault();
        if (isPreviewMode) discardPreview?.();
        else startPreview?.();
      }

      // Delete Selection
      if (isMatch(e, bindings.deleteSelection)) {
        if (selectedItemIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          addToHistory('Excluir Seleção');
          selectedItemIds.forEach(id => {
            if (activePlayers.find(p => p.id === id)) deletePlayer(id);
            else if (activeImages.find(i => i.id === id)) deleteImagePersisted(id);
            else if (activeAreas.find(a => a.id === id)) deleteArea(id);
            else if (activePins.find(p => p.id === id)) deletePinPersisted(id);
            else if (activeNotes.find(n => n.id === id)) deleteNotePersisted(id);
            else if (activeSoundboardItems.find(s => s.id === id)) deleteSoundboardItemPersisted(id);
            else if (activeWalls.find(w => w.id === id)) deleteWallPersisted(id);
          });
          setSelectedItemIds(new Set());
        }
      }

      // Undo/Redo
      if (isMatch(e, bindings.undo)) {
        e.preventDefault();
        handleUndo();
      }
      if (isMatch(e, bindings.redo)) {
        e.preventDefault();
        handleRedo();
      }

      // Movimentação por setas direcionais (Nudge): move itens selecionados apenas quando NÃO estiver editando
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (editingNoteId) {
          return;
        }
        if (selectedItemIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 50 : 10;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

          selectedItemIds.forEach(id => {
            const note = activeNotes.find(n => n.id === id);
            if (note && updateNotePersisted) {
              updateNotePersisted({
                ...note,
                position: {
                  x: Math.max(0, note.position.x + dx),
                  y: Math.max(0, note.position.y + dy),
                }
              });
            }
            const img = activeImages.find(i => i.id === id);
            if (img && updateImagePersisted) {
              updateImagePersisted({
                ...img,
                position: {
                  x: Math.max(0, img.position.x + dx),
                  y: Math.max(0, img.position.y + dy),
                }
              });
            }
            const pin = activePins.find(p => p.id === id);
            if (pin && updatePinPersisted) {
              updatePinPersisted({
                ...pin,
                position: {
                  x: Math.max(0, pin.position.x + dx),
                  y: Math.max(0, pin.position.y + dy),
                }
              });
            }
            const soundboardItem = activeSoundboardItems.find(s => s.id === id);
            if (soundboardItem && updateSoundboardItemPersisted) {
              updateSoundboardItemPersisted({
                ...soundboardItem,
                position: {
                  x: Math.max(0, soundboardItem.position.x + dx),
                  y: Math.max(0, soundboardItem.position.y + dy),
                }
              });
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    bindings, selectedItemIds, activePlayers, activeImages, activeAreas, activePins, 
    activeNotes, activeSoundboardItems, activeWalls, deletePlayer, deleteImagePersisted, 
    deleteArea, deletePinPersisted, deleteNotePersisted, deleteSoundboardItemPersisted, 
    deleteWallPersisted, addToHistory, handleUndo, handleRedo, toggleDiceTray, toggleChat, 
    setTool, isPreviewMode, startPreview, discardPreview, isTheaterMode, setIsTheaterMode,
    layerManagerOpen, historyOpen, soundboardOpen, globalTracksOpen, isSettingsOpen, masterVolume,
    stopAllAudio, setLayerManagerOpen, setHistoryOpen, setSoundboardOpen, setGlobalTracksOpen, setIsSettingsOpen, setMasterVolume,
    updateNotePersisted, updateImagePersisted, updatePinPersisted, updateSoundboardItemPersisted
  ]);
};
