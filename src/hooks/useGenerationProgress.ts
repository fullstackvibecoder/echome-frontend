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
  | 'complete'
  | 'error';

interface UseGenerationProgressOptions {
  onComplete?: (event: ProgressEvent) => void;
  onError?: (event: ProgressEvent) => void;
}

interface UseGenerationProgressReturn {
  progress: ProgressEvent | null;
  isConnected: boolean;
  isComplete: boolean;
  hasError: boolean;
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

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const connect = useCallback(() => {
    if (!requestId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
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
            options?.onComplete?.(data);
            eventSource.close();
          } else if (data.step === 'error') {
            setHasError(true);
            options?.onError?.(data);
            eventSource.close();
          }
        } catch {
          console.warn('Failed to parse SSE event:', event.data);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Attempt reconnection if not complete and under limit
        if (!isComplete && !hasError && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setIsConnected(false);
    }
  }, [requestId, isComplete, hasError, options]);

  // Connect when requestId changes
  useEffect(() => {
    if (requestId) {
      // Reset state for new request
      setProgress(null);
      setIsComplete(false);
      setHasError(false);
      reconnectAttempts.current = 0;
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [requestId, connect]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  return {
    progress,
    isConnected,
    isComplete,
    hasError,
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
