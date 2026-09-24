/**
 * Personal insights scorecard types.
 * Mirrors the backend response shape from
 * echome-platform-v2 docs/superpowers/specs/2026-09-24-personal-insights-scorecard-design.md
 * ("Scorecard API" section). Keep in sync with the backend contract; do not
 * add fields the endpoint does not return.
 */

export interface ScorecardHeadline {
  metric: 'reach';
  this_week: number;
  last_week: number;
  /** null when last_week = 0 (no baseline to compare against). */
  delta_pct: number | null;
  days_in_week_so_far: number;
}

export type ScorecardRecordKey =
  | 'best_reach_week'
  | 'best_post_reach'
  | 'best_follower_month'
  | 'best_interactions_week';

export interface ScorecardRecord {
  key: ScorecardRecordKey;
  value: number;
  /** ISO date: week start, month start, or post date depending on key. */
  achieved_on: string;
  /** true when achieved within the last 7 days. */
  is_new: boolean;
  /** true when the current period is projected to beat this record. */
  on_pace: boolean;
  post?: {
    scheduled_post_id: string;
    title: string | null;
    platform_post_url: string | null;
  };
}

export interface ScorecardStreak {
  weeks: number;
  longest: number;
  active_this_week: boolean;
}

export interface ScorecardFollowerDelta {
  platform: string;
  this_week_delta: number | null;
  total: number | null;
}

export interface ScorecardTopPost {
  scheduled_post_id: string;
  title: string | null;
  platform: string;
  format: 'clip' | 'carousel' | 'written' | 'other';
  reach: number;
  platform_post_url: string | null;
  posted_at: string;
}

export interface Scorecard {
  state: 'no_instagram' | 'collecting' | 'ready';
  /** ISO date, present when state = 'collecting'. */
  first_comparison_on?: string;
  headline?: ScorecardHeadline;
  records: ScorecardRecord[];
  streak: ScorecardStreak;
  followers: ScorecardFollowerDelta[];
  /** Present once >= 4 weeks of post snapshots exist. */
  top_posts?: ScorecardTopPost[];
  /** Present only when >= 3 posts per compared format. */
  format_insight?: string;
}
