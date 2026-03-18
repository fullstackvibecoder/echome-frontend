'use client';

/**
 * Generation Banner Component
 *
 * Expandable floating drawer shown across all pages when content generation
 * is in progress. Collapsed pill by default, expands to show full stage pipeline.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useGenerationProgress, GENERATION_STEPS, VIDEO_GENERATION_STEPS, mapStepToIndex, isVideoStep } from '@/hooks/useGenerationProgress';
import {
  showCompletionNotification,
  showErrorNotification,
  isDocumentHidden,
} from '@/lib/notifications';
import { ChevronUp, Minus, X, Check, Loader2, ExternalLink } from 'lucide-react';

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
  // Dispatch a custom event so the banner picks it up in the same tab
  window.dispatchEvent(new Event('activeGenerationChanged'));
}

/**
 * Clear active generation from localStorage
 */
export function clearActiveGeneration(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_GENERATION_KEY);
  window.dispatchEvent(new Event('activeGenerationChanged'));
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

    // Listen for same-tab changes
    const handleCustomEvent = () => {
      setActiveGenerationState(getActiveGeneration());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('activeGenerationChanged', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('activeGenerationChanged', handleCustomEvent);
    };
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

// Max age for a generation before we consider it stale (3 minutes)
const MAX_GENERATION_AGE_MS = 3 * 60 * 1000;
// Time to wait for SSE connection before clearing (10 seconds)
const SSE_CONNECTION_TIMEOUT_MS = 10 * 1000;
// Auto-dismiss completion state after 8 seconds
const COMPLETION_DISMISS_MS = 8 * 1000;

export function GenerationBanner({ className = '' }: GenerationBannerProps) {
  const { activeGeneration, clearActiveGeneration: clearActive } = useActiveGeneration();
  const { progress, isConnected, isComplete, hasError } = useGenerationProgress(
    activeGeneration?.requestId ?? null
  );
  const [shouldHide, setShouldHide] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimestamps = useRef<Map<number, number>>(new Map());

  // Auto-clear stale generations (older than MAX_GENERATION_AGE_MS)
  useEffect(() => {
    if (activeGeneration && activeGeneration.startedAt) {
      const age = Date.now() - activeGeneration.startedAt;
      if (age > MAX_GENERATION_AGE_MS) {
        console.log('Clearing stale generation banner (too old)');
        clearActive();
        setShouldHide(true);
      }
    }
  }, [activeGeneration, clearActive]);

  // Auto-clear if SSE doesn't connect within timeout
  useEffect(() => {
    if (!activeGeneration) return;

    const timer = setTimeout(() => {
      if (!isConnected && !progress) {
        console.log('Clearing generation banner (SSE connection timeout)');
        clearActive();
        setShouldHide(true);
      }
    }, SSE_CONNECTION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [activeGeneration, isConnected, progress, clearActive]);

  // Track step timestamps for elapsed time display
  useEffect(() => {
    if (!progress) return;
    const isVideo = isVideoStep(progress.step);
    const stepIdx = mapStepToIndex(progress.step, isVideo);
    if (!stepTimestamps.current.has(stepIdx)) {
      stepTimestamps.current.set(stepIdx, Date.now());
    }
  }, [progress]);

  // Show completion state, then auto-dismiss
  useEffect(() => {
    if (isComplete) {
      if (isDocumentHidden()) {
        showCompletionNotification();
      }
      setShowCompletion(true);
      setIsExpanded(false);

      completionTimerRef.current = setTimeout(() => {
        clearActive();
        setShouldHide(true);
        setShowCompletion(false);
      }, COMPLETION_DISMISS_MS);

      return () => {
        if (completionTimerRef.current) {
          clearTimeout(completionTimerRef.current);
        }
      };
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

  // Reset state when a new generation starts
  useEffect(() => {
    if (activeGeneration) {
      setShouldHide(false);
      setShowCompletion(false);
      stepTimestamps.current = new Map();
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    }
  }, [activeGeneration?.requestId]);

  const handleDismiss = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
    }
    clearActive();
    setShouldHide(true);
    setShowCompletion(false);
    setIsExpanded(false);
  }, [clearActive]);

  // Don't render if no active generation, error, or manually hidden
  if (!activeGeneration || hasError || (shouldHide && !showCompletion)) {
    return null;
  }

  // Completion state
  if (showCompletion) {
    return (
      <div
        className={`fixed bottom-20 right-6 z-50 bg-bg-secondary rounded-xl shadow-lg
          border border-green-500/30 overflow-hidden max-w-sm animate-in slide-in-from-bottom-2 ${className}`}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-400">Content kit ready!</p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <Link
            href={`/app/content-kit/${activeGeneration.requestId}`}
            className="mt-2 flex items-center gap-1.5 text-sm text-accent hover:underline"
            onClick={handleDismiss}
          >
            View Your Content
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Active generation — compute step data
  const isVideo = progress ? isVideoStep(progress.step) : false;
  const steps = isVideo ? VIDEO_GENERATION_STEPS : GENERATION_STEPS;
  const currentStepIndex = progress ? mapStepToIndex(progress.step, isVideo) : 0;
  const percent = progress?.percent ?? 5;
  const statusText = progress?.message || steps[currentStepIndex]?.description || 'Processing...';

  // Format elapsed time for a step
  const formatElapsed = (stepIdx: number): string | null => {
    const startTime = stepTimestamps.current.get(stepIdx);
    if (!startTime) return null;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Collapsed pill
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-20 right-6 z-50 bg-bg-secondary rounded-full shadow-lg
          border border-border-primary overflow-hidden max-w-xs
          hover:border-accent/50 transition-all cursor-pointer
          animate-in slide-in-from-bottom-2 ${className}`}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
          <span className="text-sm font-medium text-text-primary truncate">
            {isVideo ? 'Processing...' : 'Generating...'}
          </span>
          <span className="text-xs text-text-secondary tabular-nums">{percent}%</span>
          {!isConnected && (
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" title="Reconnecting..." />
          )}
          <ChevronUp className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
        </div>
        {/* Thin progress bar at bottom */}
        <div className="h-0.5 bg-bg-tertiary">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </button>
    );
  }

  // Expanded drawer
  return (
    <div
      className={`fixed bottom-20 right-6 z-50 bg-bg-secondary rounded-xl shadow-xl
        border border-border-primary overflow-hidden w-80
        animate-in slide-in-from-bottom-2 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
        <span className="font-medium text-sm text-text-primary">
          {isVideo ? 'Video Processing' : 'Content Processing'}
        </span>
        <div className="flex items-center gap-1">
          {!isConnected && (
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1" title="Reconnecting..." />
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-secondary">{statusText}</span>
            <span className="text-xs text-text-secondary tabular-nums">{percent}%</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="space-y-1.5">
          {steps.map((step, index) => {
            const isDone = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;
            const elapsed = isDone ? formatElapsed(index) : null;

            return (
              <div key={step.id} className="flex items-center gap-2.5 py-0.5">
                {/* Step icon */}
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {isDone && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                  {isCurrent && (
                    <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  )}
                  {isPending && (
                    <div className="w-2 h-2 rounded-full bg-text-tertiary/40" />
                  )}
                </div>

                {/* Step label */}
                <span className={`text-sm flex-1 ${
                  isDone ? 'text-text-secondary' :
                  isCurrent ? 'text-text-primary font-medium' :
                  'text-text-tertiary'
                }`}>
                  {step.label}
                  {isCurrent && '...'}
                </span>

                {/* Elapsed time for completed steps */}
                {isDone && elapsed && (
                  <span className="text-xs text-text-tertiary tabular-nums">{elapsed}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigate away reassurance */}
        <div className="bg-bg-tertiary/50 rounded-lg px-3 py-2.5 border border-border-primary/50">
          <p className="text-xs text-text-secondary leading-relaxed">
            You can navigate away.{' '}
            <span className="text-text-tertiary">We&apos;ll notify you when it&apos;s ready.</span>
          </p>
        </div>

        {/* View progress link */}
        <Link
          href="/app"
          className="flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          View Progress Page
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default GenerationBanner;
