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

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  const fetchKBs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Enhanced error handling for API calls
      const response = await api.kb.list().catch(error => {
        // Handle specific error cases
        if (error.response?.status === 404) {
          console.warn('[useKnowledgeBase] Knowledge base endpoint not found, will try to create default');
          return { success: false, error: { code: 'ENDPOINT_NOT_FOUND', status: 404 } };
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('[useKnowledgeBase] Authentication error:', error);
          return { success: false, error: { code: 'UNAUTHORIZED', status: error.response.status } };
        }
        throw error; // Re-throw for other errors
      });

      if (response.success && response.data) {
        let kbList = response.data;

        // Auto-create default KB if user has none
        if (kbList.length === 0) {
          console.log('[useKnowledgeBase] No KBs found, creating default');
          try {
            const createResponse = await api.kb.create('My Knowledge Base', true).catch(createError => {
              console.error('[useKnowledgeBase] Create KB API error:', createError);
              // Handle 404 on create endpoint
              if (createError.response?.status === 404) {
                throw new Error('Knowledge base service is not available. Please contact support.');
              }
              throw createError;
            });
            
            if (createResponse.success && createResponse.data) {
              kbList = [createResponse.data];
              console.log('[useKnowledgeBase] Created default KB:', createResponse.data.id);
            } else {
              console.warn('[useKnowledgeBase] Create KB failed:', createResponse.error);
              // Fallback: continue with empty KB list but don't error out
            }
          } catch (createErr: any) {
            console.error('[useKnowledgeBase] Failed to create default KB:', createErr);
            // Don't fail the entire onboarding if KB creation fails
            if (createErr.message?.includes('not available')) {
              setError(createErr.message);
              return;
            }
          }
        }

        setKbs(kbList);
        // Auto-select: prefer initialKbId if valid, otherwise first KB
        if (kbList.length > 0 && !selectedKb) {
          const preferredKb = initialKbId && kbList.find(kb => kb.id === initialKbId);
          setSelectedKb(preferredKb ? preferredKb.id : kbList[0].id);
        }
      } else if (response.error?.code === 'ENDPOINT_NOT_FOUND') {
        // Handle case where KB endpoints are not available
        console.warn('[useKnowledgeBase] KB endpoints not available, continuing with limited functionality');
        setKbs([]);
        setError('Knowledge base is temporarily unavailable. You can still complete onboarding.');
      } else if (response.error?.code === 'UNAUTHORIZED') {
        setError('Please log in again to continue.');
        // Could redirect to login here if needed
      } else {
        throw new Error(response.error?.message || 'Failed to load knowledge bases');
      }
    } catch (err: any) {
      console.error('[useKnowledgeBase] fetchKBs error:', err);
      const errorMessage = extractErrorMessage(err, 'Failed to load knowledge bases');
      
      // Provide more specific error messages for 404s
      if (err.response?.status === 404) {
        setError('Knowledge base service is temporarily unavailable. Please try refreshing the page.');
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('network')) {
        setError('Network connection error. Please check your connection and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedKb, initialKbId]);

  /**
   * Fetch unified content for selected KB
   * This replaces the old fetchFiles method
   */
  const fetchContent = useCallback(async (kbId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.kb.getContent(kbId).catch(error => {
        // Enhanced error handling for content fetching
        if (error.response?.status === 404) {
          console.warn(`[useKnowledgeBase] Knowledge base ${kbId} not found, it may have been deleted`);
          return { success: false, error: { code: 'KB_NOT_FOUND', status: 404, kbId } };
        }
        if (error.response?.status === 403) {
          console.warn(`[useKnowledgeBase] Access denied to knowledge base ${kbId}`);
          return { success: false, error: { code: 'KB_ACCESS_DENIED', status: 403 } };
        }
        throw error;
      });

      if (response.success && response.data) {
        setContentItems(response.data.items || []);
        setContentStats(response.data.stats || DEFAULT_STATS);

        // Also populate legacy files array for backwards compatibility
        // Transform unified items back to KBFile format where applicable
        const legacyFiles: KBFile[] = (response.data.items || [])
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
      } else if (response.error?.code === 'KB_NOT_FOUND') {
        console.warn('[useKnowledgeBase] Knowledge base not found, clearing selection');
        setSelectedKb(null);
        setError('The selected knowledge base was not found. Please refresh the page.');
        setContentItems([]);
        setContentStats(DEFAULT_STATS);
        setFiles([]);
      } else if (response.error?.code === 'KB_ACCESS_DENIED') {
        setError('You do not have permission to access this knowledge base.');
        setContentItems([]);
        setContentStats(DEFAULT_STATS);
        setFiles([]);
      } else {
        throw new Error(response.error?.message || 'Failed to load content');
      }
    } catch (err: any) {
      console.error('[useKnowledgeBase] fetchContent error:', err);
      
      let errorMessage = extractErrorMessage(err, 'Failed to load content');
      
      // Enhanced error categorization
      if (err.response?.status === 404) {
        errorMessage = 'Content not found. The knowledge base may have been deleted.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error while loading content. Please check your connection.';
      }
      
      setError(errorMessage);
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
