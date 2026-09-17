import { useState, useEffect, useRef } from 'react';
import { useVaultStore } from './useVaultStore';
import { extractWikilinks, extractContextSnippet, normalizeNoteTitle, BacklinkReference } from '../utils/wikilinkUtils';
import { parseCanvasDataFromDisk, getCanvasFilePath } from '../utils/canvasDiskSync';

export function useBacklinks() {
  const { activePath, provider, nodes, lastSavedAt, canvases } = useVaultStore();
  const [backlinks, setBacklinks] = useState<BacklinkReference[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // In-memory cache of file contents to avoid excessive disk/IDB reads: { path: content }
  const fileCacheRef = useRef<Map<string, { content: string; updatedAt: number }>>(new Map());

  useEffect(() => {
    if (!activePath || !provider) {
      setBacklinks([]);
      return;
    }

    let isCancelled = false;
    const activeFileName = activePath.split('/').pop() || '';
    const activeTitleWithoutExt = activeFileName.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');
    const normalizedCurrent = normalizeNoteTitle(activeTitleWithoutExt);
    const normalizedActivePath = activePath.replace(/\\/g, '/').toLowerCase();
    const normalizedActiveRelWithoutExt = normalizedActivePath.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');

    const scanAllNotes = async () => {
      setIsScanning(true);
      const state = useVaultStore.getState();
      const allFiles = state.getAllFiles();
      const references: BacklinkReference[] = [];

      // Collect all file paths to scan including canvas layers
      const scannedPaths = new Set<string>();

      for (const file of allFiles) {
        if (file.path === activePath) continue;
        scannedPaths.add(file.path);

        try {
          let content = '';
          const cached = fileCacheRef.current.get(file.path);
          if (cached && Date.now() - cached.updatedAt < 5000) {
            content = cached.content;
          } else {
            content = await provider.readDocument(file.path);
            fileCacheRef.current.set(file.path, { content, updatedAt: Date.now() });
          }

          if (isCancelled) return;
          if (!content || !content.trim()) continue;

          const isCanvas = file.path.toLowerCase().endsWith('.canvas') || file.fileType === 'canvas';

          if (isCanvas) {
            const boardData = parseCanvasDataFromDisk(content, file.name.replace(/\.canvas$/i, ''), file.folder);
            let canvasMatchSnippet: string | null = null;

            for (const el of boardData.elements || []) {
              const elData = (el.data || {}) as Record<string, unknown>;
              const filePath = typeof elData.filePath === 'string' ? elData.filePath : '';
              const databasePath = typeof elData.databasePath === 'string' ? elData.databasePath : '';
              const elTitle = typeof elData.title === 'string' ? elData.title : typeof elData.name === 'string' ? elData.name : '';
              const elText = typeof elData.content === 'string' ? elData.content : typeof elData.text === 'string' ? elData.text : '';

              // Check direct file reference in node
              const targetPath = (filePath || databasePath).replace(/\\/g, '/').toLowerCase();
              const targetPathNoExt = targetPath.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');

              if (targetPath) {
                if (
                  targetPath === normalizedActivePath ||
                  targetPathNoExt === normalizedActiveRelWithoutExt ||
                  targetPath === activeFileName.toLowerCase() ||
                  targetPathNoExt === activeTitleWithoutExt.toLowerCase() ||
                  targetPath.endsWith('/' + activeFileName.toLowerCase()) ||
                  targetPathNoExt.endsWith('/' + activeTitleWithoutExt.toLowerCase())
                ) {
                  const typeLabel = el.type === 'note' ? 'Nota' : el.type === 'audio' ? 'Áudio' : el.type === 'image' ? 'Imagem' : el.type === 'database' ? 'Base de Dados' : 'Elemento';
                  canvasMatchSnippet = `${typeLabel} inserida no Quadro de Conexões "${file.name.replace(/\.canvas$/i, '')}"`;
                  break;
                }
              }

              // Check title matching if element represents a note or database
              if (elTitle && el.type !== 'text') {
                if (normalizeNoteTitle(elTitle) === normalizedCurrent) {
                  canvasMatchSnippet = `Elemento "${elTitle}" no Quadro de Conexões`;
                  break;
                }
              }

              // Check wikilinks inside element text content
              if (elText) {
                const links = extractWikilinks(elText);
                for (const link of links) {
                  if (normalizeNoteTitle(link.targetTitle) === normalizedCurrent) {
                    const snippet = extractContextSnippet(elText, link.index, link.raw.length);
                    canvasMatchSnippet = `Referenciado em bloco do Quadro: ${snippet}`;
                    break;
                  }
                }
                if (canvasMatchSnippet) break;
              }
            }

            // Check connection labels if no match yet
            if (!canvasMatchSnippet && Array.isArray(boardData.connections)) {
              for (const conn of boardData.connections) {
                if (conn.label) {
                  const links = extractWikilinks(conn.label);
                  for (const link of links) {
                    if (normalizeNoteTitle(link.targetTitle) === normalizedCurrent) {
                      canvasMatchSnippet = `Conexão no Quadro: ${conn.label}`;
                      break;
                    }
                  }
                  if (canvasMatchSnippet) break;
                }
              }
            }

            if (canvasMatchSnippet) {
              references.push({
                sourcePath: file.path,
                sourceTitle: file.name.replace(/\.canvas$/i, ''),
                targetTitle: activeTitleWithoutExt,
                snippet: canvasMatchSnippet,
                isCanvas: true,
              });
            }
          } else {
            // Standard Markdown file scanning
            const links = extractWikilinks(content);
            for (const link of links) {
              if (normalizeNoteTitle(link.targetTitle) === normalizedCurrent) {
                const snippet = extractContextSnippet(content, link.index, link.raw.length);
                references.push({
                  sourcePath: file.path,
                  sourceTitle: file.name,
                  targetTitle: link.targetTitle,
                  snippet,
                });
              }
            }
          }
        } catch {
          // File might be missing or unreadable
        }
      }

      // Also check canvases registered in state that may not be in allFiles
      const stateCanvases = state.canvases || [];
      for (const canvas of stateCanvases) {
        const cPath = getCanvasFilePath(canvas.folderPath, canvas.name);
        if (scannedPaths.has(cPath) || cPath === activePath) continue;
        scannedPaths.add(cPath);

        try {
          let content = '';
          const cached = fileCacheRef.current.get(cPath);
          if (cached && Date.now() - cached.updatedAt < 5000) {
            content = cached.content;
          } else {
            content = await provider.readDocument(cPath);
            fileCacheRef.current.set(cPath, { content, updatedAt: Date.now() });
          }

          if (isCancelled) return;
          if (!content || !content.trim()) continue;

          const boardData = parseCanvasDataFromDisk(content, canvas.name, canvas.folderPath || '');
          let canvasMatchSnippet: string | null = null;

          for (const el of boardData.elements || []) {
            const elData = (el.data || {}) as Record<string, unknown>;
            const filePath = typeof elData.filePath === 'string' ? elData.filePath : '';
            const databasePath = typeof elData.databasePath === 'string' ? elData.databasePath : '';
            const elTitle = typeof elData.title === 'string' ? elData.title : typeof elData.name === 'string' ? elData.name : '';
            const elText = typeof elData.content === 'string' ? elData.content : typeof elData.text === 'string' ? elData.text : '';

            const targetPath = (filePath || databasePath).replace(/\\/g, '/').toLowerCase();
            const targetPathNoExt = targetPath.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');

            if (targetPath) {
              if (
                targetPath === normalizedActivePath ||
                targetPathNoExt === normalizedActiveRelWithoutExt ||
                targetPath === activeFileName.toLowerCase() ||
                targetPathNoExt === activeTitleWithoutExt.toLowerCase() ||
                targetPath.endsWith('/' + activeFileName.toLowerCase()) ||
                targetPathNoExt.endsWith('/' + activeTitleWithoutExt.toLowerCase())
              ) {
                const typeLabel = el.type === 'note' ? 'Nota' : el.type === 'audio' ? 'Áudio' : el.type === 'image' ? 'Imagem' : el.type === 'database' ? 'Base de Dados' : 'Elemento';
                canvasMatchSnippet = `${typeLabel} inserida no Quadro de Conexões "${canvas.name}"`;
                break;
              }
            }

            if (elTitle && el.type !== 'text') {
              if (normalizeNoteTitle(elTitle) === normalizedCurrent) {
                canvasMatchSnippet = `Elemento "${elTitle}" no Quadro de Conexões`;
                break;
              }
            }

            if (elText) {
              const links = extractWikilinks(elText);
              for (const link of links) {
                if (normalizeNoteTitle(link.targetTitle) === normalizedCurrent) {
                  const snippet = extractContextSnippet(elText, link.index, link.raw.length);
                  canvasMatchSnippet = `Referenciado em bloco do Quadro: ${snippet}`;
                  break;
                }
              }
              if (canvasMatchSnippet) break;
            }
          }

          if (canvasMatchSnippet) {
            references.push({
              sourcePath: cPath,
              sourceTitle: canvas.name,
              targetTitle: activeTitleWithoutExt,
              snippet: canvasMatchSnippet,
              isCanvas: true,
            });
          }
        } catch {
          // Canvas file might not be persisted yet
        }
      }

      if (!isCancelled) {
        setBacklinks(references);
        setIsScanning(false);
      }
    };

    scanAllNotes();

    return () => {
      isCancelled = true;
    };
  }, [activePath, provider, nodes, lastSavedAt, canvases]);

  return { backlinks, isScanning };
}
