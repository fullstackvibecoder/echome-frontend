/**
 * In-memory handoff for Echo's create/text payloads passed to the Create form.
 * Same idea as the ?echoPrompt= seed but for File objects and large text, which
 * cannot survive a URL. Single-slot, consumed-on-read, SPA-session only.
 */

export type EchoHandoff =
  | { kind: 'video-file'; file: File; note?: string }
  | { kind: 'text'; text: string };

let pending: EchoHandoff | null = null;

export function stashEchoHandoff(h: EchoHandoff): void {
  pending = h;
}

/** Returns and clears the pending handoff (consume-once). */
export function takeEchoHandoff(): EchoHandoff | null {
  const h = pending;
  pending = null;
  return h;
}
