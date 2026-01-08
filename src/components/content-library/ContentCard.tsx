'use client';

/**
 * ContentCard Component
 *
 * Grid card for displaying content items.
 * Supports selection, thumbnails, and quick actions.
 */

import { useState } from 'react';
import type { NormalizedContent } from '@/lib/content-normalizer';
import { STATUS_CONFIG, CONTENT_TYPE_CONFIG } from '@/lib/content-normalizer';
import { PlatformIcon, type Platform } from '@/components/shared/PlatformIcon';

interface ContentCardProps {
  item: NormalizedContent;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  showCheckbox: boolean;
}

export function ContentCard({
  item,
  isSelected,
  onSelect,
  onClick,
  showCheckbox,
}: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = STATUS_CONFIG[item.status];
  const typeConfig = CONTENT_TYPE_CONFIG[item.type];
  const isProcessing = item.status === 'processing' || item.status === 'pending';

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(!isSelected);
  };

  // Get first few platforms for display
  const displayPlatforms = item.platforms.slice(0, 4);
  const extraPlatforms = item.platforms.length - 4;

  // Format date
  const formattedDate = formatRelativeDate(item.createdAt);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative bg-bg-secondary rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
        ${isSelected ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-accent/50'}
        ${isProcessing ? 'border-accent/50' : ''}
      `}
    >
      {/* Selection Checkbox */}
      <div
        className={`
          absolute top-3 left-3 z-10 transition-opacity duration-200
          ${showCheckbox || isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleCheckboxClick}
      >
        <div
          className={`
            w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
            backdrop-blur-sm
            ${isSelected
              ? 'bg-accent border-accent text-white'
              : 'bg-white/80 border-white/50 hover:border-accent'
            }
          `}
        >
          {isSelected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Thumbnail / Preview Area */}
      <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
        {item.thumbnailUrl || item.previewImageUrl ? (
          <img
            src={item.thumbnailUrl || item.previewImageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
            <span className="text-5xl">{typeConfig.icon}</span>
          </div>
        )}

        {/* Type Badge */}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}
        >
          {typeConfig.icon} {typeConfig.label}
        </div>

        {/* Clip/Slide Count Badge */}
        {(item.clipCount || item.slideCount) && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-black/70 text-white">
            {item.clipCount ? `${item.clipCount} clip${item.clipCount > 1 ? 's' : ''}` : ''}
            {item.slideCount ? `${item.slideCount} slides` : ''}
          </div>
        )}

        {/* Duration Badge (for clips) */}
        {item.duration && (
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
            {formatDuration(item.duration)}
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Processing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Platform Icons */}
        {item.platforms.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            {displayPlatforms.map((platform) => (
              <span
                key={platform}
                className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center"
                title={platform}
              >
                <PlatformIcon platform={platform as Platform} size={14} />
              </span>
            ))}
            {extraPlatforms > 0 && (
              <span className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs text-text-secondary font-medium">
                +{extraPlatforms}
              </span>
            )}
          </div>
        )}

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
          <span>{formattedDate}</span>

          {/* Score Badge */}
          {item.score && item.score > 0 && (
            <div className="flex items-center gap-1 text-accent">
              <span>🎯</span>
              <span className="font-medium">{item.score}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge (for non-completed items) */}
      {item.status !== 'completed' && (
        <div className="absolute bottom-4 left-4">
          <span
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${statusConfig.bgColor} ${statusConfig.color}
            `}
          >
            {isProcessing && (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {statusConfig.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRelativeDate(date: Date): string {
  // Format as dd/mm/yyyy
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default ContentCard;
