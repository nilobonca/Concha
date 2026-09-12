/**
 * Supercanvas Database - Core Database State Hook
 * Provides full reactive CRUD operations for properties, rows, views, and undo/redo history.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DatabaseInstance,
  DatabaseRow,
  DatabaseViewConfig,
  DatabaseViewType,
  PropertyDefinition,
  PropertyType,
} from '../types';
import {
  createDefaultDatabase,
  createDefaultProperty,
  createDefaultRow,
  createDefaultView,
  generateRowId,
} from '../utils/databaseDefaults';

export interface UseDatabaseOptions {
  initialDatabase?: DatabaseInstance;
  onAutoSave?: (db: DatabaseInstance) => void;
  maxHistory?: number;
}

export interface UseDatabaseReturn {
  database: DatabaseInstance;
  activeView: DatabaseViewConfig;
  isDirty: boolean;
  lastSavedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  loadDatabase: (newDb: DatabaseInstance) => void;
  resetDatabase: (newDb?: DatabaseInstance) => void;

  // Database metadata
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;
  updateIcon: (icon: string) => void;
  updateCoverImage: (coverImage: string) => void;

  // Properties CRUD
  addProperty: (
    property: Partial<PropertyDefinition> & { name: string; type: PropertyType }
  ) => PropertyDefinition;
  updateProperty: (propertyId: string, updates: Partial<PropertyDefinition>) => void;
  deleteProperty: (propertyId: string) => void;
  reorderProperties: (newPropertyIds: string[]) => void;

  // Rows CRUD
  addRow: (initialValues?: Partial<DatabaseRow>, targetIndex?: number) => DatabaseRow;
  updateRowProperty: (rowId: string, propertyId: string, value: any) => void;
  updateRowContent: (rowId: string, content: string) => void;
  updateRowMetadata: (rowId: string, updates: Partial<Pick<DatabaseRow, 'icon' | 'coverImage' | 'title'>>) => void;
  deleteRow: (rowId: string) => void;
  deleteRows: (rowIds: string[]) => void;
  duplicateRow: (rowId: string) => DatabaseRow | null;
  reorderRows: (newOrderedRowIds: string[]) => void;

  // Views CRUD
  addView: (type: DatabaseViewType, name?: string) => DatabaseViewConfig;
  updateView: (viewId: string, updates: Partial<DatabaseViewConfig>) => void;
  deleteView: (viewId: string) => void;
  setActiveView: (viewId: string) => void;
}

export function useDatabase(options: UseDatabaseOptions = {}): UseDatabaseReturn {
  const { initialDatabase, maxHistory = 30 } = options;

  const [database, setDatabaseState] = useState<DatabaseInstance>(() => {
    return initialDatabase ? JSON.parse(JSON.stringify(initialDatabase)) : createDefaultDatabase();
  });

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Undo / Redo history stacks
  const historyRef = useRef<DatabaseInstance[]>([]);
  const futureRef = useRef<DatabaseInstance[]>([]);
  const [, setHistoryTick] = useState<number>(0);

  const pushState = useCallback(
    (newDb: DatabaseInstance, skipHistory: boolean = false) => {
      setDatabaseState((prevDb) => {
        if (!skipHistory) {
          historyRef.current = [...historyRef.current.slice(-maxHistory + 1), prevDb];
          futureRef.current = [];
        }
        return newDb;
      });
      setIsDirty(true);
      setHistoryTick((t) => t + 1);
    },
    [maxHistory]
  );

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);

    setDatabaseState((current) => {
      futureRef.current = [current, ...futureRef.current];
      return previous;
    });
    setIsDirty(true);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);

    setDatabaseState((current) => {
      historyRef.current = [...historyRef.current, current];
      return next;
    });
    setIsDirty(true);
    setHistoryTick((t) => t + 1);
  }, []);

  const markSaved = useCallback(() => {
    setIsDirty(false);
    setLastSavedAt(Date.now());
  }, []);

  const loadDatabase = useCallback((newDb: DatabaseInstance) => {
    setDatabaseState(JSON.parse(JSON.stringify(newDb)));
    historyRef.current = [];
    futureRef.current = [];
    setIsDirty(false);
    setLastSavedAt(Date.now());
    setHistoryTick((t) => t + 1);
  }, []);

  const resetDatabase = useCallback((newDb?: DatabaseInstance) => {
    const fresh = newDb ? JSON.parse(JSON.stringify(newDb)) : createDefaultDatabase();
    setDatabaseState(fresh);
    historyRef.current = [];
    futureRef.current = [];
    setIsDirty(false);
    setLastSavedAt(null);
    setHistoryTick((t) => t + 1);
  }, []);

  // Database metadata updates
  const updateTitle = useCallback(
    (title: string) => {
      pushState({
        ...database,
        title,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const updateDescription = useCallback(
    (description: string) => {
      pushState({
        ...database,
        description,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const updateIcon = useCallback(
    (icon: string) => {
      pushState({
        ...database,
        icon,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const updateCoverImage = useCallback(
    (coverImage: string) => {
      pushState({
        ...database,
        coverImage,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  // Properties CRUD
  const addProperty = useCallback(
    (propInput: Partial<PropertyDefinition> & { name: string; type: PropertyType }): PropertyDefinition => {
      const defaultProp = createDefaultProperty(propInput.type, propInput.name);
      const newProp: PropertyDefinition = {
        ...defaultProp,
        ...propInput,
        id: propInput.id || defaultProp.id,
      };

      const now = Date.now();
      const updatedProperties = [...database.properties, newProp];

      // Assign default property values to existing rows
      const updatedRows = database.rows.map((row) => {
        let initialVal: any = null;
        if (newProp.type === 'checkbox') initialVal = false;
        else if (newProp.type === 'multi-select' || newProp.type === 'files' || newProp.type === 'relation') initialVal = [];
        else if (newProp.type === 'status') initialVal = newProp.statusOptions?.[0]?.id || null;
        else if (newProp.type === 'created_time' || newProp.type === 'last_edited_time') initialVal = now;

        return {
          ...row,
          properties: {
            ...row.properties,
            [newProp.id]: initialVal,
          },
        };
      });

      // Update visible properties in all views
      const updatedViews = database.views.map((v) => ({
        ...v,
        visiblePropertyIds: [...v.visiblePropertyIds, newProp.id],
        columnWidths: {
          ...v.columnWidths,
          [newProp.id]: newProp.width || 160,
        },
      }));

      pushState({
        ...database,
        properties: updatedProperties,
        rows: updatedRows,
        views: updatedViews,
        updatedAt: now,
      });

      return newProp;
    },
    [database, pushState]
  );

  const updateProperty = useCallback(
    (propertyId: string, updates: Partial<PropertyDefinition>) => {
      const now = Date.now();
      const updatedProperties = database.properties.map((prop) => {
        if (prop.id !== propertyId) return prop;
        return { ...prop, ...updates };
      });

      pushState({
        ...database,
        properties: updatedProperties,
        updatedAt: now,
      });
    },
    [database, pushState]
  );

  const deleteProperty = useCallback(
    (propertyId: string) => {
      // Prevent deleting the title property
      const target = database.properties.find((p) => p.id === propertyId);
      if (target?.type === 'title') return;

      const now = Date.now();
      const updatedProperties = database.properties.filter((p) => p.id !== propertyId);

      // Clean rows
      const updatedRows = database.rows.map((row) => {
        const nextProps = { ...row.properties };
        delete nextProps[propertyId];
        return {
          ...row,
          properties: nextProps,
        };
      });

      // Clean views
      const updatedViews = database.views.map((v) => {
        const nextColumnWidths = { ...v.columnWidths };
        delete nextColumnWidths[propertyId];

        return {
          ...v,
          visiblePropertyIds: v.visiblePropertyIds.filter((id) => id !== propertyId),
          columnWidths: nextColumnWidths,
          groupByPropertyId: v.groupByPropertyId === propertyId ? undefined : v.groupByPropertyId,
          sorts: v.sorts.filter((s) => s.propertyId !== propertyId),
          filterGroup: {
            ...v.filterGroup,
            rules: v.filterGroup.rules.filter((r) => r.propertyId !== propertyId),
          },
        };
      });

      pushState({
        ...database,
        properties: updatedProperties,
        rows: updatedRows,
        views: updatedViews,
        updatedAt: now,
      });
    },
    [database, pushState]
  );

  const reorderProperties = useCallback(
    (newPropertyIds: string[]) => {
      const propMap = new Map(database.properties.map((p) => [p.id, p]));
      const ordered: PropertyDefinition[] = [];

      newPropertyIds.forEach((id) => {
        const prop = propMap.get(id);
        if (prop) {
          ordered.push(prop);
          propMap.delete(id);
        }
      });
      // Append any remaining
      propMap.forEach((prop) => ordered.push(prop));

      pushState({
        ...database,
        properties: ordered,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  // Rows CRUD
  const addRow = useCallback(
    (initialValues?: Partial<DatabaseRow>, targetIndex?: number): DatabaseRow => {
      const newRow = createDefaultRow(database.properties, initialValues?.title);
      if (initialValues) {
        if (initialValues.properties) {
          newRow.properties = { ...newRow.properties, ...initialValues.properties };
        }
        if (initialValues.content) newRow.content = initialValues.content;
        if (initialValues.icon) newRow.icon = initialValues.icon;
        if (initialValues.coverImage) newRow.coverImage = initialValues.coverImage;
      }

      let nextRows = [...database.rows];
      if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= nextRows.length) {
        nextRows.splice(targetIndex, 0, newRow);
      } else {
        nextRows.push(newRow);
      }

      pushState({
        ...database,
        rows: nextRows,
        updatedAt: Date.now(),
      });

      return newRow;
    },
    [database, pushState]
  );

  const updateRowProperty = useCallback(
    (rowId: string, propertyId: string, value: any) => {
      const now = Date.now();
      const titleProp = database.properties.find((p) => p.id === propertyId && p.type === 'title');

      const updatedRows = database.rows.map((row) => {
        if (row.id !== rowId) return row;

        const nextProps = { ...row.properties, [propertyId]: value };

        // Also touch last_edited_time if present
        database.properties.forEach((p) => {
          if (p.type === 'last_edited_time') {
            nextProps[p.id] = now;
          }
        });

        return {
          ...row,
          title: titleProp ? String(value || '') : row.title,
          properties: nextProps,
          updatedAt: now,
        };
      });

      pushState({
        ...database,
        rows: updatedRows,
        updatedAt: now,
      });
    },
    [database, pushState]
  );

  const updateRowContent = useCallback(
    (rowId: string, content: string) => {
      const now = Date.now();
      const updatedRows = database.rows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          content,
          updatedAt: now,
        };
      });

      pushState({
        ...database,
        rows: updatedRows,
        updatedAt: now,
      });
    },
    [database, pushState]
  );

  const updateRowMetadata = useCallback(
    (rowId: string, updates: Partial<Pick<DatabaseRow, 'icon' | 'coverImage' | 'title'>>) => {
      const now = Date.now();
      const titleProp = database.properties.find((p) => p.type === 'title');

      const updatedRows = database.rows.map((row) => {
        if (row.id !== rowId) return row;
        const nextRow = { ...row, ...updates, updatedAt: now };
        if (updates.title && titleProp) {
          nextRow.properties = { ...nextRow.properties, [titleProp.id]: updates.title };
        }
        return nextRow;
      });

      pushState({
        ...database,
        rows: updatedRows,
        updatedAt: now,
      });
    },
    [database, pushState]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      pushState({
        ...database,
        rows: database.rows.filter((r) => r.id !== rowId),
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const deleteRows = useCallback(
    (rowIds: string[]) => {
      const set = new Set(rowIds);
      pushState({
        ...database,
        rows: database.rows.filter((r) => !set.has(r.id)),
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const duplicateRow = useCallback(
    (rowId: string): DatabaseRow | null => {
      const source = database.rows.find((r) => r.id === rowId);
      if (!source) return null;

      const now = Date.now();
      const duplicated: DatabaseRow = {
        ...source,
        id: generateRowId(),
        title: `${source.title} (Copy)`,
        properties: { ...source.properties },
        createdAt: now,
        updatedAt: now,
      };

      const titleProp = database.properties.find((p) => p.type === 'title');
      if (titleProp) {
        duplicated.properties[titleProp.id] = duplicated.title;
      }

      pushState({
        ...database,
        rows: [...database.rows, duplicated],
        updatedAt: now,
      });

      return duplicated;
    },
    [database, pushState]
  );

  const reorderRows = useCallback(
    (newOrderedRowIds: string[]) => {
      const rowMap = new Map(database.rows.map((r) => [r.id, r]));
      const ordered: DatabaseRow[] = [];

      newOrderedRowIds.forEach((id) => {
        const row = rowMap.get(id);
        if (row) {
          ordered.push(row);
          rowMap.delete(id);
        }
      });
      rowMap.forEach((row) => ordered.push(row));

      pushState({
        ...database,
        rows: ordered,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  // Views CRUD
  const addView = useCallback(
    (type: DatabaseViewType, name?: string): DatabaseViewConfig => {
      const newView = createDefaultView(type, name, database.properties);
      pushState({
        ...database,
        views: [...database.views, newView],
        activeViewId: newView.id,
        updatedAt: Date.now(),
      });
      return newView;
    },
    [database, pushState]
  );

  const updateView = useCallback(
    (viewId: string, updates: Partial<DatabaseViewConfig>) => {
      const updatedViews = database.views.map((v) => {
        if (v.id !== viewId) return v;
        return { ...v, ...updates };
      });

      pushState({
        ...database,
        views: updatedViews,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const deleteView = useCallback(
    (viewId: string) => {
      // Must have at least one view remaining
      if (database.views.length <= 1) return;

      const remainingViews = database.views.filter((v) => v.id !== viewId);
      const nextActiveId =
        database.activeViewId === viewId ? remainingViews[0].id : database.activeViewId;

      pushState({
        ...database,
        views: remainingViews,
        activeViewId: nextActiveId,
        updatedAt: Date.now(),
      });
    },
    [database, pushState]
  );

  const setActiveView = useCallback(
    (viewId: string) => {
      if (database.activeViewId === viewId) return;
      if (!database.views.some((v) => v.id === viewId)) return;

      setDatabaseState((prev) => ({
        ...prev,
        activeViewId: viewId,
      }));
    },
    [database.activeViewId, database.views]
  );

  const activeView = useMemo(() => {
    return (
      database.views.find((v) => v.id === database.activeViewId) ||
      database.views[0] ||
      createDefaultView('table', 'Table', database.properties)
    );
  }, [database.views, database.activeViewId, database.properties]);

  return {
    database,
    activeView,
    isDirty,
    lastSavedAt,
    canUndo,
    canRedo,
    undo,
    redo,
    markSaved,
    loadDatabase,
    resetDatabase,

    updateTitle,
    updateDescription,
    updateIcon,
    updateCoverImage,

    addProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,

    addRow,
    updateRowProperty,
    updateRowContent,
    updateRowMetadata,
    deleteRow,
    deleteRows,
    duplicateRow,
    reorderRows,

    addView,
    updateView,
    deleteView,
    setActiveView,
  };
}
