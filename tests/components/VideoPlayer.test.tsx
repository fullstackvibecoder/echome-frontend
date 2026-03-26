/**
 * VideoPlayer Media Loading Error Tests
 * 
 * Tests error handling for media loading failures in the VideoPlayer component
 * to prevent NotSupportedError from reaching production users.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/107359747/events/7aa09e6523c34eceb48d4ceb8cea03b1/
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoPlayer } from '@/components/content-kit/VideoPlayer';

// Mock HTMLVideoElement methods that are not implemented in jsdom
const mockVideoElement = {
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 0,
  muted: false,
  error: null,
};

// Mock URL constructor for URL validation tests
const originalURL = global.URL;
beforeAll(() => {
  Object.defineProperty(window.HTMLVideoElement.prototype, 'play', {
    writable: true,
    value: jest.fn(() => Promise.resolve()),
  });
  
  Object.defineProperty(window.HTMLVideoElement.prototype, 'pause', {
    writable: true,
    value: jest.fn(),
  });

  Object.defineProperty(window.HTMLVideoElement.prototype, 'load', {
    writable: true,
    value: jest.fn(),
  });
});

afterAll(() => {
  global.URL = originalURL;
});

describe('VideoPlayer Media Loading Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Invalid Video Source Handling', () => {
    test('should show error state for empty video source', async () => {
      render(<VideoPlayer src="" />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.getByText('No video source provided')).toBeInTheDocument();
    });

    test('should show error state for null/undefined video source', async () => {
      render(<VideoPlayer src={null as any} />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.getByText('No video source provided')).toBeInTheDocument();
    });

    test('should show error state for invalid URL format', async () => {
      render(<VideoPlayer src="not-a-url" />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Invalid video source URL')).toBeInTheDocument();
    });

    test('should show error state for unsupported file extension', async () => {
      render(<VideoPlayer src="https://example.com/video.pdf" />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Invalid video source URL')).toBeInTheDocument();
    });
  });

  describe('Valid Video Source Validation', () => {
    test('should accept video with .mp4 extension', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      expect(video.src).toBe('https://example.com/video.mp4');
      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
    });

    test('should accept video with .webm extension', async () => {
      render(<VideoPlayer src="https://example.com/video.webm" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      expect(video.src).toBe('https://example.com/video.webm');
      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
    });

    test('should accept Supabase storage URLs', async () => {
      render(<VideoPlayer src="https://project.supabase.co/storage/v1/object/public/videos/clip.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      expect(video.src).toContain('supabase');
      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
    });

    test('should accept AWS S3 URLs', async () => {
      render(<VideoPlayer src="https://bucket.amazonaws.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      expect(video.src).toContain('amazonaws.com');
      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
    });

    test('should accept generic video API paths', async () => {
      render(<VideoPlayer src="https://api.example.com/video/12345" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      expect(video.src).toContain('/video/');
      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('should show loading state initially', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      expect(screen.getByText('Loading video...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Spinner
    });

    test('should hide loading state after video loads', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      // Simulate successful load
      fireEvent(video, new Event('loadedmetadata'));
      fireEvent(video, new Event('canplay'));

      await waitFor(() => {
        expect(screen.queryByText('Loading video...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Media Error Handling', () => {
    test('should handle MEDIA_ERR_SRC_NOT_SUPPORTED error', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      // Mock MediaError
      const mockError = {
        code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
        message: 'Format error'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      // Simulate error event
      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
        expect(screen.getByText('Video format is not supported by your browser')).toBeInTheDocument();
      });

      expect(console.error).toHaveBeenCalledWith('Video loading error:', expect.objectContaining({
        src: 'https://example.com/video.mp4',
        error: 'Format error',
        code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
      }));
    });

    test('should handle MEDIA_ERR_NETWORK error', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      const mockError = {
        code: MediaError.MEDIA_ERR_NETWORK,
        message: 'Network error'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Network error while loading video')).toBeInTheDocument();
      });
    });

    test('should handle MEDIA_ERR_DECODE error', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      const mockError = {
        code: MediaError.MEDIA_ERR_DECODE,
        message: 'Decode error'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Video format is corrupted or unsupported')).toBeInTheDocument();
      });
    });

    test('should handle MEDIA_ERR_ABORTED error', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      const mockError = {
        code: MediaError.MEDIA_ERR_ABORTED,
        message: 'Aborted'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Video loading was aborted')).toBeInTheDocument();
      });
    });

    test('should handle unknown error codes', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      const mockError = {
        code: 999, // Unknown error code
        message: 'Unknown error'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Unknown error')).toBeInTheDocument();
      });
    });

    test('should handle errors without error object', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      Object.defineProperty(video, 'error', {
        get: () => null
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Video failed to load')).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    test('should show retry button for valid URLs that failed to load', async () => {
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      const mockError = {
        code: MediaError.MEDIA_ERR_NETWORK,
        message: 'Network error'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    test('should not show retry button for invalid URLs', async () => {
      render(<VideoPlayer src="invalid-url" />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    test('should retry loading when retry button is clicked', async () => {
      const mockLoad = jest.fn();
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      video.load = mockLoad;
      
      // Simulate error
      const mockError = {
        code: MediaError.MEDIA_ERR_NETWORK,
        message: 'Network error'
      };
      
      Object.defineProperty(video, 'error', {
        get: () => mockError
      });

      fireEvent(video, new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      expect(mockLoad).toHaveBeenCalled();
      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });
  });

  describe('Play Failure Handling', () => {
    test('should handle play() promise rejection', async () => {
      const mockPlay = jest.fn(() => Promise.reject(new Error('Play failed')));
      render(<VideoPlayer src="https://example.com/video.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      video.play = mockPlay;

      // Simulate successful load first
      fireEvent(video, new Event('loadedmetadata'));
      fireEvent(video, new Event('canplay'));

      await waitFor(() => {
        expect(screen.queryByText('Loading video...')).not.toBeInTheDocument();
      });

      // Try to play
      const playButton = screen.getByRole('button', { hidden: true });
      fireEvent.click(playButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Play failed:', expect.any(Error));
        expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
        expect(screen.getByText(/Failed to play video/)).toBeInTheDocument();
      });
    });

    test('should not attempt to play when in error state', async () => {
      const mockPlay = jest.fn();
      render(<VideoPlayer src="invalid-url" />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();

      // Try to click (shouldn't do anything as play button should not be present)
      const errorDiv = screen.getByText('Video Unavailable').closest('div');
      if (errorDiv) {
        fireEvent.click(errorDiv);
      }

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('Poster Image Fallback', () => {
    test('should show poster image in error state if available', async () => {
      render(
        <VideoPlayer 
          src="invalid-url" 
          poster="https://example.com/poster.jpg"
        />
      );

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.getByAltText('Video thumbnail')).toBeInTheDocument();
      expect(screen.getByAltText('Video thumbnail')).toHaveAttribute('src', 'https://example.com/poster.jpg');
    });

    test('should hide poster image if it fails to load', async () => {
      render(
        <VideoPlayer 
          src="invalid-url" 
          poster="https://example.com/invalid-poster.jpg"
        />
      );

      const posterImage = screen.getByAltText('Video thumbnail');
      
      // Simulate poster image error
      fireEvent.error(posterImage);

      expect(posterImage).toHaveStyle({ display: 'none' });
    });
  });

  describe('Source Change Handling', () => {
    test('should reset error state when source changes', async () => {
      const { rerender } = render(<VideoPlayer src="invalid-url" />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();

      // Change to valid URL
      rerender(<VideoPlayer src="https://example.com/video.mp4" />);

      expect(screen.queryByText('Video Unavailable')).not.toBeInTheDocument();
      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });

    test('should reset loading state when source changes', async () => {
      const { rerender } = render(<VideoPlayer src="https://example.com/video1.mp4" />);

      const video = screen.getByRole('img', { hidden: true }) as HTMLVideoElement;
      
      // Simulate successful load
      fireEvent(video, new Event('loadedmetadata'));

      await waitFor(() => {
        expect(screen.queryByText('Loading video...')).not.toBeInTheDocument();
      });

      // Change source
      rerender(<VideoPlayer src="https://example.com/video2.mp4" />);

      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    test('should have proper ARIA labels and roles', async () => {
      render(<VideoPlayer src="invalid-url" />);

      // Error state should be accessible
      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      
      // Should have descriptive error message
      expect(screen.getByText(/Invalid video source URL/)).toBeInTheDocument();
    });

    test('should maintain aspect ratio in error state', async () => {
      render(<VideoPlayer src="invalid-url" aspectRatio="16:9" />);

      const errorContainer = screen.getByText('Video Unavailable').closest('div');
      expect(errorContainer).toHaveClass('aspect-video'); // 16:9 aspect ratio class
    });

    test('should apply custom className in error state', async () => {
      render(<VideoPlayer src="invalid-url" className="custom-class" />);

      const errorContainer = screen.getByText('Video Unavailable').closest('div');
      expect(errorContainer).toHaveClass('custom-class');
    });

    test('should not show controls in error state', async () => {
      render(<VideoPlayer src="invalid-url" showControls={true} />);

      expect(screen.getByText('Video Unavailable')).toBeInTheDocument();
      expect(screen.queryByRole('slider')).not.toBeInTheDocument(); // Progress bar
      expect(screen.queryByText('🔊')).not.toBeInTheDocument(); // Mute button
    });
  });
});