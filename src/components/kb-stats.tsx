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

function getVoiceStrength(chunks: number): { level: string; color: string; percent: number } {
  if (chunks >= 5000) return { level: 'Excellent', color: 'text-success', percent: 100 };
  if (chunks >= 2000) return { level: 'Strong', color: 'text-success', percent: 80 };
  if (chunks >= 500) return { level: 'Good', color: 'text-accent', percent: 60 };
  if (chunks >= 100) return { level: 'Building', color: 'text-warning', percent: 40 };
  return { level: 'Getting started', color: 'text-text-secondary', percent: 20 };
}

export function KBStats({ stats, kbName }: KBStatsProps) {
  const sourceTypes = stats?.bySourceType
    ? Object.entries(stats.bySourceType).filter(([, count]) => count > 0)
    : [];

  const voiceStrength = getVoiceStrength(stats?.totalChunks || 0);

  return (
    <div className="space-y-4 mb-8">
      {/* Voice Match Strength Bar */}
      <div className="card bg-gradient-to-r from-accent/5 to-success/5 border-accent/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-body font-semibold text-text-primary">Voice Match Strength</p>
            <p className="text-small text-text-secondary">
              More training data = more accurate voice matching
            </p>
          </div>
          <span className={`text-lg font-bold ${voiceStrength.color}`}>
            {voiceStrength.level}
          </span>
        </div>
        <div className="w-full bg-bg-secondary rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-500"
            style={{ width: `${voiceStrength.percent}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {(stats?.totalChunks || 0).toLocaleString()} training chunks from {stats?.totalItems || 0} content items
        </p>
      </div>

      {/* Compact stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card py-3">
          <p className="text-xs text-text-secondary mb-0.5">Content Items</p>
          <p className="text-xl font-bold text-accent">{stats?.totalItems || 0}</p>
        </div>
        <div className="card py-3">
          <p className="text-xs text-text-secondary mb-0.5">Training Chunks</p>
          <p className="text-xl font-bold text-success">{(stats?.totalChunks || 0).toLocaleString()}</p>
        </div>
        <div className="card py-3">
          <p className="text-xs text-text-secondary mb-0.5">Storage Used</p>
          <p className="text-xl font-bold">{formatBytes(stats?.totalSize || 0)}</p>
        </div>
        <div className="card py-3">
          <p className="text-xs text-text-secondary mb-0.5">Content Types</p>
          <p className="text-xl font-bold">{sourceTypes.length}</p>
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
    generation: '✨',
    'clip-finder': '🎥',
  };
  return icons[sourceType] || '📄';
}
