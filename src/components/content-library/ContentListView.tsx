'use client';

/**
 * ContentListView Component
 *
 * List view container for the content library.
 * Supports grouping, selection, and infinite scroll.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { NormalizedContent } from '@/lib/content-normalizer';
import type { ContentGroup } from './types';
import { ContentListItem } from './ContentListItem';
import { GroupHeader } from './GroupHeader';

interface ContentListViewProps {
  items: NormalizedContent[];
  groups?: ContentGroup[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onItemClick: (item: NormalizedContent) => void;
  isSelectionMode: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function ContentListView({
  items,
  groups,
  selectedIds,
  onSelect,
  onSelectAll,
  onItemClick,
  isSelectionMode,
  isLoading,
  hasMore,
  onLoadMore,
}: ContentListViewProps) {
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

  // Group collapse state management
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // If we have groups, render grouped content
  if (groups && groups.length > 0 && groups[0].id !== 'all') {
    return (
      <div className="space-y-6">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <div key={group.id} className="space-y-2">
              <GroupHeader
                title={group.title}
                count={group.items.length}
                collapsed={isCollapsed}
                onToggle={() => toggleGroup(group.id)}
              />

              {!isCollapsed && (
                <div className="space-y-2 pl-4">
                  {group.items.map((item) => (
                    <ContentListItem
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onSelect={(selected) => onSelect(item.id, selected)}
                      onClick={() => onItemClick(item)}
                      showCheckbox={isSelectionMode}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoading && <LoadingSpinner />}
          </div>
        )}
      </div>
    );
  }

  // Non-grouped (flat) list
  return (
    <div className="space-y-2">
      {/* List Header (optional) */}
      <div className="hidden sm:flex items-center gap-4 px-3 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
        <div className="w-5" /> {/* Checkbox space */}
        <div className="w-16">Preview</div>
        <div className="flex-1">Title</div>
        <div className="w-28">Platforms</div>
        <div className="w-24">Status</div>
        <div className="w-16 text-right">Score</div>
        <div className="w-8" /> {/* Actions space */}
      </div>

      {/* List Items */}
      {items.map((item) => (
        <ContentListItem
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          onSelect={(selected) => onSelect(item.id, selected)}
          onClick={() => onItemClick(item)}
          showCheckbox={isSelectionMode}
        />
      ))}

      {/* Empty State */}
      {items.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-text-secondary">No content found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Try adjusting your filters or create new content
          </p>
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading && <LoadingSpinner />}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">Loading more...</span>
    </div>
  );
}

export default ContentListView;
