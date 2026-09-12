import { DatabaseInstance } from '../database/types';

export type BoardElementType = 'note' | 'text' | 'audio' | 'image' | 'canvas-preview' | 'database';

export type HandlePosition = 'top' | 'right' | 'bottom' | 'left';

export interface NoteData {
  title?: string;
  content: string;
  color: string;
  filePath?: string;
}

export interface TextData {
  text: string;
  fontSize: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  isBold?: boolean;
}

export interface AudioData {
  audioId?: number;
  name: string;
  url?: string;
  volume?: number;
  loop?: boolean;
  filePath?: string;
}

export interface ImageData {
  imageId?: number;
  name: string;
  src: string;
  aspectRatio?: number;
  filePath?: string;
  base64?: string;
}

export interface CanvasPreviewData {
  targetProjectId: string;
  targetName: string;
  targetType: 'audio' | 'board';
  previewInfo?: string;
}

export interface DatabaseElementData {
  databasePath?: string;
  databaseId?: string;
  title?: string;
  initialData?: DatabaseInstance;
}

export type BoardElementPayload =
  | Partial<NoteData>
  | Partial<TextData>
  | AudioData
  | ImageData
  | CanvasPreviewData
  | DatabaseElementData;

export interface BoardElement {
  id: string;
  boardId: string;
  type: BoardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  data: NoteData | TextData | AudioData | ImageData | CanvasPreviewData | DatabaseElementData | Record<string, unknown>;
}

export interface BoardConnection {
  id: string;
  boardId: string;
  fromId: string;
  fromHandle: HandlePosition;
  toId: string;
  toHandle: HandlePosition;
  color?: string;
  label?: string;
  style?: 'solid' | 'dashed';
}

export interface PendingArrowContext {
  sourceId: string;
  sourceHandle: HandlePosition;
  dropPos: { x: number; y: number }; // Coordenadas do mundo canvas
  screenPos: { x: number; y: number }; // Coordenadas de tela para renderizar o menu
}

export interface BoardData {
  id: string;
  name: string;
  elements: BoardElement[];
  connections: BoardConnection[];
  updatedAt: string;
}

export interface ViewportTransform {
  x: number;
  y: number;
  k: number;
}
