import { cx } from './cx';

export type MeterProps = {
  value: number;
  total: number;
  label: string;
  className?: string;
};

const FILLED = 'je-grad';
const EMPTY_BG = 'var(--je-faint)';

export function Meter({ value, total, label, className }: MeterProps) {
  if (!Number.isFinite(total) || total <= 0) return null;
  const max = Math.floor(total);
  const now = Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), 0), max) : 0;
  const segmented = max <= 14;

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={now}
      aria-label={label}
      className={cx('inline-flex items-center gap-[6px]', className)}
    >
      {segmented ? (
        <span className="flex gap-[3px]" aria-hidden="true">
          {Array.from({ length: max }, (_, i) => {
            const on = i < now;
            return (
              <i
                key={i}
                data-filled={on ? 'true' : 'false'}
                className={cx('block h-1 w-[10px] rounded-[2px]', on && FILLED)}
                style={on ? undefined : { background: EMPTY_BG }}
              />
            );
          })}
        </span>
      ) : (
        <span
          data-filled="false"
          aria-hidden="true"
          className="block h-1 w-16 overflow-hidden rounded-[2px]"
          style={{ background: EMPTY_BG }}
        >
          <i data-filled="true" className={cx('block h-full', FILLED)} style={{ width: `${(now / max) * 100}%` }} />
        </span>
      )}
      <span className="je-mono text-[11px] text-je-muted">{`${now}/${max}`}</span>
    </div>
  );
}
