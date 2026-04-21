/**
 * Content Kit Detail 500 Error Handling Tests
 * 
 * Tests for handling server errors (500) on content kit detail page
 * to ensure proper user experience during backend service failures.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113933893
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useContentKitDetail } from '@/hooks/useContentKit';
import { api } from '@/lib/api-client';
import { analyzeError, ApiErrorHandler } from '@/lib/error-handler';

// Mock API client
jest.mock('@/lib/api-client');
const mockApi = api as jest.Mocked<typeof api>;

// Mock console methods
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Content Kit Detail 500 Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    jest.useRealTimers();
  });

  describe('useContentKitDetail hook error handling', () => {
    test('should handle 500 server error with retry logic', async () => {
      const serverError = {
        response: { 
          status: 500, 
          data: { error: 'Internal Server Error' } 
        },
        message: 'Request failed with status code 500'
      };

      // First 3 calls fail, 4th succeeds
      mockApi.generation.getRequest
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            request: {
              id: 'test-id',
              status: 'completed',
              platforms: ['twitter'],
              createdAt: '2024-01-01T00:00:00Z',
              inputType: 'text'
            },
            clips: [],
            content: [],
          }
        });

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      // Initial loading state
      expect(result.current.loading).toBe(true);

      // Wait for first retry
      await waitFor(() => {
        expect(result.current.error).toContain('Server error');
        expect(result.current.error).toContain('attempt 1/3');
      });

      // Advance timers for retry
      jest.advanceTimersByTime(1000);

      // Wait for second retry
      await waitFor(() => {
        expect(result.current.error).toContain('attempt 2/3');
      });

      // Advance timers for retry
      jest.advanceTimersByTime(2000);

      // Wait for third retry
      await waitFor(() => {
        expect(result.current.error).toContain('attempt 3/3');
      });

      // Advance timers for final retry
      jest.advanceTimersByTime(4000);

      // Eventually should succeed
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.item).toBeTruthy();
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Server error detected, attempting retry')
      );
    });

    test('should provide helpful error message after max retries exceeded', async () => {
      const serverError = {
        response: { 
          status: 500, 
          data: { error: 'Database connection failed' } 
        }
      };

      mockApi.generation.getRequest.mockRejectedValue(serverError);
      mockApi.clips.get.mockRejectedValue(serverError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      // Fast-forward through all retries
      await waitFor(() => expect(result.current.error).toContain('attempt 1/3'));
      jest.advanceTimersByTime(1000);
      
      await waitFor(() => expect(result.current.error).toContain('attempt 2/3'));
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => expect(result.current.error).toContain('attempt 3/3'));
      jest.advanceTimersByTime(4000);

      // Final error message after retries exhausted
      await waitFor(() => {
        expect(result.current.error).toContain('Server is currently experiencing issues');
        expect(result.current.error).toContain('high server load or temporary backend problems');
        expect(result.current.loading).toBe(false);
      });
    });

    test('should handle different HTTP error codes appropriately', async () => {
      const testCases = [
        {
          status: 404,
          expectedMessage: 'not found',
        },
        {
          status: 403,
          expectedMessage: 'permission',
        },
        {
          status: 401,
          expectedMessage: 'session has expired',
        },
        {
          status: 503,
          expectedMessage: 'Server error',
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const error = {
          response: { status: testCase.status }
        };

        mockApi.generation.getRequest.mockRejectedValue(error);
        mockApi.clips.get.mockRejectedValue(error);

        const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

        await waitFor(() => {
          expect(result.current.error).toContain(testCase.expectedMessage);
          expect(result.current.loading).toBe(false);
        });
      }
    });

    test('should handle network and timeout errors', async () => {
      const networkError = new Error('Network Error');
      const timeoutError = { code: 'ECONNABORTED' };

      // Test network error
      mockApi.generation.getRequest.mockRejectedValue(networkError);
      mockApi.clips.get.mockRejectedValue(networkError);

      const { result: networkResult } = renderHook(() => useContentKitDetail({ id: 'test-id-1' }));

      await waitFor(() => {
        expect(networkResult.current.error).toContain('Unable to connect');
        expect(networkResult.current.error).toContain('check your internet connection');
      });

      // Test timeout error
      jest.clearAllMocks();
      mockApi.generation.getRequest.mockRejectedValue(timeoutError);
      mockApi.clips.get.mockRejectedValue(timeoutError);

      const { result: timeoutResult } = renderHook(() => useContentKitDetail({ id: 'test-id-2' }));

      await waitFor(() => {
        expect(timeoutResult.current.error).toContain('Loading is taking longer than expected');
        expect(timeoutResult.current.error).toContain('large content kits or during high server load');
      });
    });

    test('should reset retry count on manual refresh', async () => {
      const serverError = {
        response: { status: 500 }
      };

      mockApi.generation.getRequest.mockRejectedValue(serverError);
      mockApi.clips.get.mockRejectedValue(serverError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      // Wait for retries to start
      await waitFor(() => expect(result.current.error).toContain('attempt 1/3'));
      jest.advanceTimersByTime(1000);
      await waitFor(() => expect(result.current.error).toContain('attempt 2/3'));

      // Mock a successful response for refresh
      mockApi.generation.getRequest.mockResolvedValue({
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

      // Manual refresh should reset retry count and succeed immediately
      result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.item).toBeTruthy();
      });
    });

    test('should handle source type fallback with 500 errors', async () => {
      const serverError = {
        response: { status: 500 }
      };

      // Generation endpoint fails, clips endpoint succeeds
      mockApi.generation.getRequest.mockRejectedValue(serverError);
      mockApi.clips.get.mockResolvedValue({
        success: true,
        data: {
          upload: {
            id: 'upload-id',
            title: 'Test Upload',
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
        expect(result.current.item).toBeTruthy();
      });

      expect(mockApi.clips.get).toHaveBeenCalled();
    });
  });

  describe('Error analyzer utility', () => {
    test('should correctly categorize server errors', () => {
      const error500 = { response: { status: 500, data: { error: 'Internal error' } } };
      const error502 = { response: { status: 502 } };
      const error503 = { response: { status: 503 } };

      const result500 = analyzeError(error500);
      expect(result500.errorType).toBe('server');
      expect(result500.shouldRetry).toBe(true);
      expect(result500.userMessage).toContain('Server is currently experiencing issues');

      const result502 = analyzeError(error502);
      expect(result502.errorType).toBe('server');
      expect(result502.shouldRetry).toBe(true);

      const result503 = analyzeError(error503);
      expect(result503.errorType).toBe('server');
      expect(result503.shouldRetry).toBe(true);
    });

    test('should correctly categorize client errors', () => {
      const error404 = { response: { status: 404 } };
      const error403 = { response: { status: 403 } };
      const error401 = { response: { status: 401 } };

      const result404 = analyzeError(error404);
      expect(result404.errorType).toBe('notFound');
      expect(result404.shouldRetry).toBe(false);

      const result403 = analyzeError(error403);
      expect(result403.errorType).toBe('forbidden');
      expect(result403.shouldRetry).toBe(false);

      const result401 = analyzeError(error401);
      expect(result401.errorType).toBe('auth');
      expect(result401.shouldRetry).toBe(false);
    });

    test('should correctly categorize network and timeout errors', () => {
      const networkError = new Error('Network Error');
      const timeoutError = { code: 'ECONNABORTED' };

      const networkResult = analyzeError(networkError);
      expect(networkResult.errorType).toBe('network');
      expect(networkResult.shouldRetry).toBe(true);

      const timeoutResult = analyzeError(timeoutError);
      expect(timeoutResult.errorType).toBe('timeout');
      expect(timeoutResult.shouldRetry).toBe(true);
    });
  });

  describe('ApiErrorHandler class', () => {
    test('should implement retry logic with exponential backoff', async () => {
      const handler = new ApiErrorHandler(3);
      const serverError = { response: { status: 500 } };
      
      let attemptCount = 0;
      const mockRetryFn = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw serverError;
        }
        return { success: true, data: 'success' };
      });

      const result = await handler.handleError(serverError, mockRetryFn);

      expect(result.shouldThrow).toBe(false);
      expect(result.result).toEqual({ success: true, data: 'success' });
      expect(mockRetryFn).toHaveBeenCalledTimes(3);
    });

    test('should respect max retries limit', async () => {
      const handler = new ApiErrorHandler(2);
      const serverError = { response: { status: 500 } };
      
      const mockRetryFn = jest.fn().mockRejectedValue(serverError);

      const result = await handler.handleError(serverError, mockRetryFn);

      expect(result.shouldThrow).toBe(true);
      expect(result.errorMessage).toContain('Failed after 2 retries');
      expect(mockRetryFn).toHaveBeenCalledTimes(2);
    });

    test('should reset retry count on success', async () => {
      const handler = new ApiErrorHandler();
      const serverError = { response: { status: 500 } };
      
      // First attempt succeeds
      const mockRetryFn = jest.fn().mockResolvedValue({ success: true });

      await handler.handleError(serverError, mockRetryFn);
      
      const status = handler.getRetryStatus();
      expect(status.count).toBe(0); // Should be reset
      expect(status.canRetry).toBe(true);
    });

    test('should not retry non-retryable errors', async () => {
      const handler = new ApiErrorHandler();
      const notFoundError = { response: { status: 404 } };
      
      const mockRetryFn = jest.fn();

      const result = await handler.handleError(notFoundError, mockRetryFn);

      expect(result.shouldThrow).toBe(true);
      expect(mockRetryFn).not.toHaveBeenCalled();
    });
  });

  describe('API client enhanced error handling', () => {
    test('should enhance contentKits.get error messages', async () => {
      const testCases = [
        {
          error: { response: { status: 500, data: { error: 'Database error' } } },
          expectedMessage: 'Server error loading content kit (500): Database error',
        },
        {
          error: { response: { status: 404 } },
          expectedMessage: 'Content kit not found',
        },
        {
          error: { response: { status: 403 } },
          expectedMessage: 'You do not have permission to view this content kit',
        },
        {
          error: { code: 'ECONNABORTED' },
          expectedMessage: 'Request timed out loading content kit',
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        // Mock the axios client to throw the error
        const mockAxiosGet = jest.fn().mockRejectedValue(testCase.error);
        (api as any).mockImplementation(() => ({ get: mockAxiosGet }));

        await expect(api.contentKits.get('test-id')).rejects.toThrow(
          expect.stringContaining(testCase.expectedMessage)
        );
      }
    });

    test('should enhance clips.get error messages', async () => {
      const serverError = { response: { status: 500, data: { error: 'Processing failed' } } };
      
      // Mock the axios client to throw the error
      const mockAxiosGet = jest.fn().mockRejectedValue(serverError);
      (api as any).mockImplementation(() => ({ get: mockAxiosGet }));

      await expect(api.clips.get('test-id')).rejects.toThrow(
        'Server error loading video upload (500): Processing failed'
      );
    });
  });

  describe('Real-world error scenarios', () => {
    test('should handle server overload scenario', async () => {
      const overloadError = {
        response: { 
          status: 503, 
          data: { error: 'Service Temporarily Unavailable' } 
        }
      };

      mockApi.generation.getRequest.mockRejectedValue(overloadError);
      mockApi.clips.get.mockRejectedValue(overloadError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.error).toContain('Server error');
        expect(result.current.error).toContain('attempt 1/3');
      });

      // Should implement exponential backoff
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Server error detected, attempting retry')
      );
    });

    test('should handle database connectivity issues', async () => {
      const dbError = {
        response: { 
          status: 500, 
          data: { error: 'Connection to database failed' } 
        }
      };

      mockApi.generation.getRequest.mockRejectedValue(dbError);
      mockApi.clips.get.mockRejectedValue(dbError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      // Should retry and eventually show helpful error message
      jest.advanceTimersByTime(10000); // Fast-forward through retries

      await waitFor(() => {
        expect(result.current.error).toContain('Server is currently experiencing issues');
        expect(result.current.error).toContain('temporary backend problems');
      });
    });

    test('should handle partial API failures gracefully', async () => {
      // Generation API fails but clips API succeeds
      const serverError = { response: { status: 500 } };
      
      mockApi.generation.getRequest.mockRejectedValue(serverError);
      mockApi.clips.get.mockResolvedValue({
        success: true,
        data: {
          upload: {
            id: 'upload-id',
            title: 'Backup Content',
            status: 'completed',
            createdAt: '2024-01-01T00:00:00Z',
          },
          clips: [{ id: 'clip-1', title: 'Test Clip' }],
          contentKit: null,
        }
      });

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-id' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.item?.title).toBe('Backup Content');
        expect(result.current.detail?.clips).toHaveLength(1);
      });
    });
  });
});