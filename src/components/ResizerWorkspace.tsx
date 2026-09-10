'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ImageMetadata, TargetImageFormat, ResizePreset } from '../lib/image/types';
import {
  RESIZE_PRESETS,
  calculateHeightFromWidth,
  calculateWidthFromHeight,
  calculateDimensionsFromScale,
  renderResizedCanvas,
} from '../lib/image/resize';
import { formatBytes, sanitizeFilename, downloadBlob, canvasToBlob } from '../lib/image/export';
import {
  Scaling,
  Lock,
  Unlock,
  Percent,
  Download,
  Check,
  Sparkles,
  Layers,
  Share2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface ResizerWorkspaceProps {
  sourceImage: HTMLImageElement;
  metadata: ImageMetadata;
  onReset: () => void;
}

export const ResizerWorkspace: React.FC<ResizerWorkspaceProps> = ({
  sourceImage,
  metadata,
  onReset,
}) => {
  const origWidth = metadata.width;
  const origHeight = metadata.height;
  const origAspectRatio = origWidth / origHeight;

  // Resize State
  const [targetWidth, setTargetWidth] = useState<number>(origWidth);
  const [targetHeight, setTargetHeight] = useState<number>(origHeight);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [scalePercentage, setScalePercentage] = useState<number>(100);
  const [activePresetId, setActivePresetId] = useState<string>('scale-100');

  // Export State
  const [exportFormat, setExportFormat] = useState<TargetImageFormat>('image/png');
  const [quality] = useState<number>(0.92);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Resized Preview Canvas
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Update preview canvas when dimensions change
  useEffect(() => {
    if (!previewCanvasRef.current || targetWidth <= 0 || targetHeight <= 0) return;
    try {
      const rendered = renderResizedCanvas(sourceImage, targetWidth, targetHeight);
      const canvas = previewCanvasRef.current;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(rendered, 0, 0);
    } catch (e: unknown) {
      console.error('Error rendering preview canvas', e);
    }
  }, [sourceImage, targetWidth, targetHeight]);

  // Handle Width Change
  const handleWidthChange = (val: number) => {
    const w = Math.max(1, Math.min(10000, val || 1));
    setTargetWidth(w);
    if (lockAspectRatio) {
      const h = calculateHeightFromWidth(w, origAspectRatio);
      setTargetHeight(h);
      setScalePercentage(Math.round((w / origWidth) * 100));
    }
    setActivePresetId('custom');
  };

  // Handle Height Change
  const handleHeightChange = (val: number) => {
    const h = Math.max(1, Math.min(10000, val || 1));
    setTargetHeight(h);
    if (lockAspectRatio) {
      const w = calculateWidthFromHeight(h, origAspectRatio);
      setTargetWidth(w);
      setScalePercentage(Math.round((w / origWidth) * 100));
    }
    setActivePresetId('custom');
  };

  // Handle Percentage Scale Change
  const handleScaleChange = (percent: number) => {
    setScalePercentage(percent);
    const { width, height } = calculateDimensionsFromScale(origWidth, origHeight, percent);
    setTargetWidth(width);
    setTargetHeight(height);
    setActivePresetId(`scale-${percent}`);
  };

  // Handle Preset Click
  const handleSelectPreset = (preset: ResizePreset) => {
    setActivePresetId(preset.id);
    if (preset.scalePercent) {
      handleScaleChange(preset.scalePercent);
    } else if (preset.width && preset.height) {
      setTargetWidth(preset.width);
      setTargetHeight(preset.height);
      setScalePercentage(Math.round((preset.width / origWidth) * 100));
    }
  };

  // Reset to original dimensions
  const handleResetDimensions = () => {
    setTargetWidth(origWidth);
    setTargetHeight(origHeight);
    setScalePercentage(100);
    setActivePresetId('scale-100');
    setLockAspectRatio(true);
  };

  // Download Resized Image
  const handleDownload = async () => {
    try {
      setIsResizing(true);
      setErrorMessage(null);

      const renderedCanvas = renderResizedCanvas(sourceImage, targetWidth, targetHeight);
      const blob = await canvasToBlob(renderedCanvas, exportFormat, quality);
      const safeFilename = sanitizeFilename(
        metadata.name,
        exportFormat,
        `resized-${targetWidth}x${targetHeight}`
      );

      downloadBlob(blob, safeFilename);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export resized image.';
      setErrorMessage(msg);
    } finally {
      setIsResizing(false);
    }
  };

  const isScaledDown = targetWidth < origWidth || targetHeight < origHeight;
  const isScaledUp = targetWidth > origWidth || targetHeight > origHeight;

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Bar Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <Scaling className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Image Resizer Studio</h2>
            <p className="text-xs text-gray-500">
              Original: {origWidth} × {origHeight} px • <span className="font-mono text-gray-700">{formatBytes(metadata.size)}</span>
            </p>
          </div>
        </div>

        {/* Dynamic Resize Stats Pill */}
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-700 font-mono flex items-center space-x-1.5">
            <span className="text-gray-500">Output:</span>
            <span className="text-blue-600 font-bold">{targetWidth} × {targetHeight} px</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-700 font-bold">{scalePercentage}%</span>
          </div>

          <button
            onClick={handleResetDimensions}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset 100%</span>
          </button>
        </div>
      </div>

      {/* Main Resizer Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        {/* Left Column: Live Resized Preview */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-white border border-gray-200 p-4 sm:p-6 relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Resized Output Preview</h3>
            </div>
            {isScaledDown && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Stepped Anti-Aliasing Enabled
              </span>
            )}
            {isScaledUp && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Bicubic Upscaling
              </span>
            )}
          </div>

          {/* Canvas Preview Container */}
          <div className="flex-1 min-h-[380px] checkerboard-bg rounded-xl border border-gray-200 flex items-center justify-center p-4 overflow-hidden relative">
            <canvas
              ref={previewCanvasRef}
              className="max-h-[460px] max-w-full object-contain rounded shadow-sm transition-all"
            />

            {/* Bottom Floating Dimension Pill */}
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-white/90 border border-gray-200 text-[11px] font-mono text-gray-700 flex items-center space-x-1.5 shadow-2xs">
              <span>{targetWidth} × {targetHeight} px</span>
              <span className="text-gray-300">•</span>
              <span className="text-blue-600 font-bold">{exportFormat.split('/')[1].toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Resize Controls Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-4 rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 overflow-y-auto max-h-[620px] shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Resize Controls</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set pixel dimensions, scale percentage, or select a preset.
            </p>
          </div>

          {/* Width & Height Number Inputs with Aspect Ratio Lock */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Dimensions (Pixels)
              </span>
              <button
                type="button"
                onClick={() => setLockAspectRatio(!lockAspectRatio)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  lockAspectRatio
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-white text-gray-600 border border-gray-300 hover:text-gray-900'
                }`}
                title={lockAspectRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              >
                {lockAspectRatio ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Ratio Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlocked</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Width Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600">Width (px)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={targetWidth}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-mono text-sm font-bold focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">px</span>
                </div>
              </div>

              {/* Height Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-600">Height (px)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={targetHeight}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-mono text-sm font-bold focus:outline-none focus:border-blue-600"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Percentage Scale Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                <span>Scale Percentage</span>
              </label>
              <span className="font-mono font-bold text-blue-700 text-xs">
                {scalePercentage}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleScaleChange(pct)}
                  className={`py-1.5 rounded-lg text-center text-xs font-bold transition-colors cursor-pointer ${
                    scalePercentage === pct
                      ? 'bg-blue-600 text-white shadow-2xs border border-blue-600'
                      : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Social Media & Screen Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Social & Standard Presets</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RESIZE_PRESETS.filter((p) => p.category === 'Social' || p.category === 'Standard').slice(0, 6).map((preset) => (
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
                  <p className="text-xs font-bold text-gray-900 truncate">{preset.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format Selector */}
          <div className="space-y-1.5 pt-2 border-t border-gray-200">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Output Format
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

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2 mt-auto">
            <button
              onClick={handleDownload}
              disabled={isResizing}
              className={`w-full py-3 px-5 rounded-xl font-bold text-sm shadow-2xs flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                isDownloaded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isResizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Resampling Image...</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Resized & Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Resized Image</span>
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
