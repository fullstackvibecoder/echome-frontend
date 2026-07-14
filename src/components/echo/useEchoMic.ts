'use client';

/**
 * useEchoMic.ts
 * MediaRecorder hook for Echo mic input.
 * States: idle | recording | transcribing | error
 * Hard cap: 120s auto-stop.
 * Tracks cleaned up on stop/unmount.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api-client';

export type EchoMicState = 'idle' | 'recording' | 'transcribing' | 'error';

export interface UseEchoMicReturn {
  micState: EchoMicState;
  /** Elapsed recording seconds (0 when not recording) */
  elapsed: number;
  /** Inline error message, null when none */
  micError: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const MAX_RECORDING_SECONDS = 120;

export function useEchoMic(
  onTranscript: (text: string) => void,
  onError?: (msg: string) => void,
): UseEchoMicReturn {
  const [micState, setMicState] = useState<EchoMicState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard against double-click race on start()
  const startingRef = useRef(false);

  /** Stop tracks and clear all timers */
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (capTimerRef.current) {
      clearTimeout(capTimerRef.current);
      capTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const setInlineError = useCallback(
    (msg: string) => {
      setMicError(msg);
      setMicState('error');
      setElapsed(0);
      onError?.(msg);
    },
    [onError],
  );

  const start = useCallback(async () => {
    // Guard: double-click race
    if (startingRef.current) return;
    startingRef.current = true;

    // Guard: already in flight
    if (micState === 'recording' || micState === 'transcribing') {
      startingRef.current = false;
      return;
    }

    setMicError(null);
    audioChunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      setInlineError(
        isDenied
          ? 'Microphone access is blocked. Allow it in your browser settings to talk to Echo.'
          : 'Could not access your microphone. Please try again.',
      );
      startingRef.current = false;
      return;
    }

    streamRef.current = stream;

    // Safari supports neither audio/webm variant, so hardcoding it made
    // `new MediaRecorder(...)` throw "mimeType not supported". Fall through
    // a candidate list (webm/opus for Chrome/FF, mp4/aac for Safari) and let
    // the browser pick its default if none match.
    const mimeCandidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
    ];
    const mimeType =
      typeof MediaRecorder !== 'undefined'
        ? mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
        : '';

    const mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      cleanup();

      // Use the recorder's actual mime (Safari records mp4, not webm) so the
      // backend/Whisper gets the right container.
      const blobType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: blobType });
      audioChunksRef.current = [];

      setMicState('transcribing');
      setElapsed(0);

      try {
        const result = await api.kbContent.transcribeVoice(blob);
        if (result.success && result.text) {
          onTranscript(result.text);
          setMicState('idle');
        } else {
          throw new Error('No transcript returned');
        }
      } catch {
        setInlineError('Transcription failed. Please try again.');
      } finally {
        startingRef.current = false;
      }
    };

    mediaRecorder.start(100); // collect chunks every 100 ms
    setMicState('recording');
    setElapsed(0);

    // Elapsed counter
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    // Hard cap: auto-stop at 120s
    capTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, MAX_RECORDING_SECONDS * 1000);
  }, [micState, cleanup, onTranscript, setInlineError]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { micState, elapsed, micError, start, stop };
}
