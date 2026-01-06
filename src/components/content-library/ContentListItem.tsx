'use client';

/**
 * ContentListItem Component
 *
 * A single row in the content library list view.
 * Displays thumbnail, title, platforms, status, score, and actions.
 */

import { useState } from 'react';
import type { NormalizedContent } from '@/lib/content-normalizer';
import { STATUS_CONFIG, CONTENT_TYPE_CONFIG } from '@/lib/content-normalizer';
import { PLATFORM_CONFIG } from '@/lib/content-kit-utils';

interface ContentListItemProps {
  item: NormalizedContent;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  showCheckbox: boolean;
}

export function ContentListItem({
  item,
  isSelected,
  onSelect,
  onClick,
  showCheckbox,
}: ContentListItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = STATUS_CONFIG[item.status];
  const typeConfig = CONTENT_TYPE_CONFIG[item.type];
  const isProcessing = item.status === 'processing' || item.status === 'pending';

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(!isSelected);
  };

  // Format date
  const formattedDate = formatRelativeDate(item.createdAt);

  // Get first few platforms for display
  const displayPlatforms = item.platforms.slice(0, 4);
  const extraPlatforms = item.platforms.length - 4;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group flex items-center gap-4 p-3 bg-bg-secondary border rounded-lg cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-accent/50
        ${isSelected ? 'border-accent bg-accent/5' : 'border-border'}
      `}
    >
      {/* Checkbox */}
      <div
        className={`
          flex-shrink-0 w-5 h-5 flex items-center justify-center
          transition-opacity duration-200
          ${showCheckbox || isHovered || isSelected ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleCheckboxClick}
      >
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${isSelected
              ? 'bg-accent border-accent text-white'
              : 'border-border hover:border-accent'
            }
          `}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-bg-tertiary">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {typeConfig.icon}
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-text-primary truncate group-hover:text-accent transition-colors">
          {item.title}
        </h3>
        <p className="text-sm text-text-tertiary flex items-center gap-2">
          <span>{typeConfig.label}</span>
          <span>•</span>
          <span>{formattedDate}</span>
          {item.duration && (
            <>
              <span>•</span>
              <span>{formatDuration(item.duration)}</span>
            </>
          )}
        </p>
      </div>

      {/* Platforms */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {displayPlatforms.map((platform) => {
          const config = PLATFORM_CONFIG[platform];
          return (
            <span
              key={platform}
              className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-sm"
              title={config?.label || platform}
            >
              {config?.icon || '📄'}
            </span>
          );
        })}
        {extraPlatforms > 0 && (
          <span className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-xs text-text-secondary font-medium">
            +{extraPlatforms}
          </span>
        )}
        {item.platforms.length === 0 && (
          <span className="text-text-tertiary text-sm">—</span>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0 w-24">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
            ${statusConfig.bgColor} ${statusConfig.color}
          `}
        >
          {isProcessing && (
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {statusConfig.label}
        </span>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 w-16 text-right">
        {item.score ? (
          <span className="text-accent font-medium">{item.score}%</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 w-8">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open actions menu
          }}
          className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreIcon />
        </button>
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// ICONS
// ============================================

function MoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export default ContentListItem;
