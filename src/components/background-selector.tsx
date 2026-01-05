/**
 * Background Selector Component
 * Allows users to select carousel background type:
 * - Solid colors
 * - Gradient presets
 * - Upload custom image
 * - AI-generated background
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Image,
  Sparkles,
  Upload,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { BackgroundConfig, BackgroundPreset, PresetBackground } from '@/types';

export interface BackgroundSelectorProps {
  value: BackgroundConfig;
  onChange: (config: BackgroundConfig) => void;
  contentSummary?: string;
  className?: string;
}

type TabType = 'presets' | 'upload' | 'ai';

const PRESET_PREVIEWS: Record<PresetBackground, { gradient: string; label: string; description: string }> = {
  'tweet-style': { gradient: 'from-black to-zinc-900', label: 'Tweet Style', description: 'Twitter/X post card' },
  'simple-black': { gradient: 'from-black to-black', label: 'Simple Black', description: 'Clean black' },
  'simple-white': { gradient: 'from-white to-gray-50', label: 'Simple White', description: 'Clean white' },
};

export function BackgroundSelector({
  value,
  onChange,
  contentSummary,
  className = '',
}: BackgroundSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [presets, setPresets] = useState<BackgroundPreset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await api.images.getBackgroundPresets();
      if (response.success && response.data?.presets) {
        setPresets(response.data.presets);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handlePresetSelect = (presetId: PresetBackground) => {
    onChange({
      type: 'preset',
      presetId,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await api.images.uploadBackground(file);
      if (response.success && response.data?.background) {
        setUploadedUrl(response.data.background.publicUrl);
        onChange({
          type: 'image',
          imageUrl: response.data.background.publicUrl,
          overlay: { color: '#000000', opacity: 0.4 },
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAIGenerate = () => {
    setGeneratingAI(true);
    // AI generation happens during carousel creation, we just set the config
    onChange({
      type: 'ai',
      aiPromptHint: aiPrompt || undefined,
    });
    setGeneratingAI(false);
  };

  const handleSolidSelect = () => {
    onChange({ type: 'solid' });
  };

  const tabs = [
    { id: 'presets' as const, label: 'Presets', icon: Palette },
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'ai' as const, label: 'AI Generate', icon: Sparkles },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium text-zinc-300">
        Background Style
      </label>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-800 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            {/* Solid color option */}
            <button
              onClick={handleSolidSelect}
              className={`w-full p-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                value.type === 'solid'
                  ? 'border-purple-500 bg-zinc-800'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-700" />
              <div className="text-left">
                <div className="font-medium text-white">Solid Dark</div>
                <div className="text-xs text-zinc-400">Simple dark background</div>
              </div>
              {value.type === 'solid' && (
                <Check className="ml-auto text-purple-500" size={20} />
              )}
            </button>

            {/* Preset grid */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRESET_PREVIEWS).map(([id, preview]) => (
                <button
                  key={id}
                  onClick={() => handlePresetSelect(id as PresetBackground)}
                  className={`p-2 rounded-lg border-2 transition-colors ${
                    value.type === 'preset' && value.presetId === id
                      ? 'border-purple-500'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div
                    className={`w-full h-16 rounded bg-gradient-to-br ${preview.gradient} mb-2`}
                  />
                  <div className="text-xs text-zinc-300">{preview.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {uploadedUrl ? (
              <div className="space-y-3">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                  <img
                    src={uploadedUrl}
                    alt="Uploaded background"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-medium">Preview with overlay</span>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  Choose different image
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-zinc-600 hover:border-zinc-500 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin text-zinc-400" size={32} />
                    <span className="text-sm text-zinc-400">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Image className="text-zinc-400" size={32} />
                    <span className="text-sm text-zinc-400">
                      Click to upload background image
                    </span>
                    <span className="text-xs text-zinc-500">
                      JPEG, PNG, or WebP (max 10MB)
                    </span>
                  </>
                )}
              </button>
            )}

            {value.type === 'image' && (
              <div className="p-3 bg-zinc-800 rounded-lg">
                <label className="block text-xs text-zinc-400 mb-2">
                  Overlay Opacity
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(value.overlay?.opacity || 0.4) * 100}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      overlay: {
                        color: value.overlay?.color || '#000000',
                        opacity: parseInt(e.target.value) / 100,
                      },
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>Light</span>
                  <span>Dark</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Generate Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-800/50">
              <div className="flex items-start gap-3">
                <Sparkles className="text-purple-400 mt-0.5" size={20} />
                <div>
                  <div className="font-medium text-white mb-1">
                    AI-Generated Background
                  </div>
                  <p className="text-sm text-zinc-400">
                    DALL-E will create a custom background based on your content.
                    The background will be optimized for text readability.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Style hint (optional)
              </label>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., abstract tech, nature vibes, minimalist..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleAIGenerate}
              disabled={generatingAI}
              className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                value.type === 'ai'
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              {value.type === 'ai' ? (
                <>
                  <Check size={18} />
                  AI Background Selected
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Use AI Background
                </>
              )}
            </button>

            {contentSummary && (
              <p className="text-xs text-zinc-500">
                AI will use your content to generate a relevant background.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Current selection indicator */}
      <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
        Selected:{' '}
        <span className="text-zinc-300">
          {value.type === 'solid' && 'Solid Dark'}
          {value.type === 'preset' && PRESET_PREVIEWS[value.presetId!]?.label}
          {value.type === 'image' && 'Custom Upload'}
          {value.type === 'ai' && 'AI Generated'}
          {value.type === 'gradient' && 'Custom Gradient'}
        </span>
      </div>
    </div>
  );
}

export default BackgroundSelector;
