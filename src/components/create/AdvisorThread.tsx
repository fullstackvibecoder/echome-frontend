'use client';

import { Mic, Paperclip, Sparkles } from 'lucide-react';
import { AutopilotProposalCard } from '@/components/create/AutopilotProposalCard';
import { CoverageMeter } from '@/components/create/CoverageMeter';
import type { AdvisorResponse, NudgeAction, NudgeActionType, Proposal } from '@/types/advisor';

const NUDGE_ICONS: Record<NudgeActionType, typeof Mic> = {
  voice: Mic,
  ingest: Paperclip,
  create: Sparkles,
};

interface AdvisorThreadProps {
  advisor: AdvisorResponse;
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
  onNudgeAction,
  onProposalSelect,
}: AdvisorThreadProps) {
  // Empty state renders nothing here: EchoHero already shows the orienting
  // hero header + subhead and the always-present composer above/below this
  // thread. Ingest now flows through that composer (useEcho), so the old
  // embedded KBUnifiedInput pill — and its duplicate heading — are gone.
  if (advisor.state === 'empty') {
    return null;
  }

  if (advisor.state === 'thin') {
    return (
      <div data-testid="advisor-thin" className="space-y-4">
        <NudgeBlock advisor={advisor} onNudgeAction={onNudgeAction} />
      </div>
    );
  }

  // rich state. Suppress the nudge once drafts exist — the proposals below say
  // the same "Echo can build from what you shared" thing, just concretely.
  const hasNudge = advisor.nudge.headline.length > 0;
  const showNudge = hasNudge && advisor.proposals.length === 0;

  return (
    <div data-testid="advisor-rich" className="space-y-4">
      {showNudge && (
        <NudgeBlock advisor={advisor} onNudgeAction={onNudgeAction} />
      )}
      {advisor.proposals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {advisor.proposals.map((p) => (
            <AutopilotProposalCard key={p.id} proposal={p} onSelect={onProposalSelect} />
          ))}
        </div>
      )}
      <CoverageMeter coverage={advisor.coverage} />
    </div>
  );
}
