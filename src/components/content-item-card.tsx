'use client';

import {
  UnifiedContentItem,
  ContentSourceType,
  CONTENT_SOURCE_CONFIG,
} from '@/types';

interface ContentItemCardProps {
  item: UnifiedContentItem;
  onDelete: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  selectionMode?: boolean;
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get icon for source type
 */
function getSourceIcon(sourceType: ContentSourceType): string {
  const icons: Record<ContentSourceType, string> = {
    file_upload: '📄',
    paste_text: '✍️',
    paste_social: '📱',
    paste_email: '📧',
    voice_recording: '🎤',
    mbox_import: '📥',
    youtube_import: '🎬',
    instagram_import: '📸',
    generation: '✨',
    'clip-finder': '🎥',
  };
  return icons[sourceType] || '📄';
}

/**
 * Get color classes for source type badge
 */
function getSourceColor(sourceType: ContentSourceType): string {
  const colors: Record<ContentSourceType, string> = {
    file_upload: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    paste_text: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    paste_social: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    paste_email: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    voice_recording: 'bg-green-500/10 text-green-400 border-green-500/20',
    mbox_import: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    youtube_import: 'bg-red-500/10 text-red-400 border-red-500/20',
    instagram_import: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    generation: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'clip-finder': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  };
  return colors[sourceType] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

export function ContentItemCard({ item, onDelete, selected, onSelect, selectionMode }: ContentItemCardProps) {
  const config = CONTENT_SOURCE_CONFIG[item.sourceType];
  const sourceColor = getSourceColor(item.sourceType);

  const handleCardClick = (e: React.MouseEvent) => {
    // If in selection mode, toggle selection on card click
    if (selectionMode && onSelect) {
      e.preventDefault();
      onSelect(!selected);
    }
  };

  const statusColor = {
    completed: 'text-success',
    processing: 'text-warning',
    uploading: 'text-text-secondary',
    pending: 'text-text-secondary',
    failed: 'text-error',
  }[item.status];

  const statusBg = {
    completed: 'bg-success/10 border-success/20',
    processing: 'bg-warning/10 border-warning/20',
    uploading: 'bg-bg-secondary border-border',
    pending: 'bg-bg-secondary border-border',
    failed: 'bg-error/10 border-error/20',
  }[item.status];

  const statusLabel = {
    completed: 'Trained',
    processing: 'Processing',
    uploading: 'Uploading',
    pending: 'Pending',
    failed: 'Failed',
  }[item.status];

  return (
    <div
      className={`card hover:shadow-lg transition-all border ${
        selected
          ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
          : 'border-border'
      } ${selectionMode ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Selection checkbox */}
          {selectionMode && (
            <div
              className="flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect?.(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-border text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
              />
            </div>
          )}
          <span className="text-3xl flex-shrink-0">
            {getSourceIcon(item.sourceType)}
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-body font-semibold truncate" title={item.title}>
              {item.title}
            </h4>
            {item.description && (
              <p className="text-small text-text-secondary truncate" title={item.description}>
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${statusBg} ${statusColor}`}>
          {statusLabel}
        </div>
      </div>

      {/* Source type badge and metadata */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${sourceColor}`}>
          {config.label}
        </span>

        {item.fileSize !== undefined && item.fileSize > 0 && (
          <span className="text-xs text-text-secondary">
            {formatBytes(item.fileSize)}
          </span>
        )}

        {item.chunkCount !== undefined && item.chunkCount > 0 && (
          <span className="text-xs text-text-secondary flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-success rounded-full"></span>
            {item.chunkCount.toLocaleString()} chunks
          </span>
        )}
      </div>

      {/* Error message if failed */}
      {item.status === 'failed' && item.errorMessage && (
        <div className="mb-3 p-2 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-xs text-error">{item.errorMessage}</p>
        </div>
      )}

      {/* Metadata row */}
      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <div className="mb-3 p-2 bg-bg-secondary rounded-lg">
          {item.metadata.contentCount !== undefined && (
            <p className="text-xs text-text-secondary">
              {String(item.metadata.contentCount)} items imported
            </p>
          )}
          {item.metadata.sourceUrl ? (
            <p className="text-xs text-text-secondary truncate" title={String(item.metadata.sourceUrl)}>
              {String(item.metadata.sourceUrl)}
            </p>
          ) : null}
        </div>
      )}

      {/* Footer with date and actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-text-secondary">
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-xs border border-error/30 text-error rounded hover:bg-error/10 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
