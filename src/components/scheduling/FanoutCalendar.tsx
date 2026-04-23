'use client';

/**
 * FanoutCalendar
 *
 * Displays scheduled social posts grouped by fanout_id (one event per piece of
 * content, with a chip row showing per-platform status). Data comes from the
 * new /social-posting/calendar endpoint which unifies auto-posts + reminders.
 *
 * Renders in the Content Calendar page above the legacy reminders list, which
 * uses the older scheduling service. As users migrate to the new flow the
 * legacy section empties out naturally.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import {
  Loader2, Calendar, CheckCircle, Clock, AlertTriangle, RefreshCw, Sparkles,
  Instagram, Linkedin, Facebook, AtSign,
  Twitter, Music2, Youtube, Pin, CloudSun, MapPin,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  threads: AtSign,
  x: Twitter,
  tiktok: Music2,
  youtube: Youtube,
  pinterest: Pin,
  bluesky: CloudSun,
  google_business: MapPin,
};

interface FanoutPlatform {
  post_id: string;
  platform: string;
  status: string;
  scheduled_at: string;
  posted_at?: string;
  platform_post_url?: string;
  error_message?: string;
}

interface FanoutEvent {
  fanout_id: string;
  content_kit_id?: string;
  kit_title?: string;
  content_preview: string;
  output_kind: 'written_post' | 'carousel' | 'clip' | 'reel' | 'other';
  platforms: FanoutPlatform[];
  aggregate_status: string;
  ai_suggested: boolean;
  is_reminder: boolean;
}

interface WeekStats {
  scheduled: number;
  posted: number;
  failed: number;
}

export function FanoutCalendar() {
  const [events, setEvents] = useState<FanoutEvent[]>([]);
  const [weekStats, setWeekStats] = useState<WeekStats>({ scheduled: 0, posted: 0, failed: 0 });
  const [nextUp, setNextUp] = useState<{ title: string; scheduled_at: string; platforms: string[] } | undefined>();
  const [loading, setLoading] = useState(true);
  const [actingOnPost, setActingOnPost] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const resp = await api.socialPosting.getCalendar();
      if (resp.success && resp.data) {
        setEvents(resp.data.events);
        setWeekStats(resp.data.this_week);
        setNextUp(resp.data.next_up);
      }
    } catch {
      // Empty state ok
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date().toISOString();
    const upcoming: FanoutEvent[] = [];
    const past: FanoutEvent[] = [];
    for (const e of events) {
      const earliest = e.platforms[0]?.scheduled_at || now;
      if (earliest >= now && e.aggregate_status !== 'posted') upcoming.push(e);
      else past.push(e);
    }
    return { upcoming, past };
  }, [events]);

  const handleRetry = async (postId: string) => {
    setActingOnPost(postId);
    try {
      await api.socialPosting.retryPost(postId);
      toast.success('Retrying post');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Retry failed');
    } finally {
      setActingOnPost(null);
    }
  };

  const handleCancel = async (postId: string) => {
    setActingOnPost(postId);
    try {
      await api.socialPosting.cancelPost(postId);
      toast.success('Cancelled');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Cancel failed');
    } finally {
      setActingOnPost(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Empty — parent component shows its own empty state for legacy data
  }

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-card border border-border rounded-xl px-4 py-3">
        <span className="font-medium text-foreground">This week</span>
        <span className="text-muted-foreground">
          {weekStats.scheduled} scheduled · {weekStats.posted} posted · {weekStats.failed > 0 ? <span className="text-red-500">{weekStats.failed} failed</span> : '0 failed'}
        </span>
        {nextUp && (
          <span className="ml-auto text-muted-foreground">
            Next up: <span className="text-foreground">{nextUp.title}</span> — {formatDateTime(nextUp.scheduled_at)}
          </span>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Upcoming</h3>
          {upcoming.map((e) => (
            <EventCard
              key={e.fanout_id}
              event={e}
              onRetry={handleRetry}
              onCancel={handleCancel}
              busyPostId={actingOnPost}
            />
          ))}
        </div>
      )}

      {/* Recently posted / past */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Past</h3>
          {past.slice(0, 20).map((e) => (
            <EventCard
              key={e.fanout_id}
              event={e}
              onRetry={handleRetry}
              onCancel={handleCancel}
              busyPostId={actingOnPost}
            />
          ))}
          {past.length > 20 && (
            <p className="text-xs text-muted-foreground px-2">+ {past.length - 20} earlier events</p>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onRetry,
  onCancel,
  busyPostId,
}: {
  event: FanoutEvent;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  busyPostId: string | null;
}) {
  const earliest = event.platforms.reduce((min, p) => (p.scheduled_at < min ? p.scheduled_at : min), event.platforms[0]?.scheduled_at);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {event.ai_suggested && (
              <span className="inline-flex items-center gap-1 text-[10px] text-foreground bg-foreground/10 rounded px-1.5 py-0.5">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            )}
            {event.is_reminder && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                Reminder
              </span>
            )}
            <p className="text-sm text-foreground font-medium line-clamp-1">
              {event.content_preview || 'Untitled post'}
            </p>
          </div>
          {event.kit_title && event.content_kit_id && (
            <Link
              href={`/app/content-kit/${event.content_kit_id}`}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              From kit: {event.kit_title}
            </Link>
          )}
        </div>
        <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
          {formatDateTime(earliest)}
        </div>
      </div>

      {/* Platform chips with per-platform status */}
      <div className="flex flex-wrap gap-1.5">
        {event.platforms.map((p) => {
          const Icon = PLATFORM_ICONS[p.platform];
          const chipStyle = getStatusChipStyle(p.status);
          const isBusy = busyPostId === p.post_id;
          const showRetry = p.status === 'failed';
          const showCancel = p.status === 'scheduled' || p.status === 'publishing';

          return (
            <div
              key={p.post_id}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] ${chipStyle}`}
              title={p.error_message || `${p.platform} — ${p.status}`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              <span className="capitalize">{p.platform.replace('_', ' ')}</span>
              <StatusGlyph status={p.status} />
              {showRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(p.post_id)}
                  disabled={isBusy}
                  className="ml-1 underline hover:no-underline disabled:opacity-50"
                  title="Retry this post"
                >
                  retry
                </button>
              )}
              {showCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(p.post_id)}
                  disabled={isBusy}
                  className="ml-1 opacity-60 hover:opacity-100 disabled:opacity-30"
                  title="Cancel this post"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Failed posts expose error details */}
      {event.platforms.some((p) => p.status === 'failed' && p.error_message) && (
        <div className="text-[11px] text-red-500/80 bg-red-500/5 rounded px-2 py-1">
          {event.platforms.find((p) => p.error_message)?.error_message}
        </div>
      )}
    </div>
  );
}

function StatusGlyph({ status }: { status: string }) {
  switch (status) {
    case 'posted': return <CheckCircle className="w-3 h-3" />;
    case 'failed': return <AlertTriangle className="w-3 h-3" />;
    case 'publishing': return <RefreshCw className="w-3 h-3 animate-spin" />;
    case 'scheduled': return <Clock className="w-3 h-3" />;
    case 'cancelled': return <span className="text-[10px]">✕</span>;
    default: return <Calendar className="w-3 h-3" />;
  }
}

function getStatusChipStyle(status: string): string {
  switch (status) {
    case 'posted': return 'bg-green-500/10 text-green-600 border border-green-500/20';
    case 'failed': return 'bg-red-500/10 text-red-500 border border-red-500/20';
    case 'publishing': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    case 'scheduled': return 'bg-muted text-foreground border border-border';
    case 'cancelled': return 'bg-muted text-muted-foreground border border-border line-through';
    default: return 'bg-muted text-foreground border border-border';
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
