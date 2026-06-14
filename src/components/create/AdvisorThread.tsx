'use client';

import { Mic, Paperclip, Sparkles } from 'lucide-react';
import { ValueLadder, type LadderActionId } from '@/components/create/ValueLadder';
import { AutopilotProposalCard } from '@/components/create/AutopilotProposalCard';
import { CoverageMeter } from '@/components/create/CoverageMeter';
import type { AdvisorResponse, NudgeAction, NudgeActionType, Proposal } from '@/types/advisor';

const NUDGE_ICONS: Record<NudgeActionType, typeof Mic> = {
  voice: Mic,
  ingest: Paperclip,
  create: Sparkles,
};

export const PITCH =
  'The fastest way to sound like you is to talk to me. Two minutes of your voice teaches me more than a stack of documents.';

interface AdvisorThreadProps {
  advisor: AdvisorResponse;
  onLadderAction: (id: LadderActionId) => void;
  onNudgeAction: (action: NudgeAction) => void;
  onProposalSelect: (proposal: Proposal) => void;
}

function NudgeBlock({
  advisor,
  onNudgeAction,
}: {
  advisor: AdvisorResponse;
  onNudgeAction: (action: NudgeAction) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-semibold leading-snug text-foreground">
        {advisor.nudge.headline}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {advisor.nudge.subhead}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {advisor.nudge.actions.map((action, i) => {
          const Icon = NUDGE_ICONS[action.type];
          const primary = i === 0;
          return (
            <button
              key={`${action.type}-${action.label}`}
              type="button"
              data-testid="nudge-action"
              onClick={() => onNudgeAction(action)}
              className={
                primary
                  ? 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
                  : 'inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5'
              }
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdvisorThread({
  advisor,
  onLadderAction,
  onNudgeAction,
  onProposalSelect,
}: AdvisorThreadProps) {
  if (advisor.state === 'empty') {
    return (
      <div data-testid="advisor-empty" className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{PITCH}</p>
        <ValueLadder onAction={onLadderAction} />
      </div>
    );
  }

  if (advisor.state === 'thin') {
    return (
      <div data-testid="advisor-thin" className="space-y-4">
        <NudgeBlock advisor={advisor} onNudgeAction={onNudgeAction} />
        <ValueLadder onAction={onLadderAction} />
      </div>
    );
  }

  // rich state
  const hasNudge = advisor.nudge.headline.length > 0;

  return (
    <div data-testid="advisor-rich" className="space-y-4">
      {hasNudge && (
        <NudgeBlock advisor={advisor} onNudgeAction={onNudgeAction} />
      )}
      {advisor.proposals.map((p) => (
        <AutopilotProposalCard key={p.id} proposal={p} onSelect={onProposalSelect} />
      ))}
      <CoverageMeter coverage={advisor.coverage} />
    </div>
  );
}
