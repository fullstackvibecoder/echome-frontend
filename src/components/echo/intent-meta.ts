/**
 * intent-meta.ts
 * Per-intent display labels, receipt verbs, and route map.
 * Centralised so EchoExchange stays fully presentational.
 */

import type { EchoIntent } from '@/lib/echo-client';
import { isAudioFile, isMboxFile, MAX_FILE_SIZE } from '@/lib/file-utils';

// ---- File-kind routing ----

export type EchoFileKind =
  | 'video'
  | 'audio'
  | 'text'
  | 'document'
  | 'mbox'
  | 'unsupported';

// Mirrors the KB document uploader's accepted set (file-utils
// ACCEPTED_FILE_TYPES, minus audio/mbox which classify separately).
const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

export function classifyFile(file: File): EchoFileKind {
  if (file.type.startsWith('video/')) return 'video';
  // mbox before text: Apple Mail exports can carry text/plain MIME
  if (isMboxFile(file)) return 'mbox';
  // extension-first so blank/odd MIME types (iPhone m4a, flac) still route
  if (isAudioFile(file)) return 'audio';
  if (
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    /\.(txt|md)$/i.test(file.name)
  )
    return 'text';
  if (DOCUMENT_MIMES.has(file.type) || /\.(pdf|docx|doc)$/i.test(file.name))
    return 'document';
  return 'unsupported';
}

export const MAX_ECHO_AUDIO_BYTES = 250 * 1024 * 1024; // backend KB ingest cap
export const MAX_ECHO_TEXT_BYTES = 1 * 1024 * 1024;
// KB document route caps PDF/DOCX/DOC at 500 MB (file-service KB_FILE_TYPES)
export const MAX_ECHO_DOCUMENT_BYTES = MAX_FILE_SIZE;

export interface IntentMeta {
  /** Short uppercase label shown on the intent chip */
  chipLabel: string;
  /** Longer description shown under the chip row */
  description: string;
  /** Receipt verb prefix (uppercased, .text-machine) */
  receiptVerb: string;
}

export const INTENT_META: Record<EchoIntent, IntentMeta> = {
  create: {
    chipLabel: 'CREATING A KIT',
    description: 'Hand this off to the Create page',
    receiptVerb: 'HANDED TO CREATE',
  },
  ingest: {
    chipLabel: 'ADDING TO YOUR VOICE',
    description: 'Add this to your Voice',
    receiptVerb: 'ADDED TO YOUR VOICE',
  },
  question: {
    chipLabel: 'QUESTION',
    description: 'Ask your Voice',
    receiptVerb: 'ANSWERED FROM YOUR VOICE',
  },
  command: {
    chipLabel: 'COMMAND',
    description: 'Navigate to a page',
    receiptVerb: 'OPENED',
  },
};

/** Ordered list of all intents for the correction chip row */
export const ALL_INTENTS: EchoIntent[] = ['create', 'ingest', 'question', 'command'];

/** Maps command targets to app routes */
export const COMMAND_ROUTE_MAP: Record<string, string> = {
  library: '/app/library',
  calendar: '/app/calendar',
  settings: '/app/settings',
  voice: '/app/voice',
  radar: '/app/radar',
  kit: '/app/library',
  // 'regenerate' executes in-place when the user is on a kit page (useEcho
  // special-cases it before this map); this entry is the fallback route
  // when they aren't.
  regenerate: '/app/library',
};

/** Format a receipt line: "VERB . HH:MM" */
export function formatReceipt(verb: string, timestamp: Date = new Date()): string {
  const hh = timestamp.getHours().toString().padStart(2, '0');
  const mm = timestamp.getMinutes().toString().padStart(2, '0');
  return `${verb} · ${hh}:${mm}`;
}
