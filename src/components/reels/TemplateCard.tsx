'use client';

/**
 * Template Card Component
 *
 * Displays a reel template with preview and metadata.
 */

import type { ReelTemplate } from '@/types';

interface TemplateCardProps {
  template: ReelTemplate;
  onClick: () => void;
  isSelected?: boolean;
}

export function TemplateCard({ template, onClick, isSelected }: TemplateCardProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <button
      onClick={onClick}
      className={`
        group relative bg-surface-secondary rounded-xl overflow-hidden
        border-2 transition-all duration-200 text-left
        ${isSelected
          ? 'border-accent ring-2 ring-accent/30'
          : 'border-transparent hover:border-accent/50'
        }
      `}
    >
      {/* Thumbnail / Preview */}
      <div className="aspect-[9/16] bg-gradient-to-br from-surface to-surface-secondary relative">
        {/* Segment indicators */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-4">
          <div className="space-y-2 w-full max-w-[80%]">
            {template.segments.slice(0, 4).map((segment, i) => (
              <div
                key={segment.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center"
              >
                <span className="text-xs text-white/80">{segment.label}</span>
              </div>
            ))}
            {template.segments.length > 4 && (
              <div className="text-center text-xs text-white/60">
                +{template.segments.length - 4} more
              </div>
            )}
          </div>
        </div>

        {/* Music indicator */}
        {template.musicRequired && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-1.5">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          {formatDuration(template.defaultDurationMs)}
        </div>

        {/* Aspect ratio badge */}
        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
          {template.aspectRatio}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {template.bestFor.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-surface px-2 py-0.5 rounded text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Segments count */}
        <div className="flex items-center gap-2 mt-3 text-xs text-text-secondary">
          <span>{template.segments.length} segments</span>
          <span>•</span>
          <span className="capitalize">{template.category}</span>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 left-3 bg-accent text-white rounded-full p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}
