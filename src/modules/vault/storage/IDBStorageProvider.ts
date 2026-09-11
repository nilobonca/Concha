import { IVaultStorageProvider } from './VaultStorageAdapter';
import { VaultNode, VaultDocument, VaultFolder, VaultMediaFile } from '../interfaces/vault';
import { sanitizeVaultPath } from '../utils/fileNameUtils';

const DB_NAME = 'RPGSA_DB';

export class IDBStorageProvider implements IVaultStorageProvider {
  readonly type = 'idb' as const;
  private _vaultName: string;
  private _vaultId: string;
  private _isConnected: boolean = false;
  private urlCache = new Map<string, string>();

  constructor(vaultId: string = 'default-vault', vaultName: string = 'Meu Vault') {
    this._vaultId = vaultId;
    this._vaultName = vaultName;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get vaultName(): string {
    return this._vaultName;
  }

  get vaultId(): string {
    return this._vaultId;
  }

  async init(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const db = await this.getDB();
      this._isConnected = db.objectStoreNames.contains('vault_documents');
      return this._isConnected;
    } catch {
      this._isConnected = false;
      return false;
    }
  }

  async listNodes(subPath: string = ''): Promise<VaultNode[]> {
    const db = await this.getDB();
    const docs = await this.getAllDocs(db);
    const folders = await this.getAllFolders(db);
    const mediaFiles = await this.getAllMediaFiles(db);

    const relevantDocs = docs.filter(d => d.vaultId === this._vaultId);
    const relevantFolders = folders.filter(f => f.vaultId === this._vaultId);
    const relevantMedia = mediaFiles.filter(m => m.vaultId === this._vaultId);

    // Build hierarchy
    return this.buildTree(relevantDocs, relevantFolders, relevantMedia, subPath);
  }

  async saveFile(filePath: string, file: File | Blob): Promise<void> {
    const db = await this.getDB();
    const cleanPath = sanitizeVaultPath(filePath, false);
    const parts = cleanPath.split('/');
    const name = parts.pop() || 'file';
    const folderPath = parts.join('/');
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus'].includes(ext);
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif'].includes(ext);
    const fileType: 'audio' | 'image' | 'file' = isAudio ? 'audio' : isImage ? 'image' : 'file';

    const record: VaultMediaFile = {
      id: `${this._vaultId}:${filePath}`,
      vaultId: this._vaultId,
      name,
      path: filePath,
      folderPath,
      fileType,
      size: file.size,
      blob: file,
      mimeType: file.type,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('vault_files', 'readwrite');
      const store = tx.objectStore('vault_files');
      const req = store.put(record);
      req.onsuccess = () => {
        if (this.urlCache.has(filePath)) {
          URL.revokeObjectURL(this.urlCache.get(filePath)!);
          this.urlCache.delete(filePath);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getFileBlob(filePath: string): Promise<Blob> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vault_files', 'readonly');
      const store = tx.objectStore('vault_files');
      const req = store.get(`${this._vaultId}:${filePath}`);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          reject(new Error(`Arquivo de mídia não encontrado: ${filePath}`));
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getFileUrl(filePath: string): Promise<string> {
    if (this.urlCache.has(filePath)) {
      return this.urlCache.get(filePath)!;
    }
    const blob = await this.getFileBlob(filePath);
    const url = URL.createObjectURL(blob);
    this.urlCache.set(filePath, url);
    return url;
  }

  async readDocument(filePath: string): Promise<string> {
    if (!filePath || filePath.startsWith('canvas:')) return '';
    const db = await this.getDB();
    let cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (/%[0-9a-fA-F]{2}/.test(cleanPath)) {
      try { cleanPath = decodeURIComponent(cleanPath); } catch {}
    }
    cleanPath = cleanPath.normalize('NFC');
    const docId = this.buildDocId(cleanPath);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vault_documents', 'readonly');
      const store = tx.objectStore('vault_documents');
      const req = store.get(docId);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result.content || '');
        } else {
          // Resolve com string vazia em vez de rejeitar com erro para não derrubar a aplicação
          resolve('');
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveDocument(filePath: string, content: string): Promise<void> {
    const db = await this.getDB();
    const cleanPath = sanitizeVaultPath(filePath, false);
    const docId = this.buildDocId(cleanPath);
    const parts = cleanPath.split('/');
    const title = parts.pop()?.replace(/\.(md|txt)$/i, '') || 'Sem título';
    const folderPath = parts.join('/');

    return new Promise((resolve, reject) => {
      const tx = db.transaction('vault_documents', 'readwrite');
      const store = tx.objectStore('vault_documents');
      const getReq = store.get(docId);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        const now = Date.now();
        const doc: VaultDocument = existing
          ? { ...existing, title, path: cleanPath, folderPath, content, updatedAt: now }
          : {
              id: docId,
              vaultId: this._vaultId,
              title,
              content,
              path: cleanPath,
              folderPath,
              tags: [],
              createdAt: now,
              updatedAt: now
            };

        const putReq = store.put(doc);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async createDocument(filePath: string, initialContent: string = ''): Promise<VaultDocument> {
    const cleanPath = sanitizeVaultPath(filePath, false);
    await this.saveDocument(cleanPath, initialContent);
    const docId = this.buildDocId(cleanPath);
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vault_documents', 'readonly');
      const store = tx.objectStore('vault_documents');
      const req = store.get(docId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async createFolder(folderPath: string): Promise<void> {
    const db = await this.getDB();
    const cleanPath = sanitizeVaultPath(folderPath, true);
    const parts = cleanPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const folder: VaultFolder = {
      id: `${this._vaultId}:${cleanPath}`,
      vaultId: this._vaultId,
      name,
      path: cleanPath,
      parentPath,
      expanded: true
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('vault_folders', 'readwrite');
      const store = tx.objectStore('vault_folders');
      const req = store.put(folder);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }


  async deleteNode(nodePath: string, isFolder: boolean): Promise<void> {
    const db = await this.getDB();
    if (isFolder) {
      // Delete folder and all children (docs & media files)
      const tx = db.transaction(['vault_folders', 'vault_documents', 'vault_files'], 'readwrite');
      const folderStore = tx.objectStore('vault_folders');
      const docStore = tx.objectStore('vault_documents');
      const fileStore = tx.objectStore('vault_files');

      const docs = await this.getAllDocs(db);
      docs.filter(d => d.vaultId === this._vaultId && (d.folderPath === nodePath || d.folderPath.startsWith(`${nodePath}/`)))
          .forEach(d => docStore.delete(d.id));

      const mediaFiles = await this.getAllMediaFiles(db);
      mediaFiles.filter(m => m.vaultId === this._vaultId && (m.folderPath === nodePath || m.folderPath.startsWith(`${nodePath}/`)))
          .forEach(m => fileStore.delete(m.id));

      folderStore.delete(`${this._vaultId}:${nodePath}`);
      return new Promise((resolve) => {
        tx.oncomplete = () => {
          if (this.urlCache.has(nodePath)) {
            URL.revokeObjectURL(this.urlCache.get(nodePath)!);
            this.urlCache.delete(nodePath);
          }
          resolve();
        };
      });
    } else {
      const cleanPath = nodePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const tx = db.transaction(['vault_documents', 'vault_files'], 'readwrite');
      const docStore = tx.objectStore('vault_documents');
      const fileStore = tx.objectStore('vault_files');

      docStore.delete(this.buildDocId(cleanPath));
      docStore.delete(`${this._vaultId}:${cleanPath}`);
      fileStore.delete(`${this._vaultId}:${cleanPath}`);

      return new Promise((resolve) => {
        tx.oncomplete = () => {
          if (this.urlCache.has(cleanPath)) {
            URL.revokeObjectURL(this.urlCache.get(cleanPath)!);
            this.urlCache.delete(cleanPath);
          }
          if (this.urlCache.has(nodePath)) {
            URL.revokeObjectURL(this.urlCache.get(nodePath)!);
            this.urlCache.delete(nodePath);
          }
          resolve();
        };
      });
    }
  }

  async renameNode(oldPath: string, newPath: string, isFolder: boolean = false): Promise<void> {
    const db = await this.getDB();
    if (isFolder) {
      const folders = await this.getAllFolders(db);
      const docs = await this.getAllDocs(db);
      const mediaFiles = await this.getAllMediaFiles(db);
      const tx = db.transaction(['vault_folders', 'vault_documents', 'vault_files'], 'readwrite');
      const folderStore = tx.objectStore('vault_folders');
      const docStore = tx.objectStore('vault_documents');
      const fileStore = tx.objectStore('vault_files');

      // Update folder itself and child folders
      for (const f of folders) {
        if (f.vaultId === this._vaultId) {
          if (f.path === oldPath) {
            folderStore.delete(f.id);
            const parts = newPath.split('/');
            const name = parts[parts.length - 1];
            const parentPath = parts.slice(0, -1).join('/');
            folderStore.put({
              ...f,
              id: `${this._vaultId}:${newPath}`,
              name,
              path: newPath,
              parentPath
            });
          } else if (f.path.startsWith(`${oldPath}/`)) {
            folderStore.delete(f.id);
            const updatedSubPath = newPath + f.path.slice(oldPath.length);
            const parts = updatedSubPath.split('/');
            const name = parts[parts.length - 1];
            const parentPath = parts.slice(0, -1).join('/');
            folderStore.put({
              ...f,
              id: `${this._vaultId}:${updatedSubPath}`,
              name,
              path: updatedSubPath,
              parentPath
            });
          }
        }
      }

      // Update child documents
      for (const d of docs) {
        if (d.vaultId === this._vaultId && (d.folderPath === oldPath || d.folderPath.startsWith(`${oldPath}/`))) {
          docStore.delete(d.id);
          const updatedFolderPath = d.folderPath === oldPath ? newPath : newPath + d.folderPath.slice(oldPath.length);
          const updatedDocPath = newPath + d.path.slice(oldPath.length);
          docStore.put({
            ...d,
            id: `${this._vaultId}:${updatedDocPath}`,
            path: updatedDocPath,
            folderPath: updatedFolderPath
          });
        }
      }

      // Update child media files
      for (const m of mediaFiles) {
        if (m.vaultId === this._vaultId && (m.folderPath === oldPath || m.folderPath.startsWith(`${oldPath}/`))) {
          fileStore.delete(m.id);
          const updatedFolderPath = m.folderPath === oldPath ? newPath : newPath + m.folderPath.slice(oldPath.length);
          const updatedFilePath = newPath + m.path.slice(oldPath.length);
          fileStore.put({
            ...m,
            id: `${this._vaultId}:${updatedFilePath}`,
            path: updatedFilePath,
            folderPath: updatedFolderPath
          });
        }
      }

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve();
      });
    } else {
      const db = await this.getDB();
      const normOld = oldPath.replace(/\\/g, '/').replace(/^\/+/, '');
      const normNew = sanitizeVaultPath(newPath, isFolder);
      const docId = this.buildDocId(normOld);

      // 1. Procura o documento pelo docId padrão
      let existingDoc: VaultDocument | null = await new Promise<VaultDocument | null>((resolve) => {
        const tx = db.transaction('vault_documents', 'readonly');
        const store = tx.objectStore('vault_documents');
        const req = store.get(docId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      // 2. Se não encontrou por docId direto, busca por correspondência de caminho
      if (!existingDoc) {
        const allDocs = await this.getAllDocs(db);
        const altOld = /\.(md|txt)$/i.test(normOld) ? normOld : `${normOld}.md`;
        existingDoc = allDocs.find(d =>
          d.id === docId ||
          d.path === normOld ||
          d.path === altOld ||
          d.path === oldPath ||
          d.id.endsWith(`:${normOld}`) ||
          d.id.endsWith(`:${altOld}`) ||
          d.id.endsWith(`:${oldPath}`)
        ) || null;
      }

      if (existingDoc) {
        const content = existingDoc.content !== undefined ? existingDoc.content : await this.readDocument(normOld);
        await this.saveDocument(normNew, content);
        await this.deleteNode(normOld, false);
        if (oldPath !== normOld) {
          await this.deleteNode(oldPath, false);
        }
        if (existingDoc.id !== this.buildDocId(normNew) && existingDoc.id !== docId) {
          try {
            const delTx = db.transaction('vault_documents', 'readwrite');
            delTx.objectStore('vault_documents').delete(existingDoc.id);
          } catch {}
        }
      } else {
        // Verifica se é arquivo de mídia em vault_files
        const fileExists = await new Promise<boolean>((resolve) => {
          const tx = db.transaction('vault_files', 'readonly');
          const store = tx.objectStore('vault_files');
          const req = store.get(`${this._vaultId}:${normOld}`);
          req.onsuccess = () => resolve(!!req.result);
          req.onerror = () => resolve(false);
        });

        if (fileExists) {
          const blob = await this.getFileBlob(normOld);
          await this.saveFile(normNew, blob);
          await this.deleteNode(normOld, false);
          if (oldPath !== normOld) {
            await this.deleteNode(oldPath, false);
          }
        } else {
          // Se for uma nota Markdown / texto que ainda não existia fisicamente, cria direto em newPath
          if (/\.(md|txt)$/i.test(normNew) || /\.(md|txt)$/i.test(normOld)) {
            await this.saveDocument(normNew, '');
          } else {
            throw new Error(`Arquivo não encontrado para renomear: ${oldPath}`);
          }
        }
      }
    }
  }

  // --- Helpers ---

  private buildDocId(filePath: string): string {
    let clean = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (/%[0-9a-fA-F]{2}/.test(clean)) {
      try { clean = decodeURIComponent(clean); } catch {}
    }
    clean = clean.normalize('NFC');
    const normalized = /\.(md|txt)$/i.test(clean) ? clean : `${clean}.md`;
    return `${this._vaultId}:${normalized}`;
  }


  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 12);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('vault_files')) {
          const fileStore = db.createObjectStore('vault_files', { keyPath: 'id' });
          fileStore.createIndex('vaultId', 'vaultId', { unique: false });
          fileStore.createIndex('folderPath', 'folderPath', { unique: false });
          fileStore.createIndex('fileType', 'fileType', { unique: false });
        }
        if (!db.objectStoreNames.contains('vault_documents')) {
          const docStore = db.createObjectStore('vault_documents', { keyPath: 'id' });
          docStore.createIndex('vaultId', 'vaultId', { unique: false });
          docStore.createIndex('folderPath', 'folderPath', { unique: false });
          docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('vault_folders')) {
          const folderStore = db.createObjectStore('vault_folders', { keyPath: 'id' });
          folderStore.createIndex('vaultId', 'vaultId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getAllDocs(db: IDBDatabase): Promise<VaultDocument[]> {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('vault_documents')) return resolve([]);
      const tx = db.transaction('vault_documents', 'readonly');
      const req = tx.objectStore('vault_documents').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  private getAllFolders(db: IDBDatabase): Promise<VaultFolder[]> {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('vault_folders')) return resolve([]);
      const tx = db.transaction('vault_folders', 'readonly');
      const req = tx.objectStore('vault_folders').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  private getAllMediaFiles(db: IDBDatabase): Promise<VaultMediaFile[]> {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('vault_files')) return resolve([]);
      const tx = db.transaction('vault_files', 'readonly');
      const req = tx.objectStore('vault_files').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  private buildTree(docs: VaultDocument[], folders: VaultFolder[], mediaFiles: VaultMediaFile[] = [], rootPath: string = ''): VaultNode[] {
    const folderMap = new Map<string, VaultNode>();

    folders.forEach(f => {
      folderMap.set(f.path, {
        id: f.path,
        name: f.name,
        path: f.path,
        type: 'folder',
        children: []
      });
    });

    const rootNodes: VaultNode[] = [];

    // Place folders in parent folders
    folders.forEach(f => {
      const node = folderMap.get(f.path)!;
      if (f.parentPath && folderMap.has(f.parentPath)) {
        folderMap.get(f.parentPath)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Place docs in folders
    docs.forEach(d => {
      const fileNode: VaultNode = {
        id: d.path,
        name: d.title,
        path: d.path,
        type: 'file',
        fileType: 'note',
        extension: 'md',
        updatedAt: d.updatedAt
      };

      if (d.folderPath && folderMap.has(d.folderPath)) {
        folderMap.get(d.folderPath)!.children!.push(fileNode);
      } else {
        rootNodes.push(fileNode);
      }
    });

    // Place media files in folders
    mediaFiles.forEach(m => {
      const fileNode: VaultNode = {
        id: m.path,
        name: m.name,
        path: m.path,
        type: 'file',
        fileType: m.fileType,
        extension: m.name.split('.').pop(),
        size: m.size,
        updatedAt: m.updatedAt
      };

      if (m.folderPath && folderMap.has(m.folderPath)) {
        folderMap.get(m.folderPath)!.children!.push(fileNode);
      } else {
        rootNodes.push(fileNode);
      }
    });

    const sortNodesRecursively = (nodes: VaultNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
      nodes.forEach(n => {
        if (n.children) sortNodesRecursively(n.children);
      });
    };
    sortNodesRecursively(rootNodes);

    return rootNodes;
  }
}
