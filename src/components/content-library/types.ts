/**
 * Content Library Types
 *
 * Type definitions for the Content Library UI components.
 */

import type { NormalizedContent, ContentType, DisplayStatus } from '@/lib/content-normalizer';
import type { Platform } from '@/types';

// ============================================
// VIEW & FILTER TYPES
// ============================================

export type ViewMode = 'list' | 'grid';

export type GroupBy = 'none' | 'date' | 'platform' | 'status' | 'type';

export type SortBy = 'recent' | 'oldest' | 'voice-score' | 'status';

// Content type filters
export type ContentTypeFilter = 'all' | 'videos' | 'written' | 'carousels' | 'processing';

// Platform filters
export type PlatformFilter = 'linkedin' | 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'blog' | 'email';

// Combined filter type
export type FilterPreset = ContentTypeFilter | PlatformFilter;

// ============================================
// STATE TYPES
// ============================================

export interface ContentLibraryState {
  // View options
  viewMode: ViewMode;
  groupBy: GroupBy;
  sortBy: SortBy;

  // Filtering
  searchQuery: string;
  contentTypeFilter: ContentTypeFilter;
  platformFilters: PlatformFilter[];

  // Selection
  selectedIds: Set<string>;
  isSelectionMode: boolean;
}

export interface PaginationState {
  items: NormalizedContent[];
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

// ============================================
// GROUPED CONTENT
// ============================================

export interface ContentGroup {
  id: string;
  title: string;
  items: NormalizedContent[];
  collapsed: boolean;
}

// Date group IDs
export type DateGroupId = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'older';

// ============================================
// COMPONENT PROPS
// ============================================

export interface ContentListViewProps {
  items: NormalizedContent[];
  groups?: ContentGroup[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onItemClick: (item: NormalizedContent) => void;
  isSelectionMode: boolean;
  isLoading?: boolean;
  loadMoreRef?: React.RefObject<HTMLDivElement>;
}

export interface ContentListItemProps {
  item: NormalizedContent;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  showCheckbox: boolean;
}

export interface ContentGridViewProps {
  items: NormalizedContent[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onItemClick: (item: NormalizedContent) => void;
  isSelectionMode: boolean;
}

export interface ContentCardProps {
  item: NormalizedContent;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  showCheckbox: boolean;
}

export interface GroupHeaderProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

export interface ContentFiltersBarProps {
  viewMode: ViewMode;
  groupBy: GroupBy;
  sortBy: SortBy;
  searchQuery: string;
  contentTypeFilter: ContentTypeFilter;
  platformFilters: PlatformFilter[];
  onViewModeChange: (mode: ViewMode) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onSearchChange: (query: string) => void;
  onContentTypeFilterChange: (filter: ContentTypeFilter) => void;
  onPlatformFilterToggle: (platform: PlatformFilter) => void;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onExport: () => void;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseContentLibraryReturn {
  // Data
  items: NormalizedContent[];
  groups: ContentGroup[];
  stats: ContentLibraryStats;

  // State
  state: ContentLibraryState;
  pagination: PaginationState;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSearchQuery: (query: string) => void;
  setContentTypeFilter: (filter: ContentTypeFilter) => void;
  togglePlatformFilter: (platform: PlatformFilter) => void;
  clearPlatformFilters: () => void;

  // Selection
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectionMode: (enabled: boolean) => void;

  // Pagination
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Bulk actions
  deleteSelected: () => Promise<void>;
  downloadSelected: () => Promise<void>;
}

// ============================================
// STATS
// ============================================

export interface ContentLibraryStats {
  total: number;
  videos: number;
  written: number;
  carousels: number;
  processing: number;
  thisWeek: number;
  // Platform counts
  linkedin: number;
  twitter: number;
  instagram: number;
  tiktok: number;
  youtube: number;
  blog: number;
  email: number;
}

// ============================================
// CONFIG CONSTANTS
// ============================================

export const DEFAULT_PAGE_SIZE = 20;

// Content type filter config
export const CONTENT_TYPE_FILTER_CONFIG: Record<ContentTypeFilter, { label: string; icon?: string }> = {
  all: { label: 'All' },
  videos: { label: 'Videos', icon: '🎬' },
  written: { label: 'Written', icon: '📝' },
  carousels: { label: 'Carousels', icon: '📸' },
  processing: { label: 'Processing', icon: '⏳' },
};

// Platform filter config
export const PLATFORM_FILTER_CONFIG: Record<PlatformFilter, { label: string; icon: string }> = {
  linkedin: { label: 'LinkedIn', icon: '💼' },
  twitter: { label: 'Twitter/X', icon: '𝕏' },
  instagram: { label: 'Instagram', icon: '📸' },
  tiktok: { label: 'TikTok', icon: '🎵' },
  youtube: { label: 'YouTube', icon: '📺' },
  blog: { label: 'Blog', icon: '📝' },
  email: { label: 'Email', icon: '✉️' },
};

export const GROUP_BY_CONFIG: Record<GroupBy, { label: string }> = {
  none: { label: 'None' },
  date: { label: 'Date' },
  platform: { label: 'Platform' },
  status: { label: 'Status' },
  type: { label: 'Type' },
};

export const SORT_BY_CONFIG: Record<SortBy, { label: string }> = {
  recent: { label: 'Most Recent' },
  oldest: { label: 'Oldest First' },
  'voice-score': { label: 'Voice Score' },
  status: { label: 'Status' },
};
