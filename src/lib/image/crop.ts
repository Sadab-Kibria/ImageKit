import { CropRect, CropTransform, AspectRatioPreset, TargetImageFormat } from './types';
import { canvasToBlob } from './export';

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: 'free', label: 'Freeform', category: 'Standard', description: 'Any custom dimensions' },
  { id: '1:1', label: '1 : 1', category: 'Standard', ratio: 1 / 1, description: 'Square format' },
  { id: '4:3', label: '4 : 3', category: 'Standard', ratio: 4 / 3, description: 'Classic photo' },
  { id: '3:4', label: '3 : 4', category: 'Standard', ratio: 3 / 4, description: 'Classic portrait' },
  { id: '16:9', label: '16 : 9', category: 'Standard', ratio: 16 / 9, description: 'Widescreen landscape' },
  { id: '9:16', label: '9 : 16', category: 'Standard', ratio: 9 / 16, description: 'Story / Reel vertical' },
  
  // Social Media Presets
  { id: 'ig-square', label: 'Instagram Square', category: 'Social', ratio: 1 / 1, description: '1:1 Grid post' },
  { id: 'ig-portrait', label: 'Instagram Portrait', category: 'Social', ratio: 4 / 5, description: '4:5 Feed post' },
  { id: 'ig-landscape', label: 'Instagram Landscape', category: 'Social', ratio: 1.91 / 1, description: '1.91:1 Feed post' },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', category: 'Social', ratio: 16 / 9, description: '16:9 Standard thumbnail' },
  { id: 'fb-cover', label: 'Facebook Cover', category: 'Social', ratio: 16 / 9, description: 'Page / Event cover' },
  { id: 'twitter-header', label: 'Twitter / X Header', category: 'Social', ratio: 3 / 1, description: '3:1 Profile header' },
  { id: 'linkedin-banner', label: 'LinkedIn Banner', category: 'Social', ratio: 4 / 1, description: '4:1 Profile banner' },
];

/**
 * Creates a default centered crop rectangle for a given image size and aspect ratio
 */
export function getDefaultCropRect(
  imageWidth: number,
  imageHeight: number,
  aspectRatio?: number
): CropRect {
  if (!aspectRatio) {
    // Freeform: 90% centered box
    const width = Math.round(imageWidth * 0.9);
    const height = Math.round(imageHeight * 0.9);
    const x = Math.round((imageWidth - width) / 2);
    const y = Math.round((imageHeight - height) / 2);
    return { x, y, width, height };
  }

  const imgRatio = imageWidth / imageHeight;
  let width: number;
  let height: number;

  if (imgRatio > aspectRatio) {
    // Image is wider than crop aspect ratio
    height = Math.round(imageHeight * 0.9);
    width = Math.round(height * aspectRatio);
  } else {
    // Image is taller than crop aspect ratio
    width = Math.round(imageWidth * 0.9);
    height = Math.round(width / aspectRatio);
  }

  const x = Math.round((imageWidth - width) / 2);
  const y = Math.round((imageHeight - height) / 2);

  return { x: Math.max(0, x), y: Math.max(0, y), width, height };
}

/**
 * Render cropped & transformed image onto a new full-resolution canvas
 */
export function renderCroppedCanvas(
  sourceImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  cropRect: CropRect,
  transform: CropTransform
): HTMLCanvasElement {
  // 1. Create temporary canvas with transformed full image
  const isRotated90or270 = transform.rotation === 90 || transform.rotation === 270;
  const transformedWidth = isRotated90or270 ? sourceImage.height : sourceImage.width;
  const transformedHeight = isRotated90or270 ? sourceImage.width : sourceImage.height;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = transformedWidth;
  tempCanvas.height = transformedHeight;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;

  tempCtx.save();
  // Translate to center for rotation and flipping
  tempCtx.translate(transformedWidth / 2, transformedHeight / 2);

  if (transform.rotation !== 0) {
    tempCtx.rotate((transform.rotation * Math.PI) / 180);
  }

  const scaleX = transform.flipHorizontal ? -1 : 1;
  const scaleY = transform.flipVertical ? -1 : 1;
  if (scaleX !== 1 || scaleY !== 1) {
    tempCtx.scale(scaleX, scaleY);
  }

  // Draw centered
  tempCtx.drawImage(
    sourceImage,
    -sourceImage.width / 2,
    -sourceImage.height / 2,
    sourceImage.width,
    sourceImage.height
  );
  tempCtx.restore();

  // 2. Extract crop area from transformed canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = Math.max(1, Math.round(cropRect.width));
  outCanvas.height = Math.max(1, Math.round(cropRect.height));
  const outCtx = outCanvas.getContext('2d')!;

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  outCtx.drawImage(
    tempCanvas,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    outCanvas.width,
    outCanvas.height
  );

  return outCanvas;
}

/**
 * Export cropped image as a downloadable file
 */
export async function exportCroppedImage(
  sourceImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  cropRect: CropRect,
  transform: CropTransform,
  format: TargetImageFormat = 'image/png',
  quality: number = 0.95
): Promise<Blob> {
  const canvas = renderCroppedCanvas(sourceImage, cropRect, transform);
  return await canvasToBlob(canvas, format, quality);
}
