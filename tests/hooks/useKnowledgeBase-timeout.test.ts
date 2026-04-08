/**
 * useKnowledgeBase Timeout Handling Tests
 * 
 * Tests timeout handling and retry logic for knowledge base content loading
 * to ensure proper error recovery and user feedback for large KBs.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/110427497/events/3d0fedb36b8c4550a7d3766d30c6266a/
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { api } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client');
const mockApi = api as jest.Mocked<typeof api>;

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

describe('useKnowledgeBase Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset API mocks
    mockApi.kb = {
      list: jest.fn(),
      create: jest.fn(),
      getContent: jest.fn(),
      chat: jest.fn(),
    };
    
    mockApi.files = {
      delete: jest.fn(),
    };
    
    mockApi.kbContent = {
      deleteContent: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timeout Error Handling', () => {
    test('should handle timeout errors from kb.getContent', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 45000ms exceeded',
      };

      // Mock successful KB list
      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      // Mock timeout error
      mockApi.kb.getContent.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      // Wait for initial load and timeout
      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
        expect(result.current.error).toContain('large knowledge bases');
        expect(result.current.loading).toBe(false);
      });

      expect(console.error).toHaveBeenCalledWith(
        '[useKnowledgeBase] Failed to fetch content:', 
        timeoutError
      );
    });

    test('should show timeout-specific error message', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 45000ms exceeded',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('Loading your knowledge base is taking longer than expected');
        expect(result.current.loading).toBe(false);
      });
    });

    test('should handle different timeout error formats', async () => {
      const timeoutVariations = [
        { code: 'ECONNABORTED', message: 'timeout of 45000ms exceeded' },
        { message: 'Request timeout' },
        { message: 'Connection timeout after 45000ms' },
        { code: 'ETIMEDOUT', message: 'Request timed out' },
      ];

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      for (const timeoutError of timeoutVariations) {
        mockApi.kb.getContent.mockRejectedValueOnce(timeoutError);

        const { result, unmount } = renderHook(() => useKnowledgeBase('kb-1'));

        await waitFor(() => {
          expect(result.current.error).toContain('taking longer than expected');
        });

        unmount();
        jest.clearAllMocks();
      }
    });
  });

  describe('Auto-Retry Logic for Timeouts', () => {
    test('should auto-retry timeout errors with exponential backoff', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 45000ms exceeded',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      // First two calls timeout, third succeeds
      mockApi.kb.getContent
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({
          success: true,
          data: {
            items: [
              {
                id: 'content-1',
                title: 'Test Content',
                sourceType: 'file_upload',
                status: 'completed',
                chunkCount: 5,
                fileSize: 1024,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ],
            stats: {
              totalItems: 1,
              totalChunks: 5,
              totalSize: 1024,
              bySourceType: { file_upload: 1 },
            },
          },
        });

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      // Wait for initial timeout error
      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });

      // First retry after 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(2);
      });

      // Second retry after 10 seconds (5 + 5 = 10s total delay for second retry)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(3);
        expect(result.current.error).toBeNull();
        expect(result.current.contentItems).toHaveLength(1);
        expect(result.current.contentItems[0].id).toBe('content-1');
      });
    });

    test('should stop retrying after max timeout retries', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 45000ms exceeded',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      // Wait for initial timeout
      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });

      // First retry
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(2);
      });

      // Second retry (max for timeout errors)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(3);
      });

      // Should not retry again (max 2 retries for timeout)
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      // Wait a bit to ensure no more calls
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockApi.kb.getContent).toHaveBeenCalledTimes(3);
      expect(result.current.error).toContain('taking longer than expected');
    });

    test('should reset retry count on successful load', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 45000ms exceeded',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      // First call times out
      mockApi.kb.getContent.mockRejectedValueOnce(timeoutError);

      const { result, rerender } = renderHook(
        (props) => useKnowledgeBase(props.kbId),
        { initialProps: { kbId: 'kb-1' } }
      );

      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });

      // Mock successful response for retry
      mockApi.kb.getContent.mockResolvedValue({
        success: true,
        data: {
          items: [],
          stats: { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} },
        },
      });

      // Wait for auto-retry
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.contentItems).toEqual([]);
      });

      // Change KB to trigger reset
      rerender({ kbId: 'kb-2' });

      // Mock timeout again
      mockApi.kb.getContent.mockRejectedValue(timeoutError);

      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });

      // Should start retry count from 0 again
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/Auto-retrying.*attempt 1\/2/)
      );
    });
  });

  describe('Other Error Types', () => {
    test('should handle network errors with retry', async () => {
      const networkError = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({
          success: true,
          data: {
            items: [],
            stats: { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} },
          },
        });

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('Network connection issue');
        expect(result.current.error).toContain('check your internet connection');
      });

      // Wait for auto-retry (2 seconds for network)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle server errors with retry', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({
          success: true,
          data: {
            items: [],
            stats: { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} },
          },
        });

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('Server error while loading knowledge base');
      });

      // Wait for auto-retry (3 seconds for server error)
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(2);
      });
    });

    test('should not retry non-retryable errors', async () => {
      const notFoundError = {
        response: { status: 404 },
        message: 'Not Found',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('Knowledge base not found');
      });

      // Wait longer than retry delay
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not retry
      expect(mockApi.kb.getContent).toHaveBeenCalledTimes(1);
      expect(result.current.error).toContain('Knowledge base not found');
    });

    test('should handle rate limit errors', async () => {
      const rateLimitError = {
        response: { status: 429 },
        message: 'Too Many Requests',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          success: true,
          data: {
            items: [],
            stats: { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} },
          },
        });

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('Too many requests');
      });

      // Wait for auto-retry (10 seconds for rate limit)
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(mockApi.kb.getContent).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Manual Refresh', () => {
    test('should allow manual refresh after timeout error', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 45000ms exceeded',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      // First call fails
      mockApi.kb.getContent.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });

      // Mock successful response for manual refresh
      mockApi.kb.getContent.mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'content-1',
              title: 'Test Content',
              sourceType: 'file_upload',
              status: 'completed',
              chunkCount: 1,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          stats: { totalItems: 1, totalChunks: 1, totalSize: 0, bySourceType: { file_upload: 1 } },
        },
      });

      // Manual refresh
      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.contentItems).toHaveLength(1);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed timeout errors', async () => {
      const malformedError = {
        code: 'ECONNABORTED',
        // No message
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent.mockRejectedValue(malformedError);

      const { result } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });
    });

    test('should handle cleanup on unmount during retry', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout exceeded',
      };

      mockApi.kb.list.mockResolvedValue({
        success: true,
        data: [{ id: 'kb-1', name: 'Test KB', isDefault: true }],
      });

      mockApi.kb.getContent.mockRejectedValue(timeoutError);

      const { result, unmount } = renderHook(() => useKnowledgeBase('kb-1'));

      await waitFor(() => {
        expect(result.current.error).toContain('taking longer than expected');
      });

      // Unmount before retry timer fires
      unmount();

      // Advance timers to see if retry would have fired
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not make additional API calls after unmount
      expect(mockApi.kb.getContent).toHaveBeenCalledTimes(1);
    });
  });
});