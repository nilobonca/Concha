import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import {
  DatabaseInstance,
  DatabaseRow,
  PropertyDefinition,
  PropertyType,
  PropertyOptionColor,
  DatabaseViewType,
  FilterGroup,
  SortRule,
  DatabaseAttachment,
} from '../types';
import { useDatabase } from '../hooks/useDatabase';
import { useDatabaseQuery } from '../hooks/useDatabaseQuery';
import { useDatabaseStorage } from '../hooks/useDatabaseStorage';
import { serializeDatabaseToMarkdown } from '../utils/databaseAISerializer';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { sanitizeVaultFileName } from '@/modules/vault/utils/fileNameUtils';
import { 
  parseDatabaseRowPath, 
  syncDatabaseRowsToVaultFiles, 
  syncRowToVaultFile, 
  deleteRowVaultFile,
  importPathToDatabase
} from '@/modules/vault/utils/databaseNodeUtils';

// Header components
import { DatabaseHeader } from './header/DatabaseHeader';
import { DatabaseViewTabs } from './header/DatabaseViewTabs';
import { DatabaseRowContextMenu } from './DatabaseRowContextMenu';

// Views
import { DatabaseTableView } from './views/table/DatabaseTableView';
import { DatabaseBoardView } from './views/board/DatabaseBoardView';
import { DatabaseGalleryView } from './views/gallery/DatabaseGalleryView';
import { DatabaseListView } from './views/list/DatabaseListView';

// Modals & Popovers
import { RecordPeekModal } from './modals/RecordPeekModal';
import { PropertyConfigModal } from './modals/PropertyConfigModal';
import { FilterConfigPopover } from './modals/FilterConfigPopover';
import { SortConfigPopover } from './modals/SortConfigPopover';
import { ViewSettingsPopover } from './modals/ViewSettingsPopover';
import { FileUploadPopover } from './modals/FileUploadPopover';

export interface DatabaseContainerProps {
  initialData?: DatabaseInstance;
  databasePath?: string;
  onSave?: (db: DatabaseInstance) => void;
  isInline?: boolean;
}

export const DatabaseContainer: React.FC<DatabaseContainerProps> = ({
  initialData,
  databasePath,
  onSave,
  isInline = false,
}) => {
  // 1. Core Database Hook
  const dbHook = useDatabase({
    initialDatabase: initialData,
    onAutoSave: onSave,
  });

  const {
    database,
    activeView,
    isDirty,
    canUndo,
    canRedo,
    undo,
    redo,
    updateTitle,
    updateDescription,
    addProperty,
    updateProperty,
    deleteProperty,
    addRow,
    updateRowProperty,
    updateRowContent,
    updateRowMetadata,
    deleteRow,
    duplicateRow,
    addView,
    updateView,
    deleteView,
    reorderViews,
    setActiveView,
  } = dbHook;

  const { isRow: isPathRow, dbPath: parsedDbPath, rowId: parsedRowId } = parseDatabaseRowPath(databasePath || '');
  const cleanDbPath = isPathRow ? parsedDbPath : databasePath;

  // Track active database path (which can change when renamed)
  const [currentPath, setCurrentPath] = useState<string | undefined>(cleanDbPath);
  const [rowContextMenu, setRowContextMenu] = useState<{ x: number; y: number; row: DatabaseRow } | null>(null);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, row: DatabaseRow) => {
    setRowContextMenu({ x: e.clientX, y: e.clientY, row });
  }, []);

  React.useEffect(() => {
    if (cleanDbPath) {
      setCurrentPath(cleanDbPath);
    }
  }, [cleanDbPath]);

  // 2. Storage Hook (disk / IDB / vault sync)
  const storageHook = useDatabaseStorage({
    database,
    vaultPath: currentPath || cleanDbPath,
    isDirty,
    onSaved: () => {
      dbHook.markSaved();
      const targetPath = currentPath || cleanDbPath;
      const provider = useVaultStore.getState().provider;
      if (targetPath && database && Array.isArray(database.rows) && provider) {
        syncDatabaseRowsToVaultFiles(database, targetPath, provider).then(() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('supercanvas-db-updated', { detail: { dbPath: targetPath } }));
          }
        });
      }
    },
  });

  // Handler for title change that renames the database file on disk too
  const handleUpdateTitle = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;

      // 1. Atualiza estado em memória da base de dados
      updateTitle(trimmed);

      // 2. Se a base de dados estiver vinculada a um arquivo no Vault, renomeia o arquivo também
      const activeDatabasePath = currentPath || cleanDbPath;
      if (activeDatabasePath) {
        const parts = activeDatabasePath.split('/');
        const currentFileName = parts[parts.length - 1];

        let ext = '.db.json';
        if (currentFileName.toLowerCase().endsWith('.db.json.md')) ext = '.db.json.md';
        else if (currentFileName.toLowerCase().endsWith('.database')) ext = '.database';
        else if (currentFileName.toLowerCase().endsWith('.db.json')) ext = '.db.json';

        const currentBase = currentFileName.replace(/\.(db\.json\.md|db\.json|database)$/i, '');
        const rawBase = trimmed.replace(/\.(db\.json\.md|db\.json|database)$/i, '');
        const cleanBase = sanitizeVaultFileName(rawBase, false) || currentBase || 'Base de Dados';

        if (cleanBase !== currentBase) {
          const newFileName = `${cleanBase}${ext}`;
          parts[parts.length - 1] = newFileName;
          const targetPath = parts.join('/');

          try {
            // Salva os dados atuais primeiro para garantir que o arquivo no disco contenha o novo título
            const updatedDb = { ...database, title: trimmed, updatedAt: Date.now() };
            await storageHook.saveNow(updatedDb);

            // Renomeia o arquivo no Vault (atualiza disco/IDB, abas abertas, layout e explorador)
            const renameNode = useVaultStore.getState().renameNode;
            if (renameNode) {
              await renameNode(activeDatabasePath, targetPath, false);
              setCurrentPath(targetPath);
            }
          } catch (err) {
            console.error('[DatabaseContainer] Erro ao renomear arquivo da base de dados:', err);
          }
        }
      }
    },
    [currentPath, cleanDbPath, database, updateTitle, storageHook]
  );

  // Carrega a base do disco quando databasePath é fornecido
  React.useEffect(() => {
    const targetPath = currentPath || cleanDbPath;
    if (targetPath && !initialData) {
      storageHook.loadDatabaseFromDisk(targetPath).then((loaded) => {
        if (loaded) {
          dbHook.loadDatabase(loaded);
        } else {
          const cleanTitle = targetPath
            .split('/')
            .pop()
            ?.replace(/\.(db\.json\.md|db\.json|database)$/i, '');
          if (cleanTitle && cleanTitle !== database.title) {
            dbHook.updateTitle(cleanTitle);
          }
        }
      });
    }
  }, [cleanDbPath]);

  // Se o caminho especifica uma nota de registro (#row:id), abre o modal de edição correspondente
  React.useEffect(() => {
    if (isPathRow && parsedRowId) {
      setPeekRowId(parsedRowId);
    }
  }, [isPathRow, parsedRowId]);

  const handleClosePeek = useCallback(() => {
    setPeekRowId(null);
    const store = useVaultStore.getState();
    if (store.activePath && store.activePath.includes('#row:')) {
      const { dbPath } = parseDatabaseRowPath(store.activePath);
      if (dbPath) {
        useVaultStore.setState({ activePath: dbPath });
      }
    }
  }, []);


  // Listener em tempo real para atualizações da base por drag & drop / exclusão externa / adição de notas
  React.useEffect(() => {
    const handleDbUpdated = (e: Event) => {
      const customEv = e as CustomEvent<{ dbPath: string; removedRowId?: string }>;
      const targetPath = currentPath || cleanDbPath;
      if (
        customEv.detail &&
        customEv.detail.dbPath &&
        customEv.detail.dbPath === targetPath
      ) {
        if (customEv.detail.removedRowId) {
          dbHook.deleteRow(customEv.detail.removedRowId);
        } else {
          storageHook.loadDatabaseFromDisk(targetPath).then((loaded) => {
            if (loaded) {
              dbHook.loadDatabase(loaded);
            }
          });
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('supercanvas-db-updated', handleDbUpdated);
      return () => {
        window.removeEventListener('supercanvas-db-updated', handleDbUpdated);
      };
    }
  }, [currentPath, cleanDbPath, dbHook, storageHook]);

  // 3. Search & Query State
  const [searchQuery, setSearchQuery] = useState('');

  const queryHook = useDatabaseQuery({
    rows: database.rows,
    properties: database.properties,
    activeViewConfig: activeView,
    searchQuery,
  });

  const {
    filteredAndSortedRows,
    groupedRows,
    groupKeys,
    activeFilterCount,
    activeSortCount,
  } = queryHook;

  // 4. Modal & Popover States
  const [peekRowId, setPeekRowId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [propertyModalState, setPropertyModalState] = useState<{
    isOpen: boolean;
    property?: PropertyDefinition | null;
  }>({ isOpen: false, property: null });

  const [uploadTarget, setUploadTarget] = useState<{
    rowId: string;
    propertyId: string;
  } | null>(null);

  // Active record for Peek Modal
  const activePeekRow = database.rows.find((r) => r.id === peekRowId) || null;

  // Handler for adding a new row
  const handleAddNewRow = (initialValues?: Partial<DatabaseRow>) => {
    const newRow = addRow(initialValues);
    return newRow;
  };

  const handleAddNewRowAtIndex = (targetIndex: number) => {
    const newRow = addRow(undefined, targetIndex);
    return newRow;
  };

  // Handler for quick option creation
  const handleCreateOption = (
    propertyId: string,
    name: string,
    color: PropertyOptionColor
  ) => {
    const prop = database.properties.find((p) => p.id === propertyId);
    if (!prop) return;

    const newOpt = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      color,
    };

    updateProperty(propertyId, {
      options: [...(prop.options || []), newOpt],
    });
  };

  // Handler for file upload attachment
  const handleUploadAttachment = (attachment: DatabaseAttachment) => {
    if (!uploadTarget) return;
    const { rowId, propertyId } = uploadTarget;
    const row = database.rows.find((r) => r.id === rowId);
    if (!row) return;

    const currentFiles: DatabaseAttachment[] = Array.isArray(row.properties[propertyId])
      ? row.properties[propertyId]
      : [];

    updateRowProperty(rowId, propertyId, [...currentFiles, attachment]);
    setUploadTarget(null);
  };

  // Handler for exporting to markdown
  const handleExportMarkdown = () => {
    const md = serializeDatabaseToMarkdown(database);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${database.title || 'database'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save property from config modal
  const handleSaveProperty = (prop: PropertyDefinition) => {
    const existing = database.properties.find((p) => p.id === prop.id);
    if (existing) {
      updateProperty(prop.id, prop);
    } else {
      addProperty(prop);
    }
  };

  // Drag and drop state for importing notes directly into the open DB view tab
  const [isDragOverView, setIsDragOverView] = useState(false);

  const handleDragOverView = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/rpgsa-vault-note') ||
      e.dataTransfer.types.includes('application/rpgsa-vault-database') ||
      e.dataTransfer.types.includes('text/plain') ||
      (e.dataTransfer.files && e.dataTransfer.files.length > 0)
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOverView(true);
    }
  }, []);

  const handleDragLeaveView = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverView(false);
    }
  }, []);

  const handleDropView = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverView(false);

      const targetDbPath = currentPath || cleanDbPath;
      const provider = useVaultStore.getState().provider;

      const noteDataRaw = e.dataTransfer.getData('application/rpgsa-vault-note');
      const plainPath = e.dataTransfer.getData('text/plain');

      let sourcePath = '';
      if (noteDataRaw) {
        try {
          const parsed = JSON.parse(noteDataRaw);
          sourcePath = parsed.path;
        } catch {}
      }
      if (!sourcePath && plainPath && (plainPath.endsWith('.md') || plainPath.endsWith('.txt') || plainPath.includes('#row:'))) {
        sourcePath = plainPath;
      }

      if (sourcePath && targetDbPath && provider) {
        await importPathToDatabase(targetDbPath, sourcePath, provider);
        await useVaultStore.getState().refreshNodes();
        return;
      }

      // External files
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.type.startsWith('text/')) {
            const text = await file.text();
            const title = file.name.replace(/\.(md|txt)$/i, '');
            addRow({ title, content: text });
          }
        }
      }
    },
    [currentPath, cleanDbPath, addRow]
  );

  return (
    <div
      onDragOver={handleDragOverView}
      onDragLeave={handleDragLeaveView}
      onDrop={handleDropView}
      className="relative w-full h-full flex flex-col bg-white dark:bg-[#151828] text-stone-900 dark:text-[#F4F0E6] overflow-hidden"
    >
      {isDragOverView && (
        <div className="absolute inset-0 z-50 bg-[#1831D7]/15 dark:bg-[#7F95FF]/20 backdrop-blur-xs border-2 border-dashed border-[#1831D7] dark:border-[#7F95FF] rounded-xl flex flex-col items-center justify-center p-6 text-center shadow-2xl animate-in fade-in duration-150 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#1E2238] border border-stone-200 dark:border-white/10 flex items-center justify-center text-[#1831D7] dark:text-[#7F95FF] shadow-lg mb-3">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-stone-900 dark:text-white">
            Solte a nota para importar na Base de Dados
          </h3>
          <p className="text-xs text-stone-600 dark:text-neutral-300 max-w-sm mt-1">
            O arquivo será adicionado como um novo registro nesta base de dados.
          </p>
        </div>
      )}
      {/* 1. Header with Title & Description */}
      <DatabaseHeader
        title={database.title}
        description={database.description}
        icon={database.icon}
        totalRows={database.rows.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onUpdateTitle={handleUpdateTitle}
        onUpdateDescription={updateDescription}
        onExportMarkdown={handleExportMarkdown}
        isSaving={storageHook.isSaving}
        isInline={isInline}
      />

      {/* 2. Navigation Tabs & Active View Actions Toolbar */}
      <DatabaseViewTabs
        views={database.views}
        activeViewId={activeView.id}
        onSelectView={setActiveView}
        onAddView={(type, name) => addView(type, name)}
        onRenameView={(viewId, newName) => updateView(viewId, { name: newName })}
        onDeleteView={deleteView}
        onReorderViews={reorderViews}
        isInline={isInline}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilterCount={activeFilterCount}
        onOpenFilterConfig={() => setIsFilterOpen(true)}
        activeSortCount={activeSortCount}
        onOpenSortConfig={() => setIsSortOpen(true)}
        onOpenViewSettings={() => setIsSettingsOpen(true)}
        onAddNewRow={() => handleAddNewRow()}
      />

      {/* 3. Main View Render Container */}
      <div className="flex-1 overflow-auto bg-stone-50/50 dark:bg-black/10">
        {activeView.type === 'table' && (
          <DatabaseTableView
            rows={filteredAndSortedRows}
            properties={database.properties}
            viewConfig={activeView}
            databasePath={currentPath || cleanDbPath}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={() => handleAddNewRow()}
            onAddNewRowAtIndex={handleAddNewRowAtIndex}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            onDuplicateRow={duplicateRow}
            onDeleteRow={deleteRow}
            onUpdateViewConfig={(updates) => updateView(activeView.id, updates)}
            onOpenAddProperty={() =>
              setPropertyModalState({ isOpen: true, property: null })
            }
            onAddProperty={(prop) => addProperty(prop)}
            onEditProperty={(prop) =>
              setPropertyModalState({ isOpen: true, property: prop })
            }
            onDeleteProperty={deleteProperty}
            onOpenUploadPopover={(rowId, propId) =>
              setUploadTarget({ rowId, propertyId: propId })
            }
            onCreateOption={handleCreateOption}
            isInline={isInline}
            onContextMenu={handleRowContextMenu}
          />
        )}

        {activeView.type === 'board' && (
          <DatabaseBoardView
            groupedRows={groupedRows}
            groupKeys={groupKeys}
            properties={database.properties}
            viewConfig={activeView}
            databasePath={currentPath || cleanDbPath}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={(initialVals) => handleAddNewRow(initialVals)}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            isInline={isInline}
            onContextMenu={handleRowContextMenu}
          />
        )}

        {activeView.type === 'gallery' && (
          <DatabaseGalleryView
            rows={filteredAndSortedRows}
            properties={database.properties}
            viewConfig={activeView}
            databasePath={currentPath || cleanDbPath}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={() => handleAddNewRow()}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            isInline={isInline}
            onContextMenu={handleRowContextMenu}
          />
        )}

        {activeView.type === 'list' && (
          <DatabaseListView
            rows={filteredAndSortedRows}
            properties={database.properties}
            viewConfig={activeView}
            databasePath={currentPath || cleanDbPath}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={() => handleAddNewRow()}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            onDeleteRow={deleteRow}
            isInline={isInline}
            onContextMenu={handleRowContextMenu}
          />
        )}
      </div>

      {/* 4. Context Menu de Linha / Nota do Banco */}
      {rowContextMenu && (
        <DatabaseRowContextMenu
          x={rowContextMenu.x}
          y={rowContextMenu.y}
          row={rowContextMenu.row}
          databasePath={currentPath || cleanDbPath}
          onClose={() => setRowContextMenu(null)}
          onOpenPeek={(rowId) => setPeekRowId(rowId)}
          onDuplicateRow={duplicateRow}
          onDeleteRow={deleteRow}
        />
      )}

      {/* 5. Record Peek Modal / Drawer */}
      <RecordPeekModal
        isOpen={Boolean(peekRowId)}
        row={activePeekRow}
        properties={database.properties}
        databaseName={database.title || databasePath?.split('/').pop()?.replace(/\.(db\.json\.md|db\.json|database)$/i, '') || 'Base de Dados'}
        onClose={handleClosePeek}
        onUpdateProperty={updateRowProperty}
        onUpdateContent={updateRowContent}
        onUpdateMetadata={updateRowMetadata}
        onOpenAddProperty={() =>
          setPropertyModalState({ isOpen: true, property: null })
        }
        onDeleteRow={deleteRow}
      />

      {/* 6. Property Configuration Modal */}
      <PropertyConfigModal
        isOpen={propertyModalState.isOpen}
        property={propertyModalState.property}
        onClose={() => setPropertyModalState({ isOpen: false, property: null })}
        onSave={handleSaveProperty}
        onDelete={deleteProperty}
      />

      {/* 7. Filter Configuration Popover */}
      <FilterConfigPopover
        isOpen={isFilterOpen}
        properties={database.properties}
        filterGroup={activeView.filterGroup}
        onUpdateFilterGroup={(newGroup: FilterGroup) =>
          updateView(activeView.id, { filterGroup: newGroup })
        }
        onClose={() => setIsFilterOpen(false)}
      />

      {/* 8. Sort Configuration Popover */}
      <SortConfigPopover
        isOpen={isSortOpen}
        properties={database.properties}
        sorts={activeView.sorts}
        onUpdateSorts={(newSorts: SortRule[]) =>
          updateView(activeView.id, { sorts: newSorts })
        }
        onClose={() => setIsSortOpen(false)}
      />

      {/* 9. View Settings Popover */}
      <ViewSettingsPopover
        isOpen={isSettingsOpen}
        viewConfig={activeView}
        properties={database.properties}
        onUpdateViewConfig={(updates) => updateView(activeView.id, updates)}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 10. File Upload Popover */}
      <FileUploadPopover
        isOpen={Boolean(uploadTarget)}
        onClose={() => setUploadTarget(null)}
        onUpload={handleUploadAttachment}
      />
    </div>
  );
};
