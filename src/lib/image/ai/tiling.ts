export interface TileConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  // Scaled destination coordinates
  dstX: number;
  dstY: number;
  dstWidth: number;
  dstHeight: number;
  // Padded source box including overlap
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface TilePlan {
  tiles: TileConfig[];
  totalTiles: number;
  tileSize: number;
  overlap: number;
  scale: number;
  srcWidth: number;
  srcHeight: number;
  outWidth: number;
  outHeight: number;
}

/**
 * Computes an adaptive grid of overlapping tiles to process high-resolution images
 * safely within GPU/WASM memory limits.
 */
export function planTiling(
  width: number,
  height: number,
  scale: number,
  tileSize: number = 256,
  overlap: number = 16
): TilePlan {
  const tiles: TileConfig[] = [];
  const step = tileSize - overlap * 2;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      // Determine active box
      const curW = Math.min(step, width - x);
      const curH = Math.min(step, height - y);

      // Add overlap padding clamped to image bounds
      const left = Math.max(0, x - overlap);
      const top = Math.max(0, y - overlap);
      const right = Math.min(width, x + curW + overlap);
      const bottom = Math.min(height, y + curH + overlap);

      const srcTileW = right - left;
      const srcTileH = bottom - top;

      const padLeft = x - left;
      const padTop = y - top;
      const padRight = right - (x + curW);
      const padBottom = bottom - (y + curH);

      tiles.push({
        x: left,
        y: top,
        width: srcTileW,
        height: srcTileH,
        dstX: x * scale,
        dstY: y * scale,
        dstWidth: curW * scale,
        dstHeight: curH * scale,
        padLeft: padLeft * scale,
        padRight: padRight * scale,
        padTop: padTop * scale,
        padBottom: padBottom * scale,
      });
    }
  }

  return {
    tiles,
    totalTiles: tiles.length,
    tileSize,
    overlap,
    scale,
    srcWidth: width,
    srcHeight: height,
    outWidth: width * scale,
    outHeight: height * scale,
  };
}

/**
 * Crops the interior valid region of an upscaled tile (excluding the overlap padding)
 * and draws it directly to the output canvas context.
 */
export function stitchTile(
  outCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  tileCanvas: HTMLCanvasElement | OffscreenCanvas,
  tile: TileConfig
): void {
  // Tile interior rectangle in tileCanvas coordinates
  const sx = tile.padLeft;
  const sy = tile.padTop;
  const sw = tile.dstWidth;
  const sh = tile.dstHeight;

  outCtx.drawImage(
    tileCanvas,
    sx,
    sy,
    sw,
    sh,
    tile.dstX,
    tile.dstY,
    tile.dstWidth,
    tile.dstHeight
  );
}
