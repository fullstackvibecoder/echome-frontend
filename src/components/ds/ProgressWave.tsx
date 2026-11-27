import { cx } from './cx';

export type ProgressWaveProps = {
  bars: number[];
  hits?: number[];
  scanning?: boolean;
  className?: string;
};

function heightPct(v: number): string {
  const n = Number.isFinite(v) ? Math.min(Math.max(v, 0.08), 1) : 0.08;
  return `${Math.round(n * 10000) / 100}%`;
}

export function ProgressWave({ bars, hits = [], scanning = false, className }: ProgressWaveProps) {
  if (bars.length === 0) return null;
  const hitSet = new Set(hits.filter((h) => Number.isInteger(h) && h >= 0 && h < bars.length));

  return (
    <div aria-hidden="true" className={cx('relative flex h-[38px] items-center gap-[2px] overflow-hidden', className)}>
      {bars.map((v, i) => {
        const hit = hitSet.has(i);
        return (
          <i
            key={i}
            data-hit={hit ? 'true' : undefined}
            className="block min-w-0 flex-1 rounded-[2px]"
            style={{
              height: heightPct(v),
              background: hit ? 'linear-gradient(180deg, var(--je-g1), var(--je-g2))' : 'var(--je-faint)',
            }}
          />
        );
      })}
      {scanning && (
        <span
          data-scan=""
          className="absolute top-0 block h-full w-[2px] animate-[je-scan_4.5s_linear_infinite]"
          style={{
            left: 0,
            background: 'linear-gradient(180deg, transparent, var(--je-g2), transparent)',
            boxShadow: '0 0 12px var(--je-g2)',
          }}
        />
      )}
    </div>
  );
}
