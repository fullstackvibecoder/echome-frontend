'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import {
  KnowledgeBase,
  KBFile,
  UnifiedContentItem,
  KBContentStats,
} from '@/types';

interface UseKnowledgeBaseReturn {
  // Knowledge bases
  kbs: KnowledgeBase[];
  selectedKb: string | null;
  selectKb: (kbId: string) => void;

  // Unified content (new)
  contentItems: UnifiedContentItem[];
  contentStats: KBContentStats | null;

  // Legacy files array (for backwards compatibility)
  files: KBFile[];

  // State
  loading: boolean;
  error: string | null;

  // Actions
  deleteFile: (fileId: string) => Promise<void>;
  deleteContent: (contentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Polling interval for processing items (3 seconds)
const POLLING_INTERVAL = 3000;
// Max polling duration (2 minutes)
const MAX_POLLING_DURATION = 120000;

const DEFAULT_STATS: KBContentStats = {
  totalItems: 0,
  totalChunks: 0,
  totalSize: 0,
  bySourceType: {},
};

export function useKnowledgeBase(initialKbId?: string | null): UseKnowledgeBaseReturn {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [files, setFiles] = useState<KBFile[]>([]);
  const [contentItems, setContentItems] = useState<UnifiedContentItem[]>([]);
  const [contentStats, setContentStats] = useState<KBContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKb, setSelectedKb] = useState<string | null>(initialKbId ?? null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<any>(null);

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants for retry logic
  const maxRetries = 3;
  const maxTimeoutRetries = 2;

  const fetchKBs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.kb.list();
      if (response.success && response.data) {
        let kbList = response.data;

        // Auto-create default KB if user has none
        if (kbList.length === 0) {
          console.log('[useKnowledgeBase] No KBs found, creating default');
          try {
            const createResponse = await api.kb.create('My Knowledge Base', true);
            if (createResponse.success && createResponse.data) {
              kbList = [createResponse.data];
              console.log('[useKnowledgeBase] Created default KB:', createResponse.data.id);
            }
          } catch (createErr) {
            console.error('[useKnowledgeBase] Failed to create default KB:', createErr);
          }
        }

        setKbs(kbList);
        // Auto-select: prefer initialKbId if valid, otherwise first KB
        if (kbList.length > 0 && !selectedKb) {
          const preferredKb = initialKbId && kbList.find(kb => kb.id === initialKbId);
          setSelectedKb(preferredKb ? preferredKb.id : kbList[0].id);
        }
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load knowledge bases'));
    } finally {
      setLoading(false);
    }
  }, [selectedKb]);

  /**
   * Fetch unified content for selected KB
   * This replaces the old fetchFiles method
   */
  const fetchContent = useCallback(async (kbId: string, isRetry: boolean = false) => {
    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      const response = await api.kb.getContent(kbId);

      if (response.success && response.data) {
        setContentItems(response.data.items);
        setContentStats(response.data.stats);

        // Also populate legacy files array for backwards compatibility
        // Transform unified items back to KBFile format where applicable
        const legacyFiles: KBFile[] = response.data.items
          .filter(item => item.fileSize !== undefined)
          .map(item => ({
            id: item.id,
            knowledgeBaseId: kbId,
            fileName: item.title,
            fileType: (item.fileType?.split('/')[1] || 'other') as KBFile['fileType'],
            fileSize: item.fileSize || 0,
            status: item.status === 'uploading' ? 'pending' : item.status,
            chunksCreated: item.chunkCount,
            errorMessage: item.errorMessage,
            uploadedAt: new Date(item.createdAt),
            processedAt: item.status === 'completed' ? new Date(item.updatedAt) : undefined,
          }));
        setFiles(legacyFiles);
        
        // Clear any previous error on successful load
        if (error) {
          setError(null);
        }
      } else {
        setContentStats(DEFAULT_STATS);
      }
    } catch (err: any) {
      console.error('[useKnowledgeBase] Failed to fetch content:', err);
      
      let errorMessage = 'Failed to load knowledge base content';
      let isRetryable = false;
      
      // Enhanced error categorization for knowledge base operations
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage = 'Loading your knowledge base is taking longer than expected. This may happen with large knowledge bases.';
        isRetryable = true;
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMessage = 'Network connection issue while loading knowledge base. Please check your internet connection.';
        isRetryable = true;
      } else if (err?.response?.status === 500) {
        errorMessage = 'Server error while loading knowledge base. Please try again in a moment.';
        isRetryable = true;
      } else if (err?.response?.status === 404) {
        errorMessage = 'Knowledge base not found. It may have been deleted or you may not have access.';
        isRetryable = false;
      } else if (err?.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to view this knowledge base.';
        isRetryable = false;
      } else if (err?.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
        isRetryable = true;
      } else {
        errorMessage = extractErrorMessage(err, 'Failed to load knowledge base content');
        isRetryable = err?.response?.status >= 500;
      }
      
      setError(errorMessage);
      setLastError({ ...err, isRetryable, kbId, timestamp: Date.now() });
      
      // Reset to empty state on error
      setContentItems([]);
      setContentStats(DEFAULT_STATS);
      setFiles([]);
      
      // Store error metadata for potential retry
      (err as any).isRetryable = isRetryable;
      (err as any).kbId = kbId;
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchKBs();
  }, [fetchKBs]);

  useEffect(() => {
    if (selectedKb) {
      fetchContent(selectedKb);
    }
  }, [selectedKb, fetchContent]);

  // Polling effect: auto-refresh while items are processing
  useEffect(() => {
    const hasProcessingItems = contentItems.some(
      (item) => item.status === 'processing' || item.status === 'uploading'
    );

    // Start polling if there are processing items
    if (hasProcessingItems && selectedKb && !pollingIntervalRef.current) {
      pollingStartTimeRef.current = Date.now();
      console.log('[useKnowledgeBase] Starting polling for processing items');

      pollingIntervalRef.current = setInterval(async () => {
        // Check if we've exceeded max polling duration
        if (
          pollingStartTimeRef.current &&
          Date.now() - pollingStartTimeRef.current > MAX_POLLING_DURATION
        ) {
          console.log('[useKnowledgeBase] Polling timeout reached, stopping');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        // Fetch latest content (silently, without setting loading state)
        try {
          const response = await api.kb.getContent(selectedKb);
          if (response.success && response.data) {
            setContentItems(response.data.items);
            setContentStats(response.data.stats);

            // Check if all items are done processing
            const stillProcessing = response.data.items.some(
              (item: UnifiedContentItem) =>
                item.status === 'processing' || item.status === 'uploading'
            );

            if (!stillProcessing) {
              console.log('[useKnowledgeBase] All items processed, stopping polling');
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }
        } catch (err) {
          console.error('[useKnowledgeBase] Polling error:', err);
        }
      }, POLLING_INTERVAL);
    }

    // Cleanup on unmount or when no longer needed
    return () => {
      if (pollingIntervalRef.current && !hasProcessingItems) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [contentItems, selectedKb]);

  // Auto-retry logic for failed knowledge base loads
  useEffect(() => {
    if (!lastError || loading || !lastError.isRetryable || !selectedKb) return;
    
    const isTimeoutError = lastError.code === 'ECONNABORTED' || lastError.message?.includes('timeout');
    const isNetworkError = lastError.code === 'ERR_NETWORK';
    const isServerError = lastError.response?.status >= 500;
    const isRateLimitError = lastError.response?.status === 429;
    
    const shouldRetry = (
      (isTimeoutError && retryCount < maxTimeoutRetries) ||
      (isNetworkError && retryCount < maxRetries) ||
      (isServerError && retryCount < maxRetries) ||
      (isRateLimitError && retryCount < 1)
    );

    if (shouldRetry) {
      // Calculate delay with exponential backoff
      let retryDelay = 2000; // Base delay of 2 seconds
      
      if (isTimeoutError) {
        // Longer delays for timeout errors
        retryDelay = Math.min(5000 * Math.pow(2, retryCount), 15000);
      } else if (isServerError) {
        // Medium delay for server errors
        retryDelay = Math.min(3000 * Math.pow(2, retryCount), 12000);
      } else if (isRateLimitError) {
        // Longer delay for rate limit
        retryDelay = 10000;
      } else if (isNetworkError) {
        // Standard delay for network errors
        retryDelay = Math.min(2000 * Math.pow(2, retryCount), 8000);
      }

      console.log(
        `[useKnowledgeBase] Auto-retrying after ${lastError.code || 'error'} (attempt ${retryCount + 1}/${
          isTimeoutError ? maxTimeoutRetries : maxRetries
        }) in ${retryDelay}ms...`
      );

      retryTimeoutRef.current = setTimeout(async () => {
        setRetryCount(prev => prev + 1);
        setLastError(null);
        try {
          await fetchContent(selectedKb, true);
        } catch (err) {
          console.error('[useKnowledgeBase] Auto-retry failed:', err);
        }
      }, retryDelay);

      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      };
    }
  }, [lastError, loading, retryCount, selectedKb, fetchContent, maxRetries, maxTimeoutRetries]);

  // Reset retry count when KB changes or when successful load
  useEffect(() => {
    setRetryCount(0);
    setLastError(null);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [selectedKb]);

  // Reset retry count on successful content load
  useEffect(() => {
    if (contentItems.length > 0 && retryCount > 0) {
      setRetryCount(0);
      setLastError(null);
    }
  }, [contentItems.length, retryCount]);

  // Cleanup polling and retry timers on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const selectKb = useCallback((kbId: string) => {
    setSelectedKb(kbId);
  }, []);

  /**
   * Delete a file (legacy method)
   */
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      await api.files.delete(fileId);
      if (selectedKb) {
        await fetchContent(selectedKb);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete file'));
      throw err;
    }
  }, [selectedKb, fetchContent]);

  /**
   * Delete any content item (works for all source types)
   */
  const deleteContent = useCallback(async (contentId: string) => {
    try {
      // Try deleting as file first, then as kb content
      try {
        await api.files.delete(contentId);
      } catch {
        // If file delete fails, try kbContent delete
        await api.kbContent.deleteContent(contentId);
      }

      if (selectedKb) {
        await fetchContent(selectedKb);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete content'));
      throw err;
    }
  }, [selectedKb, fetchContent]);

  const refresh = useCallback(async () => {
    await fetchKBs();
    if (selectedKb) {
      await fetchContent(selectedKb);
    }
  }, [fetchKBs, fetchContent, selectedKb]);

  return {
    kbs,
    selectedKb,
    selectKb,
    contentItems,
    contentStats,
    files,
    loading,
    error,
    deleteFile,
    deleteContent,
    refresh,
  };
}
