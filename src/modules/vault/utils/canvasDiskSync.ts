import { BoardData, BoardElement, BoardConnection, BoardElementType } from '@/modules/board/types';
import { IVaultStorageProvider } from '../storage/VaultStorageAdapter';
import { sanitizeVaultFileName, sanitizeVaultPath } from './fileNameUtils';

import { FSAStorageProvider } from '../storage/FSAStorageProvider';

/**
 * Utilitários para sincronização física de Quadros de Conexão (.canvas) no sistema de arquivos do Windows
 * e compatibilidade com a especificação aberta JSON Canvas (usada pelo Obsidian e outras ferramentas).
 */

/**
 * Retorna o caminho relativo dentro do Vault para o arquivo .canvas
 * Se folderPath for null, undefined ou vazio (''), o arquivo pertence à raiz do Vault.
 */
export function getCanvasFilePath(folderPath: string | null | undefined, canvasName: string): string {
  const cleanBaseName = sanitizeVaultFileName(canvasName.replace(/\.canvas$/i, '').trim() || 'Quadro de Conexões', false);
  const fileName = `${cleanBaseName}.canvas`;

  if (!folderPath || folderPath.trim() === '' || folderPath === '__ROOT__') {
    return fileName;
  }

  const cleanFolder = sanitizeVaultPath(folderPath, true);
  return cleanFolder ? `${cleanFolder}/${fileName}` : fileName;
}

/**
 * Formata os dados do BoardData em uma estrutura JSON completa que preserva 100% dos dados nativos
 * do Supercanvas (áudios, previews, imagens, zIndex, cores de nota) e mapeia para nós/arestas
 * compatíveis com a especificação JSON Canvas / Obsidian.
 */
export function formatCanvasDataForDisk(data: BoardData): string {
  // Mapeamento compatível com JSON Canvas (Obsidian Spec)
  const nodes = (data.elements || []).map((el) => {
    const baseNode: Record<string, unknown> = {
      id: el.id,
      x: Math.round(el.x),
      y: Math.round(el.y),
      width: Math.round(el.width),
      height: Math.round(el.height),
    };

    if (el.type === 'note') {
      const noteData = el.data as { title?: string; content?: string; color?: string };
      const titlePrefix = noteData.title ? `# ${noteData.title}\n\n` : '';
      baseNode.type = 'text';
      baseNode.text = `${titlePrefix}${noteData.content || ''}`;
      if (noteData.color) baseNode.color = noteData.color;
    } else if (el.type === 'text') {
      const textData = el.data as { text?: string; color?: string };
      baseNode.type = 'text';
      baseNode.text = textData.text || '';
      if (textData.color) baseNode.color = textData.color;
    } else if (el.type === 'audio') {
      const audioData = el.data as { name?: string; filePath?: string };
      baseNode.type = 'file';
      baseNode.file = audioData.filePath || audioData.name || 'audio';
    } else if (el.type === 'image') {
      const imgData = el.data as { name?: string; filePath?: string };
      baseNode.type = 'file';
      baseNode.file = imgData.filePath || imgData.name || 'image';
    } else if (el.type === 'canvas-preview') {
      const prevData = el.data as { targetName?: string };
      baseNode.type = 'group';
      baseNode.label = prevData.targetName || 'Quadro Conectado';
    } else if (el.type === 'database') {
      const dbData = el.data as { title?: string; databasePath?: string };
      baseNode.type = 'file';
      baseNode.file = dbData.databasePath || dbData.title || 'database';
      baseNode.label = dbData.title || 'Base de Dados';
    } else {
      baseNode.type = 'text';
      baseNode.text = '';
    }

    return baseNode;
  });

  const edges = (data.connections || []).map((conn) => ({
    id: conn.id,
    fromNode: conn.fromId,
    fromSide: conn.fromHandle || 'right',
    toNode: conn.toId,
    toSide: conn.toHandle || 'left',
    color: conn.color,
    label: conn.label,
  }));

  const payload = {
    generator: 'supercanvas',
    version: '1.0',
    id: data.id,
    name: data.name,
    updatedAt: data.updatedAt || new Date().toISOString(),
    elements: data.elements,
    connections: data.connections,
    nodes,
    edges,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Converte o conteúdo textual de um arquivo .canvas (seja gerado pelo Supercanvas ou pelo Obsidian)
 * para a interface BoardData do Supercanvas.
 */
export function parseCanvasDataFromDisk(jsonString: string, fallbackId: string, fallbackName: string): BoardData {
  try {
    const parsed = JSON.parse(jsonString);

    // Se já possui estrutura nativa do Supercanvas (elements e connections)
    if (Array.isArray(parsed.elements)) {
      return {
        id: parsed.id || fallbackId,
        name: parsed.name || fallbackName,
        elements: parsed.elements,
        connections: Array.isArray(parsed.connections) ? parsed.connections : [],
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }

    // Se é um arquivo JSON Canvas puro do Obsidian (apenas nodes e edges)
    const elements: BoardElement[] = [];
    const connections: BoardConnection[] = [];

    if (Array.isArray(parsed.nodes)) {
      parsed.nodes.forEach((node: any, idx: number) => {
        const isDbFile = typeof node.file === 'string' && (node.file.toLowerCase().endsWith('.database') || node.file.toLowerCase().endsWith('.db.json'));
        const type: BoardElementType = isDbFile ? 'database' : (node.type === 'file' ? 'note' : (node.type === 'text' ? 'note' : 'note'));
        let content = node.text || '';
        let title = '';

        if (content.startsWith('# ')) {
          const lines = content.split('\n');
          title = lines[0].replace(/^#\s*/, '').trim();
          content = lines.slice(1).join('\n').trim();
        }

        elements.push({
          id: node.id || `node-${idx}`,
          boardId: fallbackId,
          type,
          x: typeof node.x === 'number' ? node.x : 100 + idx * 40,
          y: typeof node.y === 'number' ? node.y : 100 + idx * 40,
          width: typeof node.width === 'number' ? node.width : (isDbFile ? 640 : 240),
          height: typeof node.height === 'number' ? node.height : (isDbFile ? 440 : 180),
          zIndex: idx + 1,
          data: isDbFile
            ? {
                title: node.label || node.file?.split('/').pop()?.replace(/\.(database|db\.json)$/i, '') || 'Base de Dados',
                databasePath: node.file,
              }
            : {
                title,
                content,
                color: node.color || '#3D2F1D',
                filePath: node.file,
              },
        });
      });
    }

    if (Array.isArray(parsed.edges)) {
      parsed.edges.forEach((edge: any, idx: number) => {
        connections.push({
          id: edge.id || `edge-${idx}`,
          boardId: fallbackId,
          fromId: edge.fromNode,
          fromHandle: edge.fromSide || 'right',
          toId: edge.toNode,
          toHandle: edge.toSide || 'left',
          color: edge.color,
          label: edge.label,
        });
      });
    }

    return {
      id: parsed.id || fallbackId,
      name: parsed.name || fallbackName,
      elements,
      connections,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[canvasDiskSync] Falha ao fazer parse do JSON do .canvas:', err);
    return {
      id: fallbackId,
      name: fallbackName,
      elements: [],
      connections: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Salva ou atualiza fisicamente o arquivo .canvas no provedor de armazenamento do Windows.
 */
export async function saveCanvasToDisk(
  provider: IVaultStorageProvider | null | undefined,
  folderPath: string | null | undefined,
  canvasName: string,
  data: BoardData
): Promise<string | null> {
  if (!provider) return null;

  if (!provider.isConnected && provider instanceof FSAStorageProvider) {
    try {
      await provider.ensureHandle();
    } catch {
      return null;
    }
  }

  if (!provider.isConnected) return null;

  const targetFilePath = getCanvasFilePath(folderPath, canvasName);
  if (!targetFilePath) return null;

  try {
    const fileContent = formatCanvasDataForDisk(data);
    await provider.saveDocument(targetFilePath, fileContent);
    return targetFilePath;
  } catch (err) {
    console.error(`[canvasDiskSync] Erro ao salvar arquivo físico no Windows (${targetFilePath}):`, err);
    return null;
  }
}

/**
 * Renomeia o arquivo físico .canvas no Windows quando o quadro for renomeado.
 */
export async function renameCanvasOnDisk(
  provider: IVaultStorageProvider | null | undefined,
  folderPath: string | null | undefined,
  oldName: string,
  newName: string
): Promise<void> {
  if (!provider) return;

  if (!provider.isConnected && provider instanceof FSAStorageProvider) {
    try {
      await provider.ensureHandle();
    } catch {}
  }

  if (!provider.isConnected) return;
  if (!oldName || !newName || oldName.trim() === newName.trim()) return;

  const oldPath = getCanvasFilePath(folderPath, oldName);
  const newPath = getCanvasFilePath(folderPath, newName);

  if (!oldPath || !newPath || oldPath === newPath) return;

  try {
    await provider.renameNode(oldPath, newPath, false);
  } catch (err) {
    console.warn(`[canvasDiskSync] Aviso ao renomear arquivo físico (${oldPath} -> ${newPath}):`, err);
  }
}

/**
 * Move ou cria/remove o arquivo físico .canvas no Windows ao alterar de pasta.
 */
export async function moveCanvasOnDisk(
  provider: IVaultStorageProvider | null | undefined,
  oldFolder: string | null | undefined,
  newFolder: string | null | undefined,
  canvasName: string,
  getBoardData: () => Promise<BoardData | null>
): Promise<void> {
  if (!provider) return;

  if (!provider.isConnected && provider instanceof FSAStorageProvider) {
    try {
      await provider.ensureHandle();
    } catch {}
  }

  if (!provider.isConnected) return;

  const normOld = !oldFolder || oldFolder === '__ROOT__' ? '' : oldFolder;
  const normNew = !newFolder || newFolder === '__ROOT__' ? '' : newFolder;
  if (normOld === normNew) return;

  const oldPath = getCanvasFilePath(normOld, canvasName);
  const newPath = getCanvasFilePath(normNew, canvasName);
  if (oldPath === newPath) return;

  try {
    await provider.renameNode(oldPath, newPath, false);
  } catch (err) {
    try {
      const data = await getBoardData();
      if (data) {
        await provider.saveDocument(newPath, formatCanvasDataForDisk(data));
      }
    } catch (saveErr) {
      console.error(`[canvasDiskSync] Erro ao mover/salvar arquivo físico do canvas (${oldPath} -> ${newPath}):`, saveErr);
    }
  }
}

/**
 * Exclui o arquivo físico .canvas da pasta do Windows quando o canvas for deletado.
 */
export async function deleteCanvasFromDisk(
  provider: IVaultStorageProvider | null | undefined,
  folderPath: string | null | undefined,
  canvasName: string
): Promise<void> {
  if (!provider) return;

  if (!provider.isConnected && provider instanceof FSAStorageProvider) {
    try {
      await provider.ensureHandle();
    } catch {}
  }

  if (!provider.isConnected) return;

  const targetFilePath = getCanvasFilePath(folderPath, canvasName);
  if (!targetFilePath) return;

  try {
    await provider.deleteNode(targetFilePath, false);
  } catch (err) {
    console.warn(`[canvasDiskSync] Aviso ao excluir arquivo físico do canvas (${targetFilePath}):`, err);
  }
}
