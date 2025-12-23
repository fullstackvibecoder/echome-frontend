'use client';

import { KBFile } from '@/types';
import { formatFileSize, getFileIcon } from '@/lib/file-utils';

interface KBCardProps {
  file: KBFile;
  onDelete: () => void;
}

export function KBCard({ file, onDelete }: KBCardProps) {
  const statusColor = {
    completed: 'text-success',
    processing: 'text-warning',
    pending: 'text-text-secondary',
    failed: 'text-error',
  }[file.status];

  const statusBg = {
    completed: 'bg-success/10 border-success/20',
    processing: 'bg-warning/10 border-warning/20',
    pending: 'bg-bg-secondary border-border',
    failed: 'bg-error/10 border-error/20',
  }[file.status];

  return (
    <div className="card hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">
            {getFileIcon(file.fileType)}
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-body font-semibold truncate">{file.fileName}</h4>
            <p className="text-small text-text-secondary">
              {formatFileSize(file.fileSize)} • {file.fileType.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${statusBg} ${statusColor}`}>
          {file.status}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-bg-secondary rounded-lg">
        <div>
          <p className="text-xs text-text-secondary">Chunks</p>
          <p className="text-body font-semibold">{file.chunksCreated || 0}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Uploaded</p>
          <p className="text-body font-semibold">
            {new Date(file.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-2 border-2 border-error/30 text-error rounded-lg hover:bg-error/10 transition-colors text-small"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
