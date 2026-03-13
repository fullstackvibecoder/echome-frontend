'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api-client';
import type { AIGeneratedBRoll } from '@/types';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

interface BRollLibraryProps {
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  refreshTrigger?: number;
}

export function BRollLibrary({
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  refreshTrigger = 0,
}: BRollLibraryProps) {
  const [clips, setClips] = useState<AIGeneratedBRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewClip, setPreviewClip] = useState<AIGeneratedBRoll | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AIGeneratedBRoll | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.broll.list();
      setClips(response.data || []);
    } catch {
      // Silently handle — user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
  }, [fetchClips, refreshTrigger]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, '0')}`
      : `${secs}s`;
  };

  const handleSelect = (id: string) => {
    if (!selectable || !onSelectionChange) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    onSelectionChange(next);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.broll.delete(deleteTarget.id);
      setClips((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      // Remove from selection if selected
      if (selectedIds.includes(deleteTarget.id) && onSelectionChange) {
        onSelectionChange(selectedIds.filter((s) => s !== deleteTarget.id));
      }
    } catch {
      // Could add toast here
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDownload = async (clip: AIGeneratedBRoll) => {
    if (!clip.videoUrl) return;
    const link = document.createElement('a');
    link.href = clip.videoUrl;
    link.download = `broll-${clip.id}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <div className="aspect-[9/16] bg-bg-secondary animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
        </div>
        <p className="text-text-primary font-medium mb-1">
          No B-Roll clips yet
        </p>
        <p className="text-text-secondary text-sm max-w-xs">
          Generate AI B-Roll or extract clips from your videos to build your
          library.
        </p>
      </div>
    );
  }

  const selectionIndex = (id: string) => selectedIds.indexOf(id);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {clips.map((clip) => {
          const isSelected = selectedIds.includes(clip.id);
          const selIdx = selectionIndex(clip.id);

          return (
            <div
              key={clip.id}
              onClick={() => (selectable ? handleSelect(clip.id) : setPreviewClip(clip))}
              className={`
                bg-card rounded-xl border border-border overflow-hidden group
                cursor-pointer transition-all
                ${isSelected ? 'ring-2 ring-accent' : ''}
              `}
            >
              {/* Thumbnail */}
              <div className="aspect-[9/16] bg-bg-secondary relative">
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.prompt || 'B-Roll clip'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-muted-foreground/40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Source type badge */}
                <span
                  className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                    clip.sourceType === 'ai_generated'
                      ? 'bg-accent/20 text-accent'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}
                >
                  {clip.sourceType === 'ai_generated' ? 'AI' : 'Extracted'}
                </span>

                {/* Duration badge */}
                {clip.durationSeconds != null && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(clip.durationSeconds)}
                  </span>
                )}

                {/* Selected badge with number */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-accent text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg">
                    {selIdx + 1}
                  </div>
                )}

                {/* Status overlay for non-completed clips */}
                {clip.status !== 'completed' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        clip.status === 'failed'
                          ? 'bg-red-500/80 text-white'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {clip.status === 'pending' && 'Pending...'}
                      {clip.status === 'processing' && 'Processing...'}
                      {clip.status === 'failed' && 'Failed'}
                    </span>
                  </div>
                )}

                {/* Hover actions */}
                {!selectable && clip.status === 'completed' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {clip.videoUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(clip);
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                        title="Download"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(clip);
                      }}
                      className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
                      title="Delete"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Video preview modal */}
      {previewClip && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewClip(null)}
        >
          <div
            className="relative max-w-sm w-full rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {previewClip.videoUrl ? (
              <video
                src={previewClip.videoUrl}
                controls
                autoPlay
                className="w-full rounded-xl"
                style={{ maxHeight: '80vh' }}
              />
            ) : (
              <div className="aspect-[9/16] bg-surface-secondary flex items-center justify-center rounded-xl">
                <p className="text-muted-foreground text-sm">
                  No video available
                </p>
              </div>
            )}

            <button
              onClick={() => setPreviewClip(null)}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete B-Roll Clip"
        message="This clip will be permanently deleted. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
