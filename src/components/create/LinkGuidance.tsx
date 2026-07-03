'use client';

/**
 * LinkGuidance.tsx
 * One quiet line under the composer that answers "what links work here and
 * what do they become". Two modes:
 *   - hint: shown after the user clicks the Paste-a-link card (declared
 *     intent, pre-paste) — names the supported sources and their outcomes.
 *   - detected: a URL is present in the composer — names what THIS link
 *     becomes, per the routing in src/lib/url-platform.ts.
 * Detected wins over hint. Renders nothing when neither applies.
 */

import { extractFirstUrl, detectIngestUrlKind } from '@/lib/url-platform';

const HINT_COPY =
  'Works with YouTube, Instagram, Zoom, Loom, and Vimeo links, plus blogs and articles. Videos become clips and content. Articles fill your knowledge base, for Echo to learn from and create with.';

const DETECTED_COPY: Record<string, string> = {
  youtube: 'YouTube link. Echo can cut clips, make content, or learn your voice from it.',
  instagram: 'Instagram link. Echo can cut clips, make content, or learn your voice from it.',
  recording: 'Recording link. Echo cuts clips and makes content from it.',
  blog: 'Article link. Echo adds it to your knowledge base, learns your voice, and can create from it.',
};

interface LinkGuidanceProps {
  /** Current composer text — scanned for a URL. */
  inputText: string;
  /** True after the Paste-a-link card was clicked; cleared on submit. */
  hintActive: boolean;
}

export function LinkGuidance({ inputText, hintActive }: LinkGuidanceProps) {
  const url = extractFirstUrl(inputText);
  const message = url ? DETECTED_COPY[detectIngestUrlKind(url)] : hintActive ? HINT_COPY : null;
  if (!message) return null;

  return (
    <p
      data-testid="link-guidance"
      role="status"
      className="mt-2 max-w-xl text-center text-xs leading-snug"
      style={{ color: 'var(--muted-foreground)' }}
    >
      {message}
    </p>
  );
}
