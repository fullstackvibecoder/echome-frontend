/**
 * intent-meta.ts
 * Per-intent display labels, receipt verbs, and route map.
 * Centralised so EchoExchange stays fully presentational.
 */

import type { EchoIntent } from '@/lib/echo-client';

// ---- File-kind routing ----

export type EchoFileKind = 'video' | 'audio' | 'text' | 'unsupported';

export function classifyFile(file: File): EchoFileKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    /\.(txt|md)$/i.test(file.name)
  )
    return 'text';
  return 'unsupported';
}

export const MAX_ECHO_AUDIO_BYTES = 250 * 1024 * 1024; // backend KB ingest cap
export const MAX_ECHO_TEXT_BYTES = 1 * 1024 * 1024;

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
    description: 'Save this as a text note in your Voice',
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
