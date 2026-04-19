'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ReelProject } from '@/types';

interface ReelProjectCardProps {
  project: ReelProject;
  onClick: () => void;
  onDelete?: (projectId: string) => void;
}

const STYLE_LABELS: Record<string, string> = {
  bold_impact: 'Bold Impact',
  minimal_clean: 'Minimal Clean',
  brand_gradient: 'Brand Gradient',
  story_cards: 'Story Cards',
  outlined_stroke: 'Outlined',
  neon_glow: 'Neon',
};

export function ReelProjectCard({ project, onClick, onDelete }: ReelProjectCardProps) {
  const [confirming, setConfirming] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const statusConfig = {
    completed: { label: 'Ready', bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
    processing: { label: 'Rendering...', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500 animate-pulse' },
    failed: { label: 'Failed', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
    draft: { label: 'Draft', bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500' },
  };

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;

  // Hook text for draft preview
  const hookText = project.generatedContent?.hookText
    || project.generatedContent?.segmentOverlays?.[0]?.text
    || project.title
    || 'Untitled Reel';

  // Style label
  const styleId = (project.generatedContent as unknown as Record<string, unknown>)?.style as string || '';
  const styleLabel = STYLE_LABELS[styleId] || '';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onDelete?.(project.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  const isRendering = project.status === 'processing';

  return (
    <button
      onClick={onClick}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary-interactive/40 transition-all text-left w-full"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* Thumbnail / Draft Preview */}
      <div className="aspect-[9/16] relative overflow-hidden bg-surface-container-low">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title || 'Reel'}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
            <p className="text-white text-center text-sm font-bold leading-snug line-clamp-6">
              {hookText}
            </p>
          </div>
        )}

        {/* Play overlay for completed */}
        {project.status === 'completed' && project.outputUrl && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1.5 ${status.bg} backdrop-blur-sm rounded-full px-2 py-0.5`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className={`text-[10px] font-medium ${status.text}`}>{status.label}</span>
        </div>

        {/* Progress bar */}
        {isRendering && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${project.progress || 5}%` }} />
          </div>
        )}

        {/* Hover delete (not during rendering) */}
        {!isRendering && onDelete && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleDelete}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium backdrop-blur-sm transition-colors ${
                confirming
                  ? 'bg-red-500/80 text-white'
                  : 'bg-black/50 text-white/80 hover:bg-black/70'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              {confirming ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-[13px] font-medium text-foreground truncate">
          {project.title || 'Untitled Reel'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground">{formatDate(project.createdAt)}</span>
          {styleLabel && (
            <>
              <span className="text-[11px] text-muted-foreground/30">&middot;</span>
              <span className="text-[10px] text-muted-foreground/60">{styleLabel}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
