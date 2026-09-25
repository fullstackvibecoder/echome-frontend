'use client';

/**
 * ClipTrimControls — shrink-only, non-destructive clip trim.
 *
 * Renders a horizontal handle bar spanning the clip's original bounds with
 * two draggable/keyboard-operable handles for the in and out point. Applying
 * a trim kicks off a background job on the backend; this component polls
 * GET .../trim until the job leaves 'processing', then hands the resulting
 * media back to the parent (ClipEditorModal) via onTrimApplied so the player
 * and any local clip state can be updated.
 *
 * "Shrink only": the handles can never move outside [originalStartTime,
 * originalEndTime] — there's no way to grow a clip back past what it
 * started as.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RotateCcw, Scissors } from 'lucide-react';
import { api } from '@/lib/api-client';

export interface TrimTranscriptWord {
  text: string;
  start: number;
  end: number;
}

interface ClipTrimControlsProps {
  uploadId: string;
  clipId: string;
  startTime: number;
  endTime: number;
  originalStartTime: number;
  originalEndTime: number;
  isTrimmed: boolean;
  trimStatus: 'idle' | 'processing' | 'failed';
  /** Absolute source-time seconds. Omit entirely when the modal has no word-level timing. */
  transcriptWords?: TrimTranscriptWord[];
  /** The modal's underlying <video> element, used to read the playhead for "Set at playhead". */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTrimApplied: (media: { url: string; thumbnailUrl: string | null }, bounds: { startTime: number; endTime: number }) => void;
}

/** Minimum kept duration, in seconds. */
const MIN_DURATION = 3;
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 3 * 60 * 1000;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/** Format seconds as m:ss.s (no leading zero on minutes). */
function formatTrimTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

interface ApiErrorInfo {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Every clips route (including trim/trim/reset) nests the error code inside
 * `error.code`, matching the sibling clip endpoints — never top-level. We
 * also check a top-level `code` defensively in case a proxy/middleware ever
 * flattens it.
 */
function extractApiError(err: unknown, fallback: string): ApiErrorInfo {
  const withResponse = err as {
    response?: { status?: number; data?: { error?: { message?: string; code?: string }; code?: string } };
  };
  const code = withResponse?.response?.data?.error?.code ?? withResponse?.response?.data?.code;
  const message = withResponse?.response?.data?.error?.message || (err instanceof Error ? err.message : fallback);
  const status = withResponse?.response?.status;
  return { message, code, status };
}

export function ClipTrimControls({
  uploadId,
  clipId,
  startTime,
  endTime,
  originalStartTime,
  originalEndTime,
  isTrimmed,
  trimStatus,
  transcriptWords,
  videoRef,
  onTrimApplied,
}: ClipTrimControlsProps) {
  const [inTime, setInTime] = useState(startTime);
  const [outTime, setOutTime] = useState(endTime);
  const [status, setStatus] = useState<'idle' | 'processing' | 'failed'>(trimStatus);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[] | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const [applied, setApplied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Mirrors the `isTrimmed` prop but also updates from a completed trim/reset
  // poll — the parent (ClipEditorModal) has no refetch wired for this first
  // sliver, so without this the "Reset to original" button would stay stuck
  // showing/hiding based on stale parent state after a reset completes.
  const [trimmedFlag, setTrimmedFlag] = useState(isTrimmed);

  const barRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef(0);

  // A different clip loaded into the same modal instance — reset local
  // editing state to that clip's current bounds/status.
  useEffect(() => {
    setInTime(startTime);
    setOutTime(endTime);
    setStatus(trimStatus);
    setError(null);
    setNotes(null);
    setApplied(false);
    setTimedOut(false);
    setTrimmedFlag(isTrimmed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Stop polling if the modal (and this component) unmounts mid-job.
  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setTimedOut(false);
    pollStartedAtRef.current = Date.now();
    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - pollStartedAtRef.current > POLL_MAX_MS) {
        stopPolling();
        setTimedOut(true);
        return;
      }
      try {
        const res = await api.clips.getTrimStatus(uploadId, clipId);
        const data = res.data;
        if (data.trimStatus === 'processing') return;
        stopPolling();
        setStatus(data.trimStatus);
        setError(data.trimError);
        setNotes(data.trimNotes);
        setTrimmedFlag(data.isTrimmed);
        if (data.trimStatus === 'idle') {
          setInTime(data.startTime);
          setOutTime(data.endTime);
          setApplied(true);
          onTrimApplied(data.media, { startTime: data.startTime, endTime: data.endTime });
        }
      } catch (err) {
        stopPolling();
        setStatus('failed');
        setError(extractApiError(err, 'Failed to check trim status').message);
      }
    }, POLL_INTERVAL_MS);
  }, [uploadId, clipId, stopPolling, onTrimApplied]);

  const applyIn = useCallback(
    (candidate: number) => {
      const maxIn = outTime - MIN_DURATION;
      const clamped = clamp(candidate, originalStartTime, Math.max(originalStartTime, maxIn));
      setTooShort(candidate > maxIn + 1e-6 || candidate < originalStartTime - 1e-6);
      setInTime(clamped);
      setApplied(false);
    },
    [outTime, originalStartTime],
  );

  const applyOut = useCallback(
    (candidate: number) => {
      const minOut = inTime + MIN_DURATION;
      const clamped = clamp(candidate, Math.min(originalEndTime, minOut), originalEndTime);
      setTooShort(candidate < minOut - 1e-6 || candidate > originalEndTime + 1e-6);
      setOutTime(clamped);
      setApplied(false);
    },
    [inTime, originalEndTime],
  );

  const timeFromClientX = useCallback(
    (clientX: number): number | null => {
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      const fraction = clamp((clientX - rect.left) / rect.width, 0, 1);
      return originalStartTime + fraction * (originalEndTime - originalStartTime);
    },
    [originalStartTime, originalEndTime],
  );

  const disabled = status === 'processing';

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disabled],
  );

  const handleInPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const t = timeFromClientX(e.clientX);
      if (t !== null) applyIn(t);
    },
    [disabled, timeFromClientX, applyIn],
  );

  const handleOutPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const t = timeFromClientX(e.clientX);
      if (t !== null) applyOut(t);
    },
    [disabled, timeFromClientX, applyOut],
  );

  const handleKeyDown = useCallback(
    (which: 'in' | 'out') => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = e.shiftKey ? 1 : 0.1;
      const delta = e.key === 'ArrowLeft' ? -step : step;
      if (which === 'in') applyIn(inTime + delta);
      else applyOut(outTime + delta);
    },
    [disabled, inTime, outTime, applyIn, applyOut],
  );

  const playerOffset = trimmedFlag ? startTime : originalStartTime;

  const handleSetInAtPlayhead = useCallback(() => {
    const video = videoRef.current;
    if (!video || disabled) return;
    applyIn(video.currentTime + playerOffset);
  }, [videoRef, disabled, applyIn, playerOffset]);

  const handleSetOutAtPlayhead = useCallback(() => {
    const video = videoRef.current;
    if (!video || disabled) return;
    applyOut(video.currentTime + playerOffset);
  }, [videoRef, disabled, applyOut, playerOffset]);

  const handleWordClick = useCallback(
    (word: TrimTranscriptWord) => {
      if (disabled) return;
      const mid = (inTime + outTime) / 2;
      if (word.start < mid) applyIn(word.start);
      else applyOut(word.end);
    },
    [disabled, inTime, outTime, applyIn, applyOut],
  );

  // A second trim/reset while one is already running now comes back as
  // either 400 IN_PROGRESS or 409 IN_PROGRESS depending on the route — a
  // job genuinely is running server-side either way, so poll for it instead
  // of surfacing it as a failure.
  const handleStartError = useCallback(
    (err: unknown, fallback: string) => {
      const { message, code, status } = extractApiError(err, fallback);
      if (status === 409 || code === 'IN_PROGRESS') {
        setError('A trim is already running.');
        setStatus('processing');
        startPolling();
        return;
      }
      setStatus('failed');
      setError(message);
    },
    [startPolling],
  );

  const handleApply = useCallback(async () => {
    setError(null);
    setNotes(null);
    setStatus('processing');
    try {
      await api.clips.trim(uploadId, clipId, { startTime: inTime, endTime: outTime });
      startPolling();
    } catch (err) {
      handleStartError(err, 'Failed to start trim');
    }
  }, [uploadId, clipId, inTime, outTime, startPolling, handleStartError]);

  const handleResetToOriginal = useCallback(async () => {
    setError(null);
    setNotes(null);
    setStatus('processing');
    try {
      await api.clips.resetTrim(uploadId, clipId);
      startPolling();
    } catch (err) {
      handleStartError(err, 'Failed to reset trim');
    }
  }, [uploadId, clipId, startPolling, handleStartError]);

  const range = Math.max(originalEndTime - originalStartTime, 0.001);
  const inPct = ((inTime - originalStartTime) / range) * 100;
  const outPct = ((outTime - originalStartTime) / range) * 100;
  const unchanged = inTime === startTime && outTime === endTime;
  const kept = outTime - inTime;

  const words = useMemo(() => transcriptWords ?? [], [transcriptWords]);
  const mid = (inTime + outTime) / 2;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Scissors className="h-3.5 w-3.5" />
          Trim
        </h3>
        {disabled && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Re-cutting your clip
          </span>
        )}
      </div>

      <div
        ref={barRef}
        className="relative h-8 select-none rounded-full border border-border bg-muted/40 touch-none"
      >
        {/* Trimmed-away regions, dimmed */}
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-background/60" style={{ width: `${inPct}%` }} />
        <div className="absolute inset-y-0 right-0 rounded-r-full bg-background/60" style={{ width: `${100 - outPct}%` }} />
        {/* Kept region, highlighted */}
        <div
          className="absolute inset-y-0 bg-primary-interactive/30"
          style={{ left: `${inPct}%`, width: `${Math.max(0, outPct - inPct)}%` }}
        />
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="Trim in point"
          aria-valuemin={originalStartTime}
          aria-valuemax={outTime - MIN_DURATION}
          aria-valuenow={inTime}
          aria-disabled={disabled}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleInPointerMove}
          onKeyDown={handleKeyDown('in')}
          className="absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded bg-primary-interactive focus:outline-none focus:ring-2 focus:ring-primary-interactive"
          style={{ left: `${inPct}%` }}
        />
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label="Trim out point"
          aria-valuemin={inTime + MIN_DURATION}
          aria-valuemax={originalEndTime}
          aria-valuenow={outTime}
          aria-disabled={disabled}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleOutPointerMove}
          onKeyDown={handleKeyDown('out')}
          className="absolute top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded bg-primary-interactive focus:outline-none focus:ring-2 focus:ring-primary-interactive"
          style={{ left: `${outPct}%` }}
        />
      </div>

      {tooShort && (
        <p className="text-[11px] text-destructive">Clips must be at least 3 seconds.</p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">In {formatTrimTime(inTime)}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetInAtPlayhead}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
          >
            Set at playhead
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Out {formatTrimTime(outTime)}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetOutAtPlayhead}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-40"
          >
            Set at playhead
          </button>
        </div>
        <span className="text-muted-foreground">{kept.toFixed(1)}s</span>
      </div>

      {words.length > 0 && (
        <div className="flex max-h-[80px] flex-wrap gap-x-1 gap-y-0.5 overflow-y-auto rounded-lg bg-background/50 border border-border p-2 text-xs">
          {words.map((word, i) => {
            const isKept = word.start >= inTime && word.start < outTime;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleWordClick(word)}
                title={word.start < mid ? 'Set as in point' : 'Set as out point'}
                className={`rounded px-0.5 transition-colors hover:text-foreground ${
                  isKept ? 'text-foreground/90' : 'text-muted-foreground/50'
                }`}
              >
                {word.text}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className={`text-[11px] ${status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{error}</p>
      )}

      {timedOut && (
        <p className="text-[11px] text-muted-foreground">Still processing, check back shortly.</p>
      )}

      {applied && status === 'idle' && (
        <p className="text-[11px] text-accent">Trim applied.</p>
      )}

      {notes?.includes('auto_clean_dropped') && (
        <p className="text-[11px] text-muted-foreground">Auto-clean was removed by this trim.</p>
      )}
      {notes?.includes('split_screen_dropped') && (
        <p className="text-[11px] text-muted-foreground">Split-screen layout was removed by this trim.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleApply}
          disabled={unchanged || disabled}
          className="rounded-lg bg-primary-interactive px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Apply trim
        </button>
        {trimmedFlag && (
          <button
            type="button"
            onClick={handleResetToOriginal}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to original
          </button>
        )}
      </div>
    </div>
  );
}
