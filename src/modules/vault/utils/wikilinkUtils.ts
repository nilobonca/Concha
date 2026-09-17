export interface ExtractedLink {
  targetTitle: string;
  sectionHeader?: string;
  alias?: string;
  raw: string;
  index: number;
}

export interface ExtractedTag {
  tag: string;
  raw: string;
}

export interface BacklinkReference {
  sourcePath: string;
  sourceTitle: string;
  targetTitle: string;
  snippet: string;
  isCanvas?: boolean;
}

// Regex to capture [[Target]] and [[Target|Alias]] and [[Target#Header]]
export const WIKILINK_REGEX = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;

// Regex to capture #tag (excluding hex colors like #fff or markdown headings at start of line)
export const TAG_REGEX = /(?:^|\s)#([a-zA-Z0-9_\u00C0-\u00FF-]+)/g;

/**
 * Extracts all [[wikilinks]] from a text content
 */
export function extractWikilinks(text: string): ExtractedLink[] {
  if (!text) return [];
  const links: ExtractedLink[] = [];
  const regex = new RegExp(WIKILINK_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullTarget = match[1]?.trim();
    const alias = match[2]?.trim();
    if (fullTarget) {
      const parts = fullTarget.split('#');
      const targetTitle = parts[0]?.trim() || fullTarget;
      const sectionHeader = parts[1]?.trim();

      links.push({
        targetTitle,
        sectionHeader,
        alias,
        raw: match[0],
        index: match.index
      });
    }
  }

  return links;
}

/**
 * Extracts all #tags from a text content
 */
export function extractTags(text: string): string[] {
  if (!text) return [];
  const tags = new Set<string>();
  const regex = new RegExp(TAG_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const tag = match[1]?.trim();
    if (tag && !tag.match(/^[0-9a-fA-F]{3,6}$/)) { // exclude hex colors
      tags.add(tag);
    }
  }

  return Array.from(tags);
}

/**
 * Extracts a surrounding context snippet for a backlink reference
 */
export function extractContextSnippet(text: string, matchIndex: number, matchLength: number, contextRadius: number = 60): string {
  // Strip HTML tags if content is HTML from TipTap
  const plain = text.replace(/<[^>]+>/g, ' ');
  const start = Math.max(0, matchIndex - contextRadius);
  const end = Math.min(plain.length, matchIndex + matchLength + contextRadius);

  let snippet = plain.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < plain.length) snippet = snippet + '...';

  return snippet;
}

import { sanitizeVaultFileName } from './fileNameUtils';

/**
 * Normalizes title for comparison (case-insensitive, ignores .md extension and #section,
 * handles Unicode NFC, decodes URL components and maps prohibited characters uniformly)
 */
export function normalizeNoteTitle(title: string): string {
  if (!title) return '';
  let base = title.split('#')[0];
  if (/%[0-9a-fA-F]{2}/.test(base)) {
    try {
      base = decodeURIComponent(base);
    } catch {}
  }

  const segments = base.split('/').map((seg) => sanitizeVaultFileName(seg, false));
  return segments
    .join('/')
    .trim()
    .normalize('NFC')
    .toLowerCase()
    .replace(/\.(md|txt)$/i, '');
}

