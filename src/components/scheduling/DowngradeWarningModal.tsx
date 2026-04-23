'use client';

/**
 * DowngradeWarningModal
 *
 * Intercepts the "Manage Subscription" click when the user has upcoming
 * auto-posts scheduled. Warns them that after the billing cycle ends, any
 * remaining auto-posts will become calendar reminders (they'll need to
 * post manually). Lets them proceed to the Stripe portal or cancel.
 *
 * This is the frontend half of task #29. The backend half — Stripe webhook
 * converting scheduled_posts → social_post_reminders at cycle end — lives
 * in src/routes/stripe.ts which is flagged as do-not-auto-modify. See the
 * end of this file for the webhook logic the backend needs to add.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Loader2, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';

interface UpcomingPost {
  platform: string;
  scheduled_at: string;
  kit_title?: string;
}

interface Props {
  open: boolean;
  /** Billing-cycle-end date ISO to show in the warning. Optional — if omitted the copy softens. */
  cycleEndDate?: string;
  /** Fires when user confirms; parent should then proceed with portal redirect */
  onConfirm: () => void;
  onClose: () => void;
}

export function DowngradeWarningModal({ open, cycleEndDate, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingPost[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await api.socialPosting.getCalendar();
        if (cancelled) return;
        if (resp.success && resp.data) {
          const future = resp.data.events
            .filter((e) => e.aggregate_status === 'scheduled' && !e.is_reminder)
            .flatMap((e) => e.platforms
              .filter((p) => p.status === 'scheduled')
              .map((p) => ({ platform: p.platform, scheduled_at: p.scheduled_at, kit_title: e.kit_title })),
            )
            .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
          setUpcoming(future);
        }
      } catch {
        // If we can't tell, we still let them proceed — fail open
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const hasUpcoming = upcoming.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Manage your subscription</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Before you downgrade, here&apos;s what happens to your scheduled auto-posts.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasUpcoming ? (
            <>
              <p className="text-sm text-foreground">
                You have <strong>{upcoming.length}</strong> auto-post{upcoming.length === 1 ? '' : 's'} scheduled
                {cycleEndDate && <> after {formatDate(cycleEndDate)}</>}.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Auto-posting continues until your current billing cycle ends. After that, any remaining
                auto-posts will convert to calendar reminders — we&apos;ll still email you at the scheduled
                time with copy-ready content, but you&apos;ll need to paste into each platform yourself.
              </p>
              <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {upcoming.slice(0, 8).map((p, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="capitalize text-foreground">{p.platform}</span>
                      {p.kit_title && (
                        <span className="text-muted-foreground truncate max-w-[160px]">· {p.kit_title}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">{formatDateTime(p.scheduled_at)}</span>
                  </div>
                ))}
                {upcoming.length > 8 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    + {upcoming.length - 8} more
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any upcoming auto-posts scheduled, so nothing will be affected by a plan change.
            </p>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Nevermind
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background rounded-lg text-xs font-medium hover:opacity-90"
          >
            Continue to billing portal
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Backend TODO (src/routes/stripe.ts / src/services/stripe/ — do not auto-modify):
 *
 * When Stripe webhook fires a downgrade event (subscription.updated with a
 * lower-tier price, or subscription.deleted), at the cycle end we need to:
 *
 *   1. Find all scheduled_posts for this user where scheduled_at > cycle_end
 *      AND status = 'scheduled'.
 *   2. For each, call outstand.cancelPost(outstand_post_id) to stop the
 *      auto-post from firing.
 *   3. Insert a matching row into social_post_reminders with the same
 *      content, scheduled_at, platform, content_kit_id — created_via set to
 *      'downgrade_conversion'.
 *   4. Update the original scheduled_posts row's status to 'cancelled' with
 *      error_message 'Converted to reminder after downgrade'.
 *
 * This keeps the user's rollout intact from their perspective — the calendar
 * still shows the events — they just have to post manually from that point.
 * The reminder-notifier cron already handles the email/notification side.
 */
