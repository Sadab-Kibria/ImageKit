'use client';

import React, { useState } from 'react';
import { Header } from '../../components/Header';
import { ImageUploader } from '../../components/ImageUploader';
import { ResizerWorkspace } from '../../components/ResizerWorkspace';
import { ImageMetadata } from '../../lib/image/types';

export default function ResizePage() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);

  const handleImageLoaded = (
    image: HTMLImageElement,
    _file: File | null,
    meta: ImageMetadata
  ) => {
    setSourceImage(image);
    setMetadata(meta);
  };

  const handleReset = () => {
    setSourceImage(null);
    setMetadata(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-gray-900 selection:bg-blue-600 selection:text-white">
      {/* Universal Header */}
      <Header
        hasImage={!!sourceImage}
        onNewImageClick={handleReset}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!sourceImage || !metadata ? (
          <div className="flex-1 flex items-center justify-center">
            <ImageUploader
              onImageLoaded={handleImageLoaded}
              badgeText="High-Quality In-Browser Scaling"
              title="Resize images with"
              titleHighlight="perfect fidelity"
              subtitle="Scale by exact pixels, percentage, or social media dimensions with locked aspect ratios and stepped anti-aliasing. 100% private."
            />
          </div>
        ) : (
          <ResizerWorkspace
            sourceImage={sourceImage}
            metadata={metadata}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
