'use client';

import { Meter } from '@/components/ds/Meter';
import { PlatformBadge } from '@/components/ds/PlatformBadge';
import { Row } from '@/components/ds/Row';
import { Thumb } from '@/components/ds/Thumb';
import { cx } from '@/components/ds/cx';
import type { HomeData, PanelTarget } from '@/lib/just-echo-client';
import { coveredDays, weekDays } from './week';

const LABEL = 'text-[12px] font-bold text-je-muted';
const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]';

function nextUpDetail(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Next';
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
  return `Next · ${day} ${time}`;
}

export function HomeSide({
  data,
  onOpen,
}: {
  data: HomeData | null;
  onOpen: (t: PanelTarget) => void;
}) {
  if (!data) return null;
  const { week, nextUp, ready, knowledge } = data;
  const days = week ? weekDays(week.posts, new Date()) : [];
  const calendar: PanelTarget = { kind: 'calendar' };

  return (
    <div className="flex flex-col gap-6">
      {week && (
        <section>
          <button
            type="button"
            onClick={() => onOpen(calendar)}
            className={cx('flex w-full flex-col gap-3 rounded-[12px] text-left', FOCUS)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className={LABEL}>This week</span>
              <Meter value={coveredDays(days)} total={7} label="Days covered this week" />
            </span>
            <span className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const platform = d.post?.platforms[0];
                return (
                  <span
                    key={d.key}
                    className={cx(
                      'flex flex-col items-center gap-1 rounded-[8px] p-1',
                      d.isToday && 'bg-je-tint',
                    )}
                  >
                    <span className="je-mono text-[10px] text-je-muted">{d.letter}</span>
                    {d.post ? (
                      <span className="block w-full">
                        <Thumb
                          src={null}
                          alt=""
                          platform={platform}
                          state={d.post.status === 'posted' ? 'done' : 'default'}
                        />
                      </span>
                    ) : d.isPast ? (
                      <span className="block aspect-square w-full" aria-hidden="true" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex aspect-square w-full items-center justify-center rounded-[12px] border border-dashed border-je-faint text-[13px] text-je-muted"
                      >
                        +
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
          </button>
        </section>
      )}

      {nextUp && (
        <section className="flex flex-col gap-2">
          <span className={LABEL}>Next up</span>
          <Row
            title={nextUp.title || 'Untitled post'}
            detail={nextUpDetail(nextUp.scheduledAt)}
            trail={
              <span className="flex gap-1">
                {nextUp.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </span>
            }
            onClick={() => onOpen(calendar)}
          />
        </section>
      )}

      {ready && (
        <section className="flex flex-col gap-2">
          <span className={LABEL}>Ready</span>
          {ready.items.length === 0 ? (
            <p className="text-[13px] text-je-muted">Nothing waiting. Make something and it lands here.</p>
          ) : (
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {ready.items.map((it) => (
                <li key={`${it.kind}-${it.id}`} className="w-[72px] shrink-0">
                  {it.kind === 'running' ? (
                    <div
                      role="status"
                      aria-label={it.title ? `Working on ${it.title}` : 'Working'}
                      data-running="true"
                    >
                      <Thumb src={null} alt="" aspect="reel" state="pending" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onOpen(it.kind === 'clip' ? { kind: 'clips', id: it.id } : { kind: 'kit', id: it.id })
                      }
                      className={cx('block w-full rounded-[12px]', FOCUS)}
                    >
                      <Thumb
                        src={it.thumbnailUrl}
                        alt={it.title || (it.kind === 'clip' ? 'Clip' : 'Kit')}
                        aspect="reel"
                      />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {knowledge && (
        <section>
          <button
            type="button"
            onClick={() => onOpen({ kind: 'voice' })}
            className={cx('flex w-full flex-col gap-2 rounded-[12px] text-left', FOCUS)}
          >
            <span className={LABEL}>Knowledge</span>
            <span className="flex items-baseline gap-2">
              <span className="je-grad-text text-[28px] font-black leading-none">{knowledge.count}</span>
              <span className="text-[13px] text-je-muted">things Echo knows about you</span>
            </span>
            {knowledge.sparkline && knowledge.sparkline.length > 0 && <Sparkline values={knowledge.sparkline} />}
            {knowledge.today != null && knowledge.today > 0 && (
              <span className="je-mono text-[11px] text-je-muted">{`+${knowledge.today} today`}</span>
            )}
          </button>
        </section>
      )}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const bars = values.slice(-14);
  const max = Math.max(...bars, 1);
  return (
    <span aria-hidden="true" className="flex h-6 items-end gap-[2px]" data-testid="sparkline">
      {bars.map((v, i) => (
        <i
          key={i}
          className="block flex-1 rounded-[2px] bg-je-faint"
          style={{ height: `${Math.max((v / max) * 100, 8)}%` }}
        />
      ))}
    </span>
  );
}
