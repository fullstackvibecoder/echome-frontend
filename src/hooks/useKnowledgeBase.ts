'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';
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

export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [files, setFiles] = useState<KBFile[]>([]);
  const [contentItems, setContentItems] = useState<UnifiedContentItem[]>([]);
  const [contentStats, setContentStats] = useState<KBContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKb, setSelectedKb] = useState<string | null>(null);

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  const fetchKBs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.kb.list();
      if (response.success && response.data) {
        setKbs(response.data);
        // Auto-select first KB if none selected
        if (response.data.length > 0 && !selectedKb) {
          setSelectedKb(response.data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  }, [selectedKb]);

  /**
   * Fetch unified content for selected KB
   * This replaces the old fetchFiles method
   */
  const fetchContent = useCallback(async (kbId: string) => {
    try {
      setLoading(true);
      setError(null);

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
      // Reset to empty state on error
      setContentItems([]);
      setContentStats(DEFAULT_STATS);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
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
      setError(err instanceof Error ? err.message : 'Failed to delete file');
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
      setError(err instanceof Error ? err.message : 'Failed to delete content');
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
