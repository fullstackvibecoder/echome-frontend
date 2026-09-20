import { describe, it, expect } from 'vitest';
import { getScheduledCancellation, isCancellationPending } from './subscription-status';

describe('getScheduledCancellation', () => {
  it('returns nothing for a subscription that is simply renewing', () => {
    expect(getScheduledCancellation({
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2026-10-01T00:00:00Z',
    })).toBeNull();
  });

  it('reports the period end when cancel_at_period_end is set', () => {
    expect(getScheduledCancellation({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-10-01T00:00:00Z',
    })).toEqual({ endsAt: '2026-10-01T00:00:00Z' });
  });

  // The billing portal cancels this way. We stored only the boolean above, so
  // these customers were shown "Renews" after they had already cancelled.
  it('reports cancelAt when the portal scheduled an end date', () => {
    expect(getScheduledCancellation({
      cancelAtPeriodEnd: false,
      cancelAt: '2026-09-22T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
    })).toEqual({ endsAt: '2026-09-22T00:00:00Z' });
  });

  it('prefers the earlier date when both say the subscription is ending', () => {
    expect(getScheduledCancellation({
      cancelAtPeriodEnd: true,
      cancelAt: '2026-09-22T00:00:00Z',
      currentPeriodEnd: '2026-10-01T00:00:00Z',
    })).toEqual({ endsAt: '2026-09-22T00:00:00Z' });
  });

  it('still reports a cancellation when the period end is missing', () => {
    expect(getScheduledCancellation({
      cancelAtPeriodEnd: false,
      cancelAt: '2026-09-22T00:00:00Z',
    })).toEqual({ endsAt: '2026-09-22T00:00:00Z' });
  });

  it('ignores an unusable date rather than rendering "Invalid Date"', () => {
    expect(getScheduledCancellation({ cancelAtPeriodEnd: false, cancelAt: 'not-a-date' })).toBeNull();
    expect(getScheduledCancellation({ cancelAtPeriodEnd: true, currentPeriodEnd: undefined })).toBeNull();
  });

  it('handles a missing subscription', () => {
    expect(getScheduledCancellation(undefined)).toBeNull();
    expect(getScheduledCancellation(null)).toBeNull();
  });
});

describe('isCancellationPending', () => {
  const now = new Date('2026-09-20T12:00:00Z');

  it('is true while access continues', () => {
    expect(isCancellationPending({ cancelAtPeriodEnd: false, cancelAt: '2026-09-22T00:00:00Z' }, now)).toBe(true);
  });

  // Otherwise a cancellation from last year would hide the expired banner forever.
  it('is false once the end date has passed', () => {
    expect(isCancellationPending({ cancelAtPeriodEnd: false, cancelAt: '2026-01-01T00:00:00Z' }, now)).toBe(false);
  });

  it('is false when nothing is scheduled', () => {
    expect(isCancellationPending({ cancelAtPeriodEnd: false }, now)).toBe(false);
    expect(isCancellationPending(null, now)).toBe(false);
  });
});
