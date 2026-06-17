'use client';

import { Coverage, DIMENSION_KEYS, DIMENSION_LABELS } from '@/types/advisor';

interface CoverageMeterProps {
  coverage: Coverage;
}

export function CoverageMeter({ coverage }: CoverageMeterProps) {
  const coveredCount = DIMENSION_KEYS.filter((k) => coverage[k].covered).length;

  return (
    <div className="tex-data rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">How well does Echo know you</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {coveredCount} of {DIMENSION_KEYS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {DIMENSION_KEYS.map((key) => {
          const d = coverage[key];
          const pct = Math.round(Math.max(0, Math.min(1, d.strength)) * 100);
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className={d.covered ? 'text-xs font-medium text-foreground' : 'text-xs text-muted-foreground'}>
                  {DIMENSION_LABELS[key]}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className={d.covered ? 'h-full rounded-full bg-primary' : 'h-full rounded-full bg-primary/40'}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={DIMENSION_LABELS[key]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
