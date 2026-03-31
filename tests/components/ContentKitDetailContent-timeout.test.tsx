/**
 * Content Kit Detail Component Timeout Tests
 * 
 * Tests the UI behavior when timeout errors occur on content-kit detail pages
 * to ensure proper user feedback and error handling.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109007133/events/5508c57987cf4bd0b2ed70f9b3ba95cb/
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams } from 'next/navigation';
import ContentKitDetailContent from '../../src/app/app/content-kit/[id]/ContentKitDetailContent';
import { useContentKitDetail } from '../../src/hooks/useContentKit';
import { useAuth } from '../../src/hooks/useAuth';
import { useVoiceContext } from '../../src/contexts/voice-context';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('../../src/hooks/useContentKit', () => ({
  useContentKitDetail: jest.fn(),
}));

jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/contexts/voice-context', () => ({
  useVoiceContext: jest.fn(),
}));

jest.mock('../../src/hooks/useGenerationProgress', () => ({
  useGenerationProgress: jest.fn(() => ({
    progress: null,
    isListening: false,
  })),
  mapStepToIndex: jest.fn(() => 0),
  GENERATION_STEPS: [],
  VIDEO_GENERATION_STEPS: [],
  isVideoStep: jest.fn(() => false),
}));

const mockUseParams = useParams as jest.Mock;
const mockUseContentKitDetail = useContentKitDetail as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseVoiceContext = useVoiceContext as jest.Mock;

describe('ContentKitDetailContent - Timeout Error Handling', () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock route params
    mockUseParams.mockReturnValue({ id: 'test-123' });
    
    // Mock auth
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', isAdmin: false },
      loading: false,
    });
    
    // Mock voice context
    mockUseVoiceContext.mockReturnValue({
      activeVoice: null,
      isTeamsUser: false,
    });
  });

  describe('Loading states', () => {
    test('should show loading spinner when content is loading', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: true,
        error: null,
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      expect(screen.getByText('Loading content...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });
  });

  describe('Timeout error scenarios', () => {
    test('should show timeout retry message with appropriate styling', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is still processing, retrying... (1/2)',
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      const errorMessage = screen.getByText(/Content is still processing, retrying/);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-error'); // Should have error styling
      
      // Should show retry count
      expect(screen.getByText(/\(1\/2\)/)).toBeInTheDocument();
    });

    test('should show final timeout message with helpful guidance', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is taking longer than expected to load. This may indicate the content is still being processed. Please try refreshing the page in a few minutes.',
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      expect(screen.getByText(/Content is taking longer than expected/)).toBeInTheDocument();
      expect(screen.getByText(/still being processed/)).toBeInTheDocument();
      expect(screen.getByText(/try refreshing the page/)).toBeInTheDocument();
    });

    test('should provide working refresh button for timeout errors', async () => {
      const user = userEvent.setup();
      
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is taking longer than expected to load. This may indicate the content is still being processed. Please try refreshing the page in a few minutes.',
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      const refreshButton = screen.getByText('Try again');
      expect(refreshButton).toBeInTheDocument();
      
      await user.click(refreshButton);
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progressive error states', () => {
    test('should handle progression from loading to retry to final timeout', async () => {
      // Start with loading
      const { rerender } = render(<ContentKitDetailContent />);
      
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: true,
        error: null,
        refresh: mockRefresh,
      });
      
      rerender(<ContentKitDetailContent />);
      expect(screen.getByText('Loading content...')).toBeInTheDocument();

      // Progress to first retry
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is still processing, retrying... (1/2)',
        refresh: mockRefresh,
      });
      
      rerender(<ContentKitDetailContent />);
      expect(screen.getByText(/retrying.*\(1\/2\)/)).toBeInTheDocument();

      // Progress to second retry
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is still processing, retrying... (2/2)',
        refresh: mockRefresh,
      });
      
      rerender(<ContentKitDetailContent />);
      expect(screen.getByText(/retrying.*\(2\/2\)/)).toBeInTheDocument();

      // Finally show timeout message
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is taking longer than expected to load. This may indicate the content is still being processed. Please try refreshing the page in a few minutes.',
        refresh: mockRefresh,
      });
      
      rerender(<ContentKitDetailContent />);
      expect(screen.getByText(/taking longer than expected/)).toBeInTheDocument();
    });
  });

  describe('Recovery scenarios', () => {
    test('should show content normally after timeout recovery', () => {
      const mockItem = {
        id: 'test-123',
        type: 'text' as const,
        title: 'Test Content',
        sourceType: 'generation' as const,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        platforms: ['instagram'],
        clipCount: 0,
        platformCount: 1,
        carouselSlideCount: 0,
        chunkCount: 0,
        inputType: 'text' as const,
      };

      const mockDetail = {
        clips: [],
        contentKit: null,
        carousel: null,
        content: [
          {
            id: 'content-1',
            platform: 'instagram',
            content: 'Test content text',
          },
        ],
      };

      mockUseContentKitDetail.mockReturnValue({
        item: mockItem,
        detail: mockDetail,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      expect(screen.queryByText('Loading content...')).not.toBeInTheDocument();
      expect(screen.queryByText(/retrying/)).not.toBeInTheDocument();
      expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels for timeout states', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is still processing, retrying... (1/2)',
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      const errorRegion = screen.getByRole('alert', { hidden: true });
      expect(errorRegion).toBeInTheDocument();
      
      const refreshButton = screen.getByRole('button', { name: /try again/i });
      expect(refreshButton).toBeInTheDocument();
    });

    test('should maintain focus management during error state changes', async () => {
      const user = userEvent.setup();
      
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: 'Content is taking longer than expected to load.',
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      const refreshButton = screen.getByText('Try again');
      await user.click(refreshButton);
      
      // Button should still be focusable after click
      expect(refreshButton).toBeInTheDocument();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    test('should handle empty error message gracefully', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: '',
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      // Should not show error UI for empty error
      expect(screen.queryByText('Try again')).not.toBeInTheDocument();
    });

    test('should handle null error gracefully', () => {
      mockUseContentKitDetail.mockReturnValue({
        item: null,
        detail: null,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      render(<ContentKitDetailContent />);

      // Should show "no content" state, not error state
      expect(screen.queryByText('Try again')).not.toBeInTheDocument();
    });
  });
});