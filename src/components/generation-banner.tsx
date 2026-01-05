'use client';

/**
 * Generation Banner Component
 *
 * Floating banner shown across all pages when content generation is in progress.
 * Allows users to navigate away and still see progress.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGenerationProgress, GENERATION_STEPS, mapStepToIndex } from '@/hooks/useGenerationProgress';
import {
  showCompletionNotification,
  showErrorNotification,
  isDocumentHidden,
} from '@/lib/notifications';

// localStorage key for tracking active generation
const ACTIVE_GENERATION_KEY = 'activeGeneration';

interface ActiveGeneration {
  requestId: string;
  startedAt: number;
}

/**
 * Get active generation from localStorage
 */
function getActiveGeneration(): ActiveGeneration | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(ACTIVE_GENERATION_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Set active generation in localStorage
 */
export function setActiveGeneration(requestId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    ACTIVE_GENERATION_KEY,
    JSON.stringify({
      requestId,
      startedAt: Date.now(),
    })
  );
}

/**
 * Clear active generation from localStorage
 */
export function clearActiveGeneration(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_GENERATION_KEY);
}

/**
 * Hook to sync active generation state with localStorage
 */
export function useActiveGeneration() {
  const [activeGeneration, setActiveGenerationState] = useState<ActiveGeneration | null>(null);

  useEffect(() => {
    // Check on mount
    setActiveGenerationState(getActiveGeneration());

    // Listen for storage changes (from other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_GENERATION_KEY) {
        setActiveGenerationState(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    activeGeneration,
    setActiveGeneration: (requestId: string) => {
      setActiveGeneration(requestId);
      setActiveGenerationState({ requestId, startedAt: Date.now() });
    },
    clearActiveGeneration: () => {
      clearActiveGeneration();
      setActiveGenerationState(null);
    },
  };
}

interface GenerationBannerProps {
  className?: string;
}

export function GenerationBanner({ className = '' }: GenerationBannerProps) {
  const { activeGeneration, clearActiveGeneration: clearActive } = useActiveGeneration();
  const { progress, isConnected, isComplete, hasError } = useGenerationProgress(
    activeGeneration?.requestId ?? null
  );

  // Show notification when complete (if tab is hidden)
  useEffect(() => {
    if (isComplete && isDocumentHidden()) {
      showCompletionNotification();
      clearActive();
    } else if (isComplete) {
      // Clear immediately if user is viewing the page
      clearActive();
    }
  }, [isComplete, clearActive]);

  // Show notification on error
  useEffect(() => {
    if (hasError && isDocumentHidden()) {
      showErrorNotification();
      clearActive();
    } else if (hasError) {
      clearActive();
    }
  }, [hasError, clearActive]);

  // Don't render if no active generation or if complete/error
  if (!activeGeneration || isComplete || hasError) {
    return null;
  }

  const currentStepIndex = progress ? mapStepToIndex(progress.step) : 0;
  const currentStep = GENERATION_STEPS[currentStepIndex] || GENERATION_STEPS[0];
  const percent = progress?.percent ?? 5;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-bg-secondary rounded-xl shadow-lg
        border border-border-primary overflow-hidden max-w-sm ${className}`}
    >
      {/* Progress bar */}
      <div className="h-1 bg-bg-tertiary">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Spinner */}
          <div className="w-10 h-10 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          </div>

          {/* Status */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">
              Generating content...
            </p>
            <p className="text-sm text-text-secondary truncate">
              {progress?.message || currentStep.description}
            </p>
          </div>

          {/* Connection indicator */}
          {!isConnected && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Reconnecting..." />
          )}

          {/* View link */}
          <Link
            href="/app"
            className="text-accent text-sm font-medium hover:underline whitespace-nowrap"
          >
            View
          </Link>
        </div>

        {/* Step indicators */}
        <div className="mt-3 flex gap-1.5">
          {GENERATION_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index < currentStepIndex
                  ? 'bg-accent'
                  : index === currentStepIndex
                  ? 'bg-accent animate-pulse'
                  : 'bg-bg-tertiary'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default GenerationBanner;
