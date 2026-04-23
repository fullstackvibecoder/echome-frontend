'use client';

/**
 * WeekGrid
 *
 * 7-day calendar view for scheduled posts + reminders, powered by the same
 * /social-posting/calendar endpoint that backs FanoutCalendar. Differentiator
 * vs. the list view: events are spatially arranged so you see your week's
 * cadence at a glance — empty days are visible gaps, heavy days stack.
 *
 * EchoMe-specific touches (what Buffer/Later don't have):
 *  - Per-kit color tint on the left edge of each event card. Events from the
 *    same kit share the same subtle color so a week's "episode rollout"
 *    visually clusters without needing a filter.
 *  - "From kit:" provenance on hover (via the kit_title in event metadata).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { EventPreviewModal, type FanoutEventForPreview } from './EventPreviewModal';
import { CalendarFilters, applyCalendarFilters, type PlatformFilter, type StatusFilter } from './CalendarFilters';
import {
  Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  CheckCircle, AlertTriangle, Clock, RefreshCw, Sparkles,
  Instagram, Linkedin, Facebook, AtSign,
  Twitter, Music2, Youtube, Pin, CloudSun, MapPin,
  type LucideIcon,
} from 'lucide-react';

const PLATFORM_ICON: Record<string, LucideIcon> = {
  instagram: Instagram, linkedin: Linkedin, facebook: Facebook, threads: AtSign,
  x: Twitter, tiktok: Music2, youtube: Youtube, pinterest: Pin, bluesky: CloudSun, google_business: MapPin,
};

// Muted palette for per-kit tinting — subtle so the card still reads as neutral.
// Cycles through with kitId hash; same kit_id → same color all week.
const KIT_TINTS = [
  { border: '#a78bfa', bg: 'rgba(167,139,250,0.08)' }, // violet
  { border: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },  // blue
  { border: '#34d399', bg: 'rgba(52,211,153,0.08)' },  // emerald
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },  // amber
  { border: '#f472b6', bg: 'rgba(244,114,182,0.08)' }, // pink
  { border: '#22d3ee', bg: 'rgba(34,211,238,0.08)' },  // cyan
  { border: '#fb7185', bg: 'rgba(251,113,133,0.08)' }, // rose
];
function tintForKit(kitId: string | undefined): { border: string; bg: string } {
  if (!kitId) return { border: '#6b7280', bg: 'rgba(107,114,128,0.06)' };
  let hash = 0;
  for (let i = 0; i < kitId.length; i++) hash = (hash * 31 + kitId.charCodeAt(i)) >>> 0;
  return KIT_TINTS[hash % KIT_TINTS.length];
}

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
  source_output_id?: string;
  content_preview: string;
  content_full?: string;
  media_urls?: string[];
  output_kind: 'written_post' | 'carousel' | 'clip' | 'reel' | 'other';
  platforms: FanoutPlatform[];
  aggregate_status: string;
  ai_suggested: boolean;
  is_reminder: boolean;
}
interface WeekStats { scheduled: number; posted: number; failed: number; }

export function WeekGrid() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<FanoutEvent[]>([]);
  const [weekStats, setWeekStats] = useState<WeekStats>({ scheduled: 0, posted: 0, failed: 0 });
  const [nextUp, setNextUp] = useState<{ title: string; scheduled_at: string; platforms: string[] } | undefined>();
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<FanoutEventForPreview | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch a window around the current week (-2 weeks to +12 weeks is reasonable for scrolling)
      const start = new Date(weekStart); start.setDate(start.getDate() - 14);
      const end = new Date(weekStart); end.setDate(end.getDate() + 84);
      const resp = await api.socialPosting.getCalendar({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      if (resp.success && resp.data) {
        setEvents(resp.data.events);
        setWeekStats(resp.data.this_week);
        setNextUp(resp.data.next_up);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  // Reload when the viewed week changes (different window boundary)
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [weekStart.getTime()]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Set of platforms present in the data — used to hide platform filter chips for
  // platforms the user doesn't actually have events on (keeps the bar uncluttered).
  const visiblePlatforms = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) for (const p of e.platforms) s.add(p.platform);
    return s;
  }, [events]);

  // Apply platform + status filters before grouping
  const filteredEvents = useMemo(
    () => applyCalendarFilters(events, platformFilter, statusFilter),
    [events, platformFilter, statusFilter],
  );

  // Group filtered events by ISO date string of their earliest-platform scheduled_at
  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, FanoutEvent[]>();
    for (const e of filteredEvents) {
      const earliest = e.platforms.reduce((min, p) => p.scheduled_at < min ? p.scheduled_at : min, e.platforms[0]?.scheduled_at);
      if (!earliest) continue;
      const key = toDateKey(new Date(earliest));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(e);
    }
    for (const arr of byDay.values()) {
      arr.sort((a, b) => a.platforms[0].scheduled_at.localeCompare(b.platforms[0].scheduled_at));
    }
    return byDay;
  }, [filteredEvents]);

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6);
    const sameMonth = weekStart.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${weekStart.toLocaleString('en-US', { month: 'short' })} ${weekStart.getDate()}–${end.getDate()}`;
    }
    return `${weekStart.toLocaleString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [weekStart]);

  const goPrev = () => { const n = new Date(weekStart); n.setDate(n.getDate() - 7); setWeekStart(n); };
  const goNext = () => { const n = new Date(weekStart); n.setDate(n.getDate() + 7); setWeekStart(n); };
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  return (
    <div className="space-y-3">
      {/* Header: week stats + next-up + navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card border border-border rounded-xl px-4 py-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">This week</span>
          <span className="text-muted-foreground">
            {weekStats.scheduled} scheduled · {weekStats.posted} posted ·{' '}
            {weekStats.failed > 0 ? <span className="text-red-500">{weekStats.failed} failed</span> : '0 failed'}
          </span>
          {nextUp && (
            <span className="text-muted-foreground hidden sm:inline">
              · Next: <span className="text-foreground">{nextUp.title}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={goPrev} className="p-1.5 rounded-md hover:bg-background" title="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={goToday} className="px-2 py-1 text-xs font-medium hover:bg-background rounded-md">
            Today
          </button>
          <span className="px-2 text-xs font-medium text-foreground min-w-[110px] text-center">{weekLabel}</span>
          <button type="button" onClick={goNext} className="p-1.5 rounded-md hover:bg-background" title="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters — only shown once we have any events to filter */}
      {events.length > 0 && (
        <CalendarFilters
          platform={platformFilter}
          status={statusFilter}
          onPlatformChange={setPlatformFilter}
          onStatusChange={setStatusFilter}
          visiblePlatforms={visiblePlatforms}
        />
      )}

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((day) => {
            const key = toDateKey(day);
            const dayEvents = eventsByDay.get(key) || [];
            const isToday = toDateKey(new Date()) === key;
            return (
              <div
                key={key}
                className={`flex flex-col min-h-[160px] bg-card border ${isToday ? 'border-foreground/40' : 'border-border'} rounded-xl overflow-hidden`}
              >
                <div className={`px-3 py-2 border-b border-border flex items-center justify-between ${isToday ? 'bg-foreground/5' : ''}`}>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {day.toLocaleString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-sm font-medium ${isToday ? 'text-foreground' : 'text-foreground/80'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    </div>
                  ) : (
                    dayEvents.map((e) => <EventCard key={e.fanout_id} event={e} onOpen={() => setSelectedEvent(e as unknown as FanoutEventForPreview)} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground bg-card border border-border rounded-xl">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p>No scheduled content yet.</p>
          <p className="text-xs mt-1">
            Open a{' '}
            <Link href="/app/content-kit" className="underline hover:text-foreground">
              Content Kit
            </Link>
            {' '}and click AI Schedule to rollout a week&apos;s worth of posts.
          </p>
        </div>
      )}

      {/* Event preview on click — fills in full content + media thumbnails + per-platform status */}
      <EventPreviewModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onChanged={() => { setSelectedEvent(null); load(); }}
      />
    </div>
  );
}

function EventCard({ event, onOpen }: { event: FanoutEvent; onOpen: () => void }) {
  const tint = tintForKit(event.content_kit_id);
  const earliest = event.platforms[0]?.scheduled_at;
  const timeLabel = earliest
    ? new Date(earliest).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  // Thumbnail URL: first media url if present (for visual content).
  const firstMedia = event.media_urls?.[0];
  const isVideoThumb = firstMedia && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(firstMedia);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left text-[11px] rounded-md px-2 py-1.5 border-l-2 hover:bg-background/80 transition-colors"
      style={{ borderLeftColor: tint.border, backgroundColor: tint.bg }}
      title={[
        timeLabel,
        event.kit_title ? `From kit: ${event.kit_title}` : null,
        event.content_preview,
      ].filter(Boolean).join('\n')}
    >
      <div className="flex items-start gap-1.5">
        {firstMedia && (
          <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0 relative">
            {isVideoThumb ? (
              <video src={firstMedia} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firstMedia} alt="" className="w-full h-full object-cover" loading="lazy" />
            )}
            {(event.media_urls?.length ?? 0) > 1 && (
              <span className="absolute bottom-0 right-0 text-[8px] bg-black/60 text-white px-0.5 leading-none">
                +{(event.media_urls?.length ?? 0) - 1}
              </span>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
            <StatusIcon status={event.aggregate_status} />
            <span>{timeLabel}</span>
            {event.ai_suggested && <Sparkles className="w-2.5 h-2.5" aria-label="AI suggested time" />}
            {event.is_reminder && <span className="ml-auto text-[9px] uppercase tracking-wide">rem</span>}
          </div>
          <p className="text-foreground line-clamp-2 leading-tight mb-1">
            {event.content_preview || 'Untitled'}
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {event.platforms.slice(0, 4).map((p) => {
              const Icon = PLATFORM_ICON[p.platform];
              return Icon ? (
                <Icon key={p.post_id} className="w-2.5 h-2.5 text-muted-foreground" />
              ) : null;
            })}
            {event.platforms.length > 4 && (
              <span className="text-[9px] text-muted-foreground">+{event.platforms.length - 4}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'posted': return <CheckCircle className="w-2.5 h-2.5 text-green-600" />;
    case 'failed': return <AlertTriangle className="w-2.5 h-2.5 text-red-500" />;
    case 'publishing': return <RefreshCw className="w-2.5 h-2.5 text-blue-500 animate-spin" />;
    case 'scheduled': return <Clock className="w-2.5 h-2.5" />;
    default: return <CalendarIcon className="w-2.5 h-2.5" />;
  }
}

function startOfWeek(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  // Week starts on Monday to match creator-week mental model (Mon-Fri posting, weekends quieter)
  const dow = n.getDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  n.setDate(n.getDate() + offset);
  return n;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
