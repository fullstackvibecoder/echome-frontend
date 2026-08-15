// Frontend mirror of the backend `resolveRowCaption` guard on
// POST /api/social-posting/schedule-fanout. The backend rejects a fanout with
// 422 CAPTION_REQUIRED when a row's resolved caption is empty (empty captions
// make Outstand return 400 too_small, which used to cascade into a 500). We
// catch the same case client-side so the user gets an actionable message
// instead of a failed request.

export interface CaptionRow {
  platform: string;
  /** Per-row caption. Falls back to the shared caption when absent. */
  text?: string | null;
}

// Display labels for the auto-post platforms a caption can be required for.
// Kept local so the guard has no cross-module coupling; unknown ids fall back
// to the raw platform id.
const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  youtube: 'YouTube',
  bluesky: 'Bluesky',
  twitter: 'Twitter/X',
  x: 'Twitter/X',
};

function labelFor(platform: string): string {
  return PLATFORM_LABEL[platform] || platform;
}

/**
 * Mirror of the backend resolution: a row's caption is its own `text` if
 * non-blank, otherwise the shared `fallbackText`. Returns the platforms whose
 * resolved caption is empty/whitespace — the ones the backend would reject.
 */
export function captionlessPlatforms(
  rows: CaptionRow[],
  fallbackText?: string | null,
): string[] {
  const fallback = (fallbackText ?? '').trim();
  return rows
    .filter((row) => !((row.text ?? '').trim() || fallback))
    .map((row) => row.platform);
}

/**
 * Human-readable list of platform labels for a caption-required toast, e.g.
 * "Instagram, LinkedIn". Returns '' for an empty list.
 */
export function formatPlatformList(platforms: string[]): string {
  return platforms.map(labelFor).join(', ');
}
