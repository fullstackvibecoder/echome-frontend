'use client';

import { PenLine } from 'lucide-react';
import { Proposal } from '@/types/advisor';

interface AutopilotProposalCardProps {
  proposal: Proposal;
  onSelect: (proposal: Proposal) => void;
}

export function AutopilotProposalCard({ proposal, onSelect }: AutopilotProposalCardProps) {
  const kitLabel = proposal.kitType.replace(/_/g, ' ');

  return (
    <button
      type="button"
      onClick={() => onSelect(proposal)}
      className="group flex h-full w-full flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <PenLine className="h-3 w-3 shrink-0" />
        Suggested angle
      </span>
      <span className="text-sm font-semibold leading-snug text-foreground">{proposal.title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:block">{proposal.rationale}</span>
      <span className="mt-auto pt-1.5 text-[10px] text-muted-foreground/60">
        {kitLabel} · Load in composer →
      </span>
    </button>
  );
}
