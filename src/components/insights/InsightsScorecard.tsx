'use client';

/**
 * InsightsScorecard.tsx
 * "Your numbers" dashboard block on the Create page (/app), rendered under
 * EchoHero. Three rows (headline, records strip, streak + follower deltas)
 * plus two optional Layer B rows (top posts, format insight). See
 * echome-platform-v2 docs/superpowers/specs/2026-09-24-personal-insights-scorecard-design.md
 * ("Dashboard block" section) for the binding spec.
 *
 * States: loading (skeleton), ready, collecting (row 1 replaced), no_instagram
 * (row 1 replaced with a connect line, records strip omitted), locked (403
 * QUOTA_EXCEEDED, blurred placeholder + upgrade CTA), hidden (renders null,
 * covers network/5xx failures per spec: "no block at all on a 500").
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useScorecard } from './useScorecard';
import type { Scorecard, ScorecardRecord, ScorecardRecordKey } from '@/types/insights';

const RECORD_ORDER: ScorecardRecordKey[] = [
  'best_reach_week',
  'best_post_reach',
  'best_follower_month',
  'best_interactions_week',
];

const RECORD_LABELS: Record<ScorecardRecordKey, string> = {
  best_reach_week: 'Best week (reach)',
  best_post_reach: 'Best post (reach)',
  best_follower_month: 'Best month (followers)',
  best_interactions_week: 'Most interactions (week)',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  threads: 'Threads',
  bluesky: 'Bluesky',
  pinterest: 'Pinterest',
};

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? (platform.charAt(0).toUpperCase() + platform.slice(1));
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatDate(iso: string): string {
  // Parse as UTC to avoid local-timezone off-by-one on bare ISO dates.
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="insights-scorecard-root"
      className="mt-4 w-full max-w-4xl rounded-xl border border-[var(--border)] bg-[var(--surface-container-low)] px-4 py-4"
    >
      {children}
    </div>
  );
}

function SectionHeading() {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">Your numbers</h3>
      <p className="text-[0.8125rem] text-[var(--muted-foreground)]">
        You vs your past self. Instagram reach leads, other networks show followers.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <CardShell>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-32 rounded bg-[var(--border)]" />
        <div className="h-6 w-48 rounded bg-[var(--border)]" />
        <div className="h-3 w-full rounded bg-[var(--border)]" />
      </div>
    </CardShell>
  );
}

function LockedCard() {
  return (
    <CardShell>
      <SectionHeading />
      <div className="relative rounded-lg border border-[var(--border)] px-4 py-6">
        <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
          <div className="text-2xl font-semibold text-foreground">12,480 reach</div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm font-medium text-foreground">
            Your reach, records and streak unlock with a plan
          </p>
          <Link
            href="/app/billing"
            className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
          >
            See plans
          </Link>
        </div>
      </div>
    </CardShell>
  );
}

function HeadlineRow({ data }: { data: Scorecard }) {
  if (data.state === 'no_instagram') {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Connect Instagram in{' '}
        <Link href="/app/settings" className="underline underline-offset-2 hover:text-foreground">
          Settings
        </Link>{' '}
        to unlock reach and personal records.
      </p>
    );
  }

  if (data.state === 'collecting') {
    const dateText = data.first_comparison_on ? formatDate(data.first_comparison_on) : null;
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Collecting your numbers.{dateText ? ` First comparison on ${dateText}.` : ''}
      </p>
    );
  }

  const headline = data.headline;
  if (!headline) return null;

  const roundedPct = headline.delta_pct === null ? null : Math.round(headline.delta_pct);
  const arrow = roundedPct === null ? null : roundedPct >= 0 ? '↑' : '↓';

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-2xl font-semibold text-foreground">{formatNumber(headline.this_week)}</span>
      <span className="text-sm text-[var(--muted-foreground)]">reach this week</span>
      {roundedPct === null ? (
        <span className="text-sm text-[var(--muted-foreground)]">first full week</span>
      ) : (
        <span className="text-sm text-[var(--muted-foreground)]">
          {arrow} {Math.abs(roundedPct)}% vs last week
        </span>
      )}
      <span className="text-xs text-[var(--muted-foreground)]">day {headline.days_in_week_so_far} of 7</span>
    </div>
  );
}

function RecordTile({ record }: { record: ScorecardRecord }) {
  const label = RECORD_LABELS[record.key];
  const title = record.post?.title ? truncate(record.post.title, 60) : null;
  const valueBlock = (
    <>
      <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
      <div className="text-lg font-semibold text-foreground">{formatNumber(record.value)}</div>
      <div className="text-[0.6875rem] text-[var(--muted-foreground)]">achieved {formatDate(record.achieved_on)}</div>
      {title && <div className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{title}</div>}
      {record.is_new && (
        <span className="mt-1 inline-block rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[0.6875rem] font-medium text-[var(--primary)]">
          New personal best
        </span>
      )}
      {record.on_pace && (
        <div className="mt-2">
          <div className="h-1 w-full rounded-full bg-[var(--border)]">
            <div className="h-1 w-full rounded-full bg-[var(--primary)]" />
          </div>
          <div className="mt-0.5 text-[0.6875rem] text-[var(--muted-foreground)]">On pace to beat this</div>
        </div>
      )}
    </>
  );

  const wrapperClass = 'min-w-[8rem] flex-1 rounded-lg border border-[var(--border)] px-3 py-2';

  if (record.post?.platform_post_url) {
    return (
      <a
        href={record.post.platform_post_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${wrapperClass} block hover:border-[var(--primary)]`}
      >
        {valueBlock}
      </a>
    );
  }

  return <div className={wrapperClass}>{valueBlock}</div>;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function RecordsStrip({ records }: { records: ScorecardRecord[] }) {
  if (records.length === 0) return null;
  const byKey = new Map(records.map((r) => [r.key, r]));
  const ordered = RECORD_ORDER.map((key) => byKey.get(key)).filter((r): r is ScorecardRecord => !!r);
  if (ordered.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {ordered.map((record) => (
        <RecordTile key={record.key} record={record} />
      ))}
    </div>
  );
}

function StreakChip({ streak }: { streak: Scorecard['streak'] }) {
  let text: string;
  if (streak.weeks === 0) {
    text = 'Start a posting streak this week';
  } else {
    text = `${streak.weeks}-week posting streak`;
    if (streak.longest > streak.weeks) text += ` (longest ${streak.longest})`;
    if (!streak.active_this_week) text += '. Post this week to keep it';
  }

  return (
    <span className="inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-foreground">
      {text}
    </span>
  );
}

function FollowerPill({ platform, thisWeekDelta, total }: { platform: string; thisWeekDelta: number | null; total: number | null }) {
  if (total === null) {
    return (
      <span className="inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
        {platformLabel(platform)} followers
      </span>
    );
  }

  let deltaText: string | null = null;
  if (thisWeekDelta !== null) {
    deltaText = thisWeekDelta >= 0 ? `+${formatNumber(thisWeekDelta)} this week` : `−${formatNumber(Math.abs(thisWeekDelta))} this week`;
  }

  return (
    <span className="inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
      {platformLabel(platform)} followers {formatNumber(total)}
      {deltaText ? ` (${deltaText})` : ''}
    </span>
  );
}

function StreakAndFollowersRow({ data }: { data: Scorecard }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <StreakChip streak={data.streak} />
      {data.followers.map((f) => (
        <FollowerPill key={f.platform} platform={f.platform} thisWeekDelta={f.this_week_delta} total={f.total} />
      ))}
    </div>
  );
}

function TopPostsRow({ data }: { data: Scorecard }) {
  if (!data.top_posts || data.top_posts.length === 0) return null;
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-3">
      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Top posts</div>
      <ul className="space-y-1.5">
        {data.top_posts.map((post) => {
          const title = post.title || 'Untitled';
          const content = (
            <>
              <span className="text-foreground">{title}</span>{' '}
              <span className="text-[var(--muted-foreground)]">
                {post.format}, {formatNumber(post.reach)} reach
              </span>
            </>
          );
          return (
            <li key={post.scheduled_post_id} className="text-sm">
              {post.platform_post_url ? (
                <a href={post.platform_post_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FormatInsightRow({ data }: { data: Scorecard }) {
  if (!data.format_insight) return null;
  return (
    <p className="mt-3 text-sm text-[var(--muted-foreground)]">{data.format_insight}</p>
  );
}

export function InsightsScorecard() {
  const { status, data } = useScorecard();

  if (status === 'hidden') return null;
  if (status === 'loading') return <LoadingSkeleton />;
  if (status === 'locked') return <LockedCard />;
  if (!data) return null;

  const showRecordsStrip = data.state !== 'no_instagram';

  return (
    <CardShell>
      <SectionHeading />
      <HeadlineRow data={data} />
      {showRecordsStrip && <RecordsStrip records={data.records} />}
      <StreakAndFollowersRow data={data} />
      <TopPostsRow data={data} />
      <FormatInsightRow data={data} />
    </CardShell>
  );
}
