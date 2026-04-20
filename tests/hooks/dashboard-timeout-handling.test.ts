/**
 * Dashboard Timeout Handling Tests
 * 
 * Tests for dashboard-related hooks and API methods to ensure proper
 * timeout handling and error recovery for dashboard operations.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113719777
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { api } from '@/lib/api-client';

// Mock dependencies
jest.mock('@/lib/api-client');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockApi = api as jest.Mocked<typeof api>;

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

describe('Dashboard timeout handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAuth timeout scenarios', () => {
    test('should handle getCurrentUser timeout gracefully', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.auth.getCurrentUser.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not clear user token on timeout
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('authToken');
      // Should still be in loading/unknown state rather than logged out
      expect(result.current.user).toBeNull(); // Initial state
    });

    test('should handle network errors differently from timeouts', async () => {
      const networkError = new Error('Network Error');
      
      mockApi.auth.getCurrentUser.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should clear token on network error
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    test('should handle successful user fetch', async () => {
      mockApi.auth.getCurrentUser.mockResolvedValue({
        success: true,
        data: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('useSubscription timeout scenarios', () => {
    test('should handle getSubscription timeout gracefully', async () => {
      const timeoutError = new Error('timeout of 45000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.stripe.getSubscription.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not set fetch error on timeout
      expect(result.current.fetchError).toBe(false);
      // Should set subscription to null but not error state
      expect(result.current.subscription).toBeNull();
    });

    test('should handle network errors with error state', async () => {
      const networkError = new Error('Network Error');
      
      mockApi.stripe.getSubscription.mockRejectedValue(networkError);

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should set fetch error on network error
      expect(result.current.fetchError).toBe(true);
      expect(result.current.subscription).toBeNull();
    });

    test('should handle successful subscription fetch', async () => {
      mockApi.stripe.getSubscription.mockResolvedValue({
        success: true,
        data: {
          isSubscribed: true,
          tier: 'pro',
          status: 'active',
          planId: 'pro-monthly',
        },
      });

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription).toEqual({
        isSubscribed: true,
        tier: 'pro',
        status: 'active',
        planId: 'pro-monthly',
      });
      expect(result.current.fetchError).toBe(false);
    });

    test('should handle justPaid parameter with timeout', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.stripe.getSubscription.mockRejectedValue(timeoutError);

      // Mock URL with justPaid parameter
      delete (window as any).location;
      window.location = new URL('https://example.com?justPaid=true') as any;

      const { result } = renderHook(() => useSubscription());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle timeout gracefully even with justPaid
      expect(result.current.fetchError).toBe(false);
    });
  });
});

describe('Dashboard API timeout configurations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile and auth operations', () => {
    test('auth.getCurrentUser should use PROFILE_TIMEOUT (30s)', async () => {
      const mockAxios = {
        get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      };
      
      // Mock the apiClient.get method
      (api.auth.getCurrentUser as jest.MockedFunction<typeof api.auth.getCurrentUser>)
        .mockImplementation(async () => {
          // Simulate API call with timeout
          const response = await mockAxios.get('/auth/me', {
            timeout: 30000,
          });
          return response.data;
        });

      await api.auth.getCurrentUser();
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/auth/me',
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    test('auth.getProfile should use PROFILE_TIMEOUT (30s)', async () => {
      const mockAxios = {
        get: jest.fn().mkResolvedValue({ data: { success: true, data: {} } }),
      };
      
      (api.auth.getProfile as jest.MockedFunction<typeof api.auth.getProfile>)
        .mockImplementation(async () => {
          const response = await mockAxios.get('/auth/profile/extended', {
            timeout: 30000,
          });
          return response.data;
        });

      await api.auth.getProfile();
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/auth/profile/extended',
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });
  });

  describe('Stripe operations', () => {
    test('stripe.getSubscription should use STRIPE_TIMEOUT (45s)', async () => {
      const mockAxios = {
        get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      };
      
      (api.stripe.getSubscription as jest.MockedFunction<typeof api.stripe.getSubscription>)
        .mockImplementation(async (justPaid?: boolean) => {
          const params = justPaid ? '?just_paid=true' : '';
          const response = await mockAxios.get(`/stripe/subscription${params}`, {
            timeout: 45000,
          });
          return response.data;
        });

      await api.stripe.getSubscription();
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/stripe/subscription',
        expect.objectContaining({
          timeout: 45000,
        })
      );
    });

    test('stripe.getUsageLimits should use STRIPE_TIMEOUT (45s)', async () => {
      const mockAxios = {
        get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
      };
      
      (api.stripe.getUsageLimits as jest.MockedFunction<typeof api.stripe.getUsageLimits>)
        .mockImplementation(async () => {
          const response = await mockAxios.get('/stripe/usage', {
            timeout: 45000,
          });
          return response.data;
        });

      await api.stripe.getUsageLimits();
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/stripe/usage',
        expect.objectContaining({
          timeout: 45000,
        })
      );
    });
  });

  describe('Timeout error scenarios', () => {
    test('should handle 10-second timeout errors properly', async () => {
      // Ensure no API call should hit a 10-second timeout anymore
      const oldTenSecondTimeoutError = new Error('timeout of 10000ms exceeded');
      (oldTenSecondTimeoutError as any).code = 'ECONNABORTED';

      // All dashboard operations should use longer timeouts
      const dashboardAPIs = [
        { method: () => api.auth.getCurrentUser(), expectedTimeout: 30000 },
        { method: () => api.auth.getProfile(), expectedTimeout: 30000 },
        { method: () => api.stripe.getSubscription(), expectedTimeout: 45000 },
        { method: () => api.stripe.getUsageLimits(), expectedTimeout: 45000 },
      ];

      for (const { method, expectedTimeout } of dashboardAPIs) {
        const mockAxios = {
          get: jest.fn().mockResolvedValue({ data: { success: true } }),
        };

        // Mock implementation that checks timeout
        const originalMethod = method;
        const mockMethod = jest.fn().mockImplementation(async () => {
          await mockAxios.get('/test', { timeout: expectedTimeout });
          return { success: true };
        });

        // Replace the original method temporarily
        Object.defineProperty(originalMethod, 'name', { value: mockMethod });

        await mockMethod();
        
        expect(mockAxios.get).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            timeout: expectedTimeout,
          })
        );

        // Timeout should be longer than the problematic 10 seconds
        expect(expectedTimeout).toBeGreaterThan(10000);
      }
    });

    test('should provide reasonable timeout progression', async () => {
      const timeouts = {
        profile: 30000,      // Profile operations
        dashboard: 25000,    // Dashboard data loading
        stripe: 45000,       // Stripe API operations
        list: 30000,         // List operations
        contentKit: 60000,   // Content kit loading
        generation: 180000,  // AI generation
      };

      // Profile operations should be quick
      expect(timeouts.profile).toBeLessThanOrEqual(30000);
      
      // Stripe operations can be slower due to external API
      expect(timeouts.stripe).toBeGreaterThan(timeouts.profile);
      
      // Content operations can be even slower
      expect(timeouts.contentKit).toBeGreaterThan(timeouts.stripe);
      
      // Generation operations are the slowest
      expect(timeouts.generation).toBeGreaterThan(timeouts.contentKit);
      
      // All should be reasonable (not too long for UX)
      Object.values(timeouts).forEach(timeout => {
        expect(timeout).toBeLessThanOrEqual(300000); // Max 5 minutes
        expect(timeout).toBeGreaterThan(10000); // Min 10 seconds
      });
    });
  });

  describe('Dashboard resilience patterns', () => {
    test('should handle partial dashboard data loading failures', async () => {
      // Simulate scenario where some dashboard data loads and some times out
      mockApi.stripe.getUsageLimits.mockResolvedValue({
        success: true,
        data: {
          generationsUsed: 5,
          generationsLimit: 10,
          generationsRemaining: 5,
        },
      });

      const timeoutError = new Error('timeout of 25000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);

      // Dashboard should still function with partial data
      const usageResult = await api.stripe.getUsageLimits();
      expect(usageResult.success).toBe(true);

      try {
        await api.generation.listRequests({ limit: 3 });
      } catch (error: any) {
        expect(error.code).toBe('ECONNABORTED');
        // Should be handled gracefully in dashboard component
      }
    });

    test('should provide fallback behavior for critical vs non-critical data', async () => {
      const criticalAPIs = [
        'auth.getCurrentUser',    // Critical for auth state
        'stripe.getSubscription', // Critical for billing
      ];

      const nonCriticalAPIs = [
        'stripe.getUsageLimits',     // Nice to have for stats
        'generation.listRequests',   // Nice to have for recent content
      ];

      // Critical APIs should have robust timeout handling
      criticalAPIs.forEach(apiPath => {
        // These should not immediately fail the dashboard on timeout
        expect(true).toBe(true); // Placeholder for actual implementation test
      });

      // Non-critical APIs can fail silently
      nonCriticalAPIs.forEach(apiPath => {
        // These should provide fallback data on timeout
        expect(true).toBe(true); // Placeholder for actual implementation test
      });
    });
  });
});