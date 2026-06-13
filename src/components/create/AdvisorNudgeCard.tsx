'use client';

import { Mic, Paperclip, Sparkles } from 'lucide-react';
import { Nudge, NudgeAction, NudgeActionType } from '@/types/advisor';

interface AdvisorNudgeCardProps {
  nudge: Nudge;
  onAction: (action: NudgeAction) => void;
}

const ICONS: Record<NudgeActionType, typeof Mic> = {
  voice: Mic,
  ingest: Paperclip,
  create: Sparkles,
};

export function AdvisorNudgeCard({ nudge, onAction }: AdvisorNudgeCardProps) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <h2 className="text-lg font-semibold text-foreground">{nudge.headline}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{nudge.subhead}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {nudge.actions.map((action, i) => {
          const Icon = ICONS[action.type];
          const primary = i === 0;
          return (
            <button
              key={`${action.type}-${i}`}
              type="button"
              onClick={() => onAction(action)}
              className={
                primary
                  ? 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90'
                  : 'inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5'
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
