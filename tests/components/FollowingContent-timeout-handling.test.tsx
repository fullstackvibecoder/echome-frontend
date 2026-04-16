/**
 * FollowingContent Timeout Handling Tests
 * 
 * Tests timeout error handling and retry logic for the following page
 * to ensure proper handling of 60-second timeouts and long-running operations.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/110099645/events/61a7f27704524f2b968173655377b83c/
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import FollowingContent from '@/app/app/following/FollowingContent';
import { api } from '@/lib/api-client';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/api-client');
jest.mock('@/lib/toast', () => ({
  showErrorToast: jest.fn(),
}));

const mockRouter = useRouter as jest.Mock;
const mockApi = api as jest.Mocked<typeof api>;

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('FollowingContent Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router
    mockRouter.mockReturnValue({
      push: jest.fn(),
    });

    // Default API mocks (successful responses)
    mockApi.creators = {
      list: jest.fn().mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator',
            creator_username: '@test',
            platform: 'youtube',
            creator_avatar_url: 'https://example.com/avatar.jpg',
            last_checked_at: '2024-01-01T12:00:00Z',
          },
        ],
        count: 1,
      }),
      getContent: jest.fn().mockResolvedValue({
        success: true,
        content: [
          {
            id: 'content-1',
            title: 'Test Video',
            creator_id: 'creator-1',
            created_at: '2024-01-01T10:00:00Z',
            thumbnail_url: 'https://example.com/thumb.jpg',
          },
        ],
        count: 1,
      }),
      follow: jest.fn(),
      unfollow: jest.fn(),
      poll: jest.fn(),
      pollAll: jest.fn(),
      extractTranscript: jest.fn(),
      repurpose: jest.fn(),
    };
  });

  describe('Timeout Error Detection', () => {
    test('should handle timeout error in creators list', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      };

      mockApi.creators.list.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
        expect(screen.getByText(/Request timed out/)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      expect(screen.getByText('This operation is taking longer than expected')).toBeInTheDocument();
    });

    test('should handle timeout error in content loading', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      // Creators list succeeds
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator',
            platform: 'youtube',
          },
        ],
        count: 1,
      });

      // Content loading times out
      mockApi.creators.getContent.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Some creators couldn\'t load')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load content from 1 creator/)).toBeInTheDocument();
        expect(screen.getByText('Retry Failed Creators')).toBeInTheDocument();
      });
    });

    test('should handle timeout error in poll operation', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
      };

      mockApi.creators.poll.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Creator')).toBeInTheDocument();
      });

      // Try to poll a creator
      const pollButton = screen.getByTitle('Check for new content');
      fireEvent.click(pollButton);

      await waitFor(() => {
        expect(mockApi.creators.poll).toHaveBeenCalled();
      });

      // Should handle timeout gracefully
      expect(console.error).toHaveBeenCalledWith('Failed to poll:', timeoutError);
    });

    test('should handle timeout error in poll all operation', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 120000ms exceeded',
      };

      mockApi.creators.pollAll.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Pull Fresh Content')).toBeInTheDocument();
      });

      // Try to poll all creators
      fireEvent.click(screen.getByText('Pull Fresh Content'));

      await waitFor(() => {
        expect(mockApi.creators.pollAll).toHaveBeenCalled();
      });

      // Should handle timeout gracefully
      expect(console.error).toHaveBeenCalledWith('Failed to poll all:', timeoutError);
    });
  });

  describe('Retry Logic', () => {
    test('should retry creators list on timeout', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      };

      // First call times out, second succeeds
      mockApi.creators.list
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({
          success: true,
          creators: [
            {
              id: 'creator-1',
              creator_name: 'Test Creator',
              platform: 'youtube',
            },
          ],
          count: 1,
        });

      render(<FollowingContent />);

      await waitFor(() => {
        expect(mockApi.creators.list).toHaveBeenCalledTimes(2);
        expect(console.warn).toHaveBeenCalledWith('Retrying operation (attempt 1/3)...');
      });

      // Should eventually show content
      await waitFor(() => {
        expect(screen.getByText('Test Creator')).toBeInTheDocument();
      });
    });

    test('should retry individual content loading on timeout', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      // Creators list succeeds
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator',
            platform: 'youtube',
          },
        ],
        count: 1,
      });

      // Content loading times out then succeeds
      mockApi.creators.getContent
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({
          success: true,
          content: [
            {
              id: 'content-1',
              title: 'Test Video',
              creator_id: 'creator-1',
              created_at: '2024-01-01T10:00:00Z',
            },
          ],
          count: 1,
        });

      render(<FollowingContent />);

      await waitFor(() => {
        expect(mockApi.creators.getContent).toHaveBeenCalledTimes(2);
      });

      // Should eventually show content
      await waitFor(() => {
        expect(screen.getByText('Test Video')).toBeInTheDocument();
      });
    });

    test('should handle retry button click after timeout', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      };

      // First load times out
      mockApi.creators.list.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });

      // Mock successful retry
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator',
            platform: 'youtube',
          },
        ],
        count: 1,
      });

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Test Creator')).toBeInTheDocument();
      });

      expect(mockApi.creators.list).toHaveBeenCalledTimes(4); // Initial + 2 retries + manual retry
    });

    test('should handle retry failed creators button', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      // Creators list succeeds
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator',
            platform: 'youtube',
          },
        ],
        count: 1,
      });

      // Content loading fails
      mockApi.creators.getContent.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Some creators couldn\'t load')).toBeInTheDocument();
      });

      // Mock successful retry
      mockApi.creators.getContent.mockResolvedValue({
        success: true,
        content: [
          {
            id: 'content-1',
            title: 'Test Video',
            creator_id: 'creator-1',
            created_at: '2024-01-01T10:00:00Z',
          },
        ],
        count: 1,
      });

      // Click retry failed creators
      fireEvent.click(screen.getByText('Retry Failed Creators'));

      await waitFor(() => {
        expect(screen.getByText('Test Video')).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    test('should handle network errors with proper messaging', async () => {
      const networkError = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };

      mockApi.creators.list.mockRejectedValue(networkError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Loading Error')).toBeInTheDocument();
        expect(screen.getByText('Network connection failed. Please check your internet connection.')).toBeInTheDocument();
      });
    });

    test('should handle server errors with proper messaging', async () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };

      mockApi.creators.list.mockRejectedValue(serverError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Server error. Please try again in a few moments.')).toBeInTheDocument();
      });
    });
  });

  describe('Partial Failure Handling', () => {
    test('should handle mixed success/failure for multiple creators', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      // Creators list with multiple creators
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator 1',
            platform: 'youtube',
          },
          {
            id: 'creator-2',
            creator_name: 'Test Creator 2',
            platform: 'youtube',
          },
        ],
        count: 2,
      });

      // First creator succeeds, second times out
      mockApi.creators.getContent
        .mockImplementation((creatorId) => {
          if (creatorId === 'creator-1') {
            return Promise.resolve({
              success: true,
              content: [
                {
                  id: 'content-1',
                  title: 'Test Video 1',
                  creator_id: 'creator-1',
                  created_at: '2024-01-01T10:00:00Z',
                },
              ],
              count: 1,
            });
          } else {
            return Promise.reject(timeoutError);
          }
        });

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Test Video 1')).toBeInTheDocument();
        expect(screen.getByText('Some creators couldn\'t load')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load content from 1 creator/)).toBeInTheDocument();
      });
    });

    test('should handle all creators failing', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };

      // Creators list succeeds
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [
          {
            id: 'creator-1',
            creator_name: 'Test Creator',
            platform: 'youtube',
          },
        ],
        count: 1,
      });

      // All content loading fails
      mockApi.creators.getContent.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Some creators couldn\'t load')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load content from 1 creator/)).toBeInTheDocument();
      });

      // Should not show content list
      expect(screen.queryByText('No content found')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('should show loading state during timeout', async () => {
      // Mock a slow response
      mockApi.creators.list.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          creators: [],
          count: 0,
        }), 100))
      );

      render(<FollowingContent />);

      // Should show loading skeletons initially
      expect(screen.getByText('Loading your workspace...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading your workspace...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });

    test('should show retrying state on retry button click', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      };

      mockApi.creators.list.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Mock slow retry
      mockApi.creators.list.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          creators: [],
          count: 0,
        }), 100))
      );

      fireEvent.click(screen.getByText('Try Again'));

      expect(screen.getByText('Retrying...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Error Message Categorization', () => {
    test('should show specific messages for different error types', async () => {
      const errorScenarios = [
        {
          error: { code: 'ECONNABORTED', message: 'timeout exceeded' },
          expectedMessage: 'Request timed out. Please try again or check your connection.',
        },
        {
          error: { code: 'ERR_NETWORK', message: 'Network Error' },
          expectedMessage: 'Network connection failed. Please check your internet connection.',
        },
        {
          error: { response: { status: 500 }, message: 'Server Error' },
          expectedMessage: 'Server error. Please try again in a few moments.',
        },
        {
          error: { message: 'Custom error message' },
          expectedMessage: 'Custom error message',
        },
      ];

      for (const scenario of errorScenarios) {
        jest.clearAllMocks();
        
        mockApi.creators.list.mockRejectedValue(scenario.error);

        const { unmount } = render(<FollowingContent />);

        await waitFor(() => {
          expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Retry Attempt Tracking', () => {
    test('should track and display retry attempts', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      };

      mockApi.creators.list.mockRejectedValue(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // First manual retry
      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Retry attempt: 1')).toBeInTheDocument();
      });

      // Second manual retry
      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.getByText('Retry attempt: 2')).toBeInTheDocument();
      });
    });

    test('should reset retry count on successful load', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 20000ms exceeded',
      };

      // First call fails
      mockApi.creators.list.mockRejectedValueOnce(timeoutError);

      render(<FollowingContent />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Mock successful retry
      mockApi.creators.list.mockResolvedValue({
        success: true,
        creators: [],
        count: 0,
      });

      fireEvent.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(screen.queryByText('Retry attempt:')).not.toBeInTheDocument();
      });
    });
  });
});