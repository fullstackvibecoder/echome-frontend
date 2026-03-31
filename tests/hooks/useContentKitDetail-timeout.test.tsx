/**
 * Content Kit Detail Timeout Fix Tests
 * 
 * Tests the enhanced timeout handling in useContentKitDetail hook
 * to prevent AxiosError timeout issues on content-kit detail pages.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109007133/events/5508c57987cf4bd0b2ed70f9b3ba95cb/
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useContentKitDetail } from '../../src/hooks/useContentKit';
import { api } from '../../src/lib/api-client';

// Mock the API client
jest.mock('../../src/lib/api-client', () => ({
  api: {
    generation: {
      getRequest: jest.fn(),
    },
    clips: {
      get: jest.fn(),
    },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('useContentKitDetail - Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset console to avoid polluting test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Timeout error scenarios', () => {
    test('should retry timeout errors with exponential backoff', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      // First call: timeout
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);
      
      // Second call: timeout again
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);
      
      // Third call: success
      mockApi.generation.getRequest.mockResolvedValueOnce({
        success: true,
        data: {
          request: {
            id: 'test-123',
            userId: 'user-123',
            status: 'completed',
            platforms: ['instagram'],
            inputType: 'text' as const,
            createdAt: new Date().toISOString(),
          },
          contentKit: {
            id: 'kit-123',
            title: 'Test Content Kit',
            videoUploadId: 'upload-123',
            contentGenerated: true,
            clipsGenerated: true,
            createdAt: new Date().toISOString(),
          },
          clips: [],
          content: [],
          carousel: null,
        },
      });

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Initial loading state
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);

      // Wait for first timeout
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      // Fast-forward first retry delay (2 seconds)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for second timeout
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (2/2)');
      });

      // Fast-forward second retry delay (4 seconds)
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Wait for successful resolution
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.item).toBeTruthy();
      });

      // Verify API was called 3 times (initial + 2 retries)
      expect(mockApi.generation.getRequest).toHaveBeenCalledTimes(3);
    });

    test('should show final timeout message after max retries', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      // All calls timeout
      mockApi.generation.getRequest.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Wait for first timeout and retry
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for second timeout and retry
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (2/2)');
      });

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Wait for final timeout error message
      await waitFor(() => {
        expect(result.current.error).toContain('Content is taking longer than expected');
        expect(result.current.error).toContain('still being processed');
        expect(result.current.loading).toBe(false);
      });

      // Verify we tried maximum times (initial + 2 retries)
      expect(mockApi.generation.getRequest).toHaveBeenCalledTimes(3);
    });

    test('should handle different timeout error formats', async () => {
      const timeoutErrors = [
        new Error('timeout of 15000ms exceeded'),
        new Error('Request timeout'),
        { message: 'ECONNABORTED', code: 'ECONNABORTED' },
        new Error('Network timeout'),
      ];

      for (const error of timeoutErrors) {
        jest.clearAllMocks();
        
        // First call: timeout, second call: success
        mockApi.generation.getRequest
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce({
            success: true,
            data: {
              request: {
                id: 'test-123',
                userId: 'user-123',
                status: 'completed',
                platforms: ['instagram'],
                inputType: 'text' as const,
                createdAt: new Date().toISOString(),
              },
              contentKit: null,
              clips: [],
              content: [],
              carousel: null,
            },
          });

        const { result, unmount } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

        // Should recognize as timeout and retry
        await waitFor(() => {
          expect(result.current.error).toContain('retrying... (1/2)');
        });

        act(() => {
          jest.advanceTimersByTime(2000);
        });

        // Should succeed on retry
        await waitFor(() => {
          expect(result.current.loading).toBe(false);
          expect(result.current.error).toBe(null);
          expect(result.current.item).toBeTruthy();
        });

        unmount();
      }
    });

    test('should not retry non-timeout errors', async () => {
      const notFoundError = new Error('Content not found');
      
      mockApi.generation.getRequest.mockRejectedValue(notFoundError);
      mockApi.clips.get.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Content not found');
      });

      // Should not retry non-timeout errors
      expect(mockApi.generation.getRequest).toHaveBeenCalledTimes(1);
      expect(mockApi.clips.get).toHaveBeenCalledTimes(1);
    });

    test('should reset timeout retry count on successful load after timeouts', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      // First load: timeout then success
      mockApi.generation.getRequest
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            request: {
              id: 'test-123',
              userId: 'user-123',
              status: 'completed',
              platforms: ['instagram'],
              inputType: 'text' as const,
              createdAt: new Date().toISOString(),
            },
            contentKit: null,
            clips: [],
            content: [],
            carousel: null,
          },
        });

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Wait for timeout and retry
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for success
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.item).toBeTruthy();
      });

      // Now simulate a refresh that times out - should start retry count from 0 again
      jest.clearAllMocks();
      mockApi.generation.getRequest
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            request: {
              id: 'test-123',
              userId: 'user-123',
              status: 'completed',
              platforms: ['instagram'],
              inputType: 'text' as const,
              createdAt: new Date().toISOString(),
            },
            contentKit: null,
            clips: [],
            content: [],
            carousel: null,
          },
        });

      // Trigger refresh
      act(() => {
        result.current.refresh();
      });

      // Should show retry (1/2) again, not (2/2) or (3/2)
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });
    });
  });

  describe('Clips API timeout scenarios', () => {
    test('should retry timeout errors for clips endpoint', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      // Generation endpoint returns not found, so clips endpoint is tried
      mockApi.generation.getRequest.mockRejectedValue(new Error('Not found'));
      
      // Clips endpoint: first timeout, then success
      mockApi.clips.get
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            upload: {
              id: 'upload-123',
              userId: 'user-123',
              status: 'completed',
              sourceType: 'upload',
              filename: 'test.mp4',
              processingJobId: 'job-123',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            clips: [],
            contentKit: {
              id: 'kit-123',
              title: 'Test Content Kit',
              videoUploadId: 'upload-123',
              contentGenerated: true,
              clipsGenerated: true,
              createdAt: new Date().toISOString(),
            },
          },
        });

      const { result } = renderHook(() => useContentKitDetail({ id: 'upload-123' }));

      // Wait for timeout and retry
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for success
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.item).toBeTruthy();
        expect(result.current.item?.sourceType).toBe('clip-finder');
      });

      expect(mockApi.clips.get).toHaveBeenCalledTimes(2); // initial + 1 retry
    });
  });

  describe('Mixed error scenarios', () => {
    test('should handle timeout then non-timeout error correctly', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      const serverError = new Error('Internal server error');
      
      mockApi.generation.getRequest
        .mockRejectedValueOnce(timeoutError) // First call: timeout
        .mockRejectedValueOnce(serverError); // Retry: server error
      
      mockApi.clips.get.mockRejectedValue(serverError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Wait for timeout retry
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should show server error (not timeout message)
      await waitFor(() => {
        expect(result.current.error).toBe('Content not found');
        expect(result.current.loading).toBe(false);
      });

      // Should have tried generation twice, clips once
      expect(mockApi.generation.getRequest).toHaveBeenCalledTimes(2);
      expect(mockApi.clips.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    test('should handle concurrent refresh calls during timeout retry', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.generation.getRequest.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Wait for first timeout
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      // Call refresh multiple times while retry is pending
      act(() => {
        result.current.refresh();
        result.current.refresh();
        result.current.refresh();
      });

      // Should not cause issues or duplicate requests
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      // API should not be called excessively
      expect(mockApi.generation.getRequest).toHaveBeenCalledTimes(4); // initial + 3 refresh calls
    });

    test('should handle component unmount during timeout retry', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.generation.getRequest.mockRejectedValue(timeoutError);

      const { result, unmount } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Wait for timeout
      await waitFor(() => {
        expect(result.current.error).toContain('retrying... (1/2)');
      });

      // Unmount component before retry
      unmount();

      // Fast-forward retry timer
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not cause memory leaks or errors
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('User experience', () => {
    test('should show appropriate loading and error messages', async () => {
      const timeoutError = new Error('timeout of 15000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.generation.getRequest.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentKitDetail({ id: 'test-123' }));

      // Initial loading
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);

      // First timeout - should show retry message
      await waitFor(() => {
        expect(result.current.error).toBe('Content is still processing, retrying... (1/2)');
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Second timeout - should show retry message
      await waitFor(() => {
        expect(result.current.error).toBe('Content is still processing, retrying... (2/2)');
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Final timeout - should show helpful message
      await waitFor(() => {
        expect(result.current.error).toContain('Content is taking longer than expected');
        expect(result.current.error).toContain('still being processed');
        expect(result.current.error).toContain('try refreshing the page');
        expect(result.current.loading).toBe(false);
      });
    });
  });
});