import { applyBlur, applyDenoise } from './denoise';
import { applyColorTransforms } from './filters';
import { createToneLUTs } from './lut';
import { applySharpen } from './sharpen';
import { EnhancementSettings, ImageProcessingEngine } from './types';

/**
 * Canvas2D & ImageData Processing Engine (Phase 1 Baseline)
 * Architecture allows plugging in WebGPU / Neural Super-Resolution Engines in Phase 2
 * without touching UI components.
 */
export class CanvasImageProcessor implements ImageProcessingEngine {
  name = 'Canvas2D-LUT-Pipeline';

  /**
   * Process source ImageData with the provided enhancement settings.
   * Returns a newly allocated ImageData with all filters applied.
   */
  process(
    sourceImageData: ImageData,
    settings: EnhancementSettings
  ): ImageData {
    const { width, height } = sourceImageData;
    const src = sourceImageData.data;

    // Buffer 1 for color transformed output
    const buf1 = new Uint8ClampedArray(src.length);

    // 1. Precompute Tone LUTs
    const luts = createToneLUTs(
      settings.brightness,
      settings.contrast,
      settings.exposure,
      settings.temperature,
      settings.highlights,
      settings.shadows
    );

    // 2. Color & Tone transformations (LUTs, Saturation, Grayscale, Sepia, Vignette)
    applyColorTransforms(
      src,
      buf1,
      width,
      height,
      luts,
      settings.saturation,
      settings.grayscale,
      settings.sepia,
      settings.vignette
    );

    let currentBuffer = buf1;

    // 3. Denoise (Edge-preserving bilateral smoothing)
    if (settings.denoise > 0) {
      const bufDenoise = new Uint8ClampedArray(src.length);
      applyDenoise(currentBuffer, bufDenoise, width, height, settings.denoise);
      currentBuffer = bufDenoise;
    }

    // 4. Blur (Separable box blur)
    if (settings.blur > 0) {
      const bufBlur = new Uint8ClampedArray(src.length);
      applyBlur(currentBuffer, bufBlur, width, height, settings.blur);
      currentBuffer = bufBlur;
    }

    // 5. Sharpen (3x3 Unsharp Mask Convolution)
    if (settings.sharpness > 0) {
      const bufSharpen = new Uint8ClampedArray(src.length);
      applySharpen(currentBuffer, bufSharpen, width, height, settings.sharpness);
      currentBuffer = bufSharpen;
    }

    return new ImageData(currentBuffer, width, height);
  }
}

// Global default processor instance
export const defaultImageProcessor = new CanvasImageProcessor();

/**
 * Utility to create a downscaled preview canvas while maintaining aspect ratio.
 */
export function createPreviewCanvas(
  source: HTMLImageElement | ImageBitmap,
  maxDimension: number = 1400
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number; scale: number } {
  let { width, height } = source;
  let scale = 1;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      scale = maxDimension / width;
      width = maxDimension;
      height = Math.round(source.height * scale);
    } else {
      scale = maxDimension / height;
      height = maxDimension;
      width = Math.round(source.width * scale);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create Canvas 2D context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  return { canvas, ctx, width, height, scale };
}
