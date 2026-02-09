'use client';

/**
 * Render Progress Component
 *
 * Shows rendering status with progress bar and final result.
 */

import { useState } from 'react';
import type { ReelRenderStatus } from '@/types';

interface RenderProgressProps {
  status: ReelRenderStatus | null;
  isRendering: boolean;
  onBack: () => void;
}

export function RenderProgress({ status, isRendering, onBack }: RenderProgressProps) {
  const [copied, setCopied] = useState(false);

  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const handleCopyLink = async () => {
    if (status?.outputUrl) {
      await navigator.clipboard.writeText(status.outputUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (status?.outputUrl) {
      const a = document.createElement('a');
      a.href = status.outputUrl;
      a.download = 'reel.mp4';
      a.click();
    }
  };

  // Rendering in progress
  if (isRendering || status?.status === 'processing') {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-surface-secondary" />
          <div
            className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"
            style={{
              clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((status?.progress || 0) * 0.0628)}% ${50 - 50 * Math.cos((status?.progress || 0) * 0.0628)}%, 50% 50%)`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-accent">{status?.progress || 0}%</span>
          </div>
        </div>

        <h2 className="text-xl font-medium text-text-primary mb-2">Creating your reel...</h2>
        <p className="text-text-secondary mb-6">
          This may take a few minutes depending on your video length.
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-md mx-auto h-2 bg-surface-secondary rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${status?.progress || 0}%` }}
          />
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-6 text-sm text-text-secondary">
          <StepIndicator
            label="Downloading"
            active={(status?.progress || 0) < 20}
            done={(status?.progress || 0) >= 20}
          />
          <StepIndicator
            label="Processing"
            active={(status?.progress || 0) >= 20 && (status?.progress || 0) < 70}
            done={(status?.progress || 0) >= 70}
          />
          <StepIndicator
            label="Rendering"
            active={(status?.progress || 0) >= 70 && (status?.progress || 0) < 95}
            done={(status?.progress || 0) >= 95}
          />
          <StepIndicator
            label="Uploading"
            active={(status?.progress || 0) >= 95}
            done={(status?.progress || 0) >= 100}
          />
        </div>
      </div>
    );
  }

  // Failed
  if (status?.status === 'failed') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-text-primary mb-2">Render Failed</h2>
        <p className="text-text-secondary mb-6">
          {status?.errorMessage || 'Something went wrong. Please try again.'}
        </p>
        <button onClick={onBack} className="btn-primary">
          Go Back and Try Again
        </button>
      </div>
    );
  }

  // Completed
  if (status?.status === 'completed' && status?.outputUrl) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-text-primary mb-2">Your Reel is Ready!</h2>
          <p className="text-text-secondary">
            Duration: {formatDuration(status.outputDurationMs)}
          </p>
        </div>

        {/* Video preview */}
        <div className="max-w-md mx-auto">
          <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
            <video
              src={status.outputUrl}
              poster={status.thumbnailUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleDownload}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>

          <button
            onClick={handleCopyLink}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Create another */}
        <div className="text-center pt-4 border-t border-border">
          <a href="/app/reels" className="text-sm text-accent hover:underline">
            Create another reel
          </a>
        </div>
      </div>
    );
  }

  // Initial state
  return (
    <div className="text-center py-12">
      <p className="text-text-secondary">Preparing to render...</p>
    </div>
  );
}

function StepIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`
          w-2 h-2 rounded-full
          ${done ? 'bg-green-500' : active ? 'bg-accent animate-pulse' : 'bg-surface-secondary'}
        `}
      />
      <span className={done || active ? 'text-text-primary' : ''}>{label}</span>
    </div>
  );
}
