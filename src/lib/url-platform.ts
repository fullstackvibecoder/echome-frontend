/**
 * url-platform.ts
 * Single source of truth for classifying a pasted URL by platform.
 *
 * Detection was previously duplicated across generation-form.tsx,
 * useEcho.ts, and KBUnifiedInput.tsx and had drifted: the ingest paths only
 * knew youtube/instagram/blog, so personal-recording links (Zoom/Loom/Vimeo)
 * silently fell through to the blog scraper, which can't read them.
 *
 * Two kinds matter to the KB ingest path:
 *   - importable: has a real Your-Voice importer (youtube/instagram) or is a
 *     generic page the blog importer can crawl (blog).
 *   - recording: a personal video recording (Zoom/Loom/Vimeo). There is NO KB
 *     importer for these — they're clip-into-a-kit sources, handled by the
 *     Create video pipeline, not Your Voice. Ingesting one is a user mistake.
 */

/** Platforms the KB social-import endpoint actually accepts. */
export type IngestImportPlatform = 'youtube' | 'instagram' | 'blog';

export type IngestUrlKind = IngestImportPlatform | 'recording';

const YOUTUBE_RE = /youtube\.com|youtu\.be/i;
const INSTAGRAM_RE = /instagram\.com/i;
/** Personal recording hosts that the Create video pipeline downloads/clips. */
const RECORDING_RE = /zoom\.us|loom\.com|vimeo\.com/i;

/**
 * Pull the first http(s) URL out of free text, trimming trailing punctuation
 * (e.g. a period ending the sentence). Returns null when none is present.
 */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  return match[0].replace(/[.,;:!?)\]}]+$/, '');
}

/**
 * Classify a URL for the KB ingest path. 'recording' means "no importer —
 * this belongs in Create, not Your Voice".
 */
export function detectIngestUrlKind(url: string): IngestUrlKind {
  if (RECORDING_RE.test(url)) return 'recording';
  if (YOUTUBE_RE.test(url)) return 'youtube';
  if (INSTAGRAM_RE.test(url)) return 'instagram';
  return 'blog';
}
