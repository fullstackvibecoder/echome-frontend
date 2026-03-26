/**
 * ContentKit Detail Page Media Handling Tests
 * 
 * Tests that the content-kit detail page handles missing or invalid video sources
 * gracefully without causing NotSupportedError.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/107359747/events/7aa09e6523c34eceb48d4ceb8cea03b1/
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock the VideoPlayer component
jest.mock('@/components/content-kit/VideoPlayer', () => ({
  VideoPlayer: ({ src, poster, title, ...props }: any) => (
    <div data-testid="video-player" data-src={src} data-poster={poster} data-title={title}>
      {src ? `Video: ${src}` : 'No video source'}
    </div>
  )
}));

// Mock other dependencies
jest.mock('@/hooks/useContentKit', () => ({
  useContentKitDetail: jest.fn()
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', isAdmin: false } })
}));

jest.mock('@/contexts/voice-context', () => ({
  useVoiceContext: () => ({ activeVoice: null, isTeamsUser: false })
}));

jest.mock('@/hooks/useGenerationProgress', () => ({
  useGenerationProgress: () => ({ 
    isConnected: false, 
    currentStep: null, 
    progress: null, 
    error: null 
  }),
  mapStepToIndex: jest.fn(() => 0),
  GENERATION_STEPS: [],
  VIDEO_GENERATION_STEPS: [],
  isVideoStep: jest.fn(() => false)
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-content-kit-id' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() })
}));

import ContentKitDetailContent from '@/app/app/content-kit/[id]/ContentKitDetailContent';
import { useContentKitDetail } from '@/hooks/useContentKit';

const mockUseContentKitDetail = useContentKitDetail as jest.MockedFunction<typeof useContentKitDetail>;

describe('ContentKit Detail Page Media Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Video Export Handling', () => {
    test('should handle clips with missing exports gracefully', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Test Clip',
              duration: 30,
              viralityScore: 85,
              thumbnailUrl: 'https://example.com/thumb.jpg',
              exports: null, // Missing exports
              selectionReason: 'High engagement potential'
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should render VideoPlayer with empty string source
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', '');
      expect(videoPlayer).toHaveTextContent('No video source');
    });

    test('should handle clips with empty exports array', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Test Clip',
              duration: 30,
              viralityScore: 85,
              thumbnailUrl: 'https://example.com/thumb.jpg',
              exports: [], // Empty exports array
              selectionReason: 'High engagement potential'
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', '');
      expect(videoPlayer).toHaveTextContent('No video source');
    });

    test('should handle clips with exports but no URL', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Test Clip',
              duration: 30,
              viralityScore: 85,
              thumbnailUrl: 'https://example.com/thumb.jpg',
              exports: [{ format: 'mp4', url: null }], // Export with no URL
              selectionReason: 'High engagement potential'
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', '');
    });

    test('should handle clips with valid exports', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Test Clip',
              duration: 30,
              viralityScore: 85,
              thumbnailUrl: 'https://example.com/thumb.jpg',
              exports: [{ format: 'mp4', url: 'https://example.com/video.mp4' }],
              selectionReason: 'High engagement potential'
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', 'https://example.com/video.mp4');
      expect(videoPlayer).toHaveTextContent('Video: https://example.com/video.mp4');
    });

    test('should handle clips with undefined exports gracefully', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Test Clip',
              duration: 30,
              viralityScore: 85,
              thumbnailUrl: 'https://example.com/thumb.jpg',
              exports: undefined, // Undefined exports
              selectionReason: 'High engagement potential'
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', '');
    });
  });

  describe('Processing States', () => {
    test('should handle content in processing state', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'processing' // Content still being processed
        },
        detail: null,
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should show processing state, not attempt to render VideoPlayer with invalid data
      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    test('should handle pending state', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'pending' // Content pending processing
        },
        detail: null,
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle completely missing detail object', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: null, // Missing detail
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should not crash or attempt to render VideoPlayer
      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    test('should handle missing clips array', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: null // Missing clips array
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    test('should handle empty clips array', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [] // Empty clips array
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    test('should handle loading state', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: true, // Still loading
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should show loading state, not crash
      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });

    test('should handle error state', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Failed to load content', // Error occurred
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should show error state, not crash
      expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
    });
  });

  describe('Video Player Props Validation', () => {
    test('should pass correct props to VideoPlayer', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Amazing Clip',
              duration: 45,
              viralityScore: 92,
              thumbnailUrl: 'https://example.com/thumbnail.jpg',
              exports: [{ format: 'mp4', url: 'https://example.com/amazing-clip.mp4' }],
              selectionReason: 'Perfect for viral sharing'
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', 'https://example.com/amazing-clip.mp4');
      expect(videoPlayer).toHaveAttribute('data-poster', 'https://example.com/thumbnail.jpg');
      expect(videoPlayer).toHaveAttribute('data-title', 'Amazing Clip');
    });

    test('should handle missing optional props gracefully', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: null, // Missing title
              duration: null, // Missing duration
              viralityScore: null, // Missing virality score
              thumbnailUrl: null, // Missing thumbnail
              exports: [{ format: 'mp4', url: 'https://example.com/clip.mp4' }],
              selectionReason: null // Missing selection reason
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', 'https://example.com/clip.mp4');
      // Should handle null values gracefully
      expect(videoPlayer).toHaveAttribute('data-poster', '');
      expect(videoPlayer).toHaveAttribute('data-title', '');
    });
  });

  describe('Multiple Clips Handling', () => {
    test('should handle switching between clips with different export states', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Clip with Video',
              exports: [{ format: 'mp4', url: 'https://example.com/clip1.mp4' }],
            },
            {
              id: 'clip-2', 
              title: 'Clip without Video',
              exports: null, // No exports for this clip
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should render the first clip (with video) by default
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', 'https://example.com/clip1.mp4');
    });

    test('should handle clips with various URL formats', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: {
          id: 'test-id',
          status: 'completed'
        },
        detail: {
          clips: [
            {
              id: 'clip-1',
              title: 'Valid URL',
              exports: [{ format: 'mp4', url: 'https://example.com/valid.mp4' }],
            },
            {
              id: 'clip-2',
              title: 'Empty URL',
              exports: [{ format: 'mp4', url: '' }], // Empty URL
            },
            {
              id: 'clip-3',
              title: 'Invalid URL',
              exports: [{ format: 'mp4', url: 'not-a-url' }], // Invalid URL format
            }
          ]
        },
        loading: false,
        error: null,
        refresh: jest.fn()
      });

      render(<ContentKitDetailContent />);

      // Should render first clip with valid URL
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-src', 'https://example.com/valid.mp4');
    });
  });
});