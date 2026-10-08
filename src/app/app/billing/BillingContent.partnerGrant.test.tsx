/**
 * A seat paid for by a reseller partner (The Listings Lab) must not be
 * offered plans to buy. Tara Tom bought Pro on top of a Studio grant on
 * 2026-10-08 because this page looked like any other upgrade page. The
 * backend now refuses that checkout; the page should not present it.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSubscription = vi.fn();
const mockGetPlans = vi.fn();
const mockCreateCheckout = vi.fn();
let planParam: string | null = null;

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => planParam }),
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
      createCheckoutSession: (...args: unknown[]) => mockCreateCheckout(...args),
      syncSubscription: vi.fn(),
      createPortalSession: vi.fn(),
    },
  },
}));

import BillingContent from './BillingContent';

const plans = [
  { id: 'echo', name: 'Echo', tier: 'pro', monthlyPrice: 37, annualPrice: 370, features: [] },
  { id: 'echo-studio', name: 'Echo Studio', tier: 'studio', monthlyPrice: 87, annualPrice: 870, features: [] },
];

const granted = {
  success: true,
  data: {
    isSubscribed: true,
    tier: 'studio',
    status: 'active',
    isAdminAssigned: true,
    partnerGrant: { partner: 'The Listings Lab', tier: 'studio', expiresAt: '2027-08-04T14:25:40Z' },
  },
};

describe('BillingContent with a partner grant', () => {
  beforeEach(() => {
    planParam = null;
    mockGetSubscription.mockReset().mockResolvedValue(granted);
    mockGetPlans.mockReset().mockResolvedValue({ success: true, data: { plans } });
    mockCreateCheckout.mockReset();
  });

  it('says who pays and until when, and hides the plan cards and portal button', async () => {
    render(<BillingContent />);

    expect(await screen.findByText(/Echo Studio through The Listings Lab/)).toBeInTheDocument();
    expect(screen.getByText(/Included through The Listings Lab until/)).toBeInTheDocument();
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument();
    expect(screen.queryByText('Switch to this plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Subscription')).not.toBeInTheDocument();
    expect(screen.queryByText('Free Plan')).not.toBeInTheDocument();
  });

  it('does not auto-launch checkout from a ?plan= marketing link', async () => {
    planParam = 'echo';
    render(<BillingContent />);

    await screen.findByText(/Echo Studio through The Listings Lab/);
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('still offers plans to a paying customer', async () => {
    mockGetSubscription.mockResolvedValue({
      success: true,
      data: { isSubscribed: true, tier: 'pro', status: 'active', currentPeriodEnd: '2026-11-01T00:00:00Z' },
    });
    render(<BillingContent />);

    expect(await screen.findByText('Switch to this plan')).toBeInTheDocument();
    expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
  });
});
