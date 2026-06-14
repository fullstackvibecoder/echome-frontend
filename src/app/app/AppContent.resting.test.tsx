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

// Mock legacy components so we can assert on their absence
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

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com', full_name: 'Test User' },
  }),
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
    stripe: { getUsageLimits: vi.fn().mockResolvedValue({ success: false }) },
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

// Mock WelcomeBanner
vi.mock('@/components/welcome-banner', () => ({
  WelcomeBanner: () => <div data-testid="welcome-banner" />,
}));

import AppContent from './AppContent';

describe('AppContent resting state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders EchoHero in the resting branch', () => {
    render(<AppContent />);
    expect(screen.getByTestId('echo-hero')).toBeTruthy();
  });

  it('keeps GenerationForm mounted (hidden engine stays in the tree)', () => {
    render(<AppContent />);
    expect(screen.getByTestId('generation-form')).toBeTruthy();
  });

  it('wraps GenerationForm in a hidden container with aria-hidden', () => {
    const { container } = render(<AppContent />);
    // The wrapper div must have aria-hidden and class "hidden"
    const hiddenWrapper = container.querySelector('[aria-hidden]');
    expect(hiddenWrapper).toBeTruthy();
    expect(hiddenWrapper?.classList.contains('hidden')).toBe(true);
    // GenerationForm must be inside that wrapper
    const formInsideWrapper = hiddenWrapper?.querySelector('[data-testid="generation-form"]');
    expect(formInsideWrapper).toBeTruthy();
  });

  it('does NOT render GetStartedChecklist', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-checklist')).toBeNull();
  });

  it('does NOT render AdaptiveCreateSurface', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-adaptive')).toBeNull();
  });

  it('does NOT render DraftedForYou', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-drafted')).toBeNull();
  });

  it('does NOT render OutcomeChips', () => {
    render(<AppContent />);
    expect(screen.queryByTestId('legacy-outcome')).toBeNull();
  });
});
