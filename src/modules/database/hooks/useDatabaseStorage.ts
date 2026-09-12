/**
 * Supercanvas Database - Storage Hook
 * Integrates with Vault storage provider (FSA/IDB/Electron) with IndexedDB & LocalStorage fallbacks.
 * Handles debounced auto-saving and file serialization (.db.json).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DatabaseInstance } from '../types';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';

const DB_STORE_NAME = 'RPGSA_DB';
const DB_OBJECT_STORE = 'keyval';
const LS_PREFIX = 'supercanvas_db_';

function openKeyvalDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const req = indexedDB.open(DB_STORE_NAME);
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(DB_OBJECT_STORE)) {
          resolve(db);
        } else {
          const nextVersion = db.version + 1;
          db.close();
          const upReq = indexedDB.open(DB_STORE_NAME, nextVersion);
          upReq.onupgradeneeded = () => {
            const upDb = upReq.result;
            if (!upDb.objectStoreNames.contains(DB_OBJECT_STORE)) {
              upDb.createObjectStore(DB_OBJECT_STORE);
            }
          };
          upReq.onsuccess = () => resolve(upReq.result);
          upReq.onerror = () => resolve(null);
          upReq.onblocked = () => resolve(null);
        }
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openKeyvalDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(DB_OBJECT_STORE, 'readonly');
      const store = tx.objectStore(DB_OBJECT_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDB<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openKeyvalDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(DB_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(DB_OBJECT_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => {
        db.close();
        resolve(true);
      };
      req.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export interface UseDatabaseStorageOptions {
  database: DatabaseInstance;
  vaultPath?: string;
  isDirty?: boolean;
  onSaved?: () => void;
  autoSaveDelay?: number;
}

export interface UseDatabaseStorageReturn {
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  error: string | null;
  resolvedPath: string;
  saveNow: (targetDatabase?: DatabaseInstance) => Promise<boolean>;
  loadDatabaseFromDisk: (filePath?: string) => Promise<DatabaseInstance | null>;
}

export function useDatabaseStorage(options: UseDatabaseStorageOptions): UseDatabaseStorageReturn {
  const {
    database,
    vaultPath,
    isDirty = false,
    onSaved,
    autoSaveDelay = 1200,
  } = options;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vault store provider
  const provider = useVaultStore((state) => state.provider);

  const resolvedPath =
    vaultPath ||
    `Databases/${(database.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '_')}_${database.id}.db.json`;

  const databaseRef = useRef(database);
  databaseRef.current = database;

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const saveNow = useCallback(
    async (targetDatabase?: DatabaseInstance): Promise<boolean> => {
      const dbToSave = targetDatabase || databaseRef.current;
      setIsSaving(true);
      setError(null);

      const jsonString = JSON.stringify(dbToSave, null, 2);
      const storageKey = `${LS_PREFIX}${dbToSave.id}`;

      try {
        // 1. If Vault provider is available, persist to disk/FSA
        if (provider) {
          try {
            await provider.saveDocument(resolvedPath, jsonString);
          } catch (vaultErr) {
            console.warn('[useDatabaseStorage] Falha ao salvar no Vault provider, usando fallback:', vaultErr);
          }
        }

        // 2. Persist to IndexedDB
        await saveToIndexedDB(storageKey, dbToSave);

        // 3. Persist to LocalStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(storageKey, jsonString);
          } catch (lsErr) {
            console.warn('[useDatabaseStorage] LocalStorage quota exceeded or error:', lsErr);
          }
        }

        setLastSaved(new Date());
        setIsSaving(false);
        onSavedRef.current?.();
        return true;
      } catch (err: any) {
        console.error('[useDatabaseStorage] Erro ao salvar database:', err);
        setError(err.message || 'Failed to save database');
        setIsSaving(false);
        return false;
      }
    },
    [provider, resolvedPath]
  );

  const loadDatabaseFromDisk = useCallback(
    async (targetPath?: string): Promise<DatabaseInstance | null> => {
      const path = targetPath || resolvedPath;
      setIsLoading(true);
      setError(null);

      try {
        let loadedData: DatabaseInstance | null = null;

        // 1. Try reading from Vault provider
        if (provider) {
          try {
            const content = await provider.readDocument(path);
            if (content && content.trim().length > 0) {
              loadedData = JSON.parse(content) as DatabaseInstance;
            }
          } catch (vaultReadErr) {
            console.warn('[useDatabaseStorage] Arquivo não encontrado no provider, tentando IDB/LS:', vaultReadErr);
          }
        }

        // 2. Fallback to IndexedDB
        if (!loadedData) {
          const storageKey = `${LS_PREFIX}${database.id}`;
          const idbData = await getFromIndexedDB<DatabaseInstance>(storageKey);
          if (idbData) {
            loadedData = idbData;
          }
        }

        // 3. Fallback to LocalStorage
        if (!loadedData && typeof window !== 'undefined' && window.localStorage) {
          const storageKey = `${LS_PREFIX}${database.id}`;
          const lsRaw = localStorage.getItem(storageKey);
          if (lsRaw) {
            loadedData = JSON.parse(lsRaw) as DatabaseInstance;
          }
        }

        setIsLoading(false);
        return loadedData;
      } catch (err: any) {
        console.error('[useDatabaseStorage] Erro ao carregar database:', err);
        setError(err.message || 'Failed to load database');
        setIsLoading(false);
        return null;
      }
    },
    [provider, resolvedPath, database.id]
  );

  // Debounced auto-save when isDirty changes
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      saveNow();
    }, autoSaveDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [isDirty, autoSaveDelay, saveNow]);

  return {
    isSaving,
    isLoading,
    lastSaved,
    error,
    resolvedPath,
    saveNow,
    loadDatabaseFromDisk,
  };
}
