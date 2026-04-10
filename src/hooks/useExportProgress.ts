/**
 * useExportProgress Hook
 *
 * SSE-only client for tracking on-demand clip export progress.
 * Connects to /api/progress/generate/:clipId/stream and surfaces
 * the current percent, message, and completion state.
 *
 * Unlike useGenerationProgress, this has NO polling fallback — export
 * is a single HTTP request, and there's no DB status to fall back on.
 */

import { useState, useEffect, useRef } from 'react';

interface ExportProgressEvent {
  step: string;
  percent: number;
  message: string;
  metadata?: {
    progress?: number;
    fps?: number;
    url?: string;
  };
}

interface UseExportProgressState {
  percent: number;
  message: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Open an SSE connection for a given clipId and return live progress state.
 * Pass `null` as clipId to disconnect.
 */
export function useExportProgress(clipId: string | null): UseExportProgressState {
  const [state, setState] = useState<UseExportProgressState>({
    percent: 0,
    message: 'Preparing export…',
    isComplete: false,
    hasError: false,
    errorMessage: null,
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Reset state when clipId changes (or becomes null)
    setState({
      percent: 0,
      message: clipId ? 'Preparing export…' : '',
      isComplete: false,
      hasError: false,
      errorMessage: null,
    });

    // Close previous connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    if (!clipId) return;

    const url = `${API_BASE_URL}/progress/generate/${clipId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as ExportProgressEvent;
        if (!event.step) return;

        if (event.step === 'export_complete') {
          setState({
            percent: 100,
            message: event.message || 'Your clip is ready',
            isComplete: true,
            hasError: false,
            errorMessage: null,
          });
          es.close();
          esRef.current = null;
          return;
        }

        if (event.step === 'error') {
          setState({
            percent: 0,
            message: event.message || 'Export failed',
            isComplete: false,
            hasError: true,
            errorMessage: event.message || 'Export failed',
          });
          es.close();
          esRef.current = null;
          return;
        }

        // Ongoing progress — prefer fine-grained metadata.progress if present
        const percent = event.metadata?.progress !== undefined
          ? event.metadata.progress
          : event.percent;

        setState(prev => ({
          ...prev,
          percent: Math.max(prev.percent, percent), // Never go backwards
          message: event.message || prev.message,
        }));
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      // Don't treat as fatal — server may close after terminal event.
      // The export endpoint itself returns the URL in its HTTP response,
      // so even if SSE drops, the caller can still complete the download.
    };

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [clipId]);

  return state;
}
