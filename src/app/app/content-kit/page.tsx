'use client';

/**
 * Content Library Page
 *
 * Redesigned unified view for all content with:
 * - Dual-view system (list/grid toggle)
 * - Smart grouping (date, platform, status, type)
 * - Search + quick filters
 * - Bulk actions
 */

import { Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import {
  ContentFiltersBar,
  ContentListView,
  ContentGridView,
  BulkActionsBar,
} from '@/components/content-library';
import type { NormalizedContent } from '@/lib/content-normalizer';

function ContentLibraryContent() {
  const router = useRouter();

  const {
    items,
    groups,
    stats,
    state,
    pagination,
    isLoading,
    error,
    setViewMode,
    setGroupBy,
    setSortBy,
    setSearchQuery,
    setContentTypeFilter,
    togglePlatformFilter,
    toggleSelection,
    selectAll,
    clearSelection,
    loadMore,
    refresh,
    deleteSelected,
    downloadSelected,
  } = useContentLibrary();

  const handleItemClick = useCallback((item: NormalizedContent) => {
    // Route to detail page using the source ID
    const id = item.generationRequestId || item.videoUploadId || item.sourceId;
    router.push(`/app/content-kit/${id}`);
  }, [router]);

  const handleSelect = useCallback((id: string, selected: boolean) => {
    toggleSelection(id);
  }, [toggleSelection]);

  const selectedCount = state.selectedIds.size;
  const showBulkActions = selectedCount > 0;

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-3xl mb-2">Content Library</h1>
          <p className="text-body text-text-secondary">
            Your generated content, clips, and carousels
          </p>
        </div>
        <Link
          href="/app"
          className="btn-primary flex items-center gap-2"
        >
          <span>+</span>
          <span>Create New</span>
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <div>
          <span className="text-2xl font-semibold text-text-primary">{stats.total}</span>
          <span className="text-text-secondary ml-2">Total</span>
        </div>
        <div className="text-text-secondary">|</div>
        <div className="flex items-center gap-4 text-text-secondary">
          <span>{stats.videos} videos</span>
          <span>{stats.written} written</span>
          <span>{stats.carousels} carousels</span>
        </div>
        {stats.processing > 0 && (
          <>
            <div className="text-text-secondary">|</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
              <span className="text-accent font-medium">{stats.processing} processing</span>
            </div>
          </>
        )}
        <div className="flex-1" />
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors"
        >
          <span className={isLoading ? 'animate-spin' : ''}>↻</span>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6">
        <ContentFiltersBar
          viewMode={state.viewMode}
          groupBy={state.groupBy}
          sortBy={state.sortBy}
          searchQuery={state.searchQuery}
          contentTypeFilter={state.contentTypeFilter}
          platformFilters={state.platformFilters}
          onViewModeChange={setViewMode}
          onGroupByChange={setGroupBy}
          onSortByChange={setSortBy}
          onSearchChange={setSearchQuery}
          onContentTypeFilterChange={setContentTypeFilter}
          onPlatformFilterToggle={togglePlatformFilter}
        />
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="mb-6">
          <BulkActionsBar
            selectedCount={selectedCount}
            totalCount={items.length}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onDelete={deleteSelected}
            onDownload={downloadSelected}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center mb-6">
          {error}
          <button onClick={refresh} className="ml-4 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && items.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading your content...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && !error && (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No content yet</h3>
          <p className="text-text-secondary mb-6">
            {state.searchQuery || state.contentTypeFilter !== 'all' || state.platformFilters.length > 0
              ? 'No content matches your filters. Try adjusting your search.'
              : 'Start creating content from your knowledge base or upload a video'}
          </p>
          <Link href="/app" className="btn-primary">
            Create Your First Content
          </Link>
        </div>
      )}

      {/* Content View */}
      {items.length > 0 && (
        state.viewMode === 'list' ? (
          <ContentListView
            items={items}
            groups={groups}
            selectedIds={state.selectedIds}
            onSelect={handleSelect}
            onSelectAll={selectAll}
            onItemClick={handleItemClick}
            isSelectionMode={state.isSelectionMode}
            isLoading={pagination.isLoadingMore}
            hasMore={pagination.hasMore}
            onLoadMore={loadMore}
          />
        ) : (
          <ContentGridView
            items={items}
            selectedIds={state.selectedIds}
            onSelect={handleSelect}
            onItemClick={handleItemClick}
            isSelectionMode={state.isSelectionMode}
            isLoading={pagination.isLoadingMore}
            hasMore={pagination.hasMore}
            onLoadMore={loadMore}
          />
        )
      )}
    </div>
  );
}

// Wrap in Suspense for router
export default function ContentLibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading content library...</p>
        </div>
      </div>
    }>
      <ContentLibraryContent />
    </Suspense>
  );
}
