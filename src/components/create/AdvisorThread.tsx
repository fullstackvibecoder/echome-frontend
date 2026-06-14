'use client';

import { ValueLadder, type LadderActionId } from '@/components/create/ValueLadder';
import { AutopilotProposalCard } from '@/components/create/AutopilotProposalCard';
import { CoverageMeter } from '@/components/create/CoverageMeter';
import type { AdvisorResponse, NudgeAction, Proposal } from '@/types/advisor';

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
    <>
      <p>{advisor.nudge.headline}</p>
      <p>{advisor.nudge.subhead}</p>
      {advisor.nudge.actions.map((action) => (
        <button
          key={`${action.type}-${action.label}`}
          data-testid="nudge-action"
          onClick={() => onNudgeAction(action)}
        >
          {action.label}
        </button>
      ))}
    </>
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
      <div data-testid="advisor-empty">
        <p>{PITCH}</p>
        <ValueLadder onAction={onLadderAction} />
      </div>
    );
  }

  if (advisor.state === 'thin') {
    return (
      <div data-testid="advisor-thin">
        <NudgeBlock advisor={advisor} onNudgeAction={onNudgeAction} />
        <ValueLadder onAction={onLadderAction} />
      </div>
    );
  }

  // rich state
  const hasNudge = advisor.nudge.headline.length > 0;

  return (
    <div data-testid="advisor-rich">
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
