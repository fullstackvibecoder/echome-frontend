/**
 * AppContent Timeout Handling Tests
 * 
 * Tests for enhanced timeout handling in the main dashboard component
 * to prevent 15-second timeout errors from affecting user experience.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/112579240
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceContext } from '@/contexts/voice-context';
import { useSubscription } from '@/hooks/useSubscription';
import { api } from '@/lib/api-client';
import AppContent from '@/app/app/AppContent';

// Mock all the dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/voice-context');
jest.mock('@/hooks/useSubscription');
jest.mock('@/hooks/useFirstTimeUser');
jest.mock('@/hooks/useGeneration');
jest.mock('@/hooks/useResultsFeedback');
jest.mock('@/hooks/useGenerationProgress');
jest.mock('@/hooks/usePendingCheckout');
jest.mock('@/lib/api-client');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseVoiceContext = useVoiceContext as jest.MockedFunction<typeof useVoiceContext>;
const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;
const mockApi = api as jest.Mocked<typeof api>;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('AppContent Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
      loading: false,
    } as any);

    mockUseVoiceContext.mockReturnValue({
      activeVoice: null,
      isTeamsUser: false,
      voiceLimit: 3,
    } as any);

    mockUseSubscription.mockReturnValue({
      isFreeUser: true,
      canGenerate: true,
      freeGenerationsRemaining: 5,
    } as any);

    // Mock other hooks
    require('@/hooks/useFirstTimeUser').useFirstTimeUser = jest.fn(() => ({
      isFirstTime: false,
      dismissWelcome: jest.fn(),
    }));

    require('@/hooks/useGeneration').useGeneration = jest.fn(() => ({
      generating: false,
      requestId: null,
      results: null,
      error: null,
      isQuotaError: false,
      generate: jest.fn(),
      repurpose: jest.fn(),
      reset: jest.fn(),
    }));

    require('@/hooks/useResultsFeedback').useResultsFeedback = jest.fn(() => ({
      sendFeedback: jest.fn(),
      copyToClipboard: jest.fn(),
    }));

    require('@/hooks/useGenerationProgress').useGenerationProgress = jest.fn(() => ({
      progress: null,
      isComplete: false,
      hasError: false,
      carouselReady: false,
      carouselFailed: false,
    }));

    require('@/hooks/usePendingCheckout').usePendingCheckout = jest.fn(() => ({
      checking: false,
      checkoutLoading: false,
    }));
  });

  describe('Usage Stats Loading with Timeout Handling', () => {
    test('should handle successful usage stats loading', async () => {
      mockApi.stripe.getUsageLimits.mockResolvedValue({
        success: true,
        data: {
          generationsUsed: 2,
          generationsLimit: 10,
          generationsRemaining: 8,
          videoMinutesUsed: 5,
          videoMinutesLimit: 60,
          contentKitsCreated: 3,
          isUnlimited: false,
        },
      } as any);

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
      });

      // Should not show any error messages
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    test('should handle timeout errors gracefully for usage stats', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
      });

      // Should log timeout warning specifically
      expect(consoleSpy).toHaveBeenCalledWith(
        'Usage stats loading timed out - this is usually due to high server load and will resolve automatically'
      );

      // Should still render the dashboard without crashing
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should handle network errors differently from timeouts', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(networkError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
      });

      // Should log regular error for non-timeout issues
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load usage stats:',
        expect.objectContaining({
          code: 'ERR_NETWORK'
        })
      );

      consoleErrorSpy.mockRestore();
    });

    test('should provide fallback data when usage stats fail to load', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(timeoutError);

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
      });

      // Component should still render with fallback data
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });
  });

  describe('Recent Content Loading with Timeout Handling', () => {
    test('should handle successful recent content loading', async () => {
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'req-1',
            status: 'completed',
            inputText: 'Test content',
            platforms: ['instagram'],
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      } as any);

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.generation.listRequests).toHaveBeenCalledWith({ limit: 3, offset: 0 });
      });
    });

    test('should handle timeout errors gracefully for recent content', async () => {
      const timeoutError = new Error('timeout of 25000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.generation.listRequests).toHaveBeenCalled();
      });

      // Should log timeout warning specifically
      expect(consoleSpy).toHaveBeenCalledWith(
        'Recent content loading timed out - dashboard will still function normally'
      );

      // Should still render the dashboard
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should handle network errors for recent content loading', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';
      
      mockApi.generation.listRequests.mockRejectedValue(networkError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.generation.listRequests).toHaveBeenCalled();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load recent content:',
        expect.objectContaining({
          code: 'ERR_NETWORK'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should continue to function when both API calls timeout', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(timeoutError);
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
        expect(mockApi.generation.listRequests).toHaveBeenCalled();
      });

      // Should show appropriate warnings for both timeouts
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('timed out')
      );

      // Dashboard should still be functional
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should not crash the component on unexpected errors', async () => {
      const weirdError = { message: 'Something unexpected', strange: 'property' };
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(weirdError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
      });

      // Should handle unexpected error structure
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Component should still render
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    test('should handle loading states appropriately', async () => {
      // Make the API calls hang to simulate loading
      mockApi.stripe.getUsageLimits.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      
      mockApi.generation.listRequests.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AppContent />);

      // Should still render the dashboard structure while loading
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });
  });

  describe('Timeout Error Message Classification', () => {
    test('should identify ECONNABORTED as timeout error', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('timed out')
        );
      });

      consoleSpy.mockRestore();
    });

    test('should identify timeout message as timeout error', async () => {
      const timeoutError = new Error('timeout of 25000ms exceeded');
      // No code property
      
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('timed out')
        );
      });

      consoleSpy.mockRestore();
    });

    test('should not classify other errors as timeout errors', async () => {
      const otherError = new Error('Server returned 500');
      
      mockApi.stripe.getUsageLimits.mockRejectedValue(otherError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(<AppContent />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('timed out')
        );
      });

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});