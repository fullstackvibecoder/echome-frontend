/**
 * Content Kit Detail Timeout Fix Tests
 * 
 * Tests the enhanced timeout handling in content-kit detail pages to prevent
 * 15-second timeout errors on generation and clip requests.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109028993/events/33b0ceb2537e4f45af156363ef557e1d/
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useContentKitDetail } from '@/hooks/useContentKit';
import api from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    generation: {
      getRequest: jest.fn(),
    },
    clips: {
      get: jest.fn(),
    },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

// Mock data
const mockGenerationResponse = {
  success: true,
  data: {
    request: {
      id: 'req-123',
      userId: 'user-123',
      inputText: 'Test content generation request',
      platforms: ['instagram', 'tiktok'],
      status: 'completed',
      voiceScore: 85,
      qualityScore: 90,
      inputType: 'text' as const,
      createdAt: '2024-01-01T00:00:00Z',
    },
    clips: [
      {
        id: 'clip-123',
        videoUploadId: 'upload-123',
        startTime: 0,
        endTime: 30,
        duration: 30,
        title: 'Test Clip',
        transcriptText: 'This is a test clip',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        viralityScore: 85,
        qualityScore: 90,
        engagementPotential: 'high' as const,
      },
    ],
    contentKit: {
      id: 'kit-123',
      userId: 'user-123',
      title: 'Test Content Kit',
      videoUploadId: 'upload-123',
      generationRequestId: 'req-123',
      contentGenerated: true,
      clipsGenerated: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
    carousel: null,
    content: [
      {
        platform: 'instagram',
        content: 'Test Instagram content',
      },
    ],
  },
};

const mockClipResponse = {
  success: true,
  data: {
    upload: {
      id: 'upload-123',
      userId: 'user-123',
      sourceType: 'upload' as const,
      originalFilename: 'test.mp4',
      status: 'completed',
      fileSizeBytes: 1000000,
      mimeType: 'video/mp4',
      createdAt: '2024-01-01T00:00:00Z',
    },
    clips: [
      {
        id: 'clip-123',
        videoUploadId: 'upload-123',
        startTime: 0,
        endTime: 30,
        duration: 30,
        title: 'Test Clip',
        transcriptText: 'This is a test clip',
        viralityScore: 85,
        qualityScore: 90,
        engagementPotential: 'high' as const,
      },
    ],
    contentKit: null,
  },
};

describe('useContentKitDetail Timeout Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful requests with extended timeouts', () => {
    test('should successfully load generation request without timeout', async () => {
      mockApi.generation.getRequest.mockResolvedValueOnce(mockGenerationResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-123', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.id).toBe('req-123');
      expect(result.current.item?.type).toBe('mixed');
      expect(result.current.detail?.clips).toHaveLength(1);
      expect(result.current.detail?.contentKit).toBeDefined();
    });

    test('should successfully load clip finder data without timeout', async () => {
      mockApi.clips.get.mockResolvedValueOnce(mockClipResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'upload-123', sourceType: 'clip-finder' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.id).toBe('upload-123');
      expect(result.current.detail?.clips).toHaveLength(1);
    });

    test('should fallback from generation to clips when generation not found', async () => {
      mockApi.generation.getRequest.mockRejectedValueOnce(new Error('Not found'));
      mockApi.clips.get.mockResolvedValueOnce(mockClipResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'upload-123', sourceType: 'auto' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.sourceType).toBe('clip-finder');
      expect(mockApi.generation.getRequest).toHaveBeenCalledWith('upload-123');
      expect(mockApi.clips.get).toHaveBeenCalledWith('upload-123');
    });
  });

  describe('Timeout simulation and error handling', () => {
    test('should handle generation request timeout gracefully', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-123', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('timeout of 180000ms exceeded');
      expect(result.current.item).toBeNull();
    });

    test('should handle clips request timeout gracefully', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.clips.get.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'upload-123', sourceType: 'clip-finder' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('timeout of 180000ms exceeded');
      expect(result.current.item).toBeNull();
    });

    test('should try clips endpoint when generation times out in auto mode', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);
      mockApi.clips.get.mockResolvedValueOnce(mockClipResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'content-123', sourceType: 'auto' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should succeed with clips data after generation timeout
      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.sourceType).toBe('clip-finder');
      expect(mockApi.generation.getRequest).toHaveBeenCalledWith('content-123');
      expect(mockApi.clips.get).toHaveBeenCalledWith('content-123');
    });

    test('should handle both endpoints timing out in auto mode', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);
      mockApi.clips.get.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'content-123', sourceType: 'auto' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Content not found');
      expect(result.current.item).toBeNull();
      expect(mockApi.generation.getRequest).toHaveBeenCalledWith('content-123');
      expect(mockApi.clips.get).toHaveBeenCalledWith('content-123');
    });
  });

  describe('Network error handling', () => {
    test('should handle network errors on generation request', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'AxiosError';
      mockApi.generation.getRequest.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-123', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network Error');
      expect(result.current.item).toBeNull();
    });

    test('should handle network errors on clips request', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'AxiosError';
      mockApi.clips.get.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'upload-123', sourceType: 'clip-finder' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network Error');
      expect(result.current.item).toBeNull();
    });
  });

  describe('Loading states and refresh functionality', () => {
    test('should show loading state during request', async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockApi.generation.getRequest.mockReturnValueOnce(delayedPromise as any);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-123', sourceType: 'generation' })
      );

      // Should be loading initially
      expect(result.current.loading).toBe(true);
      expect(result.current.item).toBeNull();
      expect(result.current.error).toBeNull();

      // Resolve the promise
      resolvePromise!(mockGenerationResponse);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.item).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    test('should handle refresh functionality with timeout protection', async () => {
      mockApi.generation.getRequest.mockResolvedValueOnce(mockGenerationResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-123', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.item).toBeDefined();
      expect(result.current.error).toBeNull();

      // Test refresh with timeout
      const timeoutError = new Error('timeout of 180000ms exceeded');
      mockApi.generation.getRequest.mockRejectedValueOnce(timeoutError);

      await result.current.refresh();

      expect(result.current.error).toContain('timeout of 180000ms exceeded');
      expect(result.current.item).toBeNull();
    });
  });

  describe('Data transformation and edge cases', () => {
    test('should handle generation response with minimal data', async () => {
      const minimalResponse = {
        success: true,
        data: {
          request: {
            id: 'req-minimal',
            userId: 'user-123',
            inputText: '',
            platforms: [],
            status: 'pending',
            inputType: 'text' as const,
            createdAt: '2024-01-01T00:00:00Z',
          },
          clips: [],
          contentKit: null,
          carousel: null,
          content: [],
        },
      };

      mockApi.generation.getRequest.mockResolvedValueOnce(minimalResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-minimal', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.type).toBe('text');
      expect(result.current.item?.clipCount).toBe(0);
      expect(result.current.item?.platformCount).toBe(0);
    });

    test('should handle clip response with minimal data', async () => {
      const minimalClipResponse = {
        success: true,
        data: {
          upload: {
            id: 'upload-minimal',
            userId: 'user-123',
            sourceType: 'upload' as const,
            status: 'processing',
            createdAt: '2024-01-01T00:00:00Z',
          },
          clips: [],
          contentKit: null,
        },
      };

      mockApi.clips.get.mockResolvedValueOnce(minimalClipResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'upload-minimal', sourceType: 'clip-finder' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.clipCount).toBe(0);
      expect(result.current.item?.status).toBe('processing');
    });

    test('should handle empty ID gracefully', () => {
      const { result } = renderHook(() =>
        useContentKitDetail({ id: '', sourceType: 'auto' })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.item).toBeNull();
      expect(result.current.error).toBeNull();
      
      // Should not make API calls with empty ID
      expect(mockApi.generation.getRequest).not.toHaveBeenCalled();
      expect(mockApi.clips.get).not.toHaveBeenCalled();
    });

    test('should handle carousel-only content type', async () => {
      const carouselResponse = {
        success: true,
        data: {
          request: {
            id: 'req-carousel',
            userId: 'user-123',
            inputText: 'Carousel content',
            platforms: ['instagram'],
            status: 'completed',
            inputType: 'text' as const,
            createdAt: '2024-01-01T00:00:00Z',
          },
          clips: [],
          contentKit: null,
          carousel: {
            id: 'carousel-123',
            slides: [
              { id: 'slide-1', imageUrl: 'https://example.com/1.jpg', text: 'Slide 1' },
              { id: 'slide-2', imageUrl: 'https://example.com/2.jpg', text: 'Slide 2' },
            ],
          },
          content: [],
        },
      };

      mockApi.generation.getRequest.mockResolvedValueOnce(carouselResponse);

      const { result } = renderHook(() =>
        useContentKitDetail({ id: 'req-carousel', sourceType: 'generation' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.item).toBeDefined();
      expect(result.current.item?.type).toBe('carousel');
      expect(result.current.item?.carouselSlideCount).toBe(2);
      expect(result.current.detail?.carousel).toBeDefined();
    });
  });
});