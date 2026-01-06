'use client';

import { KBContentStats, CONTENT_SOURCE_CONFIG, ContentSourceType } from '@/types';

interface KBStatsProps {
  stats: KBContentStats | null;
  kbName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function KBStats({ stats, kbName }: KBStatsProps) {
  const sourceTypes = stats?.bySourceType
    ? Object.entries(stats.bySourceType).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="space-y-4 mb-8">
      {/* Main stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-small text-text-secondary mb-1">Content Items</p>
          <p className="text-display text-3xl font-bold text-accent">
            {stats?.totalItems || 0}
          </p>
        </div>

        <div className="card">
          <p className="text-small text-text-secondary mb-1">Training Chunks</p>
          <p className="text-display text-3xl font-bold text-success">
            {stats?.totalChunks || 0}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Embedded in vector DB
          </p>
        </div>

        <div className="card">
          <p className="text-small text-text-secondary mb-1">Storage Used</p>
          <p className="text-display text-3xl font-bold">
            {formatBytes(stats?.totalSize || 0)}
          </p>
        </div>

        <div className="card">
          <p className="text-small text-text-secondary mb-1">Content Sources</p>
          <p className="text-display text-3xl font-bold">
            {sourceTypes.length}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Different input types
          </p>
        </div>
      </div>

      {/* Source type breakdown */}
      {sourceTypes.length > 0 && (
        <div className="card">
          <p className="text-small text-text-secondary mb-3">Content Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {sourceTypes.map(([type, count]) => {
              const config = CONTENT_SOURCE_CONFIG[type as ContentSourceType];
              if (!config) return null;
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary rounded-lg"
                >
                  <span className="text-lg">{getSourceIcon(type as ContentSourceType)}</span>
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-sm text-accent font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  };
  return icons[sourceType] || '📄';
}
