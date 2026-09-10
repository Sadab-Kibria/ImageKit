'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, Sparkles, Shield, FileCheck } from 'lucide-react';
import { ImageMetadata } from '../lib/image/types';

interface ImageUploaderProps {
  onImageLoaded: (
    image: HTMLImageElement,
    file: File | null,
    metadata: ImageMetadata
  ) => void;
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  badgeText?: string;
}

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE_MB = 50;

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageLoaded,
  title = 'Enhance your images',
  titleHighlight = 'instantly',
  subtitle = 'Adjust brightness, contrast, sharpness, denoise, and tone curves with real-time preview. 100% private, processed in your browser.',
  badgeText = 'Free Browser-Based Utility',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validate MIME type
    if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|avif)$/i)) {
      setErrorMessage(
        `Unsupported file type "${file.type || file.name}". Please upload a JPEG, PNG, WebP, or AVIF image.`
      );
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setIsLoading(true);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      setIsLoading(false);
      const metadata: ImageMetadata = {
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        aspectRatio: (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
        lastModified: file.lastModified,
      };

      onImageLoaded(img, file, metadata);
    };

    img.onerror = () => {
      setIsLoading(false);
      URL.revokeObjectURL(objectUrl);
      setErrorMessage('Failed to decode image. The file might be corrupted or in an unsupported format.');
    };

    img.src = objectUrl;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Load a synthesized high-resolution demo canvas for instant zero-click testing
  const loadSampleImage = (type: 'sunset' | 'portrait' | 'cyberpunk') => {
    setIsLoading(true);
    setErrorMessage(null);

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;

    if (type === 'sunset') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1600, 1000);

      // Sky gradient simulation with solid layers
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, 1600, 400);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(0, 400, 1600, 300);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(0, 700, 1600, 300);

      // Sun
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(800, 500, 140, 0, Math.PI * 2);
      ctx.fill();

      // Mountains
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, 800);
      ctx.lineTo(300, 600);
      ctx.lineTo(600, 750);
      ctx.lineTo(950, 550);
      ctx.lineTo(1300, 720);
      ctx.lineTo(1600, 640);
      ctx.lineTo(1600, 1000);
      ctx.lineTo(0, 1000);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'cyberpunk') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1600, 1000);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let x = 0; x < 1600; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1000);
        ctx.stroke();
      }
      for (let y = 0; y < 1000; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1600, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(600, 450, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(1050, 550, 180, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 1600, 1000);

      ctx.fillStyle = '#334155';
      ctx.fillRect(300, 200, 1000, 600);

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(800, 500, 150, 0, Math.PI * 2);
      ctx.fill();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      const metadata: ImageMetadata = {
        name: `sample-${type}-1600x1000.png`,
        size: Math.round(dataUrl.length * 0.75),
        type: 'image/png',
        width: 1600,
        height: 1000,
        aspectRatio: 1.6,
        lastModified: Date.now(),
      };
      onImageLoaded(img, null, metadata);
    };
    img.src = dataUrl;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Tool Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>{badgeText}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2.5">
          {title} <span className="text-blue-600">{titleHighlight}</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
          {subtitle}
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-8 sm:p-14 text-center bg-white ${
          isDragging
            ? 'border-blue-600 bg-blue-50/50 shadow-md scale-[1.005]'
            : 'border-gray-300 hover:border-blue-500 hover:bg-slate-50/60 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleFileInput}
          className="hidden"
          id="image-file-input"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Upload Icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
              isDragging
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}
          >
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : isDragging ? (
              <UploadCloud className="w-8 h-8" />
            ) : (
              <ImageIcon className="w-8 h-8" />
            )}
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              {isDragging ? 'Drop your image right here' : 'Drop your image here'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              or click to browse from your device
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-2xs flex items-center space-x-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Select Image</span>
          </button>

          {/* Supported Format Text & Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-xs text-gray-500 mr-1">Supported formats:</span>
            {['JPG', 'PNG', 'WEBP', 'AVIF'].map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[11px] font-semibold text-gray-600"
              >
                {fmt}
              </span>
            ))}
            <span className="text-xs text-gray-400 ml-1">(up to 50MB)</span>
          </div>
        </div>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to open image</p>
            <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Sample Demo Images for 1-click test drive */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Or try a sample photo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => loadSampleImage('sunset')}
            className="flex items-center space-x-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-400 transition-colors text-left cursor-pointer shadow-2xs"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white text-base">
              🌅
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Landscape</p>
              <p className="text-[11px] text-gray-500">1600 × 1000 Photo</p>
            </div>
          </button>

          <button
            onClick={() => loadSampleImage('cyberpunk')}
            className="flex items-center space-x-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-400 transition-colors text-left cursor-pointer shadow-2xs"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base">
              🌃
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">High Contrast</p>
              <p className="text-[11px] text-gray-500">1600 × 1000 Graphic</p>
            </div>
          </button>

          <button
            onClick={() => loadSampleImage('portrait')}
            className="flex items-center space-x-3 p-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-400 transition-colors text-left cursor-pointer shadow-2xs"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white text-base">
              🏛️
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Architecture</p>
              <p className="text-[11px] text-gray-500">1600 × 1000 Clean</p>
            </div>
          </button>
        </div>
      </div>

      {/* Trust & Privacy Guarantee Bar */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1.5">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span><strong>100% Local Privacy:</strong> Files stay in your browser.</span>
        </div>
        <div className="hidden sm:block text-gray-300">•</div>
        <div className="flex items-center space-x-1.5">
          <FileCheck className="w-4 h-4 text-blue-600" />
          <span>Full-resolution lossless export</span>
        </div>
      </div>
    </div>
  );
};
