'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { GenerationRequest, Platform } from '@/types';

const PLATFORM_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  instagram: { icon: '📷', color: '#E4405F', name: 'Instagram' },
  linkedin: { icon: '💼', color: '#0A66C2', name: 'LinkedIn' },
  blog: { icon: '📝', color: '#6366F1', name: 'Blog' },
  email: { icon: '📧', color: '#EA4335', name: 'Email' },
  tiktok: { icon: '🎵', color: '#000000', name: 'TikTok' },
  'video-script': { icon: '🎬', color: '#FF0000', name: 'Video Script' },
  twitter: { icon: '🐦', color: '#1DA1F2', name: 'Twitter' },
  youtube: { icon: '▶️', color: '#FF0000', name: 'YouTube' },
};

const INPUT_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  text: { icon: '📝', label: 'Text' },
  video: { icon: '🎬', label: 'Video' },
  audio: { icon: '🎙️', label: 'Audio' },
  repurpose: { icon: '🔄', label: 'Repurposed' },
  url: { icon: '🔗', label: 'URL' },
};

function formatRelativeDate(date: Date | string) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';

    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function ContentCard({ item, onClick }: { item: GenerationRequest; onClick: () => void }) {
  const platforms = item.platforms || [];
  const inputTypeConfig = INPUT_TYPE_CONFIG[item.inputType] || INPUT_TYPE_CONFIG.text;

  // Get preview text - prefer the first result's content, fall back to input text
  const getPreviewText = () => {
    if (item.results && item.results.length > 0) {
      const firstResult = item.results[0];
      if (firstResult.content) {
        // Strip markdown and clean up
        return firstResult.content
          .replace(/[#*_`~]/g, '')
          .replace(/\n+/g, ' ')
          .trim();
      }
    }
    if (item.inputText) {
      return item.inputText;
    }
    return 'Generated content';
  };

  const preview = getPreviewText().slice(0, 140);
  const hasMoreText = getPreviewText().length > 140;

  // Get voice/quality score if available
  const avgScore = item.results && item.results.length > 0
    ? Math.round(item.results.reduce((acc, r) => acc + (r.voiceScore || 0), 0) / item.results.length)
    : null;

  return (
    <div
      onClick={onClick}
      className="group relative bg-card rounded-xl border border-border overflow-hidden hover:border-accent/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      {/* Top section with platforms */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          {/* Platform pills */}
          <div className="flex flex-wrap gap-1.5">
            {platforms.slice(0, 3).map((platform) => {
              const config = PLATFORM_CONFIG[platform];
              return (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/50"
                  style={{ color: config?.color }}
                >
                  <span>{config?.icon}</span>
                  <span className="text-foreground/70">{config?.name}</span>
                </span>
              );
            })}
            {platforms.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground">
                +{platforms.length - 3}
              </span>
            )}
          </div>

          {/* Voice score badge */}
          {avgScore !== null && avgScore > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Voice</span>
              <span className={`font-medium ${avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                {avgScore}%
              </span>
            </div>
          )}
        </div>

        {/* Source type indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{inputTypeConfig.icon}</span>
          <span>From {inputTypeConfig.label.toLowerCase()}</span>
        </div>
      </div>

      {/* Content preview */}
      <div className="px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed line-clamp-3">
          {preview}{hasMoreText && '...'}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(item.createdAt)}
        </span>

        <div className="flex items-center gap-2">
          {item.results && item.results.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {item.results.length} item{item.results.length !== 1 ? 's' : ''}
            </span>
          )}
          <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-accent group-hover:text-white transition-colors text-xs">
            →
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessingCard({ item }: { item: GenerationRequest }) {
  const platforms = item.platforms || [];

  return (
    <div className="relative bg-card rounded-xl border border-amber-500/30 overflow-hidden">
      {/* Animated gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 animate-pulse" />

      <div className="relative p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <span className="animate-spin text-amber-400">⏳</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Generating content...</p>
            <p className="text-xs text-muted-foreground">
              {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-amber-500/50 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}

export default function ContentLibrary() {
  const router = useRouter();
  const [history, setHistory] = useState<GenerationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFailed, setShowFailed] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.generation.listRequests({ limit: 50 });
      setHistory(response.data || []);
    } catch (err) {
      setError('Failed to load content history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter out failed items unless explicitly shown
  const completedItems = history.filter((item) => item.status === 'completed');
  const processingItems = history.filter((item) => item.status === 'processing' || item.status === 'pending');
  const failedItems = history.filter((item) => item.status === 'failed');

  const displayItems = showFailed ? history : [...processingItems, ...completedItems];

  const stats = {
    total: completedItems.length,
    processing: processingItems.length,
    thisWeek: completedItems.filter((h) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(h.createdAt) > weekAgo;
    }).length,
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Content Library</h1>
          <p className="text-muted-foreground">
            Your generated content, ready to copy and share
          </p>
        </div>
        <a
          href="/app"
          className="btn-primary px-5 py-2.5 inline-flex items-center gap-2 w-fit text-sm"
        >
          <span>✨</span>
          <span>Create New</span>
        </a>
      </div>

      {/* Stats Row */}
      {!loading && completedItems.length > 0 && (
        <div className="flex flex-wrap gap-6 mb-8 pb-6 border-b border-border">
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total generated</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </div>
          {stats.processing > 0 && (
            <>
              <div className="w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.processing}</p>
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
            </>
          )}
          {failedItems.length > 0 && (
            <>
              <div className="flex-1" />
              <button
                onClick={() => setShowFailed(!showFailed)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFailed ? 'Hide' : 'Show'} {failedItems.length} failed
              </button>
            </>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
              <div className="p-4 border-b border-border/50">
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-20 bg-muted rounded-full" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="p-4">
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
              <div className="px-4 pb-4">
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadHistory} className="btn-secondary text-sm">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && history.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-accent/10 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Generate your first piece of content and it will appear here.
          </p>
          <a href="/app" className="btn-primary px-6 py-2.5 inline-block text-sm">
            Create Your First Content
          </a>
        </div>
      )}

      {/* Processing Items */}
      {!loading && !error && processingItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">In Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processingItems.map((item) => (
              <ProcessingCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Content Grid */}
      {!loading && !error && completedItems.length > 0 && (
        <div>
          {processingItems.length > 0 && (
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Completed</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedItems.map((item, index) => (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <ContentCard
                  item={item}
                  onClick={() => router.push(`/app/library/${item.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Items (if shown) */}
      {!loading && !error && showFailed && failedItems.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h2 className="text-sm font-medium text-red-400 mb-3">Failed ({failedItems.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {failedItems.map((item) => (
              <div key={item.id} className="bg-card rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-400 text-xs">Failed</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(item.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.inputText?.slice(0, 100) || 'Content generation failed'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      {!loading && history.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadHistory}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      )}
    </div>
  );
}
