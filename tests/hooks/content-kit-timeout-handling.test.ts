/**
 * Content Kit Timeout Handling Tests
 * 
 * Tests for useContentKit and useContentKitDetail hooks to ensure proper
 * timeout handling and error recovery for content kit operations.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113703248
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useContentKit, useContentKitDetail } from '@/hooks/useContentKit';
import { api } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: {
    generation: {
      listRequests: jest.fn(),
      getRequest: jest.fn(),
    },
    clips: {
      list: jest.fn(),
      get: jest.fn(),
    },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('useContentKit timeout handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('List timeout scenarios', () => {
    test('should handle timeout errors in list operations', async () => {
      const timeoutError = new Error('timeout of 60000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useContentKit({ limit: 10 }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Loading is taking longer than expected');
      expect(result.current.error).toContain('high server load');
      expect(result.current.items).toEqual([]);
    });

    test('should handle network errors differently from timeouts', async () => {
      const networkError = new Error('Network Error');
      
      mockApi.generation.listRequests.mockRejectedValue(networkError);
      mockApi.clips.list.mockRejectedValue(networkError);

      const { result } = renderHook(() => useContentKit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Network connection issue');
      expect(result.current.error).toContain('check your internet connection');
    });

    test('should handle successful partial responses', async () => {
      // Generation service times out but clips service succeeds
      const timeoutError = new Error('timeout of 60000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

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
            },
          ],
        },
      });

      const { result } = renderHook(() => useContentKit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('upload-1');
    });

    test('should handle refresh after timeout', async () => {
      const timeoutError = new Error('timeout exceeded');
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
            inputText: 'Test input',
            createdAt: new Date(),
          },
        ],
      });
      mockApi.clips.list.mockResolvedValueOnce({
        success: true,
        data: { uploads: [] },
      });

      const { result } = renderHook(() => useContentKit());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');

      // Trigger refresh
      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('Auto-refresh behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should handle timeouts in auto-refresh cycles', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // Initial load succeeds
      mockApi.generation.listRequests.mockResolvedValue({
        success: true,
        data: [],
      });
      mockApi.clips.list.mockResolvedValue({
        success: true,
        data: { uploads: [] },
      });

      const { result } = renderHook(() => 
        useContentKit({ autoRefresh: true, refreshInterval: 5000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();

      // Mock timeout for refresh
      mockApi.generation.listRequests.mockRejectedValue(timeoutError);
      mockApi.clips.list.mockRejectedValue(timeoutError);

      // Advance timer to trigger refresh
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');
    });
  });
});

describe('useContentKitDetail timeout handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Detail loading timeout scenarios', () => {
    test('should handle timeout in generation.getRequest', async () => {
      const timeoutError = new Error('timeout of 60000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.generation.getRequest.mockRejectedValue(timeoutError);
      mockApi.clips.get.mkRejectedValue(timeoutError);

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Loading is taking longer than expected');
      expect(result.current.error).toContain('large content kits');
      expect(result.current.item).toBeNull();
      expect(result.current.detail).toBeNull();
    });

    test('should handle timeout in clips.get fallback', async () => {
      const timeoutError = new Error('timeout of 60000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // Generation request fails normally (not found)
      mockApi.generation.getRequest.mockRejectedValue(new Error('Not found'));
      // Clips get times out
      mockApi.clips.get.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');
    });

    test('should succeed when generation times out but clips succeeds', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.generation.getRequest.mkRejectedValue(timeoutError);
      mockApi.clips.get.mockResolvedValue({
        success: true,
        data: {
          upload: {
            id: 'upload-1',
            title: 'Test Upload',
            status: 'completed',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            createdAt: new Date().toISOString(),
          },
          clips: [],
          contentKit: null,
        },
      });

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).not.toBeNull();
      expect(result.current.item?.id).toBe('upload-1');
    });

    test('should handle server errors differently from timeouts', async () => {
      const serverError = new Error('Request failed with status code 500');

      mockApi.generation.getRequest.mockRejectedValue(serverError);
      mockApi.clips.get.mkRejectedValue(serverError);

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Server error occurred');
      expect(result.current.error).toContain('try again in a moment');
    });

    test('should handle refresh after detail timeout', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      // First calls timeout
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);
      mockApi.clips.get.mockRejectedValueOnce(timeoutError);

      // Second calls succeed
      mockApi.generation.getRequest.mockResolvedValueOnce({
        success: true,
        data: {
          request: {
            id: 'req-1',
            status: 'completed',
            platforms: ['linkedin'],
            inputText: 'Test content',
            createdAt: new Date(),
          },
          clips: [],
          contentKit: {
            id: 'kit-1',
            title: 'Test Kit',
            contentLinkedin: 'LinkedIn content',
          },
          content: [],
          carousel: null,
        },
      });

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');

      // Trigger refresh
      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).not.toBeNull();
      expect(result.current.detail?.contentKit).not.toBeNull();
    });
  });

  describe('Retry mechanism with timeouts', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should retry when content is completed but missing data', async () => {
      // First call: returns completed item but no content data
      mockApi.generation.getRequest.mockResolvedValueOnce({
        success: true,
        data: {
          request: {
            id: 'req-1',
            status: 'completed',
            platforms: ['linkedin'],
            inputText: 'Test content',
            createdAt: new Date(),
          },
          clips: [],
          contentKit: null, // Missing content kit
          content: [],
          carousel: null,
        },
      });

      // Second call (retry): times out
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);

      // Third call (retry): succeeds with content
      mockApi.generation.getRequest.mockResolvedValueOnce({
        success: true,
        data: {
          request: {
            id: 'req-1',
            status: 'completed',
            platforms: ['linkedin'],
            inputText: 'Test content',
            createdAt: new Date(),
          },
          clips: [],
          contentKit: {
            id: 'kit-1',
            title: 'Test Kit',
            contentLinkedin: 'LinkedIn content',
          },
          content: [],
          carousel: null,
        },
      });

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id' })
      );

      // Initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.item?.status).toBe('completed');
      expect(result.current.detail?.contentKit).toBeNull();

      // First retry (times out)
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');

      // Second retry (succeeds)
      jest.advanceTimersByTime(1500);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.detail?.contentKit).not.toBeNull();
    });
  });

  describe('Source type handling with timeouts', () => {
    test('should respect sourceType generation with timeout', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.generation.getRequest.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');
      expect(mockApi.clips.get).not.toHaveBeenCalled(); // Should not fallback when sourceType is explicit
    });

    test('should respect sourceType clip-finder with timeout', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.clips.get.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => 
        useContentKitDetail({ id: 'test-id', sourceType: 'clip-finder' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('longer than expected');
      expect(mockApi.generation.getRequest).not.toHaveBeenCalled(); // Should not try generation when sourceType is explicit
    });
  });

  describe('Error message specificity', () => {
    test('should provide specific guidance for different error types', async () => {
      const scenarios = [
        {
          error: new Error('timeout of 60000ms exceeded'),
          code: 'ECONNABORTED',
          expectedMessage: 'Loading is taking longer than expected',
        },
        {
          error: new Error('Network Error'),
          code: undefined,
          expectedMessage: 'Network connection issue',
        },
        {
          error: new Error('Request failed with status code 500'),
          code: undefined,
          expectedMessage: 'Server error occurred',
        },
        {
          error: new Error('Content not found'),
          code: undefined,
          expectedMessage: 'Content not found',
        },
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        
        if (scenario.code) {
          (scenario.error as any).code = scenario.code;
        }

        mockApi.generation.getRequest.mockRejectedValue(scenario.error);
        mockApi.clips.get.mkRejectedValue(scenario.error);

        const { result } = renderHook(() => 
          useContentKitDetail({ id: 'test-id' })
        );

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toContain(scenario.expectedMessage);
      }
    });
  });
});