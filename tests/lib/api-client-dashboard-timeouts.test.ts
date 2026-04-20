/**
 * API Client Dashboard Timeout Tests
 * 
 * Tests to ensure proper timeout configurations for dashboard-related operations
 * to prevent 10-second timeout errors on the main dashboard.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113719777
 */

import axios from 'axios';
import { api } from '@/lib/api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client Dashboard Timeout Configurations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios create to return our mocked instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Mock successful responses by default
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  describe('Authentication Operations', () => {
    test('auth.getCurrentUser should use PROFILE_TIMEOUT (30s)', async () => {
      await api.auth.getCurrentUser();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/auth/me',
        expect.objectContaining({
          timeout: 30000, // PROFILE_TIMEOUT
        })
      );
    });

    test('auth.getProfile should use PROFILE_TIMEOUT (30s)', async () => {
      await api.auth.getProfile();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/auth/profile/extended',
        expect.objectContaining({
          timeout: 30000, // PROFILE_TIMEOUT
        })
      );
    });

    test('should not use old 10-second timeout for auth operations', async () => {
      const authOperations = [
        () => api.auth.getCurrentUser(),
        () => api.auth.getProfile(),
      ];

      for (const operation of authOperations) {
        mockedAxios.get.mockClear();
        await operation();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[1];
        
        expect(config.timeout).not.toBe(10000);
        expect(config.timeout).toBe(30000);
      }
    });
  });

  describe('Stripe/Billing Operations', () => {
    test('stripe.getSubscription should use STRIPE_TIMEOUT (45s)', async () => {
      await api.stripe.getSubscription();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/stripe/subscription',
        expect.objectContaining({
          timeout: 45000, // STRIPE_TIMEOUT
        })
      );
    });

    test('stripe.getSubscription with justPaid should use STRIPE_TIMEOUT', async () => {
      await api.stripe.getSubscription(true);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/stripe/subscription?just_paid=true',
        expect.objectContaining({
          timeout: 45000, // STRIPE_TIMEOUT
        })
      );
    });

    test('stripe.getUsageLimits should use STRIPE_TIMEOUT (45s)', async () => {
      await api.stripe.getUsageLimits();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/stripe/usage',
        expect.objectContaining({
          timeout: 45000, // STRIPE_TIMEOUT
        })
      );
    });

    test('should handle Stripe timeout parameters correctly', async () => {
      // Test without justPaid
      await api.stripe.getSubscription();
      expect(mockedAxios.get).toHaveBeenLastCalledWith(
        '/stripe/subscription',
        expect.objectContaining({ timeout: 45000 })
      );

      // Test with justPaid=false
      await api.stripe.getSubscription(false);
      expect(mockedAxios.get).toHaveBeenLastCalledWith(
        '/stripe/subscription',
        expect.objectContaining({ timeout: 45000 })
      );

      // Test with justPaid=true
      await api.stripe.getSubscription(true);
      expect(mockedAxios.get).toHaveBeenLastCalledWith(
        '/stripe/subscription?just_paid=true',
        expect.objectContaining({ timeout: 45000 })
      );
    });
  });

  describe('Generation/Content Operations', () => {
    test('generation.listRequests should use DASHBOARD_TIMEOUT (25s)', async () => {
      await api.generation.listRequests({ limit: 3, offset: 0 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/generate',
        expect.objectContaining({
          params: { limit: 3, offset: 0 },
          timeout: 25000, // DASHBOARD_TIMEOUT
        })
      );
    });

    test('generation.getRequest should use CONTENT_KIT_TIMEOUT (60s)', async () => {
      await api.generation.getRequest('req-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/generate/req-123',
        expect.objectContaining({
          timeout: 60000, // CONTENT_KIT_TIMEOUT
        })
      );
    });
  });

  describe('Timeout Error Scenarios', () => {
    test('should handle PROFILE_TIMEOUT properly for auth operations', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mkRejectedValue(timeoutError);

      await expect(api.auth.getCurrentUser()).rejects.toThrow('timeout of 30000ms exceeded');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/auth/me',
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    test('should handle STRIPE_TIMEOUT properly for billing operations', async () => {
      const timeoutError = new Error('timeout of 45000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(api.stripe.getSubscription()).rejects.toThrow('timeout of 45000ms exceeded');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/stripe/subscription',
        expect.objectContaining({
          timeout: 45000,
        })
      );
    });

    test('should not hit the problematic 10-second timeout', async () => {
      const dashboardOperations = [
        () => api.auth.getCurrentUser(),
        () => api.auth.getProfile(),
        () => api.stripe.getSubscription(),
        () => api.stripe.getUsageLimits(),
        () => api.generation.listRequests({ limit: 3 }),
      ];

      for (const operation of dashboardOperations) {
        mockedAxios.get.mockClear();
        await operation();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[callArgs.length - 1]; // Config is the last parameter
        
        expect(config).toHaveProperty('timeout');
        expect(config.timeout).toBeGreaterThan(10000); // Must be > problematic 10s timeout
        expect(config.timeout).not.toBe(10000); // Must not be exactly 10s
      }
    });
  });

  describe('Timeout Hierarchy and Consistency', () => {
    test('should use appropriate timeout for different operation types', async () => {
      const operationTimeouts = [
        // Profile operations (should be quick ~30s)
        { operation: () => api.auth.getCurrentUser(), expectedTimeout: 30000, type: 'profile' },
        { operation: () => api.auth.getProfile(), expectedTimeout: 30000, type: 'profile' },
        
        // Dashboard operations (should be reasonable ~25s)
        { operation: () => api.generation.listRequests({ limit: 3 }), expectedTimeout: 25000, type: 'dashboard' },
        
        // Stripe operations (can be slower due to external API ~45s)
        { operation: () => api.stripe.getSubscription(), expectedTimeout: 45000, type: 'stripe' },
        { operation: () => api.stripe.getUsageLimits(), expectedTimeout: 45000, type: 'stripe' },
        
        // Content loading operations (can be complex ~60s)
        { operation: () => api.generation.getRequest('req-123'), expectedTimeout: 60000, type: 'content' },
      ];

      for (const { operation, expectedTimeout, type } of operationTimeouts) {
        mockedAxios.get.mockClear();
        await operation();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[callArgs.length - 1];
        
        expect(config).toHaveProperty('timeout', expectedTimeout);
      }
    });

    test('should have reasonable timeout progression', async () => {
      // Dashboard operations should be faster than content operations
      await api.generation.listRequests({ limit: 3 });
      const dashboardCall = mockedAxios.get.mock.calls[0];
      const dashboardTimeout = dashboardCall[1].timeout;

      mockedAxios.get.mockClear();
      await api.generation.getRequest('req-123');
      const contentCall = mockedAxios.get.mock.calls[0];
      const contentTimeout = contentCall[1].timeout;

      expect(dashboardTimeout).toBeLessThan(contentTimeout);

      // Profile operations should be reasonable for auth
      mockedAxios.get.mockClear();
      await api.auth.getCurrentUser();
      const profileCall = mockedAxios.get.mock.calls[0];
      const profileTimeout = profileCall[1].timeout;

      expect(profileTimeout).toBeGreaterThan(15000); // Longer than default
      expect(profileTimeout).toBeLessThan(60000); // But not too long for auth
    });

    test('should never use default axios timeout (15s) for critical operations', async () => {
      // All dashboard-critical operations should specify explicit timeouts
      const criticalOperations = [
        () => api.auth.getCurrentUser(),
        () => api.auth.getProfile(),
        () => api.stripe.getSubscription(),
        () => api.stripe.getUsageLimits(),
        () => api.generation.listRequests({ limit: 3 }),
        () => api.generation.getRequest('req-123'),
      ];

      for (const operation of criticalOperations) {
        mockedAxios.get.mockClear();
        await operation();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[callArgs.length - 1];
        
        expect(config).toHaveProperty('timeout');
        expect(config.timeout).not.toBe(15000); // Should not use default axios timeout
        expect(config.timeout).toBeGreaterThan(0);
      }
    });
  });

  describe('Dashboard Load Performance', () => {
    test('should handle concurrent dashboard API calls efficiently', async () => {
      // Simulate dashboard loading multiple APIs at once
      const dashboardCalls = [
        api.auth.getCurrentUser(),
        api.stripe.getSubscription(),
        api.stripe.getUsageLimits(),
        api.generation.listRequests({ limit: 3 }),
      ];

      await Promise.all(dashboardCalls);

      // Should have made 4 API calls
      expect(mockedAxios.get).toHaveBeenCalledTimes(4);

      // All should have appropriate timeouts
      mockedAxios.get.mock.calls.forEach(call => {
        const config = call[call.length - 1];
        expect(config.timeout).toBeGreaterThan(10000);
        expect(config.timeout).toBeLessThan(300000); // Max 5 minutes
      });
    });

    test('should provide reasonable timeouts for dashboard user experience', async () => {
      // Dashboard should not make users wait too long
      const userFacingOperations = [
        { operation: () => api.auth.getCurrentUser(), maxReasonableTimeout: 45000 },
        { operation: () => api.stripe.getSubscription(), maxReasonableTimeout: 60000 },
        { operation: () => api.generation.listRequests({ limit: 3 }), maxReasonableTimeout: 45000 },
      ];

      for (const { operation, maxReasonableTimeout } of userFacingOperations) {
        mockedAxios.get.mockClear();
        await operation();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[callArgs.length - 1];
        
        expect(config.timeout).toBeLessThanOrEqual(maxReasonableTimeout);
        expect(config.timeout).toBeGreaterThanOrEqual(20000); // At least 20 seconds
      }
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    test('should provide consistent error handling across dashboard APIs', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      const dashboardAPIs = [
        () => api.auth.getCurrentUser(),
        () => api.stripe.getSubscription(),
        () => api.generation.listRequests({ limit: 3 }),
      ];

      for (const apiCall of dashboardAPIs) {
        mockedAxios.get.mockRejectedValueOnce(timeoutError);
        
        await expect(apiCall()).rejects.toHaveProperty('code', 'ECONNABORTED');
      }
    });

    test('should handle mixed success/timeout scenarios', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // Some APIs succeed
      mockedAxios.get
        .mockResolvedValueOnce({ data: { success: true, data: { user: 'test' } } })
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({ data: { success: true, data: { subscription: 'test' } } });

      const results = await Promise.allSettled([
        api.auth.getCurrentUser(),
        api.stripe.getUsageLimits(), // This will timeout
        api.stripe.getSubscription(),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });
});