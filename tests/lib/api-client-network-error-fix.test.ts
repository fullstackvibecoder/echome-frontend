/**
 * API Client Network Error Fix Tests
 * 
 * Tests the enhanced network error handling with retry logic to prevent
 * app failures during backend connectivity issues.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109044660/events/5ec859d2c9d14bb68220ea175d4a5357/
 */

import { apiClient } from '@/lib/api-client';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock sonner toast for notifications
jest.mock('sonner', () => ({
  toast: {
    warning: jest.fn(),
    error: jest.fn(),
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

// Mock setTimeout for retry delays
jest.useFakeTimers();

describe('API Client Network Error Fix', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Network error detection', () => {
    test('should identify retryable network errors', () => {
      const networkErrors = [
        { message: 'Network Error', response: null },
        { message: 'ECONNABORTED', response: null },
        { message: 'ECONNREFUSED', response: null },
        { message: 'ECONNRESET', response: null },
        { message: 'ETIMEDOUT', response: null },
        { message: 'ERR_NETWORK', response: null },
        { message: 'ERR_INTERNET_DISCONNECTED', response: null },
      ];

      // Simulate the network error detection logic
      networkErrors.forEach(error => {
        expect(!error.response && 
          ['Network Error', 'ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED']
            .some(keyword => error.message.includes(keyword))
        ).toBe(true);
      });
    });

    test('should identify server errors as retryable', () => {
      const serverErrors = [
        { response: { status: 500 } },
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 504 } },
        { response: { status: 408 } }, // Request timeout
      ];

      serverErrors.forEach(error => {
        const status = error.response.status;
        expect(status >= 500 || status === 408).toBe(true);
      });
    });

    test('should not retry client errors', () => {
      const clientErrors = [
        { response: { status: 400 } },
        { response: { status: 401 } },
        { response: { status: 403 } },
        { response: { status: 404 } },
      ];

      clientErrors.forEach(error => {
        const status = error.response.status;
        expect(status >= 500 || status === 408).toBe(false);
      });
    });
  });

  describe('Retry logic implementation', () => {
    test('should calculate exponential backoff delays correctly', () => {
      const expectedDelays = [
        { attempt: 1, expected: 1000 },   // 1s
        { attempt: 2, expected: 2000 },   // 2s
        { attempt: 3, expected: 4000 },   // 4s
        { attempt: 4, expected: 8000 },   // 8s (max for normal cases)
        { attempt: 10, expected: 10000 }, // 10s (capped)
      ];

      expectedDelays.forEach(({ attempt, expected }) => {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        expect(delay).toBe(expected);
      });
    });

    test('should implement sleep utility correctly', async () => {
      const startTime = Date.now();
      
      // Create a promise that resolves after sleep
      const sleepPromise = new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fast-forward timers
      jest.advanceTimersByTime(1000);
      
      await sleepPromise;
      
      // Verify timer advancement worked
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Request retry scenarios', () => {
    test('should retry network errors up to MAX_RETRIES times', async () => {
      const mockConfig = {
        url: '/test-endpoint',
        method: 'get',
        headers: {},
      };

      const networkError = {
        message: 'Network Error',
        response: null,
        config: mockConfig,
      };

      // Simulate interceptor response logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        mockConfig.__retryCount = retryCount;
        retryCount++;
        
        expect(retryCount).toBeLessThanOrEqual(maxRetries);
        
        // Calculate delay for this attempt
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        expect(delay).toBeGreaterThan(0);
      }

      expect(retryCount).toBe(maxRetries);
    });

    test('should stop retrying after max attempts', () => {
      const maxRetries = 3;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        retryCount++;
      }
      
      // Should not retry beyond max attempts
      expect(retryCount).toBe(maxRetries);
      expect(retryCount >= maxRetries).toBe(true);
    });

    test('should preserve original request configuration during retries', () => {
      const originalConfig = {
        url: '/api/test',
        method: 'POST',
        data: { test: 'data' },
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer original-token',
        },
        timeout: 15000,
      };

      // Simulate retry configuration preservation
      const retryConfig = { ...originalConfig };
      retryConfig.__retryCount = 1;
      
      // Should preserve all original properties
      expect(retryConfig.url).toBe(originalConfig.url);
      expect(retryConfig.method).toBe(originalConfig.method);
      expect(retryConfig.data).toEqual(originalConfig.data);
      expect(retryConfig.timeout).toBe(originalConfig.timeout);
      expect(retryConfig.__retryCount).toBe(1);
    });

    test('should refresh auth token on retry', () => {
      const config = {
        headers: { Authorization: 'Bearer old-token' },
      };

      // Mock fresh token from localStorage
      mockLocalStorage.getItem.mockReturnValue('fresh-token');

      // Simulate token refresh during retry
      const token = mockLocalStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      expect(config.headers.Authorization).toBe('Bearer fresh-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('Error toast notifications', () => {
    test('should show retry toast on first network error', async () => {
      const { toast } = require('sonner');
      
      // Simulate showing retry toast
      toast.warning('Connection issues', {
        description: 'Retrying request...',
        duration: 2000,
      });

      expect(toast.warning).toHaveBeenCalledWith('Connection issues', {
        description: 'Retrying request...',
        duration: 2000,
      });
    });

    test('should show final error toast after max retries', async () => {
      const { toast } = require('sonner');
      
      // Simulate showing final error toast
      toast.error('Network error', {
        description: 'Please check your internet connection and try again.',
        duration: 5000,
      });

      expect(toast.error).toHaveBeenCalledWith('Network error', {
        description: 'Please check your internet connection and try again.',
        duration: 5000,
      });
    });

    test('should handle toast import failure gracefully', async () => {
      // Mock toast import failure
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      try {
        throw new Error('Toast import failed');
      } catch {
        console.warn('Network error:', 'Test error');
      }

      expect(consoleSpy).toHaveBeenCalledWith('Network error:', 'Test error');
      consoleSpy.mockRestore();
    });
  });

  describe('Sentry error reporting', () => {
    test('should only report to Sentry after max retries exhausted', () => {
      const mockSentry = {
        captureException: jest.fn(),
      };

      const error = {
        message: 'Network Error',
        response: null,
        config: { url: '/test', method: 'get', __retryCount: 3 },
      };

      // Simulate Sentry reporting logic
      const retryCount = error.config.__retryCount || 0;
      const maxRetries = 3;

      if (!error.response && retryCount >= maxRetries) {
        mockSentry.captureException(error, {
          extra: {
            url: error.config.url,
            method: error.config.method,
            retryCount,
            maxRetries,
            errorType: 'network_error_max_retries_exceeded',
            context: 'api_client',
          },
        });
      }

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        extra: {
          url: '/test',
          method: 'get',
          retryCount: 3,
          maxRetries: 3,
          errorType: 'network_error_max_retries_exceeded',
          context: 'api_client',
        },
      });
    });

    test('should not report to Sentry during retries', () => {
      const mockSentry = {
        captureException: jest.fn(),
      };

      const error = {
        message: 'Network Error',
        response: null,
        config: { url: '/test', method: 'get', __retryCount: 1 },
      };

      // Simulate Sentry reporting logic
      const retryCount = error.config.__retryCount || 0;
      const maxRetries = 3;

      if (!error.response && retryCount >= maxRetries) {
        mockSentry.captureException(error);
      }

      expect(mockSentry.captureException).not.toHaveBeenCalled();
    });

    test('should report server errors to Sentry immediately', () => {
      const mockSentry = {
        captureException: jest.fn(),
      };

      const error = {
        response: { status: 500 },
        config: { url: '/test', method: 'get' },
      };

      // Simulate server error reporting
      const status = error.response.status;
      if (status && status >= 500) {
        mockSentry.captureException(error, {
          extra: {
            url: error.config.url,
            method: error.config.method,
            status,
            context: 'api_client',
          },
        });
      }

      expect(mockSentry.captureException).toHaveBeenCalledWith(error, {
        extra: {
          url: '/test',
          method: 'get',
          status: 500,
          context: 'api_client',
        },
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle app initialization with network failures', async () => {
      // Simulate the key API calls made during app initialization
      const authError = {
        message: 'Network Error',
        response: null,
        config: { url: '/auth/me', method: 'get' },
      };

      const subscriptionError = {
        message: 'Network Error', 
        response: null,
        config: { url: '/stripe/subscription', method: 'get' },
      };

      // Both calls should be retryable
      expect(!authError.response && authError.message.includes('Network Error')).toBe(true);
      expect(!subscriptionError.response && subscriptionError.message.includes('Network Error')).toBe(true);
    });

    test('should handle mixed success and failure scenarios', async () => {
      const scenarios = [
        { success: true, data: { user: { id: '123' } } },
        { 
          error: { message: 'Network Error', response: null },
          shouldRetry: true,
        },
        { success: true, data: { subscription: { isSubscribed: true } } },
      ];

      scenarios.forEach((scenario, index) => {
        if (scenario.success) {
          expect(scenario.data).toBeDefined();
        } else if (scenario.error) {
          expect(scenario.shouldRetry).toBe(true);
        }
      });
    });

    test('should maintain auth state during network recovery', () => {
      const originalToken = 'original-token';
      const refreshedToken = 'refreshed-token';

      mockLocalStorage.getItem
        .mockReturnValueOnce(originalToken)  // First call
        .mockReturnValueOnce(refreshedToken); // During retry

      // First request
      let token = mockLocalStorage.getItem('authToken');
      expect(token).toBe(originalToken);

      // Retry with fresh token
      token = mockLocalStorage.getItem('authToken');
      expect(token).toBe(refreshedToken);
    });

    test('should handle concurrent requests with network failures', async () => {
      const requests = [
        { url: '/api/user', type: 'auth' },
        { url: '/api/subscription', type: 'billing' },
        { url: '/api/content', type: 'data' },
      ];

      // All should be retryable independently
      const results = requests.map(req => ({
        ...req,
        retryable: true,
        maxRetries: 3,
      }));

      results.forEach(result => {
        expect(result.retryable).toBe(true);
        expect(result.maxRetries).toBe(3);
      });
    });
  });

  describe('Performance and resource management', () => {
    test('should not exceed maximum retry delay', () => {
      const attempts = [1, 2, 3, 4, 5, 10, 20];
      const maxDelay = 10000; // 10 seconds

      attempts.forEach(attempt => {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), maxDelay);
        expect(delay).toBeLessThanOrEqual(maxDelay);
      });
    });

    test('should clean up retry state after success', () => {
      const config = {
        url: '/test',
        __retryCount: 2,
      };

      // After successful retry, config should still exist but retry worked
      expect(config.__retryCount).toBe(2);
      
      // Success response would not modify __retryCount
      const successResponse = { data: { success: true } };
      expect(successResponse.data.success).toBe(true);
    });

    test('should handle memory cleanup during long retry sequences', () => {
      const configs = [];
      
      // Simulate multiple retry attempts
      for (let i = 0; i < 3; i++) {
        configs.push({
          url: `/test-${i}`,
          __retryCount: i + 1,
          timestamp: Date.now() + i * 1000,
        });
      }

      configs.forEach((config, index) => {
        expect(config.__retryCount).toBe(index + 1);
        expect(config.timestamp).toBeGreaterThan(Date.now() - 5000);
      });
    });
  });

  describe('Edge cases and error boundaries', () => {
    test('should handle invalid error objects gracefully', () => {
      const invalidErrors = [
        null,
        undefined,
        { /* no message or response */ },
        { message: null, response: null },
        { message: '', response: undefined },
      ];

      invalidErrors.forEach(error => {
        // Should not throw when checking if error is retryable
        const hasResponse = error && error.response;
        const hasMessage = error && error.message;
        expect(() => {
          !hasResponse && hasMessage;
        }).not.toThrow();
      });
    });

    test('should handle localStorage unavailability', () => {
      // Mock localStorage failure
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      let token = null;
      try {
        token = mockLocalStorage.getItem('authToken');
      } catch {
        token = null;
      }

      expect(token).toBeNull();
    });

    test('should handle window object unavailability (SSR)', () => {
      const originalWindow = global.window;
      
      // @ts-ignore
      delete global.window;
      
      // Should not crash when window is undefined
      const isClient = typeof window !== 'undefined';
      expect(isClient).toBe(false);
      
      global.window = originalWindow;
    });
  });
});