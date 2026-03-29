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
 * Get friendly title based on source type
 */
function getFriendlyTitle(sourceType: ContentSourceType, originalTitle: string): string {
  if (sourceType === 'mbox_import') {
    return 'Email Writing Samples';
  }
  if (sourceType === 'voice_recording') {
    return 'Voice Recording';
  }
  if (sourceType === 'youtube_import') {
    return 'YouTube Content';
  }
  if (sourceType === 'instagram_import') {
    return 'Instagram Posts';
  }
  if (sourceType === 'paste_text') {
    return 'Writing Sample';
  }
  if (sourceType === 'paste_social') {
    return 'Social Media Posts';
  }
  if (sourceType === 'paste_email') {
    return 'Email Sample';
  }
  if (sourceType === 'generation') {
    return 'Agentic Content';
  }
  if (sourceType === 'clip-finder') {
    return 'Video Clip';
  }
  // For file uploads, clean up the title
  return originalTitle.replace(/\.(mbox|pdf|txt|mp3|wav|mp4|mov)$/i, '').replace(/\s*\(batch\s*\d+\)$/i, '');
}

/**
 * Get description based on source type
 */
function getSourceDescription(sourceType: ContentSourceType, itemCount: number, totalChunks: number): string {
  const descriptions: Record<ContentSourceType, string> = {
    mbox_import: `${totalChunks.toLocaleString()} text snippets from your sent emails`,
    file_upload: `${itemCount} documents uploaded for training`,
    paste_text: `${totalChunks.toLocaleString()} snippets from your writing`,
    paste_social: `${totalChunks.toLocaleString()} snippets from social posts`,
    paste_email: `${totalChunks.toLocaleString()} snippets from emails`,
    voice_recording: `${totalChunks.toLocaleString()} snippets transcribed from audio`,
    youtube_import: `${totalChunks.toLocaleString()} snippets from video transcripts`,
    instagram_import: `${totalChunks.toLocaleString()} snippets from Instagram`,
    blog_import: `${totalChunks.toLocaleString()} snippets from blog/website content`,
    generation: `${itemCount} Agentic-generated pieces`,
    'clip-finder': `${itemCount} video clips extracted`,
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
    blog_import: '🌐',
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
    blog_import: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
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
      className={`p-6 transition-all rounded-[1.75rem] border bg-white dark:bg-card ${
        selected
          ? 'border-primary/40 shadow-[0_0_20px_rgba(0,212,255,0.08)]'
          : 'border-outline-variant/40'
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
                className="w-5 h-5 rounded-lg border-2 border-outline-variant/40 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer checked:bg-primary checked:border-primary"
              />
            </div>
          )}
          <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">{getSourceIcon(sourceType)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-body font-semibold truncate" title={getFriendlyTitle(sourceType, groupTitle)}>
              {getFriendlyTitle(sourceType, groupTitle)}
            </h4>
            <p className="text-small text-text-secondary">
              {getSourceDescription(sourceType, items.length, totalChunks)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
            allCompleted
              ? 'bg-green-50 text-green-600'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {allCompleted ? 'Trained' : 'Processing'}
        </div>
      </div>

      {/* Stats row */}
      <div className="rounded-2xl bg-surface-container-low grid grid-cols-3 gap-px mb-3">
        <div className="flex items-center justify-center p-2">
          <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${sourceColor}`}>
            {config.label}
          </span>
        </div>

        <div className="flex items-center justify-center p-2">
          {totalSize > 0 && (
            <span className="text-xs text-text-secondary">{formatBytes(totalSize)}</span>
          )}
        </div>

        <div className="flex items-center justify-center p-2">
          {totalChunks > 0 && (
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-success rounded-full"></span>
              {totalChunks.toLocaleString()} chunks
            </span>
          )}
        </div>
      </div>

      {/* Expandable section */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-full text-xs rounded-xl text-slate-lavender hover:text-primary py-2 border-t border-outline-variant/40 flex items-center justify-center gap-1 transition-colors"
        >
          {expanded ? '▲ Hide' : '▼ Show'} {items.length} items
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-surface-container-low rounded-2xl text-xs"
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
                className="px-2 py-1 text-destructive hover:bg-destructive/5 rounded-xl transition-colors ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 mt-3">
        <p className="text-xs text-text-secondary">{latestDate.toLocaleDateString()}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteAll();
          }}
          className="px-3 py-1 text-xs text-destructive hover:bg-destructive/5 rounded-xl transition-colors"
        >
          Delete All
        </button>
      </div>
    </div>
  );
}
