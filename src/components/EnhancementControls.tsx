'use client';

import React, { useState } from 'react';
import { EnhancementSettings, DEFAULT_SETTINGS, Preset } from '../lib/image/types';
import { EnhancementSlider } from './EnhancementSlider';
import { PresetSelector } from './PresetSelector';
import {
  RealESRGANScale,
  AIProgressUpdate,
  AIRateLimitState,
  AICapabilities,
} from '../lib/image/ai/types';
import {
  Sun,
  Contrast,
  Palette,
  Sparkles,
  ShieldAlert,
  Sliders,
  RotateCcw,
  Undo,
  Redo,
  Thermometer,
  Layers,
  CircleDot,
  Eye,
  SlidersHorizontal,
  Flame,
  Zap,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface EnhancementControlsProps {
  settings: EnhancementSettings;
  onSettingChange: (key: keyof EnhancementSettings, value: number) => void;
  onApplyPreset: (preset: Preset) => void;
  onReset: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;

  // Phase 4: AI Enhancement Props
  isAIEnhancing?: boolean;
  aiProgress?: AIProgressUpdate | null;
  aiScale?: RealESRGANScale;
  onAIScaleChange?: (scale: RealESRGANScale) => void;
  onStartAIEnhance?: () => void;
  onCancelAIEnhance?: () => void;
  isAIEnhanced?: boolean;
  onResetAIEnhance?: () => void;
  rateLimitState?: AIRateLimitState;
  capabilities?: AICapabilities | null;
}

export const EnhancementControls: React.FC<EnhancementControlsProps> = ({
  settings,
  onSettingChange,
  onApplyPreset,
  onReset,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isAIEnhancing = false,
  aiProgress = null,
  aiScale = 2,
  onAIScaleChange,
  onStartAIEnhance,
  onCancelAIEnhance,
  isAIEnhanced = false,
  onResetAIEnhance,
  rateLimitState,
  capabilities,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'tone' | 'color' | 'detail'>('all');

  // Count active modifications
  const activeCount = Object.keys(DEFAULT_SETTINGS).filter(
    (key) => settings[key as keyof EnhancementSettings] !== DEFAULT_SETTINGS[key as keyof EnhancementSettings]
  ).length;

  const remainingQuota = rateLimitState?.remaining ?? 5;
  const isLimitReached = rateLimitState?.isLimitReached ?? false;

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
      {/* Controls Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Enhancement Controls</h3>
            <p className="text-[11px] text-gray-500">
              {isAIEnhanced ? 'AI Super-Resolution Active' : activeCount > 0 ? `${activeCount} adjustments applied` : 'Ready to adjust'}
            </p>
          </div>
        </div>

        {/* Undo / Redo / Reset Action Group */}
        <div className="flex items-center space-x-1">
          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || isAIEnhancing}
              title="Undo (Ctrl+Z)"
              className={`p-1.5 rounded-lg border transition-colors ${
                canUndo && !isAIEnhancing
                  ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 cursor-pointer'
                  : 'text-gray-300 border-transparent cursor-not-allowed'
              }`}
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
          )}

          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo || isAIEnhancing}
              title="Redo (Ctrl+Y)"
              className={`p-1.5 rounded-lg border transition-colors ${
                canRedo && !isAIEnhancing
                  ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 cursor-pointer'
                  : 'text-gray-300 border-transparent cursor-not-allowed'
              }`}
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0 || isAIEnhancing}
            title="Reset all settings to default"
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 border transition-colors ${
              activeCount > 0 && !isAIEnhancing
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200 cursor-pointer'
                : 'text-gray-300 border-transparent cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center space-x-1 overflow-x-auto bg-slate-50/50">
        {[
          { id: 'all', label: 'All Controls' },
          { id: 'ai', label: '✨ AI Upscale' },
          { id: 'tone', label: 'Tone & Light' },
          { id: 'color', label: 'Color' },
          { id: 'detail', label: 'Clarity' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable Sliders & Controls List */}
      <div className="p-4 space-y-6 max-h-[700px] overflow-y-auto">
        {/* =========================================================================
         * PHASE 4: AI ENHANCEMENT (Real-ESRGAN) SECTION - Clean Light Theme
         * ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'ai') && (
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3.5">
            {/* Header / Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>AI Enhancement</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-mono font-normal">
                      Real-ESRGAN
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Neural super-resolution in your browser
                  </p>
                </div>
              </div>

              {/* Hardware Acceleration Indicator */}
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-mono text-gray-700" title={capabilities?.deviceDescription || 'Hardware Detection'}>
                {capabilities?.hasWebGPU ? (
                  <>
                    <Zap className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">WebGPU</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-700">WASM</span>
                  </>
                )}
              </div>
            </div>

            {/* Scale Factor Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <span>Upscale Factor</span>
                <span className="text-gray-500 font-normal">
                  {aiScale === 2 ? 'Double resolution (2×)' : 'Quadruple resolution (4×)'}
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[2, 4].map((scale) => {
                  const isSelected = aiScale === scale;
                  return (
                    <button
                      key={scale}
                      type="button"
                      disabled={isAIEnhancing}
                      onClick={() => onAIScaleChange?.(scale as RealESRGANScale)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      } ${isAIEnhancing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                      <span>{scale}× Upscale</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rate Limit Status Notice */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px]">
              <span className="text-gray-600">Daily Free Quota:</span>
              <span
                className={`font-mono font-bold ${
                  isLimitReached
                    ? 'text-red-600'
                    : remainingQuota <= 2
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {remainingQuota} of 5 remaining today
              </span>
            </div>

            {/* Active AI Enhancement in Progress State */}
            {isAIEnhancing && (
              <div className="p-3 rounded-lg bg-white border border-blue-300 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-700 flex items-center space-x-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>{aiProgress?.message || 'Processing AI super-resolution...'}</span>
                  </span>
                  <span className="font-mono font-bold text-blue-700">
                    {aiProgress?.progress ?? 0}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${aiProgress?.progress ?? 5}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {aiProgress?.phase === 'downloading'
                      ? 'Downloading model for offline caching...'
                      : 'Running neural inference tile-by-tile...'}
                  </p>

                  {onCancelAIEnhance && (
                    <button
                      type="button"
                      onClick={onCancelAIEnhance}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer px-2 py-0.5 rounded bg-red-50 border border-red-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Rate Limit Reached Warning */}
            {isLimitReached && !isAIEnhancing && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Daily AI Limit Reached (5/5)</p>
                  <p className="text-[11px] text-amber-700">
                    AI enhancement quota resets tomorrow. All standard adjustments, crop, resize, and convert tools remain 100% available.
                  </p>
                </div>
              </div>
            )}

            {/* AI Active Status or Action CTAs */}
            {isAIEnhanced ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center space-x-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Real-ESRGAN {aiScale}× Active</span>
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700">Editable · All controls active</span>
                </div>

                <button
                  type="button"
                  onClick={onResetAIEnhance}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset to Original Resolution</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isAIEnhancing || isLimitReached}
                onClick={onStartAIEnhance}
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
                  isAIEnhancing || isLimitReached
                    ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Enhance with Real-ESRGAN ({aiScale}×)</span>
              </button>
            )}
          </div>
        )}

        {/* Curated 1-Click Presets */}
        {(activeTab === 'all' || activeTab === 'tone') && (
          <PresetSelector currentSettings={settings} onApplyPreset={onApplyPreset} />
        )}

        {/* Section 1: Tone & Exposure */}
        {(activeTab === 'all' || activeTab === 'tone') && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center space-x-2 pb-1 border-b border-gray-200">
              <Sun className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Tone & Light
              </span>
            </div>

            <EnhancementSlider
              id="slider-brightness"
              label="Brightness"
              description="Adjust overall image lightness"
              value={settings.brightness}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<Sun className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('brightness', v)}
              onReset={() => onSettingChange('brightness', 0)}
            />

            <EnhancementSlider
              id="slider-contrast"
              label="Contrast"
              description="Expand tonal range between dark and light"
              value={settings.contrast}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<Contrast className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('contrast', v)}
              onReset={() => onSettingChange('contrast', 0)}
            />

            <EnhancementSlider
              id="slider-exposure"
              label="Exposure"
              description="Photographic camera stop exposure adjustment"
              value={settings.exposure}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<Flame className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('exposure', v)}
              onReset={() => onSettingChange('exposure', 0)}
            />

            <EnhancementSlider
              id="slider-shadows"
              label="Shadows"
              description="Lift deep shadows or enhance blacks"
              value={settings.shadows}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<CircleDot className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('shadows', v)}
              onReset={() => onSettingChange('shadows', 0)}
            />

            <EnhancementSlider
              id="slider-highlights"
              label="Highlights"
              description="Recover blown highlights or brighten whites"
              value={settings.highlights}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('highlights', v)}
              onReset={() => onSettingChange('highlights', 0)}
            />
          </div>
        )}

        {/* Section 2: Color & Mood */}
        {(activeTab === 'all' || activeTab === 'color') && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center space-x-2 pb-1 border-b border-gray-200">
              <Palette className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Color & Mood
              </span>
            </div>

            <EnhancementSlider
              id="slider-saturation"
              label="Saturation"
              description="Vibrancy and color purity"
              value={settings.saturation}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<Palette className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('saturation', v)}
              onReset={() => onSettingChange('saturation', 0)}
            />

            <EnhancementSlider
              id="slider-temperature"
              label="Temperature / Warmth"
              description="Cool blue tones to warm golden sunset hues"
              value={settings.temperature}
              min={-100}
              max={100}
              defaultValue={0}
              icon={<Thermometer className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('temperature', v)}
              onReset={() => onSettingChange('temperature', 0)}
            />

            <EnhancementSlider
              id="slider-vignette"
              label="Vignette"
              description="Subtle optical edge shading to draw eye to center"
              value={settings.vignette}
              min={0}
              max={100}
              defaultValue={0}
              icon={<CircleDot className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('vignette', v)}
              onReset={() => onSettingChange('vignette', 0)}
            />

            <EnhancementSlider
              id="slider-grayscale"
              label="Grayscale"
              description="Convert to black & white monochrome"
              value={settings.grayscale}
              min={0}
              max={100}
              defaultValue={0}
              icon={<Contrast className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('grayscale', v)}
              onReset={() => onSettingChange('grayscale', 0)}
            />

            <EnhancementSlider
              id="slider-sepia"
              label="Sepia"
              description="Nostalgic vintage warm tint"
              value={settings.sepia}
              min={0}
              max={100}
              defaultValue={0}
              icon={<Sliders className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('sepia', v)}
              onReset={() => onSettingChange('sepia', 0)}
            />
          </div>
        )}

        {/* Section 3: Clarity & Details */}
        {(activeTab === 'all' || activeTab === 'detail') && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center space-x-2 pb-1 border-b border-gray-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Clarity & Details
              </span>
            </div>

            <EnhancementSlider
              id="slider-sharpness"
              label="Sharpness"
              description="3x3 Unsharp mask kernel for micro-contrast enhancement"
              value={settings.sharpness}
              min={0}
              max={100}
              defaultValue={0}
              icon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
              onChange={(v) => onSettingChange('sharpness', v)}
              onReset={() => onSettingChange('sharpness', 0)}
            />

            <EnhancementSlider
              id="slider-denoise"
              label="Denoise"
              description="Adaptive edge-preserving bilateral noise smoothing"
              value={settings.denoise}
              min={0}
              max={100}
              defaultValue={0}
              icon={<ShieldAlert className="w-3.5 h-3.5 text-blue-600" />}
              onChange={(v) => onSettingChange('denoise', v)}
              onReset={() => onSettingChange('denoise', 0)}
            />

            <EnhancementSlider
              id="slider-blur"
              label="Blur"
              description="Separable 2-pass box blur for depth or softening"
              value={settings.blur}
              min={0}
              max={100}
              defaultValue={0}
              icon={<Layers className="w-3.5 h-3.5" />}
              onChange={(v) => onSettingChange('blur', v)}
              onReset={() => onSettingChange('blur', 0)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
