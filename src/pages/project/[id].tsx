import { useState, useEffect } from 'react';
import { useRouter } from "next/router";
import clsx from 'clsx';
import CanvasContainer from '@/components/Canva/canva-teste';
import BottomToolbar from "@/components/Canva/BottomToolbar";
import { DiceTray } from '@/components/Dice/DiceTray';
import { ProjectCanvasMenus } from '@/components/Canva/ProjectCanvasMenus';
import { ProjectTopHeaderBar } from '@/components/Canva/ProjectTopHeaderBar';
import { ProjectCanvasContextMenu } from '@/components/Canva/ProjectCanvasContextMenu';
import { ProjectModalsContainer } from '@/components/Canva/ProjectModalsContainer';
import { ProjectCanvasLayers } from '@/components/Canva/ProjectCanvasLayers';
import { useProjectCanvasCore } from '@/hooks/useProjectCanvasCore';
import { ActiveArea, ActiveWall, ActiveImage, ActiveNote, Images } from '@/interfaces/utils/indexedDB';
import { BoardVaultSearchModal, VaultSearchCategory } from '@/modules/board/components/modals/BoardVaultSearchModal';
import { AudioData, ImageData } from '@/modules/board/types';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { v4 as uuidv4 } from 'uuid';

export default function ProjectCanvas() {
  const router = useRouter();
  const core = useProjectCanvasCore();
  const { provider } = useVaultStore();
  const [vaultSearchModalOpen, setVaultSearchModalOpen] = useState(false);
  const [vaultSearchCategory, setVaultSearchCategory] = useState<VaultSearchCategory>('all');
  const [insertNotePosition, setInsertNotePosition] = useState<{ x: number; y: number } | null>(null);
  const currentProjectId = typeof core.projectId === 'string' ? core.projectId : Array.isArray(core.projectId) ? core.projectId[0] : '';

  // Ensure storage provider is initialized and connected to this canvas's Vault
  useEffect(() => {
    const initCanvasVault = async () => {
      const currentCanvas = core.idb.activeLayers.find(
        (l) => (l.id === currentProjectId || l.projectId === currentProjectId) && l.isProjectMetadata
      );
      const targetVaultId = currentCanvas?.vaultId;
      const vaultStore = useVaultStore.getState();

      if (!vaultStore.provider) {
        await vaultStore.initializeStorage();
      }

      // If the canvas specifies a vaultId different from the current one (and not using FSA directory)
      if (targetVaultId && vaultStore.vaultId !== targetVaultId && vaultStore.storageType !== 'fsa') {
        await vaultStore.connectIDB(targetVaultId, currentCanvas?.vaultName || undefined);
      }
    };
    initCanvasVault();
  }, [currentProjectId, core.idb.activeLayers]);

  // Shortcut Ctrl+K to open Vault Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        setVaultSearchCategory('all');
        setVaultSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectNoteFromVault = async (note: { path: string; name: string }) => {
    let content = '';
    try {
      const currentProvider = useVaultStore.getState().provider;
      if (currentProvider) {
        content = await currentProvider.readDocument(note.path);
      }
    } catch (err) {
      console.warn('Erro ao ler nota do vault:', err);
    }

    let targetX = 300;
    let targetY = 300;

    if (insertNotePosition) {
      targetX = insertNotePosition.x;
      targetY = insertNotePosition.y;
      setInsertNotePosition(null);
    } else if (core.canvasRef?.current && (core.canvasRef.current as any).screenToWorld) {
      const center = (core.canvasRef.current as any).screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      targetX = center.x - 130;
      targetY = center.y - 70;
    } else {
      targetX = window.innerWidth / 2 - 130;
      targetY = window.innerHeight / 2 - 70;
    }

    const newNote: ActiveNote = {
      id: uuidv4(),
      type: 'note',
      content: content || '',
      position: { x: targetX, y: targetY },
      width: 260,
      height: 140,
      color: '#fef08a',
      fontSize: 14,
      fontColor: '#000000',
      transparentBg: false,
      textAlign: 'left',
      vaultPath: note.path,
    };
    core.idb.addNotePersisted(newNote, currentProjectId);
    core.selection.setSelectedItemIds(new Set([newNote.id]));
  };

  const handleSelectImageFromVault = (imageData: ImageData) => {
    const imageRecord: Images = {
      id: imageData.imageId || Date.now(),
      name: imageData.name,
      file: new File([], imageData.name),
      url: imageData.src,
      createdAt: new Date()
    };
    const newImage: ActiveImage = {
      id: uuidv4(),
      type: 'image',
      image: imageRecord,
      position: { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150 }
    };
    core.idb.addImagePersisted(newImage, currentProjectId);
  };

  const handleSelectAudioFromVault = (audioData: AudioData) => {
    const newArea: ActiveArea = {
      id: uuidv4(),
      type: 'area',
      name: audioData.name,
      points: [
        { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 },
        { x: window.innerWidth / 2 + 100, y: window.innerHeight / 2 - 100 },
        { x: window.innerWidth / 2 + 100, y: window.innerHeight / 2 + 100 },
        { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 + 100 }
      ],
      linkedPlayerId: null,
      linkedAudioId: audioData.audioId || null,
      volumeMode: 'standard',
      color: '#06b6d4',
      opacity: 0.6,
      filterType: 'none',
      volume: audioData.volume ?? 1
    };
    core.idb.addAreaPersisted(newArea, currentProjectId);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-900 overflow-hidden relative text-white">
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Ethereal Canvas Backdrop */}
        {core.isEthereal && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <iframe
              src="https://my.spline.design/flowingribbons-3b1a208db3c6aa6d0bc6fbba1b0aa4f7/"
              className="w-full h-full border-0"
            />
          </div>
        )}

        {/* Dice Drawer */}
        {core.isDiceTrayOpen && (
          <div className={clsx("absolute top-20 right-4 z-50 transition-opacity duration-500", core.isTheaterMode ? "opacity-0 pointer-events-none" : "opacity-100")}>
            <DiceTray
              onRoll={(text, isPrivate) => {
                if (!isPrivate) core.handleHostSendMessage(text, true);
              }}
              onClose={() => core.setIsDiceTrayOpen(false)}
            />
          </div>
        )}

        {/* Menus Overlay */}
        <div className={clsx("transition-opacity duration-500", core.isTheaterMode ? "opacity-0 pointer-events-none" : "opacity-100")}>
          <ProjectCanvasMenus
            tool={core.drawingTools.tool}
            setTool={core.drawingTools.setTool}
            activeProjectId={core.projectState.activeProjectId}
            setActiveProjectId={core.projectState.setActiveProjectId}
            projectId={core.projectId}
            handleLayerAction={core.layerActions.handleLayerAction}
            addToHistory={core.historyHook.addToHistory}
            handleClearRequest={core.projectState.handleClearRequest}
            activePins={core.idb.activePins.filter(p => core.projectState.isItemInPage(p.id))}
            updatePinPersisted={core.idb.updatePinPersisted}
            deletePinPersisted={core.idb.deletePinPersisted}
            history={core.historyHook.history}
            future={core.historyHook.future}
            handleUndo={core.historyHook.handleUndo}
            handleRedo={core.historyHook.handleRedo}
            handleRestoreHistory={core.historyHook.handleRestoreHistory}
            isSessionActive={core.isSessionActive}
            isPreviewMode={core.idb.isPreviewMode}
            sessionListeners={core.sessionListeners}
            listenerPings={core.listenerPings}
            handleLocateListener={core.moderation.handleLocateListener}
            handleKickListener={core.moderation.handleKickListener}
            handleDragStart={core.dragAndDrop.handleDragStart}
            handleFileChange={core.dragAndDrop.handleFileChange}
            isLoading={core.idb.isLoading}
            setMessage={core.idb.setMessage}
            savedAudios={core.idb.savedAudios}
            deleteAudio={core.idb.deleteAudio}
            activeAudioIds={core.selection.activeAudioIds}
            proximityVolumes={core.selection.proximityVolumes}
            highlightedAudioId={core.selection.highlightedAudioId}
            setContextMenu={core.projectState.setContextMenu}
            editingSoundboardItemId={core.selection.editingSoundboardItemId}
            handleRenameSoundboardItem={core.creators.handleRenameSoundboardItem}
            activePlayers={core.idb.activePlayers.filter(p => core.projectState.isItemInPage(p.id))}
            activeAreas={core.idb.activeAreas.filter(a => core.projectState.isItemInPage(a.id))}
            activeAreaIds={core.selection.activeAreaIds}
            spatialPans={core.selection.spatialPans}
            spatial3D={core.selection.spatial3D}
            is3DEnabled={core.selection.is3DEnabled}
            audioFilters={core.selection.audioFilters}
            deletePlayer={core.idb.deletePlayer}
            deleteArea={core.idb.deleteArea}
            handleUpdateArea={core.itemHandlers.handleUpdateArea}
            handleLocatePlayer={core.moderation.handleLocatePlayer}
            isEditingName={core.projectState.isEditingName}
            setIsEditingName={core.projectState.setIsEditingName}
            projectName={core.projectName}
            setProjectName={core.setProjectName}
            handleSaveName={core.projectState.handleSaveName}
            clearConfirmation={core.projectState.clearConfirmation}
            setClearConfirmation={core.projectState.setClearConfirmation}
            confirmClear={core.projectState.confirmClear}
            tempName={core.projectState.tempName}
            setTempName={core.projectState.setTempName}
            activeLayers={core.idb.activeLayers}
          />
        </div>

        {/* Canvas Workspace */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 z-0">
            <CanvasContainer
              ref={core.canvasRef}
              items={[
                ...core.idb.activePlayers.filter(p => core.projectState.isItemInPage(p.id)),
                ...core.idb.activeImages.filter(i => core.projectState.isItemInPage(i.id)),
                ...core.idb.activeAreas.filter(a => core.projectState.isItemInPage(a.id)),
                ...core.idb.activePins.filter(p => core.projectState.isItemInPage(p.id)),
                ...core.idb.activeSoundboardItems.filter(s => core.projectState.isItemInPage(s.id)),
                ...core.idb.activeNotes.filter(n => core.projectState.isItemInPage(n.id))
              ]}
              onDropItem={core.dragAndDrop.onDropItem}
              onDropFile={core.dragAndDrop.onDropFile}
              isSelectionEnabled={core.drawingTools.tool === 'cursor'}
              onCanvasClick={(e: any, worldX: number, worldY: number) => {
                if (core.drawingTools.tool === 'area') {
                  core.drawingTools.setCurrentAreaPoints(prev => [...prev, { x: worldX, y: worldY }]);
                } else if (core.drawingTools.tool === 'wall') {
                  core.drawingTools.setCurrentWallPoints(prev => [...prev, { x: worldX, y: worldY }]);
                } else if ((core.drawingTools.tool as string) === 'note') {
                  core.creators.createNote({ x: worldX, y: worldY });
                  core.drawingTools.setTool('cursor');
                }
              }}
              onCanvasMouseMove={(e: any, worldX: number, worldY: number) => {
                if (core.drawingTools.tool === 'wall' || core.drawingTools.tool === 'area') {
                  core.setCursorPosition({ x: worldX, y: worldY });
                } else if (core.cursorPosition !== null) {
                  core.setCursorPosition(null);
                }
              }}
              onSelectionChange={core.selectionBox.handleSelectionChange}
              onCanvasRightClick={(e: any, worldX: number, worldY: number) => {
                if (core.drawingTools.tool === 'area' && core.drawingTools.currentAreaPoints.length >= 3) {
                  core.historyHook.addToHistory('Criar Área');
                  core.idb.addAreaPersisted({
                    id: uuidv4(), type: 'area', points: core.drawingTools.currentAreaPoints,
                    linkedPlayerId: null, linkedAudioId: null, name: `Área ${core.idb.activeAreas.length + 1}`, volumeMode: 'standard'
                  } as unknown as ActiveArea, core.projectState.activeProjectId);
                  core.drawingTools.setCurrentAreaPoints([]);
                  core.drawingTools.setTool('cursor');
                } else if (core.drawingTools.tool === 'wall') {
                  core.drawingTools.setCurrentWallPoints([]);
                  core.drawingTools.setTool('cursor');
                } else if (core.drawingTools.tool === 'area') {
                  core.drawingTools.setCurrentAreaPoints([]);
                  core.drawingTools.setCurrentWallPoints([]);
                  core.drawingTools.setTool('cursor');
                } else {
                  core.projectState.setContextMenu({
                    screenX: e.clientX, screenY: e.clientY, worldX, worldY, type: 'canvas'
                  });
                }
              }}
            >
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 9999, pointerEvents: 'none' }}>
                {core.drawingTools.currentWallPoints.length > 0 && (
                  <polyline
                    points={[...core.drawingTools.currentWallPoints, ...(core.cursorPosition ? [core.cursorPosition] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="#444444" strokeWidth={8} opacity={0.5} strokeLinecap="round" strokeLinejoin="round"
                  />
                )}
                {core.drawingTools.currentAreaPoints.length > 0 && (
                  <polygon
                    points={[...core.drawingTools.currentAreaPoints, ...(core.cursorPosition ? [core.cursorPosition] : [])].map(p => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 4"
                  />
                )}
              </svg>

              {/* Render items via ProjectCanvasLayers */}
              <ProjectCanvasLayers
                activeLayers={core.idb.activeLayers}
                isLayerVisible={core.layerActions.isLayerVisible}
                getItemProjectId={core.projectState.getItemProjectId}
                activeProjectId={core.projectState.activeProjectId}
                activeImages={core.idb.activeImages}
                activeWalls={core.idb.activeWalls}
                activeAreas={core.idb.activeAreas}
                activePins={core.idb.activePins}
                activeNotes={core.idb.activeNotes}
                activeSoundboardItems={core.idb.activeSoundboardItems}
                soundboardItems={core.idb.soundboardItems}
                savedAudios={core.idb.savedAudios}
                selectedItemIds={core.selection.selectedItemIds}
                tool={core.drawingTools.tool}
                croppingImageId={core.selection.croppingImageId}
                editingImageId={core.selection.editingImageId}
                editingSoundboardItemId={core.selection.editingSoundboardItemId}
                renamingAreaId={core.selection.renamingAreaId}
                activeAreaIds={core.selection.activeAreaIds}
                dragStartPositions={core.dragStartPositions}
                changePositionImage={core.changePositionImage}
                handleImageDrag={core.itemHandlers.handleImageDrag}
                handleGroupDragStart={core.dragAndDrop.handleGroupDragStart}
                deleteImagePersisted={core.idb.deleteImagePersisted}
                handleEditImage={core.handleEditImage}
                updateImagePersisted={core.idb.updateImagePersisted}
                setCroppingImageId={core.selection.setCroppingImageId}
                setContextMenu={core.projectState.setContextMenu}
                setSelectedItemIds={core.selection.setSelectedItemIds}
                handleUpdateWall={core.itemHandlers.handleUpdateWall}
                handleMultiSelect={core.selectionBox.handleMultiSelect}
                handleDragWall={core.itemHandlers.handleDragWall}
                handleUpdateArea={core.itemHandlers.handleUpdateArea}
                setHighlightedAudioId={core.selection.setHighlightedAudioId}
                handleAreaDrag={(id: string, totalDx: number, totalDy: number) => core.itemHandlers.handleAreaDrag(id, totalDx as any, totalDy as any)}
                setRenamingAreaId={core.selection.setRenamingAreaId}
                handlePinDrag={(id: string, x: number, y: number, isDragging?: boolean) => core.itemHandlers.handlePinDrag(id, x, y, isDragging ?? false)}
                updateNotePersisted={core.idb.updateNotePersisted}
                deleteNotePersisted={core.idb.deleteNotePersisted}
                updateSoundboardItemPersisted={core.idb.updateSoundboardItemPersisted}
                handleSoundboardItemDrag={core.itemHandlers.handleSoundboardItemDrag}
                deleteSoundboardItemPersisted={core.idb.deleteSoundboardItemPersisted}
                handleRenameSoundboardItem={core.creators.handleRenameSoundboardItem}
              />
            </CanvasContainer>
          </div>

          {/* Context Menu */}
          <div className={clsx("transition-opacity duration-500", core.isTheaterMode ? "opacity-0 pointer-events-none" : "opacity-100")}>
            <ProjectCanvasContextMenu
              contextMenu={core.projectState.contextMenu}
              setContextMenu={core.projectState.setContextMenu}
              activeAreas={core.idb.activeAreas.filter(a => core.projectState.isItemInPage(a.id))}
              activePins={core.idb.activePins.filter(p => core.projectState.isItemInPage(p.id))}
              activeImages={core.idb.activeImages.filter(i => core.projectState.isItemInPage(i.id))}
              savedAudios={core.idb.savedAudios}
              soundboardItems={core.idb.soundboardItems}
              activeSoundboardItems={core.idb.activeSoundboardItems.filter(s => core.projectState.isItemInPage(s.id))}
              handleUpdateArea={core.itemHandlers.handleUpdateArea}
              deleteArea={core.idb.deleteArea}
              updatePinPersisted={core.idb.updatePinPersisted}
              deletePinPersisted={core.idb.deletePinPersisted}
              handleEditImage={core.handleEditImage}
              deleteImagePersisted={core.idb.deleteImagePersisted}
              deleteAssetFolder={core.idb.deleteAssetFolder}
              deleteSoundboardItem={core.idb.deleteSoundboardItem}
              deleteSoundboardItemPersisted={core.idb.deleteSoundboardItemPersisted}
              deleteAudio={core.idb.deleteAudio}
              deleteImage={core.idb.deleteImage}
              createArea={core.creators.createArea}
              createPin={core.creators.createPin}
              createNote={core.creators.createNote}
              createSoundboardButton={core.creators.createSoundboardButton}
              onInsertVaultNote={(pos) => {
                setInsertNotePosition(pos);
                setVaultSearchCategory('notes');
                setVaultSearchModalOpen(true);
              }}
              setRenamingAreaId={core.selection.setRenamingAreaId}
              linkAreaToAudio={core.creators.linkAreaToAudio}
              setEditingSoundboardItemId={core.selection.setEditingSoundboardItemId}
              linkSoundboardItemToAudio={core.creators.linkSoundboardItemToAudio}
              deleteWallPersisted={core.idb.deleteWallPersisted}
            />
          </div>

          {/* Floating Modals Container */}
          <ProjectModalsContainer
            pendingUploads={core.batchUpload.pendingUploads}
            uploadProgress={core.batchUpload.uploadProgress}
            onConfirmUpload={core.batchUpload.handleConfirmUpload}
            onCancelUpload={() => {
              if (!core.batchUpload.uploadProgress.isUploading) core.batchUpload.setPendingUploads(null);
            }}
            editingImageId={core.selection.editingImageId}
            activeImages={core.idb.activeImages}
            onUpdateImage={core.itemHandlers.handleUpdateImage}
            onCloseImageEditor={() => core.selection.setEditingImageId(null)}
            pinManagerOpen={core.ui.pinManagerOpen}
            activePins={core.idb.activePins}
            updatePinPersisted={core.idb.updatePinPersisted}
            deletePinPersisted={core.idb.deletePinPersisted}
            setPinManagerOpen={core.ui.setPinManagerOpen}
            historyOpen={core.ui.historyOpen}
            history={core.historyHook.history}
            future={core.historyHook.future}
            handleUndo={core.historyHook.handleUndo}
            handleRedo={core.historyHook.handleRedo}
            setHistoryOpen={core.ui.setHistoryOpen}
            handleRestoreHistory={core.historyHook.handleRestoreHistory}
            isChatOpen={core.isChatOpen}
            chatMessages={core.chatMessages}
            chatClearedAt={core.chatClearedAt}
            handleHostSendMessage={core.handleHostSendMessage}
            toggleChat={core.toggleChat}
            setChatClearedAt={core.setChatClearedAt}
            saveChatHistory={core.saveChatHistory}
            handleToggleSaveChat={core.handleToggleSaveChat}
            chatSoundEnabled={core.chatSoundEnabled}
            setChatSoundEnabled={core.setChatSoundEnabled}
            chatSoundEnabledRef={core.chatSoundEnabledRef}
            isDiceTrayOpen={core.isDiceTrayOpen}
            setIsDiceTrayOpen={core.setIsDiceTrayOpen}
            menuZIndices={core.ui.menuZIndices}
            bringToFront={core.ui.bringToFront}
          />

          {/* Top Unified Header Bar */}
          <ProjectTopHeaderBar
            projectId={core.projectId as string}
            projectName={core.projectName}
            setProjectName={core.setProjectName}
            isEditingName={core.projectState.isEditingName}
            setIsEditingName={core.projectState.setIsEditingName}
            tempName={core.projectState.tempName}
            setTempName={core.projectState.setTempName}
            handleSaveName={core.projectState.handleSaveName}
            activeLayers={core.idb.activeLayers}
            isTheaterMode={core.isTheaterMode}
            isSessionActive={core.isSessionActive}
            setIsSessionActive={core.setIsSessionActive}
            showInviteModal={core.showInviteModal}
            setShowInviteModal={core.setShowInviteModal}
            listenersOpen={core.listenersOpen}
            setListenersOpen={core.setListenersOpen}
            sessionListeners={core.sessionListeners}
            onKickListener={core.moderation.handleKickListener}
            isChatOpen={core.isChatOpen}
            setIsChatOpen={core.toggleChat}
            hasUnreadMessages={core.hasUnreadMessages}
            isDiceTrayOpen={core.isDiceTrayOpen}
            setIsDiceTrayOpen={core.setIsDiceTrayOpen}
          />
        </div>

        {/* Bottom Toolbar */}
        <div className={clsx("transition-opacity duration-500", core.isTheaterMode ? "opacity-0 pointer-events-none" : "opacity-100")}>
          <BottomToolbar
            onDragStart={core.dragAndDrop.handleDragStart}
            tool={core.drawingTools.tool}
            setTool={core.drawingTools.setTool}
            onOpenVaultSearch={(category) => {
              setVaultSearchCategory(category || 'all');
              setVaultSearchModalOpen(true);
            }}
          />
        </div>

        {/* Modal Unificado de Busca do Vault (Ctrl+K) */}
        <BoardVaultSearchModal
          isOpen={vaultSearchModalOpen}
          initialCategory={vaultSearchCategory}
          currentBoardId={typeof core.projectId === 'string' ? core.projectId : ''}
          onClose={() => {
            setVaultSearchModalOpen(false);
            setInsertNotePosition(null);
          }}
          onSelectNote={handleSelectNoteFromVault}
          onSelectAudio={handleSelectAudioFromVault}
          onSelectImage={handleSelectImageFromVault}
          onSelectCanvas={(canvas) => {
            if (canvas.targetProjectId) {
              router.push(`/project/${canvas.targetProjectId}`);
            }
          }}
        />
      </div>
    </div>
  );
}