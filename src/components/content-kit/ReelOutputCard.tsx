'use client';

/**
 * ReelOutputCard Component
 *
 * Displays a completed or in-progress reel linked to a content kit.
 * Shows video thumbnail, status, duration, and action buttons.
 */

import { LinkedReelSummary } from '@/types';

interface ReelOutputCardProps {
  reel: LinkedReelSummary;
  onEdit: () => void;
  onDelete?: () => void;
}

export function ReelOutputCard({ reel, onEdit, onDelete }: ReelOutputCardProps) {
  const isProcessing = reel.status === 'processing';
  const isCompleted = reel.status === 'completed';
  const isFailed = reel.status === 'failed';

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = () => {
    if (isProcessing) {
      return {
        label: 'Rendering...',
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        icon: '⏳',
      };
    }
    if (isCompleted) {
      return {
        label: 'Ready',
        color: 'bg-green-500/10 text-green-400 border-green-500/30',
        icon: '✓',
      };
    }
    if (isFailed) {
      return {
        label: 'Failed',
        color: 'bg-red-500/10 text-red-400 border-red-500/30',
        icon: '✗',
      };
    }
    return {
      label: 'Draft',
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
      icon: '📝',
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      {/* Video Preview Area */}
      <div className="relative aspect-[9/16] max-h-80 bg-bg-tertiary">
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt={reel.title || 'Reel preview'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <span className="text-5xl">🎬</span>
          </div>
        )}

        {/* Status Badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
          {statusConfig.icon} {statusConfig.label}
        </div>

        {/* Duration Badge */}
        {reel.outputDurationMs && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/70 text-white">
            {formatDuration(reel.outputDurationMs)}
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Rendering...</p>
              <p className="text-white/70 text-xs mt-1">{reel.progress}%</p>
            </div>
          </div>
        )}

        {/* Play Button Overlay (for completed reels) */}
        {isCompleted && reel.outputUrl && (
          <a
            href={reel.outputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <span className="text-2xl ml-1">▶</span>
            </div>
          </a>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h4 className="font-semibold text-text-primary mb-2 line-clamp-1">
          {reel.title || 'Untitled Reel'}
        </h4>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-text-secondary mb-4">
          <span>Created {formatDate(reel.createdAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            {isCompleted ? 'View Reel' : 'Edit'}
          </button>

          {isCompleted && reel.outputUrl && (
            <a
              href={reel.outputUrl}
              download
              className="px-4 py-2 rounded-lg text-sm font-medium bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80 transition-colors"
            >
              Download
            </a>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
              title="Delete reel"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default ReelOutputCard;
