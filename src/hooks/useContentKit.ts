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
      // Enhanced error handling for timeout scenarios
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('ECONNABORTED')) {
          setError('Loading is taking longer than expected. This can happen during high server load. Please try refreshing the page.');
        } else if (err.message.includes('Network Error')) {
          setError('Network connection issue. Please check your internet connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load content');
      }
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
    // Reset retry count on manual refresh
    retryCountRef.current = 0;
    setError(null);
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
    } catch (err: any) {
      console.error('Content kit detail loading failed:', err);
      
      // Enhanced error handling with retry logic and specific messaging
      if (err instanceof Error || err?.response) {
        const isAxiosError = err?.response || err?.code === 'ECONNABORTED';
        const statusCode = err?.response?.status;
        const errorMessage = err?.response?.data?.error || err.message || String(err);
        
        // Implement automatic retry for transient server errors
        if ((statusCode >= 500 && statusCode < 600) || errorMessage.includes('500')) {
          console.warn('Server error detected, attempting retry...');
          
          if (retryCountRef.current < 3) {
            retryCountRef.current += 1;
            const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
            
            setTimeout(() => {
              console.log(`Retrying content kit load attempt ${retryCountRef.current}/3 after ${retryDelay}ms`);
              fetchData();
            }, retryDelay);
            
            setError(`Server error (attempt ${retryCountRef.current}/3). Retrying...`);
            return;
          } else {
            setError(
              'Server is currently experiencing issues loading this content kit. ' +
              'This could be due to high server load or temporary backend problems. ' +
              'Please try refreshing the page or come back in a few minutes.'
            );
          }
        } else if (statusCode === 404) {
          setError(
            'This content kit was not found. It may have been deleted or the link is incorrect. ' +
            'Please check the URL or contact support if you believe this is an error.'
          );
        } else if (statusCode === 403) {
          setError(
            'You do not have permission to view this content kit. ' +
            'Please make sure you are logged in with the correct account.'
          );
        } else if (statusCode === 401) {
          setError(
            'Your session has expired. Please log in again to access your content kits.'
          );
        } else if (err.message?.includes('timeout') || err.code === 'ECONNABORTED') {
          setError(
            'Loading is taking longer than expected. This usually happens with large content kits ' +
            'or during high server load. Please try refreshing the page or check your internet connection.'
          );
        } else if (err.message?.includes('Network Error') || !navigator.onLine) {
          setError(
            'Unable to connect to the server. Please check your internet connection and try again. ' +
            'If the problem persists, our servers may be temporarily unavailable.'
          );
        } else {
          // Generic fallback with helpful context
          setError(
            `Failed to load content kit: ${errorMessage}. ` +
            'If this error persists, please try refreshing the page or contact support.'
          );
        }
      } else {
        setError(
          'An unexpected error occurred while loading the content kit. ' +
          'Please try refreshing the page or contact support if the problem continues.'
        );
      }
      
      // Reset retry count on non-retryable errors
      if (!err?.response?.status || err.response.status < 500 || err.response.status >= 600) {
        retryCountRef.current = 0;
      }
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
