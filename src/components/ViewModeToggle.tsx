'use client';

import React from 'react';
import { ViewMode } from '../lib/image/types';
import { Columns, SplitSquareVertical, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  isHoldingOriginal?: boolean;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  zoom,
  onZoomChange,
  onResetZoom,
  isHoldingOriginal = false,
  onHoldStart,
  onHoldEnd,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 sm:p-2 rounded-xl bg-white border border-gray-200 text-xs shadow-2xs">
      {/* View Mode Segmented Switcher */}
      <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-gray-100 border border-gray-200/60">
        <button
          onClick={() => onViewModeChange('split')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all font-medium cursor-pointer ${
            viewMode === 'split'
              ? 'bg-white text-gray-900 shadow-2xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Draggable Split Slider Comparison"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 text-blue-600" />
          <span>Split Slider</span>
        </button>

        <button
          onClick={() => onViewModeChange('side-by-side')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all font-medium cursor-pointer ${
            viewMode === 'side-by-side'
              ? 'bg-white text-gray-900 shadow-2xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Side by side comparison"
        >
          <Columns className="w-3.5 h-3.5 text-blue-600" />
          <span>Side by Side</span>
        </button>

        <button
          onClick={() => onViewModeChange('enhanced')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all font-medium cursor-pointer ${
            viewMode === 'enhanced'
              ? 'bg-white text-gray-900 shadow-2xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Enhanced result only"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>Enhanced Only</span>
        </button>
      </div>

      {/* Quick Hold to Compare Button & Zoom Controls */}
      <div className="flex items-center space-x-2">
        {onHoldStart && onHoldEnd && (
          <button
            onPointerDown={onHoldStart}
            onPointerUp={onHoldEnd}
            onPointerLeave={onHoldEnd}
            className={`px-3 py-1.5 rounded-lg font-medium border text-xs select-none transition-colors flex items-center space-x-1.5 cursor-pointer ${
              isHoldingOriginal
                ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
            }`}
            title="Press and hold down to temporarily view the original unedited photo"
          >
            <span>Hold to Compare</span>
          </button>
        )}

        {/* Zoom In / Out / Reset */}
        <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-gray-100 border border-gray-200/60">
          <button
            onClick={() => onZoomChange(Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100))}
            className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetZoom}
            className="px-2 py-0.5 text-[11px] font-mono text-gray-700 hover:text-gray-900 cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => onZoomChange(Math.min(3, Math.round((zoom + 0.25) * 100) / 100))}
            className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {zoom !== 1 && (
            <button
              onClick={onResetZoom}
              className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-white transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
