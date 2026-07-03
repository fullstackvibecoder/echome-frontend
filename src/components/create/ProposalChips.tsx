'use client';

/**
 * ProposalChips.tsx
 * Advisor autopilot proposals as tappable pill chips under the Create
 * composer. Tap prefills the composer (handled by the parent). The first
 * proposal is the top pick and gets the reserved cyan accent; all other
 * chips stay neutral.
 */

import type { Proposal } from '@/types/advisor';

const MAX_CHIPS = 3;

interface ProposalChipsProps {
  proposals: Proposal[];
  onSelect: (proposal: Proposal) => void;
}

export function ProposalChips({ proposals, onSelect }: ProposalChipsProps) {
  const shown = proposals.slice(0, MAX_CHIPS);
  if (shown.length === 0) return null;

  return (
    <div className="mt-5 w-full max-w-2xl">
      <div className="flex flex-wrap justify-center gap-2">
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            {...(i === 0 ? { 'data-top-pick': 'true' } : {})}
            className={[
              'rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
              i === 0
                ? 'border-[rgba(0,212,255,0.5)] text-foreground hover:border-[rgba(0,212,255,0.8)]'
                : 'border-[var(--border)] text-muted-foreground hover:border-[var(--muted-foreground)] hover:text-foreground',
            ].join(' ')}
          >
            {p.title}
          </button>
        ))}
      </div>
      <p
        className="mt-3 text-center text-machine"
        style={{ color: 'var(--muted-foreground)', fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}
      >
        Suggested from your knowledge base
      </p>
    </div>
  );
}
