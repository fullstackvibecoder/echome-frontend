import { PANEL_KINDS, type PanelKind, type PanelTarget } from '@/lib/just-echo-client';

const MAX_ID_LENGTH = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPanelKind(s: string): s is PanelKind {
  return (PANEL_KINDS as readonly string[]).includes(s);
}

/** Parses the `open=` URL param: `kind` or `kind:id`. Returns null when invalid. */
export function parseOpenParam(raw: string | null): PanelTarget | null {
  if (!raw) return null;
  const colon = raw.indexOf(':');
  const kind = colon === -1 ? raw : raw.slice(0, colon);
  if (!isPanelKind(kind)) return null;
  if (colon === -1) return { kind };
  const id = raw.slice(colon + 1);
  if (!id || id.length > MAX_ID_LENGTH) return null;
  return { kind, id };
}

/** Formats a target for the `open=` URL param. The filter is never written to the URL. */
export function formatOpenParam(t: PanelTarget): string {
  return t.id ? `${t.kind}:${t.id}` : t.kind;
}

function listSource(t: PanelTarget): string | undefined {
  return t.filter?.source;
}

export function panelTitle(t: PanelTarget): string {
  switch (t.kind) {
    case 'kit':
      return 'Kit';
    case 'clips':
      return 'Clips';
    case 'carousel':
      return 'Carousel';
    case 'calendar':
      return 'Calendar';
    case 'voice':
      return 'Your voice';
    case 'list': {
      const source = listSource(t);
      if (source === 'list_drafts') return 'Drafts';
      if (source === 'list_recent_posts') return 'Recent posts';
      return 'Your kits';
    }
  }
}

/** The full-page route a panel opens into. */
export function fullPageHref(t: PanelTarget): string {
  switch (t.kind) {
    case 'kit':
    case 'carousel':
      return t.id ? `/app/library/${encodeURIComponent(t.id)}` : '/app/library';
    case 'clips':
      return '/app/clips';
    case 'calendar':
      return '/app/calendar';
    case 'voice':
      return '/app/voice';
    case 'list':
      return listSource(t) === 'list_recent_posts' ? '/app/calendar' : '/app/library';
  }
}

export function samePanel(a: PanelTarget | null, b: PanelTarget | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind || a.id !== b.id) return false;
  const fa = a.filter ?? {};
  const fb = b.filter ?? {};
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  for (const k of keys) {
    if (fa[k] !== fb[k]) return false;
  }
  return true;
}

export function isUuid(s: string | null): boolean {
  return s !== null && UUID_RE.test(s);
}
