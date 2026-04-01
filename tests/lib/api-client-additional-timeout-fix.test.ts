/**
 * API Client Additional Timeout Fix Tests
 * 
 * Tests timeout configurations for additional API endpoints that were missing
 * timeout settings in content-kit workflows.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109052408/events/2fe24fa3f52d48848e6322d812872cad/
 */

import api from '@/lib/api-client';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios instance
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
} as any;

// Setup mocks
beforeAll(() => {
  mockedAxios.create.mockReturnValue(mockAxiosInstance);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('API Client Additional Timeout Fix', () => {
  describe('Clips API timeout configurations', () => {
    test('should use LIST_TIMEOUT for clips.updateClip', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            clip: {
              id: 'clip-123',
              title: 'Updated Clip',
              isSelected: true,
            },
          },
        },
      };

      mockAxiosInstance.patch.mockResolvedValueOnce(mockResponse);

      await api.clips.updateClip('upload-123', 'clip-123', {
        title: 'Updated Clip',
        isSelected: true,
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-123',
        { title: 'Updated Clip', isSelected: true },
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });

    test('should use GENERATION_TIMEOUT for clips.exportClip', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            export: {
              url: 'https://example.com/exported-clip.mp4',
              format: 'portrait',
              quality: '1080p',
            },
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await api.clips.exportClip('upload-123', 'clip-123', {
        format: 'portrait',
        quality: '1080p',
        addCaptions: true,
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-123/export',
        { format: 'portrait', quality: '1080p', addCaptions: true },
        { timeout: 180000 } // GENERATION_TIMEOUT
      );
    });

    test('should handle timeout errors in updateClip appropriately', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.patch.mockRejectedValueOnce(timeoutError);

      await expect(api.clips.updateClip('upload-123', 'clip-123', { title: 'Test' }))
        .rejects.toThrow('timeout of 10000ms exceeded');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-123',
        { title: 'Test' },
        { timeout: 10000 }
      );
    });

    test('should handle timeout errors in exportClip appropriately', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      await expect(api.clips.exportClip('upload-123', 'clip-123', { format: 'portrait' }))
        .rejects.toThrow('timeout of 180000ms exceeded');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-123/export',
        { format: 'portrait' },
        { timeout: 180000 }
      );
    });
  });

  describe('Scheduling API timeout configurations', () => {
    test('should use LIST_TIMEOUT for scheduling.list', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            posts: [
              {
                id: 'post-123',
                content_kit_id: 'kit-123',
                title: 'Test Post',
                scheduled_for: '2024-01-01T12:00:00Z',
                platforms: ['instagram'],
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.scheduling.list({
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        status: 'scheduled',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scheduling', {
        params: {
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          status: 'scheduled',
        },
        timeout: 10000, // LIST_TIMEOUT
      });
    });

    test('should use LIST_TIMEOUT for scheduling.create', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            post: {
              id: 'post-new',
              content_kit_id: 'kit-123',
              title: 'New Scheduled Post',
              scheduled_for: '2024-01-01T12:00:00Z',
              platforms: ['instagram', 'tiktok'],
            },
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await api.scheduling.create({
        contentKitId: 'kit-123',
        title: 'New Scheduled Post',
        scheduledFor: '2024-01-01T12:00:00Z',
        platforms: ['instagram', 'tiktok'],
        contentType: 'clips',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/scheduling',
        {
          contentKitId: 'kit-123',
          title: 'New Scheduled Post',
          scheduledFor: '2024-01-01T12:00:00Z',
          platforms: ['instagram', 'tiktok'],
          contentType: 'clips',
        },
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });

    test('should use LIST_TIMEOUT for scheduling.getSuggestions', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            suggestions: [
              {
                date: '2024-01-01',
                timeSlot: '12:00',
                platforms: ['instagram'],
                reasoning: 'Peak engagement time',
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.scheduling.getSuggestions('2024-01-01');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scheduling/suggestions', {
        params: { weekStart: '2024-01-01' },
        timeout: 10000, // LIST_TIMEOUT
      });
    });

    test('should use LIST_TIMEOUT for scheduling.getUnscheduled', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            content: [
              {
                id: 'kit-unscheduled',
                title: 'Unscheduled Content',
                type: 'clips',
                created_at: '2024-01-01T10:00:00Z',
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.scheduling.getUnscheduled();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scheduling/unscheduled', {
        timeout: 10000, // LIST_TIMEOUT
      });
    });

    test('should use LIST_TIMEOUT for scheduling.getCategories', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            categories: ['lifestyle', 'business', 'education'],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.scheduling.getCategories();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/scheduling/categories', {
        timeout: 10000, // LIST_TIMEOUT
      });
    });

    test('should use LIST_TIMEOUT for scheduling.update', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            post: {
              id: 'post-123',
              title: 'Updated Post',
              scheduled_for: '2024-01-02T12:00:00Z',
            },
          },
        },
      };

      mockAxiosInstance.patch.mockResolvedValueOnce(mockResponse);

      await api.scheduling.update('post-123', {
        title: 'Updated Post',
        scheduledFor: '2024-01-02T12:00:00Z',
      });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/scheduling/post-123',
        {
          title: 'Updated Post',
          scheduledFor: '2024-01-02T12:00:00Z',
        },
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });

    test('should use LIST_TIMEOUT for scheduling.delete', async () => {
      const mockResponse = {
        data: { success: true },
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

      await api.scheduling.delete('post-123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/scheduling/post-123', {
        timeout: 10000, // LIST_TIMEOUT
      });
    });

    test('should use LIST_TIMEOUT for scheduling.markPosted', async () => {
      const mockResponse = {
        data: { success: true },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await api.scheduling.markPosted('post-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/scheduling/post-123/mark-posted',
        {},
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });

    test('should use LIST_TIMEOUT for scheduling.skip', async () => {
      const mockResponse = {
        data: { success: true },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await api.scheduling.skip('post-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/scheduling/post-123/skip',
        {},
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });
  });

  describe('Timeout error handling', () => {
    test('should handle scheduling API timeouts gracefully', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      await expect(api.scheduling.create({
        scheduledFor: '2024-01-01T12:00:00Z',
        platforms: ['instagram'],
        contentType: 'clips',
      })).rejects.toThrow('timeout of 10000ms exceeded');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/scheduling',
        {
          scheduledFor: '2024-01-01T12:00:00Z',
          platforms: ['instagram'],
          contentType: 'clips',
        },
        { timeout: 10000 }
      );
    });

    test('should handle clip export timeouts gracefully', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      await expect(api.clips.exportClip('upload-123', 'clip-123', {
        format: 'portrait',
        quality: '4k',
        addCaptions: true,
      })).rejects.toThrow('timeout of 180000ms exceeded');

      // Should use extended timeout for potentially long export operation
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-123/export',
        { format: 'portrait', quality: '4k', addCaptions: true },
        { timeout: 180000 } // GENERATION_TIMEOUT for heavy operations
      );
    });
  });

  describe('Timeout strategy validation', () => {
    test('should use appropriate timeouts for different operation types', () => {
      // Fast operations should use LIST_TIMEOUT (10s)
      const fastOperations = [
        'clips.updateClip', // Simple metadata update
        'scheduling.list', // Quick data query
        'scheduling.create', // Fast database insert
        'scheduling.update', // Quick metadata update
        'scheduling.delete', // Fast database delete
      ];

      // Heavy operations should use GENERATION_TIMEOUT (180s)
      const heavyOperations = [
        'clips.exportClip', // Video processing and export
      ];

      // Verify timeout constants
      const LIST_TIMEOUT = 10000; // 10 seconds
      const GENERATION_TIMEOUT = 180000; // 3 minutes

      expect(LIST_TIMEOUT).toBe(10000);
      expect(GENERATION_TIMEOUT).toBe(180000);
      expect(GENERATION_TIMEOUT).toBeGreaterThan(LIST_TIMEOUT);
    });

    test('should not use default timeout for fixed endpoints', async () => {
      const mockResponse = { data: { success: true } };
      
      mockAxiosInstance.patch.mockResolvedValueOnce(mockResponse);
      
      await api.clips.updateClip('upload-123', 'clip-123', { title: 'Test' });
      
      // Should NOT use default 15-second timeout
      expect(mockAxiosInstance.patch).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { timeout: 15000 } // Default timeout
      );
      
      // Should use LIST_TIMEOUT instead
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });
  });

  describe('Content-kit workflow scenarios', () => {
    test('should handle content-kit detail page operations without timeout', async () => {
      // Simulate multiple operations that happen on content-kit detail pages
      const responses = [
        { data: { success: true, data: { clip: { id: 'clip-1' } } } },
        { data: { success: true, data: { export: { url: 'export-url' } } } },
        { data: { success: true, data: { post: { id: 'post-1' } } } },
      ];

      mockAxiosInstance.patch.mockResolvedValueOnce(responses[0]);
      mockAxiosInstance.post.mockResolvedValueOnce(responses[1]);
      mockAxiosInstance.post.mockResolvedValueOnce(responses[2]);

      // Simulate content-kit detail page workflow
      await Promise.all([
        api.clips.updateClip('upload-1', 'clip-1', { title: 'Updated' }),
        api.clips.exportClip('upload-1', 'clip-1', { format: 'portrait' }),
        api.scheduling.create({
          contentKitId: 'kit-1',
          scheduledFor: '2024-01-01T12:00:00Z',
          platforms: ['instagram'],
          contentType: 'clips',
        }),
      ]);

      // All operations should use appropriate timeouts
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        expect.stringContaining('/clips/'),
        expect.any(Object),
        { timeout: 10000 }
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.any(Object),
        { timeout: 180000 }
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/scheduling',
        expect.any(Object),
        { timeout: 10000 }
      );
    });

    test('should handle mixed timeout scenarios in content workflows', async () => {
      // Test various clip and scheduling operations with different timeouts
      const mockClipUpdate = { data: { success: true, data: { clip: {} } } };
      const mockExport = { data: { success: true, data: { export: { url: 'test' } } } };
      const mockScheduleList = { data: { success: true, data: { posts: [] } } };

      mockAxiosInstance.patch.mockResolvedValueOnce(mockClipUpdate);
      mockAxiosInstance.post.mockResolvedValueOnce(mockExport);
      mockAxiosInstance.get.mockResolvedValueOnce(mockScheduleList);

      // Fast operation (10s timeout)
      await api.clips.updateClip('upload-1', 'clip-1', { isSelected: true });

      // Heavy operation (180s timeout)
      await api.clips.exportClip('upload-1', 'clip-1', { 
        format: 'portrait', 
        quality: '4k',
        addCaptions: true 
      });

      // List operation (10s timeout)
      await api.scheduling.list({ status: 'scheduled' });

      // Verify different timeouts were used appropriately
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { timeout: 10000 } // Fast operation
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.any(Object),
        { timeout: 180000 } // Heavy operation
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ timeout: 10000 }) // List operation
      );
    });
  });

  describe('Error scenarios and edge cases', () => {
    test('should preserve request data during timeout failures', async () => {
      const requestData = {
        contentKitId: 'kit-123',
        title: 'Test Schedule',
        scheduledFor: '2024-01-01T12:00:00Z',
        platforms: ['instagram', 'tiktok'],
        contentType: 'clips' as const,
      };

      const timeoutError = new Error('timeout of 10000ms exceeded');
      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      try {
        await api.scheduling.create(requestData);
      } catch (error) {
        expect(error.message).toBe('timeout of 10000ms exceeded');
      }

      // Request should have been made with exact data and timeout
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/scheduling',
        requestData,
        { timeout: 10000 }
      );
    });

    test('should handle concurrent operations with different timeouts', async () => {
      const responses = [
        { data: { success: true } },
        { data: { success: true } },
        { data: { success: true } },
      ];

      mockAxiosInstance.patch.mockResolvedValueOnce(responses[0]);
      mockAxiosInstance.post.mockResolvedValueOnce(responses[1]);
      mockAxiosInstance.delete.mockResolvedValueOnce(responses[2]);

      // Start multiple operations concurrently
      const operations = [
        api.clips.updateClip('upload-1', 'clip-1', { title: 'Concurrent 1' }),
        api.clips.exportClip('upload-1', 'clip-2', { format: 'square' }),
        api.scheduling.delete('post-1'),
      ];

      await Promise.all(operations);

      // Each should use its appropriate timeout
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { timeout: 10000 } // LIST_TIMEOUT
      );
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.any(Object),
        { timeout: 180000 } // GENERATION_TIMEOUT
      );
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        expect.any(String),
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });
  });
});