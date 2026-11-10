'use client';

/**
 * useContentLibrary Hook
 *
 * Fetches and manages Content Kits for the Content Library page.
 * Handles pagination, filtering, sorting, grouping, and selection.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api, ContentKitListItem, VideoUpload } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import type { NormalizedContent } from '@/lib/content-normalizer';
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
/** Uploads fetched once per refresh to surface failed rows (kits are paginated separately). */
const UPLOADS_FETCH_LIMIT = 100;
const UPLOADS_MAX_PAGES = 5;
const UPLOAD_POLL_MS = 10_000;

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
 * Get platforms that have content in a kit (uses boolean has_* flags from slim list response)
 */
function getKitPlatforms(kit: ContentKitListItem): Platform[] {
  const platforms: Platform[] = [];
  if (kit.hasLinkedin) platforms.push('linkedin');
  if (kit.hasTwitter) platforms.push('twitter');
  if (kit.hasInstagram) platforms.push('instagram');
  if (kit.hasTiktok) platforms.push('tiktok');
  if (kit.hasYoutube) platforms.push('youtube');
  if (kit.hasBlog) platforms.push('blog');
  if (kit.hasEmail) platforms.push('email');
  if (kit.hasVideoScript) platforms.push('video-script');
  return platforms;
}

/**
 * Transform ContentKitListItem to NormalizedContent
 */
function transformKit(kit: ContentKitListItem): NormalizedContent {
  const platforms = getKitPlatforms(kit);
  const upload = kit.video_uploads;

  return {
    id: kit.id,
    type: 'kit',
    title: kit.title || upload?.original_filename || 'Untitled Kit',
    description: kit.description,
    status: kit.contentGenerated ? 'completed' : 'processing',
    platforms,
    thumbnailUrl: kit.thumbnailUrl,
    createdAt: new Date(kit.createdAt),
    sourceId: kit.id,
    videoUploadId: kit.videoUploadId,
    generationRequestId: kit.generationRequestId,
    voiceId: kit.voiceId,
    clipCount: kit.clipsGenerated || 0,
    platformCount: platforms.length,
    raw: kit,
  };
}

/**
 * A failed upload has no kit, so it would otherwise be invisible. Shown as a
 * failed row; the card reads the upload from `raw` for message and actions.
 */
export function transformFailedUpload(upload: VideoUpload): NormalizedContent {
  return {
    id: upload.id,
    type: 'video-upload',
    title: upload.contentKitTitle || upload.originalFilename || upload.sourceUrl || 'Untitled video',
    // In-flight uploads (e.g. just retried) stay visible as processing, never vanish.
    status: upload.status === 'failed' ? 'failed' : 'processing',
    platforms: [],
    thumbnailUrl: upload.thumbnailUrl,
    createdAt: new Date(upload.createdAt),
    sourceId: upload.id,
    videoUploadId: upload.id,
    clipCount: 0,
    platformCount: 0,
    raw: upload,
  };
}

/** Failed and in-flight uploads that are not already represented by a kit in the list. */
export function pickFailedUploads(uploads: VideoUpload[], kits: NormalizedContent[]): NormalizedContent[] {
  const covered = new Set(kits.map(k => k.videoUploadId).filter(Boolean));
  return uploads
    .filter(u => u.status !== 'completed' && !covered.has(u.id))
    .map(transformFailedUpload);
}

/** Page through uploads so failures older than the newest page still show. Capped. */
async function fetchAllUploads(): Promise<{ success: true; data: { uploads: VideoUpload[] } } | null> {
  const all: VideoUpload[] = [];
  try {
    for (let page = 0; page < UPLOADS_MAX_PAGES; page++) {
      const res = await api.clips.list(UPLOADS_FETCH_LIMIT, page * UPLOADS_FETCH_LIMIT, { includeFailed: true });
      if (!res?.success) return page === 0 ? null : { success: true, data: { uploads: all } };
      const batch = res.data?.uploads ?? [];
      all.push(...batch);
      if (batch.length < UPLOADS_FETCH_LIMIT) break;
    }
  } catch {
    // A failure here must not break the kit list.
    return all.length ? { success: true, data: { uploads: all } } : null;
  }
  return { success: true, data: { uploads: all } };
}

/**
 * Calculate stats from content kits
 * Failed uploads are excluded so the "N kits" counts stay about real kits.
 */
function calculateKitStats(allItems: NormalizedContent[]): ContentLibraryStats {
  const items = allItems.filter(i => i.type !== 'video-upload');
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

      // Fetch content kits directly (backend now returns slim response with boolean platform flags)
      // On a fresh load also ask for failed uploads, which the default list hides.
      // A failure here must not break the kit list, so it falls back to no failed rows.
      const [result, uploadsResult] = await Promise.all([
        api.contentKits.list(PAGE_SIZE, currentOffset),
        reset ? fetchAllUploads() : Promise.resolve(null),
      ]);

      if (!result.success) {
        throw new Error('Failed to fetch content kits');
      }

      const newItems = (result.data.kits || []).map(transformKit);

      // Merge with existing items if not resetting
      if (reset) {
        const failedItems = uploadsResult?.success
          ? pickFailedUploads(uploadsResult.data?.uploads ?? [], newItems)
          : [];
        setAllItems([...newItems, ...failedItems]);
      } else {
        setAllItems(prev => {
          // Dedupe by ID; a failed-upload row is dropped if a newly loaded kit now covers it
          const covered = new Set(newItems.map(k => k.videoUploadId).filter(Boolean));
          const existingIds = new Set(prev.map(i => i.id));
          const uniqueNew = newItems.filter(i => !existingIds.has(i.id));
          return [
            ...prev.filter(i => !(i.type === 'video-upload' && covered.has(i.id))),
            ...uniqueNew,
          ];
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

  // While a retried or in-flight upload has no kit yet, watch it so the row turns
  // into a kit or back into a failure without the user pressing Refresh.
  const allItemsRef = useRef(allItems);
  allItemsRef.current = allItems;
  const hasInFlightUpload = allItems.some(i => i.type === 'video-upload' && i.status === 'processing');
  useEffect(() => {
    if (!hasInFlightUpload) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const res = await fetchAllUploads();
      if (cancelled || !res) return;
      const byId = new Map(res.data.uploads.map(u => [u.id, u]));
      const watched = allItemsRef.current.filter(i => i.type === 'video-upload' && i.status === 'processing');
      const finished = watched.some(i => byId.get(i.id)?.status === 'completed');
      setAllItems(prev => prev.map(item => {
        if (item.type !== 'video-upload' || item.status !== 'processing') return item;
        const fresh = byId.get(item.id);
        if (!fresh || fresh.status === 'completed') return item;
        return transformFailedUpload(fresh);
      }));
      // A finished upload now has a kit: reload the list so it shows as one.
      if (finished && !cancelled) fetchData(true);
    }, UPLOAD_POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInFlightUpload]);

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
      // Delete based on item type - route to correct API
      // Note: 'kit' items in the content library are built from generation_requests,
      // so their sourceId is a generation_request_id, NOT a content_kit_id.
      // We must use api.generation.deleteRequest() for these.
      const deletePromises = selectedItems.map(item => {
        switch (item.type) {
          case 'kit':
            // Items shown as "kits" are sourced from generation_requests table.
            // Their sourceId/generationRequestId is a generation_request_id.
            if (item.generationRequestId) {
              return api.generation.deleteRequest(item.generationRequestId).catch(() => null);
            }
            // Fallback: if somehow it's an actual content_kit row
            return api.contentKits.delete(item.sourceId).catch(() => null);
          case 'video-upload':
            // Video upload - delete the upload (which soft-deletes)
            return api.clips.delete(item.sourceId).catch(() => null);
          case 'clip':
            // Individual clip - delete via clips API
            return api.clips.delete(item.videoUploadId || item.sourceId).catch(() => null);
          case 'carousel':
            // Carousel - delete via images API
            return api.images.deleteCarousel(item.sourceId).catch(() => null);
          case 'generated':
            // Generated content - delete via generation API
            return api.generation.deleteRequest(item.generationRequestId || item.sourceId).catch(() => null);
          default:
            // Fallback: try generation request first, then content kit
            if (item.generationRequestId) {
              return api.generation.deleteRequest(item.generationRequestId).catch(() => null);
            }
            return api.contentKits.delete(item.sourceId).catch(() => null);
        }
      });

      await Promise.all(deletePromises);

      // Remove from local state
      setAllItems(prev => prev.filter(item => !state.selectedIds.has(item.id)));
      clearSelection();
    } catch (err) {
      console.error('Failed to delete items:', err);
      throw err;
    }
  }, [processedItems, state.selectedIds, clearSelection]);

  /** Delete a single content kit (soft delete on the backend) and drop it from the list. */
  const deleteItem = useCallback(async (id: string) => {
    // A failed upload row is an upload, not a kit, so it goes through the clips API.
    const target = allItems.find(item => item.id === id);
    if (target?.type === 'video-upload') {
      await api.clips.delete(id);
    } else {
      await api.contentKits.delete(id);
    }
    setAllItems(prev => prev.filter(item => item.id !== id));
  }, [allItems]);

  const markProcessing = useCallback((id: string) => {
    setAllItems(prev => prev.map(item => (item.id === id ? { ...item, status: 'processing' as const } : item)));
  }, []);

  /** Re-run a failed upload in place. Throws the API's own message so the card can show it. */
  const retryUpload = useCallback(async (id: string) => {
    try {
      await api.clips.process(id, { generateContent: true });
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'We could not restart this video. Please try again.'));
    }
    markProcessing(id);
  }, [markProcessing]);

  const retryUploadWithPassword = useCallback(async (id: string, password: string) => {
    try {
      await api.clips.retryWithPassword(id, password);
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'We could not use that passcode. Please try again.'));
    }
    markProcessing(id);
  }, [markProcessing]);

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
    deleteItem,
    retryUpload,
    retryUploadWithPassword,
    downloadSelected,
  };
}

export default useContentLibrary;
