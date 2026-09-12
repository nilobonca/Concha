import React, { useState, useCallback } from 'react';
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

// Header components
import { DatabaseHeader } from './header/DatabaseHeader';
import { DatabaseViewTabs } from './header/DatabaseViewTabs';

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
    setActiveView,
  } = dbHook;

  // Track active database path (which can change when renamed)
  const [currentPath, setCurrentPath] = useState<string | undefined>(databasePath);

  React.useEffect(() => {
    if (databasePath) {
      setCurrentPath(databasePath);
    }
  }, [databasePath]);

  // 2. Storage Hook (disk / IDB / vault sync)
  const storageHook = useDatabaseStorage({
    database,
    vaultPath: currentPath || databasePath,
    isDirty,
    onSaved: () => dbHook.markSaved(),
  });

  // Handler for title change that renames the database file on disk too
  const handleUpdateTitle = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;

      // 1. Atualiza estado em memória da base de dados
      updateTitle(trimmed);

      // 2. Se a base de dados estiver vinculada a um arquivo no Vault, renomeia o arquivo também
      const activeDatabasePath = currentPath || databasePath;
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
    [currentPath, databasePath, database, updateTitle, storageHook]
  );

  // Carrega a base do disco quando databasePath é fornecido
  React.useEffect(() => {
    if (databasePath && !initialData) {
      storageHook.loadDatabaseFromDisk(databasePath).then((loaded) => {
        if (loaded) {
          dbHook.loadDatabase(loaded);
        } else {
          const cleanTitle = databasePath
            .split('/')
            .pop()
            ?.replace(/\.(db\.json\.md|db\.json|database)$/i, '');
          if (cleanTitle && cleanTitle !== database.title) {
            dbHook.updateTitle(cleanTitle);
          }
        }
      });
    }
  }, [databasePath]);

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

  return (
    <div className="flex flex-col w-full h-full bg-[#FAF9F6] dark:bg-[#17192A] text-stone-900 dark:text-[#F4F0E6] overflow-hidden">
      {/* 1. Database Header */}
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

      {/* 2. View Tabs + Toolbar (unified bar) */}
      <DatabaseViewTabs
        views={database.views}
        activeViewId={activeView.id}
        onSelectView={setActiveView}
        onAddView={(type, name) => addView(type, name)}
        onRenameView={(viewId, name) => updateView(viewId, { name })}
        onDeleteView={deleteView}
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

      {/* 4. Active View Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeView.type === 'table' && (
          <DatabaseTableView
            rows={filteredAndSortedRows}
            properties={database.properties}
            viewConfig={activeView}
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
          />
        )}

        {activeView.type === 'board' && (
          <DatabaseBoardView
            groupedRows={groupedRows}
            groupKeys={groupKeys}
            properties={database.properties}
            viewConfig={activeView}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={(initialVals) => handleAddNewRow(initialVals)}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            isInline={isInline}
          />
        )}

        {activeView.type === 'gallery' && (
          <DatabaseGalleryView
            rows={filteredAndSortedRows}
            properties={database.properties}
            viewConfig={activeView}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={() => handleAddNewRow()}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            isInline={isInline}
          />
        )}

        {activeView.type === 'list' && (
          <DatabaseListView
            rows={filteredAndSortedRows}
            properties={database.properties}
            viewConfig={activeView}
            onUpdateProperty={updateRowProperty}
            onAddNewRow={() => handleAddNewRow()}
            onOpenPeek={(rowId) => setPeekRowId(rowId)}
            onDeleteRow={deleteRow}
            isInline={isInline}
          />
        )}
      </div>

      {/* 5. Record Peek Modal / Drawer */}
      <RecordPeekModal
        isOpen={Boolean(peekRowId)}
        row={activePeekRow}
        properties={database.properties}
        onClose={() => setPeekRowId(null)}
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
