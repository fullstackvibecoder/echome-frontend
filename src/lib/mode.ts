import { Platform } from '@/types';

export type Mode = 'clips' | 'article' | 'full_kit';
export type ModeSource = 'utm' | 'explicit' | 'default';

const STORAGE_KEY = 'echome.mode';
const VALID_MODES: Mode[] = ['clips', 'article', 'full_kit'];

/**
 * The output set each mode promises. Article = blog post + newsletter.
 * Clips = empty here: clip output comes from the clip pipeline, not /generate.
 * full_kit mirrors the form's historic ALL_PLATFORMS exactly.
 */
export const MODE_TO_PLATFORMS: Record<Mode, Platform[]> = {
  clips: [],
  article: ['blog', 'email'],
  full_kit: ['instagram', 'linkedin', 'blog', 'email', 'tiktok', 'video-script'],
};

export function platformsForMode(mode: Mode): Platform[] {
  return MODE_TO_PLATFORMS[mode];
}

/** The feature gate. Mode logic only engages for the two ad modes. */
export function isModeActive(mode: Mode | null): boolean {
  return mode === 'clips' || mode === 'article';
}

function isMode(v: string | null): v is Mode {
  return v !== null && (VALID_MODES as string[]).includes(v);
}

/**
 * Read a mode off a landing-page query string. Any mode arriving via URL is
 * ad-sourced, so source = 'utm'. Returns null when absent/unknown.
 */
export function captureModeFromParams(
  params: URLSearchParams
): { mode: Mode; source: ModeSource } | null {
  const raw = params.get('mode');
  if (!isMode(raw)) return null;
  return { mode: raw, source: 'utm' };
}

export function persistMode(mode: Mode, source: ModeSource): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, source }));
  } catch {
    // localStorage unavailable (SSR/private mode): mode simply won't persist.
  }
}

export function readMode(): { mode: Mode; source: ModeSource } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isMode(parsed?.mode)) return null;
    return { mode: parsed.mode, source: parsed.source ?? 'default' };
  } catch {
    return null;
  }
}

export function clearMode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
