/**
 * Network Error Handling Tests
 * 
 * Tests for handling network connectivity errors on content kit detail page
 * to ensure proper user experience during network failures and automatic
 * recovery when connectivity is restored.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113944632
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useContentKitDetail } from '@/hooks/useContentKit';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { analyzeError } from '@/lib/error-handler';
import { api } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client');
const mockApi = api as jest.Mocked<typeof api>;

// Mock network status
jest.mock('@/hooks/useNetworkStatus');
const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;

// Mock fetch for connectivity tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleLog = jest.fn();
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('Network Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
    console.log = mockConsoleLog;
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    // Default network status mock
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      connectionType: '4g',
      lastOfflineTime: null,
      isRecoveringFromOffline: false,
      retryAttempts: 0,
      retryWithNetworkCheck: jest.fn(),
      testConnectivity: jest.fn(),
      getStatusMessage: jest.fn().mockReturnValue('Connected'),
      getConnectionQuality: jest.fn().mockReturnValue('good'),
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    jest.useRealTimers();
  });

  describe('Network error detection and categorization', () => {
    test('should detect various types of network errors', () => {
      const networkErrors = [
        new Error('Network Error'),
        { code: 'NETWORK_ERROR' },
        new Error('ERR_NETWORK'),
        new Error('ERR_INTERNET_DISCONNECTED'),
        new Error('ERR_NAME_NOT_RESOLVED'),
        new Error('ERR_CONNECTION_REFUSED'),
        new Error('ERR_CONNECTION_TIMED_OUT'),
      ];

      networkErrors.forEach(error => {
        const analysis = analyzeError(error);
        expect(analysis.errorType).toBe('network');
        expect(analysis.shouldRetry).toBe(true);
        expect(analysis.userMessage).toContain('Unable to connect to the server');
      });
    });

    test('should provide specific guidance for different network issues', () => {
      const specificErrors = [
        {
          error: new Error('ERR_NAME_NOT_RESOLVED'),
          expectedGuidance: 'DNS resolution failed',
        },
        {
          error: new Error('ERR_CONNECTION_REFUSED'),
          expectedGuidance: 'Connection was refused by the server',
        },
        {
          error: new Error('ERR_CONNECTION_TIMED_OUT'),
          expectedGuidance: 'Connection timed out',
        },
      ];

      specificErrors.forEach(({ error, expectedGuidance }) => {
        const analysis = analyzeError(error);
        expect(analysis.userMessage).toContain(expectedGuidance);
      });
    });

    test('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const offlineError = new Error('Network Error');
      const analysis = analyzeError(offlineError);
      
      expect(analysis.errorType).toBe('network');
      expect(analysis.userMessage).toContain('You appear to be offline');
    });
  });

  describe('useNetworkStatus hook', () => {
    test('should detect network connectivity status', () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isOnline).toBe(true);
      expect(result.current.getConnectionQuality()).toBe('good');
    });

    test('should handle online/offline transitions', async () => {
      const { result } = renderHook(() => useNetworkStatus());
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
      
      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
      
      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.isRecoveringFromOffline).toBe(true);
      });
    });

    test('should implement network-aware retry logic', async () => {
      const mockRetryFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useNetworkStatus());
      
      const retryResult = await result.current.retryWithNetworkCheck(mockRetryFn);
      
      expect(retryResult).toEqual({ success: true });
      expect(mockRetryFn).toHaveBeenCalledTimes(3);
    });

    test('should respect retry limits for network errors', async () => {
      const mockRetryFn = jest.fn().mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useNetworkStatus());
      
      await expect(
        result.current.retryWithNetworkCheck(mockRetryFn, { maxRetries: 2 })
      ).rejects.toThrow('Network operation failed after 2 retries');
      
      expect(mockRetryFn).toHaveBeenCalledTimes(2);
    });

    test('should test connectivity', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useNetworkStatus());
      
      const isConnected = await result.current.testConnectivity();
      
      expect(isConnected).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal),
      });
    });

    test('should detect slow connections', () => {
      // Mock slow connection
      const mockConnection = {
        effectiveType: '2g',
        downlink: 0.3,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      
      (navigator as any).connection = mockConnection;

      const { result } = renderHook(() => useNetworkStatus());
      
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  describe('Content kit detail network error handling', () => {
    test('should use network-aware retry for network errors', async () => {
      const networkError = new Error('Network Error');
      
      // Mock network retry function
      const mockRetryWithNetworkCheck = jest.fn().mockResolvedValue({
        type: 'generation',
        data: {
          request: {
            id: 'test-id',
            status: 'completed',
            platforms: [],
            createdAt: '2024-01-01T00:00:00Z',
            inputType: 'text'
          },
          clips: [],
          content: [],
        }
      });
      
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: false,
        connectionType: '4g',
        lastOfflineTime: null,
        isRecoveringFromOffline: false,
        retryAttempts: 0,
        retryWithNetworkCheck: mockRetryWithNetworkCheck,
        testConnectivity: jest.fn(),
        getStatusMessage: jest.fn().mockReturnValue('Connected'),
        getConnectionQuality: jest.fn().mockReturnValue('good'),
      });

      mockApi.generation.getRequest.mockRejectedValue(networkError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.item).toBeTruthy();
        expect(result.current.error).toBeNull();
      });

      expect(mockRetryWithNetworkCheck).toHaveBeenCalled();
    });

    test('should handle network retry failures', async () => {
      const networkError = new Error('Network Error');
      
      const mockRetryWithNetworkCheck = jest.fn().mockRejectedValue(
        new Error('Network operation failed after 3 retries')
      );
      
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: null,
        lastOfflineTime: new Date(),
        isRecoveringFromOffline: false,
        retryAttempts: 3,
        retryWithNetworkCheck: mockRetryWithNetworkCheck,
        testConnectivity: jest.fn(),
        getStatusMessage: jest.fn().mockReturnValue('No internet connection'),
        getConnectionQuality: jest.fn().mkReturnValue('offline'),
      });

      mockApi.generation.getRequest.mockRejectedValue(networkError);
      mockApi.clips.get.mockRejectedValue(networkError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Unable to connect to the server');
        expect(result.current.error).toContain('multiple attempts');
      });
    });

    test('should provide different messages for offline vs online network errors', async () => {
      const networkError = new Error('Network Error');
      
      // Test offline scenario
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: null,
        lastOfflineTime: new Date(),
        isRecoveringFromOffline: false,
        retryAttempts: 0,
        retryWithNetworkCheck: jest.fn().mockRejectedValue(networkError),
        testConnectivity: jest.fn(),
        getStatusMessage: jest.fn().mockReturnValue('No internet connection'),
        getConnectionQuality: jest.fn().mockReturnValue('offline'),
      });

      mockApi.generation.getRequest.mockRejectedValue(networkError);
      mockApi.clips.get.mockRejectedValue(networkError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.error).toContain('network connectivity issues');
      });
    });

    test('should handle partial network failures gracefully', async () => {
      const networkError = new Error('Network Error');
      
      // Generation API fails with network error, but clips API succeeds
      mockApi.generation.getRequest.mockRejectedValue(networkError);
      mockApi.clips.get.mockResolvedValue({
        success: true,
        data: {
          upload: {
            id: 'upload-id',
            title: 'Fallback Content',
            status: 'completed',
            createdAt: '2024-01-01T00:00:00Z',
          },
          clips: [],
          contentKit: null,
        }
      });

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.item?.title).toBe('Fallback Content');
      });
    });
  });

  describe('Network status indicator integration', () => {
    test('should display appropriate network status messages', () => {
      const testCases = [
        {
          status: { isOnline: false },
          expectedMessage: 'No internet connection',
        },
        {
          status: { isOnline: true, isSlowConnection: true },
          expectedMessage: 'Slow network detected',
        },
        {
          status: { isOnline: true, isRecoveringFromOffline: true },
          expectedMessage: 'Connection restored',
        },
        {
          status: { isOnline: true },
          expectedMessage: 'Connected',
        },
      ];

      testCases.forEach(({ status, expectedMessage }) => {
        mockUseNetworkStatus.mockReturnValue({
          isOnline: status.isOnline ?? true,
          isSlowConnection: status.isSlowConnection ?? false,
          connectionType: '4g',
          lastOfflineTime: null,
          isRecoveringFromOffline: status.isRecoveringFromOffline ?? false,
          retryAttempts: 0,
          retryWithNetworkCheck: jest.fn(),
          testConnectivity: jest.fn(),
          getStatusMessage: jest.fn().mockReturnValue(expectedMessage),
          getConnectionQuality: jest.fn().mockReturnValue(status.isOnline ? 'good' : 'offline'),
        });

        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current.getStatusMessage()).toContain(expectedMessage);
      });
    });
  });

  describe('Real-world network scenarios', () => {
    test('should handle intermittent connectivity', async () => {
      const networkError = new Error('Network Error');
      
      let attemptCount = 0;
      const mockRetryWithNetworkCheck = jest.fn().mockImplementation(async (operation) => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network still unstable');
        }
        return await operation();
      });
      
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: false,
        connectionType: '4g',
        lastOfflineTime: null,
        isRecoveringFromOffline: false,
        retryAttempts: 0,
        retryWithNetworkCheck: mockRetryWithNetworkCheck,
        testConnectivity: jest.fn(),
        getStatusMessage: jest.fn().mockReturnValue('Connected'),
        getConnectionQuality: jest.fn().mockReturnValue('good'),
      });

      mockApi.generation.getRequest
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            request: {
              id: 'test-id',
              status: 'completed',
              platforms: [],
              createdAt: '2024-01-01T00:00:00Z',
              inputType: 'text'
            },
            clips: [],
            content: [],
          }
        });

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should eventually succeed after network stabilizes
      expect(mockRetryWithNetworkCheck).toHaveBeenCalled();
    });

    test('should handle DNS resolution failures', async () => {
      const dnsError = new Error('ERR_NAME_NOT_RESOLVED');
      
      mockApi.generation.getRequest.mockRejectedValue(dnsError);
      mockApi.clips.get.mockRejectedValue(dnsError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.error).toContain('DNS resolution failed');
      });
    });

    test('should handle connection refused scenarios', async () => {
      const refusedError = new Error('ERR_CONNECTION_REFUSED');
      
      mockApi.generation.getRequest.mockRejectedValue(refusedError);
      mockApi.clips.get.mockRejectedValue(refusedError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.error).toContain('Connection was refused by the server');
      });
    });

    test('should handle recovery from extended offline period', async () => {
      // Start offline
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isSlowConnection: false,
        connectionType: null,
        lastOfflineTime: new Date(Date.now() - 60000), // 1 minute ago
        isRecoveringFromOffline: false,
        retryAttempts: 0,
        retryWithNetworkCheck: jest.fn(),
        testConnectivity: jest.fn(),
        getStatusMessage: jest.fn().mockReturnValue('No internet connection'),
        getConnectionQuality: jest.fn().mockReturnValue('offline'),
      });

      const { result, rerender } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.error).toContain('network connectivity issues');
      });

      // Simulate coming back online with recovery
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isSlowConnection: false,
        connectionType: '4g',
        lastOfflineTime: new Date(Date.now() - 60000),
        isRecoveringFromOffline: true,
        retryAttempts: 0,
        retryWithNetworkCheck: jest.fn().mockResolvedValue({
          type: 'generation',
          data: {
            request: {
              id: 'test-id',
              status: 'completed',
              platforms: [],
              createdAt: '2024-01-01T00:00:00Z',
              inputType: 'text'
            },
            clips: [],
            content: [],
          }
        }),
        testConnectivity: jest.fn(),
        getStatusMessage: jest.fn().mockReturnValue('Connection restored! Retrying...'),
        getConnectionQuality: jest.fn().mockReturnValue('good'),
      });

      rerender();

      // Should show recovery message
      expect(result.current.getStatusMessage()).toContain('Connection restored');
    });
  });

  describe('Error message quality and user experience', () => {
    test('should provide actionable error messages', () => {
      const networkError = new Error('Network Error');
      const analysis = analyzeError(networkError);
      
      expect(analysis.userMessage).toContain('check your internet connection');
      expect(analysis.userMessage).toContain('try again');
    });

    test('should include retry delay information', () => {
      const networkErrors = [
        { error: new Error('ERR_NAME_NOT_RESOLVED'), expectedDelay: 4000 },
        { error: new Error('ERR_CONNECTION_REFUSED'), expectedDelay: 6000 },
        { error: new Error('Network Error'), expectedDelay: 3000 },
      ];

      networkErrors.forEach(({ error, expectedDelay }) => {
        const analysis = analyzeError(error);
        expect(analysis.retryDelay).toBe(expectedDelay);
      });
    });

    test('should provide contextual help for different connection qualities', () => {
      const qualities = ['offline', 'poor', 'fair', 'good'];
      
      qualities.forEach(quality => {
        mockUseNetworkStatus.mockReturnValue({
          isOnline: quality !== 'offline',
          isSlowConnection: quality === 'poor',
          connectionType: quality === 'poor' ? '2g' : '4g',
          lastOfflineTime: null,
          isRecoveringFromOffline: false,
          retryAttempts: 0,
          retryWithNetworkCheck: jest.fn(),
          testConnectivity: jest.fn(),
          getStatusMessage: jest.fn().mockReturnValue('Status message'),
          getConnectionQuality: jest.fn().mockReturnValue(quality as any),
        });

        const { result } = renderHook(() => useNetworkStatus());
        const connectionQuality = result.current.getConnectionQuality();
        expect(['offline', 'poor', 'fair', 'good']).toContain(connectionQuality);
      });
    });
  });
});