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

// Max age for a generation before we consider it stale (20 minutes)
const MAX_GENERATION_AGE_MS = 20 * 60 * 1000;
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

  // Show notification on error — but don't immediately clear.
  // The backend may retry/fallback, so keep the widget alive for a bit.
  const errorCountRef = useRef(0);
  useEffect(() => {
    if (hasError) {
      errorCountRef.current++;
      // Only clear after sustained errors (give backend time to retry)
      const timer = setTimeout(() => {
        if (hasError) {
          if (isDocumentHidden()) {
            showErrorNotification();
          }
          clearActive();
        }
      }, 15000); // Wait 15s before giving up
      return () => clearTimeout(timer);
    } else {
      errorCountRef.current = 0;
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

  // Don't render if no active generation or manually hidden
  // Note: don't hide on hasError — the backend may retry/fallback
  if (!activeGeneration || (shouldHide && !showCompletion)) {
    return null;
  }

  // Completion state
  if (showCompletion) {
    return (
      <div
        className={`fixed bottom-20 right-3 sm:right-6 z-50 bg-surface-container-lowest dark:bg-card rounded-[1.5rem] shadow-2xl
          border border-green-400/30 overflow-hidden max-w-sm animate-in slide-in-from-bottom-2 ${className}`}
      >
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center animate-bounce">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-green-500">Content kit ready!</p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <X className="w-4 h-4 text-slate-lavender" />
            </button>
          </div>
          <Link
            href={`/app/library/${activeGeneration.requestId}`}
            className="mt-3 flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
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
        className={`fixed bottom-20 right-3 sm:right-6 z-50 glass-panel rounded-full shadow-2xl
          border border-primary/20 overflow-hidden max-w-xs
          hover:border-primary/40 transition-all cursor-pointer
          animate-in slide-in-from-bottom-2 ${className}`}
      >
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
          <div className="pr-1">
            <span className="text-xs font-headline font-bold text-foreground block">
              {isVideo ? 'Processing...' : 'Generating...'}
            </span>
            <span className="text-[10px] text-slate-lavender">{percent}%</span>
          </div>
          {!isConnected && (
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" title="Reconnecting..." />
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-lavender flex-shrink-0" />
        </div>
        {/* Thin progress bar at bottom */}
        <div className="h-1 bg-surface-container-high">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </button>
    );
  }

  // Expanded drawer
  return (
    <div
      className={`fixed bottom-20 right-3 sm:right-6 z-50 bg-surface-container-lowest dark:bg-card rounded-[1.5rem] shadow-2xl
        border border-outline-variant/40 overflow-hidden w-[calc(100vw-1.5rem)] max-w-80
        animate-in slide-in-from-bottom-2 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
        <span className="font-headline font-bold text-sm text-foreground">
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

      <div className="px-5 py-4 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-lavender font-medium">{statusText}</span>
            <span className="text-xs font-bold text-primary tabular-nums">{percent}%</span>
          </div>
          <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full relative overflow-hidden transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            >
              <div className="absolute inset-0 progress-shimmer" />
            </div>
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

        {/* Navigate away reassurance — only after upload/download phase */}
        <div className="bg-primary/5 rounded-xl px-4 py-3">
          {currentStepIndex <= 1 && progress?.step !== 'transcribing' ? (
            <p className="text-xs text-slate-lavender leading-relaxed">
              <span className="text-amber-500 font-medium">Please stay on this page</span> while your video uploads. You can navigate away once processing begins.
            </p>
          ) : (
            <p className="text-xs text-slate-lavender leading-relaxed">
              <span className="text-green-400 font-medium">Safe to navigate away.</span>{' '}
              <span className="text-on-surface-variant">We&apos;ll notify you when it&apos;s ready.</span>
            </p>
          )}
        </div>

        {/* View progress link */}
        <Link
          href="/app"
          className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          View Progress Page
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default GenerationBanner;
