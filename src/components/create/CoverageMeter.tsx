'use client';

import { Coverage, DIMENSION_KEYS, DIMENSION_LABELS } from '@/types/advisor';

interface CoverageMeterProps {
  coverage: Coverage;
}

export function CoverageMeter({ coverage }: CoverageMeterProps) {
  const coveredCount = DIMENSION_KEYS.filter((k) => coverage[k].covered).length;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">How well I know you</span>
        <span className="text-sm text-muted-foreground">{coveredCount} of {DIMENSION_KEYS.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {DIMENSION_KEYS.map((key) => {
          const d = coverage[key];
          const pct = Math.round(Math.max(0, Math.min(1, d.strength)) * 100);
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-foreground">{DIMENSION_LABELS[key]}</span>
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
