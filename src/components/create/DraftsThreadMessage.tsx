'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { DraftCard } from '@/components/dashboard/DraftCard';
import type { DraftProposal } from '@/types';

export function DraftsThreadMessage() {
  const [drafts, setDrafts] = useState<DraftProposal[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  if (!loaded || drafts.length === 0) return null;

  const n = drafts.length;
  const noun = n === 1 ? 'thing' : 'things';

  function handleDismiss(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <section id="drafts" aria-label="Drafted for you" className="mb-2 scroll-mt-20">
      <p>I drafted {n} {noun} for you while you were away. Take a look.</p>
      {drafts.map((d) => (
        <DraftCard key={d.id} draft={d} onDismissed={handleDismiss} />
      ))}
    </section>
  );
}
