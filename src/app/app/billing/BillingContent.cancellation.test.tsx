/**
 * A customer who cancelled through the billing portal was shown "Renews".
 * Stripe records that cancellation as `cancel_at` (a date) rather than
 * `cancel_at_period_end`, and the page only ever read the boolean.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSubscription = vi.fn();
const mockGetPlans = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/meta-pixel', () => ({ trackSubscribe: vi.fn() }));
vi.mock('@/components/scheduling/DowngradeWarningModal', () => ({
  DowngradeWarningModal: () => null,
}));
vi.mock('@/lib/api-client', () => ({
  default: {
    stripe: {
      getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
      getPlans: (...args: unknown[]) => mockGetPlans(...args),
      syncSubscription: vi.fn(),
      createPortalSession: vi.fn(),
    },
  },
}));

import BillingContent from './BillingContent';

const subscription = (extra: Record<string, unknown>) => ({
  success: true,
  data: {
    isSubscribed: true,
    tier: 'pro',
    status: 'active',
    currentPeriodEnd: '2026-10-15T00:00:00Z',
    cancelAtPeriodEnd: false,
    ...extra,
  },
});

describe('BillingContent cancellation state', () => {
  beforeEach(() => {
    // The setup file resets mocks between tests, so both implementations have
    // to be (re)established here or loadData sees undefined results.
    mockGetSubscription.mockReset();
    mockGetPlans.mockReset().mockResolvedValue({ success: true, data: { plans: [] } });
  });

  it('says the subscription is ending when the portal scheduled an end date', async () => {
    mockGetSubscription.mockResolvedValue(subscription({ cancelAt: '2026-09-22T00:00:00Z' }));
    render(<BillingContent />);

    expect(await screen.findByText(/Access until/)).toBeInTheDocument();
    expect(screen.queryByText(/Renews/)).not.toBeInTheDocument();
  });

  it('still says Renews for a subscription that is not cancelling', async () => {
    mockGetSubscription.mockResolvedValue(subscription({}));
    render(<BillingContent />);

    expect(await screen.findByText(/Renews/)).toBeInTheDocument();
    expect(screen.queryByText(/Access until/)).not.toBeInTheDocument();
  });
});
