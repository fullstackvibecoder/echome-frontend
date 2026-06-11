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
  // Track whether stop was triggered intentionally vs auto-cap
  const stoppingRef = useRef(false);

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
    // Guard: already in flight
    if (micState === 'recording' || micState === 'transcribing') return;

    setMicError(null);
    audioChunksRef.current = [];
    stoppingRef.current = false;

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
      return;
    }

    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      cleanup();

      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
        stoppingRef.current = true;
        mediaRecorderRef.current.stop();
      }
    }, MAX_RECORDING_SECONDS * 1000);
  }, [micState, cleanup, onTranscript, setInlineError]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      stoppingRef.current = true;
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { micState, elapsed, micError, start, stop };
}
