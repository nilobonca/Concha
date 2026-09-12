export interface VaultTab {
  path: string;
  title: string;
  isDirty?: boolean;
  type?: 'markdown' | 'canvas' | 'audio' | 'image' | 'empty' | 'database';
  canvasId?: string;
  fileType?: 'audio' | 'image' | 'note' | 'database';
}

export type SplitDirection = 'horizontal' | 'vertical'; 
// 'horizontal' = colunas lado a lado (flex-row)
// 'vertical' = linhas empilhadas (flex-col)

export interface VaultPaneLeaf {
  id: string;
  type: 'leaf';
  tabs: VaultTab[];
  activePath: string | null;
}

export interface VaultPaneSplit {
  id: string;
  type: 'split';
  direction: SplitDirection;
  children: VaultLayoutNode[];
  sizes: number[]; // Proporções percentuais (somando 100)
}

export type VaultLayoutNode = VaultPaneLeaf | VaultPaneSplit;

export type DropZoneType = 
  | 'split-top' 
  | 'split-bottom' 
  | 'split-left' 
  | 'split-right' 
  | 'tab-bar' 
  | 'between-panes';

export interface DraggedTabInfo {
  sourcePaneId: string;
  tab: VaultTab;
}

export interface DropPreviewState {
  zone: DropZoneType;
  targetPaneId: string;
  rect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface CachedDocument {
  content: string;
  isDirty?: boolean;
  lastSavedAt?: number | null;
  frontmatter?: Record<string, any>;
}
