import { TargetImageFormat, ConvertOptions, ConversionResult } from './types';
import { canvasToBlob, sanitizeFilename } from './export';

export const SUPPORTED_TARGET_FORMATS: {
  format: TargetImageFormat;
  label: string;
  extension: string;
  mimeType: string;
  supportsQuality: boolean;
  defaultQuality: number;
  description: string;
}[] = [
  {
    format: 'image/webp',
    label: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    supportsQuality: true,
    defaultQuality: 0.90,
    description: 'Modern standard with superior compression and transparency support',
  },
  {
    format: 'image/jpeg',
    label: 'JPG / JPEG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    supportsQuality: true,
    defaultQuality: 0.88,
    description: 'Universal photo format compatible with every device and platform',
  },
  {
    format: 'image/png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    supportsQuality: false,
    defaultQuality: 1.0,
    description: 'Lossless format preserving crisp edges, text, and transparent backgrounds',
  },
  {
    format: 'image/avif',
    label: 'AVIF',
    extension: 'avif',
    mimeType: 'image/avif',
    supportsQuality: true,
    defaultQuality: 0.85,
    description: 'Next-gen format providing ultra-high compression efficiency',
  },
];

/**
 * Checks which image formats the current browser can export to canvas
 */
export async function checkBrowserSupportedFormats(): Promise<Record<TargetImageFormat, boolean>> {
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 1;
  testCanvas.height = 1;

  const results: Record<TargetImageFormat, boolean> = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/avif': false,
  };

  // Test WebP
  try {
    const webpData = testCanvas.toDataURL('image/webp');
    results['image/webp'] = webpData.startsWith('data:image/webp');
  } catch {
    results['image/webp'] = false;
  }

  // Test AVIF
  try {
    const avifData = testCanvas.toDataURL('image/avif');
    results['image/avif'] = avifData.startsWith('data:image/avif');
  } catch {
    results['image/avif'] = false;
  }

  return results;
}

/**
 * Convert an image locally via Canvas into the requested format and quality
 */
export async function convertImage(
  source: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  options: ConvertOptions,
  originalFilename: string = 'image'
): Promise<ConversionResult> {
  const width = source.width;
  const height = source.height;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    throw new Error('Failed to create canvas 2D rendering context for conversion.');
  }

  // If converting to JPEG, fill background with white to avoid black transparency artifacts
  if (options.format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(source, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, options.format, options.quality);
  const dataUrl = URL.createObjectURL(blob);
  const safeFilename = sanitizeFilename(originalFilename, options.format, 'converted');

  return {
    blob,
    dataUrl,
    format: options.format,
    size: blob.size,
    width,
    height,
    filename: safeFilename,
  };
}
