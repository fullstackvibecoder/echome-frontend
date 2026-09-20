/**
 * Reading a subscription's cancellation state.
 *
 * Stripe describes a pending cancellation two different ways, and the billing
 * portal uses the one we did not read: `cancel_at`, a date, rather than
 * `cancel_at_period_end`, a boolean. Every surface therefore told customers
 * who had cancelled through the portal that their subscription "Renews".
 *
 * Both are checked here, in one place, so the badge, the date line and the
 * expired-account banner cannot disagree about whether someone has cancelled.
 */

export interface CancellableSubscription {
  cancelAtPeriodEnd?: boolean;
  /** Set when a billing-portal cancellation scheduled an end date. */
  cancelAt?: string | null;
  currentPeriodEnd?: string | null;
}

export interface ScheduledCancellation {
  /** When access actually ends. */
  endsAt: string;
}

const usableDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
};

/**
 * The moment this subscription stops, or null if it is not scheduled to stop.
 * When both signals are present the earlier one wins: that is the date the
 * customer actually loses access.
 */
export function getScheduledCancellation(
  subscription: CancellableSubscription | null | undefined,
): ScheduledCancellation | null {
  if (!subscription) return null;

  const dates: string[] = [];
  const portalDate = usableDate(subscription.cancelAt);
  if (portalDate) dates.push(portalDate);
  if (subscription.cancelAtPeriodEnd) {
    const periodEnd = usableDate(subscription.currentPeriodEnd);
    if (periodEnd) dates.push(periodEnd);
  }
  if (dates.length === 0) return null;

  const endsAt = dates.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
  return { endsAt };
}

/**
 * True while a cancellation is scheduled but access has not ended yet.
 *
 * Distinct from getScheduledCancellation, which still reports a date that has
 * already passed. Callers deciding whether someone has *lost* access (the
 * expired-account banner) need the time comparison, or a cancellation from
 * last year would keep the banner permanently hidden.
 */
export function isCancellationPending(
  subscription: CancellableSubscription | null | undefined,
  now: Date = new Date(),
): boolean {
  const scheduled = getScheduledCancellation(subscription);
  return scheduled !== null && new Date(scheduled.endsAt).getTime() > now.getTime();
}
