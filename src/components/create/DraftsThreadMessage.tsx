'use client';

/**
 * DraftsThreadMessage.tsx
 * Autonomous drafts surfaced on the Create page. Collapsed by default to a
 * single line so Echo's overnight work is visible without breaking the
 * fold (the old expanded DraftCard dominated the first viewport). Expanding
 * shows compact DraftRows, which already carry the full Review / Schedule /
 * Kill action set.
 */

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { DraftRow } from '@/components/dashboard/DraftRow';
import type { DraftProposal } from '@/types';

export function DraftsThreadMessage() {
  const [drafts, setDrafts] = useState<DraftProposal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;

    api.drafts.list().then((result) => {
      if (!alive) return;
      setDrafts(result);
      setLoaded(true);
    }).catch(() => {
      if (!alive) return;
      setLoaded(true);
    });

    return () => {
      alive = false;
    };
  }, []);

  function handleDismiss(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  if (!loaded || drafts.length === 0) return null;

  const n = drafts.length;

  return (
    <section id="drafts" aria-label="Drafted for you" className="mt-3 w-full max-w-2xl scroll-mt-20">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mx-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Sparkles size={14} aria-hidden="true" />
        <span>
          Echo wrote {n} {n === 1 ? 'post' : 'posts'} for you while you were away
        </span>
        <span className="flex items-center gap-1 font-medium text-foreground">
          {expanded ? 'Hide' : 'Take a look'}
          {expanded ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-container-low)] p-1.5">
          {drafts.map((d) => (
            <DraftRow key={d.id} draft={d} onDismissed={handleDismiss} />
          ))}
        </div>
      )}
    </section>
  );
}
