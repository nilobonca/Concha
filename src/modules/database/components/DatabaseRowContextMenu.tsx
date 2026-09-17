import React, { useMemo } from 'react';
import ContextMenu from '@/components/ContextMenu';
import { DatabaseRow } from '../types';
import { Maximize2, Copy, FolderInput, Trash2, Folder, Database, FileText } from 'lucide-react';
import { useVaultStore } from '@/modules/vault/hooks/useVaultStore';
import { formatDatabaseRowPath, extractDatabaseRowToStandaloneFile } from '@/modules/vault/utils/databaseNodeUtils';

export interface DatabaseRowContextMenuProps {
  x: number;
  y: number;
  row: DatabaseRow;
  databasePath?: string;
  onClose: () => void;
  onOpenPeek?: (rowId: string) => void;
  onDuplicateRow?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
}

export const DatabaseRowContextMenu: React.FC<DatabaseRowContextMenuProps> = ({
  x,
  y,
  row,
  databasePath,
  onClose,
  onOpenPeek,
  onDuplicateRow,
  onDeleteRow,
}) => {
  const { nodes, moveNode, provider } = useVaultStore();

  // Mapeia todas as pastas disponíveis no Vault
  const folders = useMemo(() => {
    const list: string[] = [];
    const traverse = (nodeList: any[]) => {
      if (!Array.isArray(nodeList)) return;
      for (const node of nodeList) {
        if (node.type === 'folder' || node.isFolder) {
          list.push(node.path);
          if (node.children) traverse(node.children);
        }
      }
    };
    traverse(nodes || []);
    return list;
  }, [nodes]);

  // Mapeia outras bases de dados no Vault
  const databases = useMemo(() => {
    const list: Array<{ path: string; name: string }> = [];
    const traverse = (nodeList: any[]) => {
      if (!Array.isArray(nodeList)) return;
      for (const node of nodeList) {
        if (
          node.type === 'database' ||
          node.fileType === 'database' ||
          node.path?.endsWith('.db.json') ||
          node.path?.endsWith('.database')
        ) {
          if (!databasePath || node.path.toLowerCase() !== databasePath.toLowerCase()) {
            list.push({ path: node.path, name: node.name });
          }
        }
        if (node.children) traverse(node.children);
      }
    };
    traverse(nodes || []);
    return list;
  }, [nodes, databasePath]);

  const handleMoveToFolder = async (targetFolder: string) => {
    onClose();
    if (databasePath) {
      const sourceRowPath = formatDatabaseRowPath(databasePath, row.id);
      if (moveNode) {
        await moveNode(sourceRowPath, targetFolder);
      } else if (provider) {
        await extractDatabaseRowToStandaloneFile(databasePath, row.id, targetFolder, provider);
      }
    }
  };

  const handleMoveToDatabase = async (targetDbPath: string) => {
    onClose();
    if (databasePath && moveNode) {
      const sourceRowPath = formatDatabaseRowPath(databasePath, row.id);
      await moveNode(sourceRowPath, targetDbPath);
    }
  };

  const handlePromptMove = async () => {
    onClose();
    const targetFolder = prompt('Digite o caminho da pasta no Vault (ex: Notas/NPCs ou deixe em branco para a Raiz):');
    if (targetFolder !== null) {
      handleMoveToFolder(targetFolder.trim());
    }
  };

  const menuOptions = useMemo(() => {
    const options: any[] = [];

    if (onOpenPeek) {
      options.push({
        label: 'Abrir Nota',
        icon: <Maximize2 size={16} className="text-stone-700 dark:text-neutral-200" />,
        onClick: () => {
          onOpenPeek(row.id);
          onClose();
        },
      });
    }

    if (onDuplicateRow) {
      options.push({
        label: 'Duplicar Nota',
        icon: <Copy size={16} className="text-stone-700 dark:text-neutral-200" />,
        onClick: () => {
          onDuplicateRow(row.id);
          onClose();
        },
      });
    }

    // Submenu de movimentação da nota
    const moveSubMenu: any[] = [
      {
        label: 'Raiz do Vault (/)',
        icon: <FileText size={14} className="text-stone-700 dark:text-neutral-200" />,
        onClick: () => handleMoveToFolder(''),
      },
    ];

    if (folders.length > 0) {
      folders.forEach((folderPath) => {
        moveSubMenu.push({
          label: folderPath,
          icon: <Folder size={14} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => handleMoveToFolder(folderPath),
        });
      });
    }

    if (databases.length > 0) {
      databases.forEach((dbItem) => {
        moveSubMenu.push({
          label: `DB: ${dbItem.name}`,
          icon: <Database size={14} className="text-stone-700 dark:text-neutral-200" />,
          onClick: () => handleMoveToDatabase(dbItem.path),
        });
      });
    }

    moveSubMenu.push({
      label: 'Digitar caminho de pasta...',
      icon: <FolderInput size={14} className="text-stone-700 dark:text-neutral-200" />,
      onClick: handlePromptMove,
    });

    options.push({
      label: 'Mover Nota para...',
      icon: <FolderInput size={16} className="text-stone-700 dark:text-neutral-200" />,
      onClick: () => {},
      subMenu: moveSubMenu,
      searchable: folders.length + databases.length > 5,
    });

    if (onDeleteRow) {
      options.push({
        label: 'Excluir Nota',
        icon: <Trash2 size={16} className="text-stone-700 dark:text-neutral-200" />,
        onClick: () => {
          onDeleteRow(row.id);
          onClose();
        },
      });
    }

    return options;
  }, [row.id, onOpenPeek, onDuplicateRow, onDeleteRow, folders, databases, databasePath]);

  return <ContextMenu x={x} y={y} onClose={onClose} options={menuOptions} />;
};
