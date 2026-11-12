/**
 * clip-progress.ts
 * Pure helpers that turn a clip job (and its upload row) into user-facing
 * stages. Backend source of truth: clip-finder-service.ts processVideo(), which
 * writes clip_jobs.status + current_step in this order:
 *   transcribing "Downloading video..." (5%)            -> download
 *   transcribing "Analyzing video..." (10%)             -> download
 *   transcribing "Transcribing audio..." (13%..35%)     -> transcribe
 *   analyzing    "AI identifying best clips..." (40%)   -> find
 *   extracting   "Extracting video clips..." (55%..90%) -> cut
 *   generating   "Generating written content..." (92%) -> write
 *   completed (100%) | failed
 * The 55-90% cutting progress is written to video_uploads only, so callers
 * should merge the upload's progressPercent in (see mergePercent).
 */

export type ClipStage = 'queued' | 'download' | 'transcribe' | 'find' | 'cut' | 'write' | 'done' | 'failed';

export interface ClipStep {
  stage: Exclude<ClipStage, 'queued' | 'done' | 'failed'>;
  label: string;
  short: string;
}

export const CLIP_STEPS: ClipStep[] = [
  { stage: 'download', label: 'Downloading your video', short: 'Download' },
  { stage: 'transcribe', label: 'Transcribing', short: 'Transcribe' },
  { stage: 'find', label: 'Finding the best moments', short: 'Find moments' },
  { stage: 'cut', label: 'Cutting clips', short: 'Cut clips' },
  { stage: 'write', label: 'Writing posts', short: 'Write posts' },
];

export interface JobLike {
  status?: string;
  currentStep?: string | null;
  progressPercent?: number | null;
}

/**
 * The job row flips to 'transcribing' before the download finishes (observed on
 * prod: ~6 min of 'transcribing' while the upload row was still 'pending').
 * The upload row is the reliable signal, so while it is pending/uploading and
 * the job is in an early stage, we are still downloading.
 */
export function stageFromJob(job: JobLike | null | undefined, uploadStatus?: string | null): ClipStage {
  if (!job) return 'queued';
  const base = stageFromJobRow(job);
  const early = base === 'queued' || base === 'download' || base === 'transcribe';
  if (early && (uploadStatus === 'pending' || uploadStatus === 'uploading')) {
    return job.status === 'pending' ? 'queued' : 'download';
  }
  return base;
}

function stageFromJobRow(job: JobLike): ClipStage {
  switch (job.status) {
    case 'completed':
      return 'done';
    case 'failed':
      return 'failed';
    case 'analyzing':
      return 'find';
    case 'extracting':
    case 'captioning':
      return 'cut';
    case 'generating':
      return 'write';
    case 'transcribing':
      // "Downloading video + transcribing in parallel..." is still the download.
      return /^transcri/i.test(job.currentStep ?? '') ? 'transcribe' : 'download';
    default:
      // 'pending' and anything unknown that is not terminal.
      return 'queued';
  }
}

export function stageLabel(stage: ClipStage): string {
  if (stage === 'queued') return 'Getting started';
  if (stage === 'done') return 'Your clips are ready';
  if (stage === 'failed') return 'Clipping stopped';
  return CLIP_STEPS.find((s) => s.stage === stage)?.label ?? 'Working';
}

export type StepState = 'done' | 'current' | 'pending';

export function stepStates(stage: ClipStage): StepState[] {
  const idx = CLIP_STEPS.findIndex((s) => s.stage === stage);
  return CLIP_STEPS.map((_, i) => {
    if (stage === 'done') return 'done';
    if (idx === -1) return 'pending';
    return i < idx ? 'done' : i === idx ? 'current' : 'pending';
  });
}

/**
 * The job row only moves 55 -> 90 at the end of cutting; the upload row ticks
 * per clip. Take the larger of the two, clamped to 0-100.
 */
export function mergePercent(jobPercent?: number | null, uploadPercent?: number | null): number {
  const best = Math.max(jobPercent ?? 0, uploadPercent ?? 0);
  return Math.min(100, Math.max(0, Math.round(best)));
}

/** Download and queue sit at a flat 5%, so a real bar would look frozen. */
export function isIndeterminate(stage: ClipStage, percent: number): boolean {
  return stage === 'queued' || stage === 'download' || percent <= 5;
}

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const FALLBACK_FAILURE = 'Something went wrong while clipping this video. Please try again.';
