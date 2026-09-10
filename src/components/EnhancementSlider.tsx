'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface EnhancementSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
}

export const EnhancementSlider: React.FC<EnhancementSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  unit = '',
  icon,
  description,
  onChange,
  onReset,
}) => {
  const isChanged = value !== defaultValue;

  // Calculate percentage for gradient track fill
  const percentage = ((value - min) / (max - min)) * 100;
  // Midpoint percentage for bipolar sliders (-100 to 100)
  const isBipolar = min < 0 && max > 0;
  const zeroPercentage = ((0 - min) / (max - min)) * 100;

  let trackBackground: string;
  if (isBipolar) {
    if (percentage >= zeroPercentage) {
      trackBackground = `linear-gradient(to right, #e2e8f0 0%, #e2e8f0 ${zeroPercentage}%, #2563eb ${zeroPercentage}%, #2563eb ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
    } else {
      trackBackground = `linear-gradient(to right, #e2e8f0 0%, #e2e8f0 ${percentage}%, #2563eb ${percentage}%, #2563eb ${zeroPercentage}%, #e2e8f0 ${zeroPercentage}%, #e2e8f0 100%)`;
    }
  } else {
    trackBackground = `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`;
  }

  return (
    <div className="group flex flex-col space-y-1.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Slider Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-gray-500 group-hover:text-blue-600 transition-colors">{icon}</span>}
          <label
            htmlFor={id}
            className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors cursor-pointer"
          >
            {label}
          </label>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Numeric Value Badge */}
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded min-w-[2.75rem] text-right font-medium transition-all ${
              isChanged
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {value > 0 && isBipolar ? `+${value}` : value}
            {unit}
          </span>

          {/* Quick Individual Reset Button */}
          {isChanged && onReset && (
            <button
              onClick={onReset}
              title={`Reset ${label}`}
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              aria-label={`Reset ${label} to default`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {description && (
        <p className="text-[11px] text-gray-500 line-clamp-1">{description}</p>
      )}

      {/* Range Input with dynamic fill track */}
      <div className="relative flex items-center py-1">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ background: trackBackground }}
          className="w-full h-2 rounded-full cursor-pointer transition-all"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
    </div>
  );
};
