'use client';

/**
 * useContentLibrary Hook
 *
 * Fetches and manages Content Kits for the Content Library page.
 * Handles pagination, filtering, sorting, grouping, and selection.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api, ContentKit } from '@/lib/api-client';
import type { NormalizedContent } from '@/lib/content-normalizer';
import { normalizeKit } from '@/lib/content-normalizer';
import type {
  ContentLibraryState,
  PaginationState,
  ContentGroup,
  ViewMode,
  GroupBy,
  SortBy,
  ContentTypeFilter,
  PlatformFilter,
  ContentLibraryStats,
  UseContentLibraryReturn,
} from '@/components/content-library/types';
import type { Platform } from '@/types';

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'content-library-preferences';
const PAGE_SIZE = 20;

interface StoredPreferences {
  viewMode: ViewMode;
  groupBy: GroupBy;
  sortBy: SortBy;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadPreferences(): Partial<StoredPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePreferences(prefs: StoredPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get platforms that have content in a kit
 */
function getKitPlatforms(kit: ContentKit): Platform[] {
  const platforms: Platform[] = [];
  if (kit.contentLinkedin) platforms.push('linkedin');
  if (kit.contentTwitter) platforms.push('twitter');
  if (kit.contentInstagram) platforms.push('instagram');
  if (kit.contentTiktok) platforms.push('tiktok');
  if (kit.contentYoutube) platforms.push('youtube');
  if (kit.contentBlog) platforms.push('blog');
  if (kit.contentEmail) platforms.push('email');
  if (kit.contentVideoScript) platforms.push('video-script');
  return platforms;
}

/**
 * Transform ContentKit to NormalizedContent
 */
function transformKit(kit: ContentKit & { video_uploads?: any }): NormalizedContent {
  const platforms = getKitPlatforms(kit);
  const upload = kit.video_uploads;

  return {
    id: kit.id,
    type: 'kit',
    title: kit.title || upload?.original_filename || 'Untitled Kit',
    description: kit.description,
    status: kit.contentGenerated ? 'completed' : 'processing',
    platforms,
    thumbnailUrl: upload?.thumbnail_url,
    createdAt: new Date(kit.createdAt),
    sourceId: kit.id,
    videoUploadId: kit.videoUploadId,
    generationRequestId: kit.generationRequestId,
    clipCount: kit.clipsGenerated || 0,
    platformCount: platforms.length,
    raw: kit,
  };
}

/**
 * Calculate stats from content kits
 */
function calculateKitStats(items: NormalizedContent[]): ContentLibraryStats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    total: items.length,
    videos: items.filter(i => (i.clipCount || 0) > 0).length,
    written: items.filter(i => (i.platformCount || 0) > 0).length,
    carousels: 0, // TODO: Track carousel count
    processing: items.filter(i => i.status === 'processing' || i.status === 'pending').length,
    thisWeek: items.filter(i => i.createdAt >= weekAgo).length,
    linkedin: items.filter(i => i.platforms.includes('linkedin')).length,
    twitter: items.filter(i => i.platforms.includes('twitter')).length,
    instagram: items.filter(i => i.platforms.includes('instagram')).length,
    tiktok: items.filter(i => i.platforms.includes('tiktok')).length,
    youtube: items.filter(i => i.platforms.includes('youtube')).length,
    blog: items.filter(i => i.platforms.includes('blog')).length,
    email: items.filter(i => i.platforms.includes('email')).length,
  };
}

/**
 * Filter items by content type and platforms
 */
function filterItems(
  items: NormalizedContent[],
  contentTypeFilter: ContentTypeFilter,
  platformFilters: PlatformFilter[],
  searchQuery: string
): NormalizedContent[] {
  let filtered = items;

  // Content type filter
  if (contentTypeFilter !== 'all') {
    switch (contentTypeFilter) {
      case 'videos':
        filtered = filtered.filter(i => (i.clipCount || 0) > 0);
        break;
      case 'written':
        filtered = filtered.filter(i => (i.platformCount || 0) > 0 && (i.clipCount || 0) === 0);
        break;
      case 'carousels':
        filtered = filtered.filter(i => (i.slideCount || 0) > 0);
        break;
      case 'processing':
        filtered = filtered.filter(i => i.status === 'processing' || i.status === 'pending');
        break;
    }
  }

  // Platform filters (OR logic - show if has ANY of selected platforms)
  if (platformFilters.length > 0) {
    filtered = filtered.filter(item =>
      platformFilters.some(platform => item.platforms.includes(platform as Platform))
    );
  }

  // Search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.platforms.some(p => p.toLowerCase().includes(query))
    );
  }

  return filtered;
}

/**
 * Sort items
 */
function sortItems(items: NormalizedContent[], sortBy: SortBy): NormalizedContent[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'recent':
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case 'oldest':
      sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'voice-score':
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      break;
    case 'status':
      const statusOrder = { processing: 0, pending: 1, completed: 2, failed: 3 };
      sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      break;
  }

  return sorted;
}

/**
 * Group items by date
 */
function groupByDate(items: NormalizedContent[]): ContentGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: Record<string, NormalizedContent[]> = {
    today: [],
    yesterday: [],
    'this-week': [],
    'this-month': [],
    older: [],
  };

  items.forEach(item => {
    if (item.createdAt >= startOfToday) groups.today.push(item);
    else if (item.createdAt >= startOfYesterday) groups.yesterday.push(item);
    else if (item.createdAt >= startOfWeek) groups['this-week'].push(item);
    else if (item.createdAt >= startOfMonth) groups['this-month'].push(item);
    else groups.older.push(item);
  });

  const labels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    'this-week': 'This Week',
    'this-month': 'This Month',
    older: 'Older',
  };

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([id, items]) => ({
      id,
      title: labels[id],
      items,
      collapsed: false,
    }));
}

// ============================================
// HOOK
// ============================================

export function useContentLibrary(): UseContentLibraryReturn {
  // Load persisted preferences
  const storedPrefs = useMemo(() => loadPreferences(), []);

  // State
  const [state, setState] = useState<ContentLibraryState>({
    viewMode: storedPrefs.viewMode || 'list',
    groupBy: storedPrefs.groupBy || 'date',
    sortBy: storedPrefs.sortBy || 'recent',
    searchQuery: '',
    contentTypeFilter: 'all',
    platformFilters: [],
    selectedIds: new Set(),
    isSelectionMode: false,
  });

  const [allItems, setAllItems] = useState<NormalizedContent[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    items: [],
    offset: 0,
    limit: PAGE_SIZE,
    total: 0,
    hasMore: true,
    isLoadingMore: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for avoiding stale closures
  const fetchingRef = useRef(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchData = useCallback(async (reset = false) => {
    if (fetchingRef.current && !reset) return;
    fetchingRef.current = true;

    try {
      setError(null);
      if (reset) {
        setIsLoading(true);
        setPagination(prev => ({ ...prev, offset: 0, items: [], hasMore: true }));
      } else {
        setPagination(prev => ({ ...prev, isLoadingMore: true }));
      }

      const currentOffset = reset ? 0 : pagination.offset;

      // Fetch content kits
      const result = await api.contentKits.list(PAGE_SIZE, currentOffset);

      if (!result.success) {
        throw new Error('Failed to fetch content kits');
      }

      const newItems = (result.data.kits || []).map(transformKit);

      // Merge with existing items if not resetting
      if (reset) {
        setAllItems(newItems);
      } else {
        setAllItems(prev => {
          // Dedupe by ID
          const existingIds = new Set(prev.map(i => i.id));
          const uniqueNew = newItems.filter(i => !existingIds.has(i.id));
          return [...prev, ...uniqueNew];
        });
      }

      // Update pagination
      const nextOffset = currentOffset + PAGE_SIZE;
      const hasMore = newItems.length === PAGE_SIZE;

      setPagination(prev => ({
        ...prev,
        offset: nextOffset,
        hasMore,
        isLoadingMore: false,
      }));

    } catch (err: any) {
      console.error('Content Library fetch error:', err);
      // Better error messages
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else if (err.response?.status === 401) {
        setError('Please log in to view your content.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.message || 'Failed to load content');
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [pagination.offset]);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, []);

  // ============================================
  // PROCESSED DATA
  // ============================================

  const processedItems = useMemo(() => {
    let items = filterItems(
      allItems,
      state.contentTypeFilter,
      state.platformFilters,
      state.searchQuery
    );
    items = sortItems(items, state.sortBy);
    return items;
  }, [allItems, state.contentTypeFilter, state.platformFilters, state.searchQuery, state.sortBy]);

  const groups = useMemo(() => {
    if (state.groupBy === 'date') {
      return groupByDate(processedItems);
    }
    // For 'none' or other groupBy values, return all items in one group
    return [{
      id: 'all',
      title: 'All Content',
      items: processedItems,
      collapsed: false,
    }];
  }, [processedItems, state.groupBy]);

  const stats = useMemo(() => calculateKitStats(allItems), [allItems]);

  // ============================================
  // STATE SETTERS
  // ============================================

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
    savePreferences({ viewMode: mode, groupBy: state.groupBy, sortBy: state.sortBy });
  }, [state.groupBy, state.sortBy]);

  const setGroupBy = useCallback((groupBy: GroupBy) => {
    setState(prev => ({ ...prev, groupBy }));
    savePreferences({ viewMode: state.viewMode, groupBy, sortBy: state.sortBy });
  }, [state.viewMode, state.sortBy]);

  const setSortBy = useCallback((sortBy: SortBy) => {
    setState(prev => ({ ...prev, sortBy }));
    savePreferences({ viewMode: state.viewMode, groupBy: state.groupBy, sortBy });
  }, [state.viewMode, state.groupBy]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setContentTypeFilter = useCallback((filter: ContentTypeFilter) => {
    setState(prev => ({ ...prev, contentTypeFilter: filter }));
  }, []);

  const togglePlatformFilter = useCallback((platform: PlatformFilter) => {
    setState(prev => {
      const filters = new Set(prev.platformFilters);
      if (filters.has(platform)) {
        filters.delete(platform);
      } else {
        filters.add(platform);
      }
      return { ...prev, platformFilters: Array.from(filters) };
    });
  }, []);

  const clearPlatformFilters = useCallback(() => {
    setState(prev => ({ ...prev, platformFilters: [] }));
  }, []);

  // ============================================
  // SELECTION
  // ============================================

  const selectItem = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      newSelected.add(id);
      return { ...prev, selectedIds: newSelected, isSelectionMode: true };
    });
  }, []);

  const deselectItem = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      newSelected.delete(id);
      return {
        ...prev,
        selectedIds: newSelected,
        isSelectionMode: newSelected.size > 0,
      };
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return {
        ...prev,
        selectedIds: newSelected,
        isSelectionMode: newSelected.size > 0,
      };
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = processedItems.map(item => item.id);
    setState(prev => ({
      ...prev,
      selectedIds: new Set(allIds),
      isSelectionMode: true,
    }));
  }, [processedItems]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIds: new Set(),
      isSelectionMode: false,
    }));
  }, []);

  const setSelectionMode = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      isSelectionMode: enabled,
      selectedIds: enabled ? prev.selectedIds : new Set(),
    }));
  }, []);

  // ============================================
  // PAGINATION
  // ============================================

  const loadMore = useCallback(async () => {
    if (pagination.isLoadingMore || !pagination.hasMore) return;
    await fetchData(false);
  }, [fetchData, pagination.isLoadingMore, pagination.hasMore]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // ============================================
  // BULK ACTIONS
  // ============================================

  const deleteSelected = useCallback(async () => {
    const selectedItems = processedItems.filter(item => state.selectedIds.has(item.id));

    try {
      // Delete content kits
      const deletePromises = selectedItems.map(item =>
        api.contentKits.delete(item.sourceId).catch(() => null)
      );

      await Promise.all(deletePromises);

      // Remove from local state
      setAllItems(prev => prev.filter(item => !state.selectedIds.has(item.id)));
      clearSelection();
    } catch (err) {
      console.error('Failed to delete items:', err);
      throw err;
    }
  }, [processedItems, state.selectedIds, clearSelection]);

  const downloadSelected = useCallback(async () => {
    // TODO: Implement bulk download
    console.log('Download selected:', Array.from(state.selectedIds));
  }, [state.selectedIds]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data
    items: processedItems,
    groups,
    stats,

    // State
    state,
    pagination,

    // Loading states
    isLoading,
    isLoadingMore: pagination.isLoadingMore,
    error,

    // Actions
    setViewMode,
    setGroupBy,
    setSortBy,
    setSearchQuery,
    setContentTypeFilter,
    togglePlatformFilter,
    clearPlatformFilters,

    // Selection
    selectItem,
    deselectItem,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectionMode,

    // Pagination
    loadMore,
    refresh,

    // Bulk actions
    deleteSelected,
    downloadSelected,
  };
}

export default useContentLibrary;
