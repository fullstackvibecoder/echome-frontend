'use client';

import { UnifiedContentItem, ContentSourceType, CONTENT_SOURCE_CONFIG } from '@/types';

const SOURCE_ICONS: Record<string, string> = {
  file_upload: '📄',
  paste_text: '✍️',
  paste_social: '📱',
  paste_email: '📧',
  voice_recording: '🎤',
  mbox_import: '📥',
  youtube_import: '🎬',
  instagram_import: '📸',
  blog_import: '🌐',
  generation: '✨',
  'clip-finder': '🎥',
};

const SOURCE_BADGE_COLORS: Record<string, string> = {
  file_upload: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paste_text: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  paste_social: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  paste_email: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  voice_recording: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  mbox_import: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  youtube_import: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  instagram_import: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  blog_import: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  generation: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'clip-finder': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusDot({ status }: { status: string }) {
  if (status === 'completed') return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />;
  if (status === 'processing' || status === 'uploading') {
    return (
      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
    );
  }
  if (status === 'failed') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />;
}

interface KBContentCardProps {
  item: UnifiedContentItem;
  isExpanded: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
}

export function KBContentCard({
  item,
  isExpanded,
  selectionMode,
  isSelected,
  onSelect,
  onToggleExpand,
  onDelete,
}: KBContentCardProps) {
  const config = CONTENT_SOURCE_CONFIG[item.sourceType as ContentSourceType];
  const icon = SOURCE_ICONS[item.sourceType] || '📄';
  const badgeColor = SOURCE_BADGE_COLORS[item.sourceType] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div
      className={`
        relative p-4 bg-card border rounded-xl transition-all cursor-pointer
        ${isSelected ? 'border-accent/50 bg-accent/5' : 'border-border hover:border-border-hover card-lift'}
      `}
      onClick={selectionMode ? onSelect : onToggleExpand}
    >
      {/* Selection checkbox - visible on hover or in select mode */}
      {selectionMode && (
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`
            absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer z-10
            ${isSelected ? 'bg-accent border-accent text-white' : 'border-border hover:border-accent bg-bg-primary'}
          `}
        >
          {isSelected && <span className="text-xs">✓</span>}
        </div>
      )}

      {/* Source badge (top-right) */}
      <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeColor}`}>
        {icon} {config?.label || item.sourceType}
      </div>

      {/* Content */}
      <div className={selectionMode ? 'ml-7' : ''}>
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 pr-20 mb-1">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3">
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-text-tertiary mt-auto">
          <StatusDot status={item.status} />
          <span>{item.chunkCount || 0} nuggets</span>
          <span>·</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2" onClick={(e) => e.stopPropagation()}>
          {item.description && (
            <p className="text-xs text-text-secondary">{item.description}</p>
          )}
          {item.fileType && (
            <p className="text-xs text-text-tertiary">
              Type: {item.fileType}
              {item.fileSize ? ` · ${(item.fileSize / 1024).toFixed(0)} KB` : ''}
            </p>
          )}
          {item.status === 'failed' && item.errorMessage && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{item.errorMessage}</p>
            </div>
          )}
          <button
            onClick={onDelete}
            className="text-xs text-error hover:text-error/80 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
