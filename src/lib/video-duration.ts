import { api } from '@/lib/api-client';

/**
 * Minimum video length the backend can cut a clip from. Mirrors
 * MIN_DURATION_SECONDS in the backend's validateProcessableMedia
 * (clip-finder-service.ts). Keep the two in sync.
 */
export const MIN_VIDEO_SECONDS = 10;

/** Browser and ffprobe can disagree by a few hundredths. Never reject a 10s file on rounding. */
const TOLERANCE_SECONDS = 0.1;

const METADATA_TIMEOUT_MS = 8000;

/**
 * Reads a video's duration in the browser without uploading it.
 * Returns null whenever the browser can't tell (unsupported codec such as some
 * HEVC .mov in Chrome, error, timeout, non-finite duration). Callers must treat
 * null as "unknown, let the server decide", never as a rejection.
 */
export function getVideoDurationSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    let settled = false;

    // Declared before finish so it is in scope; finish only runs after this assignment.
    const timer = setTimeout(() => finish(null), METADATA_TIMEOUT_MS);
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        // best effort
      }
      URL.revokeObjectURL(url);
      resolve(value);
    };

    let url: string;
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve(null);
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const d = video.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export function tooShortMessage(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const length = whole === 1 ? '1 second' : `${whole} seconds`;
  return `This video is ${length} long. Videos need to be at least ${MIN_VIDEO_SECONDS} seconds to make clips. Pick a longer one.`;
}

/**
 * Pre-upload guard. Resolves to a plain user message when the file is known to
 * be shorter than the minimum, otherwise null (long enough, or unknown).
 */
export async function checkVideoTooShort(file: File): Promise<string | null> {
  const duration = await getVideoDurationSeconds(file);
  if (duration === null || duration >= MIN_VIDEO_SECONDS - TOLERANCE_SECONDS) return null;
  api.telemetry
    .event({
      event_name: 'upload_rejected_too_short',
      event_data: { duration_seconds: Math.round(duration * 10) / 10, size_bytes: file.size },
    })
    .catch(() => {});
  return tooShortMessage(duration);
}
