# ImageKit — Browser-Native AI Image Toolkit

A 100% private, client-side, browser-native image editing and super-resolution suite. All processing occurs locally on your device with **zero server uploads, zero external API calls, and zero tracking**.

---

## Features

### 1. AI Image Enhancement (Phase 4 — Real-ESRGAN)
- **Neural Super-Resolution**: Upscale and restore fine details using **Real-ESRGAN** ($2\times$ and $4\times$).
- **Browser-Only Inference**: Powered by `onnxruntime-web` running directly inside the browser using **WebGPU** hardware shader acceleration with multi-threaded **WebAssembly SIMD** fallback.
- **On-Demand Model Loading & Caching**: Models are downloaded only when requested, displaying byte-level progress, and cached in the browser Cache Storage for instant subsequent runs.
- **Adaptive Tiled Inference**: Automatically partitions large images into overlapping tiles with feathering seams to prevent browser out-of-memory crashes on high-resolution photos.
- **Interactive Before/After Comparison**: Draggable comparison slider with keyboard, mouse, and touch support.
- **Client-Side Daily Rate Limit**: 5 AI enhancements per device per calendar day stored locally in `localStorage` (normal adjustments and editing tools remain unlimited).

### 2. Basic Image Enhancement
- Real-time 60fps GPU/Canvas adjustments for Brightness, Contrast, Saturation, Exposure, Shadows, Highlights, Temperature/Warmth, Vignette, Grayscale, and Sepia.
- 3×3 unsharp mask micro-contrast kernel sharpening.
- Edge-preserving bilateral noise smoothing and 2-pass box blur.
- Curated 1-click presets, undo/redo history, and full keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`).

### 3. Image Converter
- Client-side format conversion to **WebP**, **PNG**, **JPEG**, and **AVIF**.
- Live compression size savings calculator and quality controls.

### 4. Image Cropper
- Visual freeform cropping and standard aspect ratio presets (1:1, 4:3, 16:9, 9:16, 3:2, 2:3).
- Social media framing presets (Instagram, YouTube, Twitter/X, LinkedIn, TikTok).
- 90° rotation and horizontal/vertical flipping.

### 5. Image Resizer
- Exact pixel dimension scaling with proportional aspect ratio lock.
- Stepped anti-aliased downscaling and smooth bicubic upscaling.
- Percentage scaling presets ($25\%$, $50\%$, $75\%$, $100\%$) and social media size templates.

---

## Real-ESRGAN Technical Architecture

```text
User Image (Local Device)
       ↓
Browser Canvas
       ↓
Adaptive Tiling Engine (Padded Overlap)
       ↓
ONNX Runtime Web (WebGPU / WASM SIMD)
       ↓
Real-ESRGAN Model (realesrgan-x2.onnx / realesrgan-x4.onnx)
       ↓
Tile Reconstructor & Seam Blending
       ↓
High-Resolution Output Canvas
       ↓
Before / After Preview & Full-Fidelity Export
```

### Models & Format
- **Model**: `SRVGGNetCompact` (Real-ESRGAN general x4v3 / compact architecture).
- **Format**: Self-contained ONNX (Opset 18), float32 tensor inputs normalized to $[0.0, 1.0]$.
- **Sizes**:
  - `realesrgan-x2.onnx`: ~4.86 MB
  - `realesrgan-x4.onnx`: ~4.94 MB
- **Storage**: Served statically from `/models/` and cached in the browser's `CacheStorage`.

### WebGPU Acceleration & Fallback
- Detects `navigator.gpu` at runtime.
- If WebGPU is supported, passes `executionProviders: ['webgpu', 'wasm']` to compile GPU compute shaders.
- If WebGPU is unavailable or disabled, gracefully falls back to multi-threaded WebAssembly SIMD CPU execution.

### Client-Side Rate Limiting
- **Quota**: 5 AI enhancements per device per calendar day.
- **Storage**: Stored in `localStorage` as `{ date: 'YYYY-MM-DD', count: N }`.
- **Note**: This is a client-side quota designed for demonstration and privacy-first local usage. Clearing browser storage or switching browsers resets the counter. All standard editing features (Crop, Resize, Convert, Sliders) remain completely unlimited.

---

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```
