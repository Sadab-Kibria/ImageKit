import * as ort from 'onnxruntime-web';
import { RealESRGANScale, AIProgressUpdate } from './types';
import { detectAICapabilities } from './capabilities';

// Configure ONNX WebAssembly environment path
if (typeof window !== 'undefined') {
  try {
    ort.env.wasm.wasmPaths = '/ort/';
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);
    ort.env.wasm.simd = true;
  } catch (e) {
    console.warn('Failed to configure ort.env.wasm', e);
  }
}

// Active session cache
const sessionCache = new Map<RealESRGANScale, ort.InferenceSession>();
const CACHE_NAME = 'imagekit-ai-models-v1';

/**
 * Maps upscale scale factor to model asset URL.
 */
export function getModelUrl(scale: RealESRGANScale): string {
  return `/models/realesrgan-x${scale}.onnx`;
}

/**
 * Downloads the ONNX model with stream progress tracking and caches it in the Cache API.
 */
async function fetchModelWithProgress(
  url: string,
  onProgress?: (update: AIProgressUpdate) => void,
  abortSignal?: AbortSignal
): Promise<ArrayBuffer> {
  // Check browser Cache Storage first
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse && cachedResponse.ok) {
        onProgress?.({
          phase: 'downloading',
          message: 'Loaded model from browser cache',
          progress: 100,
        });
        return await cachedResponse.arrayBuffer();
      }
    } catch {
      // cache storage might not be available in incognito / private mode
    }
  }

  const response = await fetch(url, { signal: abortSignal });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to load Real-ESRGAN model from ${url} (status: ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  // Stream reader with progress tracking
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;

  while (true) {
    if (abortSignal?.aborted) {
      reader.cancel();
      throw new DOMException('Model download cancelled', 'AbortError');
    }

    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      loadedBytes += value.length;

      const progress = totalBytes > 0
        ? Math.min(99, Math.round((loadedBytes / totalBytes) * 100))
        : 50;

      onProgress?.({
        phase: 'downloading',
        message: `Downloading AI model (${(loadedBytes / (1024 * 1024)).toFixed(1)} MB${totalBytes > 0 ? ` / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB` : ''})...`,
        progress,
        downloadBytesLoaded: loadedBytes,
        downloadBytesTotal: totalBytes,
      });
    }
  }

  // Combine chunks into single ArrayBuffer
  const combined = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Store in Cache API for future use
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cacheResponse = new Response(combined.slice(), {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      await cache.put(url, cacheResponse);
    } catch {
      // ignore cache store failures
    }
  }

  return combined.buffer;
}

/**
 * Loads or retrieves an active ONNX inference session for the requested scale.
 */
export async function getModelSession(
  scale: RealESRGANScale,
  onProgress?: (update: AIProgressUpdate) => void,
  abortSignal?: AbortSignal
): Promise<ort.InferenceSession> {
  const existing = sessionCache.get(scale);
  if (existing) {
    return existing;
  }

  const modelUrl = getModelUrl(scale);

  onProgress?.({
    phase: 'downloading',
    message: 'Preparing AI enhancement model...',
    progress: 5,
  });

  const modelBuffer = await fetchModelWithProgress(modelUrl, onProgress, abortSignal);

  onProgress?.({
    phase: 'compiling',
    message: 'Compiling model shaders...',
    progress: 100,
  });

  const capabilities = await detectAICapabilities();

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: capabilities.hasWebGPU
      ? ['webgpu', 'wasm']
      : ['wasm'],
    graphOptimizationLevel: 'all',
  };

  try {
    const session = await ort.InferenceSession.create(modelBuffer, sessionOptions);
    sessionCache.set(scale, session);
    return session;
  } catch (err: unknown) {
    // If WebGPU EP fails (e.g. driver incompatibility), fallback gracefully to WASM
    if (capabilities.hasWebGPU) {
      console.warn('WebGPU execution provider initialization failed, falling back to WebAssembly:', err);
      const fallbackOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      };
      const fallbackSession = await ort.InferenceSession.create(modelBuffer, fallbackOptions);
      sessionCache.set(scale, fallbackSession);
      return fallbackSession;
    }
    throw err;
  }
}

/**
 * Frees memory of cached inference sessions.
 */
export async function releaseModelSessions(): Promise<void> {
  for (const session of sessionCache.values()) {
    try {
      await session.release();
    } catch {
      // ignore
    }
  }
  sessionCache.clear();
}
