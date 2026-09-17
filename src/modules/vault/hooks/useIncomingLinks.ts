import { useState, useEffect } from 'react';
import { useVaultStore } from './useVaultStore';
import { extractWikilinks, normalizeNoteTitle } from '../utils/wikilinkUtils';
import { parseCanvasDataFromDisk } from '../utils/canvasDiskSync';

export interface IncomingLinkItem {
  sourcePath: string;
  sourceTitle: string;
  linkCount: number;
}

export interface UseIncomingLinksResult {
  incomingLinks: IncomingLinkItem[];
  totalLinksCount: number;
  isScanning: boolean;
}

/**
 * Custom hook to detect incoming links (wikilinks, standard Markdown links, and Canvas connections)
 * pointing to a file or folder before deletion.
 */
export function useIncomingLinks(
  itemPath?: string | null,
  itemName?: string | null,
  isFolder: boolean = false,
  isOpen: boolean = true
): UseIncomingLinksResult {
  const [incomingLinks, setIncomingLinks] = useState<IncomingLinkItem[]>([]);
  const [totalLinksCount, setTotalLinksCount] = useState<number>(0);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen || !itemPath) {
      setIncomingLinks([]);
      setTotalLinksCount(0);
      setIsScanning(false);
      return;
    }

    let isCancelled = false;
    const { provider, getAllFiles, documentCache } = useVaultStore.getState();
    if (!provider) {
      setIncomingLinks([]);
      setTotalLinksCount(0);
      setIsScanning(false);
      return;
    }

    const scanForIncomingLinks = async () => {
      setIsScanning(true);
      const allFiles = getAllFiles();
      const results: IncomingLinkItem[] = [];
      let total = 0;

      // Extract target identifiers
      const rawName = itemName || itemPath.split('/').pop() || '';
      const baseNameWithoutExt = rawName.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');
      const normalizedBaseTitle = normalizeNoteTitle(baseNameWithoutExt);
      const normalizedTargetFullPath = itemPath.replace(/\\/g, '/').toLowerCase();
      const normalizedTargetRelPathWithoutExt = normalizedTargetFullPath.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');

      for (const file of allFiles) {
        if (isCancelled) return;

        // Skip self
        if (file.path === itemPath) continue;
        if (isFolder && (file.path.startsWith(itemPath + '/') || file.path.startsWith(itemPath + '\\'))) {
          continue;
        }

        try {
          let content = '';
          const cached = documentCache[file.path];
          if (cached && cached.content) {
            content = cached.content;
          } else {
            content = await provider.readDocument(file.path);
          }

          if (!content || !content.trim()) continue;

          let linksInFile = 0;
          const isCanvas = file.path.toLowerCase().endsWith('.canvas') || file.fileType === 'canvas';

          if (isCanvas) {
            const boardData = parseCanvasDataFromDisk(content, file.name.replace(/\.canvas$/i, ''), file.folder);

            for (const el of boardData.elements || []) {
              const elData = (el.data || {}) as Record<string, unknown>;
              const filePath = typeof elData.filePath === 'string' ? elData.filePath : '';
              const databasePath = typeof elData.databasePath === 'string' ? elData.databasePath : '';
              const elTitle = typeof elData.title === 'string' ? elData.title : typeof elData.name === 'string' ? elData.name : '';
              const elText = typeof elData.content === 'string' ? elData.content : typeof elData.text === 'string' ? elData.text : '';

              const targetPath = (filePath || databasePath).replace(/\\/g, '/').toLowerCase();
              const targetPathNoExt = targetPath.replace(/\.(md|txt|canvas|database|db\.json)$/i, '');

              if (!isFolder) {
                if (
                  targetPath === normalizedTargetFullPath ||
                  targetPathNoExt === normalizedTargetRelPathWithoutExt ||
                  targetPath === rawName.toLowerCase() ||
                  targetPathNoExt === baseNameWithoutExt.toLowerCase() ||
                  targetPath.endsWith('/' + rawName.toLowerCase()) ||
                  targetPathNoExt.endsWith('/' + baseNameWithoutExt.toLowerCase()) ||
                  (elTitle && normalizeNoteTitle(elTitle) === normalizedBaseTitle)
                ) {
                  linksInFile++;
                }
              } else {
                if (
                  targetPath.startsWith(normalizedTargetFullPath + '/') ||
                  targetPathNoExt.startsWith(normalizedTargetRelPathWithoutExt + '/')
                ) {
                  linksInFile++;
                }
              }

              if (elText) {
                const wls = extractWikilinks(elText);
                for (const wl of wls) {
                  const targetNorm = normalizeNoteTitle(wl.targetTitle);
                  if (targetNorm === normalizedBaseTitle) {
                    linksInFile++;
                  }
                }
              }
            }
          } else {
            // 1. Scan for Wikilinks: [[target]] or [[target|alias]] or [[target#heading]]
            const wikilinks = extractWikilinks(content);
            for (const wl of wikilinks) {
              const targetNorm = normalizeNoteTitle(wl.targetTitle);
              const rawWlTarget = wl.targetTitle.trim().replace(/\\/g, '/').toLowerCase();
              const rawWlWithoutExt = rawWlTarget.replace(/\.(md|txt)$/i, '');

              if (!isFolder) {
                if (
                  targetNorm === normalizedBaseTitle ||
                  rawWlWithoutExt === normalizedBaseTitle ||
                  rawWlTarget === normalizedTargetFullPath ||
                  rawWlWithoutExt === normalizedTargetRelPathWithoutExt ||
                  rawWlTarget.endsWith('/' + rawName.toLowerCase()) ||
                  rawWlWithoutExt.endsWith('/' + baseNameWithoutExt.toLowerCase())
                ) {
                  linksInFile++;
                }
              } else {
                // Target is a folder: link points inside this folder
                if (
                  rawWlTarget.startsWith(normalizedTargetFullPath + '/') ||
                  rawWlWithoutExt.startsWith(normalizedTargetRelPathWithoutExt + '/')
                ) {
                  linksInFile++;
                }
              }
            }

            // 2. Scan for standard Markdown links: [anchor](url)
            const mdLinkRegex = /\[(?:[^\]]*)\]\(([^)]+)\)/g;
            let match: RegExpExecArray | null;
            while ((match = mdLinkRegex.exec(content)) !== null) {
              const rawHref = (match[1] || '').trim();
              // Ignore external URLs (http, https, mailto)
              if (/^(https?:|\/\/|mailto:)/i.test(rawHref)) continue;

              const cleanHref = decodeURIComponent(rawHref.split('#')[0].split('?')[0])
                .replace(/\\/g, '/')
                .replace(/^(\.\/|\/)+/, '')
                .toLowerCase();
              const cleanHrefWithoutExt = cleanHref.replace(/\.(md|txt)$/i, '');

              if (!isFolder) {
                if (
                  cleanHref === normalizedTargetFullPath ||
                  cleanHrefWithoutExt === normalizedTargetRelPathWithoutExt ||
                  cleanHref === rawName.toLowerCase() ||
                  cleanHrefWithoutExt === baseNameWithoutExt.toLowerCase() ||
                  cleanHref.endsWith('/' + rawName.toLowerCase()) ||
                  cleanHrefWithoutExt.endsWith('/' + baseNameWithoutExt.toLowerCase())
                ) {
                  linksInFile++;
                }
              } else {
                if (
                  cleanHref === normalizedTargetFullPath ||
                  cleanHref.startsWith(normalizedTargetFullPath + '/')
                ) {
                  linksInFile++;
                }
              }
            }
          }

          if (linksInFile > 0) {
            results.push({
              sourcePath: file.path,
              sourceTitle: file.name,
              linkCount: linksInFile
            });
            total += linksInFile;
          }
        } catch {
          // File may be unreadable or deleted, continue
        }
      }

      if (!isCancelled) {
        setIncomingLinks(results);
        setTotalLinksCount(total);
        setIsScanning(false);
      }
    };

    scanForIncomingLinks();

    return () => {
      isCancelled = true;
    };
  }, [itemPath, itemName, isFolder, isOpen]);

  return { incomingLinks, totalLinksCount, isScanning };
}
