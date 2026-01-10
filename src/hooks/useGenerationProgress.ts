/**
 * useGenerationProgress Hook
 *
 * SSE client hook for real-time generation progress updates.
 * Connects to the backend progress stream and provides live status.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

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
  | 'error';

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

  // Keep refs in sync with state
  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    hasErrorRef.current = hasError;
  }, [hasError]);

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

    const url = `${API_BASE_URL}/progress/generate/${requestId}/stream`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);

          // Handle connection confirmation
          if ((data as unknown as { type: string }).type === 'connected') {
            return;
          }

          setProgress(data);

          if (data.step === 'complete') {
            setIsComplete(true);
            isCompleteRef.current = true;
            options?.onComplete?.(data);
            // Don't close yet - carousel may still be generating in background
          } else if (data.step === 'error') {
            setHasError(true);
            hasErrorRef.current = true;
            options?.onError?.(data);
            eventSource.close();
            eventSourceRef.current = null;
          } else if (data.step === 'carousel_complete') {
            setCarouselReady(true);
            options?.onCarouselComplete?.(data);
            // Now we can close - everything is done
            eventSource.close();
            eventSourceRef.current = null;
          } else if (data.step === 'carousel_failed') {
            setCarouselFailed(true);
            options?.onCarouselFailed?.(data);
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

        // Attempt reconnection if not complete, no error, and under limit
        if (!isCompleteRef.current && !hasErrorRef.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
          console.log(`SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('SSE max reconnect attempts reached, stopping');
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setIsConnected(false);
    }
  }, [requestId, options]);

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
      reconnectAttempts.current = 0;
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [requestId, connect]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    isCompleteRef.current = false;
    hasErrorRef.current = false;
    connect();
  }, [connect]);

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
export function mapStepToIndex(step: ProgressStep | string): number {
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
