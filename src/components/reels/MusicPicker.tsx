'use client';

/**
 * Music Picker Component
 *
 * Browse and select music tracks for the reel.
 */

import { useState, useRef, useCallback } from 'react';
import type { MusicTrack, MusicTrackSummary } from '@/types';

interface MusicPickerProps {
  tracks: MusicTrackSummary[];
  selectedTrack: MusicTrack | null;
  onSelect: (track: MusicTrackSummary | null) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  beatSyncEnabled: boolean;
  onBeatSyncChange: (enabled: boolean) => void;
  musicRequired: boolean;
}

export function MusicPicker({
  tracks,
  selectedTrack,
  onSelect,
  volume,
  onVolumeChange,
  beatSyncEnabled,
  onBeatSyncChange,
  musicRequired,
}: MusicPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get unique genres
  const genres = Array.from(new Set(tracks.map(t => t.genre).filter(Boolean)));

  // Filter tracks
  const filteredTracks = tracks.filter(track => {
    const matchesSearch = !searchQuery ||
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !filterGenre || track.genre === filterGenre;
    return matchesSearch && matchesGenre;
  });

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback((track: MusicTrackSummary) => {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.fileUrl;
        audioRef.current.play();
        setPlayingId(track.id);
      }
    }
  }, [playingId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-2">
          Add Music {musicRequired && <span className="text-accent">*</span>}
        </h2>
        <p className="text-text-secondary text-sm">
          {musicRequired
            ? 'This template requires music for beat-synced transitions.'
            : 'Optionally add background music to your reel.'
          }
        </p>
      </div>

      {/* Selected track display */}
      {selectedTrack && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-text-primary">{selectedTrack.name}</p>
                <p className="text-sm text-text-secondary">
                  {selectedTrack.artist} • {formatDuration(selectedTrack.durationMs)}
                  {selectedTrack.tempo && ` • ${Math.round(selectedTrack.tempo)} BPM`}
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-sm text-text-secondary hover:text-accent"
            >
              Remove
            </button>
          </div>

          {/* Volume slider */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Music Volume</span>
              <span className="text-text-primary">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Beat sync toggle */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Beat Sync</p>
              <p className="text-xs text-text-secondary">
                Align transitions to music beats
              </p>
            </div>
            <button
              onClick={() => onBeatSyncChange(!beatSyncEnabled)}
              className={`
                w-12 h-6 rounded-full transition-colors
                ${beatSyncEnabled ? 'bg-accent' : 'bg-surface'}
              `}
            >
              <div
                className={`
                  w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${beatSyncEnabled ? 'translate-x-6' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search music..."
            className="w-full px-4 py-2 pl-10 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <select
          value={filterGenre || ''}
          onChange={(e) => setFilterGenre(e.target.value || null)}
          className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All Genres</option>
          {genres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      {/* Track list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredTracks.map(track => (
          <div
            key={track.id}
            className={`
              flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer
              ${selectedTrack?.id === track.id
                ? 'bg-accent/10 border-accent/30'
                : 'bg-surface-secondary border-transparent hover:border-border'
              }
            `}
            onClick={() => onSelect(track)}
          >
            {/* Play button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause(track);
              }}
              className="w-10 h-10 flex-shrink-0 bg-surface rounded-full flex items-center justify-center hover:bg-accent/20 transition-colors"
            >
              {playingId === track.id ? (
                <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">{track.name}</p>
              <p className="text-sm text-text-secondary truncate">
                {track.artist || 'Unknown Artist'}
                {track.genre && ` • ${track.genre}`}
              </p>
            </div>

            {/* Duration and BPM */}
            <div className="flex-shrink-0 text-right">
              <p className="text-sm text-text-secondary">{formatDuration(track.durationMs)}</p>
              {track.tempo && (
                <p className="text-xs text-text-secondary">{Math.round(track.tempo)} BPM</p>
              )}
            </div>

            {/* Trending badge */}
            {track.isTrending && (
              <div className="flex-shrink-0 bg-accent/20 text-accent text-xs px-2 py-0.5 rounded">
                Trending
              </div>
            )}
          </div>
        ))}

        {filteredTracks.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            No tracks found
          </div>
        )}
      </div>

      {/* Hidden audio element for preview */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        className="hidden"
      />

      {/* Skip music option */}
      {!musicRequired && !selectedTrack && (
        <div className="text-center pt-4 border-t border-border">
          <button
            onClick={() => onSelect(null)}
            className="text-sm text-text-secondary hover:text-accent"
          >
            Continue without music
          </button>
        </div>
      )}
    </div>
  );
}
