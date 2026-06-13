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
      className="flex w-full flex-col items-start gap-2 rounded-xl border border-border bg-white p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {proposal.kitType.replace(/_/g, ' ')}
      </span>
      <span className="text-sm font-semibold text-foreground">{proposal.title}</span>
      <span className="text-xs text-muted-foreground">{proposal.rationale}</span>
    </button>
  );
}
