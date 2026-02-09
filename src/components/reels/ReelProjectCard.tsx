'use client';

/**
 * Reel Project Card Component
 *
 * Displays a reel project with status and thumbnail.
 */

import type { ReelProject } from '@/types';

interface ReelProjectCardProps {
  project: ReelProject;
  onClick: () => void;
}

export function ReelProjectCard({ project, onClick }: ReelProjectCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-accent animate-pulse';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Rendering...';
      case 'failed':
        return 'Failed';
      default:
        return 'Draft';
    }
  };

  return (
    <button
      onClick={onClick}
      className="group bg-surface rounded-xl overflow-hidden border border-border hover:border-accent/50 transition-all text-left"
    >
      {/* Thumbnail */}
      <div className="aspect-[9/16] bg-surface-secondary relative">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title || 'Reel thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Play button overlay for completed */}
        {project.status === 'completed' && project.outputUrl && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
          <span className="text-xs text-white">{getStatusLabel(project.status)}</span>
        </div>

        {/* Duration badge */}
        {project.outputDurationMs && (
          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
            {formatDuration(project.outputDurationMs)}
          </div>
        )}

        {/* Progress bar for rendering */}
        {project.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-text-primary truncate group-hover:text-accent transition-colors">
          {project.title || 'Untitled Reel'}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
          <span>{formatDate(project.createdAt)}</span>
          {project.addCaptions && (
            <>
              <span>•</span>
              <span>Captions</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
