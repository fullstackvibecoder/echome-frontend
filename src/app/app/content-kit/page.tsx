'use client';

/**
 * Unified Content Kit Page
 *
 * Displays all content kits from both generation requests and clip finder
 * in a unified, filterable view.
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContentKit } from '@/hooks/useContentKit';
import { ContentKitCard, ContentKitFilters } from '@/components/content-kit';
import { ContentKitFilter } from '@/types';
import Link from 'next/link';

function ContentKitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get('filter') as ContentKitFilter | null;

  const {
    items,
    loading,
    error,
    stats,
    refresh,
    setFilter,
    activeFilter,
  } = useContentKit({
    autoRefresh: true,
    refreshInterval: 30000,
    filter: urlFilter || 'all',
  });

  // Sync URL filter param with state
  useEffect(() => {
    if (urlFilter && urlFilter !== activeFilter) {
      setFilter(urlFilter);
    }
  }, [urlFilter, activeFilter, setFilter]);

  const handleCardClick = (item: typeof items[0]) => {
    // Route to detail page
    const id = item.generationRequestId || item.videoUploadId || item.id;
    router.push(`/app/content-kit/${id}`);
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-3xl mb-2">Content Kit</h1>
          <p className="text-body text-text-secondary">
            Your generated content, ready to copy and share
          </p>
        </div>
        <Link
          href="/app"
          className="btn-primary flex items-center gap-2"
        >
          <span>✨</span>
          <span>Create New</span>
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <div>
          <span className="text-2xl font-semibold text-text-primary">{stats.total}</span>
          <span className="text-text-secondary ml-2">Total generated</span>
        </div>
        <div className="text-text-secondary">•</div>
        <div>
          <span className="text-2xl font-semibold text-text-primary">{stats.thisWeek}</span>
          <span className="text-text-secondary ml-2">This week</span>
        </div>
        {stats.processing > 0 && (
          <>
            <div className="text-text-secondary">•</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
              <span className="text-accent font-medium">{stats.processing} processing</span>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ContentKitFilters
          activeFilter={activeFilter}
          onFilterChange={setFilter}
          stats={stats}
        />
      </div>

      {/* Loading State */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading your content...</p>
          </div>
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

      {/* Empty State */}
      {!loading && items.length === 0 && !error && (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold mb-2">No content yet</h3>
          <p className="text-text-secondary mb-6">
            {activeFilter === 'all'
              ? 'Start creating content from your knowledge base or upload a video'
              : `No ${activeFilter} content found. Try a different filter.`}
          </p>
          <Link href="/app" className="btn-primary">
            Create Your First Content
          </Link>
        </div>
      )}

      {/* Content Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ContentKitCard
              key={item.id}
              item={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {items.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors"
          >
            <span className={loading ? 'animate-spin' : ''}>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ContentKitPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading content...</p>
        </div>
      </div>
    }>
      <ContentKitPageContent />
    </Suspense>
  );
}
