'use client';

import React, { useState, useEffect } from 'react';
import { TargetImageFormat, ImageMetadata, ConversionResult } from '../lib/image/types';
import { SUPPORTED_TARGET_FORMATS, convertImage, checkBrowserSupportedFormats } from '../lib/image/conversion';
import { formatBytes, downloadBlob } from '../lib/image/export';
import {
  Download,
  Check,
  AlertCircle,
  Sliders,
  Sparkles,
  TrendingDown,
  FileCheck2,
  Layers,
} from 'lucide-react';

interface ConverterWorkspaceProps {
  sourceImage: HTMLImageElement;
  metadata: ImageMetadata;
  onReset: () => void;
}

export const ConverterWorkspace: React.FC<ConverterWorkspaceProps> = ({
  sourceImage,
  metadata,
  onReset,
}) => {
  const [targetFormat, setTargetFormat] = useState<TargetImageFormat>('image/webp');
  const [quality, setQuality] = useState<number>(0.9);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supportedFormats, setSupportedFormats] = useState<Record<TargetImageFormat, boolean>>({
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/avif': true,
  });

  // Check browser canvas encoding support on mount
  useEffect(() => {
    checkBrowserSupportedFormats().then(setSupportedFormats);
  }, []);

  const selectedFormatConfig = SUPPORTED_TARGET_FORMATS.find((f) => f.format === targetFormat)!;

  // Convert when format, quality, or source image changes
  useEffect(() => {
    let isCancelled = false;

    async function runConversion() {
      setIsConverting(true);
      setErrorMessage(null);

      try {
        const result = await convertImage(
          sourceImage,
          {
            format: targetFormat,
            quality: selectedFormatConfig.supportsQuality ? quality : 1.0,
          },
          metadata.name
        );

        if (!isCancelled) {
          setConversionResult(result);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Conversion failed. Please try a different format.';
          setErrorMessage(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsConverting(false);
        }
      }
    }

    runConversion();

    return () => {
      isCancelled = true;
    };
  }, [sourceImage, targetFormat, quality, selectedFormatConfig, metadata.name]);

  const handleDownload = () => {
    if (!conversionResult) return;
    downloadBlob(conversionResult.blob, conversionResult.filename);
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2000);
  };

  // Original format friendly label
  const originalExt = metadata.type.split('/')[1]?.toUpperCase() || 'IMAGE';
  const percentSavings = conversionResult
    ? Math.round(((metadata.size - conversionResult.size) / metadata.size) * 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Banner / Comparison Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Specs Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-mono font-bold text-xs border border-gray-200">
              {originalExt}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Original File</p>
              <h3 className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{metadata.name}</h3>
              <p className="text-xs text-gray-500">
                {metadata.width} × {metadata.height} px • <span className="font-mono text-gray-700">{formatBytes(metadata.size)}</span>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
            Source
          </span>
        </div>

        {/* Target Result Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs">
              {selectedFormatConfig.extension.toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Converted Target</p>
              <h3 className="text-sm font-bold text-gray-900">
                {conversionResult ? conversionResult.filename : 'Converting...'}
              </h3>
              <p className="text-xs text-gray-600">
                {conversionResult ? (
                  <>
                    {conversionResult.width} × {conversionResult.height} px •{' '}
                    <span className="font-mono font-bold text-emerald-700">
                      {formatBytes(conversionResult.size)}
                    </span>
                  </>
                ) : (
                  'Calculating...'
                )}
              </p>
            </div>
          </div>

          {percentSavings > 0 ? (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{percentSavings}% smaller</span>
            </div>
          ) : conversionResult ? (
            <span className="px-2.5 py-1 rounded-lg bg-white text-gray-700 text-xs font-medium border border-gray-200">
              Full Fidelity
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Column: Image Preview Canvas */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-white border border-gray-200 p-4 sm:p-6 relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">Converted Preview</h2>
            </div>
            {isConverting && (
              <div className="flex items-center space-x-1.5 text-xs text-blue-600 font-medium">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Converting...</span>
              </div>
            )}
          </div>

          {/* Canvas Preview Container */}
          <div className="flex-1 min-h-[350px] checkerboard-bg rounded-xl border border-gray-200 flex items-center justify-center p-4 overflow-hidden relative">
            {conversionResult ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversionResult.dataUrl}
                alt="Converted preview"
                className="max-h-[460px] max-w-full object-contain rounded shadow-sm transition-all"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sourceImage.src}
                alt="Source preview"
                className="max-h-[460px] max-w-full object-contain rounded opacity-75 shadow-sm"
              />
            )}

            {/* Quick Format Watermark Pill */}
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-white/90 border border-gray-200 text-[11px] font-mono text-gray-700 flex items-center space-x-1.5 shadow-2xs">
              <span>{metadata.width} × {metadata.height}</span>
              <span className="text-gray-300">•</span>
              <span className="text-blue-600 font-bold">{selectedFormatConfig.extension.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Format & Quality Controls */}
        <div className="lg:col-span-5 flex flex-col space-y-4 rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Conversion Settings</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select your target format and compression quality.
            </p>
          </div>

          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {SUPPORTED_TARGET_FORMATS.map((fmt) => {
                const isSelected = targetFormat === fmt.format;
                const isSupported = supportedFormats[fmt.format];
                return (
                  <button
                    key={fmt.format}
                    type="button"
                    onClick={() => {
                      setTargetFormat(fmt.format);
                      if (fmt.supportsQuality) {
                        setQuality(fmt.defaultQuality);
                      }
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-600 text-blue-950 ring-1 ring-blue-600/30 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-gray-900">{fmt.label}</span>
                        {!isSupported && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                            Fallback
                          </span>
                        )}
                      </div>
                      {fmt.format === 'image/webp' && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Recommended
                        </span>
                      )}
                      {fmt.format === 'image/avif' && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                          Next-Gen
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{fmt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Slider for lossy formats */}
          {selectedFormatConfig.supportsQuality ? (
            <div className="space-y-2.5 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compression Quality</span>
                </span>
                <span className="text-xs font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.02"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Maximum Compression</span>
                <span>Balanced ({Math.round(selectedFormatConfig.defaultQuality * 100)}%)</span>
                <span>Best Quality</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center space-x-2 text-xs text-gray-600">
              <FileCheck2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>PNG is lossless; all image details and transparency channels are preserved.</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2.5 mt-auto">
            <button
              onClick={handleDownload}
              disabled={isConverting || !conversionResult}
              className={`w-full py-3 px-5 rounded-xl font-bold text-sm shadow-2xs flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                isDownloaded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isConverting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Conversion...</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Converted & Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {selectedFormatConfig.extension.toUpperCase()} Image</span>
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
