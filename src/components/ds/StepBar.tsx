import { cx } from './cx';

export type StepBarProps = {
  steps: string[];
  current: number;
  className?: string;
};

export function StepBar({ steps, current, className }: StepBarProps) {
  if (steps.length === 0) return null;
  const at = Number.isFinite(current) ? Math.min(Math.max(Math.floor(current), 0), steps.length) : 0;

  return (
    <ol aria-label="Progress" className={cx('m-0 flex list-none gap-[6px] p-0', className)}>
      {steps.map((label, i) => {
        const state = i < at ? 'done' : i === at ? 'now' : 'todo';
        return (
          <li
            key={`${i}-${label}`}
            data-state={state}
            aria-current={state === 'now' ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col gap-[6px]"
          >
            <span
              aria-hidden="true"
              className={cx('relative block h-1 overflow-hidden rounded-[2px]', state === 'done' && 'je-grad')}
              style={state === 'done' ? undefined : { background: 'var(--je-faint)' }}
            >
              {state === 'now' && (
                <i
                  className="je-grad absolute top-0 block h-full w-[40%] rounded-[2px] animate-[je-slide_1.4s_ease-in-out_infinite_alternate]"
                  style={{ left: 0 }}
                />
              )}
            </span>
            <span
              className={cx(
                'text-[10.5px] leading-tight',
                state === 'now' ? 'font-bold text-je-accent' : 'text-je-muted',
              )}
            >
              {label}
              {state === 'done' && <span className="je-sr-only">done</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
