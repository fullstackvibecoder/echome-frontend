'use client';

/**
 * CalendarFilters
 *
 * Chip-based filters for the calendar views (WeekGrid + FanoutCalendar).
 * Lets the user narrow what renders without re-fetching — filtering is applied
 * client-side to the events array from /calendar.
 *
 * Two facets:
 *  - Platforms: which platforms to include. Clicking toggles one; "All" resets.
 *  - Statuses: scheduled / publishing / posted / failed / cancelled. Same toggle pattern.
 */
import {
  Instagram, Linkedin, Facebook, AtSign, Twitter, Music2, Youtube, Pin, CloudSun, MapPin,
  type LucideIcon,
} from 'lucide-react';

export type PlatformFilter = 'all' | 'instagram' | 'linkedin' | 'facebook' | 'threads'
  | 'x' | 'tiktok' | 'youtube' | 'pinterest' | 'bluesky' | 'google_business';

export type StatusFilter = 'all' | 'scheduled' | 'publishing' | 'posted' | 'failed' | 'cancelled';

const PLATFORM_META: Array<{ id: PlatformFilter; label: string; Icon?: LucideIcon }> = [
  { id: 'all', label: 'All platforms' },
  { id: 'instagram', label: 'IG', Icon: Instagram },
  { id: 'linkedin', label: 'LI', Icon: Linkedin },
  { id: 'facebook', label: 'FB', Icon: Facebook },
  { id: 'threads', label: 'Threads', Icon: AtSign },
  { id: 'x', label: 'X', Icon: Twitter },
  { id: 'tiktok', label: 'TikTok', Icon: Music2 },
  { id: 'youtube', label: 'YT', Icon: Youtube },
  { id: 'pinterest', label: 'Pin', Icon: Pin },
  { id: 'bluesky', label: 'Bsky', Icon: CloudSun },
  { id: 'google_business', label: 'GBP', Icon: MapPin },
];

const STATUS_META: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'publishing', label: 'Publishing' },
  { id: 'posted', label: 'Posted' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
];

interface Props {
  platform: PlatformFilter;
  status: StatusFilter;
  onPlatformChange: (p: PlatformFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
  /** Only show platforms the user has events for — keeps the filter bar clean */
  visiblePlatforms?: Set<string>;
}

export function CalendarFilters({ platform, status, onPlatformChange, onStatusChange, visiblePlatforms }: Props) {
  const platforms = visiblePlatforms && visiblePlatforms.size > 0
    ? PLATFORM_META.filter((p) => p.id === 'all' || visiblePlatforms.has(p.id))
    : PLATFORM_META;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        {platforms.map((p) => {
          const active = platform === p.id;
          const Icon = p.Icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPlatformChange(p.id)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="text-muted-foreground/40">·</span>

      <div className="flex flex-wrap items-center gap-1">
        {STATUS_META.map((s) => {
          const active = status === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStatusChange(s.id)}
              className={`px-2 py-1 rounded-full border text-[11px] ${
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Apply platform + status filters to a fanout events array.
 * Shared helper so WeekGrid and FanoutCalendar filter identically.
 */
export function applyCalendarFilters<T extends {
  platforms: Array<{ platform: string; status: string }>;
  aggregate_status: string;
}>(events: T[], platform: PlatformFilter, status: StatusFilter): T[] {
  return events.filter((e) => {
    if (platform !== 'all' && !e.platforms.some((p) => p.platform === platform)) return false;
    if (status !== 'all' && e.aggregate_status !== status) return false;
    return true;
  });
}
