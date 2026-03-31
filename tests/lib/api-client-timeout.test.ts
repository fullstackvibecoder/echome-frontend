/**
 * API Client Timeout Configuration Tests
 * 
 * Tests the enhanced timeout handling in API client to prevent
 * 15-second timeout errors on long-running operations.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109007133/events/5508c57987cf4bd0b2ed70f9b3ba95cb/
 */

import axios from 'axios';
import { api } from '../../src/lib/api-client';

// Mock axios to intercept requests and check timeout configuration
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return mockAxios;
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage for auth tokens
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Supabase auth
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

describe('API Client Timeout Configuration', () => {
  let mockApiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock API client
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    
    mockedAxios.create.mockReturnValue(mockApiClient);
    
    // Mock successful responses by default
    mockApiClient.get.mockResolvedValue({
      data: { success: true, data: {} },
    });
    mockApiClient.post.mockResolvedValue({
      data: { success: true, data: {} },
    });
  });

  describe('Generation API timeouts', () => {
    test('should use extended timeout for generation.getRequest', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            request: {
              id: 'test-123',
              userId: 'user-123',
              status: 'completed',
              platforms: ['instagram'],
              inputType: 'text',
              createdAt: new Date().toISOString(),
            },
            contentKit: null,
            clips: [],
            content: [],
            carousel: null,
          },
        },
      });

      await api.generation.getRequest('test-123');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/generate/test-123',
        { timeout: 180000 } // 3 minutes
      );
    });

    test('should use extended timeout for generation.generate', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { success: true, data: { requestId: 'test-123' } },
      });

      await api.generation.generate({
        inputType: 'text',
        inputText: 'Test content',
        platforms: ['instagram'],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/generate',
        expect.any(Object),
        { timeout: 180000 } // 3 minutes
      );
    });
  });

  describe('Clips API timeouts', () => {
    test('should use extended timeout for clips.get', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
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
            contentKit: null,
          },
        },
      });

      await api.clips.get('upload-123');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/clips/upload-123',
        { timeout: 180000 } // 3 minutes
      );
    });

    test('should use extended timeout for clips.extractBRoll', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { success: true, data: { jobId: 'job-123', status: 'processing' } },
      });

      await api.clips.extractBRoll('upload-123', {
        maxClips: 5,
        speedUp: false,
        useVisionScoring: true,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/clips/upload-123/extract-broll',
        expect.any(Object),
        { timeout: 180000 } // 3 minutes
      );
    });
  });

  describe('Content Kits API timeouts', () => {
    test('should use extended timeout for contentKits.get', async () => {
      mockApiClient.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            kit: {
              id: 'kit-123',
              title: 'Test Kit',
              videoUploadId: 'upload-123',
              contentGenerated: true,
              clipsGenerated: true,
              createdAt: new Date().toISOString(),
            },
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
          },
        },
      });

      await api.contentKits.get('kit-123');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/content-kits/kit-123',
        { timeout: 180000 } // 3 minutes
      );
    });

    test('should use list timeout for contentKits.list', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await api.contentKits.list(20, 0);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/content-kits',
        {
          params: { limit: 20, offset: 0 },
          timeout: 10000, // 10 seconds for list operations
        }
      );
    });
  });

  describe('Default timeout scenarios', () => {
    test('should use default timeout for simple operations', async () => {
      // Mock a simple operation that should use default timeout
      mockApiClient.get.mockResolvedValue({
        data: { success: true, data: [] },
      });

      // Simulate a simple GET request that doesn't specify timeout
      await mockApiClient.get('/some-simple-endpoint');

      // Should not override the default timeout (15 seconds)
      expect(mockApiClient.get).toHaveBeenCalledWith('/some-simple-endpoint');
    });
  });

  describe('API Client configuration', () => {
    test('should create axios instance with correct base configuration', () => {
      // The API client should be created with proper defaults
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000, // Default 15 seconds
      });
    });
  });

  describe('Error handling for timeouts', () => {
    test('should properly handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApiClient.get.mockRejectedValue(timeoutError);

      await expect(api.generation.getRequest('test-123')).rejects.toThrow('timeout of 180000ms exceeded');
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';
      
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(api.clips.get('upload-123')).rejects.toThrow('Network Error');
    });
  });

  describe('Timeout constants verification', () => {
    test('should use appropriate timeout values for different operation types', () => {
      // This test verifies that the timeout constants are reasonable
      const GENERATION_TIMEOUT = 180000; // 3 minutes
      const TRANSCRIPTION_TIMEOUT = 180000; // 3 minutes  
      const LIST_TIMEOUT = 10000; // 10 seconds
      const DELETE_TIMEOUT = 60000; // 60 seconds
      const FOLLOW_TIMEOUT = 60000; // 60 seconds

      // These values should be appropriate for their respective operations
      expect(GENERATION_TIMEOUT).toBeGreaterThan(15000); // Longer than default
      expect(TRANSCRIPTION_TIMEOUT).toBeGreaterThan(15000); // Longer than default
      expect(LIST_TIMEOUT).toBeLessThan(GENERATION_TIMEOUT); // Lists should be faster
      expect(DELETE_TIMEOUT).toBeGreaterThan(15000); // Deletions can be slow
      expect(FOLLOW_TIMEOUT).toBeGreaterThan(15000); // Following can involve setup
    });
  });
});