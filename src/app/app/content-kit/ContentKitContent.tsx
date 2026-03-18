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

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useVoiceContext } from '@/contexts/voice-context';
import {
  ContentFiltersBar,
  ContentListView,
  ContentGridView,
  BulkActionsBar,
} from '@/components/content-library';
import type { NormalizedContent } from '@/lib/content-normalizer';
import { Video, PenLine, Image, Plus, RefreshCw, Package } from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { AppPageHeader } from '@/components/app-page-header';

function ContentLibraryInner() {
  const router = useRouter();
  const { voices, isTeamsUser } = useVoiceContext();
  const [voiceFilter, setVoiceFilter] = useState<string>('all');

  const {
    items: rawItems,
    groups: rawGroups,
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

  // Apply voice filter for teams users
  const items = useMemo(() => {
    if (!isTeamsUser || voiceFilter === 'all') return rawItems;
    if (voiceFilter === 'none') return rawItems.filter(i => !i.voiceId);
    return rawItems.filter(i => i.voiceId === voiceFilter);
  }, [rawItems, voiceFilter, isTeamsUser]);

  const groups = useMemo(() => {
    if (!isTeamsUser || voiceFilter === 'all') return rawGroups;
    return rawGroups.map(g => ({
      ...g,
      items: g.items.filter(i =>
        voiceFilter === 'none' ? !i.voiceId : i.voiceId === voiceFilter
      ),
    })).filter(g => g.items.length > 0);
  }, [rawGroups, voiceFilter, isTeamsUser]);

  const selectedCount = state.selectedIds.size;
  const showBulkActions = selectedCount > 0;

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <AppPageHeader
        title="Content Library"
        description="Your generated content, clips, and carousels"
        actions={
          <Link
            href="/app"
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </Link>
        }
      />

      <UpgradeBanner />

      {/* Stats Card */}
      <div className="mb-6 bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div>
            <span className="text-3xl font-bold text-foreground">{stats.total}</span>
            <span className="text-text-secondary ml-2">Total pieces</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-5 text-text-secondary">
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              <span>{stats.videos} videos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PenLine className="w-4 h-4" />
              <span>{stats.written} written</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Image className="w-4 h-4" />
              <span>{stats.carousels} carousels</span>
            </div>
          </div>
          {stats.processing > 0 && (
            <>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-accent font-medium">{stats.processing} processing</span>
              </div>
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-text-secondary hover:text-accent transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
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
        {isTeamsUser && voices.length > 0 && (
          <select
            value={voiceFilter}
            onChange={(e) => setVoiceFilter(e.target.value)}
            className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <option value="all">All Voices</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            <option value="none">No Voice</option>
          </select>
        )}
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
        <div className="py-8 space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && !error && (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
            <Package className="w-7 h-7 text-accent" />
          </div>
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
export default function ContentKitContent() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-64" />
        <div className="skeleton h-20 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    }>
      <ContentLibraryInner />
    </Suspense>
  );
}
