/**
 * KnowledgeContent Timeout Error Display Tests
 * 
 * Tests the enhanced error display and user interaction for timeout errors
 * on the knowledge base page.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/110427497/events/3d0fedb36b8c4550a7d3766d30c6266a/
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KnowledgeContent from '@/app/app/knowledge/KnowledgeContent';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useVoiceContext } from '@/contexts/voice-context';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';

// Mock dependencies
jest.mock('@/hooks/useKnowledgeBase');
jest.mock('@/hooks/useFileUpload');
jest.mock('@/contexts/voice-context');
jest.mock('@/hooks/useVoiceStrength');
jest.mock('@/lib/api-client');
jest.mock('sonner');

const mockRefresh = jest.fn();
const mockUseKnowledgeBase = useKnowledgeBase as jest.MockedFunction<typeof useKnowledgeBase>;
const mockUseFileUpload = useFileUpload as jest.MockedFunction<typeof useFileUpload>;
const mockUseVoiceContext = useVoiceContext as jest.MockedFunction<typeof useVoiceContext>;
const mockUseVoiceStrength = useVoiceStrength as jest.MockedFunction<typeof useVoiceStrength>;

describe('KnowledgeContent Timeout Error Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseVoiceContext.mockReturnValue({
      voices: [],
      isTeamsUser: false,
      activeVoice: null,
    } as any);

    mockUseFileUpload.mockReturnValue({
      files: [],
      uploading: false,
      addFiles: jest.fn(),
      removeFile: jest.fn(),
      uploadFiles: jest.fn(),
      totalSize: 0,
    } as any);

    mockUseVoiceStrength.mockReturnValue({
      data: null,
      refresh: jest.fn(),
    } as any);
  });

  describe('Timeout Error Display', () => {
    test('should display timeout error with enhanced UI', () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected. This may happen with large knowledge bases.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      // Check error heading
      expect(screen.getByText('Loading Timeout')).toBeInTheDocument();

      // Check error message
      expect(screen.getByText(/Loading your knowledge base is taking longer than expected/)).toBeInTheDocument();
      expect(screen.getByText(/large knowledge bases/)).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View Sources/i })).toBeInTheDocument();

      // Check timeout tip
      expect(screen.getByText(/Large knowledge bases may take longer to load/)).toBeInTheDocument();
      expect(screen.getByText(/removing unnecessary files/)).toBeInTheDocument();
    });

    test('should display different error types with appropriate headings', () => {
      const testCases = [
        {
          error: 'Network connection issue while loading knowledge base. Please check your internet connection.',
          heading: 'Connection Issue',
        },
        {
          error: 'Server error while loading knowledge base. Please try again in a moment.',
          heading: 'Server Error',
        },
        {
          error: 'Knowledge base not found. It may have been deleted or you may not have access.',
          heading: 'Knowledge Base Not Found',
        },
        {
          error: 'Access denied. You may not have permission to view this knowledge base.',
          heading: 'Access Denied',
        },
        {
          error: 'Some other error occurred',
          heading: 'Loading Error',
        },
      ];

      testCases.forEach(({ error, heading }) => {
        mockUseKnowledgeBase.mockReturnValue({
          contentItems: [],
          contentStats: null,
          loading: false,
          error,
          selectedKb: 'kb-1',
          selectKb: jest.fn(),
          deleteContent: jest.fn(),
          refresh: mockRefresh,
        } as any);

        const { unmount } = render(<KnowledgeContent />);

        expect(screen.getByText(heading)).toBeInTheDocument();
        expect(screen.getByText(error)).toBeInTheDocument();

        unmount();
      });
    });

    test('should handle try again button click', async () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(tryAgainButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    test('should show view sources button only for timeout errors', () => {
      // Timeout error case
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      const { rerender } = render(<KnowledgeContent />);

      expect(screen.getByRole('button', { name: /View Sources/i })).toBeInTheDocument();

      // Non-timeout error case
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Knowledge base not found.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      rerender(<KnowledgeContent />);

      expect(screen.queryByRole('button', { name: /View Sources/i })).not.toBeInTheDocument();
    });

    test('should show timeout tip only for timeout errors', () => {
      // Timeout error case
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'timeout',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      const { rerender } = render(<KnowledgeContent />);

      expect(screen.getByText(/Large knowledge bases may take longer to load/)).toBeInTheDocument();

      // Non-timeout error case
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Network error',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      rerender(<KnowledgeContent />);

      expect(screen.queryByText(/Large knowledge bases may take longer to load/)).not.toBeInTheDocument();
    });
  });

  describe('No Error State', () => {
    test('should not display error UI when no error', () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [
          {
            id: 'content-1',
            title: 'Test Content',
            sourceType: 'file_upload',
            status: 'completed',
            chunkCount: 5,
            fileSize: 1024,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        contentStats: {
          totalItems: 1,
          totalChunks: 5,
          totalSize: 1024,
          bySourceType: { file_upload: 1 },
        },
        loading: false,
        error: null,
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      // Should not show error UI
      expect(screen.queryByText('Loading Timeout')).not.toBeInTheDocument();
      expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Try Again/i })).not.toBeInTheDocument();

      // Should show content (AskYourVoice component would be rendered)
      expect(screen.queryByText(/Loading Timeout/)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('should show loading state and not error UI', () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: true,
        error: null,
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      // Should show loading spinner
      const spinner = screen.getByRole('generic');
      expect(spinner).toHaveClass('animate-spin');

      // Should not show error UI
      expect(screen.queryByText('Loading Timeout')).not.toBeInTheDocument();
    });

    test('should not show error UI when loading even if error exists', () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: true,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      // Should show loading, not error
      expect(screen.getByRole('generic')).toHaveClass('animate-spin');
      expect(screen.queryByText('Loading Timeout')).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    test('should hide error UI when content loads successfully', () => {
      // Start with error state
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      const { rerender } = render(<KnowledgeContent />);

      expect(screen.getByText('Loading Timeout')).toBeInTheDocument();

      // Simulate successful load
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [
          {
            id: 'content-1',
            title: 'Test Content',
            sourceType: 'file_upload',
            status: 'completed',
            chunkCount: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        contentStats: {
          totalItems: 1,
          totalChunks: 1,
          totalSize: 1024,
          bySourceType: { file_upload: 1 },
        },
        loading: false,
        error: null,
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      rerender(<KnowledgeContent />);

      // Error UI should be gone
      expect(screen.queryByText('Loading Timeout')).not.toBeInTheDocument();
      
      // Content should be visible (AskYourVoice component)
      expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
    });
  });

  describe('Teams User Behavior', () => {
    test('should work correctly with teams user setup', () => {
      mockUseVoiceContext.mockReturnValue({
        voices: [
          { id: 'voice-1', knowledgeBaseId: 'kb-1', name: 'Test Voice' },
        ],
        isTeamsUser: true,
        activeVoice: { id: 'voice-1', knowledgeBaseId: 'kb-1', name: 'Test Voice' },
      } as any);

      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      expect(screen.getByText('Loading Timeout')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      // Check button accessibility
      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      const viewSourcesButton = screen.getByRole('button', { name: /View Sources/i });

      expect(tryAgainButton).toBeInTheDocument();
      expect(viewSourcesButton).toBeInTheDocument();

      // Check for proper error messaging structure
      expect(screen.getByText('Loading Timeout')).toBeInTheDocument();
      expect(screen.getByText(/taking longer than expected/)).toBeInTheDocument();
    });

    test('should handle keyboard navigation', () => {
      mockUseKnowledgeBase.mockReturnValue({
        contentItems: [],
        contentStats: null,
        loading: false,
        error: 'Loading your knowledge base is taking longer than expected.',
        selectedKb: 'kb-1',
        selectKb: jest.fn(),
        deleteContent: jest.fn(),
        refresh: mockRefresh,
      } as any);

      render(<KnowledgeContent />);

      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      const viewSourcesButton = screen.getByRole('button', { name: /View Sources/i });

      // Test focus and keyboard interaction
      tryAgainButton.focus();
      expect(document.activeElement).toBe(tryAgainButton);

      fireEvent.keyDown(tryAgainButton, { key: 'Enter' });
      expect(mockRefresh).toHaveBeenCalledTimes(1);

      viewSourcesButton.focus();
      expect(document.activeElement).toBe(viewSourcesButton);
    });
  });

  describe('Error Message Variations', () => {
    test('should handle various timeout error formats', () => {
      const timeoutMessages = [
        'timeout of 45000ms exceeded',
        'Request timeout',
        'Loading timeout occurred',
        'taking longer than expected',
        'Connection timed out',
      ];

      timeoutMessages.forEach((message) => {
        mockUseKnowledgeBase.mockReturnValue({
          contentItems: [],
          contentStats: null,
          loading: false,
          error: message,
          selectedKb: 'kb-1',
          selectKb: jest.fn(),
          deleteContent: jest.fn(),
          refresh: mockRefresh,
        } as any);

        const { unmount } = render(<KnowledgeContent />);

        expect(screen.getByText('Loading Timeout')).toBeInTheDocument();
        expect(screen.getByText(message)).toBeInTheDocument();

        unmount();
      });
    });

    test('should show timeout tip for all timeout-related messages', () => {
      const timeoutIndicators = ['timeout', 'taking longer', 'timed out'];

      timeoutIndicators.forEach((indicator) => {
        mockUseKnowledgeBase.mockReturnValue({
          contentItems: [],
          contentStats: null,
          loading: false,
          error: `Error contains ${indicator} keyword`,
          selectedKb: 'kb-1',
          selectKb: jest.fn(),
          deleteContent: jest.fn(),
          refresh: mockRefresh,
        } as any);

        const { unmount } = render(<KnowledgeContent />);

        expect(screen.getByText(/Large knowledge bases may take longer to load/)).toBeInTheDocument();

        unmount();
      });
    });
  });
});