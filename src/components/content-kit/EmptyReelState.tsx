'use client';

/**
 * EmptyReelState Component
 *
 * Empty state shown when no reel content has been generated yet.
 * Provides button to generate AI reel text content.
 */

interface EmptyReelStateProps {
  onGenerate: () => void;
  isLoading?: boolean;
  hasTranscript?: boolean;
}

export function EmptyReelState({
  onGenerate,
  isLoading = false,
  hasTranscript = true,
}: EmptyReelStateProps) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
      {/* Icon */}
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
        <span className="text-3xl">🎬</span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Create a Video Reel
      </h3>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
        {hasTranscript ? (
          <>
            Generate AI text overlays (hook, segments, CTA) based on your video content,
            then create a short-form reel with beat-synced transitions.
          </>
        ) : (
          <>
            Upload a video with audio to generate reel content.
            The AI needs a transcript to create meaningful text overlays.
          </>
        )}
      </p>

      {/* Features */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <span className="text-accent">✓</span>
          <span>AI-generated hooks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-accent">✓</span>
          <span>Segment overlays</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-accent">✓</span>
          <span>Call-to-action text</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-accent">✓</span>
          <span>Template suggestions</span>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isLoading || !hasTranscript}
        className={`
          px-6 py-3 rounded-lg text-sm font-medium transition-all
          ${hasTranscript
            ? 'bg-accent text-white hover:bg-accent/90 disabled:opacity-50'
            : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
          }
        `}
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block mr-2">⏳</span>
            Generating Reel Content...
          </>
        ) : hasTranscript ? (
          <>
            ✨ Generate Reel Content
          </>
        ) : (
          <>
            Transcript Required
          </>
        )}
      </button>

      {/* Helper text */}
      {!hasTranscript && (
        <p className="mt-4 text-xs text-text-secondary">
          Your video needs audio content to generate text overlays
        </p>
      )}
    </div>
  );
}

export default EmptyReelState;
