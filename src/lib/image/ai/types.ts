export type RealESRGANScale = 2 | 4;

export type InferenceBackend = 'webgpu' | 'wasm' | 'cpu';

export interface AICapabilities {
  hasWebGPU: boolean;
  hasWasmSIMD: boolean;
  hasWasmThreads: boolean;
  recommendedBackend: InferenceBackend;
  maxSafeDimension: number;
  recommendedTileSize: number;
  deviceDescription: string;
}

export interface AIProgressUpdate {
  phase: 'idle' | 'downloading' | 'compiling' | 'tiling' | 'processing' | 'reconstructing' | 'done' | 'error';
  message: string;
  progress: number; // 0 to 100
  currentTile?: number;
  totalTiles?: number;
  downloadBytesLoaded?: number;
  downloadBytesTotal?: number;
  error?: string;
}

export interface AIRateLimitState {
  date: string; // 'YYYY-MM-DD'
  count: number;
  maxLimit: number;
  remaining: number;
  isLimitReached: boolean;
}

export interface AIEnhanceOptions {
  scale: RealESRGANScale;
  onProgress?: (update: AIProgressUpdate) => void;
  abortSignal?: AbortSignal;
}
