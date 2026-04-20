/**
 * Content Library Timeout Handling Tests
 * 
 * Tests for useContentLibrary hook to ensure proper timeout handling
 * and error recovery for content library list operations.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113717306
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { api } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: {
    generation: {
      listRequests: jest.fn(),
      deleteRequest: jest.fn(),
    },
    clips: {
      list: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('useContentLibrary timeout handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('List operations timeout scenarios', () => {
    test('should handle 10-second timeout errors with helpful guidance', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Loading is taking longer than expected');
      expect(result.current.error).toContain('many content items');
      expect(result.current.error).toContain('high server load');
      expect(result.current.error).toContain('try refreshing');
      expect(result.current.items).toEqual([]);
    });

    test('should handle LIST_TIMEOUT (30s) errors properly', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Loading is taking longer than expected');
    });

    test('should handle partial success when one endpoint times out', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // Generation service times out but clips service succeeds
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockResolvedValue({
        success: true,
        data: {
          uploads: [
            {
              id: 'upload-1',
              title: 'Test Video',
              status: 'completed',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              createdAt: new Date().toISOString(),
              originalFilename: 'test.mp4',
              userId: 'user-1',
            },
          ],
        },
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should succeed and show the clips data
      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].title).toBe('test.mp4'); // Uses originalFilename when no title
    });

    test('should handle refresh after list timeout', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // First call times out
      mockApi.generation.listRequests.mockRejectedValueOnce(timeoutError);
      mockApi.clips.list.mockRejectedValueOnce(timeoutError);

      // Second call succeeds
      mockApi.generation.listRequests.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'req-1',
            status: 'completed',
            platforms: ['linkedin'],
            inputText: 'Test content',
            generatedTitle: 'Generated Test Content',
            createdAt: new Date().toISOString(),
          },
        ],
      });
      mockApi.clips.list.mockResolvedValueOnce({
        success: true,
        data: { uploads: [] },
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');

      // Trigger refresh
      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].title).toBe('Generated Test Content');
    });

    test('should handle load more with timeout errors', async () => {
      // Initial load succeeds
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'req-1',
            status: 'completed',
            platforms: ['linkedin'],
            inputText: 'Test content 1',
            createdAt: new Date().toISOString(),
          },
        ],
      });
      mockApi.clips.list.mockResolvedValue({
        success: true,
        data: { uploads: [] },
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.error).toBeNull();

      // Mock timeout for load more
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockRejectedValue(timeoutError);

      // Trigger load more
      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.pagination.isLoadingMore).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');
      // Original items should still be there
      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('Error message differentiation', () => {
    test('should distinguish timeout from network errors', async () => {
      const networkError = new Error('Network Error');

      mockApi.generation.listRequests.mockRejectedValue(networkError);
      mockApi.clips.list.mockRejectedValue(networkError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Network connection issue');
      expect(result.current.error).toContain('check your internet connection');
      expect(result.current.error).not.toContain('longer than expected');
    });

    test('should handle server errors differently', async () => {
      const serverError = new Error('Request failed with status code 500');
      (serverError as any).response = { status: 500 };

      mockApi.generation.listRequests.mockRejectedValue(serverError);
      mockApi.clips.list.mockRejectedValue(serverError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Server error occurred');
      expect(result.current.error).toContain('try again in a moment');
    });

    test('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = { status: 401 };

      mockApi.generation.listRequests.mockRejectedValue(authError);
      mockApi.clips.list.mockRejectedValue(authError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Please log in to view your content');
    });
  });

  describe('Data loading resilience', () => {
    test('should handle mixed success/failure scenarios', async () => {
      // Generation succeeds, clips times out
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'req-1',
            status: 'completed',
            platforms: ['twitter', 'linkedin'],
            inputText: 'First content',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'req-2',
            status: 'processing',
            platforms: ['instagram'],
            inputText: 'Second content',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      const timeoutError = new Error('timeout of 10000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.clips.list.mkRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should show generation data even if clips timed out
      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(2);
      expect(result.current.stats.total).toBe(2);
      expect(result.current.stats.processing).toBe(1);
    });

    test('should handle empty responses gracefully', async () => {
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: [],
      });
      mockApi.clips.list.mockResolvedValue({
        success: true,
        data: { uploads: [] },
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toEqual([]);
      expect(result.current.stats.total).toBe(0);
    });

    test('should handle malformed API responses', async () => {
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: null, // Malformed response
      });
      mockApi.clips.list.mockResolvedValue({
        success: false,
        data: undefined, // Another malformed response
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle gracefully without crashing
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Pagination with timeouts', () => {
    test('should handle timeout during pagination', async () => {
      // Initial load succeeds
      mockApi.generation.listRequests.mockResolvedValueOnce({
        success: true,
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `req-${i}`,
          status: 'completed',
          platforms: ['linkedin'],
          inputText: `Content ${i}`,
          createdAt: new Date().toISOString(),
        })),
      });
      mockApi.clips.list.mockResolvedValueOnce({
        success: true,
        data: { uploads: [] },
      });

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toHaveLength(20);
      expect(result.current.pagination.hasMore).toBe(true);

      // Next page times out
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockRejectedValue(timeoutError);

      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.pagination.isLoadingMore).toBe(false);
      });

      // Should keep existing items and show error
      expect(result.current.items).toHaveLength(20);
      expect(result.current.error).toContain('longer than expected');
    });

    test('should reset pagination on refresh after timeout', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // Initial load times out
      mockApi.generation.listRequests.mockRejectedValueOnce(timeoutError);
      mockApi.clips.list.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() => useContentLibrary());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');

      // Refresh succeeds
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'req-1',
            status: 'completed',
            platforms: ['twitter'],
            inputText: 'Refreshed content',
            createdAt: new Date().toISOString(),
          },
        ],
      });
      mockApi.clips.list.mockResolvedValue({
        success: true,
        data: { uploads: [] },
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(1);
      expect(result.current.pagination.offset).toBe(20); // Should be set for next page
    });
  });

  describe('Error recovery patterns', () => {
    test('should provide appropriate recovery actions for different errors', async () => {
      const errorScenarios = [
        {
          error: new Error('timeout of 10000ms exceeded'),
          code: 'ECONNABORTED',
          expectedGuidance: ['longer than expected', 'refreshing'],
        },
        {
          error: new Error('Network Error'),
          code: undefined,
          expectedGuidance: ['Network connection issue', 'internet connection'],
        },
        {
          error: new Error('Internal Server Error'),
          response: { status: 500 },
          expectedGuidance: ['Server error occurred', 'try again in a moment'],
        },
      ];

      for (const scenario of errorScenarios) {
        jest.clearAllMocks();
        
        if (scenario.code) {
          (scenario.error as any).code = scenario.code;
        }
        if (scenario.response) {
          (scenario.error as any).response = scenario.response;
        }

        mockApi.generation.listRequests.mkRejectedValue(scenario.error);
        mockApi.clips.list.mockRejectedValue(scenario.error);

        const { result } = renderHook(() => useContentLibrary());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        for (const expectedText of scenario.expectedGuidance) {
          expect(result.current.error).toContain(expectedText);
        }
      }
    });
  });
});