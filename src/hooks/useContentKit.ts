'use client';

/**
 * useContentKit Hook
 *
 * Unified data fetching for content kits from both
 * generation requests and clip finder uploads.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try kit endpoint first. The /app/library/{id} URL is keyed by
      // content_kit_id (e.g., autonomous Drafted-For-You proposals from
      // DraftCard, kit list items, etc.), so this is the natural lookup.
      // Older link sources may pass a generation_request_id or upload_id;
      // those fall through to the legacy branches below.
      if (sourceType === 'auto') {
        try {
          const kitResponse = await api.contentKits.get(id);
          if (kitResponse.success && kitResponse.data) {
            const data = kitResponse.data as any;
            const kit = data.kit;
            const upload = data.upload;
            const clips = data.clips || [];
            const carousel = data.carousel || null;

            const unifiedItem: UnifiedContentItem = {
              id: kit.id,
              type: clips.length > 0 ? 'mixed' : carousel ? 'carousel' : 'text',
              title: kit.title || 'Generated Content',
              sourceType: 'generation',
              generationRequestId: kit.generation_request_id,
              videoUploadId: kit.video_upload_id,
              clipCount: clips.length,
              platformCount: 0,
              carouselSlideCount: carousel?.slides?.length || 0,
              chunkCount: 0,
              thumbnailUrl: clips[0]?.thumbnailUrl || upload?.thumbnailUrl,
              platforms: [],
              status: 'completed',
              createdAt: kit.created_at || kit.createdAt,
              updatedAt: kit.updated_at || kit.updatedAt || kit.created_at,
              // Autonomous draft kits and most kit-keyed entries don't carry
              // an explicit input_type; default to 'text' since they were
              // generated from an angle string. Video-backed kits that pass
              // through the legacy generation/clips branches set this directly.
              inputType: kit.input_type || 'text',
            };

            setItem(unifiedItem);
            setDetail({
              clips,
              contentKit: kit,
              carousel,
              content: [],
            });
            return;
          }
        } catch {
          // Fall through. The id may be a generation_request_id or upload_id.
        }
      }

      // Try generation endpoint
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

      // Try clip finder endpoint. Wrapped in try/catch so a 404/500 here
      // (e.g., id is actually a kit_id with no upload) falls through to the
      // generic not-found error rather than surfacing the raw status.
      if (sourceType === 'auto' || sourceType === 'clip-finder') {
        try {
          const response = await api.clips.get(id);
          if (response.success && response.data) {
            const { upload, clips, contentKit } = response.data;

            const unifiedItem = transformVideoUpload(upload, contentKit, clips?.length || 0);
            setItem(unifiedItem);

            // Fetch carousel data separately — clips endpoint doesn't return it
            let carousel = null;
            if (contentKit?.id) {
              try {
                const kitResponse = await api.contentKits.get(contentKit.id);
                if (kitResponse.success && kitResponse.data) {
                  carousel = (kitResponse.data as any).carousel || null;
                }
              } catch {
                // Carousel fetch failed — not critical, continue without it
              }
            }

            setDetail({
              clips: clips || [],
              contentKit: contentKit || null,
              carousel,
              content: [],
            });
            return;
          }
        } catch {
          // Fall through to the not-found below
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

  // Retry logic: If request is completed but no content data, retry a few times
  // This handles race condition where page loads before content_kit is fully committed
  // Uses ref to track retries across renders to prevent infinite loops
  useEffect(() => {
    const hasContentData = detail?.contentKit || detail?.carousel || (detail?.content && detail.content.length > 0);
    const shouldRetry = item && item.status === 'completed' && !hasContentData && !loading;
    const maxRetries = 3;
    const retryDelay = 1500;

    if (shouldRetry && retryCountRef.current < maxRetries) {
      const timer = setTimeout(() => {
        retryCountRef.current += 1;
        console.log(`Retrying content fetch (attempt ${retryCountRef.current}/${maxRetries})...`);
        fetchData();
      }, retryDelay);
      return () => clearTimeout(timer);
    }

    // Reset retry count when we get content or when id changes
    if (hasContentData) {
      retryCountRef.current = 0;
    }
  }, [item, detail?.contentKit, detail?.carousel, detail?.content, loading, fetchData]);

  return {
    item,
    detail,
    loading,
    error,
    refresh: fetchData,
  };
}

export default useContentKit;
