export interface DraftCache {
  subject: string;
  bodyHtml: string;
  segment: string;
  presetKey: string | null;
  savedAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;

function key(adminId: string): string { return `echome-email-draft-${adminId}`; }

export function readDraft(adminId: string): DraftCache | null {
  try {
    const raw = localStorage.getItem(key(adminId));
    if (!raw) return null;
    const d = JSON.parse(raw) as DraftCache;
    if (Date.now() - d.savedAt > TTL_MS) { localStorage.removeItem(key(adminId)); return null; }
    return d;
  } catch { return null; }
}

export function writeDraft(adminId: string, draft: Omit<DraftCache, 'savedAt'>): void {
  try {
    localStorage.setItem(key(adminId), JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* quota / private mode — ignore */ }
}

export function clearDraft(adminId: string): void {
  try { localStorage.removeItem(key(adminId)); } catch { /* ignore */ }
}
