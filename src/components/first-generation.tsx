'use client';

import { useState } from 'react';
import { InputType, Platform } from '@/types';

interface FirstGenerationProps {
  onGenerate: (input: string, inputType: InputType, platforms: Platform[]) => void;
  generating: boolean;
}

const ALL_PLATFORMS: Platform[] = [
  'instagram',
  'linkedin',
  'blog',
  'email',
  'tiktok',
  'video-script',
];

export function FirstGeneration({
  onGenerate,
  generating,
}: FirstGenerationProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<InputType>('text');

  const handleGenerate = () => {
    if (!input.trim()) return;
    onGenerate(input, inputType, ALL_PLATFORMS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  return (
    <div className="card max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-display text-3xl mb-2">What do you want to create?</h2>
        <p className="text-body text-text-secondary">
          Describe your topic, and we will generate content for all platforms
        </p>
      </div>

      {/* Input Type Tabs */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-bg-secondary rounded-lg">
        <button
          onClick={() => setInputType('text')}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'text'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          ✍️ Text
        </button>
        <button
          onClick={() => setInputType('audio')}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'audio'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          🎤 Voice
        </button>
        <button
          onClick={() => setInputType('video')}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'video'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          🎥 Video
        </button>
      </div>

      {/* Input Area */}
      {inputType === 'text' && (
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="I need content about..."
          className="w-full h-40 px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors resize-none text-body"
          disabled={generating}
        />
      )}

      {inputType === 'audio' && (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎤</div>
          <p className="text-body text-text-secondary mb-4">
            Voice input coming soon
          </p>
          <p className="text-small text-text-secondary">
            For now, please use text input
          </p>
        </div>
      )}

      {inputType === 'video' && (
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎥</div>
          <p className="text-body text-text-secondary mb-4">
            Video input coming soon
          </p>
          <p className="text-small text-text-secondary">
            For now, please use text input
          </p>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-small text-text-secondary mt-2 mb-6">
        {inputType === 'text' && 'Press ⌘+Enter to generate'}
      </p>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !input.trim() || inputType !== 'text'}
        className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </span>
        ) : (
          'Generate Content'
        )}
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
        <p className="text-small text-accent text-center">
          ✨ This usually takes 30-60 seconds
        </p>
      </div>
    </div>
  );
}
