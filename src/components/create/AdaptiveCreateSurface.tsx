'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AdvisorResponse, NudgeAction, Proposal } from '@/types/advisor';
import { CoverageMeter } from './CoverageMeter';
import { AdvisorNudgeCard } from './AdvisorNudgeCard';
import { AutopilotProposalCard } from './AutopilotProposalCard';
import { CapabilityTiles } from './CapabilityTiles';
import { VideoLibraryDrop } from './VideoLibraryDrop';

interface AdaptiveCreateSurfaceProps {
  // Prefill the composer with text (capability tile, create action, or proposal).
  onPrefill: (text: string) => void;
  // Start voice capture (voice action / empty-state primary CTA).
  onStartVoice: () => void;
  // Open the ingest flow (ingest action).
  onOpenIngest: () => void;
}

export function AdaptiveCreateSurface({ onPrefill, onStartVoice, onOpenIngest }: AdaptiveCreateSurfaceProps) {
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await api.kb.advisor();
        if (!active) return;
        if (response?.success && response.data) {
          setAdvisor(response.data);
        } else {
          setFailed(true);
        }
      } catch {
        if (!active) return;
        setFailed(true);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  const handleAction = (action: NudgeAction) => {
    if (action.type === 'voice') return onStartVoice();
    if (action.type === 'ingest') return onOpenIngest();
    const prefill = typeof action.payload?.prefill === 'string' ? action.payload.prefill : '';
    onPrefill(prefill);
  };

  const handleProposal = (proposal: Proposal) => {
    onPrefill(proposal.title);
  };

  // Fallback: advisor unavailable. Render a usable thin-equivalent layout.
  if (failed) {
    return (
      <div className="space-y-4">
        <CapabilityTiles onSelect={onPrefill} />
        <VideoLibraryDrop />
      </div>
    );
  }

  // Loading skeleton (advisor in flight). Keep it quiet and low-UI.
  if (!advisor) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-primary/5" />
        <div className="h-16 animate-pulse rounded-xl bg-primary/5" />
      </div>
    );
  }

  const { state, coverage, nudge, proposals } = advisor;

  return (
    <div className="space-y-5">
      <AdvisorNudgeCard nudge={nudge} onAction={handleAction} />

      {state === 'rich' && proposals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <AutopilotProposalCard key={p.id} proposal={p} onSelect={handleProposal} />
          ))}
        </div>
      )}

      <CoverageMeter coverage={coverage} />
      <CapabilityTiles onSelect={onPrefill} heading={state === 'empty' ? "What you'll be able to make" : 'What Echo can do'} />
      <VideoLibraryDrop />
    </div>
  );
}
