'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { ImageUploader } from '../components/ImageUploader';
import { ImagePreview } from '../components/ImagePreview';
import { EnhancementControls } from '../components/EnhancementControls';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { DownloadModal } from '../components/DownloadModal';
import {
  EnhancementSettings,
  DEFAULT_SETTINGS,
  ImageMetadata,
  ViewMode,
  Preset,
} from '../lib/image/types';
import {
  RealESRGANScale,
  AIProgressUpdate,
  AIRateLimitState,
  AICapabilities,
} from '../lib/image/ai/types';
import { createPreviewCanvas, defaultImageProcessor } from '../lib/image/processor';
import { runRealESRGAN } from '../lib/image/ai/inference';
import { detectAICapabilities } from '../lib/image/ai/capabilities';
import { getAIRateLimitState } from '../lib/image/ai/rate-limit';
import { Download, Sparkles } from 'lucide-react';

export default function Home() {
  // Image State
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);

  // Settings & History State
  const [settings, setSettings] = useState<EnhancementSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<EnhancementSettings[]>([DEFAULT_SETTINGS]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // View & UI State
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState<boolean>(false);

  // Phase 4: AI Enhancement State
  const [aiScale, setAIScale] = useState<RealESRGANScale>(2);
  const [isAIEnhancing, setIsAIEnhancing] = useState<boolean>(false);
  const [aiProgress, setAIProgress] = useState<AIProgressUpdate | null>(null);
  const [isAIEnhanced, setIsAIEnhanced] = useState<boolean>(false);
  const [aiEnhancedCanvas, setAiEnhancedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [rateLimitState, setRateLimitState] = useState<AIRateLimitState>(() => getAIRateLimitState());
  const [capabilities, setCapabilities] = useState<AICapabilities | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  // Canvases
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [enhancedCanvas, setEnhancedCanvas] = useState<HTMLCanvasElement | null>(null);
  const rawPreviewDataRef = useRef<ImageData | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Detect capabilities on mount
  useEffect(() => {
    detectAICapabilities().then(setCapabilities);
  }, []);

  // When a new image is loaded
  const handleImageLoaded = (
    image: HTMLImageElement,
    _file: File | null,
    meta: ImageMetadata
  ) => {
    // Abort any ongoing AI enhancement
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }

    setSourceImage(image);
    setMetadata(meta);
    setSettings(DEFAULT_SETTINGS);
    setHistory([DEFAULT_SETTINGS]);
    setHistoryIndex(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsAIEnhanced(false);
    setIsAIEnhancing(false);
    setAIProgress(null);
    setAiEnhancedCanvas(null);
    setRateLimitState(getAIRateLimitState());

    // Generate preview canvas (proxy size for 60fps real-time editing)
    const { canvas: origCanvas, ctx: origCtx, width, height } = createPreviewCanvas(image, 1400);
    const rawData = origCtx.getImageData(0, 0, width, height);
    rawPreviewDataRef.current = rawData;

    const enhCanvas = document.createElement('canvas');
    enhCanvas.width = width;
    enhCanvas.height = height;
    const enhCtx = enhCanvas.getContext('2d')!;
    enhCtx.putImageData(rawData, 0, 0);

    setOriginalCanvas(origCanvas);
    setEnhancedCanvas(enhCanvas);
  };

  // Re-process image when settings change (Throttle via requestAnimationFrame)
  const processPreview = useCallback((currentSettings: EnhancementSettings) => {
    if (!rawPreviewDataRef.current || !enhancedCanvas || isAIEnhanced) return;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }

    animFrameIdRef.current = requestAnimationFrame(() => {
      if (!rawPreviewDataRef.current || !enhancedCanvas) return;
      const rawData = rawPreviewDataRef.current;
      const processed = defaultImageProcessor.process(rawData, currentSettings);

      const ctx = enhancedCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(processed, 0, 0);
        // Trigger re-render of preview
        setEnhancedCanvas((prev) => {
          if (!prev) return null;
          const clone = document.createElement('canvas');
          clone.width = prev.width;
          clone.height = prev.height;
          clone.getContext('2d')?.drawImage(prev, 0, 0);
          return clone;
        });
      }
    });
  }, [enhancedCanvas, isAIEnhanced]);

  // Handle single setting change
  const handleSettingChange = (key: keyof EnhancementSettings, value: number) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      processPreview(next);
      return next;
    });

    // Update history after short throttle
    pushToHistory({ ...settings, [key]: value });
  };

  // Apply Preset
  const handleApplyPreset = (preset: Preset) => {
    const next: EnhancementSettings = {
      ...DEFAULT_SETTINGS,
      ...preset.settings,
    };
    setSettings(next);
    processPreview(next);
    pushToHistory(next);
  };

  // Reset all settings
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    processPreview(DEFAULT_SETTINGS);
    pushToHistory(DEFAULT_SETTINGS);
    setViewMode('split');
  };

  // Push to history for undo/redo
  const pushToHistory = (newSettings: EnhancementSettings) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newSettings];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevSettings = history[prevIndex];
      setHistoryIndex(prevIndex);
      setSettings(prevSettings);
      processPreview(prevSettings);
    }
  }, [historyIndex, history, processPreview]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextSettings = history[nextIndex];
      setHistoryIndex(nextIndex);
      setSettings(nextSettings);
      processPreview(nextSettings);
    }
  }, [historyIndex, history, processPreview]);

  // Phase 4: Start AI Enhancement (Real-ESRGAN)
  const handleStartAIEnhance = async () => {
    if (!sourceImage || isAIEnhancing) return;

    const controller = new AbortController();
    aiAbortControllerRef.current = controller;
    setIsAIEnhancing(true);

    try {
      const outCanvas = await runRealESRGAN(sourceImage, {
        scale: aiScale,
        onProgress: (update) => setAIProgress(update),
        abortSignal: controller.signal,
      });

      setAiEnhancedCanvas(outCanvas);
      setIsAIEnhanced(true);
      setRateLimitState(getAIRateLimitState());

      // Update enhanced canvas preview
      setEnhancedCanvas(outCanvas);
      setViewMode('split');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled intentionally
        console.log('AI enhancement cancelled by user.');
      } else {
        const msg = err instanceof Error ? err.message : 'AI Enhancement failed.';
        alert(msg);
      }
    } finally {
      setIsAIEnhancing(false);
      aiAbortControllerRef.current = null;
    }
  };

  // Cancel running AI enhancement
  const handleCancelAIEnhance = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      aiAbortControllerRef.current = null;
    }
    setIsAIEnhancing(false);
    setAIProgress(null);
  };

  // Reset AI Enhancement
  const handleResetAIEnhance = () => {
    if (!sourceImage) return;
    setIsAIEnhanced(false);
    setAiEnhancedCanvas(null);

    // Re-create preview canvas
    const { canvas: origCanvas, ctx: origCtx, width, height } = createPreviewCanvas(sourceImage, 1400);
    const rawData = origCtx.getImageData(0, 0, width, height);
    rawPreviewDataRef.current = rawData;

    const enhCanvas = document.createElement('canvas');
    enhCanvas.width = width;
    enhCanvas.height = height;
    const enhCtx = enhCanvas.getContext('2d')!;
    enhCtx.putImageData(rawData, 0, 0);

    setOriginalCanvas(origCanvas);
    setEnhancedCanvas(enhCanvas);
    processPreview(settings);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-gray-900 selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <Header
        hasImage={!!sourceImage}
        onNewImageClick={() => {
          if (aiAbortControllerRef.current) {
            aiAbortControllerRef.current.abort();
            aiAbortControllerRef.current = null;
          }
          setSourceImage(null);
          setMetadata(null);
          setOriginalCanvas(null);
          setEnhancedCanvas(null);
          setAiEnhancedCanvas(null);
          setIsAIEnhanced(false);
          setIsAIEnhancing(false);
        }}
        onResetClick={handleReset}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!sourceImage ? (
          /* Empty / Upload State */
          <div className="flex-1 flex items-center justify-center">
            <ImageUploader onImageLoaded={handleImageLoaded} />
          </div>
        ) : (
          /* Active Image Editing Studio */
          <div className="flex-1 flex flex-col space-y-4">
            {/* Top Toolbar: View Switcher & Export CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                zoom={zoom}
                onZoomChange={setZoom}
                onResetZoom={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                isHoldingOriginal={isHoldingOriginal}
                onHoldStart={() => setIsHoldingOriginal(true)}
                onHoldEnd={() => setIsHoldingOriginal(false)}
              />

              <button
                onClick={() => setIsDownloadOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center justify-center space-x-2 cursor-pointer flex-shrink-0"
              >
                {isAIEnhanced ? (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Download Real-ESRGAN {aiScale}× Image</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Enhanced Image</span>
                  </>
                )}
              </button>
            </div>

            {/* Main Studio Grid: Left Canvas Preview / Right Controls Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Comparison Canvas */}
              <div className="lg:col-span-8 flex flex-col">
                <ImagePreview
                  originalCanvas={originalCanvas}
                  enhancedCanvas={enhancedCanvas}
                  metadata={metadata}
                  viewMode={viewMode}
                  zoom={zoom}
                  pan={pan}
                  isHoldingOriginal={isHoldingOriginal}
                  isAIEnhanced={isAIEnhanced}
                  aiScale={aiScale}
                />
              </div>

              {/* Right Column: Enhancement Controls Panel */}
              <div className="lg:col-span-4">
                <EnhancementControls
                  settings={settings}
                  onSettingChange={handleSettingChange}
                  onApplyPreset={handleApplyPreset}
                  onReset={handleReset}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  isAIEnhancing={isAIEnhancing}
                  aiProgress={aiProgress}
                  aiScale={aiScale}
                  onAIScaleChange={setAIScale}
                  onStartAIEnhance={handleStartAIEnhance}
                  onCancelAIEnhance={handleCancelAIEnhance}
                  isAIEnhanced={isAIEnhanced}
                  onResetAIEnhance={handleResetAIEnhance}
                  rateLimitState={rateLimitState}
                  capabilities={capabilities}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* High-Resolution Export Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        sourceImage={sourceImage}
        settings={settings}
        metadata={metadata}
        isAIEnhanced={isAIEnhanced}
        aiEnhancedCanvas={aiEnhancedCanvas}
        aiScale={aiScale}
      />
    </div>
  );
}
