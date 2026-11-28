import type { ReactNode } from 'react';

const URL_RE = /(https:\/\/[^\s<>"']+|\/app\/[^\s<>"']*)/g;
const TRAILING = /[.,;:!?)\]]+$/;

/** Turns https:// URLs and absolute /app/... paths into links. Everything else stays text. */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    // A /app path must start a token, not sit inside another path or word.
    if (m[0].startsWith('/') && start > 0 && !/\s|[(\[]/.test(text[start - 1])) continue;
    const trail = m[0].match(TRAILING)?.[0] ?? '';
    const url = trail ? m[0].slice(0, -trail.length) : m[0];
    if (url === '/app/' && !trail) continue;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={`l${n++}`}
        href={url}
        className="underline underline-offset-2 text-je-accent"
        {...(url.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {url}
      </a>,
    );
    last = start + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
