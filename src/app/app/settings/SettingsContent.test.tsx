import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Land directly on the Preferences tab so the toggle renders.
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'tab' ? 'preferences' : null) }),
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

const updateProfile = vi.fn();

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
      updateProfile: (...a: unknown[]) => updateProfile(...a),
      uploadProfileImage: vi.fn(),
    },
    stripe: {
      getUsageLimits: vi.fn().mockResolvedValue({ success: true, data: {} }),
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

describe('SettingsContent — Auto-clean preference', () => {
  beforeEach(() => {
    updateProfile.mockClear();
    updateProfile.mockResolvedValue({
      success: true,
      data: {
        id: 'u1',
        email: 'test@example.com',
        subscription_tier: 'studio',
        credits_remaining: 100,
        email_notifications: true,
        weekly_digest: false,
        auto_clean_clips: false,
      },
    });
  });

  it('renders the toggle checked from profile and persists when toggled off', async () => {
    render(<SettingsContent />);
    const toggle = await screen.findByLabelText(/auto-clean my clips/i);
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(updateProfile).toHaveBeenCalledWith({ auto_clean_clips: false });
  });
});
