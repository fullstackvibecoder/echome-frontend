/**
 * Hemingway middleware — Flesch-Kincaid Grade Level analyzer.
 *
 * Pure client-side, zero dependencies. Surfaces per-sentence flags so a
 * compose-time UI can underline complex sentences without blocking the
 * user's submit. The wire-shape projection lives in `toHemingwayScore`.
 */

import type { HemingwayScore } from '../types';

export const SOFT_FLAG_THRESHOLD = 6.0;
export const HARD_FLAG_THRESHOLD = 9.0;

// Wall-of-text triggers when both conditions are true: ≥ 150 words AND
// fewer than 20% of lines are bulleted. Skimmability matters once content
// is long enough that scanning is the realistic reading mode.
export const WALL_OF_TEXT_WORD_THRESHOLD = 150;
export const WALL_OF_TEXT_BULLET_DENSITY_THRESHOLD = 0.2;

export const NUDGE_COPY =
  'Echo flagged this one. It might be a mouthful for social. Try splitting it.';

export const WALL_OF_TEXT_COPY =
  'Echo: this is a wall of text. Try bullets so busy professionals can scan.';

export const BRAND_SAFETY_DISCLAIMER =
  "Echo's read can inflate around industry terms like FollowUpBoss or MLS. Focus on simplifying sentences first.";

export type HemingwaySeverity = 'soft' | 'hard';

export interface SentenceFlag {
  text: string;
  start: number;
  end: number;
  gradeLevel: number;
  severity: HemingwaySeverity;
  suggestion: string;
}

export type DocumentFlagKind = 'wall_of_text';

export interface DocumentFlag {
  kind: DocumentFlagKind;
  message: string;
}

export interface HemingwayAnalysis {
  documentGradeLevel: number;
  passed: boolean;
  flags: SentenceFlag[];
  documentFlags: DocumentFlag[];
  bulletDensity: number;
  allSentences: Array<{ text: string; gradeLevel: number }>;
}

const EMPTY_ANALYSIS: HemingwayAnalysis = {
  documentGradeLevel: 0,
  passed: true,
  flags: [],
  documentFlags: [],
  bulletDensity: 0,
  allSentences: [],
};

interface SentenceSpan {
  text: string;
  start: number;
  end: number;
}

const VOWEL_GROUP_RE = /[aeiouy]{1,2}/g;
const SILENT_E_RE = /(?:[^laeiouy]es|ed|[^laeiouy]e)$/;
const SENTENCE_RE = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
const BULLET_LINE_RE = /^\s*(?:[-*•]|\d+\.)\s+/;
const WORD_TOKEN_RE = /\s+/;

/**
 * Heuristic syllable count. Accurate to ~95% at the document level;
 * one-sentence misfires by ±1 are absorbed by FK's word-length term.
 */
export function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.length === 0) return 0;
  if (normalized.length <= 3) return 1;
  const stripped = normalized.replace(SILENT_E_RE, '').replace(/^y/, '');
  const matches = stripped.match(VOWEL_GROUP_RE);
  return matches ? matches.length : 1;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(WORD_TOKEN_RE).length;
}

/**
 * Splits text into sentence spans with original-text char offsets.
 * Heuristic: terminator (. ! ?) followed by whitespace or end-of-text.
 * Trailing fragment without a terminator is captured as a final span.
 */
export function splitSentences(text: string): SentenceSpan[] {
  if (!text.trim()) return [];
  const spans: SentenceSpan[] = [];
  for (const match of text.matchAll(SENTENCE_RE)) {
    const raw = match[0];
    const trimmedRight = raw.replace(/\s+$/, '');
    if (!trimmedRight.trim()) continue;
    const start = match.index ?? 0;
    spans.push({
      text: trimmedRight,
      start,
      end: start + trimmedRight.length,
    });
  }
  return spans;
}

/**
 * Flesch-Kincaid Grade Level.
 *   0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 */
export function fleschKincaid(
  words: number,
  sentences: number,
  syllables: number,
): number {
  if (words === 0 || sentences === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

export function calculateBulletDensity(text: string): number {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return 0;
  const bulletLines = lines.filter((l) => BULLET_LINE_RE.test(l)).length;
  return bulletLines / lines.length;
}

function severityFor(gradeLevel: number): HemingwaySeverity | null {
  if (gradeLevel > HARD_FLAG_THRESHOLD) return 'hard';
  if (gradeLevel > SOFT_FLAG_THRESHOLD) return 'soft';
  return null;
}

function tokensFor(text: string): string[] {
  return text.trim().split(WORD_TOKEN_RE).filter(Boolean);
}

function syllablesFor(tokens: string[]): number {
  let total = 0;
  for (const t of tokens) total += countSyllables(t);
  return total;
}

function analyzeTextInternal(text: string): HemingwayAnalysis {
  const sentences = splitSentences(text);
  const allSentences: Array<{ text: string; gradeLevel: number }> = [];
  const flags: SentenceFlag[] = [];

  let totalWords = 0;
  let totalSyllables = 0;

  for (const span of sentences) {
    const tokens = tokensFor(span.text);
    if (tokens.length === 0) continue;
    const syllableCount = syllablesFor(tokens);

    totalWords += tokens.length;
    totalSyllables += syllableCount;

    const gradeLevel = fleschKincaid(tokens.length, 1, syllableCount);
    allSentences.push({ text: span.text, gradeLevel });

    const severity = severityFor(gradeLevel);
    if (severity) {
      flags.push({
        text: span.text,
        start: span.start,
        end: span.end,
        gradeLevel,
        severity,
        suggestion: NUDGE_COPY,
      });
    }
  }

  const documentGradeLevel = fleschKincaid(
    totalWords,
    Math.max(sentences.length, 1),
    totalSyllables,
  );

  const bulletDensity = calculateBulletDensity(text);

  const documentFlags: DocumentFlag[] = [];
  if (
    totalWords > WALL_OF_TEXT_WORD_THRESHOLD &&
    bulletDensity < WALL_OF_TEXT_BULLET_DENSITY_THRESHOLD
  ) {
    documentFlags.push({ kind: 'wall_of_text', message: WALL_OF_TEXT_COPY });
  }

  return {
    documentGradeLevel,
    passed: documentGradeLevel <= SOFT_FLAG_THRESHOLD,
    flags,
    documentFlags,
    bulletDensity,
    allSentences,
  };
}

/**
 * Defensive wrapper. The analyzer should never throw on string input,
 * but a regex/parse bug here must never crash the live editor. We log
 * to console (Sentry will pick it up) and return a safe empty analysis
 * so the UI degrades to "no flags" rather than a broken modal.
 */
export function analyzeText(text: string): HemingwayAnalysis {
  try {
    return analyzeTextInternal(text);
  } catch (err) {
    console.error('[hemingway] analyzer failed, returning empty analysis:', err);
    return EMPTY_ANALYSIS;
  }
}

/**
 * Wire/storage projection. Drops live-editor char offsets — stored
 * content is immutable so there's nothing to underline at retrieval.
 */
export function toHemingwayScore(analysis: HemingwayAnalysis): HemingwayScore {
  return {
    gradeLevel: analysis.documentGradeLevel,
    passed: analysis.passed,
    flaggedSentences: analysis.flags.map((f) => ({
      text: f.text,
      gradeLevel: f.gradeLevel,
      suggestion: f.suggestion,
    })),
    bulletDensity: analysis.bulletDensity,
    scannedAt: new Date().toISOString(),
  };
}
