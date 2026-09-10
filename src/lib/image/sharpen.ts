/**
 * High-performance 3x3 convolution unsharp mask kernel for image sharpening.
 * Enhances micro-contrast and fine edges without excessive noise amplification.
 */
export function applySharpen(
  srcData: Uint8ClampedArray,
  dstData: Uint8ClampedArray,
  width: number,
  height: number,
  sharpness: number // 0 to 100
): void {
  if (sharpness <= 0) {
    dstData.set(srcData);
    return;
  }

  // Weight factor: 0.0 to 1.2
  const amount = (sharpness / 100) * 1.2;
  const centerWeight = 1 + 4 * amount;
  const edgeWeight = -amount;

  const wMinus1 = width - 1;
  const hMinus1 = height - 1;

  for (let y = 0; y < height; y++) {
    const yTop = (y > 0 ? y - 1 : 0) * width;
    const yMid = y * width;
    const yBot = (y < hMinus1 ? y + 1 : hMinus1) * width;

    for (let x = 0; x < width; x++) {
      const xLeft = x > 0 ? x - 1 : 0;
      const xRight = x < wMinus1 ? x + 1 : wMinus1;

      const idxCenter = (yMid + x) * 4;
      const idxTop = (yTop + x) * 4;
      const idxBottom = (yBot + x) * 4;
      const idxLeft = (yMid + xLeft) * 4;
      const idxRight = (yMid + xRight) * 4;

      // Red
      const r =
        srcData[idxCenter] * centerWeight +
        (srcData[idxTop] +
          srcData[idxBottom] +
          srcData[idxLeft] +
          srcData[idxRight]) *
          edgeWeight;

      // Green
      const g =
        srcData[idxCenter + 1] * centerWeight +
        (srcData[idxTop + 1] +
          srcData[idxBottom + 1] +
          srcData[idxLeft + 1] +
          srcData[idxRight + 1]) *
          edgeWeight;

      // Blue
      const b =
        srcData[idxCenter + 2] * centerWeight +
        (srcData[idxTop + 2] +
          srcData[idxBottom + 2] +
          srcData[idxLeft + 2] +
          srcData[idxRight + 2]) *
          edgeWeight;

      dstData[idxCenter] = Math.min(255, Math.max(0, r));
      dstData[idxCenter + 1] = Math.min(255, Math.max(0, g));
      dstData[idxCenter + 2] = Math.min(255, Math.max(0, b));
      dstData[idxCenter + 3] = srcData[idxCenter + 3]; // Preserve alpha
    }
  }
}
