'use client';

/**
 * SuggestedScheduleModal
 *
 * The "wow moment" — shows the AI-suggested rollout right after a kit is
 * generated (or on-demand from a kit view). Universal across tiers:
 *   Studio+ → clicking "Use this schedule" creates real auto-posts via Outstand
 *   Below Studio → creates calendar reminders with same UI language
 *
 * Each row has a reason_text tooltip explaining the suggestion, and the time
 * is editable in place. Users can accept the whole rollout with one click.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error-utils';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2, X, Info, Calendar, CheckCircle } from 'lucide-react';

interface SuggestedRow {
  output_id: string;
  output_label: string;
  platform: string;
  suggested_at: string; // ISO, can be mutated by user
  output_kind: 'written_post' | 'carousel' | 'clip' | 'reel' | 'other';
  content_preview: string;
  reason_text: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  kitId: string;
  kitTitle?: string;
  /** Fires when the schedule is accepted (either posts or reminders created) */
  onScheduled?: () => void;
}

export function SuggestedScheduleModal({ open, onClose, kitId, kitTitle, onScheduled }: Props) {
  const { canAutoPost } = useSubscription();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<SuggestedRow[]>([]);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [resolvedTitle, setResolvedTitle] = useState(kitTitle || '');

  const userTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
  }, []);

  useEffect(() => {
    if (!open || !kitId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await api.socialPosting.suggestSchedule({ kit_id: kitId, timezone: userTz });
        if (cancelled) return;
        if (resp.success && resp.data) {
          setRows(resp.data.rows);
          setTimezone(resp.data.timezone);
          if (resp.data.kit_title) setResolvedTitle(resp.data.kit_title);
        }
      } catch {
        if (!cancelled) toast.error('Could not load suggestions. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, kitId, userTz]);

  if (!open) return null;

  const updateRowTime = (outputId: string, platform: string, newIsoLocal: string) => {
    // newIsoLocal is from <input type="datetime-local">, interpret as user's TZ
    const localDate = new Date(newIsoLocal);
    if (isNaN(localDate.getTime())) return;
    setRows((prev) => prev.map((r) =>
      r.output_id === outputId && r.platform === platform
        ? { ...r, suggested_at: localDate.toISOString() }
        : r,
    ));
  };

  const handleAccept = async () => {
    if (rows.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      if (canAutoPost) {
        // Fanout-schedule each row via the API
        for (const row of rows) {
          await api.socialPosting.scheduleFanout({
            content_kit_id: kitId,
            source_output_id: row.output_id,
            rows: [{ platform: row.platform, scheduled_at: row.suggested_at, text: row.content_preview }],
            created_via: 'ai_suggest',
            is_ai_suggested: true,
          });
        }
        toast.success(`Scheduled ${rows.length} ${rows.length === 1 ? 'post' : 'posts'}`);
      } else {
        for (const row of rows) {
          await api.socialPosting.createReminder({
            content_kit_id: kitId,
            source_output_id: row.output_id,
            platform: row.platform,
            text: row.content_preview,
            scheduled_at: row.suggested_at,
            created_via: 'ai_suggest',
          });
        }
        toast.success(`Created ${rows.length} ${rows.length === 1 ? 'reminder' : 'reminders'}`);
      }
      onScheduled?.();
      onClose();
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, 'Failed to schedule. Please try again.');
      toast.error(msg);
      console.error('[SuggestedScheduleModal] Accept failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const toLocalInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4" />
              <h2 className="text-base font-semibold">
                {canAutoPost ? 'Suggested rollout' : 'Suggested reminders'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resolvedTitle || 'Your kit'} — we picked times that historically perform best on each platform.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-background" aria-label="Close">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>No suggestions available yet.</p>
              <p className="text-xs mt-1">Connect a social account or generate platform content to get a rollout.</p>
            </div>
          )}

          {!loading && rows.map((row) => (
            <div key={`${row.output_id}-${row.platform}`} className="border border-border rounded-xl p-3 space-y-2 bg-background/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{row.output_label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {row.platform}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {row.content_preview}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="datetime-local"
                  value={toLocalInputValue(row.suggested_at)}
                  onChange={(e) => updateRowTime(row.output_id, row.platform, e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground"
                />
                <div className="group relative" title={row.reason_text}>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  <div className="pointer-events-none absolute bottom-full mb-1 left-0 max-w-xs text-[11px] bg-foreground text-background rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {row.reason_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-muted-foreground">
            Times shown in {timezone}. {canAutoPost ? 'Posts go out automatically at the scheduled time.' : 'You\'ll get an email reminder with copy-ready content at each scheduled time.'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={submitting}
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={rows.length === 0 || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {canAutoPost ? 'Use this schedule' : 'Create reminders'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
