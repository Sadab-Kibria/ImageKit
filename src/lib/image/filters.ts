import { ToneLUTs } from './lut';

/**
 * Apply fast single-pass color transformation combining Tone LUTs, Saturation, Grayscale, Sepia, and Vignette.
 */
export function applyColorTransforms(
  srcData: Uint8ClampedArray,
  dstData: Uint8ClampedArray,
  width: number,
  height: number,
  luts: ToneLUTs,
  saturation: number, // -100 to +100
  grayscale: number,  // 0 to 100
  sepia: number,      // 0 to 100
  vignette: number    // 0 to 100
): void {
  const { rLUT, gLUT, bLUT } = luts;
  const satMult = saturation >= 0 ? 1 + saturation / 100 * 1.5 : 1 + saturation / 100;
  const grayRatio = grayscale / 100;
  const sepiaRatio = sepia / 100;
  const hasVignette = vignette > 0;

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const vigIntensity = (vignette / 100) * 1.2;

  const totalPixels = width * height;
  let ptr = 0;

  for (let i = 0; i < totalPixels; i++) {
    // 1. Fetch raw channels & apply precomputed Tone LUTs
    let r = rLUT[srcData[ptr]];
    let g = gLUT[srcData[ptr + 1]];
    let b = bLUT[srcData[ptr + 2]];
    const a = srcData[ptr + 3];

    // Standard ITU-R BT.709 Luminance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // 2. Saturation
    if (saturation !== 0) {
      r = lum + (r - lum) * satMult;
      g = lum + (g - lum) * satMult;
      b = lum + (b - lum) * satMult;
    }

    // 3. Grayscale blend
    if (grayRatio > 0) {
      r = r * (1 - grayRatio) + lum * grayRatio;
      g = g * (1 - grayRatio) + lum * grayRatio;
      b = b * (1 - grayRatio) + lum * grayRatio;
    }

    // 4. Sepia matrix blend
    if (sepiaRatio > 0) {
      const sr = (r * 0.393) + (g * 0.769) + (b * 0.189);
      const sg = (r * 0.349) + (g * 0.686) + (b * 0.168);
      const sb = (r * 0.272) + (g * 0.534) + (b * 0.131);

      r = r * (1 - sepiaRatio) + sr * sepiaRatio;
      g = g * (1 - sepiaRatio) + sg * sepiaRatio;
      b = b * (1 - sepiaRatio) + sb * sepiaRatio;
    }

    // 5. Vignette shading
    if (hasVignette) {
      const px = i % width;
      const py = Math.floor(i / width);
      const dx = px - centerX;
      const dy = py - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      // Smooth falloff curve
      const vigFalloff = Math.max(0, 1 - Math.pow(dist, 2) * vigIntensity);
      r *= vigFalloff;
      g *= vigFalloff;
      b *= vigFalloff;
    }

    // Clamp values and store
    dstData[ptr] = Math.min(255, Math.max(0, r));
    dstData[ptr + 1] = Math.min(255, Math.max(0, g));
    dstData[ptr + 2] = Math.min(255, Math.max(0, b));
    dstData[ptr + 3] = a;

    ptr += 4;
  }
}
