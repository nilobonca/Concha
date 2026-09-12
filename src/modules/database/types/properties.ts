/**
 * Supercanvas Database - Property Types
 * Design System: Midnight Navy (#17192A), Ivory (#F4F0E6), Ice Blue (#B4D3F1), Accents (#52B1FF, #7F95FF, #1831D7)
 */

export type PropertyType =
  | 'title'
  | 'text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'files'
  | 'relation'
  | 'created_time'
  | 'last_edited_time';

export type PropertyOptionColor =
  | 'blue'
  | 'green'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'gray'
  | 'cyan'
  | 'indigo';

export interface SelectOption {
  id: string;
  name: string;
  color: PropertyOptionColor;
}

export type StatusCategory = 'to_do' | 'in_progress' | 'done';

export interface StatusOption {
  id: string;
  name: string;
  color: PropertyOptionColor;
  category: StatusCategory;
}

export type DatabaseAttachmentFileType = 'image' | 'audio' | 'pdf' | 'document' | 'other';

export interface DatabaseAttachment {
  id: string;
  name: string;
  vaultPath?: string;
  url?: string;
  fileType: DatabaseAttachmentFileType;
  size?: number;
  mimeType?: string;
  uploadedAt: number;
}

export type NumberFormat =
  | 'number'
  | 'currency_usd'
  | 'currency_brl'
  | 'currency_eur'
  | 'percent'
  | 'compact';

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  width?: number;
  options?: SelectOption[];
  statusOptions?: StatusOption[];
  numberFormat?: NumberFormat;
  relationTargetVaultPath?: string;
  relationTargetDatabaseId?: string;
  defaultValue?: unknown;
  description?: string;
}

export interface ColorBadgeStyle {
  bg: string;
  text: string;
  border: string;
}

export const SELECT_OPTION_COLOR_MAP: Record<PropertyOptionColor, ColorBadgeStyle> = {
  blue: {
    bg: 'rgba(24, 49, 215, 0.22)',
    text: '#7F95FF',
    border: 'rgba(127, 149, 255, 0.35)',
  },
  cyan: {
    bg: 'rgba(82, 177, 255, 0.18)',
    text: '#52B1FF',
    border: 'rgba(82, 177, 255, 0.3)',
  },
  green: {
    bg: 'rgba(34, 197, 94, 0.18)',
    text: '#86efac',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.18)',
    text: '#fcd34d',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  rose: {
    bg: 'rgba(244, 63, 94, 0.18)',
    text: '#fda4af',
    border: 'rgba(244, 63, 94, 0.3)',
  },
  purple: {
    bg: 'rgba(168, 85, 247, 0.18)',
    text: '#d8b4fe',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  gray: {
    bg: 'rgba(244, 240, 230, 0.08)',
    text: '#B4D3F1',
    border: 'rgba(180, 211, 241, 0.2)',
  },
  indigo: {
    bg: 'rgba(99, 102, 241, 0.2)',
    text: '#a5b4fc',
    border: 'rgba(99, 102, 241, 0.32)',
  },
};
