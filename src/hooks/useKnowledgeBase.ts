'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { KnowledgeBase, KBFile } from '@/types';

interface UseKnowledgeBaseReturn {
  kbs: KnowledgeBase[];
  files: KBFile[];
  loading: boolean;
  error: string | null;
  selectedKb: string | null;
  selectKb: (kbId: string) => void;
  deleteFile: (fileId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [files, setFiles] = useState<KBFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKb, setSelectedKb] = useState<string | null>(null);

  const fetchKBs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.kb.list();
      if (response.success && response.data) {
        setKbs(response.data);
        // Auto-select first KB
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

  const fetchFiles = useCallback(async (kbId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.files.list(kbId);
      if (response.success && response.data) {
        setFiles(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKBs();
  }, [fetchKBs]);

  useEffect(() => {
    if (selectedKb) {
      fetchFiles(selectedKb);
    }
  }, [selectedKb, fetchFiles]);

  const selectKb = useCallback((kbId: string) => {
    setSelectedKb(kbId);
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      await api.files.delete(fileId);
      if (selectedKb) {
        await fetchFiles(selectedKb);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    }
  }, [selectedKb, fetchFiles]);

  const refresh = useCallback(async () => {
    await fetchKBs();
    if (selectedKb) {
      await fetchFiles(selectedKb);
    }
  }, [fetchKBs, fetchFiles, selectedKb]);

  return {
    kbs,
    files,
    loading,
    error,
    selectedKb,
    selectKb,
    deleteFile,
    refresh,
  };
}
