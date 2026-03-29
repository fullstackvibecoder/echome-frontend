/**
 * Caption parser and types for the overlay rendering system.
 * Parses SRT content and provides segment/word-level timing data
 * for synced caption display on the video player.
 */

export interface CaptionWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

export interface CaptionSegment {
  text: string;
  start: number; // seconds
  end: number; // seconds
  words: CaptionWord[];
}

export type CaptionStylePreset =
  | 'modern'
  | 'classic'
  | 'bold'
  | 'minimal'
  | 'highlight'
  | 'karaoke'
  | 'underline'
  | 'word_by_word';

/** Line-level styles show full text; word-level styles animate per word */
export const WORD_LEVEL_STYLES: CaptionStylePreset[] = [
  'highlight',
  'karaoke',
  'underline',
  'word_by_word',
];

export function isWordLevelStyle(style: CaptionStylePreset): boolean {
  return WORD_LEVEL_STYLES.includes(style);
}

/**
 * Parse SRT subtitle content into structured segments.
 * SRT format:
 *   1
 *   00:00:01,000 --> 00:00:04,000
 *   Hello world
 */
export function parseSRT(content: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // Line 1: index (skip)
    // Line 2: timestamps
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const start =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const end =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    // Lines 3+: text
    const text = lines.slice(2).join(' ').trim();

    segments.push({
      text,
      start,
      end,
      words: [], // SRT doesn't have word-level timing
    });
  }

  return segments;
}

/**
 * Find the active caption segment for a given time.
 * Applies a lead time offset for snappier word-level styles.
 */
export function getActiveSegment(
  segments: CaptionSegment[],
  currentTime: number,
  leadTimeMs: number = 0
): CaptionSegment | null {
  const adjustedTime = currentTime + leadTimeMs / 1000;

  for (const seg of segments) {
    if (adjustedTime >= seg.start && adjustedTime <= seg.end) {
      return seg;
    }
  }
  return null;
}

/**
 * Find the active word within a segment for word-level styles.
 * Returns the index of the active word.
 *
 * Handles gaps between word timestamps (common in Deepgram output) by
 * snapping to the nearest word rather than returning -1, which would
 * cause flickering highlights.
 */
export function getActiveWordIndex(
  segment: CaptionSegment,
  currentTime: number,
  leadTimeMs: number = 0 // No lead — sync exactly with speech
): number {
  if (!segment.words.length) return -1;
  const t = currentTime + leadTimeMs / 1000;

  // Exact match — time falls within a word's range
  for (let i = 0; i < segment.words.length; i++) {
    if (t >= segment.words[i].start && t <= segment.words[i].end) {
      return i;
    }
  }

  // Gap handling — time falls between two words, snap to the nearest one
  // This prevents flicker during the small gaps in Deepgram timestamps
  for (let i = 0; i < segment.words.length - 1; i++) {
    if (t > segment.words[i].end && t < segment.words[i + 1].start) {
      // In a gap — hold the previous word (feels more natural than jumping early)
      return i;
    }
  }

  // Before first word — highlight first
  if (t < segment.words[0].start) return 0;
  // After last word — hold last
  if (t > segment.words[segment.words.length - 1].end) return segment.words.length - 1;

  return -1;
}

/**
 * Get the karaoke fill percentage for a word (0-100).
 * Used by the karaoke style to animate progressive fill.
 */
export function getKaraokeFill(
  word: CaptionWord,
  currentTime: number
): number {
  if (currentTime < word.start) return 0;
  if (currentTime >= word.end) return 100;
  const duration = word.end - word.start;
  if (duration <= 0) return 100;
  return Math.min(100, ((currentTime - word.start) / duration) * 100);
}
