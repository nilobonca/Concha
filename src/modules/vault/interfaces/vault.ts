export type VaultStorageType = 'fsa' | 'idb' | 'electron';

export interface VaultMetadata {
  id: string;
  name: string;
  storageType: VaultStorageType;
  folderName?: string;
  path?: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
  icon?: string;
  documentCount?: number;
}

export interface VaultNode {
  id: string;
  name: string;
  path: string; // Relative path inside vault, e.g. "NPCs/Strahd.md" or "Quests"
  type: 'file' | 'folder';
  fileType?: 'note' | 'audio' | 'image' | 'file' | 'canvas';
  children?: VaultNode[];
  extension?: string;
  size?: number;
  updatedAt?: number;
}

export interface VaultMediaFile {
  id: string;
  vaultId: string;
  name: string;
  path: string;
  folderPath: string;
  fileType: 'audio' | 'image' | 'file';
  size: number;
  blob: Blob;
  mimeType?: string;
  updatedAt: number;
}

export interface VaultDocument {
  id: string;           // Path or UUID
  vaultId: string;
  title: string;
  content: string;      // Markdown raw or TipTap HTML
  path: string;         // Relative path, e.g. "NPCs/Strahd.md"
  folderPath: string;   // Directory containing the file, "" for root
  tags: string[];
  aliases?: string[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  linkedCanvasItems?: string[]; // IDs of linked pins/canvas elements
}

export interface VaultFolder {
  id: string;
  vaultId: string;
  name: string;
  path: string;
  parentPath: string;
  expanded?: boolean;
}

export interface VaultLink {
  sourcePath: string;
  targetTitle: string;
  targetPath?: string;
  contextSnippet?: string;
}

export interface ActiveVaultLink {
  id: string;
  type: 'vault-link';
  documentPath: string;
  title: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  color?: string;
}
