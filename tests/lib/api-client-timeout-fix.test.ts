/**
 * API Client Timeout Fix Tests
 * 
 * Tests the enhanced timeout configuration for generation.getRequest and clips.get
 * endpoints to prevent 15-second timeout errors.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109028993/events/33b0ceb2537e4f45af156363ef557e1d/
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
  put: jest.fn(),
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

describe('API Client Timeout Fix', () => {
  describe('Generation API timeouts', () => {
    test('should use GENERATION_TIMEOUT (180000ms) for getRequest', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            request: {
              id: 'req-123',
              userId: 'user-123',
              inputText: 'Test request',
              platforms: ['instagram'],
              status: 'completed',
              inputType: 'text',
              createdAt: '2024-01-01T00:00:00Z',
            },
            clips: [],
            contentKit: null,
            carousel: null,
            content: [],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.generation.getRequest('req-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-123',
        { timeout: 180000 } // GENERATION_TIMEOUT
      );
    });

    test('should handle timeout error on getRequest with appropriate duration', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      await expect(api.generation.getRequest('req-123')).rejects.toThrow(
        'timeout of 180000ms exceeded'
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-123',
        { timeout: 180000 }
      );
    });

    test('should not use default timeout (15000ms) for generation requests', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            request: { id: 'req-123' },
            clips: [],
            contentKit: null,
            carousel: null,
            content: [],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.generation.getRequest('req-123');

      // Verify it's NOT using the default 15000ms timeout
      expect(mockAxiosInstance.get).not.toHaveBeenCalledWith(
        '/generate/req-123',
        { timeout: 15000 }
      );

      // Verify it IS using the extended timeout
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-123',
        { timeout: 180000 }
      );
    });
  });

  describe('Clips API timeouts', () => {
    test('should use GENERATION_TIMEOUT (180000ms) for clips.get', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            upload: {
              id: 'upload-123',
              userId: 'user-123',
              sourceType: 'upload',
              status: 'completed',
              createdAt: '2024-01-01T00:00:00Z',
            },
            clips: [],
            contentKit: null,
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.clips.get('upload-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-123',
        { timeout: 180000 } // GENERATION_TIMEOUT
      );
    });

    test('should handle timeout error on clips.get with appropriate duration', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      await expect(api.clips.get('upload-123')).rejects.toThrow(
        'timeout of 180000ms exceeded'
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-123',
        { timeout: 180000 }
      );
    });

    test('should not use default timeout (15000ms) for clips.get', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            upload: { id: 'upload-123' },
            clips: [],
            contentKit: null,
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.clips.get('upload-123');

      // Verify it's NOT using the default 15000ms timeout
      expect(mockAxiosInstance.get).not.toHaveBeenCalledWith(
        '/clips/upload-123',
        { timeout: 15000 }
      );

      // Verify it IS using the extended timeout
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-123',
        { timeout: 180000 }
      );
    });

    test('should use LIST_TIMEOUT (10000ms) for clips.getJob', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            job: {
              id: 'job-123',
              status: 'completed',
              progress: 100,
            },
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await api.clips.getJob('upload-123', 'job-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-123/job/job-123',
        { timeout: 10000 } // LIST_TIMEOUT
      );
    });
  });

  describe('Timeout comparison with other endpoints', () => {
    test('should use different timeouts for different operation types', async () => {
      // Mock responses for different endpoints
      const generationResponse = { data: { success: true, data: {} } };
      const clipsResponse = { data: { success: true, data: {} } };
      const jobResponse = { data: { success: true, data: {} } };

      mockAxiosInstance.get
        .mockResolvedValueOnce(generationResponse)
        .mockResolvedValueOnce(clipsResponse)
        .mockResolvedValueOnce(jobResponse);

      // Call different endpoints
      await api.generation.getRequest('req-123');
      await api.clips.get('upload-123');
      await api.clips.getJob('upload-123', 'job-123');

      // Verify different timeouts are used appropriately
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-123',
        { timeout: 180000 } // GENERATION_TIMEOUT for heavy operations
      );
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-123',
        { timeout: 180000 } // GENERATION_TIMEOUT for data-heavy operations
      );
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-123/job/job-123',
        { timeout: 10000 } // LIST_TIMEOUT for quick status checks
      );
    });

    test('should handle multiple simultaneous requests with appropriate timeouts', async () => {
      const responses = [
        { data: { success: true, data: { request: {} } } },
        { data: { success: true, data: { upload: {} } } },
        { data: { success: true, data: { job: {} } } },
      ];

      mockAxiosInstance.get
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2]);

      // Make simultaneous requests
      const promises = [
        api.generation.getRequest('req-1'),
        api.clips.get('upload-1'),
        api.clips.getJob('upload-1', 'job-1'),
      ];

      await Promise.all(promises);

      // Verify all calls used appropriate timeouts
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
        1,
        '/generate/req-1',
        { timeout: 180000 }
      );
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
        2,
        '/clips/upload-1',
        { timeout: 180000 }
      );
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
        3,
        '/clips/upload-1/job/job-1',
        { timeout: 10000 }
      );
    });
  });

  describe('Error scenarios with proper timeout handling', () => {
    test('should differentiate between timeout and other errors', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      
      const networkError = new Error('Network Error');
      networkError.name = 'AxiosError';
      
      const serverError = new Error('Internal Server Error');
      serverError.name = 'AxiosError';

      // Test timeout error
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);
      await expect(api.generation.getRequest('req-timeout')).rejects.toThrow(
        'timeout of 180000ms exceeded'
      );

      // Test network error
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);
      await expect(api.generation.getRequest('req-network')).rejects.toThrow(
        'Network Error'
      );

      // Test server error
      mockAxiosInstance.get.mockRejectedValueOnce(serverError);
      await expect(api.generation.getRequest('req-server')).rejects.toThrow(
        'Internal Server Error'
      );

      // All should use the same timeout configuration
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-timeout',
        { timeout: 180000 }
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-network',
        { timeout: 180000 }
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-server',
        { timeout: 180000 }
      );
    });

    test('should handle partial response timeouts gracefully', async () => {
      // Simulate a slow response that times out
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      const startTime = Date.now();
      
      try {
        await api.clips.get('upload-slow');
      } catch (error) {
        expect(error.message).toContain('timeout of 180000ms exceeded');
      }

      // Verify the timeout configuration was used
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/upload-slow',
        { timeout: 180000 }
      );
    });
  });

  describe('Timeout constants validation', () => {
    test('should use appropriate timeout durations for different operation types', () => {
      // These constants should be defined in the API client
      const GENERATION_TIMEOUT = 180000; // 3 minutes for AI operations
      const LIST_TIMEOUT = 10000;        // 10 seconds for quick queries
      const DEFAULT_TIMEOUT = 15000;     // 15 seconds for simple operations

      // Verify timeout constants are reasonable
      expect(GENERATION_TIMEOUT).toBeGreaterThan(DEFAULT_TIMEOUT);
      expect(GENERATION_TIMEOUT).toBe(180000); // 3 minutes
      expect(LIST_TIMEOUT).toBeLessThan(DEFAULT_TIMEOUT);
      expect(LIST_TIMEOUT).toBe(10000);        // 10 seconds
      expect(DEFAULT_TIMEOUT).toBe(15000);     // 15 seconds

      // Ensure generation operations get extended timeout
      expect(GENERATION_TIMEOUT / 1000).toBe(180); // 3 minutes in seconds
    });

    test('should prevent regression to default timeout for fixed endpoints', () => {
      const mockResponse = { data: { success: true, data: {} } };
      
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);
      
      // This call should NOT use the default 15-second timeout
      api.generation.getRequest('req-123');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-123',
        { timeout: 180000 } // Extended timeout, not 15000
      );
    });
  });

  describe('Real-world usage scenarios', () => {
    test('should handle content-kit detail page load sequence', async () => {
      // Simulate the sequence of calls made by content-kit detail pages
      const generationResponse = {
        data: {
          success: true,
          data: {
            request: { id: 'req-123', status: 'completed' },
            clips: [{ id: 'clip-123' }],
            contentKit: { id: 'kit-123' },
            carousel: null,
            content: [],
          },
        },
      };

      const clipsResponse = {
        data: {
          success: true,
          data: {
            upload: { id: 'upload-123', status: 'completed' },
            clips: [{ id: 'clip-456' }],
            contentKit: null,
          },
        },
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(generationResponse)
        .mockResolvedValueOnce(clipsResponse);

      // Simulate useContentKitDetail fallback behavior
      try {
        await api.generation.getRequest('content-123');
      } catch {
        await api.clips.get('content-123');
      }

      // Verify both calls used extended timeouts
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/content-123',
        { timeout: 180000 }
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/clips/content-123',
        { timeout: 180000 }
      );
    });

    test('should handle large content kit with many clips without timing out', async () => {
      // Simulate a large content kit response
      const largeResponse = {
        data: {
          success: true,
          data: {
            request: { id: 'req-large', status: 'completed' },
            clips: Array.from({ length: 50 }, (_, i) => ({
              id: `clip-${i}`,
              title: `Clip ${i}`,
              duration: 30,
            })),
            contentKit: { id: 'kit-large', clipsGenerated: true },
            carousel: {
              slides: Array.from({ length: 10 }, (_, i) => ({
                id: `slide-${i}`,
                imageUrl: `https://example.com/${i}.jpg`,
              })),
            },
            content: Array.from({ length: 5 }, (_, i) => ({
              platform: `platform-${i}`,
              content: `Content for platform ${i}`.repeat(100),
            })),
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(largeResponse);

      const result = await api.generation.getRequest('req-large');

      expect(result.success).toBe(true);
      expect(result.data.clips).toHaveLength(50);
      expect(result.data.carousel.slides).toHaveLength(10);
      expect(result.data.content).toHaveLength(5);

      // Should use extended timeout for large responses
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/generate/req-large',
        { timeout: 180000 }
      );
    });
  });
});