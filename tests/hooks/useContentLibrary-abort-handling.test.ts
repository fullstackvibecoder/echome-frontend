/**
 * useContentLibrary Abort Handling Tests
 * 
 * Tests the enhanced request cancellation and abort handling in the content library hook
 * to ensure proper cleanup and prevent "Request aborted" errors from showing to users.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/111231328
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { apiClient } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('useContentLibrary Abort Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset API client mock
    mockApiClient.get = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Request Cancellation on Component Unmount', () => {
    test('should cancel in-flight requests when component unmounts', async () => {
      const abortSpy = jest.fn();
      let resolveRequest: (value: any) => void;
      let rejectRequest: (error: any) => void;

      // Mock a long-running request that we can control
      mockApiClient.get.mockImplementation((url, config) => {
        // Spy on the abort signal
        if (config?.signal) {
          config.signal.addEventListener('abort', abortSpy);
        }
        
        return new Promise((resolve, reject) => {
          resolveRequest = resolve;
          rejectRequest = reject;
          
          // Simulate request being cancelled
          config?.signal?.addEventListener('abort', () => {
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        });
      });

      const { unmount } = renderHook(() => useContentLibrary());

      // Wait for initial request to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Unmount component while request is in progress
      unmount();

      // Verify that abort was called
      expect(abortSpy).toHaveBeenCalled();
    });

    test('should not update state after component is unmounted', async () => {
      let requestResolve: (value: any) => void;

      mockApiClient.get.mockImplementation(() => {
        return new Promise((resolve) => {
          requestResolve = resolve;
        });
      });

      const { result, unmount } = renderHook(() => useContentLibrary());

      // Initial loading state
      expect(result.current.isLoading).toBe(true);

      // Unmount before request completes
      unmount();

      // Resolve request after unmount
      await act(async () => {
        requestResolve!({
          data: {
            data: [
              { id: 'test-1', user_id: 'user-1', status: 'completed' }
            ]
          }
        });
      });

      // State should remain in initial loading state (not updated after unmount)
      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('Request Cancellation on Navigation/Refresh', () => {
    test('should cancel previous requests when refresh is called', async () => {
      const abortSpyCalls: any[] = [];
      let firstRequestReject: (error: any) => void;
      let secondRequestResolve: (value: any) => void;

      mockApiClient.get.mockImplementation((url, config) => {
        const abortHandler = () => {
          abortSpyCalls.push('aborted');
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          firstRequestReject?.(abortError);
        };
        
        if (config?.signal) {
          config.signal.addEventListener('abort', abortHandler);
        }
        
        return new Promise((resolve, reject) => {
          if (abortSpyCalls.length === 0) {
            // First request - will be cancelled
            firstRequestReject = reject;
          } else {
            // Second request - will succeed
            secondRequestResolve = resolve;
          }
        });
      });

      const { result } = renderHook(() => useContentLibrary());

      // Wait for initial request to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Call refresh while first request is in progress
      await act(async () => {
        result.current.refresh();
      });

      // First request should be aborted
      expect(abortSpyCalls).toContain('aborted');

      // Complete second request
      await act(async () => {
        secondRequestResolve!({
          data: {
            data: [
              { id: 'test-2', user_id: 'user-1', status: 'completed' }
            ]
          }
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test('should handle rapid successive refresh calls gracefully', async () => {
      let callCount = 0;
      const abortCalls: number[] = [];

      mockApiClient.get.mockImplementation((url, config) => {
        const currentCall = ++callCount;
        
        if (config?.signal) {
          config.signal.addEventListener('abort', () => {
            abortCalls.push(currentCall);
          });
        }
        
        // Only the last call should succeed
        if (currentCall === 3) {
          return Promise.resolve({
            data: {
              data: [
                { id: 'test-final', user_id: 'user-1', status: 'completed' }
              ]
            }
          });
        } else {
          return new Promise(() => {}); // Never resolve (will be aborted)
        }
      });

      const { result } = renderHook(() => useContentLibrary());

      // Call refresh multiple times rapidly
      await act(async () => {
        result.current.refresh();
        result.current.refresh();
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First two requests should have been aborted
      expect(abortCalls).toEqual([1, 2]);
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('test-final');
    });
  });

  describe('Abort Error Handling', () => {
    test('should not show error messages for aborted requests', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';

      mockApiClient.get.mockRejectedValue(abortError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not show error for aborted requests
      expect(result.current.error).toBeNull();
    });

    test('should not show error for cancelled requests', async () => {
      const cancelError = new Error('Request cancelled');
      (cancelError as any).code = 'ERR_CANCELED';

      mockApiClient.get.mockRejectedValue(cancelError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not show error for cancelled requests
      expect(result.current.error).toBeNull();
    });

    test('should show error messages for actual failures', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';

      mockApiClient.get.mockRejectedValue(networkError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.error).toContain('Network connection error');
      });
    });

    test('should distinguish between abort and timeout errors', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApiClient.get.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.error).toContain('Request timed out');
        expect(result.current.error).toContain('check your connection');
      });
    });
  });

  describe('Concurrent Request Management', () => {
    test('should prevent concurrent requests unless reset', async () => {
      let callCount = 0;

      mockApiClient.get.mockImplementation(() => {
        callCount++;
        return new Promise(() => {}); // Never resolve
      });

      const { result } = renderHook(() => useContentLibrary());

      // Initial request starts
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Try to call loadMore while initial request is in progress
      await act(async () => {
        result.current.loadMore();
      });

      // Should still only have 2 calls (generation + clips for initial request)
      expect(callCount).toBe(2);
    });

    test('should allow reset (refresh) even with concurrent request', async () => {
      let callCount = 0;
      const abortCalls: number[] = [];

      mockApiClient.get.mockImplementation((url, config) => {
        const currentCall = ++callCount;
        
        if (config?.signal) {
          config.signal.addEventListener('abort', () => {
            abortCalls.push(currentCall);
          });
        }
        
        return new Promise(() => {}); // Never resolve (will be aborted or hang)
      });

      const { result } = renderHook(() => useContentLibrary());

      // Wait for initial request
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Call refresh (should cancel and restart)
      await act(async () => {
        result.current.refresh();
      });

      // Should have 4 total calls (2 initial + 2 refresh) with 2 aborts
      expect(callCount).toBe(4);
      expect(abortCalls).toEqual([1, 2]); // First pair aborted
    });
  });

  describe('Partial Request Failures with Abort Handling', () => {
    test('should handle when only one API call is aborted', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';

      mockApiClient.get.mockImplementation((url) => {
        if (url === '/generate') {
          return Promise.reject(abortError); // Generation API aborted
        } else {
          return Promise.resolve({
            data: {
              uploads: [
                { id: 'clip-1', title: 'Test Clip', status: 'completed' }
              ]
            }
          }); // Clips API succeeds
        }
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not show error and should have items from successful API
      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(1);
    });

    test('should handle when both API calls are aborted', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';

      mockApiClient.get.mockRejectedValue(abortError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not show error for aborted requests
      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should clean up abort controllers properly', async () => {
      const abortControllers: AbortController[] = [];
      const originalAbortController = global.AbortController;

      // Mock AbortController to track instances
      global.AbortController = class MockAbortController {
        signal: any;
        abort: jest.Mock;

        constructor() {
          this.abort = jest.fn();
          this.signal = {
            aborted: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          };
          abortControllers.push(this as any);
        }
      } as any;

      mockApiClient.get.mockResolvedValue({
        data: {
          data: [{ id: 'test-1', user_id: 'user-1', status: 'completed' }]
        }
      });

      const { unmount } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(abortControllers.length).toBeGreaterThan(0);
      });

      // Unmount and verify cleanup
      unmount();

      // All abort controllers should have been aborted
      abortControllers.forEach(controller => {
        expect(controller.abort).toHaveBeenCalled();
      });

      // Restore original
      global.AbortController = originalAbortController;
    });
  });

  describe('Error Recovery', () => {
    test('should retry successfully after aborted requests', async () => {
      let callCount = 0;
      
      mockApiClient.get.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // First request pair - abort them
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          return Promise.reject(abortError);
        } else {
          // Second request pair - succeed
          return Promise.resolve({
            data: {
              data: [{ id: 'test-recovery', user_id: 'user-1', status: 'completed' }]
            }
          });
        }
      });

      const { result } = renderHook(() => useContentLibrary());

      // Wait for initial aborted request
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(0);

      // Retry with refresh
      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.items).toHaveLength(1);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items[0].id).toBe('test-recovery');
    });
  });
});