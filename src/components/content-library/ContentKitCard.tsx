'use client';

/**
 * ContentKitCard Component
 *
 * Minimal vertical card for the redesigned content kit list page.
 * Shows thumbnail, title, summary counts, and date.
 */

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { NormalizedContent } from '@/lib/content-normalizer';

interface ContentKitCardProps {
  item: NormalizedContent;
}

export function ContentKitCard({ item }: ContentKitCardProps) {
  const isProcessing = item.status === 'processing' || item.status === 'pending';
  const isFailed = item.status === 'failed';
  const detailUrl = `/app/content-kit/${item.videoUploadId || item.generationRequestId || item.sourceId}`;

  return (
    <Link
      href={detailUrl}
      className={`
        block rounded-lg border border-border bg-card overflow-hidden
        transition-colors duration-150 hover:border-primary-interactive
        ${isProcessing ? 'opacity-70' : ''}
      `}
    >
      {/* Thumbnail area */}
      <div className="relative h-[88px] bg-surface-container-low overflow-hidden">
        {isProcessing ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : item.thumbnailUrl ? (
          <>
            <img
              src={item.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {item.duration != null && item.duration > 0 && (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium leading-none">
                {formatDuration(item.duration)}
              </span>
            )}
          </>
        ) : item.previewImageUrl ? (
          <img
            src={item.previewImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xl font-semibold text-muted-foreground select-none">
              Aa
            </span>
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="px-3 pt-2.5 pb-3">
        {/* Title */}
        <h3 className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">
          {item.title}
        </h3>

        {/* Summary / status line */}
        <div className="mt-1">
          {isFailed ? (
            <p className="text-[11px] text-destructive">Generation failed</p>
          ) : isProcessing ? (
            <p className="text-[11px] text-amber-600">Processing...</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {buildSummary(item)}
            </p>
          )}
        </div>

        {/* Date */}
        <p className="mt-1 text-[10px] text-[#555]">
          {formatDate(item.createdAt)}
        </p>
      </div>
    </Link>
  );
}

// ============================================
// HELPERS
// ============================================

function buildSummary(item: NormalizedContent): string {
  const parts: string[] = [];
  if (item.platformCount && item.platformCount > 0) {
    parts.push(`${item.platformCount} post${item.platformCount !== 1 ? 's' : ''}`);
  }
  if (item.clipCount && item.clipCount > 0) {
    parts.push(`${item.clipCount} clip${item.clipCount !== 1 ? 's' : ''}`);
  }
  if (item.slideCount && item.slideCount > 0) {
    parts.push(`${item.slideCount} slide${item.slideCount !== 1 ? 's' : ''}`);
  }
  return parts.join(' \u00B7 ') || '\u2014';
}

function formatDate(date: Date): string {
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

export default ContentKitCard;
