'use client';

import { useState } from 'react';
import { GeneratedContent } from '@/types';

interface ContentCardsProps {
  results: GeneratedContent[];
  onCopy: (content: string) => void;
  onFeedback: (contentId: string, liked: boolean) => void;
}

const PLATFORM_CONFIG = {
  instagram: { icon: '📷', color: '#E4405F', name: 'Instagram' },
  linkedin: { icon: '💼', color: '#0A66C2', name: 'LinkedIn' },
  blog: { icon: '📝', color: '#6366F1', name: 'Blog' },
  email: { icon: '📧', color: '#EA4335', name: 'Email' },
  tiktok: { icon: '🎵', color: '#000000', name: 'TikTok' },
  'video-script': { icon: '🎬', color: '#FF0000', name: 'Video Script' },
} as const;

export function ContentCards({
  results,
  onCopy,
  onFeedback,
}: ContentCardsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | null>>({});

  const handleCopy = async (result: GeneratedContent) => {
    onCopy(result.content);
    setCopiedId(result.platform);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (result: GeneratedContent, liked: boolean) => {
    setFeedback((prev) => ({
      ...prev,
      [result.platform]: liked ? 'like' : 'dislike',
    }));
    onFeedback(result.id, liked);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {results.map((result, index) => {
        const config = PLATFORM_CONFIG[result.platform as keyof typeof PLATFORM_CONFIG];
        const isCopied = copiedId === result.platform;
        const userFeedback = feedback[result.platform];

        return (
          <div
            key={result.platform}
            className="bg-white dark:bg-card rounded-[2rem] p-8 border border-outline-variant/40 hover:border-primary/20 hover:shadow-[0_40px_80px_rgba(0,0,0,0.04)] transition-all animate-slide-in"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-[1.25rem] bg-surface-container-low flex items-center justify-center text-2xl"
                  style={{ borderLeft: `3px solid ${config.color}` }}
                >
                  {config.icon}
                </div>
                <h3 className="text-subheading font-semibold">
                  {config.name}
                </h3>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => handleCopy(result)}
                className={`
                  px-3 py-1.5 rounded-xl text-small font-medium transition-all
                  ${
                    isCopied
                      ? 'bg-success text-white'
                      : 'bg-bg-secondary text-text-primary hover:bg-accent hover:text-white hover:shadow-md'
                  }
                `}
              >
                {isCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Content */}
            <div className="bg-bg-secondary rounded-lg p-4 mb-4 max-h-[350px] overflow-y-auto scrollbar-thin">
              <p className="text-body text-text-primary whitespace-pre-wrap">
                {result.content}
              </p>
            </div>

            {/* Voice & Quality Scores */}
            {(result.voiceScore > 0 || result.qualityScore > 0) && (
              <div className="flex items-center gap-3 mb-3">
                {result.voiceScore > 0 && (
                  <div className="flex items-center gap-1.5 bg-primary/5 text-primary rounded-full px-3 py-1 text-xs font-bold">
                    <span>🎤</span>
                    <span>Voice: {result.voiceScore}%</span>
                  </div>
                )}
                {result.qualityScore > 0 && (
                  <div className="flex items-center gap-1.5 bg-success/10 text-success rounded-full px-3 py-1 text-xs font-bold">
                    <span>✓</span>
                    <span>Quality: {result.qualityScore}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            {result.metadata && (
              <div className="flex items-center gap-4 mb-3 text-small text-text-secondary">
                {result.metadata.characterCount && (
                  <span>{result.metadata.characterCount} characters</span>
                )}
                {result.metadata.wordCount && (
                  <span>{result.metadata.wordCount} words</span>
                )}
              </div>
            )}

            {/* Feedback Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-small text-slate-lavender mr-2">
                Rate this:
              </span>
              <button
                onClick={() => handleFeedback(result, true)}
                className={`
                  px-3 py-1.5 rounded-xl text-small font-medium transition-all
                  ${
                    userFeedback === 'like'
                      ? 'bg-success text-white'
                      : 'bg-bg-secondary text-text-primary hover:bg-success/20'
                  }
                `}
              >
                👍 Like
              </button>
              <button
                onClick={() => handleFeedback(result, false)}
                className={`
                  px-3 py-1.5 rounded-xl text-small font-medium transition-all
                  ${
                    userFeedback === 'dislike'
                      ? 'bg-error text-white'
                      : 'bg-bg-secondary text-text-primary hover:bg-error/20'
                  }
                `}
              >
                👎 Dislike
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
