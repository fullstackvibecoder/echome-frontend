/**
 * App Initialization Network Resilience Tests
 * 
 * Tests network error handling in critical hooks used during app initialization
 * to ensure the app remains functional even with backend connectivity issues.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109044660/events/5ec859d2c9d14bb68220ea175d4a5357/
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import api from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    auth: {
      getCurrentUser: jest.fn(),
    },
    stripe: {
      getSubscription: jest.fn(),
    },
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('App Initialization Network Resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
  });

  describe('useAuth hook network error handling', () => {
    test('should handle network errors gracefully during user fetch', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'AxiosError';
      
      mockApi.auth.getCurrentUser.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useAuth());

      // Should start loading
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle error gracefully - user should be null but app shouldn't crash
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    test('should retry user fetch on network error with exponential backoff', async () => {
      // Mock network error followed by success
      const networkError = new Error('Network Error');
      const successResponse = {
        success: true,
        data: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockApi.auth.getCurrentUser
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(successResponse);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 10000 });

      // Should eventually succeed after retries
      expect(result.current.user).toBeDefined();
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockApi.auth.getCurrentUser).toHaveBeenCalledTimes(3);
    });

    test('should clean up auth token on persistent network errors', async () => {
      const persistentError = new Error('Network Error');
      mockApi.auth.getCurrentUser.mockRejectedValue(persistentError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should remove invalid token after persistent failures
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(result.current.user).toBeNull();
    });

    test('should handle auth during network recovery scenarios', async () => {
      // Simulate network coming back online
      const networkError = new Error('Network Error');
      const userResponse = {
        success: true,
        data: {
          id: 'user-recovery',
          email: 'recovery@example.com',
          name: 'Recovery User',
        },
      };

      mockApi.auth.getCurrentUser
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(userResponse);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      expect(result.current.user?.id).toBe('user-recovery');
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should handle refreshUser with network failures', async () => {
      const initialUser = {
        success: true,
        data: { id: 'user-123', name: 'Test User' },
      };

      mockApi.auth.getCurrentUser.mockResolvedValueOnce(initialUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      });

      // Now simulate network error during refresh
      const networkError = new Error('Network Error');
      mockApi.auth.getCurrentUser.mockRejectedValueOnce(networkError);

      await result.current.refreshUser();

      // Should handle refresh failure gracefully
      expect(result.current.user).toBeDefined(); // Should keep existing user data
    });
  });

  describe('useSubscription hook network error handling', () => {
    test('should handle network errors during subscription fetch', async () => {
      const networkError = new Error('Network Error');
      mockApi.stripe.getSubscription.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle error gracefully
      expect(result.current.fetchError).toBe(true);
      expect(result.current.subscription).toBeNull();
    });

    test('should retry subscription fetch on network error', async () => {
      const networkError = new Error('Network Error');
      const subscriptionResponse = {
        success: true,
        data: {
          isSubscribed: true,
          tier: 'pro',
          trialDaysRemaining: 0,
          freeGenerationsUsed: 5,
          freeGenerationsLimit: 10,
        },
      };

      mockApi.stripe.getSubscription
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(subscriptionResponse);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.subscription).toBeDefined();
      }, { timeout: 10000 });

      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.tier).toBe('pro');
      expect(mockApi.stripe.getSubscription).toHaveBeenCalledTimes(2);
    });

    test('should handle network errors during refresh with justPaid flag', async () => {
      const initialResponse = {
        success: true,
        data: {
          isSubscribed: false,
          tier: 'free',
          freeGenerationsUsed: 10,
          freeGenerationsLimit: 10,
        },
      };

      mockApi.stripe.getSubscription.mockResolvedValueOnce(initialResponse);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.subscription).toBeDefined();
      });

      // Now test refresh with network error
      const networkError = new Error('Network Error');
      mockApi.stripe.getSubscription.mockRejectedValueOnce(networkError);

      await result.current.refresh(true);

      // Should handle refresh error gracefully
      expect(result.current.subscription).toBeDefined(); // Should keep existing data
    });

    test('should handle subscription polling during network instability', async () => {
      const networkError = new Error('Network Error');
      const paidResponse = {
        success: true,
        data: {
          isSubscribed: true,
          tier: 'pro',
          syncedFromStripe: true,
        },
      };

      // Mock polling behavior - fail first few attempts, then succeed
      mockApi.stripe.getSubscription
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(paidResponse);

      const { result } = renderHook(() => useSubscription());

      await result.current.refresh(true);

      await waitFor(() => {
        expect(result.current.isSubscribed).toBe(true);
      }, { timeout: 15000 });

      expect(result.current.tier).toBe('pro');
    });

    test('should gracefully handle quota checks during network errors', async () => {
      const networkError = new Error('Network Error');
      mockApi.stripe.getSubscription.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have safe defaults during network errors
      expect(result.current.canGenerate).toBe(false); // Safe default
      expect(result.current.isFreeUser).toBe(true);   // Safe default
      expect(result.current.freeGenerationsRemaining).toBe(0); // Safe default
    });
  });

  describe('Concurrent hook failures during app initialization', () => {
    test('should handle both auth and subscription failures simultaneously', async () => {
      const networkError = new Error('Network Error');
      
      mockApi.auth.getCurrentUser.mockRejectedValueOnce(networkError);
      mockApi.stripe.getSubscription.mockRejectedValueOnce(networkError);

      const { result: authResult } = renderHook(() => useAuth());
      const { result: subscriptionResult } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(authResult.current.loading).toBe(false);
        expect(subscriptionResult.current.loading).toBe(false);
      });

      // Both hooks should handle failures gracefully
      expect(authResult.current.user).toBeNull();
      expect(subscriptionResult.current.subscription).toBeNull();
      expect(subscriptionResult.current.fetchError).toBe(true);
    });

    test('should handle mixed success/failure scenarios', async () => {
      const networkError = new Error('Network Error');
      const userResponse = {
        success: true,
        data: { id: 'user-123', name: 'Test User' },
      };

      // Auth succeeds, subscription fails
      mockApi.auth.getCurrentUser.mockResolvedValueOnce(userResponse);
      mockApi.stripe.getSubscription.mockRejectedValueOnce(networkError);

      const { result: authResult } = renderHook(() => useAuth());
      const { result: subscriptionResult } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(authResult.current.loading).toBe(false);
        expect(subscriptionResult.current.loading).toBe(false);
      });

      // Auth should succeed, subscription should fail gracefully
      expect(authResult.current.user).toBeDefined();
      expect(authResult.current.isAuthenticated).toBe(true);
      expect(subscriptionResult.current.subscription).toBeNull();
      expect(subscriptionResult.current.fetchError).toBe(true);
    });

    test('should recover gracefully when network comes back online', async () => {
      const networkError = new Error('Network Error');
      const userResponse = {
        success: true,
        data: { id: 'user-recovery', name: 'Recovery User' },
      };
      const subscriptionResponse = {
        success: true,
        data: {
          isSubscribed: true,
          tier: 'pro',
        },
      };

      // Initial failures
      mockApi.auth.getCurrentUser.mockRejectedValueOnce(networkError);
      mockApi.stripe.getSubscription.mockRejectedValueOnce(networkError);

      // Recovery responses
      mockApi.auth.getCurrentUser.mockResolvedValueOnce(userResponse);
      mockApi.stripe.getSubscription.mockResolvedValueOnce(subscriptionResponse);

      const { result: authResult } = renderHook(() => useAuth());
      const { result: subscriptionResult } = renderHook(() => useSubscription());

      // Wait for initial failures
      await waitFor(() => {
        expect(authResult.current.loading).toBe(false);
        expect(subscriptionResult.current.loading).toBe(false);
      });

      // Manually trigger refresh (simulating user retry or automatic recovery)
      await Promise.all([
        authResult.current.refreshUser(),
        subscriptionResult.current.refresh(),
      ]);

      // Should recover successfully
      expect(authResult.current.user).toBeDefined();
      expect(subscriptionResult.current.subscription).toBeDefined();
      expect(subscriptionResult.current.isSubscribed).toBe(true);
    });
  });

  describe('Network error user experience', () => {
    test('should provide appropriate loading states during network retries', async () => {
      const networkError = new Error('Network Error');
      let resolveUserRequest: (value: any) => void;
      
      const userPromise = new Promise((resolve) => {
        resolveUserRequest = resolve;
      });

      mockApi.auth.getCurrentUser.mockReturnValueOnce(userPromise as any);

      const { result } = renderHook(() => useAuth());

      // Should show loading during network operation
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();

      // Resolve with user data
      resolveUserRequest!({
        success: true,
        data: { id: 'user-123', name: 'Test User' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeDefined();
    });

    test('should maintain app functionality even with persistent network issues', async () => {
      const persistentNetworkError = new Error('Network Error');
      
      mockApi.auth.getCurrentUser.mockRejectedValue(persistentNetworkError);
      mockApi.stripe.getSubscription.mockRejectedValue(persistentNetworkError);

      const { result: authResult } = renderHook(() => useAuth());
      const { result: subscriptionResult } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(authResult.current.loading).toBe(false);
        expect(subscriptionResult.current.loading).toBe(false);
      });

      // App should still be usable with degraded functionality
      expect(authResult.current.isAuthenticated).toBe(false);
      expect(subscriptionResult.current.canGenerate).toBe(false);
      expect(subscriptionResult.current.isFreeUser).toBe(true);

      // Core hook functions should still be callable
      expect(() => authResult.current.logout()).not.toThrow();
      expect(() => subscriptionResult.current.requireSubscription()).not.toThrow();
    });

    test('should handle rapid network state changes', async () => {
      const networkError = new Error('Network Error');
      const userResponse = {
        success: true,
        data: { id: 'user-rapid', name: 'Rapid User' },
      };

      // Simulate rapid network state changes
      mockApi.auth.getCurrentUser
        .mockRejectedValueOnce(networkError)       // Network down
        .mockResolvedValueOnce(userResponse)       // Network up
        .mockRejectedValueOnce(networkError)       // Network down again
        .mockResolvedValueOnce(userResponse);      // Network up again

      const { result } = renderHook(() => useAuth());

      // First attempt - network error
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Retry - should succeed
      await result.current.refreshUser();
      expect(result.current.user).toBeDefined();

      // Another retry with network error
      await result.current.refreshUser();
      // Should maintain existing user data during transient failures
      expect(result.current.user).toBeDefined();
    });
  });

  describe('Integration with retry mechanism', () => {
    test('should integrate properly with API client retry logic', async () => {
      // Mock multiple retry attempts
      const attempts = [
        new Error('Network Error'),
        new Error('Network Error'), 
        new Error('Network Error'),
        { success: true, data: { id: 'retry-user', name: 'Retry User' } },
      ];

      mockApi.auth.getCurrentUser
        .mockRejectedValueOnce(attempts[0])
        .mockRejectedValueOnce(attempts[1])
        .mockRejectedValueOnce(attempts[2])
        .mockResolvedValueOnce(attempts[3]);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toBeDefined();
      }, { timeout: 15000 });

      // Should eventually succeed after retries
      expect(result.current.user?.id).toBe('retry-user');
      expect(mockApi.auth.getCurrentUser).toHaveBeenCalledTimes(4);
    });

    test('should handle timeout errors with retry logic', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      const successResponse = {
        success: true,
        data: { isSubscribed: false, tier: 'free' },
      };

      mockApi.stripe.getSubscription
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(successResponse);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.subscription).toBeDefined();
      });

      expect(result.current.fetchError).toBe(false);
      expect(result.current.tier).toBe('free');
    });
  });
});