'use client';

/**
 * FailedPostsPanel
 *
 * Side-panel invoked from the "N failed" counter in calendar headers. Lists
 * every event with at least one failed platform, each with a per-event Dismiss
 * button plus a "Dismiss all" at the bottom. The dismiss action is implemented
 * as a soft-delete: it cancels the failed rows (status → 'cancelled'), which
 * the calendar SQL filter already hides. DB rows stay for audit; the user just
 * clears visual clutter.
 *
 * Kept small and dependency-free so both WeekGrid and MonthGrid can mount it
 * without extra state machinery.
 */
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error-utils';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface FailedEvent {
  fanout_id: string;
  content_preview: string;
  platforms: Array<{
    post_id: string;
    platform: string;
    status: string;
    scheduled_at: string;
    error_message?: string;
  }>;
}

interface Props {
  events: FailedEvent[];
  onClose: () => void;
  onDismissed: () => void;
}

export function FailedPostsPanel({ events, onClose, onDismissed }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const dismissEvent = async (fanoutId: string) => {
    const target = events.find((e) => e.fanout_id === fanoutId);
    if (!target) return;
    const failedRows = target.platforms.filter((p) => p.status === 'failed');
    setBusy(fanoutId);
    try {
      await Promise.allSettled(
        failedRows.map((p) => api.socialPosting.cancelPost(p.post_id)),
      );
      toast.success('Dismissed');
      onDismissed();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, 'Dismiss failed'));
    } finally {
      setBusy(null);
    }
  };

  const dismissAll = async () => {
    if (events.length === 0) return;
    const ok = window.confirm(
      `Dismiss ${events.length} failed event${events.length === 1 ? '' : 's'} from your calendar? Records are kept in the database for audit.`,
    );
    if (!ok) return;
    setBusy('__all__');
    try {
      const allFailedRows = events.flatMap((e) => e.platforms.filter((p) => p.status === 'failed'));
      await Promise.allSettled(
        allFailedRows.map((p) => api.socialPosting.cancelPost(p.post_id)),
      );
      toast.success(`Dismissed ${events.length} event${events.length === 1 ? '' : 's'}`);
      onDismissed();
      onClose();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, 'Dismiss-all failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-medium text-foreground">
              {events.length} failed event{events.length === 1 ? '' : 's'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-background" aria-label="Close">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nothing to clean up here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((e) => {
                const earliest = e.platforms.reduce(
                  (min, p) => (p.scheduled_at < min ? p.scheduled_at : min),
                  e.platforms[0]?.scheduled_at ?? '',
                );
                const failedPlatforms = e.platforms.filter((p) => p.status === 'failed');
                const firstError = failedPlatforms.find((p) => p.error_message)?.error_message;
                const isBusy = busy === e.fanout_id || busy === '__all__';
                return (
                  <li key={e.fanout_id} className="px-5 py-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground text-[11px] mb-0.5">
                          {formatShort(earliest)} · {failedPlatforms.map((p) => p.platform).join(', ')}
                        </div>
                        <div className="text-foreground line-clamp-2">
                          {e.content_preview || <span className="italic text-muted-foreground">No caption</span>}
                        </div>
                        {firstError && (
                          <div className="mt-1 text-[10px] text-red-500/80 line-clamp-2">{firstError}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => dismissEvent(e.fanout_id)}
                        disabled={isBusy}
                        className="text-[11px] text-muted-foreground hover:text-red-500 disabled:opacity-30 px-2 py-1 rounded-md hover:bg-background flex-shrink-0"
                      >
                        {busy === e.fanout_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Dismiss'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {events.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Records stay in DB — this only hides from the calendar.</span>
            <button
              type="button"
              onClick={dismissAll}
              disabled={busy === '__all__'}
              className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
            >
              {busy === '__all__' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Dismiss all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatShort(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
