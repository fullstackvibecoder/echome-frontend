'use client';

/**
 * useContentKit Hook
 *
 * Unified data fetching for content kits from both
 * generation requests and clip finder uploads.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import {
  transformGenerationRequest,
  transformVideoUpload,
  calculateStats,
  sortItems,
  filterItems,
} from '@/lib/content-kit-utils';
import type {
  UnifiedContentItem,
  ContentKitStats,
  ContentKitFilter,
  ContentKitSort,
} from '@/types';

interface UseContentKitOptions {
  limit?: number;
  filter?: ContentKitFilter;
  sort?: ContentKitSort;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseContentKitReturn {
  items: UnifiedContentItem[];
  loading: boolean;
  error: string | null;
  stats: ContentKitStats;
  refresh: () => Promise<void>;
  setFilter: (filter: ContentKitFilter) => void;
  setSort: (sort: ContentKitSort) => void;
  activeFilter: ContentKitFilter;
  activeSort: ContentKitSort;
}

export function useContentKit(options: UseContentKitOptions = {}): UseContentKitReturn {
  const {
    limit = 50,
    filter: initialFilter = 'all',
    sort: initialSort = 'recent',
    autoRefresh = false,
    refreshInterval = 30000,
  } = options;

  const [allItems, setAllItems] = useState<UnifiedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ContentKitFilter>(initialFilter);
  const [activeSort, setActiveSort] = useState<ContentKitSort>(initialSort);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Fetch from both endpoints in parallel
      const [generationResult, clipsResult] = await Promise.all([
        api.generation.listRequests({ limit }).catch(() => ({ success: false, data: null })),
        api.clips.list(limit).catch(() => ({ success: false, data: null })),
      ]);

      const items: UnifiedContentItem[] = [];

      // Transform generation requests
      if (generationResult.success && generationResult.data) {
        for (const req of generationResult.data) {
          items.push(transformGenerationRequest(req));
        }
      }

      // Transform clip finder uploads
      // Note: list endpoint only returns basic upload data, not contentKit
      if (clipsResult.success && clipsResult.data?.uploads) {
        for (const upload of clipsResult.data.uploads) {
          // Check if this video upload is already associated with a generation request
          // by looking at the thumbnail or other identifiers
          const alreadyAdded = items.some(i =>
            i.thumbnailUrl === upload.thumbnailUrl ||
            i.videoUploadId === upload.id
          );

          if (alreadyAdded) continue;

          // Add as video item - full details including contentKit will be fetched on detail page
          items.push(
            transformVideoUpload(upload, null, 0)
          );
        }
      }

      // Filter out failed items (extra safety - backend should already filter these)
      const validItems = items.filter(item => item.status !== 'failed');
      setAllItems(validItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Apply filters and sorting
  const filteredItems = filterItems(allItems, activeFilter);
  const sortedItems = sortItems(filteredItems, activeSort);
  const stats = calculateStats(allItems);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  return {
    items: sortedItems,
    loading,
    error,
    stats,
    refresh,
    setFilter: setActiveFilter,
    setSort: setActiveSort,
    activeFilter,
    activeSort,
  };
}

/**
 * Hook for fetching a single content kit detail
 */
interface UseContentKitDetailOptions {
  id: string;
  sourceType?: 'generation' | 'clip-finder' | 'auto';
}

interface UseContentKitDetailReturn {
  item: UnifiedContentItem | null;
  detail: {
    clips: any[];
    contentKit: any | null;
    carousel: any | null;
    content: any[];
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContentKitDetail(options: UseContentKitDetailOptions): UseContentKitDetailReturn {
  const { id, sourceType = 'auto' } = options;

  const [item, setItem] = useState<UnifiedContentItem | null>(null);
  const [detail, setDetail] = useState<UseContentKitDetailReturn['detail']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try generation endpoint first (most common)
      if (sourceType === 'auto' || sourceType === 'generation') {
        try {
          const response = await api.generation.getRequest(id);
          if (response.success && response.data) {
            const data = response.data;

            // Transform to unified item
            const unifiedItem: UnifiedContentItem = {
              id: data.request.id,
              type: data.clips?.length ? 'mixed' : data.carousel ? 'carousel' : 'text',
              title: data.contentKit?.title ||
                     (data.request.inputText?.slice(0, 60) + '...') ||
                     'Generated Content',
              sourceType: 'generation',
              generationRequestId: data.request.id,
              videoUploadId: data.contentKit?.videoUploadId,
              clipCount: data.clips?.length || 0,
              platformCount: data.content?.length || 0,
              carouselSlideCount: data.carousel?.slides?.length || 0,
              chunkCount: 0,
              thumbnailUrl: data.clips?.[0]?.thumbnailUrl,
              platforms: data.request.platforms || [],
              voiceScore: data.request.voiceScore,
              qualityScore: data.request.qualityScore,
              status: data.request.status,
              createdAt: typeof data.request.createdAt === 'string'
                ? data.request.createdAt
                : data.request.createdAt.toString(),
              updatedAt: typeof data.request.createdAt === 'string'
                ? data.request.createdAt
                : data.request.createdAt.toString(),
              inputType: data.request.inputType,
            };

            setItem(unifiedItem);
            setDetail({
              clips: data.clips || [],
              contentKit: data.contentKit || null,
              carousel: data.carousel || null,
              content: data.content || [],
            });
            return;
          }
        } catch {
          // If not found in generation, try clip finder
          if (sourceType === 'auto') {
            // Continue to clip finder
          } else {
            throw new Error('Content not found');
          }
        }
      }

      // Try clip finder endpoint
      if (sourceType === 'auto' || sourceType === 'clip-finder') {
        const response = await api.clips.get(id);
        if (response.success && response.data) {
          const { upload, clips, contentKit } = response.data;

          const unifiedItem = transformVideoUpload(upload, contentKit, clips?.length || 0);
          setItem(unifiedItem);
          setDetail({
            clips: clips || [],
            contentKit: contentKit || null,
            carousel: null,
            content: [],
          });
          return;
        }
      }

      throw new Error('Content not found');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [id, sourceType]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, fetchData]);

  return {
    item,
    detail,
    loading,
    error,
    refresh: fetchData,
  };
}

export default useContentKit;
