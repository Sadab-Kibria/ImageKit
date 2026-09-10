'use client';

import React, { useRef, useEffect } from 'react';
import { ViewMode, ImageMetadata } from '../lib/image/types';
import { RealESRGANScale } from '../lib/image/ai/types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { formatBytes } from '../lib/image/export';
import { FileImage, Sparkles } from 'lucide-react';

interface ImagePreviewProps {
  originalCanvas: HTMLCanvasElement | null;
  enhancedCanvas: HTMLCanvasElement | null;
  metadata: ImageMetadata | null;
  viewMode: ViewMode;
  zoom: number;
  pan: { x: number; y: number };
  isHoldingOriginal?: boolean;
  isAIEnhanced?: boolean;
  aiScale?: RealESRGANScale;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalCanvas,
  enhancedCanvas,
  metadata,
  viewMode,
  zoom,
  pan,
  isHoldingOriginal = false,
  isAIEnhanced = false,
  aiScale = 2,
}) => {
  const sideOriginalRef = useRef<HTMLCanvasElement>(null);
  const sideEnhancedRef = useRef<HTMLCanvasElement>(null);
  const singleEnhancedRef = useRef<HTMLCanvasElement>(null);

  // Sync Side-by-Side and Single views
  useEffect(() => {
    if (viewMode === 'side-by-side') {
      if (originalCanvas && sideOriginalRef.current) {
        const c = sideOriginalRef.current;
        c.width = originalCanvas.width;
        c.height = originalCanvas.height;
        const ctx = c.getContext('2d');
        ctx?.drawImage(originalCanvas, 0, 0);
      }
      if (enhancedCanvas && sideEnhancedRef.current) {
        const c = sideEnhancedRef.current;
        c.width = enhancedCanvas.width;
        c.height = enhancedCanvas.height;
        const ctx = c.getContext('2d');
        ctx?.drawImage(enhancedCanvas, 0, 0);
      }
    } else if (viewMode === 'enhanced' || isHoldingOriginal) {
      if (singleEnhancedRef.current) {
        const target = singleEnhancedRef.current;
        const src = isHoldingOriginal ? originalCanvas : enhancedCanvas;
        if (src) {
          target.width = src.width;
          target.height = src.height;
          const ctx = target.getContext('2d');
          ctx?.drawImage(src, 0, 0);
        }
      }
    }
  }, [viewMode, originalCanvas, enhancedCanvas, isHoldingOriginal]);

  if (!metadata || !originalCanvas || !enhancedCanvas) {
    return null;
  }

  const currentDisplayWidth = isAIEnhanced && enhancedCanvas ? enhancedCanvas.width : metadata.width;
  const currentDisplayHeight = isAIEnhanced && enhancedCanvas ? enhancedCanvas.height : metadata.height;

  return (
    <div className="flex flex-col space-y-3 w-full">
      {/* Visual Canvas Display Area - Sized naturally without stretching */}
      <div className="relative w-full rounded-2xl bg-white border border-gray-200 p-3 sm:p-4 flex items-center justify-center min-h-[320px] max-h-[560px] shadow-2xs">
        {/* View Mode 1: Split Slider (Default) */}
        {viewMode === 'split' && !isHoldingOriginal && (
          <div className="w-full h-full max-h-[520px] flex items-center justify-center">
            <BeforeAfterSlider
              originalCanvas={originalCanvas}
              enhancedCanvas={enhancedCanvas}
              aspectRatio={metadata.aspectRatio}
              width={originalCanvas.width}
              height={originalCanvas.height}
              zoom={zoom}
              pan={pan}
            />
          </div>
        )}

        {/* View Mode 2: Side-by-Side */}
        {viewMode === 'side-by-side' && !isHoldingOriginal && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full p-1 overflow-auto max-h-[520px]">
            {/* Original Card */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-200 relative">
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-white text-[10px] font-bold text-gray-700 uppercase tracking-wider border border-gray-200 shadow-2xs">
                Original ({metadata.width} × {metadata.height})
              </span>
              <canvas
                ref={sideOriginalRef}
                className="max-w-full max-h-[380px] object-contain rounded shadow-xs"
              />
            </div>

            {/* Enhanced Card */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/40 border border-blue-200 relative">
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-blue-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-2xs">
                {isAIEnhanced ? `AI Enhanced ${aiScale}×` : 'Enhanced'} ({currentDisplayWidth} × {currentDisplayHeight})
              </span>
              <canvas
                ref={sideEnhancedRef}
                className="max-w-full max-h-[380px] object-contain rounded shadow-xs"
              />
            </div>
          </div>
        )}

        {/* View Mode 3: Single Canvas (Enhanced or Hold-to-compare Original) */}
        {(viewMode === 'enhanced' || isHoldingOriginal) && (
          <div className="relative w-full max-h-[520px] flex items-center justify-center p-2">
            <span
              className={`absolute top-4 left-4 z-20 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shadow-xs transition-all ${
                isHoldingOriginal
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {isHoldingOriginal ? 'Original (Holding)' : isAIEnhanced ? `Real-ESRGAN ${aiScale}× Enhanced` : 'Enhanced Preview'}
            </span>
            <canvas
              ref={singleEnhancedRef}
              className="max-w-full max-h-[480px] object-contain rounded-lg shadow-md border border-gray-200"
              style={{
                aspectRatio: `${metadata.aspectRatio}`,
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              }}
            />
          </div>
        )}
      </div>

      {/* Image Metadata Bar */}
      <div className="px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2 shadow-2xs">
        <div className="flex items-center space-x-2 truncate max-w-sm">
          <FileImage className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-gray-900 truncate" title={metadata.name}>
            {metadata.name}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          {isAIEnhanced && (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>AI {aiScale}×</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
            {currentDisplayWidth} × {currentDisplayHeight} px
          </span>
          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
            {((currentDisplayWidth * currentDisplayHeight) / 1_000_000).toFixed(1)} MP
          </span>
          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
            {formatBytes(metadata.size)}
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-semibold">
            {metadata.type.replace('image/', '')}
          </span>
        </div>
      </div>
    </div>
  );
};
