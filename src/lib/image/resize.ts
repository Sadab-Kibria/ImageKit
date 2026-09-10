import { ResizePreset, TargetImageFormat } from './types';
import { canvasToBlob } from './export';

export const RESIZE_PRESETS: ResizePreset[] = [
  // Percentage Scaling
  { id: 'scale-25', name: '25%', category: 'Scale', scalePercent: 25, description: 'Quarter resolution' },
  { id: 'scale-50', name: '50%', category: 'Scale', scalePercent: 50, description: 'Half resolution' },
  { id: 'scale-75', name: '75%', category: 'Scale', scalePercent: 75, description: 'Three quarter resolution' },
  { id: 'scale-100', name: '100%', category: 'Scale', scalePercent: 100, description: 'Original size' },
  { id: 'scale-150', name: '150%', category: 'Scale', scalePercent: 150, description: '1.5x Upscale' },
  { id: 'scale-200', name: '200%', category: 'Scale', scalePercent: 200, description: '2x Upscale' },

  // Social Media Presets
  { id: 'ig-post', name: 'Instagram Post (1080×1080)', category: 'Social', width: 1080, height: 1080, description: 'Standard 1:1 square' },
  { id: 'ig-story', name: 'Instagram Story / Reel (1080×1920)', category: 'Social', width: 1080, height: 1920, description: '9:16 Full screen vertical' },
  { id: 'yt-thumb', name: 'YouTube Thumbnail (1280×720)', category: 'Social', width: 1280, height: 720, description: 'HD 16:9 thumbnail' },
  { id: 'fb-post', name: 'Facebook Feed (1200×630)', category: 'Social', width: 1200, height: 630, description: 'Landscape feed post' },
  { id: 'x-post', name: 'Twitter / X Post (1200×675)', category: 'Social', width: 1200, height: 675, description: '16:9 Standard tweet post' },
  { id: 'li-banner', name: 'LinkedIn Banner (1584×396)', category: 'Social', width: 1584, height: 396, description: '4:1 Profile banner' },

  // Standard Screen Resolutions
  { id: 'fhd', name: 'Full HD (1920×1080)', category: 'Standard', width: 1920, height: 1080, description: '1080p Standard widescreen' },
  { id: 'hd', name: 'HD (1280×720)', category: 'Standard', width: 1280, height: 720, description: '720p Widescreen' },
  { id: '4k', name: '4K Ultra HD (3840×2160)', category: 'Standard', width: 3840, height: 2160, description: '2160p 4K display' },
  { id: 'svga', name: 'Web Standard (800×600)', category: 'Standard', width: 800, height: 600, description: 'Compact web asset' },
];

/**
 * Calculates new height when width changes with locked aspect ratio
 */
export function calculateHeightFromWidth(newWidth: number, aspectRatio: number): number {
  return Math.max(1, Math.round(newWidth / aspectRatio));
}

/**
 * Calculates new width when height changes with locked aspect ratio
 */
export function calculateWidthFromHeight(newHeight: number, aspectRatio: number): number {
  return Math.max(1, Math.round(newHeight * aspectRatio));
}

/**
 * Calculates dimensions from scale percentage
 */
export function calculateDimensionsFromScale(
  origWidth: number,
  origHeight: number,
  scalePercent: number
): { width: number; height: number } {
  const factor = scalePercent / 100;
  return {
    width: Math.max(1, Math.round(origWidth * factor)),
    height: Math.max(1, Math.round(origHeight * factor)),
  };
}

/**
 * High-quality canvas resizing using stepped downsampling if scaling down significantly (> 50%)
 */
export function renderResizedCanvas(
  sourceImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const currentWidth = sourceImage.width;
  const currentHeight = sourceImage.height;

  // If dimensions are identical, just return a cloned canvas
  if (currentWidth === targetWidth && currentHeight === targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(sourceImage, 0, 0);
    return canvas;
  }

  // Stepped downsampling for high-quality downscaling
  let workingCanvas = document.createElement('canvas');
  workingCanvas.width = currentWidth;
  workingCanvas.height = currentHeight;
  const workingCtx = workingCanvas.getContext('2d')!;
  workingCtx.drawImage(sourceImage, 0, 0);

  let curW = currentWidth;
  let curH = currentHeight;

  // Step down by halves if scaling down by more than 2x
  while (curW / 2 > targetWidth && curH / 2 > targetHeight) {
    curW = Math.floor(curW / 2);
    curH = Math.floor(curH / 2);

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = curW;
    stepCanvas.height = curH;
    const stepCtx = stepCanvas.getContext('2d')!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(workingCanvas, 0, 0, curW, curH);

    workingCanvas = stepCanvas;
  }

  // Final resize step
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(workingCanvas, 0, 0, targetWidth, targetHeight);

  return finalCanvas;
}

/**
 * Export resized image to a Blob
 */
export async function exportResizedImage(
  sourceImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  format: TargetImageFormat = 'image/png',
  quality: number = 0.92
): Promise<Blob> {
  const canvas = renderResizedCanvas(sourceImage, targetWidth, targetHeight);
  return await canvasToBlob(canvas, format, quality);
}
