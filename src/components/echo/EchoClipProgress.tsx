'use client';

/**
 * EchoClipProgress.tsx
 * Live progress for a "make content now" clip job. Polls the job (stage) and
 * the upload row (per-clip percent, user-safe failure message) every ~3s until
 * a terminal state, and renders a moving bar, stage steps and an elapsed timer.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import {
  CLIP_STEPS,
  FALLBACK_FAILURE,
  formatElapsed,
  isIndeterminate,
  mergePercent,
  stageFromJob,
  stageLabel,
  stepStates,
  type ClipStage,
} from './clip-progress';

export const CLIP_POLL_MS = 3000;
export const CLIP_POLL_HIDDEN_MS = 15000;
/** Stop polling after this long; the job is almost certainly stuck or lost. */
export const CLIP_POLL_GIVE_UP_MS = 60 * 60 * 1000;

interface Props {
  uploadId: string;
  jobId: string;
  /** Resets the composer so the user can start over. */
  onRetry: () => void;
}

interface Snapshot {
  stage: ClipStage;
  percent: number;
  startedAt: number | null;
  failureMessage: string | null;
  gaveUp: boolean;
}

const ACCENT = 'rgba(0,212,255,0.95)';

export function EchoClipProgress({ uploadId, jobId, onRetry }: Props) {
  const [mountedAt] = useState(() => Date.now());
  const [snap, setSnap] = useState<Snapshot>({
    stage: 'queued', percent: 0, startedAt: null, failureMessage: null, gaveUp: false,
  });
  const [now, setNow] = useState(() => Date.now());
  const terminal = snap.stage === 'done' || snap.stage === 'failed' || snap.gaveUp;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const [jobRes, uploadRes] = await Promise.allSettled([
        api.clips.getJob(uploadId, jobId),
        api.clips.get(uploadId),
      ]);
      if (cancelled) return;

      const job = jobRes.status === 'fulfilled' ? jobRes.value?.data?.job : undefined;
      const upload = uploadRes.status === 'fulfilled' ? uploadRes.value?.data?.upload : undefined;

      let finished = false;
      if (job) {
        const stage = stageFromJob(job, upload?.status);
        finished = stage === 'done' || stage === 'failed';
        setSnap((prev) => ({
          ...prev,
          stage,
          // Never let the bar move backwards on a lagging read.
          percent: stage === 'done' ? 100 : Math.max(prev.percent, mergePercent(job.progressPercent, upload?.progressPercent)),
          startedAt: job.startedAt ? new Date(job.startedAt).getTime() : prev.startedAt,
          // statusMessage is the backend's plain-language failure sentence. The
          // job's errorMessage is raw and never shown.
          failureMessage:
            stage === 'failed'
              ? (upload?.status === 'failed' && upload.statusMessage) || FALLBACK_FAILURE
              : null,
        }));
      }
      // A failed poll (network blip, 5xx) just waits for the next tick.

      if (finished) return;
      if (Date.now() - mountedAt > CLIP_POLL_GIVE_UP_MS) {
        setSnap((prev) => ({ ...prev, gaveUp: true }));
        return;
      }
      const hidden = typeof document !== 'undefined' && document.hidden;
      timer = setTimeout(tick, hidden ? CLIP_POLL_HIDDEN_MS : CLIP_POLL_MS);
    };

    const onVisible = () => {
      if (!document.hidden && !cancelled) {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };

    void tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uploadId, jobId, mountedAt]);

  // Elapsed clock ticks every second until the job ends.
  useEffect(() => {
    if (terminal) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [terminal]);

  const elapsed = (now - (snap.startedAt ?? mountedAt)) / 1000;
  const states = stepStates(snap.stage);
  const indeterminate = isIndeterminate(snap.stage, snap.percent);

  if (snap.stage === 'done') {
    return (
      <div className="flex items-start gap-2.5" data-testid="clip-progress-done">
        <IconBadge><Check size={14} /></IconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Your clips are ready</p>
          <Link
            href={`/app/library/${uploadId}`}
            className="text-xs underline underline-offset-2 hover:text-foreground"
            style={{ color: ACCENT }}
          >
            Open your clips
          </Link>
        </div>
      </div>
    );
  }

  if (snap.stage === 'failed' || snap.gaveUp) {
    return (
      <div className="flex items-start gap-2.5" data-testid="clip-progress-failed">
        <IconBadge><AlertCircle size={14} /></IconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {snap.gaveUp ? 'This is taking longer than expected' : 'We could not clip this video'}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {snap.gaveUp
              ? 'Check your library in a few minutes. If nothing shows up, try again.'
              : snap.failureMessage}
          </p>
          <div className="mt-1.5 flex gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="text-xs underline underline-offset-2 hover:text-foreground"
              style={{ color: ACCENT }}
            >
              Try again
            </button>
            {snap.gaveUp && (
              <Link href="/app/library" className="text-xs text-[var(--muted-foreground)] underline underline-offset-2 hover:text-foreground">
                Open library
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5" data-testid="clip-progress-running">
      <style>{`
        @keyframes echo-clip-sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
        @keyframes echo-clip-sheen { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) {
          .echo-clip-anim { animation: none !important; }
          .echo-clip-fill { transition: none !important; }
        }
      `}</style>
      <IconBadge><Loader2 size={14} className="echo-clip-anim animate-spin" /></IconBadge>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{stageLabel(snap.stage)}</p>
          <span className="text-xs tabular-nums text-[var(--muted-foreground)]" data-testid="clip-elapsed">
            {formatElapsed(elapsed)}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Clipping progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indeterminate ? undefined : snap.percent}
          aria-valuetext={stageLabel(snap.stage)}
          className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'rgba(0,212,255,0.15)' }}
        >
          {indeterminate ? (
            <div
              data-testid="clip-bar-indeterminate"
              className="echo-clip-anim absolute inset-y-0 left-0 w-2/5 rounded-full"
              style={{ background: ACCENT, animation: 'echo-clip-sweep 1.4s ease-in-out infinite' }}
            />
          ) : (
            <div
              data-testid="clip-bar-fill"
              className="echo-clip-fill relative h-full overflow-hidden rounded-full"
              style={{ width: `${snap.percent}%`, background: ACCENT, transition: 'width 800ms ease-out' }}
            >
              <div
                className="echo-clip-anim absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                  animation: 'echo-clip-sheen 1.8s linear infinite',
                }}
              />
            </div>
          )}
        </div>

        <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Steps">
          {CLIP_STEPS.map((step, i) => (
            <li
              key={step.stage}
              data-state={states[i]}
              className={[
                'flex items-center gap-1 text-[11px]',
                states[i] === 'pending' ? 'text-[var(--muted-foreground)] opacity-60' : 'text-foreground',
              ].join(' ')}
              {...(states[i] === 'current' ? { 'aria-current': 'step' as const } : {})}
            >
              {states[i] === 'done' ? (
                <Check size={11} style={{ color: ACCENT }} />
              ) : (
                <span
                  className={['inline-block h-1.5 w-1.5 rounded-full', states[i] === 'current' ? 'echo-clip-anim animate-pulse' : ''].join(' ')}
                  style={{ background: states[i] === 'current' ? ACCENT : 'currentColor' }}
                />
              )}
              {step.short}
            </li>
          ))}
        </ol>

        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          This can take several minutes. You can leave this page. We will email you when it is ready.
        </p>
      </div>
    </div>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{ width: 22, height: 22, background: 'rgba(0,212,255,0.15)', color: ACCENT }}
    >
      {children}
    </div>
  );
}
