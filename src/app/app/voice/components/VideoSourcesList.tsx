'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Video } from 'lucide-react';
import { api } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

interface VideoSource {
  uploadId: string;
  sourceUrl: string;
  title: string;
  createdAt: string;
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// COMPONENT
// ============================================

/**
 * VideoSourcesList
 *
 * Renders the user's saved video sources that have been ingested into their
 * voice KB. Each row shows the video title and date with a Remove action that
 * calls DELETE /kb/content/video/:uploadId and refetches the list.
 *
 * Fetches via api.kbContent.listSavedVideos() (GET /kb/content/videos/saved).
 * Self-contained: renders nothing while loading or when the list is empty.
 */
export function VideoSourcesList() {
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Map<string, string>>(new Map());

  const fetchVideos = useCallback(async () => {
    try {
      const result = await api.kbContent.listSavedVideos();
      if (result.success) {
        setVideos(result.videos);
      }
    } catch {
      // Silent. The section stays hidden so a network hiccup doesn't
      // leave a broken empty box on the page.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleRemove = useCallback(
    async (uploadId: string) => {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.add(uploadId);
        return next;
      });
      setErrorIds(prev => {
        const next = new Map(prev);
        next.delete(uploadId);
        return next;
      });

      try {
        await api.kbContent.removeVideoSource(uploadId);
        // Optimistically drop the row, then refetch for consistency.
        setVideos(prev => prev.filter(v => v.uploadId !== uploadId));
        await fetchVideos();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setErrorIds(prev => new Map(prev).set(uploadId, msg));
      } finally {
        setRemovingIds(prev => {
          const next = new Set(prev);
          next.delete(uploadId);
          return next;
        });
      }
    },
    [fetchVideos],
  );

  // Don't render while loading or when empty.
  if (loading || videos.length === 0) return null;

  return (
    <section className="mb-8" aria-label="Video sources">
      <h2 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Video className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        Video Sources ({videos.length})
      </h2>
      <p className="text-xs text-text-secondary mb-3">
        Videos you have added to train your voice. Remove any that no longer represent you.
      </p>
      <ul className="space-y-2" role="list">
        {videos.map(video => {
          const isRemoving = removingIds.has(video.uploadId);
          const errorMsg = errorIds.get(video.uploadId);

          return (
            <li
              key={video.uploadId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                isRemoving
                  ? 'opacity-50 border-border bg-bg-secondary'
                  : 'border-border hover:bg-bg-secondary'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {video.title}
                </p>
                <p className="text-xs text-text-secondary">{formatDate(video.createdAt)}</p>
                {errorMsg && (
                  <p className="text-xs text-error mt-0.5" role="alert">
                    {errorMsg}
                  </p>
                )}
              </div>

              {errorMsg && !isRemoving && (
                <button
                  onClick={() => handleRemove(video.uploadId)}
                  className="flex-shrink-0 text-xs text-primary-interactive hover:underline"
                >
                  Retry
                </button>
              )}

              <button
                onClick={() => handleRemove(video.uploadId)}
                disabled={isRemoving}
                aria-label={`Remove ${video.title}`}
                title="Remove from voice"
                className="flex-shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemoving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
