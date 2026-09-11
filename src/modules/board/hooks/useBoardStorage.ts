import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardData } from '../types';
import { cleanLegacyPlaceholder } from '@/utils/cleanLegacyPlaceholder';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { saveCanvasToDisk } from '@/modules/vault/utils/canvasDiskSync';

const DB_NAME = 'RPGSA_DB';
const STORE_NAME = 'keyval';
const LS_PREFIX = 'board_data_';

function openKeyvalDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
          resolve(db);
        } else {
          // Se a store keyval não existe, eleva a versão para criá-la com segurança
          const nextVersion = db.version + 1;
          db.close();
          const upReq = indexedDB.open(DB_NAME, nextVersion);
          upReq.onupgradeneeded = () => {
            const upDb = upReq.result;
            if (!upDb.objectStoreNames.contains(STORE_NAME)) {
              upDb.createObjectStore(STORE_NAME);
            }
          };
          upReq.onsuccess = () => resolve(upReq.result);
          upReq.onerror = () => {
            console.warn('Falha ao atualizar RPGSA_DB para criar keyval:', upReq.error);
            resolve(null);
          };
          upReq.onblocked = () => {
            console.warn('Abertura de IndexedDB bloqueada por outra conexão ativa');
            resolve(null);
          };
        }
      };
      req.onerror = () => {
        console.warn('Erro ao abrir IndexedDB:', req.error);
        resolve(null);
      };
      req.onblocked = () => {
        console.warn('IndexedDB bloqueado por outra conexão');
        resolve(null);
      };
    } catch (e) {
      console.warn('Exceção ao abrir IndexedDB:', e);
      resolve(null);
    }
  });
}

export async function getBoardDataFromStorage(boardId: string): Promise<BoardData | null> {
  let idbData: BoardData | null = null;
  let lsData: BoardData | null = null;

  // 1. Ler do localStorage (rápido e síncrono)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(`${LS_PREFIX}${boardId}`);
      if (raw) {
        lsData = JSON.parse(raw);
      }
    }
  } catch (e) {
    console.warn('Erro ao ler board do localStorage:', e);
  }

  // 2. Ler do IndexedDB
  try {
    const db = await openKeyvalDB();
    if (db && db.objectStoreNames.contains(STORE_NAME)) {
      idbData = await new Promise<BoardData | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(`${LS_PREFIX}${boardId}`);
        req.onsuccess = () => {
          const val = req.result;
          if (val) {
            try {
              const parsed = typeof val === 'string' ? JSON.parse(val) : val;
              resolve(parsed);
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    }
  } catch (err) {
    console.error('Erro ao ler board do IndexedDB:', err);
  }

  // 3. Escolhe a versão mais recente entre IndexedDB e localStorage
  let chosenData: BoardData | null = null;
  if (idbData && lsData) {
    const timeIdb = idbData.updatedAt ? new Date(idbData.updatedAt).getTime() : 0;
    const timeLs = lsData.updatedAt ? new Date(lsData.updatedAt).getTime() : 0;
    chosenData = timeIdb >= timeLs ? idbData : lsData;
  } else {
    chosenData = idbData || lsData;
  }

  if (chosenData && Array.isArray(chosenData.elements)) {
    let changed = false;
    chosenData.elements = chosenData.elements.map((el: any) => {
      if (el.type === 'note' && el.data?.content) {
        const cleaned = cleanLegacyPlaceholder(el.data.content);
        if (cleaned !== el.data.content) {
          changed = true;
          return { ...el, data: { ...el.data, content: cleaned } };
        }
      }
      return el;
    });
    if (changed) {
      saveBoardDataToStorage(chosenData);
    }
  }

  return chosenData;
}

export async function saveBoardDataToStorage(data: BoardData, explicitFolder?: string | null): Promise<void> {
  if (!data || !data.id) return;

  // 1. Salvar no localStorage de forma imediata (proteção contra perda e travamento)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`${LS_PREFIX}${data.id}`, JSON.stringify(data));
    }
  } catch (lsErr) {
    console.warn('Erro ao salvar board no localStorage:', lsErr);
  }

  // 2. Salvar no IndexedDB
  try {
    const db = await openKeyvalDB();
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) return;

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(JSON.stringify(data), `${LS_PREFIX}${data.id}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Erro ao salvar board no IndexedDB:', err);
  }

  // 3. Salvar no arquivo físico .canvas no Windows
  try {
    const vaultStore = useVaultStore.getState();
    let provider = vaultStore.provider;
    if (!provider) {
      await vaultStore.initializeStorage();
      provider = useVaultStore.getState().provider;
    }

    if (provider) {
      let folderPath: string = '';
      if (explicitFolder !== undefined && explicitFolder !== null) {
        folderPath = explicitFolder;
      } else {
        const match = vaultStore.canvases.find(c => c.id === data.id);
        if (match && match.folderPath) {
          folderPath = match.folderPath;
        }
      }

      await saveCanvasToDisk(provider, folderPath, data.name, data);
    }
  } catch (syncErr) {
    console.warn('[useBoardStorage] Aviso ao sincronizar com arquivo físico .canvas:', syncErr);
  }
}

export async function updateBoardNameInIDB(boardId: string, newName: string): Promise<void> {
  try {
    const saved = await getBoardDataFromStorage(boardId);
    if (saved) {
      if (saved.name === newName) return;
      saved.name = newName;
      saved.updatedAt = new Date().toISOString();
      await saveBoardDataToStorage(saved);
    } else {
      const initial: BoardData = {
        id: boardId,
        name: newName,
        elements: [],
        connections: [],
        updatedAt: new Date().toISOString(),
      };
      await saveBoardDataToStorage(initial);
    }
  } catch (err) {
    console.error('Erro ao atualizar nome do board no storage:', err);
  }
}

export function useBoardStorage(boardId: string, initialName?: string, folderPath?: string | null) {
  const [boardData, setBoardData] = useState<BoardData>({
    id: boardId,
    name: initialName || 'Quadro de Conexões',
    elements: [],
    connections: [],
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const isLoadedRef = useRef(false);
  const latestBoardDataRef = useRef(boardData);
  latestBoardDataRef.current = boardData;
  const folderPathRef = useRef<string | null | undefined>(folderPath);
  folderPathRef.current = folderPath;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Executa salvamento imediatamente e cancela timeout pendente
  const flushSave = useCallback((dataToSave?: BoardData) => {
    if (!isLoadedRef.current) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const target = dataToSave || latestBoardDataRef.current;
    if (target && target.id) {
      saveBoardDataToStorage(target, folderPathRef.current);
    }
  }, []);

  // Agenda salvamento imediato ou com debounce
  const scheduleSave = useCallback((immediate = false) => {
    if (!isLoadedRef.current) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (immediate) {
      flushSave();
    } else {
      saveTimeoutRef.current = setTimeout(() => {
        flushSave();
      }, 350);
    }
  }, [flushSave]);

  // Carregar dados salvos ao montar ou quando mudar boardId
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    isLoadedRef.current = false;

    getBoardDataFromStorage(boardId).then((saved) => {
      if (!isMounted) return;
      if (saved) {
        if (initialName && saved.name !== initialName && initialName !== 'Quadro de Conexões') {
          saved.name = initialName;
        }
        setBoardData(saved);
        latestBoardDataRef.current = saved;
      } else {
        const initial: BoardData = {
          id: boardId,
          name: initialName || 'Quadro de Conexões',
          elements: [],
          connections: [],
          updatedAt: new Date().toISOString(),
        };
        setBoardData(initial);
        latestBoardDataRef.current = initial;
        saveBoardDataToStorage(initial);
      }
      isLoadedRef.current = true;
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      // Ao desmontar: NUNCA descarta alterações pendentes, grava imediatamente!
      if (isLoadedRef.current && saveTimeoutRef.current) {
        flushSave();
      }
    };
  }, [boardId]); // Não re-carrega se apenas initialName mudar, prevenindo corrida

  // Sincronizar nome caso initialName mude externamente APENAS após o carregamento
  useEffect(() => {
    if (!isLoadedRef.current || isLoading) return;
    if (initialName && initialName !== 'Quadro de Conexões') {
      setBoardData(prev => {
        if (prev.name === initialName) return prev;
        const updated = { ...prev, name: initialName, updatedAt: new Date().toISOString() };
        latestBoardDataRef.current = updated;
        saveBoardDataToStorage(updated);
        return updated;
      });
    }
  }, [initialName, isLoading]);

  // Salvar no beforeunload caso a janela/aba seja recarregada ou fechada
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoadedRef.current) {
        flushSave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushSave]);

  // Salvar alterações com debounce ou imediatamente
  const persistBoard = useCallback((
    dataOrUpdater: BoardData | ((prev: BoardData) => BoardData),
    immediate: boolean = false
  ) => {
    if (!isLoadedRef.current) return;
    setBoardData(prev => {
      const next = typeof dataOrUpdater === 'function' ? dataOrUpdater(prev) : dataOrUpdater;
      latestBoardDataRef.current = next;
      return next;
    });
    scheduleSave(immediate);
  }, [scheduleSave]);

  return {
    boardData,
    setBoardData,
    persistBoard,
    isLoading,
    flushSave,
  };
}

