'use client';

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => '/app',
}));

// Mock EchoHero
vi.mock('@/components/echo/EchoHero', () => ({
  EchoHero: () => <div data-testid="echo-hero" />,
}));

// Mock GenerationForm (named export from @/components/generation-form)
vi.mock('@/components/generation-form', () => ({
  GenerationForm: () => <div data-testid="generation-form" />,
}));

// Mock legacy components so we can assert on their presence/absence
vi.mock('@/components/dashboard/GetStartedChecklist', () => ({
  GetStartedChecklist: () => <div data-testid="legacy-checklist" />,
}));
vi.mock('@/components/create/AdaptiveCreateSurface', () => ({
  AdaptiveCreateSurface: () => <div data-testid="legacy-adaptive" />,
}));
vi.mock('@/components/dashboard/DraftedForYou', () => ({
  DraftedForYou: () => <div data-testid="legacy-drafted" />,
}));
vi.mock('@/components/dashboard/OutcomeChips', () => ({
  OutcomeChips: () => <div data-testid="legacy-outcome" />,
}));

// Mock useGeneration - returning resting state (no results, not generating)
vi.mock('@/hooks/useGeneration', () => ({
  useGeneration: () => ({
    generating: false,
    requestId: null,
    results: null,
    error: null,
    isQuotaError: false,
    voiceScore: null,
    qualityScore: null,
    generate: vi.fn(),
    repurpose: vi.fn(),
    reset: vi.fn(),
  }),
}));

// Mock useResultsFeedback
vi.mock('@/hooks/useResultsFeedback', () => ({
  useResultsFeedback: () => ({
    sendFeedback: vi.fn(),
    copyToClipboard: vi.fn(),
  }),
}));

// Mock useGenerationProgress
vi.mock('@/hooks/useGenerationProgress', () => ({
  useGenerationProgress: () => ({
    progress: null,
    isComplete: false,
    hasError: false,
    carouselReady: false,
    carouselFailed: false,
  }),
}));

// Mock usePendingCheckout - must return not-checking to avoid early return
vi.mock('@/hooks/usePendingCheckout', () => ({
  usePendingCheckout: () => ({
    checking: false,
    checkoutLoading: false,
  }),
}));

// Mock useFirstTimeUser
vi.mock('@/hooks/useFirstTimeUser', () => ({
  useFirstTimeUser: () => ({
    isFirstTime: false,
    dismissWelcome: vi.fn(),
  }),
}));

// Mock useAuth - default non-admin, overridden per test suite.
// The explicit cast on the return value keeps TS happy with optional isAdmin.
type MockAuthUser = { id: string; email: string; full_name: string; isAdmin?: boolean };
const mockUseAuth = vi.fn(() => ({
  user: { id: 'test-user', email: 'test@example.com', full_name: 'Test User' } as MockAuthUser,
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useVoiceContext
vi.mock('@/contexts/voice-context', () => ({
  useVoiceContext: () => ({
    activeVoice: null,
    isTeamsUser: false,
    voiceLimit: 1,
  }),
}));

// Mock useSubscription
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isFreeUser: false,
    freeGenerationsRemaining: 5,
    freeGenerationsLimit: 5,
  }),
}));

// Mock toast utilities
vi.mock('@/lib/toast', () => ({
  showErrorToast: vi.fn(),
  showInfoToast: vi.fn(),
}));

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  api: {
    images: { uploadBackground: vi.fn() },
    generation: { getRequest: vi.fn() },
  },
}));

// Mock generation-banner utilities
vi.mock('@/components/generation-banner', () => ({
  setActiveGeneration: vi.fn(),
  clearActiveGeneration: vi.fn(),
}));

// Mock notification utilities
vi.mock('@/lib/notifications', () => ({
  requestNotificationPermission: vi.fn(),
  showNotificationIfHidden: vi.fn(),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <svg data-testid="x-icon" />,
}));

// Mock ContentCards and CarouselPreview (used in results branch, not resting)
vi.mock('@/components/content-cards', () => ({
  ContentCards: () => <div data-testid="content-cards" />,
}));
vi.mock('@/components/carousel-preview', () => ({
  CarouselPreview: () => <div data-testid="carousel-preview" />,
}));

import AppContent from './AppContent';

describe('AppContent resting state - admin path (isAdmin: true)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-user', email: 'admin@example.com', full_name: 'Admin User', isAdmin: true },
    });
  });

  it('renders EchoHero for admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('echo-hero')).toBeTruthy();
  });

  it('does NOT render GetStartedChecklist for admin users', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-checklist')).toBeNull();
  });

  it('does NOT render DraftedForYou for admin users', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-drafted')).toBeNull();
  });

  it('does NOT render OutcomeChips for admin users', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-outcome')).toBeNull();
  });

  it('keeps GenerationForm mounted for admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('generation-form')).toBeTruthy();
  });

  it('wraps GenerationForm in a hidden container with aria-hidden for admin users', () => {
    const { container } = render(<AppContent />);
    const hiddenWrapper = container.querySelector('[aria-hidden]');
    expect(hiddenWrapper).toBeTruthy();
    expect(hiddenWrapper?.classList.contains('hidden')).toBe(true);
    const formInsideWrapper = hiddenWrapper?.querySelector('[data-testid="generation-form"]');
    expect(formInsideWrapper).toBeTruthy();
  });
});

describe('AppContent resting state - non-admin path (isAdmin: false)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'regular-user', email: 'user@example.com', full_name: 'Regular User', isAdmin: false },
    });
  });

  it('does NOT render EchoHero for non-admin users', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('echo-hero')).toBeNull();
  });

  it('renders GetStartedChecklist for non-admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('legacy-checklist')).toBeTruthy();
  });

  it('renders DraftedForYou for non-admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('legacy-drafted')).toBeTruthy();
  });

  it('renders OutcomeChips for non-admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('legacy-outcome')).toBeTruthy();
  });

  it('keeps GenerationForm mounted for non-admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('generation-form')).toBeTruthy();
  });

  it('renders GenerationForm outside the hidden wrapper for non-admin users', () => {
    const { container } = render(<AppContent />);
    // The hidden wrapper must NOT exist on the non-admin path
    const hiddenWrapper = container.querySelector('[aria-hidden]');
    expect(hiddenWrapper).toBeNull();
    // GenerationForm must still be in the DOM
    expect(screen.getByTestId('generation-form')).toBeTruthy();
  });
});

describe('AppContent resting state - non-admin path (isAdmin: undefined)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'regular-user', email: 'user@example.com', full_name: 'Regular User' },
    });
  });

  it('does NOT render EchoHero when isAdmin is undefined', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('echo-hero')).toBeNull();
  });

  it('renders the legacy trio when isAdmin is undefined', () => {
    render(<AppContent />);
    expect(screen.getByTestId('legacy-checklist')).toBeTruthy();
    expect(screen.getByTestId('legacy-drafted')).toBeTruthy();
    expect(screen.getByTestId('legacy-outcome')).toBeTruthy();
  });

  it('keeps GenerationForm mounted when isAdmin is undefined', () => {
    render(<AppContent />);
    expect(screen.getByTestId('generation-form')).toBeTruthy();
  });
});
