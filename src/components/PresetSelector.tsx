'use client';

import React from 'react';
import { PRESETS } from '../lib/image/presets';
import { Preset, EnhancementSettings } from '../lib/image/types';
import { Sparkles, Wand2, Sun, Eye, Contrast, Image as ImageIcon } from 'lucide-react';

interface PresetSelectorProps {
  currentSettings: EnhancementSettings;
  onApplyPreset: (preset: Preset) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  onApplyPreset,
}) => {
  const getPresetIcon = (id: string) => {
    switch (id) {
      case 'auto-enhance':
        return <Sparkles className="w-3.5 h-3.5 text-blue-600" />;
      case 'crisp-detail':
        return <Eye className="w-3.5 h-3.5 text-blue-600" />;
      case 'vivid-hdr':
        return <Wand2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'cinematic-warm':
        return <Sun className="w-3.5 h-3.5 text-blue-600" />;
      case 'fine-art-bw':
        return <Contrast className="w-3.5 h-3.5 text-gray-700" />;
      default:
        return <ImageIcon className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Curated Presets</span>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset)}
            className="flex flex-col items-start p-2.5 rounded-xl text-left bg-white hover:bg-blue-50/30 border border-gray-200 hover:border-blue-400 transition-colors group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center space-x-2 mb-1 w-full">
              <div className="p-1 rounded bg-gray-100 group-hover:bg-blue-100 transition-colors">
                {getPresetIcon(preset.id)}
              </div>
              <span className="text-xs font-semibold text-gray-900 truncate">
                {preset.name}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 line-clamp-1 leading-tight">
              {preset.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
