/**
 * Edge-preserving spatial bilateral/adaptive denoise filter and fast separable box blur.
 * Bilateral filter smooths high-frequency sensor noise while preserving sharp boundaries.
 */

/**
 * Adaptive edge-preserving denoise filter.
 */
export function applyDenoise(
  srcData: Uint8ClampedArray,
  dstData: Uint8ClampedArray,
  width: number,
  height: number,
  denoise: number // 0 to 100
): void {
  if (denoise <= 0) {
    dstData.set(srcData);
    return;
  }

  // Radius: 1 for mild/medium denoise (3x3), 2 for heavy denoise (5x5)
  const radius = denoise > 50 ? 2 : 1;
  // Spatial sigma & Range sigma (color similarity threshold)
  const colorSigma = (100 - denoise * 0.7) + 5; // Smaller sigma = stricter edge preservation
  const colorSigmaSq2 = 2 * colorSigma * colorSigma;

  const wMinus1 = width - 1;
  const hMinus1 = height - 1;

  for (let y = 0; y < height; y++) {
    const yMid = y * width;
    for (let x = 0; x < width; x++) {
      const centerIdx = (yMid + x) * 4;
      const cR = srcData[centerIdx];
      const cG = srcData[centerIdx + 1];
      const cB = srcData[centerIdx + 2];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let totalWeight = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        const py = Math.min(hMinus1, Math.max(0, y + dy));
        const pyOffset = py * width;

        for (let dx = -radius; dx <= radius; dx++) {
          const px = Math.min(wMinus1, Math.max(0, x + dx));
          const pIdx = (pyOffset + px) * 4;

          const nR = srcData[pIdx];
          const nG = srcData[pIdx + 1];
          const nB = srcData[pIdx + 2];

          // Photometric color difference squared
          const dR = nR - cR;
          const dG = nG - cG;
          const dB = nB - cB;
          const colorDistSq = dR * dR + dG * dG + dB * dB;

          // Spatial distance squared
          const spatialDistSq = dx * dx + dy * dy;

          // Bilateral Gaussian weight
          const weight = Math.exp(-colorDistSq / colorSigmaSq2 - spatialDistSq / 4);

          sumR += nR * weight;
          sumG += nG * weight;
          sumB += nB * weight;
          totalWeight += weight;
        }
      }

      dstData[centerIdx] = Math.round(sumR / totalWeight);
      dstData[centerIdx + 1] = Math.round(sumG / totalWeight);
      dstData[centerIdx + 2] = Math.round(sumB / totalWeight);
      dstData[centerIdx + 3] = srcData[centerIdx + 3];
    }
  }
}

/**
 * Fast separable 2-pass box blur.
 */
export function applyBlur(
  srcData: Uint8ClampedArray,
  dstData: Uint8ClampedArray,
  width: number,
  height: number,
  blurAmount: number // 0 to 100
): void {
  if (blurAmount <= 0) {
    dstData.set(srcData);
    return;
  }

  // Radius scale: 1 to 15 pixels based on blurAmount
  const radius = Math.max(1, Math.round((blurAmount / 100) * 12));
  const temp = new Uint8ClampedArray(srcData.length);

  // Horizontal pass: srcData -> temp
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;

      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(width - 1, Math.max(0, x + k));
        const idx = (rowOffset + px) * 4;
        r += srcData[idx];
        g += srcData[idx + 1];
        b += srcData[idx + 2];
        a += srcData[idx + 3];
        count++;
      }

      const outIdx = (rowOffset + x) * 4;
      temp[outIdx] = r / count;
      temp[outIdx + 1] = g / count;
      temp[outIdx + 2] = b / count;
      temp[outIdx + 3] = a / count;
    }
  }

  // Vertical pass: temp -> dstData
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;

      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(height - 1, Math.max(0, y + k));
        const idx = (py * width + x) * 4;
        r += temp[idx];
        g += temp[idx + 1];
        b += temp[idx + 2];
        a += temp[idx + 3];
        count++;
      }

      const outIdx = (y * width + x) * 4;
      dstData[outIdx] = r / count;
      dstData[outIdx + 1] = g / count;
      dstData[outIdx + 2] = b / count;
      dstData[outIdx + 3] = a / count;
    }
  }
}
