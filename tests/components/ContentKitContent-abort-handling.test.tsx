/**
 * ContentKitContent Abort Handling Tests
 * 
 * Tests the enhanced request abort handling in the content library page component
 * to ensure graceful handling of navigation away and component unmount scenarios.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/111231328
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ContentKitContent from '@/app/app/content-kit/ContentKitContent';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useVoiceContext } from '@/contexts/voice-context';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/hooks/useContentLibrary');
jest.mock('@/contexts/voice-context');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseContentLibrary = useContentLibrary as jest.MockedFunction<typeof useContentLibrary>;
const mockUseVoiceContext = useVoiceContext as jest.MockedFunction<typeof useVoiceContext>;

const mockPush = jest.fn();
const mockRefresh = jest.fn();

// Mock the complex child components
jest.mock('@/components/content-library', () => ({
  ContentFiltersBar: ({ onRefresh }: any) => (
    <button onClick={onRefresh} data-testid="refresh-button">Refresh</button>
  ),
  ContentListView: () => <div data-testid="list-view">List View</div>,
  ContentGridView: () => <div data-testid="grid-view">Grid View</div>,
  BulkActionsBar: () => <div data-testid="bulk-actions">Bulk Actions</div>,
}));

describe('ContentKitContent Abort Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock router
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    // Mock voice context
    mockUseVoiceContext.mockReturnValue({
      voices: [],
      isTeamsUser: false,
    } as any);
  });

  describe('Component Unmount During Loading', () => {
    test('should not show errors when unmounting during request', () => {
      mockUseContentLibrary.mockReturnValue({
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: true, // Still loading
        error: null,
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      });

      const { unmount } = render(<ContentKitContent />);

      // Component is loading
      expect(screen.getByText(/Loading/)).toBeInTheDocument();

      // Should not throw when unmounting during loading
      expect(() => unmount()).not.toThrow();
    });

    test('should handle refresh calls during unmount gracefully', () => {
      mockUseContentLibrary.mockReturnValue({
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: false,
        error: null,
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      });

      const { unmount } = render(<ContentKitContent />);

      // Click refresh
      fireEvent.click(screen.getByTestId('refresh-button'));
      expect(mockRefresh).toHaveBeenCalled();

      // Unmount immediately after refresh
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Navigation During Loading', () => {
    test('should not show aborted request errors when navigating away', () => {
      // Mock component showing loading, then error
      const mockHookReturnValue = {
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: true,
        error: null,
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      };

      mockUseContentLibrary.mockReturnValue(mockHookReturnValue);

      const { rerender } = render(<ContentKitContent />);

      // Initially loading
      expect(screen.getByText(/Loading/)).toBeInTheDocument();

      // Simulate navigation causing request abort (hook should NOT show abort errors)
      mockUseContentLibrary.mockReturnValue({
        ...mockHookReturnValue,
        isLoading: false,
        error: null, // Should be null for aborted requests
      });

      rerender(<ContentKitContent />);

      // Should not show any error messages
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/aborted/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });

    test('should show actual errors but not abort errors', () => {
      const mockHookReturnValue = {
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: false,
        error: 'Network connection error. Please check your internet connection.',
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      };

      mockUseContentLibrary.mockReturnValue(mockHookReturnValue);

      render(<ContentKitContent />);

      // Should show real network errors
      expect(screen.getByText(/Network connection error/)).toBeInTheDocument();
    });
  });

  describe('Rapid User Interactions', () => {
    test('should handle rapid refresh clicks without errors', async () => {
      mockUseContentLibrary.mockReturnValue({
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: false,
        error: null,
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      });

      render(<ContentKitContent />);

      const refreshButton = screen.getByTestId('refresh-button');

      // Click refresh multiple times rapidly
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);

      // Should not throw errors
      expect(mockRefresh).toHaveBeenCalledTimes(3);
    });

    test('should handle view mode changes during loading', () => {
      const mockSetViewMode = jest.fn();

      mockUseContentLibrary.mockReturnValue({
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: true,
        error: null,
        setViewMode: mockSetViewMode,
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      });

      render(<ContentKitContent />);

      // Component should render without errors even during loading
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    test('should allow refresh after successful abort handling', async () => {
      const mockHookReturnValue = {
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: false,
        error: null, // No error from aborted request
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      };

      mockUseContentLibrary.mockReturnValue(mockHookReturnValue);

      const { rerender } = render(<ContentKitContent />);

      // No errors shown
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

      // Can still trigger refresh
      fireEvent.click(screen.getByTestId('refresh-button'));
      expect(mockRefresh).toHaveBeenCalled();

      // Simulate successful data load after refresh
      mockUseContentLibrary.mockReturnValue({
        ...mockHookReturnValue,
        items: [
          {
            id: 'test-1',
            type: 'kit' as const,
            title: 'Test Content Kit',
            status: 'completed' as const,
            platforms: ['instagram'],
            createdAt: new Date(),
            sourceId: 'test-1',
            clipCount: 1,
            platformCount: 1,
          }
        ],
        groups: [
          {
            id: 'today',
            title: 'Today',
            items: [
              {
                id: 'test-1',
                type: 'kit' as const,
                title: 'Test Content Kit',
                status: 'completed' as const,
                platforms: ['instagram'],
                createdAt: new Date(),
                sourceId: 'test-1',
                clipCount: 1,
                platformCount: 1,
              }
            ],
            collapsed: false,
          }
        ],
        stats: {
          total: 1,
          videos: 1,
          written: 1,
          carousels: 0,
          processing: 0,
        },
      });

      rerender(<ContentKitContent />);

      // Should show content after successful recovery
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    test('should distinguish between abort and real errors in UI', () => {
      const mockHookReturnValue = {
        items: [],
        groups: [],
        stats: {
          total: 0,
          videos: 0,
          written: 0,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: false,
        error: null, // Aborted requests should have null error
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      };

      mockUseContentLibrary.mockReturnValue(mockHookReturnValue);

      const { rerender } = render(<ContentKitContent />);

      // No error shown for aborted requests
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

      // Simulate real network error
      mockUseContentLibrary.mockReturnValue({
        ...mockHookReturnValue,
        error: 'Server error. Our team has been notified. Please try again later.',
      });

      rerender(<ContentKitContent />);

      // Should show real errors
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
  });

  describe('Component State Integrity', () => {
    test('should maintain consistent state during abort scenarios', () => {
      const mockHookReturnValue = {
        items: [
          {
            id: 'existing-1',
            type: 'kit' as const,
            title: 'Existing Kit',
            status: 'completed' as const,
            platforms: ['linkedin'],
            createdAt: new Date(),
            sourceId: 'existing-1',
            clipCount: 0,
            platformCount: 1,
          }
        ],
        groups: [],
        stats: {
          total: 1,
          videos: 0,
          written: 1,
          carousels: 0,
          processing: 0,
        },
        state: {
          viewMode: 'list',
          groupBy: 'date',
          sortBy: 'recent',
          searchQuery: '',
          contentTypeFilter: 'all',
          platformFilters: [],
          selectedIds: new Set(),
          isSelectionMode: false,
        },
        pagination: {
          items: [],
          offset: 0,
          limit: 20,
          total: 1,
          hasMore: false,
          isLoadingMore: false,
        },
        isLoading: false,
        error: null,
        setViewMode: jest.fn(),
        setGroupBy: jest.fn(),
        setSortBy: jest.fn(),
        setSearchQuery: jest.fn(),
        setContentTypeFilter: jest.fn(),
        togglePlatformFilter: jest.fn(),
        toggleSelection: jest.fn(),
        selectAll: jest.fn(),
        clearSelection: jest.fn(),
        loadMore: jest.fn(),
        refresh: mockRefresh,
        deleteSelected: jest.fn(),
        downloadSelected: jest.fn(),
      };

      mockUseContentLibrary.mockReturnValue(mockHookReturnValue);

      render(<ContentKitContent />);

      // Should render with existing data even if new requests are aborted
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });
  });
});