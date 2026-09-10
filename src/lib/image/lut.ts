/**
 * High-performance 1D Lookup Table (LUT) generators for tone & color transformations.
 * Precomputing values into 256-entry Uint8ClampedArrays enables 60fps real-time image manipulation.
 */

export interface ToneLUTs {
  rLUT: Uint8ClampedArray;
  gLUT: Uint8ClampedArray;
  bLUT: Uint8ClampedArray;
}

/**
 * Build combined RGB lookup tables for Brightness, Contrast, Exposure, Temperature, Highlights, and Shadows.
 */
export function createToneLUTs(
  brightness: number,    // -100 to 100
  contrast: number,      // -100 to 100
  exposure: number,      // -100 to 100
  temperature: number,   // -100 to 100
  highlights: number,    // -100 to 100
  shadows: number        // -100 to 100
): ToneLUTs {
  const rLUT = new Uint8ClampedArray(256);
  const gLUT = new Uint8ClampedArray(256);
  const bLUT = new Uint8ClampedArray(256);

  // Exposure factor: 2^(exposure / 50) -> range ~ 0.25 to 4.0
  const expFactor = Math.pow(2, exposure / 50);

  // Contrast factor: standard photographic contrast curve
  // factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const cVal = Math.min(99.9, Math.max(-99.9, contrast));
  const contrastFactor = (259 * (cVal + 100)) / (100 * (259 - cVal));

  // Brightness shift: normalized to -128 .. +128
  const brightShift = brightness * 1.28;

  // Temperature balance: shifts Red (warm) vs Blue (cool)
  const tempShift = temperature / 100; // -1 to 1
  const rTempMult = tempShift > 0 ? 1 + tempShift * 0.25 : 1 + tempShift * 0.1;
  const gTempMult = tempShift > 0 ? 1 + tempShift * 0.05 : 1;
  const bTempMult = tempShift < 0 ? 1 - tempShift * 0.35 : 1 - tempShift * 0.15;

  // Shadows & Highlights modifiers
  const shadowFactor = shadows / 100; // -1 to 1
  const highlightFactor = highlights / 100; // -1 to 1

  for (let i = 0; i < 256; i++) {
    // 1. Exposure
    let val = i * expFactor;

    // 2. Brightness
    val += brightShift;

    // 3. Contrast around midpoint 128
    val = 128 + (val - 128) * contrastFactor;

    // 4. Shadow / Highlight tone mapping
    const norm = Math.max(0, Math.min(255, val)) / 255;
    if (shadowFactor !== 0 && norm < 0.5) {
      // Lift or crush shadows in lower tonal range
      const shadowWeight = Math.pow(1 - norm * 2, 2);
      val += shadowFactor * shadowWeight * 40;
    }
    if (highlightFactor !== 0 && norm > 0.5) {
      // Recover or blow highlights in upper tonal range
      const highlightWeight = Math.pow((norm - 0.5) * 2, 2);
      val += highlightFactor * highlightWeight * 40;
    }

    // 5. Apply Temperature color multipliers to each channel
    rLUT[i] = Math.round(Math.min(255, Math.max(0, val * rTempMult)));
    gLUT[i] = Math.round(Math.min(255, Math.max(0, val * gTempMult)));
    bLUT[i] = Math.round(Math.min(255, Math.max(0, val * bTempMult)));
  }

  return { rLUT, gLUT, bLUT };
}
