'use client';

import { Sparkles } from 'lucide-react';
import { Proposal } from '@/types/advisor';

interface AutopilotProposalCardProps {
  proposal: Proposal;
  onSelect: (proposal: Proposal) => void;
}

export function AutopilotProposalCard({ proposal, onSelect }: AutopilotProposalCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(proposal)}
      className="flex h-full w-full flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
        <Sparkles className="h-3 w-3 shrink-0" />
        {proposal.kitType.replace(/_/g, ' ')}
      </span>
      <span className="text-sm font-semibold leading-snug text-foreground">{proposal.title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{proposal.rationale}</span>
    </button>
  );
}
