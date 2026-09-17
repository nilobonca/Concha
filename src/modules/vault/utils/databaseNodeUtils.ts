/**
 * Supercanvas Vault - Database Node & Row Sync Utilities
 * Enables database rows to be represented, navigated, and managed as notes in the File Explorer,
 * as well as synchronized to physical Markdown (.md) note files in the Vault.
 */

import { DatabaseInstance, DatabaseRow, PropertyDefinition } from '@/modules/database/types';
import { VaultNode } from '../interfaces/vault';
import { generateRowId, createDefaultDatabase } from '@/modules/database/utils/databaseDefaults';
import { stringifyFrontmatter, parseFrontmatter } from './frontmatterUtils';
import { sanitizeVaultFileName } from './fileNameUtils';

export interface DatabaseRowVaultNode extends VaultNode {
  isDatabaseRow: true;
  parentDatabasePath: string;
  rowId: string;
}

/**
 * Checks if a path string points to a database row note (format: `${dbPath}#row:${rowId}`)
 */
export function parseDatabaseRowPath(path: string): { isRow: boolean; dbPath: string; rowId: string } {
  if (!path || !path.includes('#row:')) {
    return { isRow: false, dbPath: path || '', rowId: '' };
  }

  const [dbPath, rowId] = path.split('#row:');
  return { isRow: true, dbPath, rowId };
}

/**
 * Formats a database path and row ID into a row note path.
 */
export function formatDatabaseRowPath(dbPath: string, rowId: string): string {
  return `${dbPath}#row:${rowId}`;
}

/**
 * Computes the directory path where physical .md note files for a database are stored.
 * Example: `Databases/Planets.db.json` -> `Databases/Planets`
 */
export function getDatabaseNotesDirectory(dbPath: string): string {
  const cleanPath = dbPath.split('#row:')[0];
  const parts = cleanPath.split('/');
  const fileName = parts.pop() || 'Database';
  const folderName = fileName.replace(/\.(db\.json\.md|db\.json|database)$/i, '');
  const parentDir = parts.join('/');
  return parentDir ? `${parentDir}/${folderName}` : folderName;
}

/**
 * Computes the file path for a physical .md note file for a specific database row.
 * Example: `Databases/Planets` + `Júpiter` -> `Databases/Planets/Júpiter.md`
 */
export function getDatabaseRowVaultFilePath(dbPath: string, row: DatabaseRow): string {
  const notesDir = getDatabaseNotesDirectory(dbPath);
  const cleanTitle = sanitizeVaultFileName(row.title || 'Nota sem título', false) || `Nota_${row.id}`;
  return `${notesDir}/${cleanTitle}.md`;
}

/**
 * Serializes a DatabaseRow into a Markdown string with YAML frontmatter containing all row properties.
 */
export function serializeRowToVaultMarkdown(
  dbPath: string, 
  row: DatabaseRow, 
  properties: PropertyDefinition[] = [],
  isStandalone: boolean = false
): string {
  const frontmatter: Record<string, any> = {};

  if (!isStandalone) {
    frontmatter.id = row.id;
    frontmatter.database = dbPath.split('#row:')[0];
    if (row.createdAt) frontmatter.createdAt = row.createdAt;
    if (row.updatedAt) frontmatter.updatedAt = row.updatedAt;
  }

  if (row.icon) frontmatter.icon = row.icon;
  if (row.coverImage) frontmatter.coverImage = row.coverImage;

  // Export properties as frontmatter fields
  if (properties && Array.isArray(properties) && row.properties) {
    properties.forEach((prop) => {
      if (prop.type === 'title') return;
      const val = row.properties[prop.id];
      if (val !== undefined && val !== null && val !== '') {
        frontmatter[prop.name || prop.id] = val;
      }
    });
  }

  const content = row.content || '';
  return stringifyFrontmatter(frontmatter, content);
}

/**
 * Saves a DatabaseRow as an actual physical .md file in the Vault storage provider.
 */
export async function syncRowToVaultFile(
  dbPath: string,
  row: DatabaseRow,
  properties: PropertyDefinition[] = [],
  provider?: any
): Promise<string | null> {
  if (!provider || typeof provider.saveDocument !== 'function') return null;

  try {
    const filePath = getDatabaseRowVaultFilePath(dbPath, row);
    const markdown = serializeRowToVaultMarkdown(dbPath, row, properties);
    await provider.saveDocument(filePath, markdown);
    return filePath;
  } catch (err) {
    console.warn('[databaseNodeUtils] Falha ao sincronizar nota no Vault:', err);
    return null;
  }
}

/**
 * Syncs all rows of a DatabaseInstance into physical .md files in the Vault.
 */
export async function syncDatabaseRowsToVaultFiles(
  db: DatabaseInstance,
  dbPath: string,
  provider?: any
): Promise<void> {
  if (!provider || !db || !Array.isArray(db.rows)) return;

  try {
    for (const row of db.rows) {
      await syncRowToVaultFile(dbPath, row, db.properties, provider);
    }
  } catch (err) {
    console.warn('[databaseNodeUtils] Falha ao sincronizar lote de notas do banco no Vault:', err);
  }
}

/**
 * Deletes a physical .md note file of a database row from the Vault storage provider.
 */
export async function deleteRowVaultFile(
  dbPath: string,
  row: DatabaseRow,
  provider?: any
): Promise<void> {
  if (!provider || typeof provider.deleteNode !== 'function') return;

  try {
    const filePath = getDatabaseRowVaultFilePath(dbPath, row);
    await provider.deleteNode(filePath, false);
  } catch (err) {
    console.warn('[databaseNodeUtils] Erro ao excluir arquivo de nota do Vault:', err);
  }
}

/**
 * Converts DatabaseRow objects of a DatabaseInstance into VaultNode representations.
 */
export function convertRowsToVaultNodes(dbPath: string, rows: DatabaseRow[]): DatabaseRowVaultNode[] {
  if (!rows || !Array.isArray(rows)) return [];

  return rows.map((row) => {
    const title = (row.title && row.title.trim()) ? row.title.trim() : 'Nota sem título';
    const rowPath = formatDatabaseRowPath(dbPath, row.id);

    return {
      id: rowPath,
      name: title,
      path: rowPath,
      type: 'file',
      fileType: 'note',
      extension: 'md',
      updatedAt: row.updatedAt || Date.now(),
      isDatabaseRow: true,
      parentDatabasePath: dbPath,
      rowId: row.id,
    };
  });
}

/**
 * Helper to safely read and parse a database file from the vault provider.
 */
export function parseDatabaseContent(rawJson: string): DatabaseInstance | null {
  try {
    if (!rawJson || !rawJson.trim()) return null;
    const db = JSON.parse(rawJson) as DatabaseInstance;
    if (db && Array.isArray(db.rows)) {
      return db;
    }
    return null;
  } catch (err) {
    console.warn('[databaseNodeUtils] Erro ao analisar conteúdo JSON do banco:', err);
    return null;
  }
}

/**
 * Creates a new DatabaseRow inside a database file and returns the updated DatabaseInstance and new row.
 */
export function createDatabaseRowInInstance(db: DatabaseInstance, title: string = 'Nova Nota'): { updatedDb: DatabaseInstance; newRow: DatabaseRow } {
  const newRow: DatabaseRow = {
    id: generateRowId(),
    title: title.trim() || 'Nova Nota',
    properties: {},
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedDb: DatabaseInstance = {
    ...db,
    rows: [...(db.rows || []), newRow],
    updatedAt: Date.now(),
  };

  return { updatedDb, newRow };
}

/**
 * Renames a DatabaseRow inside a DatabaseInstance.
 */
export function renameDatabaseRowInInstance(db: DatabaseInstance, rowId: string, newTitle: string): DatabaseInstance {
  const updatedRows = (db.rows || []).map((row) => {
    if (row.id === rowId) {
      return {
        ...row,
        title: newTitle.trim() || 'Nota sem título',
        updatedAt: Date.now(),
      };
    }
    return row;
  });

  return {
    ...db,
    rows: updatedRows,
    updatedAt: Date.now(),
  };
}

/**
 * Deletes a DatabaseRow from a DatabaseInstance.
 */
export function deleteDatabaseRowFromInstance(db: DatabaseInstance, rowId: string): DatabaseInstance {
  const updatedRows = (db.rows || []).filter((row) => row.id !== rowId);

  return {
    ...db,
    rows: updatedRows,
    updatedAt: Date.now(),
  };
}

/**
 * Extracts a DatabaseRow from its Database file and saves it as a standalone physical .md file
 * in the specified target folder path, deleting the row from the original database.
 */
export async function extractDatabaseRowToStandaloneFile(
  dbPath: string,
  rowId: string,
  targetFolderPath: string,
  provider: any
): Promise<string | null> {
  if (!provider || typeof provider.readDocument !== 'function' || typeof provider.saveDocument !== 'function') {
    return null;
  }

  try {
    const rawContent = await provider.readDocument(dbPath);
    const db = parseDatabaseContent(rawContent);
    if (!db) return null;

    const row = (db.rows || []).find((r) => r.id === rowId);
    if (!row) return null;

    // Se a nota estiver no cache do store (em memória ou com edições pendentes), garante que usa o conteúdo mais recente
    const rowPath = formatDatabaseRowPath(dbPath, rowId);
    if (typeof window !== 'undefined') {
      try {
        const { useVaultStore } = require('../hooks/useVaultStore');
        const cachedDoc = useVaultStore.getState().documentCache?.[rowPath];
        if (cachedDoc && cachedDoc.content !== undefined) {
          const { htmlToMarkdown } = require('./markdownConverter');
          row.content = htmlToMarkdown(cachedDoc.content);
          if (cachedDoc.frontmatter) {
            const { id, database, ...userProps } = cachedDoc.frontmatter;
            row.properties = { ...row.properties, ...userProps };
          }
        }
      } catch (e) {
        // Fallback gracioso caso require falhe
      }
    }

    const cleanTitle = sanitizeVaultFileName(row.title || 'Nota sem título', false) || `Nota_${row.id}`;
    const newFileName = `${cleanTitle}.md`;
    const targetFilePath = targetFolderPath ? `${targetFolderPath}/${newFileName}` : newFileName;

    // Save as standalone Markdown document
    const markdown = serializeRowToVaultMarkdown(dbPath, row, db.properties, true);
    await provider.saveDocument(targetFilePath, markdown);

    // Delete row from database instance
    const updatedDb = deleteDatabaseRowFromInstance(db, rowId);
    await provider.saveDocument(dbPath, JSON.stringify(updatedDb, null, 2));

    // Delete old synced note file in DB notes directory
    await deleteRowVaultFile(dbPath, row, provider);

    // Dispatch global db updated event so sidebar and open database tabs refresh in real time
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('supercanvas-db-updated', { detail: { dbPath, removedRowId: rowId } })
      );
    }

    return targetFilePath;
  } catch (err) {
    console.error('[databaseNodeUtils] Erro ao extrair nota do banco para arquivo independente:', err);
    return null;
  }
}

/**
 * Imports a standalone note file or a database row from another database into a target Database file.
 * Handles deleting/moving source and target files and emitting real-time sync events.
 */
export async function importPathToDatabase(
  targetDbPath: string,
  sourcePath: string,
  provider: any
): Promise<string | null> {
  if (!provider || typeof provider.readDocument !== 'function' || typeof provider.saveDocument !== 'function') {
    return null;
  }

  const { isRow, dbPath: sourceDbPath, rowId } = parseDatabaseRowPath(sourcePath);

  // Don't import into itself if already in target database
  if (isRow && sourceDbPath === targetDbPath) {
    return sourcePath;
  }

  try {
    let rowTitle = '';
    let rowContent = '';
    let rowProps: Record<string, any> = {};
    let icon: string | undefined = undefined;
    let coverImage: string | undefined = undefined;

    if (isRow) {
      // Source is a row in another database
      const rawSourceDb = await provider.readDocument(sourceDbPath);
      const sourceDb = parseDatabaseContent(rawSourceDb);
      if (!sourceDb) return null;

      const row = (sourceDb.rows || []).find((r) => r.id === rowId);
      if (!row) return null;

      rowTitle = row.title || 'Nota sem título';
      rowContent = row.content || '';
      rowProps = { ...row.properties };
      icon = row.icon;
      coverImage = row.coverImage;

      // Remove row from source database
      const updatedSourceDb = deleteDatabaseRowFromInstance(sourceDb, rowId);
      await provider.saveDocument(sourceDbPath, JSON.stringify(updatedSourceDb, null, 2));
      await deleteRowVaultFile(sourceDbPath, row, provider);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('supercanvas-db-updated', { detail: { dbPath: sourceDbPath, removedRowId: rowId } })
        );
      }
    } else {
      // Source is a standalone file in the Vault
      const fileName = sourcePath.split('/').pop() || 'Nota';
      rowTitle = fileName.replace(/\.(md|txt)$/i, '');
      const rawMarkdown = (await provider.readDocument(sourcePath)) || '';
      const { data: frontmatter, content: bodyMarkdown } = parseFrontmatter(rawMarkdown);
      rowContent = bodyMarkdown.trim();

      if (frontmatter) {
        const { id, database, createdAt, updatedAt, icon: fmIcon, coverImage: fmCover, ...userProps } = frontmatter;
        rowProps = userProps;
        icon = fmIcon;
        coverImage = fmCover;
      }

      if (typeof provider.deleteNode === 'function') {
        await provider.deleteNode(sourcePath, false);
      }
    }

    // Read target database
    let rawTargetDb = '';
    try {
      rawTargetDb = await provider.readDocument(targetDbPath);
    } catch {}

    let targetDb = parseDatabaseContent(rawTargetDb);
    if (!targetDb) {
      const cleanDbTitle = targetDbPath.split('/').pop()?.replace(/\.(db\.json|database)$/i, '') || 'Base de Dados';
      targetDb = createDefaultDatabase(cleanDbTitle);
    }

    const { updatedDb: finalTargetDb, newRow } = createDatabaseRowInInstance(targetDb, rowTitle);
    newRow.content = rowContent;
    if (icon) newRow.icon = icon;
    if (coverImage) newRow.coverImage = coverImage;
    if (Object.keys(rowProps).length > 0) {
      newRow.properties = { ...newRow.properties, ...rowProps };
    }

    await provider.saveDocument(targetDbPath, JSON.stringify(finalTargetDb, null, 2));
    await syncRowToVaultFile(targetDbPath, newRow, finalTargetDb.properties, provider);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('supercanvas-db-updated', { detail: { dbPath: targetDbPath } })
      );
    }

    return formatDatabaseRowPath(targetDbPath, newRow.id);
  } catch (err) {
    console.error('[databaseNodeUtils] Erro ao importar item para a base de dados:', err);
    return null;
  }
}

