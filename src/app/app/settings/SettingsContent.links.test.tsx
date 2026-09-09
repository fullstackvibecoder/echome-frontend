import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTab = vi.fn();
const mockGetUsageLimits = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'tab' ? mockTab() : null) }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com' } }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isFreeUser: false, tier: 'studio', subscription: null }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } },
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('./ConnectedAccounts', () => ({
  ConnectedAccounts: () => <div data-testid="connected-accounts" />,
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    auth: {
      getProfile: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'u1',
          email: 'test@example.com',
          subscription_tier: 'studio',
          credits_remaining: 100,
          email_notifications: true,
          weekly_digest: false,
          auto_clean_clips: true,
        },
      }),
      updateProfile: vi.fn(),
      uploadProfileImage: vi.fn(),
    },
    stripe: {
      getUsageLimits: (...a: unknown[]) => mockGetUsageLimits(...a),
      getPortalUrl: vi.fn(),
    },
    account: {
      getDataSummary: vi.fn(),
      submitFeedback: vi.fn(),
      applyWinback: vi.fn(),
      cancelSubscription: vi.fn(),
      deleteAccount: vi.fn(),
    },
  },
}));

import SettingsContent from './SettingsContent';

const paidUsage = {
  userId: 'u1',
  tier: 'studio',
  currentMonth: '2026-09',
  generationsUsed: 3,
  generationsLimit: 0,
  generationsRemaining: 0,
  tokensUsed: 0,
  costUsd: 0,
  isUnlimited: true,
  videoMinutesUsed: 0,
  videoMinutesLimit: 0,
  videoMinutesRemaining: 0,
};

describe('SettingsContent demoted-route links', () => {
  beforeEach(() => {
    mockGetUsageLimits.mockResolvedValue({ success: true, data: paidUsage });
  });

  it('Billing tab shows a View plans link to /app/billing for a paid user', async () => {
    mockTab.mockReturnValue('billing');
    render(<SettingsContent />);
    const link = await screen.findByRole('link', { name: /view plans/i });
    expect(link).toHaveAttribute('href', '/app/billing');
    // Paid users do not get the free-tier upgrade button.
    expect(screen.queryByRole('button', { name: /upgrade to pro/i })).not.toBeInTheDocument();
  });

  it('Billing tab still shows View plans for a free user alongside the upgrade button', async () => {
    mockTab.mockReturnValue('billing');
    mockGetUsageLimits.mockResolvedValue({
      success: true,
      data: { ...paidUsage, tier: 'free', isUnlimited: false, generationsLimit: 5, generationsRemaining: 2 },
    });
    render(<SettingsContent />);
    expect(await screen.findByRole('link', { name: /view plans/i })).toHaveAttribute('href', '/app/billing');
    expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument();
  });

  it('Account tab shows an Open Developers link to /app/developers', async () => {
    mockTab.mockReturnValue('account');
    render(<SettingsContent />);
    const link = await screen.findByRole('link', { name: /open developers/i });
    expect(link).toHaveAttribute('href', '/app/developers');
  });
});
