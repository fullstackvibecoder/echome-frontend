'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { GenerationRequest } from '@/types';

interface GenerationHistoryItem {
  id: string;
  status: string;
  prompt?: string;
  created_at: string;
  platforms?: string[];
}

export default function ContentLibrary() {
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'processing':
        return 'bg-warning/20 text-warning';
      case 'failed':
        return 'bg-error/20 text-error';
      default:
        return 'bg-bg-tertiary text-text-secondary';
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-4xl mb-2">Content Library</h1>
        <p className="text-body text-text-secondary">
          View and manage your generated content history
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && history.length === 0 && (
        <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-subheading text-xl mb-2">No content yet</h3>
          <p className="text-body text-text-secondary mb-6">
            Generate your first piece of content to see it here
          </p>
          <a href="/app" className="btn-primary px-6 py-2 inline-block">
            Create Content
          </a>
        </div>
      )}

      {/* Content List */}
      {!loading && !error && history.length > 0 && (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-bg-secondary rounded-xl border border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
              onClick={() => window.location.href = `/app/library/${item.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium mb-2 truncate">
                    {item.prompt || 'Untitled generation'}
                  </p>
                  <div className="flex items-center gap-3 text-small text-text-secondary">
                    <span>{formatDate(item.created_at)}</span>
                    {item.platforms && item.platforms.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{item.platforms.length} platforms</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-small font-medium capitalize ${getStatusColor(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      {!loading && history.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadHistory}
            className="btn-secondary px-6 py-2"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
