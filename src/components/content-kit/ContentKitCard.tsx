'use client';

/**
 * ContentKitCard Component
 *
 * Unified card for displaying content items in the list view.
 * Handles video, text, carousel, and mixed content types.
 * Note: Failed items are filtered out at the API level.
 */

import { UnifiedContentItem } from '@/types';
import { CONTENT_TYPE_CONFIG, PLATFORM_CONFIG } from '@/lib/content-kit-utils';

interface ContentKitCardProps {
  item: UnifiedContentItem;
  onClick: () => void;
}

export function ContentKitCard({ item, onClick }: ContentKitCardProps) {
  const typeConfig = CONTENT_TYPE_CONFIG[item.type];
  const isProcessing = item.status === 'processing' || item.status === 'pending';

  // Get first few platforms for display
  const displayPlatforms = item.platforms.slice(0, 4);
  const extraPlatforms = item.platforms.length - 4;

  // Use thumbnail, carousel image, or fallback to icon
  const displayImage = item.thumbnailUrl || item.carouselImageUrl;

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-bg-secondary rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
        ${isProcessing ? 'border-accent/50' : 'border-border hover:border-accent/50'}
      `}
    >
      {/* Thumbnail / Preview Area */}
      <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
            <span className="text-5xl">{typeConfig.icon}</span>
          </div>
        )}

        {/* Type Badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
          {typeConfig.icon} {typeConfig.label}
        </div>

        {/* Clip Count Badge (for videos) */}
        {item.clipCount > 0 && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/70 text-white">
            {item.clipCount} clip{item.clipCount > 1 ? 's' : ''}
          </div>
        )}

        {/* Carousel Slide Count Badge */}
        {item.carouselSlideCount > 0 && item.clipCount === 0 && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/70 text-white">
            {item.carouselSlideCount} slides
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-sm font-medium">
                {item.statusMessage || 'Processing...'}
              </p>
              {item.progressPercent !== undefined && (
                <p className="text-white/70 text-xs mt-1">{item.progressPercent}%</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Platform Icons */}
        <div className="flex items-center gap-1.5 mb-2">
          {displayPlatforms.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            return (
              <span
                key={platform}
                className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-sm"
                title={config?.label || platform}
              >
                {config?.icon || '📄'}
              </span>
            );
          })}
          {extraPlatforms > 0 && (
            <span className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs text-text-secondary font-medium">
              +{extraPlatforms}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-text-primary line-clamp-2 mb-1 group-hover:text-accent transition-colors">
          {item.title}
        </h3>

        {/* Preview Text */}
        {item.previewText && (
          <p className="text-small text-text-secondary line-clamp-2 mb-3">
            {item.previewText}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="capitalize">
              {item.inputType === 'video' ? '🎬 Video' : item.inputType === 'audio' ? '🎙️ Audio' : '📝 Text'}
            </span>
            <span>•</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>

          {/* Score Badge */}
          {item.voiceScore && item.voiceScore > 0 && (
            <div className="flex items-center gap-1 text-accent">
              <span>🎯</span>
              <span className="font-medium">{item.voiceScore}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="absolute bottom-4 right-4 text-text-secondary group-hover:text-accent transition-colors">
        →
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default ContentKitCard;
