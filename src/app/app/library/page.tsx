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

function ContentCard({ item, onClick }: { item: GenerationRequest; onClick: () => void }) {
  const platforms = item.platforms || [];
  const primaryPlatform = platforms[0];
  const primaryConfig = primaryPlatform ? PLATFORM_CONFIG[primaryPlatform] : null;

  // Create gradient from platform colors
  const gradientColors = platforms
    .slice(0, 3)
    .map((p) => PLATFORM_CONFIG[p]?.color || '#6366F1');

  const gradient = gradientColors.length > 1
    ? `linear-gradient(135deg, ${gradientColors.join(', ')})`
    : gradientColors[0] || '#6366F1';

  const formatDate = (date: Date | string) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Recently';

      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Complete' };
      case 'processing':
        return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Processing' };
      case 'failed':
        return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Pending' };
    }
  };

  const statusConfig = getStatusConfig(item.status);
  const preview = item.inputText?.slice(0, 120) || 'Content generation';
  const hasMoreText = (item.inputText?.length || 0) > 120;

  return (
    <div
      onClick={onClick}
      className="group relative bg-bg-secondary rounded-2xl border border-border overflow-hidden hover:border-accent/50 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 cursor-pointer"
    >
      {/* Gradient Header */}
      <div
        className="h-24 relative overflow-hidden"
        style={{ background: gradient }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 40%)'
          }} />
        </div>

        {/* Platform icons */}
        <div className="absolute bottom-3 left-4 flex gap-2">
          {platforms.slice(0, 4).map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            return (
              <div
                key={platform}
                className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm shadow-sm"
                title={config?.name || platform}
              >
                {config?.icon || '📄'}
              </div>
            );
          })}
          {platforms.length > 4 && (
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs text-white font-medium">
              +{platforms.length - 4}
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} backdrop-blur-sm`}>
          {statusConfig.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Preview text */}
        <p className="text-body text-text-primary mb-3 line-clamp-2 min-h-[2.75rem]">
          {preview}{hasMoreText && '...'}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-small text-text-secondary">
            <span>{formatDate(item.createdAt)}</span>
            <span>•</span>
            <span>{platforms.length} platform{platforms.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Arrow indicator */}
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary group-hover:bg-accent group-hover:text-white transition-colors">
            →
          </div>
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
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

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

  const filteredHistory = history.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const stats = {
    total: history.length,
    completed: history.filter((h) => h.status === 'completed').length,
    failed: history.filter((h) => h.status === 'failed').length,
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display text-4xl mb-2">Content Library</h1>
          <p className="text-body text-text-secondary">
            Your generated content, organized and ready to use
          </p>
        </div>
        <a
          href="/app"
          className="btn-primary px-6 py-3 inline-flex items-center gap-2 w-fit"
        >
          <span>✨</span>
          <span>Create New</span>
        </a>
      </div>

      {/* Stats Bar */}
      {!loading && history.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl border transition-all ${
              filter === 'all'
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-bg-secondary border-border hover:border-accent/50'
            }`}
          >
            <p className="text-3xl font-bold mb-1">{stats.total}</p>
            <p className="text-small text-text-secondary">Total</p>
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`p-4 rounded-xl border transition-all ${
              filter === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                : 'bg-bg-secondary border-border hover:border-emerald-500/50'
            }`}
          >
            <p className="text-3xl font-bold mb-1">{stats.completed}</p>
            <p className="text-small text-text-secondary">Completed</p>
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`p-4 rounded-xl border transition-all ${
              filter === 'failed'
                ? 'bg-red-500/10 border-red-500 text-red-400'
                : 'bg-bg-secondary border-border hover:border-red-500/50'
            }`}
          >
            <p className="text-3xl font-bold mb-1">{stats.failed}</p>
            <p className="text-small text-text-secondary">Failed</p>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-bg-secondary rounded-2xl border border-border overflow-hidden animate-pulse">
              <div className="h-24 bg-bg-tertiary" />
              <div className="p-4">
                <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
                <div className="h-4 bg-bg-tertiary rounded w-1/2 mb-4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
          <p className="mb-4">{error}</p>
          <button onClick={loadHistory} className="btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && history.length === 0 && (
        <div className="text-center py-16 bg-bg-secondary rounded-2xl border border-border">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
            <span className="text-4xl">✨</span>
          </div>
          <h3 className="text-subheading text-2xl mb-2">No content yet</h3>
          <p className="text-body text-text-secondary mb-8 max-w-md mx-auto">
            Create your first piece of content and it will appear here, ready to copy and share.
          </p>
          <a href="/app" className="btn-primary px-8 py-3 inline-block">
            Create Your First Content
          </a>
        </div>
      )}

      {/* Content Grid */}
      {!loading && !error && filteredHistory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((item, index) => (
            <div
              key={item.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ContentCard
                item={item}
                onClick={() => router.push(`/app/library/${item.id}`)}
              />
            </div>
          ))}
        </div>
      )}

      {/* No Results for Filter */}
      {!loading && !error && history.length > 0 && filteredHistory.length === 0 && (
        <div className="text-center py-12 bg-bg-secondary rounded-xl border border-border">
          <p className="text-text-secondary">
            No {filter} content found.{' '}
            <button onClick={() => setFilter('all')} className="text-accent hover:underline">
              View all
            </button>
          </p>
        </div>
      )}

      {/* Refresh Button */}
      {!loading && history.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadHistory}
            className="text-text-secondary hover:text-accent transition-colors flex items-center gap-2"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      )}
    </div>
  );
}
