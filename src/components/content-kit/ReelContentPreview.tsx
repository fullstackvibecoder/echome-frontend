'use client';

/**
 * ReelContentPreview Component
 *
 * Preview of AI-generated reel text content before creating a reel.
 * Shows hook, segment overlays, and CTA with option to create reel.
 */

import { ReelContentStructure } from '@/types';

interface ReelContentPreviewProps {
  content: ReelContentStructure;
  onCreateReel: () => void;
  onRegenerate?: () => void;
  isCreating?: boolean;
}

export function ReelContentPreview({
  content,
  onCreateReel,
  onRegenerate,
  isCreating = false,
}: ReelContentPreviewProps) {
  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'top': return 'Top';
      case 'center': return 'Center';
      case 'bottom': return 'Bottom';
      default: return position;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'top': return 'bg-blue-500/10 text-blue-400';
      case 'center': return 'bg-purple-500/10 text-purple-400';
      case 'bottom': return 'bg-green-500/10 text-green-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Reel Text Content</h3>
          <p className="text-sm text-text-secondary mt-1">
            AI-generated overlays for your video reel
          </p>
        </div>

        {content.suggestedTemplate && (
          <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
            Suggested: {content.suggestedTemplate.replace(/-/g, ' ')}
          </div>
        )}
      </div>

      {/* Hook Text */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-text-secondary">Hook</span>
          <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">
            First 2-3 seconds
          </span>
        </div>
        <div className="p-4 rounded-lg bg-bg-tertiary border border-border">
          <p className="text-lg font-semibold text-text-primary">
            {content.hookText}
          </p>
        </div>
      </div>

      {/* Segment Overlays */}
      {content.segmentOverlays.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-text-secondary mb-3">
            Segment Overlays ({content.segmentOverlays.length})
          </div>
          <div className="space-y-2">
            {content.segmentOverlays.map((overlay, index) => (
              <div
                key={overlay.segmentId}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary border border-border"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-text-secondary uppercase">
                      {overlay.segmentId.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPositionColor(overlay.position)}`}>
                      {getPositionLabel(overlay.position)}
                    </span>
                  </div>
                  <p className="text-text-primary font-medium truncate">
                    {overlay.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Text */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-text-secondary">Call to Action</span>
          <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
            End screen
          </span>
        </div>
        <div className="p-4 rounded-lg bg-bg-tertiary border border-border">
          <p className="text-lg font-semibold text-text-primary">
            {content.ctaText}
          </p>
        </div>
      </div>

      {/* Caption Script (if available) */}
      {content.captionScript && (
        <div className="mb-6">
          <div className="text-sm font-medium text-text-secondary mb-2">
            Caption Script (optional voiceover)
          </div>
          <div className="p-4 rounded-lg bg-bg-tertiary border border-border">
            <p className="text-sm text-text-secondary leading-relaxed">
              {content.captionScript}
            </p>
          </div>
        </div>
      )}

      {/* Generated timestamp */}
      <div className="text-xs text-text-secondary mb-6">
        Generated {formatDate(content.generatedAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCreateReel}
          disabled={isCreating}
          className="flex-1 px-6 py-3 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Creating Reel...
            </>
          ) : (
            <>
              🎬 Create Reel with This Content
            </>
          )}
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isCreating}
            className="px-4 py-3 rounded-lg text-sm font-medium bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default ReelContentPreview;
