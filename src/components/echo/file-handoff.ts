/**
 * In-memory handoff for files Echo passes to the Create form.
 * Same idea as the ?echoPrompt= seed but for File objects, which
 * cannot survive a URL. Single-slot, consumed-on-read, SPA-session only.
 */
let pending: { file: File; note?: string } | null = null;

export function stashEchoFile(file: File, note?: string): void {
  pending = { file, note };
}

/** Returns and clears the pending file (consume-once). */
export function takeEchoFile(): { file: File; note?: string } | null {
  const f = pending;
  pending = null;
  return f;
}
