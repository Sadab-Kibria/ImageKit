'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CropRect,
  CropTransform,
  ImageMetadata,
  TargetImageFormat,
  AspectRatioPreset,
} from '../lib/image/types';
import {
  ASPECT_RATIO_PRESETS,
  getDefaultCropRect,
  renderCroppedCanvas,
} from '../lib/image/crop';
import { downloadBlob, sanitizeFilename, canvasToBlob } from '../lib/image/export';
import {
  Crop as CropIcon,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Download,
  Check,
  Share2,
} from 'lucide-react';

interface CropperWorkspaceProps {
  sourceImage: HTMLImageElement;
  metadata: ImageMetadata;
  onReset: () => void;
}

type HandleType =
  | 'move'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right';

export const CropperWorkspace: React.FC<CropperWorkspaceProps> = ({
  sourceImage,
  metadata,
  onReset,
}) => {
  // Transform state (Rotation & Flips)
  const [transform, setTransform] = useState<CropTransform>({
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  });

  // Aspect ratio preset
  const [activePresetId, setActivePresetId] = useState<string>('free');

  // Transformed image dimensions
  const isRotated90 = transform.rotation === 90 || transform.rotation === 270;
  const currentImgWidth = isRotated90 ? metadata.height : metadata.width;
  const currentImgHeight = isRotated90 ? metadata.width : metadata.height;

  // Natural pixel crop coordinates
  const [cropRect, setCropRect] = useState<CropRect>(() =>
    getDefaultCropRect(currentImgWidth, currentImgHeight)
  );

  // Container & viewport scaling ref
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scaleFactor, setScaleFactor] = useState<number>(1); // displayed px / natural px

  // Dragging state
  const isInteractingRef = useRef(false);
  const activeHandleRef = useRef<HandleType | null>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const startCropRectRef = useRef<CropRect>(cropRect);

  // Export options
  const [exportFormat, setExportFormat] = useState<TargetImageFormat>('image/png');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  // Active aspect ratio value
  const activeRatio = ASPECT_RATIO_PRESETS.find((p) => p.id === activePresetId)?.ratio;

  // Recalculate crop rect when aspect ratio preset changes
  const handleSelectPreset = (preset: AspectRatioPreset) => {
    setActivePresetId(preset.id);
    const newRect = getDefaultCropRect(currentImgWidth, currentImgHeight, preset.ratio);
    setCropRect(newRect);
  };

  // Rotation handler
  const handleRotate = (direction: 'cw' | 'ccw') => {
    setTransform((prev) => {
      let newRot = prev.rotation + (direction === 'cw' ? 90 : -90);
      if (newRot < 0) newRot = 270;
      if (newRot >= 360) newRot = 0;
      const nextRot = newRot as 0 | 90 | 180 | 270;

      // When rotating, recalculate crop bounds to fit new orientation
      const newWidth = nextRot === 90 || nextRot === 270 ? metadata.height : metadata.width;
      const newHeight = nextRot === 90 || nextRot === 270 ? metadata.width : metadata.height;
      setCropRect(getDefaultCropRect(newWidth, newHeight, activeRatio));

      return {
        ...prev,
        rotation: nextRot,
      };
    });
  };

  // Flip handlers
  const handleFlipH = () => {
    setTransform((prev) => ({ ...prev, flipHorizontal: !prev.flipHorizontal }));
  };

  const handleFlipV = () => {
    setTransform((prev) => ({ ...prev, flipVertical: !prev.flipVertical }));
  };

  // Reset transforms & crop
  const handleResetTransforms = () => {
    setTransform({ rotation: 0, flipHorizontal: false, flipVertical: false });
    setActivePresetId('free');
    setCropRect(getDefaultCropRect(metadata.width, metadata.height));
  };

  // Render base preview canvas when transforms or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    canvas.width = currentImgWidth;
    canvas.height = currentImgHeight;
    const ctx = canvas.getContext('2d')!;

    ctx.save();
    ctx.translate(currentImgWidth / 2, currentImgHeight / 2);

    if (transform.rotation !== 0) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }

    const scaleX = transform.flipHorizontal ? -1 : 1;
    const scaleY = transform.flipVertical ? -1 : 1;
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }

    ctx.drawImage(
      sourceImage,
      -sourceImage.width / 2,
      -sourceImage.height / 2,
      sourceImage.width,
      sourceImage.height
    );
    ctx.restore();
  }, [sourceImage, transform, currentImgWidth, currentImgHeight]);

  // Compute scale factor between displayed canvas and natural resolution
  const updateScaleFactor = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvasEl = canvasRef.current;
    const rect = canvasEl.getBoundingClientRect();
    if (rect.width > 0 && currentImgWidth > 0) {
      setScaleFactor(rect.width / currentImgWidth);
    }
  }, [currentImgWidth]);

  useEffect(() => {
    updateScaleFactor();
    window.addEventListener('resize', updateScaleFactor);
    return () => window.removeEventListener('resize', updateScaleFactor);
  }, [updateScaleFactor, currentImgWidth, currentImgHeight]);

  // Handle Drag & Resize Interactions (Mouse and Touch)
  const handlePointerDown = (e: React.PointerEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();

    isInteractingRef.current = true;
    activeHandleRef.current = handle;
    dragStartPosRef.current = { clientX: e.clientX, clientY: e.clientY };
    startCropRectRef.current = { ...cropRect };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!isInteractingRef.current || !activeHandleRef.current || scaleFactor <= 0) return;

      const deltaScreenX = moveEvt.clientX - dragStartPosRef.current.clientX;
      const deltaScreenY = moveEvt.clientY - dragStartPosRef.current.clientY;

      const deltaX = deltaScreenX / scaleFactor;
      const deltaY = deltaScreenY / scaleFactor;

      const start = startCropRectRef.current;
      const minDimension = 20;

      let nextX = start.x;
      let nextY = start.y;
      let nextW = start.width;
      let nextH = start.height;

      const handleType = activeHandleRef.current;

      if (handleType === 'move') {
        nextX = Math.max(0, Math.min(currentImgWidth - start.width, start.x + deltaX));
        nextY = Math.max(0, Math.min(currentImgHeight - start.height, start.y + deltaY));
      } else {
        // Handle resizing from handles
        if (handleType.includes('right')) {
          nextW = Math.max(minDimension, Math.min(currentImgWidth - start.x, start.width + deltaX));
        }
        if (handleType.includes('left')) {
          const maxLeftDelta = start.width - minDimension;
          const clampedDeltaX = Math.min(maxLeftDelta, Math.max(-start.x, deltaX));
          nextX = start.x + clampedDeltaX;
          nextW = start.width - clampedDeltaX;
        }
        if (handleType.includes('bottom')) {
          nextH = Math.max(minDimension, Math.min(currentImgHeight - start.y, start.height + deltaY));
        }
        if (handleType.includes('top')) {
          const maxTopDelta = start.height - minDimension;
          const clampedDeltaY = Math.min(maxTopDelta, Math.max(-start.y, deltaY));
          nextY = start.y + clampedDeltaY;
          nextH = start.height - clampedDeltaY;
        }

        // Apply aspect ratio constraints if locked
        if (activeRatio) {
          if (handleType === 'left' || handleType === 'right') {
            nextH = nextW / activeRatio;
            if (nextY + nextH > currentImgHeight) {
              nextH = currentImgHeight - nextY;
              nextW = nextH * activeRatio;
            }
          } else if (handleType === 'top' || handleType === 'bottom') {
            nextW = nextH * activeRatio;
            if (nextX + nextW > currentImgWidth) {
              nextW = currentImgWidth - nextX;
              nextH = nextW / activeRatio;
            }
          } else {
            // Corner handles
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              nextH = nextW / activeRatio;
            } else {
              nextW = nextH * activeRatio;
            }

            if (nextX + nextW > currentImgWidth) {
              nextW = currentImgWidth - nextX;
              nextH = nextW / activeRatio;
            }
            if (nextY + nextH > currentImgHeight) {
              nextH = currentImgHeight - nextY;
              nextW = nextH * activeRatio;
            }
          }
        }
      }

      setCropRect({
        x: Math.round(Math.max(0, nextX)),
        y: Math.round(Math.max(0, nextY)),
        width: Math.round(Math.max(minDimension, nextW)),
        height: Math.round(Math.max(minDimension, nextH)),
      });
    };

    const handlePointerUp = () => {
      isInteractingRef.current = false;
      activeHandleRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Perform Cropped Export
  const handleDownloadCrop = async () => {
    try {
      setIsExporting(true);
      const canvas = renderCroppedCanvas(sourceImage, cropRect, transform);
      const blob = await canvasToBlob(canvas, exportFormat, 0.95);
      const safeName = sanitizeFilename(metadata.name, exportFormat, 'crop');

      downloadBlob(blob, safeName);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 2000);
    } catch (err) {
      console.error('Crop export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Display coords for overlay
  const displayX = cropRect.x * scaleFactor;
  const displayY = cropRect.y * scaleFactor;
  const displayW = cropRect.width * scaleFactor;
  const displayH = cropRect.height * scaleFactor;

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Bar Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <CropIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Cropping & Framing Studio</h2>
            <p className="text-xs text-gray-500">
              Drag handles or select aspect ratio presets to frame your image.
            </p>
          </div>
        </div>

        {/* Dynamic Crop Dimensions Pill */}
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-700 font-mono">
            <span className="text-gray-500">Output: </span>
            <span className="text-blue-600 font-bold">{cropRect.width}</span> ×{' '}
            <span className="text-blue-600 font-bold">{cropRect.height}</span> px
          </div>

          <button
            onClick={handleResetTransforms}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Crop</span>
          </button>
        </div>
      </div>

      {/* Main Cropper Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        {/* Left Column: Interactive Crop Canvas Area */}
        <div
          ref={containerRef}
          className="lg:col-span-8 flex flex-col items-center justify-center rounded-2xl bg-white border border-gray-200 p-4 sm:p-6 relative select-none overflow-hidden touch-none shadow-2xs"
        >
          <div className="relative inline-block checkerboard-bg rounded-xl shadow-md overflow-hidden border border-gray-200 max-h-[520px]">
            {/* Base Transformed Canvas */}
            <canvas
              ref={canvasRef}
              className="max-h-[500px] max-w-full block object-contain"
            />

            {/* Dark Mask Surrounding Crop Box */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.55)`,
                left: `${displayX}px`,
                top: `${displayY}px`,
                width: `${displayW}px`,
                height: `${displayH}px`,
              }}
            />

            {/* Interactive Crop Boundary Box */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="absolute border-2 border-blue-500 cursor-move shadow-sm group touch-none"
              style={{
                left: `${displayX}px`,
                top: `${displayY}px`,
                width: `${displayW}px`,
                height: `${displayH}px`,
              }}
            >
              {/* Rule-of-Thirds Grid Overlay */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="border-r border-b border-blue-400/50" />
                <div className="border-r border-b border-blue-400/50" />
                <div className="border-b border-blue-400/50" />
                <div className="border-r border-b border-blue-400/50" />
                <div className="border-r border-b border-blue-400/50" />
                <div className="border-b border-blue-400/50" />
                <div className="border-r border-b border-blue-400/50" />
                <div className="border-r border-b border-blue-400/50" />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'top-left')}
                className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow cursor-nwse-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'top-right')}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow cursor-nesw-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'bottom-left')}
                className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow cursor-nesw-resize hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'bottom-right')}
                className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow cursor-nwse-resize hover:scale-125 transition-transform"
              />

              {/* Edge Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'top')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 bg-blue-600 rounded-full cursor-ns-resize shadow"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'bottom')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 bg-blue-600 rounded-full cursor-ns-resize shadow"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'left')}
                className="absolute top-1/2 -translate-y-1/2 -left-1.5 h-6 w-2.5 bg-blue-600 rounded-full cursor-ew-resize shadow"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'right')}
                className="absolute top-1/2 -translate-y-1/2 -right-1.5 h-6 w-2.5 bg-blue-600 rounded-full cursor-ew-resize shadow"
              />

              {/* Dimension Tag Inside Crop Box */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white pointer-events-none">
                {cropRect.width} × {cropRect.height}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Controls Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-4 rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 overflow-y-auto max-h-[620px] shadow-2xs">
          {/* Rotation & Flip Controls */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Rotate & Flip
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRotate('ccw')}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors flex flex-col items-center justify-center cursor-pointer"
                title="Rotate 90° Counter-Clockwise"
              >
                <RotateCcw className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[10px] font-semibold">90° Left</span>
              </button>

              <button
                type="button"
                onClick={() => handleRotate('cw')}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition-colors flex flex-col items-center justify-center cursor-pointer"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[10px] font-semibold">90° Right</span>
              </button>

              <button
                type="button"
                onClick={handleFlipH}
                className={`p-2.5 rounded-xl border transition-colors flex flex-col items-center justify-center cursor-pointer ${
                  transform.flipHorizontal
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[10px] font-semibold">Flip H</span>
              </button>

              <button
                type="button"
                onClick={handleFlipV}
                className={`p-2.5 rounded-xl border transition-colors flex flex-col items-center justify-center cursor-pointer ${
                  transform.flipVertical
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                }`}
                title="Flip Vertically"
              >
                <FlipVertical className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[10px] font-semibold">Flip V</span>
              </button>
            </div>
          </div>

          {/* Standard Aspect Ratio Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIO_PRESETS.filter((p) => p.category === 'Standard').map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`py-2 px-3 rounded-lg text-center border text-xs font-semibold transition-colors cursor-pointer ${
                    activePresetId === preset.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Social Media Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Social Media Ratios</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIO_PRESETS.filter((p) => p.category === 'Social').map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl text-left border transition-colors cursor-pointer ${
                    activePresetId === preset.id
                      ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600/30'
                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900 truncate">{preset.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format Selector */}
          <div className="space-y-1.5 pt-2 border-t border-gray-200">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Download Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['image/png', 'image/jpeg', 'image/webp'] as TargetImageFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`py-1.5 rounded-lg text-center border text-xs font-bold transition-colors cursor-pointer ${
                    exportFormat === fmt
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {fmt.split('/')[1].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Download Action CTAs */}
          <div className="pt-2 flex flex-col gap-2 mt-auto">
            <button
              onClick={handleDownloadCrop}
              disabled={isExporting}
              className={`w-full py-3 px-5 rounded-xl font-bold text-sm shadow-2xs flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                isDownloaded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Rendering Full-Res Crop...</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Cropped Image Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Cropped Image</span>
                </>
              )}
            </button>

            <button
              onClick={onReset}
              type="button"
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors cursor-pointer text-center"
            >
              Choose Different Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
