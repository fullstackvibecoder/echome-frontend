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

// Mock useVoiceContext - overridable per test, following the mockUseAuth pattern.
const mockUseVoiceContext = vi.fn(() => ({
  activeVoice: null,
  isTeamsUser: false,
  voiceLimit: 1,
}));
vi.mock('@/contexts/voice-context', () => ({
  useVoiceContext: () => mockUseVoiceContext(),
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
    mockUseVoiceContext.mockReturnValue({ activeVoice: null, isTeamsUser: false, voiceLimit: 1 });
  });

  it('renders EchoHero for admin users', () => {
    render(<AppContent />);
    expect(screen.getByTestId('echo-hero')).toBeInTheDocument();
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
    expect(screen.getByTestId('generation-form')).toBeInTheDocument();
  });

  it('wraps GenerationForm in a hidden container with aria-hidden for admin users', () => {
    const { container } = render(<AppContent />);
    const hiddenWrapper = container.querySelector('[aria-hidden="true"]');
    expect(hiddenWrapper).not.toBeNull();
    expect(hiddenWrapper?.classList.contains('hidden')).toBe(true);
    const formInsideWrapper = hiddenWrapper?.querySelector('[data-testid="generation-form"]');
    expect(formInsideWrapper).not.toBeNull();
  });
});

// GA (2026-06-17): showCreateRedesign is hardcoded true, so the Create
// redesign renders for EVERY user regardless of isAdmin. These suites pin
// that non-admin users now get the EchoHero path, not the legacy trio.
describe('AppContent resting state - GA non-admin (isAdmin: false)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'regular-user', email: 'user@example.com', full_name: 'Regular User', isAdmin: false },
    });
    mockUseVoiceContext.mockReturnValue({ activeVoice: null, isTeamsUser: false, voiceLimit: 1 });
  });

  it('renders EchoHero for non-admin users (GA)', () => {
    render(<AppContent />);
    expect(screen.getByTestId('echo-hero')).toBeInTheDocument();
  });

  it('does NOT render the legacy trio for non-admin users (GA)', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-checklist')).toBeNull();
    expect(screen.queryByTestId('legacy-drafted')).toBeNull();
    expect(screen.queryByTestId('legacy-outcome')).toBeNull();
  });

  it('keeps GenerationForm mounted in the hidden wrapper for non-admin users (GA)', () => {
    const { container } = render(<AppContent />);
    const hiddenWrapper = container.querySelector('[aria-hidden="true"]');
    expect(hiddenWrapper).not.toBeNull();
    expect(hiddenWrapper?.classList.contains('hidden')).toBe(true);
    expect(hiddenWrapper?.querySelector('[data-testid="generation-form"]')).not.toBeNull();
  });
});

describe('AppContent resting state - GA non-admin (isAdmin: undefined)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'regular-user', email: 'user@example.com', full_name: 'Regular User' },
    });
    mockUseVoiceContext.mockReturnValue({ activeVoice: null, isTeamsUser: false, voiceLimit: 1 });
  });

  it('renders EchoHero when isAdmin is undefined (GA)', () => {
    render(<AppContent />);
    expect(screen.getByTestId('echo-hero')).toBeInTheDocument();
  });

  it('does NOT render the legacy trio when isAdmin is undefined (GA)', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-checklist')).toBeNull();
    expect(screen.queryByTestId('legacy-drafted')).toBeNull();
    expect(screen.queryByTestId('legacy-outcome')).toBeNull();
  });

  it('keeps GenerationForm mounted when isAdmin is undefined (GA)', () => {
    render(<AppContent />);
    expect(screen.getByTestId('generation-form')).toBeInTheDocument();
  });
});

// Teams onboarding: on the redesign path (showCreateRedesign hardcoded true,
// so this covers ALL users) the old gradient banner never renders -- it's
// demoted to a quiet dashed note that renders after EchoHero instead.
describe('AppContent resting state - Teams onboarding note (redesign path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { id: 'teams-user', email: 'teams@example.com', full_name: 'Teams User' },
    });
    mockUseVoiceContext.mockReturnValue({ activeVoice: null, isTeamsUser: true, voiceLimit: 3 });
  });

  it('does NOT render the legacy gradient Teams banner', () => {
    render(<AppContent />);
    expect(screen.queryByText('Welcome to EchoTeams!')).toBeNull();
    expect(screen.queryByText('Go to Team Voices')).toBeNull();
  });

  it('renders the demoted Teams note after EchoHero when showTeamsOnboarding is true', () => {
    const { container } = render(<AppContent />);
    const note = screen.getByRole('link', { name: /set up team voices/i });
    expect(note).toBeInTheDocument();
    expect(screen.getByText(/your account supports up to 3 voices/i)).toBeInTheDocument();

    const html = container.innerHTML;
    const heroIndex = html.indexOf('data-testid="echo-hero"');
    const noteIndex = html.indexOf('Set up team voices');
    expect(heroIndex).toBeGreaterThan(-1);
    expect(noteIndex).toBeGreaterThan(heroIndex);
  });

  it('does NOT render the Teams note when previously dismissed', () => {
    localStorage.setItem('echome_teams_onboarding_dismissed', new Date().toISOString());
    render(<AppContent />);
    expect(screen.queryByRole('link', { name: /set up team voices/i })).toBeNull();
  });
});
