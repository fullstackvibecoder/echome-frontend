'use client';

/**
 * ContentGridView Component
 *
 * Grid view container for the content library.
 * Supports selection and infinite scroll.
 */

import { useRef, useEffect } from 'react';
import type { NormalizedContent } from '@/lib/content-normalizer';
import { ContentCard } from './ContentCard';

interface ContentGridViewProps {
  items: NormalizedContent[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onItemClick: (item: NormalizedContent) => void;
  isSelectionMode: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function ContentGridView({
  items,
  selectedIds,
  onSelect,
  onItemClick,
  isSelectionMode,
  isLoading,
  hasMore,
  onLoadMore,
}: ContentGridViewProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="space-y-6">
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            onSelect={(selected) => onSelect(item.id, selected)}
            onClick={() => onItemClick(item)}
            showCheckbox={isSelectionMode}
          />
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-text-secondary text-lg">No content found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Try adjusting your filters or create new content
          </p>
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading && (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContentGridView;
