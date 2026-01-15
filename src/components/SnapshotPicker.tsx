'use client';

import { useState, useEffect } from 'react';
import { api, VideoSnapshot } from '@/lib/api-client';

interface SnapshotPickerProps {
  /** Video upload ID to fetch snapshots for */
  uploadId?: string;
  /** Content kit ID to fetch snapshots via content kit */
  contentKitId?: string;
  /** Currently selected snapshot URL */
  selectedUrl?: string;
  /** Callback when a snapshot is selected */
  onSelect: (snapshot: VideoSnapshot) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

/**
 * SnapshotPicker - Grid gallery for selecting video frame snapshots
 * as carousel backgrounds.
 */
export function SnapshotPicker({
  uploadId,
  contentKitId,
  selectedUrl,
  onSelect,
  disabled = false,
}: SnapshotPickerProps) {
  const [snapshots, setSnapshots] = useState<VideoSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVideo, setHasVideo] = useState(true);

  useEffect(() => {
    loadSnapshots();
  }, [uploadId, contentKitId]);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (contentKitId) {
        // Fetch via content kit
        response = await api.snapshots.getForContentKit(contentKitId);
        if (response.success) {
          setSnapshots(response.data.snapshots);
          setHasVideo(response.data.hasVideo);
        }
      } else if (uploadId) {
        // Fetch directly by upload ID
        response = await api.snapshots.getForUpload(uploadId);
        if (response.success) {
          setSnapshots(response.data.snapshots);
          setHasVideo(true);
        }
      } else {
        // No ID provided
        setSnapshots([]);
        setHasVideo(false);
      }
    } catch (err) {
      console.error('Failed to load snapshots:', err);
      setError('Failed to load video snapshots');
    } finally {
      setLoading(false);
    }
  };

  // Format time offset as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-small text-text-secondary">Loading video frames...</p>
      </div>
    );
  }

  if (!hasVideo) {
    return (
      <div className="p-6 text-center bg-bg-secondary rounded-lg">
        <div className="text-4xl mb-3">🎥</div>
        <p className="text-body text-text-secondary mb-2">No video available</p>
        <p className="text-small text-text-secondary">
          Upload a video first to use frame snapshots as backgrounds
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-center">
        <p className="text-small text-error">{error}</p>
        <button
          onClick={loadSnapshots}
          className="mt-2 text-small text-accent hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="p-6 text-center bg-bg-secondary rounded-lg">
        <div className="text-4xl mb-3">📸</div>
        <p className="text-body text-text-secondary mb-2">No snapshots available yet</p>
        <p className="text-small text-text-secondary">
          Snapshots are extracted during video processing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-small text-text-secondary">
        Select a frame from your video ({snapshots.length} available)
      </p>

      {/* Snapshot Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
        {snapshots.map((snapshot) => {
          const isSelected = selectedUrl === snapshot.thumbnailUrl;
          return (
            <button
              key={snapshot.id}
              onClick={() => onSelect(snapshot)}
              disabled={disabled}
              className={`
                relative aspect-[4/5] rounded-lg overflow-hidden group
                transition-all duration-200
                ${isSelected
                  ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-primary scale-[1.02]'
                  : 'hover:ring-1 hover:ring-accent/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Thumbnail Image */}
              <img
                src={snapshot.thumbnailUrl}
                alt={`Frame at ${formatTime(snapshot.timeOffsetSeconds)}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Time Badge */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-mono">
                {formatTime(snapshot.timeOffsetSeconds)}
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Hover Overlay */}
              {!isSelected && !disabled && (
                <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Preview */}
      {selectedUrl && (
        <div className="flex items-center gap-3 p-2 bg-accent/10 rounded-lg">
          <img
            src={selectedUrl}
            alt="Selected frame"
            className="w-12 h-15 object-cover rounded"
          />
          <div className="flex-1">
            <p className="text-small font-medium text-accent">Frame selected</p>
            <p className="text-xs text-text-secondary">This will be used as your carousel background</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SnapshotPicker;
