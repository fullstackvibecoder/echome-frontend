'use client';

import { useState } from 'react';
import { UnifiedContentItem, ContentSourceType, CONTENT_SOURCE_CONFIG } from '@/types';

interface GroupedContentCardProps {
  items: UnifiedContentItem[];
  sourceType: ContentSourceType;
  groupTitle: string;
  onDelete: (id: string) => void;
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
 * Get description based on source type
 */
function getSourceDescription(sourceType: ContentSourceType, itemCount: number, totalChunks: number): string {
  const descriptions: Record<ContentSourceType, string> = {
    mbox_import: `${itemCount} email batches processed for voice training`,
    file_upload: `${itemCount} files uploaded`,
    paste_text: `${itemCount} writing samples for voice matching`,
    paste_social: `${itemCount} social posts added`,
    paste_email: `${itemCount} emails added`,
    voice_recording: `${itemCount} voice recordings`,
    youtube_import: `${itemCount} YouTube videos imported`,
    instagram_import: `${itemCount} Instagram posts imported`,
    generation: `${itemCount} generated items`,
    'clip-finder': `${itemCount} clips found`,
  };
  return descriptions[sourceType] || `${itemCount} items`;
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

export function GroupedContentCard({
  items,
  sourceType,
  groupTitle,
  onDelete,
  selected,
  onSelect,
  selectionMode,
}: GroupedContentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const config = CONTENT_SOURCE_CONFIG[sourceType];
  const sourceColor = getSourceColor(sourceType);

  // Calculate totals
  const totalChunks = items.reduce((sum, item) => sum + (item.chunkCount || 0), 0);
  const totalSize = items.reduce((sum, item) => sum + (item.fileSize || 0), 0);
  const allCompleted = items.every((item) => item.status === 'completed');
  const latestDate = items.reduce((latest, item) => {
    const itemDate = new Date(item.createdAt);
    return itemDate > latest ? itemDate : latest;
  }, new Date(0));

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.preventDefault();
      onSelect(!selected);
    }
  };

  const handleDeleteAll = async () => {
    if (confirm(`Delete all ${items.length} items in this group? This cannot be undone.`)) {
      for (const item of items) {
        await onDelete(item.id);
      }
    }
  };

  return (
    <div
      className={`card hover:shadow-lg transition-all border ${
        selected
          ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
          : 'border-border'
      } ${selectionMode ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectionMode && (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect?.(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-border text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
              />
            </div>
          )}
          <span className="text-3xl flex-shrink-0">{getSourceIcon(sourceType)}</span>
          <div className="min-w-0 flex-1">
            <h4 className="text-body font-semibold truncate" title={groupTitle}>
              {groupTitle}
            </h4>
            <p className="text-small text-text-secondary">
              {getSourceDescription(sourceType, items.length, totalChunks)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${
            allCompleted
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-warning/10 border-warning/20 text-warning'
          }`}
        >
          {allCompleted ? 'Trained' : 'Processing'}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${sourceColor}`}>
          {config.label}
        </span>

        {totalSize > 0 && (
          <span className="text-xs text-text-secondary">{formatBytes(totalSize)}</span>
        )}

        {totalChunks > 0 && (
          <span className="text-xs text-text-secondary flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-success rounded-full"></span>
            {totalChunks.toLocaleString()} chunks
          </span>
        )}
      </div>

      {/* Expandable section */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-full text-xs text-text-secondary hover:text-text-primary py-2 border-t border-border flex items-center justify-center gap-1 transition-colors"
        >
          {expanded ? '▲ Hide' : '▼ Show'} {items.length} items
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg text-xs"
            >
              <div className="flex-1 min-w-0">
                <span className="text-text-primary truncate block">{item.title}</span>
                <span className="text-text-secondary">
                  {item.chunkCount ? `${item.chunkCount} chunks` : ''}
                  {item.fileSize ? ` • ${formatBytes(item.fileSize)}` : ''}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this item?')) {
                    onDelete(item.id);
                  }
                }}
                className="px-2 py-1 text-error hover:bg-error/10 rounded transition-colors ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border mt-3">
        <p className="text-xs text-text-secondary">{latestDate.toLocaleDateString()}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteAll();
          }}
          className="px-3 py-1 text-xs border border-error/30 text-error rounded hover:bg-error/10 transition-colors"
        >
          Delete All
        </button>
      </div>
    </div>
  );
}
