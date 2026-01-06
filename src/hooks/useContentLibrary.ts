'use client';

/**
 * useContentLibrary Hook
 *
 * Comprehensive state management for the Content Library page.
 * Handles data fetching, pagination, filtering, sorting, grouping, and selection.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api-client';
import {
  NormalizedContent,
  normalizeGenerationRequest,
  normalizeVideoUpload,
  normalizeClip,
} from '@/lib/content-normalizer';
import { processItems, calculateStats } from '@/lib/grouping-utils';
import type {
  ContentLibraryState,
  PaginationState,
  ContentGroup,
  ViewMode,
  GroupBy,
  SortBy,
  FilterPreset,
  ContentLibraryStats,
  UseContentLibraryReturn,
  DEFAULT_PAGE_SIZE,
} from '@/components/content-library/types';

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
    activeFilters: ['all'],
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

      // Fetch from both endpoints in parallel
      const [generationResult, clipsResult] = await Promise.all([
        api.generation.listRequests({ limit: PAGE_SIZE, offset: currentOffset })
          .catch(() => ({ success: false, data: null })),
        api.clips.list(PAGE_SIZE)
          .catch(() => ({ success: false, data: null })),
      ]);

      const newItems: NormalizedContent[] = [];
      let totalCount = 0;

      // Transform generation requests
      if (generationResult.success && generationResult.data) {
        for (const req of generationResult.data) {
          newItems.push(normalizeGenerationRequest(req));
        }
        // Estimate total from pagination if available
        totalCount += (generationResult as any).pagination?.total || generationResult.data.length;
      }

      // Transform clip finder uploads
      if (clipsResult.success && clipsResult.data?.uploads) {
        for (const upload of clipsResult.data.uploads) {
          // Skip if already added via generation request
          const alreadyAdded = newItems.some(i =>
            i.videoUploadId === upload.id
          );
          if (alreadyAdded) continue;

          newItems.push(normalizeVideoUpload(upload, null, 0));
        }
        totalCount += clipsResult.data.uploads.length;
      }

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
        total: Math.max(totalCount, prev.total),
        hasMore,
        isLoadingMore: false,
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
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

  const { items: processedItems, groups } = useMemo(() => {
    return processItems(
      allItems,
      state.activeFilters,
      state.searchQuery,
      state.sortBy,
      state.groupBy
    );
  }, [allItems, state.activeFilters, state.searchQuery, state.sortBy, state.groupBy]);

  const stats = useMemo(() => calculateStats(allItems), [allItems]);

  // Update pagination items
  useEffect(() => {
    setPagination(prev => ({ ...prev, items: processedItems }));
  }, [processedItems]);

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

  const toggleFilter = useCallback((filter: FilterPreset) => {
    setState(prev => {
      const filters = new Set(prev.activeFilters);

      if (filter === 'all') {
        // 'All' clears other filters
        return { ...prev, activeFilters: ['all'] };
      }

      // Remove 'all' when selecting specific filter
      filters.delete('all');

      if (filters.has(filter)) {
        filters.delete(filter);
        // If no filters left, default to 'all'
        if (filters.size === 0) {
          return { ...prev, activeFilters: ['all'] };
        }
      } else {
        filters.add(filter);
      }

      return { ...prev, activeFilters: Array.from(filters) };
    });
  }, []);

  const setFilters = useCallback((filters: FilterPreset[]) => {
    setState(prev => ({ ...prev, activeFilters: filters.length ? filters : ['all'] }));
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

    // Group by source type for deletion
    const generationIds: string[] = [];
    const uploadIds: string[] = [];

    for (const item of selectedItems) {
      if (item.generationRequestId) {
        generationIds.push(item.generationRequestId);
      } else if (item.videoUploadId) {
        uploadIds.push(item.videoUploadId);
      }
    }

    try {
      // Delete in parallel
      const deletePromises: Promise<any>[] = [];

      for (const id of generationIds) {
        deletePromises.push(api.generation.deleteRequest(id).catch(() => null));
      }

      for (const id of uploadIds) {
        deletePromises.push(api.clips.delete(id).catch(() => null));
      }

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
    toggleFilter,
    setFilters,

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
