import * as ort from 'onnxruntime-web';
import { AIEnhanceOptions } from './types';
import { getModelSession } from './model';
import { planTiling, stitchTile } from './tiling';
import { detectAICapabilities } from './capabilities';
import { getAIRateLimitState, recordAIEnhancementUsage } from './rate-limit';

/**
 * Converts standard RGBA ImageData to NCHW Float32 tensor [1, 3, height, width] in [0, 1] range.
 */
export function imageDataToNCHW(imageData: ImageData): ort.Tensor {
  const { width, height, data } = imageData;
  const channelSize = width * height;
  const floatData = new Float32Array(3 * channelSize);

  const rOffset = 0;
  const gOffset = channelSize;
  const bOffset = 2 * channelSize;

  for (let i = 0, p = 0; i < channelSize; i++, p += 4) {
    floatData[rOffset + i] = data[p] / 255.0;
    floatData[gOffset + i] = data[p + 1] / 255.0;
    floatData[bOffset + i] = data[p + 2] / 255.0;
  }

  return new ort.Tensor('float32', floatData, [1, 3, height, width]);
}

/**
 * Converts NCHW Float32 output tensor [1, 3, height, width] back to RGBA ImageData.
 */
export function nchwToImageData(
  tensor: ort.Tensor,
  width: number,
  height: number,
  alphaData?: Uint8ClampedArray
): ImageData {
  const floatData = tensor.data as Float32Array;
  const channelSize = width * height;
  const imgData = new ImageData(width, height);
  const data = imgData.data;

  const rOffset = 0;
  const gOffset = channelSize;
  const bOffset = 2 * channelSize;

  for (let i = 0, p = 0; i < channelSize; i++, p += 4) {
    // Clamp to [0, 255]
    const r = Math.min(255, Math.max(0, Math.round(floatData[rOffset + i] * 255.0)));
    const g = Math.min(255, Math.max(0, Math.round(floatData[gOffset + i] * 255.0)));
    const b = Math.min(255, Math.max(0, Math.round(floatData[bOffset + i] * 255.0)));
    const a = alphaData ? alphaData[p + 3] : 255;

    data[p] = r;
    data[p + 1] = g;
    data[p + 2] = b;
    data[p + 3] = a;
  }

  return imgData;
}

/**
 * Executes Real-ESRGAN super-resolution enhancement on an image or canvas.
 */
export async function runRealESRGAN(
  source: HTMLImageElement | HTMLCanvasElement,
  options: AIEnhanceOptions
): Promise<HTMLCanvasElement> {
  const { scale, onProgress, abortSignal } = options;

  // 1. Check daily rate limit
  const rateLimitState = getAIRateLimitState();
  if (rateLimitState.isLimitReached) {
    throw new Error(
      "You've reached today's AI enhancement limit (5/5). You can use AI enhancement again tomorrow."
    );
  }

  const srcWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const srcHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

  if (srcWidth <= 0 || srcHeight <= 0) {
    throw new Error('Invalid image dimensions for AI enhancement.');
  }

  // 2. Hardware capabilities & tile planning
  const capabilities = await detectAICapabilities();
  const tileSize = capabilities.recommendedTileSize;
  const overlap = 16;

  const tilePlan = planTiling(srcWidth, srcHeight, scale, tileSize, overlap);

  // 3. Load / download model session
  const session = await getModelSession(scale, onProgress, abortSignal);
  const inputName = session.inputNames[0] || 'input';
  const outputName = session.outputNames[0] || 'output';

  // 4. Consume daily credit after successful model initialization
  recordAIEnhancementUsage();

  // 5. Create source extraction canvas
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
  srcCtx.drawImage(source, 0, 0, srcWidth, srcHeight);

  // 6. Create destination output canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = tilePlan.outWidth;
  outCanvas.height = tilePlan.outHeight;
  const outCtx = outCanvas.getContext('2d')!;

  // 7. Process tiles sequentially
  const totalTiles = tilePlan.totalTiles;

  for (let i = 0; i < totalTiles; i++) {
    if (abortSignal?.aborted) {
      throw new DOMException('AI enhancement cancelled', 'AbortError');
    }

    const tile = tilePlan.tiles[i];

    onProgress?.({
      phase: 'processing',
      message: `Processing tile ${i + 1} of ${totalTiles}...`,
      progress: Math.round(((i + 0.5) / totalTiles) * 100),
      currentTile: i + 1,
      totalTiles,
    });

    // Extract tile from source image
    const tileRaw = srcCtx.getImageData(tile.x, tile.y, tile.width, tile.height);

    // Convert to NCHW float32 tensor
    const inTensor = imageDataToNCHW(tileRaw);

    // Run inference
    const feeds: Record<string, ort.Tensor> = { [inputName]: inTensor };
    const results = await session.run(feeds);
    const outTensor = results[outputName];

    if (!outTensor) {
      throw new Error(`Inference returned no output for tile ${i + 1}`);
    }

    const outTileW = tile.width * scale;
    const outTileH = tile.height * scale;

    // Convert output tensor back to RGBA ImageData
    const outTileData = nchwToImageData(outTensor, outTileW, outTileH);

    // Put tile on temporary canvas
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = outTileW;
    tileCanvas.height = outTileH;
    const tileCtx = tileCanvas.getContext('2d')!;
    tileCtx.putImageData(outTileData, 0, 0);

    // Stitch tile onto destination canvas
    stitchTile(outCtx, tileCanvas, tile);

    onProgress?.({
      phase: 'processing',
      message: `Completed tile ${i + 1} of ${totalTiles}`,
      progress: Math.round(((i + 1) / totalTiles) * 100),
      currentTile: i + 1,
      totalTiles,
    });

    // Yield control to UI thread between tiles
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.({
    phase: 'done',
    message: 'AI Enhancement Complete ✓',
    progress: 100,
  });

  return outCanvas;
}
