export interface EnhancementSettings {
  brightness: number;    // -100 to +100 (default 0)
  contrast: number;      // -100 to +100 (default 0)
  saturation: number;    // -100 to +100 (default 0)
  sharpness: number;     // 0 to 100 (default 0)
  denoise: number;       // 0 to 100 (default 0)
  exposure: number;      // -100 to +100 (default 0)
  temperature: number;   // -100 to +100 (default 0, - = cool blue, + = warm orange)
  blur: number;          // 0 to 100 (default 0)
  grayscale: number;     // 0 to 100 (default 0)
  sepia: number;         // 0 to 100 (default 0)
  highlights: number;    // -100 to +100 (default 0)
  shadows: number;       // -100 to +100 (default 0)
  vignette: number;      // 0 to 100 (default 0)
}

export const DEFAULT_SETTINGS: EnhancementSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  denoise: 0,
  exposure: 0,
  temperature: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
};

export interface ImageMetadata {
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
  aspectRatio: number;
  lastModified: number;
}

export type ViewMode = 'split' | 'side-by-side' | 'enhanced' | 'original';

export type ExportFormat = 'image/webp' | 'image/png' | 'image/jpeg' | 'image/avif';

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0.1 to 1.0
  filename: string;
  suffix?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: 'Enhancement' | 'Creative' | 'Utility';
  settings: Partial<EnhancementSettings>;
}

export interface ProcessingProgress {
  status: 'idle' | 'processing' | 'ready' | 'error';
  message?: string;
  progress?: number; // 0 to 100
}

/**
 * ImageProcessingEngine abstraction for Phase 1 (Canvas/LUT)
 * and future Phase 2 (WebGPU / AI Super-Resolution shaders)
 */
export interface ImageProcessingEngine {
  name: string;
  process(
    sourceImageData: ImageData,
    settings: EnhancementSettings
  ): ImageData | Promise<ImageData>;
}

/* =========================================================================
 * PHASE 2: CONVERSION TYPES
 * ========================================================================= */

export type TargetImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

export interface ConvertOptions {
  format: TargetImageFormat;
  quality: number; // 0.1 to 1.0
  filename?: string;
}

export interface ConversionResult {
  blob: Blob;
  dataUrl: string;
  format: TargetImageFormat;
  size: number;
  width: number;
  height: number;
  filename: string;
}

/* =========================================================================
 * PHASE 3: CROPPER TYPES
 * ========================================================================= */

export interface CropRect {
  x: number; // X offset in pixels relative to natural image
  y: number; // Y offset in pixels relative to natural image
  width: number;
  height: number;
}

export interface CropTransform {
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface AspectRatioPreset {
  id: string;
  label: string;
  category: 'Standard' | 'Social';
  ratio?: number; // width / height, undefined for 'free'
  icon?: string;
  description?: string;
}

/* =========================================================================
 * PHASE 3: RESIZER TYPES
 * ========================================================================= */

export type ResizeUnit = 'pixels' | 'percentage';

export interface ResizeDimensions {
  width: number;
  height: number;
  lockAspectRatio: boolean;
}

export interface ResizePreset {
  id: string;
  name: string;
  category: 'Social' | 'Standard' | 'Scale';
  width?: number;
  height?: number;
  scalePercent?: number;
  description?: string;
}

