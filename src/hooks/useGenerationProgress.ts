/**
 * useGenerationProgress Hook
 *
 * SSE client hook for real-time generation progress updates.
 * Connects to the backend progress stream and provides live status.
 *
 * FALLBACK: If SSE doesn't receive events within 5 seconds, automatically
 * falls back to polling the generation request status every 3 seconds.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';

export interface ProgressEvent {
  requestId: string;
  step: string;
  stepNumber: number;
  totalSteps: number;
  percent: number;
  message: string;
  timestamp: number;
  metadata?: {
    platformsCount?: number;
    currentPlatform?: string;
    tokensUsed?: number;
    // Video-specific metadata
    currentClip?: number;
    totalClips?: number;
    clipTitle?: string;
    videoDuration?: number;
  };
}

export type ProgressStep =
  | 'init'
  | 'context'
  | 'voice'
  | 'generate'
  | 'validate'
  | 'carousel'
  | 'carousel_complete'
  | 'carousel_failed'
  | 'complete'
  | 'error'
  // Video-specific steps
  | 'downloading'
  | 'transcribing'
  | 'finding_clips'
  | 'extracting_clips'
  | 'processing_clip';

interface UseGenerationProgressOptions {
  onComplete?: (event: ProgressEvent) => void;
  onError?: (event: ProgressEvent) => void;
  onCarouselComplete?: (event: ProgressEvent) => void;
  onCarouselFailed?: (event: ProgressEvent) => void;
}

interface UseGenerationProgressReturn {
  progress: ProgressEvent | null;
  isConnected: boolean;
  isComplete: boolean;
  hasError: boolean;
  carouselReady: boolean;
  carouselFailed: boolean;
  reconnect: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Polling configuration
const POLLING_INTERVAL = 3000; // Poll every 3 seconds
const SSE_FALLBACK_DELAY = 5000; // Start polling if no SSE event within 5 seconds

// Map request status to synthetic progress event
function statusToProgress(requestId: string, status: string, hasCarousel: boolean): ProgressEvent {
  const now = Date.now();

  switch (status) {
    case 'pending':
      return {
        requestId,
        step: 'init',
        stepNumber: 1,
        totalSteps: 6,
        percent: 5,
        message: 'Starting generation...',
        timestamp: now,
      };
    case 'processing':
      return {
        requestId,
        step: 'generate',
        stepNumber: 4,
        totalSteps: 6,
        percent: 50,
        message: 'Generating content...',
        timestamp: now,
      };
    case 'completed':
      if (hasCarousel) {
        return {
          requestId,
          step: 'carousel_complete',
          stepNumber: 6,
          totalSteps: 6,
          percent: 100,
          message: 'Content ready!',
          timestamp: now,
        };
      }
      return {
        requestId,
        step: 'complete',
        stepNumber: 6,
        totalSteps: 6,
        percent: 100,
        message: 'Content ready!',
        timestamp: now,
      };
    case 'failed':
      return {
        requestId,
        step: 'error',
        stepNumber: -1,
        totalSteps: 6,
        percent: 0,
        message: 'Generation failed',
        timestamp: now,
      };
    default:
      return {
        requestId,
        step: 'init',
        stepNumber: 1,
        totalSteps: 6,
        percent: 5,
        message: 'Processing...',
        timestamp: now,
      };
  }
}

export function useGenerationProgress(
  requestId: string | null,
  options?: UseGenerationProgressOptions
): UseGenerationProgressReturn {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [carouselReady, setCarouselReady] = useState(false);
  const [carouselFailed, setCarouselFailed] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 3;
  const isCompleteRef = useRef(false);
  const hasErrorRef = useRef(false);
  const carouselReadyRef = useRef(false);
  const carouselFailedRef = useRef(false);
  const optionsRef = useRef(options);

  // Polling fallback refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const receivedSSEEvent = useRef(false);
  const isPollingRef = useRef(false);

  // Keep refs in sync with state/props
  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    hasErrorRef.current = hasError;
  }, [hasError]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    carouselReadyRef.current = carouselReady;
  }, [carouselReady]);

  useEffect(() => {
    carouselFailedRef.current = carouselFailed;
  }, [carouselFailed]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Poll for status using authenticated API client
  const pollStatus = useCallback(async () => {
    if (!requestId || isCompleteRef.current || hasErrorRef.current) {
      stopPolling();
      return;
    }

    try {
      // Use authenticated API client instead of raw fetch
      const response = await api.generation.getRequest(requestId);
      if (!response.success || !response.data) {
        console.warn('Polling request failed:', response);
        return;
      }

      const request = response.data.request;
      const carousel = response.data.carousel;

      if (!request) return;

      const status = request.status;
      const hasCarouselData = !!(carousel?.slides && carousel.slides.length > 0);

      // Create synthetic progress event from status
      const syntheticProgress = statusToProgress(requestId, status, hasCarouselData);
      setProgress(syntheticProgress);

      // Handle completion states
      if (status === 'completed') {
        if (hasCarouselData) {
          setCarouselReady(true);
          setIsComplete(true);
          isCompleteRef.current = true;
          optionsRef.current?.onCarouselComplete?.(syntheticProgress);
          stopPolling();
        } else {
          // Content is complete, but carousel might still be generating
          // Check if we expect a carousel (Instagram content exists)
          // Note: API client transforms to camelCase, so use contentInstagram
          const contentKit = response.data.contentKit;
          const hasInstagram = contentKit?.contentInstagram;
          if (!hasInstagram) {
            // No carousel expected, we're done
            setIsComplete(true);
            isCompleteRef.current = true;
            optionsRef.current?.onComplete?.(syntheticProgress);
            stopPolling();
          } else {
            // Carousel expected but not ready yet - keep polling but mark content as complete
            if (!isCompleteRef.current) {
              setIsComplete(true);
              isCompleteRef.current = true;
              optionsRef.current?.onComplete?.(syntheticProgress);
            }
            // Keep polling for carousel
          }
        }
      } else if (status === 'failed') {
        setHasError(true);
        hasErrorRef.current = true;
        optionsRef.current?.onError?.(syntheticProgress);
        stopPolling();
      }
    } catch (err) {
      console.warn('Polling error:', err);
    }
  }, [requestId, stopPolling]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (isPollingRef.current || isCompleteRef.current || hasErrorRef.current) return;

    console.log('Starting polling fallback for progress');
    isPollingRef.current = true;

    // Poll immediately, then every POLLING_INTERVAL
    pollStatus();
    pollingIntervalRef.current = setInterval(pollStatus, POLLING_INTERVAL);
  }, [pollStatus]);

  const connect = useCallback(() => {
    if (!requestId) return;

    // Don't reconnect if already complete or has error
    if (isCompleteRef.current || hasErrorRef.current) return;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Reset SSE event flag
    receivedSSEEvent.current = false;

    const url = `${API_BASE_URL}/progress/generate/${requestId}/stream`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Start fallback timer - if no SSE event within SSE_FALLBACK_DELAY, start polling
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        fallbackTimerRef.current = setTimeout(() => {
          if (!receivedSSEEvent.current && !isCompleteRef.current && !hasErrorRef.current) {
            console.log('No SSE events received, starting polling fallback');
            startPolling();
          }
        }, SSE_FALLBACK_DELAY);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);

          // Handle connection confirmation
          if ((data as unknown as { type: string }).type === 'connected') {
            return;
          }

          // Mark that we received a real SSE event
          receivedSSEEvent.current = true;

          // Stop polling if it was started
          stopPolling();

          setProgress(data);

          if (data.step === 'complete') {
            setIsComplete(true);
            isCompleteRef.current = true;
            optionsRef.current?.onComplete?.(data);
            // Don't close yet - carousel may still be generating in background
          } else if (data.step === 'error') {
            setHasError(true);
            hasErrorRef.current = true;
            optionsRef.current?.onError?.(data);
            eventSource.close();
            eventSourceRef.current = null;
          } else if (data.step === 'carousel_complete') {
            setCarouselReady(true);
            optionsRef.current?.onCarouselComplete?.(data);
            // Now we can close - everything is done
            eventSource.close();
            eventSourceRef.current = null;
          } else if (data.step === 'carousel_failed') {
            setCarouselFailed(true);
            optionsRef.current?.onCarouselFailed?.(data);
            // Close on carousel failure too
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch {
          console.warn('Failed to parse SSE event:', event.data);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // If content is complete but we haven't received carousel status yet,
        // SSE may have closed before carousel finished. Start polling to catch it.
        if (isCompleteRef.current && !carouselReadyRef.current && !carouselFailedRef.current) {
          console.log('SSE closed after content complete but carousel may still be pending, starting polling');
          startPolling();
          return;
        }

        // Attempt reconnection if not complete, no error, and under limit
        if (!isCompleteRef.current && !hasErrorRef.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
          console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('SSE max reconnect attempts reached, starting polling fallback');
          // Fall back to polling when SSE fails completely
          startPolling();
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setIsConnected(false);
      // Fall back to polling
      startPolling();
    }
  }, [requestId, startPolling, stopPolling]);

  // Connect when requestId changes
  useEffect(() => {
    if (requestId) {
      // Reset state for new request
      setProgress(null);
      setIsComplete(false);
      setHasError(false);
      setCarouselReady(false);
      setCarouselFailed(false);
      isCompleteRef.current = false;
      hasErrorRef.current = false;
      carouselReadyRef.current = false;
      carouselFailedRef.current = false;
      reconnectAttempts.current = 0;
      receivedSSEEvent.current = false;
      connect();
    }

    return () => {
      stopPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [requestId, connect, stopPolling]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    isCompleteRef.current = false;
    hasErrorRef.current = false;
    receivedSSEEvent.current = false;
    stopPolling();
    connect();
  }, [connect, stopPolling]);

  return {
    progress,
    isConnected,
    isComplete,
    hasError,
    carouselReady,
    carouselFailed,
    reconnect,
  };
}

/**
 * Map progress step to UI step index
 */
export function mapStepToIndex(step: ProgressStep | string, isVideo = false): number {
  if (isVideo) {
    const videoMapping: Record<string, number> = {
      init: 0,
      downloading: 1,
      transcribing: 2,
      finding_clips: 3,
      extracting_clips: 4,
      processing_clip: 4,
      context: 5,
      generate: 5,
      carousel: 6,
      carousel_complete: 7,
      carousel_failed: -1,
      complete: 7,
      error: -1,
    };
    return videoMapping[step] ?? 0;
  }

  const mapping: Record<string, number> = {
    init: 0,
    context: 1,
    voice: 1,
    generate: 2,
    validate: 3,
    carousel: 3,
    carousel_complete: 4,
    carousel_failed: -1,
    complete: 4,
    error: -1,
  };
  return mapping[step] ?? 0;
}

/**
 * Generation step configuration for UI display
 */
export const GENERATION_STEPS = [
  {
    id: 'init',
    icon: '🚀',
    label: 'Starting up',
    description: 'Initializing generation pipeline',
  },
  {
    id: 'context',
    icon: '📚',
    label: 'Knowledge retrieval',
    description: 'Pulling context from your knowledge base',
  },
  {
    id: 'generate',
    icon: '✨',
    label: 'Content creation',
    description: 'Generating platform-specific content',
  },
  {
    id: 'validate',
    icon: '✅',
    label: 'Quality check',
    description: 'Validating voice match and quality',
  },
  {
    id: 'complete',
    icon: '🎉',
    label: 'Complete',
    description: 'Your content is ready!',
  },
];

/**
 * Video generation step configuration for UI display
 */
export const VIDEO_GENERATION_STEPS = [
  {
    id: 'init',
    icon: '🚀',
    label: 'Starting up',
    description: 'Initializing video pipeline',
  },
  {
    id: 'downloading',
    icon: '📥',
    label: 'Downloading',
    description: 'Fetching video from YouTube',
  },
  {
    id: 'transcribing',
    icon: '🎙️',
    label: 'Transcribing',
    description: 'Converting speech to text',
  },
  {
    id: 'finding_clips',
    icon: '🔍',
    label: 'Finding moments',
    description: 'AI identifying the best clips',
  },
  {
    id: 'extracting_clips',
    icon: '✂️',
    label: 'Extracting clips',
    description: 'Cutting and captioning video segments',
  },
  {
    id: 'generate',
    icon: '✨',
    label: 'Content creation',
    description: 'Generating written content for clips',
  },
  {
    id: 'carousel',
    icon: '🖼️',
    label: 'Creating images',
    description: 'Generating carousel visuals',
  },
  {
    id: 'complete',
    icon: '🎉',
    label: 'Complete',
    description: 'Your clips are ready!',
  },
];

/**
 * Helper to detect if a progress step is from a video flow
 */
export function isVideoStep(step: ProgressStep | string): boolean {
  return ['downloading', 'transcribing', 'finding_clips', 'extracting_clips', 'processing_clip'].includes(step);
}
