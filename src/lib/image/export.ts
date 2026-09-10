import { CanvasImageProcessor } from './processor';
import { EnhancementSettings, ExportOptions, TargetImageFormat } from './types';

/**
 * Universal browser-native file download from Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Cleanup object URL safely
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
}

/**
 * Converts a Canvas or OffscreenCanvas to a Blob with fallback handling
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  format: TargetImageFormat = 'image/webp',
  quality: number = 0.92
): Promise<Blob> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // If browser doesn't support the requested format (e.g. AVIF canvas export), fallback to WebP
            if (format === 'image/avif') {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) resolve(fallbackBlob);
                  else reject(new Error('Failed to encode image canvas.'));
                },
                'image/webp',
                quality
              );
            } else {
              reject(new Error('Failed to generate image Blob.'));
            }
          }
        },
        format,
        quality
      );
    });
  } else {
    try {
      return await (canvas as OffscreenCanvas).convertToBlob({
        type: format,
        quality,
      });
    } catch {
      // Fallback for unsupported format in OffscreenCanvas
      return await (canvas as OffscreenCanvas).convertToBlob({
        type: 'image/webp',
        quality,
      });
    }
  }
}

/**
 * Renders full-resolution image applying the exact enhancement settings
 * and triggers a client-side file download.
 */
export async function exportEnhancedImage(
  sourceImage: HTMLImageElement | ImageBitmap,
  settings: EnhancementSettings,
  options: ExportOptions
): Promise<void> {
  const width = sourceImage.width;
  const height = sourceImage.height;

  // 1. Create full-resolution offscreen canvas
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }

  if (!ctx) {
    throw new Error('Failed to create canvas rendering context for export.');
  }

  // 2. Draw raw high-resolution source
  ctx.drawImage(sourceImage, 0, 0, width, height);
  const rawData = ctx.getImageData(0, 0, width, height);

  // 3. Process through Canvas Image Processor
  const processor = new CanvasImageProcessor();
  const processedData = processor.process(rawData, settings);

  // 4. Put processed pixels back to canvas
  ctx.putImageData(processedData, 0, 0);

  // 5. Convert to Blob
  const blob = await canvasToBlob(canvas, options.format as TargetImageFormat, options.quality);

  // 6. Generate sanitized file name
  const safeFilename = sanitizeFilename(options.filename, options.format, 'enhanced');

  // 7. Trigger browser-native local download
  downloadBlob(blob, safeFilename);
}

/**
 * Generates clean filename with appropriate extension.
 */
export function sanitizeFilename(
  originalName: string,
  format: string,
  suffix: string = 'output'
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '').trim() || 'image';
  const cleanBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');

  let extension = 'webp';
  if (format === 'image/png') extension = 'png';
  if (format === 'image/jpeg') extension = 'jpg';
  if (format === 'image/webp') extension = 'webp';
  if (format === 'image/avif') extension = 'avif';

  return `${cleanBase}-${suffix}.${extension}`;
}

/**
 * Format bytes into human readable format (KB / MB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

