'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  originalCanvas: HTMLCanvasElement | null;
  enhancedCanvas: HTMLCanvasElement | null;
  aspectRatio: number;
  width: number;
  height: number;
  zoom?: number;
  pan?: { x: number; y: number };
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalCanvas,
  enhancedCanvas,
  aspectRatio,
  width,
  height,
  zoom = 1,
  pan = { x: 0, y: 0 },
}) => {
  // Slider position from 0 (all original) to 100 (all enhanced)
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalDisplayCanvasRef = useRef<HTMLCanvasElement>(null);
  const enhancedDisplayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Update canvas rendering on changes
  useEffect(() => {
    if (originalCanvas && originalDisplayCanvasRef.current) {
      const target = originalDisplayCanvasRef.current;
      target.width = width;
      target.height = height;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(originalCanvas, 0, 0, width, height);
      }
    }
  }, [originalCanvas, width, height]);

  useEffect(() => {
    if (enhancedCanvas && enhancedDisplayCanvasRef.current) {
      const target = enhancedDisplayCanvasRef.current;
      target.width = width;
      target.height = height;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(enhancedCanvas, 0, 0, width, height);
      }
    }
  }, [enhancedCanvas, width, height]);

  // Pointer drag handling
  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging || e.buttons === 1) {
      handlePointerMove(e.clientX);
    }
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
      e.preventDefault();
    } else if (e.key === 'Home') {
      setSliderPosition(0);
      e.preventDefault();
    } else if (e.key === 'End') {
      setSliderPosition(100);
      e.preventDefault();
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerMove={handlePointerDrag}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Before and after enhancement comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(sliderPosition)}
      className="relative w-full h-full select-none cursor-ew-resize overflow-hidden rounded-xl border border-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50 group flex items-center justify-center checkerboard-bg"
    >
      {/* Scaled and Panned Container */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-75"
        style={{
          aspectRatio: `${aspectRatio}`,
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        {/* Layer 1: Enhanced Image (Background Base) */}
        <div className="relative w-full h-full">
          <canvas
            ref={enhancedDisplayCanvasRef}
            className="w-full h-full object-contain block pointer-events-none rounded"
          />
        </div>

        {/* Layer 2: Original Image (Clipped by slider position on left) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            clipPath: `polygon(0% 0%, ${sliderPosition}% 0%, ${sliderPosition}% 100%, 0% 100%)`,
          }}
        >
          <canvas
            ref={originalDisplayCanvasRef}
            className="w-full h-full object-contain block pointer-events-none rounded"
          />
        </div>

        {/* Draggable Vertical Divider Bar */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Vertical Line */}
          <div className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-white shadow-md" />

          {/* Grab Handle Pill */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-gray-700 border border-gray-300 shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
            <ChevronsLeftRight className="w-4 h-4 text-gray-700" />
          </div>
        </div>

        {/* "BEFORE" Badge (Left Side) */}
        <div
          className={`absolute top-3 left-3 z-20 px-2.5 py-1 rounded-md bg-white/90 border border-gray-200 text-gray-800 text-[11px] font-bold tracking-wider uppercase shadow-xs transition-opacity pointer-events-none ${
            sliderPosition < 15 ? 'opacity-20' : 'opacity-95'
          }`}
        >
          Before
        </div>

        {/* "AFTER" Badge (Right Side) */}
        <div
          className={`absolute top-3 right-3 z-20 px-2.5 py-1 rounded-md bg-blue-600/90 text-white text-[11px] font-bold tracking-wider uppercase shadow-xs transition-opacity pointer-events-none ${
            sliderPosition > 85 ? 'opacity-20' : 'opacity-95'
          }`}
        >
          After
        </div>

        {/* Drag Instruction Tooltip Hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-white/90 border border-gray-200 text-gray-600 text-[11px] font-medium shadow-xs pointer-events-none hidden sm:flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          <span>ORIGINAL</span>
          <span className="text-gray-300">|</span>
          <span className="text-blue-600 font-semibold">ENHANCED</span>
          <span className="text-gray-400 text-[10px] ml-1">(← drag divider →)</span>
        </div>
      </div>
    </div>
  );
};
