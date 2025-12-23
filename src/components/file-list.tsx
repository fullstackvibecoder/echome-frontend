'use client';

import { FileWithProgress, formatFileSize, getFileIcon } from '@/lib/file-utils';

interface FileListProps {
  files: FileWithProgress[];
  onRemove: (fileId: string) => void;
  totalSize: number;
}

export function FileList({ files, onRemove, totalSize }: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-subheading text-lg">
          Files ({files.length})
        </h3>
        <p className="text-small text-text-secondary">
          Total: {formatFileSize(totalSize)}
        </p>
      </div>

      {/* File List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {files.map((fileWithProgress) => (
          <div
            key={fileWithProgress.id}
            className="bg-bg-secondary rounded-lg p-4 border border-border"
          >
            {/* File Info Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Icon */}
                <span className="text-2xl flex-shrink-0">
                  {getFileIcon(fileWithProgress.file.type)}
                </span>

                {/* Name & Size */}
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium truncate">
                    {fileWithProgress.file.name}
                  </p>
                  <p className="text-small text-text-secondary">
                    {formatFileSize(fileWithProgress.file.size)}
                  </p>
                </div>
              </div>

              {/* Status & Delete */}
              <div className="flex items-center gap-3 ml-4">
                {/* Status Icon */}
                {fileWithProgress.status === 'completed' && (
                  <span className="text-success text-xl">✓</span>
                )}
                {fileWithProgress.status === 'error' && (
                  <span className="text-error text-xl">✕</span>
                )}
                {fileWithProgress.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                )}

                {/* Delete Button */}
                <button
                  onClick={() => onRemove(fileWithProgress.id)}
                  className="text-text-secondary hover:text-error transition-colors"
                  disabled={fileWithProgress.status === 'uploading'}
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {fileWithProgress.status === 'uploading' && (
              <div className="mt-2">
                <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${fileWithProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {fileWithProgress.progress}%
                </p>
              </div>
            )}

            {/* Error Message */}
            {fileWithProgress.status === 'error' && fileWithProgress.error && (
              <p className="text-small text-error mt-2">
                {fileWithProgress.error}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
