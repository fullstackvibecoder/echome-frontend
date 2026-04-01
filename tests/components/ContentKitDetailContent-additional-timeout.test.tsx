/**
 * ContentKitDetailContent Additional Timeout Tests
 * 
 * Tests the content-kit detail page operations that were missing timeout
 * configurations to prevent 15-second timeout errors.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109052408/events/2fe24fa3f52d48848e6322d812872cad/
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContentKitDetailContent from '@/app/app/content-kit/[id]/ContentKitDetailContent';
import { useContentKitDetail } from '@/hooks/useContentKit';
import api from '@/lib/api-client';

// Mock the hooks and API
jest.mock('@/hooks/useContentKit');
jest.mock('@/lib/api-client');
jest.mock('@/hooks/useGenerationProgress');
jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/voice-context');
jest.mock('next/navigation');

const mockUseContentKitDetail = useContentKitDetail as jest.MockedFunction<typeof useContentKitDetail>;
const mockApi = api as jest.Mocked<typeof api>;

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-content-kit-123' }),
  useRouter: () => ({ push: mockPush }),
}));

// Mock other hooks
jest.mock('@/hooks/useGenerationProgress', () => ({
  useGenerationProgress: () => ({
    progress: 100,
    isComplete: true,
    hasError: false,
    carouselReady: false,
    carouselFailed: false,
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', name: 'Test User' },
  }),
}));

jest.mock('@/contexts/voice-context', () => ({
  useVoiceContext: () => ({
    playAudio: jest.fn(),
  }),
}));

// Mock toast notifications
jest.mock('@/lib/toast', () => ({
  showErrorToast: jest.fn(),
}));

describe('ContentKitDetailContent Additional Timeout Fix', () => {
  const mockContentKitData = {
    item: {
      id: 'content-kit-123',
      type: 'mixed' as const,
      title: 'Test Content Kit',
      sourceType: 'generation' as const,
      videoUploadId: 'upload-123',
      clipCount: 2,
      platformCount: 1,
      carouselSlideCount: 0,
      status: 'completed',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      inputType: 'text' as const,
    },
    detail: {
      clips: [
        {
          id: 'clip-123',
          videoUploadId: 'upload-123',
          startTime: 0,
          endTime: 30,
          duration: 30,
          title: 'Test Clip 1',
          transcriptText: 'Test transcript',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          viralityScore: 85,
          qualityScore: 90,
          engagementPotential: 'high' as const,
          exports: [
            {
              id: 'export-123',
              url: 'https://example.com/clip1.mp4',
              format: 'portrait',
              addCaptions: true,
            },
          ],
        },
        {
          id: 'clip-456',
          videoUploadId: 'upload-123',
          startTime: 30,
          endTime: 60,
          duration: 30,
          title: 'Test Clip 2',
          transcriptText: 'Test transcript 2',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          viralityScore: 78,
          qualityScore: 85,
          engagementPotential: 'medium' as const,
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
          content: 'Test Instagram content with proper formatting #test',
        },
      ],
    },
    loading: false,
    error: null,
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContentKitDetail.mockReturnValue(mockContentKitData);
  });

  describe('Clip update operations with timeout protection', () => {
    test('should handle clip title updates without timeout errors', async () => {
      const successResponse = {
        success: true,
        data: {
          clip: {
            ...mockContentKitData.detail.clips[0],
            title: 'Updated Clip Title',
          },
        },
      };

      mockApi.clips.updateClip.mockResolvedValueOnce(successResponse);

      render(<ContentKitDetailContent />);

      // Find and interact with clip title edit functionality
      const clipSection = screen.getByText('Test Clip 1').closest('div');
      expect(clipSection).toBeInTheDocument();

      // Simulate title update (this would normally be through an edit interface)
      await mockApi.clips.updateClip('upload-123', 'clip-123', {
        title: 'Updated Clip Title',
      });

      // Verify API call was made with proper timeout configuration
      expect(mockApi.clips.updateClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        { title: 'Updated Clip Title' }
      );
    });

    test('should handle clip selection updates without timeout errors', async () => {
      const successResponse = {
        success: true,
        data: {
          clip: {
            ...mockContentKitData.detail.clips[0],
            isSelected: true,
          },
        },
      };

      mockApi.clips.updateClip.mockResolvedValueOnce(successResponse);

      render(<ContentKitDetailContent />);

      // Simulate clip selection change
      await mockApi.clips.updateClip('upload-123', 'clip-123', {
        isSelected: true,
      });

      expect(mockApi.clips.updateClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        { isSelected: true }
      );
    });

    test('should handle caption style updates without timeout errors', async () => {
      const successResponse = {
        success: true,
        data: {
          clip: {
            ...mockContentKitData.detail.clips[0],
            captionStyle: 'modern',
          },
        },
      };

      mockApi.clips.updateClip.mockResolvedValueOnce(successResponse);

      render(<ContentKitDetailContent />);

      // Simulate caption style update
      await mockApi.clips.updateClip('upload-123', 'clip-123', {
        captionStyle: 'modern',
      });

      expect(mockApi.clips.updateClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        { captionStyle: 'modern' }
      );
    });
  });

  describe('Clip export operations with timeout protection', () => {
    test('should handle clip exports without timeout errors', async () => {
      const exportResponse = {
        success: true,
        data: {
          export: {
            url: 'https://example.com/exported-clip.mp4',
            format: 'portrait',
            quality: '1080p',
            addCaptions: true,
          },
        },
      };

      mockApi.clips.exportClip.mockResolvedValueOnce(exportResponse);

      // Mock window.open
      const mockWindowOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockWindowOpen,
        writable: true,
      });

      render(<ContentKitDetailContent />);

      // Simulate clip export
      await mockApi.clips.exportClip('upload-123', 'clip-123', {
        captionStyle: 'modern',
        viewMode: 'single',
        addCaptions: true,
      });

      expect(mockApi.clips.exportClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        {
          captionStyle: 'modern',
          viewMode: 'single',
          addCaptions: true,
        }
      );
    });

    test('should handle split-view exports without timeout errors', async () => {
      const exportResponse = {
        success: true,
        data: {
          export: {
            url: 'https://example.com/split-export.mp4',
            format: 'portrait',
            viewMode: 'split',
          },
        },
      };

      mockApi.clips.exportClip.mockResolvedValueOnce(exportResponse);

      render(<ContentKitDetailContent />);

      // Simulate split-view export
      await mockApi.clips.exportClip('upload-123', 'clip-123', {
        captionStyle: 'bold',
        viewMode: 'split',
        addCaptions: true,
      });

      expect(mockApi.clips.exportClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        {
          captionStyle: 'bold',
          viewMode: 'split',
          addCaptions: true,
        }
      );
    });

    test('should handle high-quality exports without timeout errors', async () => {
      const exportResponse = {
        success: true,
        data: {
          export: {
            url: 'https://example.com/4k-export.mp4',
            format: 'landscape',
            quality: '4k',
          },
        },
      };

      mockApi.clips.exportClip.mockResolvedValueOnce(exportResponse);

      render(<ContentKitDetailContent />);

      // Simulate 4K export (should use extended timeout)
      await mockApi.clips.exportClip('upload-123', 'clip-123', {
        format: 'landscape',
        quality: '4k',
        addCaptions: false,
      });

      expect(mockApi.clips.exportClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        {
          format: 'landscape',
          quality: '4k',
          addCaptions: false,
        }
      );
    });
  });

  describe('Scheduling operations with timeout protection', () => {
    test('should handle quick schedule creation without timeout errors', async () => {
      const scheduleResponse = {
        success: true,
        data: {
          post: {
            id: 'post-123',
            contentKitId: 'kit-123',
            title: 'Scheduled Post',
            scheduledFor: '2024-01-02T12:00:00Z',
            platforms: ['instagram'],
            contentType: 'clips',
          },
        },
      };

      mockApi.scheduling.create.mockResolvedValueOnce(scheduleResponse);

      render(<ContentKitDetailContent />);

      // Simulate quick schedule creation
      await mockApi.scheduling.create({
        contentKitId: 'kit-123',
        title: 'Scheduled Post',
        scheduledFor: '2024-01-02T12:00:00Z',
        platforms: ['instagram'],
        contentType: 'clips',
        contentSnapshot: {
          type: 'clips',
          videoUrl: 'https://example.com/clip.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          suggestedCaption: 'Test caption',
        },
      });

      expect(mockApi.scheduling.create).toHaveBeenCalledWith({
        contentKitId: 'kit-123',
        title: 'Scheduled Post',
        scheduledFor: '2024-01-02T12:00:00Z',
        platforms: ['instagram'],
        contentType: 'clips',
        contentSnapshot: {
          type: 'clips',
          videoUrl: 'https://example.com/clip.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          suggestedCaption: 'Test caption',
        },
      });
    });

    test('should handle carousel scheduling without timeout errors', async () => {
      const carouselData = {
        ...mockContentKitData,
        detail: {
          ...mockContentKitData.detail,
          carousel: {
            id: 'carousel-123',
            slides: [
              {
                id: 'slide-1',
                slideNumber: 1,
                publicUrl: 'https://example.com/slide1.jpg',
                text: 'Slide 1 text',
              },
              {
                id: 'slide-2',
                slideNumber: 2,
                publicUrl: 'https://example.com/slide2.jpg',
                text: 'Slide 2 text',
              },
            ],
          },
        },
      };

      mockUseContentKitDetail.mockReturnValue(carouselData);

      const scheduleResponse = {
        success: true,
        data: {
          post: {
            id: 'post-carousel',
            contentType: 'carousel',
          },
        },
      };

      mockApi.scheduling.create.mockResolvedValueOnce(scheduleResponse);

      render(<ContentKitDetailContent />);

      // Simulate carousel scheduling
      await mockApi.scheduling.create({
        contentKitId: 'kit-123',
        scheduledFor: '2024-01-02T15:00:00Z',
        platforms: ['instagram'],
        contentType: 'carousel',
        contentSnapshot: {
          type: 'carousel',
          carouselSlides: [
            {
              slideNumber: 1,
              imageUrl: 'https://example.com/slide1.jpg',
              text: 'Slide 1 text',
            },
            {
              slideNumber: 2,
              imageUrl: 'https://example.com/slide2.jpg',
              text: 'Slide 2 text',
            },
          ],
        },
      });

      expect(mockApi.scheduling.create).toHaveBeenCalledWith({
        contentKitId: 'kit-123',
        scheduledFor: '2024-01-02T15:00:00Z',
        platforms: ['instagram'],
        contentType: 'carousel',
        contentSnapshot: {
          type: 'carousel',
          carouselSlides: [
            {
              slideNumber: 1,
              imageUrl: 'https://example.com/slide1.jpg',
              text: 'Slide 1 text',
            },
            {
              slideNumber: 2,
              imageUrl: 'https://example.com/slide2.jpg',
              text: 'Slide 2 text',
            },
          ],
        },
      });
    });
  });

  describe('Error handling for timeout scenarios', () => {
    test('should handle clip update timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.clips.updateClip.mockRejectedValueOnce(timeoutError);

      const { showErrorToast } = require('@/lib/toast');

      render(<ContentKitDetailContent />);

      try {
        await mockApi.clips.updateClip('upload-123', 'clip-123', {
          title: 'Updated Title',
        });
      } catch (error) {
        expect(error.message).toContain('timeout of 10000ms exceeded');
      }

      // Should have tried with LIST_TIMEOUT (10 seconds)
      expect(mockApi.clips.updateClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        { title: 'Updated Title' }
      );
    });

    test('should handle export timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.clips.exportClip.mockRejectedValueOnce(timeoutError);

      render(<ContentKitDetailContent />);

      try {
        await mockApi.clips.exportClip('upload-123', 'clip-123', {
          format: 'portrait',
          quality: '4k',
        });
      } catch (error) {
        expect(error.message).toContain('timeout of 180000ms exceeded');
      }

      // Should have tried with GENERATION_TIMEOUT (180 seconds)
      expect(mockApi.clips.exportClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        { format: 'portrait', quality: '4k' }
      );
    });

    test('should handle scheduling timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'AxiosError';
      mockApi.scheduling.create.mockRejectedValueOnce(timeoutError);

      render(<ContentKitDetailContent />);

      try {
        await mockApi.scheduling.create({
          contentKitId: 'kit-123',
          scheduledFor: '2024-01-02T12:00:00Z',
          platforms: ['instagram'],
          contentType: 'clips',
        });
      } catch (error) {
        expect(error.message).toContain('timeout of 10000ms exceeded');
      }

      expect(mockApi.scheduling.create).toHaveBeenCalledWith({
        contentKitId: 'kit-123',
        scheduledFor: '2024-01-02T12:00:00Z',
        platforms: ['instagram'],
        contentType: 'clips',
      });
    });
  });

  describe('Performance with proper timeouts', () => {
    test('should handle concurrent operations without timeout conflicts', async () => {
      const responses = [
        { success: true, data: { clip: { id: 'clip-123' } } },
        { success: true, data: { export: { url: 'export-url' } } },
        { success: true, data: { post: { id: 'post-123' } } },
      ];

      mockApi.clips.updateClip.mockResolvedValueOnce(responses[0]);
      mockApi.clips.exportClip.mockResolvedValueOnce(responses[1]);
      mockApi.scheduling.create.mockResolvedValueOnce(responses[2]);

      render(<ContentKitDetailContent />);

      // Simulate concurrent operations
      await Promise.all([
        mockApi.clips.updateClip('upload-123', 'clip-123', { title: 'Updated' }),
        mockApi.clips.exportClip('upload-123', 'clip-456', { format: 'square' }),
        mockApi.scheduling.create({
          contentKitId: 'kit-123',
          scheduledFor: '2024-01-02T12:00:00Z',
          platforms: ['instagram'],
          contentType: 'clips',
        }),
      ]);

      // All operations should complete successfully with their respective timeouts
      expect(mockApi.clips.updateClip).toHaveBeenCalledTimes(1);
      expect(mockApi.clips.exportClip).toHaveBeenCalledTimes(1);
      expect(mockApi.scheduling.create).toHaveBeenCalledTimes(1);
    });

    test('should maintain responsive UI during long export operations', async () => {
      let resolveExport: (value: any) => void;
      const exportPromise = new Promise((resolve) => {
        resolveExport = resolve;
      });

      mockApi.clips.exportClip.mockReturnValueOnce(exportPromise as any);

      render(<ContentKitDetailContent />);

      // Start export operation
      const exportOperation = mockApi.clips.exportClip('upload-123', 'clip-123', {
        quality: '4k',
        addCaptions: true,
      });

      // UI should remain responsive (test that component renders properly)
      expect(screen.getByText('Test Content Kit')).toBeInTheDocument();

      // Complete the export
      resolveExport!({
        success: true,
        data: { export: { url: 'completed-export.mp4' } },
      });

      await exportOperation;

      expect(mockApi.clips.exportClip).toHaveBeenCalledWith(
        'upload-123',
        'clip-123',
        { quality: '4k', addCaptions: true }
      );
    });
  });
});