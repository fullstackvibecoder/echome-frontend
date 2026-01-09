/**
 * Background Selector Component
 * Allows users to select carousel design preset:
 * - Design presets (default, minimal, bold)
 * - Upload custom image (deprecated but supported)
 * - AI-generated background (deprecated but supported)
 */

'use client';

import React, { useState, useRef } from 'react';
import {
  Palette,
  Image,
  Sparkles,
  Upload,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { DesignPreset, BackgroundConfig } from '@/types';

export interface BackgroundSelectorProps {
  value: { designPreset?: DesignPreset; type?: string; imageUrl?: string };
  onChange: (config: { designPreset: DesignPreset } | BackgroundConfig) => void;
  contentSummary?: string;
  className?: string;
}

type TabType = 'presets' | 'upload' | 'ai';

const DESIGN_PRESET_PREVIEWS: Record<DesignPreset, { gradient: string; label: string; description: string }> = {
  'auto': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'Auto (Smart)', description: 'Auto-select best template per slide' },
  'bold-statement': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'Bold Statement', description: 'Minimal, punchy hooks' },
  'data-point': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'Data Point', description: 'Stats + context' },
  'insight-card': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'Insight Card', description: 'Quotable insights' },
  'story-lesson': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'Story/Lesson', description: 'Personal moments' },
  'action-cta': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'Action CTA', description: 'Calls to action' },
  'list-steps': { gradient: 'from-[#1a1a2e] to-[#0F3460]', label: 'List/Steps', description: 'Numbered steps' },
  'tweet-style': { gradient: 'from-[#15202b] to-[#1a1a2e]', label: 'Tweet Style', description: 'Twitter/X post card' },
};

export function BackgroundSelector({
  value,
  onChange,
  contentSummary,
  className = '',
}: BackgroundSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current design preset (map legacy values)
  const getCurrentPreset = (): DesignPreset => {
    if (value.designPreset) return value.designPreset;
    // Map legacy presetId to designPreset
    if (value.type === 'preset') {
      const legacyPreset = (value as BackgroundConfig).presetId;
      if (legacyPreset === 'tweet-style') return 'tweet-style';
      return 'auto';
    }
    return 'auto';
  };

  const handlePresetSelect = (preset: DesignPreset) => {
    onChange({ designPreset: preset });
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
            {/* Preset grid */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DESIGN_PRESET_PREVIEWS).map(([id, preview]) => (
                <button
                  key={id}
                  onClick={() => handlePresetSelect(id as DesignPreset)}
                  className={`p-2 rounded-lg border-2 transition-colors ${
                    getCurrentPreset() === id
                      ? 'border-purple-500'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div
                    className={`w-full h-16 rounded bg-gradient-to-br ${preview.gradient} mb-2`}
                  />
                  <div className="text-xs text-zinc-300">{preview.label}</div>
                  <div className="text-[10px] text-zinc-500">{preview.description}</div>
                </button>
              ))}
            </div>

            {/* Link to examples page */}
            <a
              href="/examples#carousel-templates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 mt-2"
            >
              See all template examples
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
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
                <p className="text-xs text-zinc-400">
                  A dark overlay will be applied automatically to ensure text readability.
                </p>
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
          {value.type === 'image' ? 'Custom Upload' :
           value.type === 'ai' ? 'AI Generated' :
           DESIGN_PRESET_PREVIEWS[getCurrentPreset()]?.label}
        </span>
      </div>
    </div>
  );
}

export default BackgroundSelector;
