import { IVaultStorageProvider } from './VaultStorageAdapter';
import { VaultNode, VaultDocument } from '../interfaces/vault';

// IndexedDB database name used by RPGSA
const DB_NAME = 'RPGSA_DB';
const KEYVAL_STORE = 'keyval';
const HANDLE_KEY = 'fsa_vault_directory_handle';

export class FSAStorageProvider implements IVaultStorageProvider {
  readonly type = 'fsa' as const;
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private _vaultId: string;
  private _vaultName: string = 'Local Windows Vault';
  private rootPhysicalPath: string | null = null;

  constructor(vaultId: string = 'fsa-main', vaultName: string = 'Local Windows Vault') {
    this._vaultId = vaultId;
    this._vaultName = vaultName;
  }

  get vaultId(): string {
    return this._vaultId;
  }

  setVaultId(vaultId: string): void {
    this._vaultId = vaultId;
  }

  get isConnected(): boolean {
    return this.rootHandle !== null;
  }

  get vaultName(): string {
    return this.rootHandle?.name || this._vaultName;
  }

  get rootDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.rootHandle;
  }

  /**
   * Initializes the provider by trying to restore a previously saved handle from IndexedDB
   */
  async init(): Promise<boolean> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      return false;
    }

    try {
      const savedHandle = await this.getSavedHandleFromIDB(this._vaultId);
      if (savedHandle) {
        // Verify permissions
        const permission = await this.verifyPermission(savedHandle, true);
        if (permission) {
          this.rootHandle = savedHandle;
          this._vaultName = savedHandle.name;
          return true;
        }
      }
    } catch (err) {
      console.warn('[FSAStorageProvider] Failed to restore handle from IDB:', err);
    }
    return false;
  }

  /**
   * Prompts the user to pick a folder on their Windows computer
   */
  async pickDirectory(targetVaultId?: string): Promise<boolean> {
    if (targetVaultId) {
      this._vaultId = targetVaultId;
    }
    if (typeof window === 'undefined') {
      return false;
    }

    if (!('showDirectoryPicker' in window)) {
      console.warn('[FSAStorageProvider] showDirectoryPicker não suportado neste navegador/ambiente.');
      if (typeof window !== 'undefined') {
        const isNotLocalhost = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const isIframe = window.self !== window.top;

        if (isNotLocalhost) {
          const targetUrl = `http://localhost:${window.location.port || 3000}`;
          const redirect = confirm(
            `Acesso a pastas do Windows bloqueado pelo navegador!\n\n` +
            `Você está acessando pelo IP (${window.location.hostname}). O Google Chrome e Microsoft Edge só liberam acesso ao HD em conexões localhost por segurança do sistema.\n\n` +
            `Deseja abrir agora pelo endereço ${targetUrl} para desbloquear as pastas do Windows?`
          );
          if (redirect) {
            window.location.href = targetUrl;
          }
          return false;
        }

        if (isIframe) {
          const openTab = confirm(
            `Acesso a pastas do Windows bloqueado dentro deste painel/iframe!\n\n` +
            `Os navegadores exigem que o app esteja aberto em uma aba normal do navegador para acessar pastas do HD.\n\n` +
            `Deseja abrir o Supercanvas em uma nova aba do navegador agora?`
          );
          if (openTab) {
            window.open(window.location.href, '_blank');
          }
          return false;
        }

        alert('Seu navegador atual não suporta a File System Access API para pastas locais. Para vincular uma pasta física do Windows, utilize o Google Chrome, Microsoft Edge ou Brave acessando via http://localhost:3000.');
      }
      return false;
    }

    try {
      const winWithFSA = window as unknown as {
        showDirectoryPicker: (options?: Record<string, unknown>) => Promise<FileSystemDirectoryHandle>;
      };
      const handle = await winWithFSA.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      if (!handle) return false;

      const hasPermission = await this.verifyPermission(handle, true);
      if (!hasPermission) return false;

      this.rootHandle = handle;
      this._vaultName = handle.name;

      // Persist handle to IndexedDB for automatic reconnection
      await this.saveHandleToIDB(handle, this._vaultId);

      return true;
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj?.name === 'AbortError') {
        return false; // User cancelled
      }
      console.error('[FSAStorageProvider] Error picking directory:', err);
      return false;
    }
  }

  /**
   * Disconnects the current directory handle
   */
  async disconnect(): Promise<void> {
    this.rootHandle = null;
    this.rootPhysicalPath = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vault_root_physical_path');
    }
    await this.removeSavedHandleFromIDB(this._vaultId);
  }

  /**
   * Recursively or shallowly lists all nodes inside a directory
   */
  async listNodes(subPath: string = ''): Promise<VaultNode[]> {
    if (!this.rootHandle) return [];

    const dirHandle = subPath ? await this.resolveDirectory(subPath) : this.rootHandle;
    if (!dirHandle) return [];

    return this.scanDirectory(dirHandle, subPath);
  }

  private async scanDirectory(dirHandle: FileSystemDirectoryHandle, basePath: string): Promise<VaultNode[]> {
    const nodes: VaultNode[] = [];

    // Iterate over directory entries
    for await (const [name, handle] of (dirHandle as any).entries()) {
      // Ignore hidden files / folders (e.g. .git, .obsidian, .trash)
      if (name.startsWith('.')) continue;

      const currentPath = basePath ? `${basePath}/${name}` : name;

      if (handle.kind === 'directory') {
        const children = await this.scanDirectory(handle as FileSystemDirectoryHandle, currentPath);
        nodes.push({
          id: currentPath,
          name,
          path: currentPath,
          type: 'folder',
          children
        });
      } else if (handle.kind === 'file') {
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const isMarkdown = ['md', 'markdown'].includes(ext);
        const isText = ext === 'txt';
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm', 'opus'].includes(ext);
        const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico'].includes(ext);

        const file = await (handle as FileSystemFileHandle).getFile();
        const fileType: 'note' | 'audio' | 'image' | 'file' = isAudio
          ? 'audio'
          : isImage
          ? 'image'
          : isMarkdown || isText
          ? 'note'
          : 'file';

        nodes.push({
          id: currentPath,
          name: isMarkdown || isText ? name.replace(/\.(md|markdown|txt)$/i, '') : name,
          path: currentPath,
          type: 'file',
          fileType,
          extension: ext,
          size: file.size,
          updatedAt: file.lastModified
        });
      }
    }

    // Sort folders first, then files alphabetically
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  }

  /**
   * Reads a Markdown file content
   */
  async readDocument(filePath: string): Promise<string> {
    if (!filePath || filePath.startsWith('canvas:')) return '';
    if (!this.rootHandle) return '';

    try {
      const fileHandle = await this.resolveFile(filePath, false);
      if (!fileHandle) return '';

      const file = await fileHandle.getFile();
      return await file.text();
    } catch {
      return '';
    }
  }

  /**
   * Writes content to a Markdown file
   */
  async saveDocument(filePath: string, content: string): Promise<void> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');

    const fileHandle = await this.resolveFile(filePath, true);
    if (!fileHandle) throw new Error(`Não foi possível acessar o arquivo: ${filePath}`);

    const writable = await (fileHandle as any).createWritable();
    await writable.write(content);
    await writable.close();
  }

  /**
   * Creates a new document
   */
  async createDocument(filePath: string, initialContent: string = ''): Promise<VaultDocument> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');

    // Ensure extension
    const normalizedPath = filePath.endsWith('.md') ? filePath : `${filePath}.md`;
    await this.saveDocument(normalizedPath, initialContent);

    const parts = normalizedPath.split('/');
    const fileName = parts.pop()!;
    const folderPath = parts.join('/');
    const title = fileName.replace(/\.md$/, '');

    return {
      id: normalizedPath,
      vaultId: this.vaultName,
      title,
      content: initialContent,
      path: normalizedPath,
      folderPath,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Creates a folder
   */
  async createFolder(folderPath: string): Promise<void> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');
    await this.resolveDirectory(folderPath, true);
  }

  private urlCache = new Map<string, string>();

  /**
   * Saves a binary file (audio, image, etc.)
   */
  async saveFile(filePath: string, file: File | Blob): Promise<void> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');

    const fileHandle = await this.resolveFile(filePath, true);
    if (!fileHandle) throw new Error(`Não foi possível acessar o arquivo: ${filePath}`);

    const writable = await (fileHandle as any).createWritable();
    await writable.write(file);
    await writable.close();

    if (this.urlCache.has(filePath)) {
      URL.revokeObjectURL(this.urlCache.get(filePath)!);
      this.urlCache.delete(filePath);
    }
  }

  /**
   * Gets a binary file Blob
   */
  async getFileBlob(filePath: string): Promise<Blob> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');

    const fileHandle = await this.resolveFile(filePath, false);
    if (!fileHandle) throw new Error(`Arquivo não encontrado: ${filePath}`);

    return await fileHandle.getFile();
  }

  /**
   * Gets an object URL for a media file
   */
  async getFileUrl(filePath: string): Promise<string> {
    if (this.urlCache.has(filePath)) {
      return this.urlCache.get(filePath)!;
    }
    const blob = await this.getFileBlob(filePath);
    const url = URL.createObjectURL(blob);
    this.urlCache.set(filePath, url);
    return url;
  }

  /**
   * Discovers and caches the physical OS path on Windows when running in Electron
   */
  async getRootPhysicalPath(): Promise<string | null> {
    if (this.rootPhysicalPath) return this.rootPhysicalPath;

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vault_root_physical_path');
      if (saved) {
        this.rootPhysicalPath = saved;
        return saved;
      }
    }

    if (typeof window === 'undefined' || !window.electronAPI?.getPathForFile || !this.rootHandle) {
      return null;
    }

    try {
      let probeFileHandle: FileSystemFileHandle | null = null;
      let relativeSubpath = '';

      // Try finding an existing file in root
      for await (const [name, handle] of (this.rootHandle as any).entries()) {
        if (handle.kind === 'file' && !name.startsWith('.')) {
          probeFileHandle = handle;
          relativeSubpath = name;
          break;
        }
      }

      let isTempProbe = false;
      if (!probeFileHandle) {
        try {
          probeFileHandle = await this.rootHandle.getFileHandle('.trash_probe', { create: true });
          relativeSubpath = '.trash_probe';
          isTempProbe = true;
        } catch (err) {
          console.warn('[FSAStorageProvider] Failed to create trash probe file:', err);
        }
      }

      if (probeFileHandle) {
        const file = await probeFileHandle.getFile();
        const detectedPath = window.electronAPI.getPathForFile(file);

        if (isTempProbe) {
          try {
            await (this.rootHandle as any).removeEntry('.trash_probe');
          } catch {}
        }

        if (detectedPath) {
          const normalizedDetected = detectedPath.replace(/\\/g, '/');
          const rootPathNormalized = normalizedDetected.endsWith('/' + relativeSubpath)
            ? normalizedDetected.slice(0, -(relativeSubpath.length + 1))
            : normalizedDetected.substring(0, normalizedDetected.lastIndexOf('/'));

          const osRootPath = detectedPath.includes('\\')
            ? rootPathNormalized.replace(/\//g, '\\')
            : rootPathNormalized;

          this.rootPhysicalPath = osRootPath;
          if (typeof window !== 'undefined') {
            localStorage.setItem('vault_root_physical_path', osRootPath);
          }
          return osRootPath;
        }
      }
    } catch (err) {
      console.warn('[FSAStorageProvider] Failed to resolve physical path:', err);
    }

    return null;
  }

  /**
   * Deletes a file or directory, moving to the Windows Recycle Bin if in Electron
   */
  async deleteNode(nodePath: string, isFolder: boolean): Promise<void> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');

    let movedToTrash = false;

    // 1. Try to move to Windows Recycle Bin via Electron shell.trashItem
    if (typeof window !== 'undefined' && window.electronAPI?.trashItem) {
      try {
        const rootPath = await this.getRootPhysicalPath();
        if (rootPath) {
          const separator = rootPath.includes('\\') ? '\\' : '/';
          const cleanNodePath = nodePath.replace(/[\/\\]+/g, separator);
          const fullPhysicalPath = `${rootPath.replace(/[\\\/]+$/, '')}${separator}${cleanNodePath}`;

          const res = await window.electronAPI.trashItem(fullPhysicalPath);
          if (res?.success) {
            movedToTrash = true;
            console.log(`[FSAStorageProvider] Item movido para a Lixeira do Windows: ${fullPhysicalPath}`);
          }
        }
      } catch (trashErr) {
        console.warn('[FSAStorageProvider] Falha ao enviar para lixeira do Windows, usando fallback permanente:', trashErr);
      }
    }

    // 2. Fallback to native File System Access API removeEntry if not moved to trash
    if (!movedToTrash) {
      const parts = nodePath.split('/');
      const targetName = parts.pop()!;
      const parentPath = parts.join('/');

      const parentHandle = parentPath ? await this.resolveDirectory(parentPath) : this.rootHandle;
      if (!parentHandle) throw new Error(`Diretório pai não encontrado: ${parentPath}`);

      try {
        await (parentHandle as any).removeEntry(targetName, { recursive: isFolder });
      } catch (removeErr: any) {
        // If the item was already deleted/moved, ignore NotFoundError
        if (removeErr?.name !== 'NotFoundError') {
          throw removeErr;
        }
      }
    }

    if (this.urlCache.has(nodePath)) {
      URL.revokeObjectURL(this.urlCache.get(nodePath)!);
      this.urlCache.delete(nodePath);
    }
  }

  /**
   * Renames a file or directory
   */
  async renameNode(oldPath: string, newPath: string, isFolder: boolean = false): Promise<void> {
    if (!this.rootHandle) throw new Error('Nenhuma pasta conectada.');

    if (!isFolder) {
      const fileHandle = await this.resolveFile(oldPath, false);
      if (!fileHandle) throw new Error(`Arquivo de origem não encontrado: ${oldPath}`);
      const file = await fileHandle.getFile();
      await this.saveFile(newPath, file);
      await this.deleteNode(oldPath, false);
    } else {
      const sourceHandle = await this.resolveDirectory(oldPath);
      if (!sourceHandle) throw new Error(`Pasta de origem não encontrada: ${oldPath}`);
      await this.resolveDirectory(newPath, true);
      await this.copyDirectoryRecursive(sourceHandle, newPath);
      await this.deleteNode(oldPath, true);
    }
  }

  private async copyDirectoryRecursive(sourceHandle: FileSystemDirectoryHandle, targetPath: string): Promise<void> {
    for await (const entry of (sourceHandle as any).values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const content = await file.text();
        await this.saveDocument(`${targetPath}/${entry.name}`, content);
      } else if (entry.kind === 'directory') {
        const subDirHandle = await (sourceHandle as any).getDirectoryHandle(entry.name);
        await this.resolveDirectory(`${targetPath}/${entry.name}`, true);
        await this.copyDirectoryRecursive(subDirHandle, `${targetPath}/${entry.name}`);
      }
    }
  }

  // --- Helper methods to navigate FileSystemDirectoryHandle ---

  private async resolveDirectory(path: string, create: boolean = false): Promise<FileSystemDirectoryHandle | null> {
    if (!this.rootHandle) return null;
    const parts = path.split('/').filter(Boolean);

    let current = this.rootHandle;
    for (const part of parts) {
      try {
        current = await current.getDirectoryHandle(part, { create });
      } catch {
        return null;
      }
    }
    return current;
  }

  private async resolveFile(path: string, create: boolean = false): Promise<FileSystemFileHandle | null> {
    if (!this.rootHandle) return null;
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return null;

    const dirPath = parts.join('/');
    const dirHandle = dirPath ? await this.resolveDirectory(dirPath, create) : this.rootHandle;
    if (!dirHandle) return null;

    try {
      return await dirHandle.getFileHandle(fileName, { create });
    } catch {
      return null;
    }
  }

  private async verifyPermission(fileHandle: FileSystemHandle, readWrite: boolean): Promise<boolean> {
    const options: any = {};
    if (readWrite) options.mode = 'readwrite';

    if ((await (fileHandle as any).queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await (fileHandle as any).requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }

  // --- IndexedDB persistence for handle ---

  private getHandleKey(vaultId: string = this._vaultId): string {
    return `fsa_vault_directory_handle_${vaultId}`;
  }

  private async getSavedHandleFromIDB(vaultId: string = this._vaultId): Promise<FileSystemDirectoryHandle | null> {
    return FSAStorageProvider.getSavedHandleFromIDB(vaultId);
  }

  /**
   * Static helper to retrieve saved directory handle from IndexedDB
   */
  static async getSavedHandleFromIDB(vaultId: string): Promise<FileSystemDirectoryHandle | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEYVAL_STORE)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(KEYVAL_STORE, 'readonly');
        const store = tx.objectStore(KEYVAL_STORE);

        // Try per-vault handle key first
        const specificReq = store.get(`fsa_vault_directory_handle_${vaultId}`);
        specificReq.onsuccess = () => {
          if (specificReq.result) {
            resolve(specificReq.result);
          } else if (vaultId === 'fsa-main') {
            // Backward compatibility fallback for the legacy fsa-main handle
            const legacyReq = store.get(HANDLE_KEY);
            legacyReq.onsuccess = () => resolve(legacyReq.result || null);
            legacyReq.onerror = () => resolve(null);
          } else {
            resolve(null);
          }
        };
        specificReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  }

  private async saveHandleToIDB(handle: FileSystemDirectoryHandle, vaultId: string = this._vaultId): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEYVAL_STORE)) {
          resolve();
          return;
        }
        const tx = db.transaction(KEYVAL_STORE, 'readwrite');
        const store = tx.objectStore(KEYVAL_STORE);

        // Save under per-vault key
        store.put(handle, this.getHandleKey(vaultId));

        // If this is fsa-main, also write to legacy key for compatibility
        if (vaultId === 'fsa-main') {
          store.put(handle, HANDLE_KEY);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async removeSavedHandleFromIDB(vaultId: string = this._vaultId): Promise<void> {
    return FSAStorageProvider.removeSavedHandleFromIDB(vaultId);
  }

  /**
   * Static helper to remove directory handle associated with a specific vault ID from IndexedDB
   */
  static async removeSavedHandleFromIDB(vaultId: string): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(KEYVAL_STORE)) {
          resolve();
          return;
        }
        const tx = db.transaction(KEYVAL_STORE, 'readwrite');
        const store = tx.objectStore(KEYVAL_STORE);

        store.delete(`fsa_vault_directory_handle_${vaultId}`);
        if (vaultId === 'fsa-main') {
          store.delete(HANDLE_KEY);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      request.onerror = () => resolve();
    });
  }

  /**
   * Deletes the physical directory from the computer disk or moves it to the Windows Recycle Bin
   */
  static async deletePhysicalDirectory(vaultId: string, physicalPath?: string): Promise<{ success: boolean; error?: string }> {
    // 1. Se estiver no Electron e possuir caminho do sistema operacional, envia para a Lixeira do Windows
    if (typeof window !== 'undefined' && window.electronAPI?.trashItem && physicalPath) {
      try {
        const res = await window.electronAPI.trashItem(physicalPath);
        if (res.success) {
          return { success: true };
        }
      } catch (err: unknown) {
        console.warn('[FSAStorageProvider] Falha ao enviar para a lixeira via Electron:', err);
      }
    }

    // 2. Se possuir FileSystemDirectoryHandle salvo no IndexedDB, usa a API FSA
    try {
      const handle = await FSAStorageProvider.getSavedHandleFromIDB(vaultId);
      if (handle) {
        // Chromium 110+ suporta remoção recursiva direta do handle raiz
        if ('remove' in handle && typeof (handle as unknown as { remove: (opts?: { recursive: boolean }) => Promise<void> }).remove === 'function') {
          await (handle as unknown as { remove: (opts?: { recursive: boolean }) => Promise<void> }).remove({ recursive: true });
          return { success: true };
        }

        // Fallback: remove todas as entradas filhas recursivamente
        if ('values' in handle && typeof (handle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values === 'function') {
          for await (const entry of (handle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values()) {
            await handle.removeEntry(entry.name, { recursive: entry.kind === 'directory' });
          }
          return { success: true };
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao excluir pasta do computador';
      console.error('[FSAStorageProvider] Erro ao remover diretório físico:', err);
      return { success: false, error: errorMsg };
    }

    return { success: true };
  }
}
