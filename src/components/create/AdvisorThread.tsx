'use client';

import { AutopilotProposalCard } from '@/components/create/AutopilotProposalCard';
import { CoverageMeter } from '@/components/create/CoverageMeter';
import type { AdvisorResponse, Proposal } from '@/types/advisor';

interface AdvisorThreadProps {
  advisor: AdvisorResponse;
  onProposalSelect: (proposal: Proposal) => void;
}

// Nudge action buttons ("Record now" / "Add a file" / "Make something now")
// were removed: the always-present composer below this thread already exposes
// mic (voice), paperclip (ingest), and free text (create), so the buttons
// duplicated affordances the user can reach one box down. The headline/subhead
// stay as orienting copy.
function NudgeBlock({ advisor }: { advisor: AdvisorResponse }) {
  return (
    <div className="tex-voice rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-semibold leading-snug text-foreground">
        {advisor.nudge.headline}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {advisor.nudge.subhead}
      </p>
    </div>
  );
}

export function AdvisorThread({
  advisor,
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
        <NudgeBlock advisor={advisor} />
      </div>
    );
  }

  // rich state. Suppress the nudge once drafts exist — the proposals below say
  // the same "Echo can build from what you shared" thing, just concretely.
  const hasNudge = advisor.nudge.headline.length > 0;
  const showNudge = hasNudge && advisor.proposals.length === 0;

  return (
    <div data-testid="advisor-rich" className="space-y-4">
      {showNudge && <NudgeBlock advisor={advisor} />}
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
