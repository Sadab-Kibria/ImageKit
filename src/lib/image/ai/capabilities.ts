import { AICapabilities } from './types';

let cachedCapabilities: AICapabilities | null = null;

/**
 * Detects browser and hardware AI inference acceleration capabilities.
 */
export async function detectAICapabilities(): Promise<AICapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  let hasWebGPU = false;
  let deviceDescription = 'Standard Browser Runtime';

  if (typeof navigator !== 'undefined') {
    const nav = navigator as unknown as {
      gpu?: {
        requestAdapter: (options?: { powerPreference?: string }) => Promise<unknown>;
      };
    };
    if (nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
      try {
        const adapter = await nav.gpu.requestAdapter({
          powerPreference: 'high-performance',
        });
        if (adapter) {
          hasWebGPU = true;
          deviceDescription = 'WebGPU Hardware Accelerated';
        }
      } catch {
        hasWebGPU = false;
      }
    }
  }

  // WebAssembly SIMD detection
  let hasWasmSIMD = false;
  try {
    // 0x00, 0x61, 0x73, 0x6d (magic), 0x01, 0x00, 0x00, 0x00 (version)
    // with i32x4.splat opcode 0xfd, 0x0c
    const simdTest = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
      0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
      0x41, 0x00, 0xfd, 0x0c, 0x00, 0x0b
    ]);
    hasWasmSIMD = WebAssembly.validate(simdTest);
  } catch {
    hasWasmSIMD = false;
  }

  // WebAssembly SharedArrayBuffer / Threads detection
  const hasWasmThreads = typeof SharedArrayBuffer !== 'undefined';

  if (!hasWebGPU) {
    deviceDescription = hasWasmSIMD
      ? 'WebAssembly SIMD (CPU Optimized)'
      : 'WebAssembly (Standard CPU)';
  }

  const capabilities: AICapabilities = {
    hasWebGPU,
    hasWasmSIMD,
    hasWasmThreads,
    recommendedBackend: hasWebGPU ? 'webgpu' : 'wasm',
    maxSafeDimension: hasWebGPU ? 4096 : 2048,
    recommendedTileSize: hasWebGPU ? 256 : 128,
    deviceDescription,
  };

  cachedCapabilities = capabilities;
  return capabilities;
}
