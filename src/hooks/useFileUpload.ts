'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import {
  FileWithProgress,
  validateFile,
  generateFileId,
} from '@/lib/file-utils';

interface UseFileUploadOptions {
  knowledgeBaseId?: string;
}

interface UseFileUploadReturn {
  files: FileWithProgress[];
  uploading: boolean;
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  uploadFiles: () => Promise<void>;
  clearFiles: () => void;
  totalSize: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { knowledgeBaseId } = options;
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const validatedFiles: FileWithProgress[] = [];

    newFiles.forEach((file) => {
      const validation = validateFile(file);

      if (validation.valid) {
        validatedFiles.push({
          id: generateFileId(),
          file,
          progress: 0,
          status: 'pending',
        });
      } else {
        // Show error for invalid file
        validatedFiles.push({
          id: generateFileId(),
          file,
          progress: 0,
          status: 'error',
          error: validation.error,
        });
      }
    });

    setFiles((prev) => [...prev, ...validatedFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (!knowledgeBaseId) {
      console.error('No knowledge base ID provided for upload');
      return;
    }

    setUploading(true);

    // Get only pending files
    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (const fileWithProgress of pendingFiles) {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithProgress.id ? { ...f, status: 'uploading' } : f
          )
        );

        // Upload file to the specified knowledge base
        await api.files.upload(
          knowledgeBaseId,
          fileWithProgress.file,
          (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id ? { ...f, progress } : f
              )
            );
          }
        );

        // Mark as completed
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithProgress.id
              ? { ...f, status: 'completed', progress: 100 }
              : f
          )
        );
      } catch (error) {
        // Mark as error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileWithProgress.id
              ? {
                  ...f,
                  status: 'error',
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Upload failed',
                }
              : f
          )
        );
      }
    }

    setUploading(false);
  }, [files, knowledgeBaseId]);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  return {
    files,
    uploading,
    addFiles,
    removeFile,
    uploadFiles,
    clearFiles,
    totalSize,
  };
}
