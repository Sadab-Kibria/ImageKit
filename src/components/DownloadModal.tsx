'use client';

import React, { useState } from 'react';
import { ExportFormat, ExportOptions, ImageMetadata, EnhancementSettings, TargetImageFormat } from '../lib/image/types';
import { RealESRGANScale } from '../lib/image/ai/types';
import { exportEnhancedImage, sanitizeFilename, canvasToBlob, downloadBlob } from '../lib/image/export';
import { Download, X, Check, ShieldCheck, Sliders, AlertCircle, Sparkles } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage: HTMLImageElement | null;
  settings: EnhancementSettings;
  metadata: ImageMetadata | null;
  isAIEnhanced?: boolean;
  aiEnhancedCanvas?: HTMLCanvasElement | null;
  aiScale?: RealESRGANScale;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  sourceImage,
  settings,
  metadata,
  isAIEnhanced = false,
  aiEnhancedCanvas = null,
  aiScale = 2,
}) => {
  const [format, setFormat] = useState<ExportFormat>('image/webp');
  const [quality, setQuality] = useState<number>(0.92);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !sourceImage || !metadata) return null;

  const exportWidth = isAIEnhanced && aiEnhancedCanvas ? aiEnhancedCanvas.width : metadata.width;
  const exportHeight = isAIEnhanced && aiEnhancedCanvas ? aiEnhancedCanvas.height : metadata.height;
  const filenameSuffix = isAIEnhanced ? `enhanced-${aiScale}x` : 'enhanced';
  const currentFilename = sanitizeFilename(metadata.name, format, filenameSuffix);

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      setErrorMessage(null);

      if (isAIEnhanced && aiEnhancedCanvas) {
        // Export the high-resolution AI enhanced canvas
        const blob = await canvasToBlob(aiEnhancedCanvas, format as TargetImageFormat, quality);
        downloadBlob(blob, currentFilename);
      } else {
        const options: ExportOptions = {
          format,
          quality,
          filename: metadata.name,
        };
        await exportEnhancedImage(sourceImage, settings, options);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during export. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-gray-200 p-6 shadow-xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <span>Export Enhanced Image</span>
                {isAIEnhanced && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Real-ESRGAN {aiScale}×</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Full-resolution render ({exportWidth} × {exportHeight} px)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Choose Output Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'image/webp', name: 'WebP', desc: 'Modern & Compact' },
              { id: 'image/png', name: 'PNG', desc: 'Lossless Quality' },
              { id: 'image/jpeg', name: 'JPEG', desc: 'Universal Photo' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id as ExportFormat)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  format === f.id
                    ? 'bg-blue-50/70 border-blue-600 text-blue-900 shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                <p className="text-sm font-bold text-gray-900">{f.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Quality Slider (for WebP & JPEG) */}
        {format !== 'image/png' && (
          <div className="space-y-2 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Compression Quality</span>
              </span>
              <span className="font-mono font-bold text-blue-600">
                {Math.round(quality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.02"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Smaller File</span>
              <span>Maximum Fidelity</span>
            </div>
          </div>
        )}

        {/* Output File Name Preview */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
          <span className="text-gray-500">File Output:</span>
          <span className="font-mono text-gray-800 font-semibold truncate max-w-[240px]">
            {currentFilename}
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Privacy Note */}
        <div className="flex items-center space-x-2 text-[11px] text-emerald-700 px-1">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>Processed 100% in your browser. Zero cloud upload.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center space-x-2 cursor-pointer ${
              isSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Full Res...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {isAIEnhanced ? `AI ${aiScale}× Image` : 'Enhanced Image'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
