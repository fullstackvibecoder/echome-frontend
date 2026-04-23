'use client';

/**
 * MonthGrid
 *
 * Month-at-a-glance calendar for scheduled posts. Shares the same data source
 * and preview modal as WeekGrid — this is just a different layout (5-6 rows x
 * 7 columns) for users who think in cadence over a longer horizon.
 *
 * Key differences from WeekGrid:
 *  - Denser cells: small dots instead of full cards (one dot per event, kit-tinted)
 *  - Click a dot → open preview modal (same modal WeekGrid uses)
 *  - Click a day cell → open a day-detail popover listing all events
 *  - No drag-and-drop here (drag within a week-grid is the right scope;
 *    cross-month drag introduces UX ambiguity)
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { EventPreviewModal, type FanoutEventForPreview } from './EventPreviewModal';
import { CalendarFilters, applyCalendarFilters, type PlatformFilter, type StatusFilter } from './CalendarFilters';
import {
  Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
} from 'lucide-react';

// Muted palette for per-kit tinting — same hashing rule as WeekGrid so the
// same kit has the same color across views.
const KIT_TINTS = [
  '#a78bfa', '#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#22d3ee', '#fb7185',
];
function tintForKit(kitId: string | undefined): string {
  if (!kitId) return '#6b7280';
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

export function MonthGrid() {
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<FanoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<FanoutEventForPreview | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Window: start of previous month → end of next month. Catches anything
      // that shows in the first/last row overflow cells from adjacent months.
      const start = new Date(monthStart); start.setMonth(start.getMonth() - 1);
      const end = new Date(monthStart); end.setMonth(end.getMonth() + 2);
      const resp = await api.socialPosting.getCalendar({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      if (resp.success && resp.data) setEvents(resp.data.events);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [monthStart.getTime()]);

  const visiblePlatforms = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) for (const p of e.platforms) s.add(p.platform);
    return s;
  }, [events]);

  const filteredEvents = useMemo(
    () => applyCalendarFilters(events, platformFilter, statusFilter),
    [events, platformFilter, statusFilter],
  );

  // Grid spans from the Monday of the week containing the month's first day,
  // through the Sunday of the week containing the month's last day. Typically 35
  // or 42 cells (5-6 weeks).
  const cells = useMemo(() => {
    const monthEnd = new Date(monthStart); monthEnd.setMonth(monthEnd.getMonth() + 1); monthEnd.setDate(0);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const out: Date[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [monthStart]);

  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, FanoutEvent[]>();
    for (const e of filteredEvents) {
      const earliest = e.platforms.reduce(
        (min, p) => (p.scheduled_at < min ? p.scheduled_at : min),
        e.platforms[0]?.scheduled_at,
      );
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

  const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const goPrev = () => { const n = new Date(monthStart); n.setMonth(n.getMonth() - 1); setMonthStart(n); };
  const goNext = () => { const n = new Date(monthStart); n.setMonth(n.getMonth() + 1); setMonthStart(n); };
  const goToday = () => setMonthStart(startOfMonth(new Date()));

  const todayKey = toDateKey(new Date());
  const monthNumber = monthStart.getMonth();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card border border-border rounded-xl px-4 py-3 text-xs">
        <span className="font-medium text-foreground">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={goPrev} className="p-1.5 rounded-md hover:bg-background" title="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={goToday} className="px-2 py-1 text-xs font-medium hover:bg-background rounded-md">
            This month
          </button>
          <button type="button" onClick={goNext} className="p-1.5 rounded-md hover:bg-background" title="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Day-of-week header row */}
          <div className="grid grid-cols-7 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="px-2 py-1.5 text-center border-r border-border last:border-r-0">
                {label}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const key = toDateKey(day);
              const dayEvents = eventsByDay.get(key) || [];
              const isToday = todayKey === key;
              const isCurrentMonth = day.getMonth() === monthNumber;
              const isLastRow = idx >= cells.length - 7;

              return (
                <div
                  key={key}
                  className={`min-h-[84px] px-1.5 py-1 border-r border-b border-border last:border-r-0 ${!isLastRow ? '' : 'border-b-0'} ${isCurrentMonth ? '' : 'bg-muted/10'}`}
                >
                  <div className={`text-[11px] font-medium mb-1 flex items-center justify-between ${isCurrentMonth ? 'text-foreground/80' : 'text-muted-foreground/40'} ${isToday ? 'text-foreground' : ''}`}>
                    <span className={isToday ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px]' : ''}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <MonthEventDot
                        key={e.fanout_id}
                        event={e}
                        onOpen={() => setSelectedEvent(e as unknown as FanoutEventForPreview)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground bg-card border border-border rounded-xl">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p>No scheduled content yet this month.</p>
          <p className="text-xs mt-1">
            Open a{' '}
            <Link href="/app/content-kit" className="underline hover:text-foreground">
              Content Kit
            </Link>
            {' '}and click AI Schedule to start.
          </p>
        </div>
      )}

      <EventPreviewModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onChanged={() => { setSelectedEvent(null); load(); }}
      />
    </div>
  );
}

function MonthEventDot({ event, onOpen }: { event: FanoutEvent; onOpen: () => void }) {
  const tint = tintForKit(event.content_kit_id);
  const earliest = event.platforms[0]?.scheduled_at;
  const timeLabel = earliest
    ? new Date(earliest).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-center gap-1 text-[10px] text-foreground/80 hover:text-foreground hover:bg-muted/40 rounded px-1 py-0.5 overflow-hidden"
      title={[timeLabel, event.kit_title ? `From kit: ${event.kit_title}` : null, event.content_preview].filter(Boolean).join('\n')}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tint }} />
      <span className="truncate">{event.content_preview || 'Untitled'}</span>
    </button>
  );
}

function startOfWeek(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  const dow = n.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  n.setDate(n.getDate() + offset);
  return n;
}
function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}
function startOfMonth(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  n.setDate(1);
  return n;
}
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
