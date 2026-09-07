
export interface Audios {
    id: number;
    name: string;
    file: File;
    url: string;
    createdAt: Date;
    order?: number;
    publicUrl?: string;
    folderId?: string;
    trimStart?: number;
    trimEnd?: number;
}

export interface Players {
    id: string;
    type: 'player';
    audio: Audios;
    position: {
        x: number;
        y: number;
    };
}

export interface Images {
    id: number;
    name: string;
    file: File;
    url: string;
    createdAt: Date;
    order?: number;
    folderId?: string;
}

export interface AssetFolder {
    id: string;
    name: string;
    createdAt: Date;
    order?: number;
}

export interface ActiveImage {
    id: string;
    type: 'image';
    image: Images;
    position: { x: number; y: number };
    // Image editing properties
    rotation?: number;        // 0-360 degrees
    scale?: number;           // 0.1-3x (default 1)
    flipH?: boolean;          // flip horizontal
    flipV?: boolean;          // flip vertical
    brightness?: number;      // -100 to 100 (default 0)
    contrast?: number;        // -100 to 100 (default 0)
    opacity?: number;         // 0-100 (default 100)
    crop?: {                  // crop area (percentage values)
        x: number;            // 0-100 (left position %)
        y: number;            // 0-100 (top position %)
        width: number;        // 0-100 (width %)
        height: number;       // 0-100 (height %)
    };

}


export interface ActiveArea {
    id: string;
    type: 'area';
    name: string;
    points: { x: number; y: number }[];
    linkedPlayerId: string | null;
    linkedAudioId: number | null;
    volumeMode: 'standard' | 'proximity';
    volumeSourcePoint?: { x: number; y: number };
    proximityRadius?: number; // Radius for circular proximity calculation
    showName?: boolean;
    color?: string;
    opacity?: number;
    filterType?: 'none' | 'lowpass' | 'wall' | 'telephone';
    spatialPan?: number; // -1 to 1 (left to right) // -1 to 1 (front to back)
    pitch?: number;
    volume?: number;
  audioRotation?: number; // 0-360 degrees
}

export interface ActivePin {
    id: string;
    type: 'pin';
    position: { x: number; y: number };
    name: string;
    enabled: boolean;
    order?: number;
    color?: string;
    opacity?: number;
    icon?: 'pin' | 'person' | 'ear';
    linkedDocumentPath?: string;
}

export interface ActiveWall {
    id: string;
    type: 'wall';
    name: string;
    points: { x: number; y: number }[];
    color?: string;
    opacity?: number;
    mufflingFactor?: number;
}

export interface ActiveVaultLink {
    id: string;
    type: 'vault-link';
    title: string;
    documentPath: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
    color?: string;
    summary?: string;
}

export interface Layer {
    id: string;
    type: 'group' | 'item';
    name: string;
    visible: boolean;
    locked: boolean;
    expanded?: boolean; // For UI state (groups)
    parentId: string | null; // For hierarchy
    depth: number; // For indentation
    // Item reference
    itemId?: string;
    itemType?: 'image' | 'area' | 'pin' | 'soundboard' | 'note' | 'wall' | 'vault-link';
    order?: number;
    isProject?: boolean;
    projectId?: string; // Grouping for Pages (formerly Projects)
    isProjectMetadata?: boolean; // Identifies the Project Root Layer
    canvasType?: 'audio' | 'board';
    folderPath?: string | null; // Pasta do Vault onde o canvas está organizado (null = Caixa Geral)
    vaultId?: string | null; // ID do Vault onde o canvas está salvo (null = Vault Atual / Geral)
    vaultName?: string | null; // Nome de exibição do Vault onde o canvas está salvo
}

export interface SoundboardItem {
    id: string;
    name: string;
    audioId: number | null;
    color?: string;
    order: number;
    playbackMode?: 'restart' | 'overlap'; // default: 'overlap'
    pitch?: number;
    volume?: number;
  audioRotation?: number; // 0-360 degrees
    filterType?: 'none' | 'lowpass' | 'wall' | 'telephone';
    spatialPan?: number; // -1 to 1 (left to right) // -1 to 1 (front to back)
    trimStart?: number;
    trimEnd?: number;
}

export interface ActiveSoundboardItem {
    id: string;
    type: 'soundboard';
    soundboardItemId: string; // Reference to the original item definition
    position: { x: number; y: number };
    // We might want to override some properties per instance, but for now let's keep it simple
}

export interface ActiveNote {
    id: string;
    type: 'note';
    content: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    color: string; // Background color (required as per usage implying default)
    fontSize: number;
    fontColor: string;
    transparentBg: boolean;
    textAlign: 'left' | 'center' | 'right';
    borderColor?: string;
    borderWidth?: number;
    fillMode?: 'filled' | 'transparent' | 'outlined';
    vaultPath?: string; // Caminho do arquivo vinculado no Vault (ex: "Nova nota.md")
    title?: string; // Título / nome visível da nota
}

export interface PollQuestion {
    id: string;
    text: string;
    type: 'text' | 'single' | 'multiple';
    options?: string[]; // For single/multiple select
    charLimit?: number; // For text
    required?: boolean;
}

export interface Poll {
    id: string;
    title: string;
    active: boolean;
    questions: PollQuestion[];
    createdAt: Date;
    cooldownMinutes?: number;
    forceShow?: boolean;
}

export interface GlobalTrack {
    id: string;
    name: string;
}

export interface ActiveGlobalTrack {
    id: string;
    type: 'globalTrack';
    linkedAudioId: number;
    isMic?: boolean;
    volume: number;
    pitch?: number;
    isPlaying: boolean;
    order: number;
    filterType?: 'none' | 'lowpass' | 'wall' | 'telephone';
    spatialPan?: number; // -1 to 1 (left to right) // -1 to 1 (front to back)
    projectId?: string; // Optional for backward compatibility
}

export interface PollResponse {
    id: string;
    pollId: string;
    answers: {
        questionId: string;
        value: string | string[]; // string for text/single, string[] for multiple
    }[];
    submittedAt: Date;
}
