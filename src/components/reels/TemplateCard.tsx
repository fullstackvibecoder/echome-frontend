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

  // Defensive: ensure arrays exist
  const segments = template.segments || [];
  const bestFor = template.bestFor || [];

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
      <div className="aspect-[9/16] relative overflow-hidden">
        {/* Gradient background based on category */}
        <div className={`absolute inset-0 ${
          template.category === 'hook' ? 'bg-gradient-to-br from-orange-500/80 to-red-600/80' :
          template.category === 'transformation' ? 'bg-gradient-to-br from-purple-500/80 to-pink-600/80' :
          template.category === 'tutorial' ? 'bg-gradient-to-br from-blue-500/80 to-cyan-600/80' :
          template.category === 'lifestyle' ? 'bg-gradient-to-br from-green-500/80 to-teal-600/80' :
          'bg-gradient-to-br from-violet-500/80 to-fuchsia-600/80'
        }`} />

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

        {/* Segment indicators */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-4">
          <div className="space-y-2 w-full max-w-[85%]">
            {segments.slice(0, 4).map((segment, i) => (
              <div
                key={segment.id}
                className="bg-white/20 backdrop-blur-sm rounded-lg p-2.5 text-center border border-white/10 transform transition-transform group-hover:scale-[1.02]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-sm font-medium text-white drop-shadow-sm">{segment.label}</span>
              </div>
            ))}
            {segments.length > 4 && (
              <div className="text-center text-xs text-white/70 font-medium">
                +{segments.length - 4} more segments
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
          {bestFor.slice(0, 2).map((tag) => (
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
          <span>{segments.length} segments</span>
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
