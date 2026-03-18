'use client';

import {
  Film,
  Music,
  Download,
  RefreshCw,
  ChevronRight,
  Copy,
  Check,
  Scissors,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useVideoReel } from '@/hooks/useVideoReel';
import { LinkedReelSummary, MusicTrackSummary } from '@/types';

interface VideoReelSectionProps {
  contentKitId?: string;
  videoUploadId?: string;
  reel?: LinkedReelSummary | null;
  hasCarousel: boolean;
  slideCount: number;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

export function VideoReelSection({
  contentKitId,
  videoUploadId,
  reel,
  hasCarousel,
  slideCount,
  isAdmin,
  refresh,
}: VideoReelSectionProps) {
  const {
    linkedReel,
    isGenerating,
    generateError,
    trendingAudio,
    generateCarouselReel,
    reelOptionsOpen,
    toggleReelOptions,
    smartTimingEnabled,
    setSmartTimingEnabled,
    selectedMusicTrackId,
    setSelectedMusicTrackId,
    musicTracks,
    isExtracting,
    brollSpeedUp,
    setBrollSpeedUp,
    extractBRoll,
  } = useVideoReel({
    contentKitId,
    videoUploadId,
    reel,
    hasCarousel,
    slideCount,
    isAdmin,
    refresh,
  });

  const [copiedAudio, setCopiedAudio] = useState(false);
  const showBRoll = isAdmin && !!videoUploadId;

  return (
    <section id="reel-section" className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Film className="w-5 h-5 text-muted-foreground" />
        Video Reel
      </h2>

      {/* Carousel Reel Card */}
      {hasCarousel && (
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          {/* Not generated yet / failed → generate CTA */}
          {(!linkedReel || linkedReel.status === 'failed') && !isGenerating && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-text-primary">Carousel Reel</p>
                  <p className="text-sm text-text-secondary">
                    Turn {slideCount} slides into an animated reel
                  </p>
                </div>
              </div>

              {/* Admin reel options */}
              {isAdmin && (
                <div className="mb-3">
                  <button
                    onClick={toggleReelOptions}
                    className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${reelOptionsOpen ? 'rotate-90' : ''}`} />
                    Reel Options
                  </button>

                  {reelOptionsOpen && (
                    <div className="mt-2 bg-card rounded-lg p-3 border border-border space-y-3">
                      {/* Smart Timing */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-primary">Smart Timing</p>
                          <p className="text-xs text-text-secondary">Adjust duration per slide</p>
                        </div>
                        <button
                          onClick={() => setSmartTimingEnabled(!smartTimingEnabled)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${smartTimingEnabled ? 'bg-accent' : 'bg-border'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform ${smartTimingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {/* Music */}
                      <div>
                        <p className="text-sm font-medium text-text-primary mb-1.5">Music</p>
                        <select
                          value={selectedMusicTrackId || ''}
                          onChange={(e) => setSelectedMusicTrackId(e.target.value || null)}
                          className="w-full px-3 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary"
                        >
                          <option value="">No music</option>
                          {musicTracks.map((track) => (
                            <option key={track.id} value={track.id}>
                              {track.name}{track.artist ? ` — ${track.artist}` : ''}{track.tempo ? ` (${track.tempo} BPM)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {generateError && (
                <div className="mb-3 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {generateError}
                </div>
              )}

              <button
                onClick={generateCarouselReel}
                className="w-full px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all text-sm"
              >
                Generate Reel
              </button>
            </div>
          )}

          {/* Generating → spinner (shows immediately on click) */}
          {isGenerating && (!linkedReel || linkedReel.status === 'processing') && (
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
                <div>
                  <p className="font-medium text-text-primary text-sm">Generating reel...</p>
                  <p className="text-xs text-text-secondary">20-30 seconds</p>
                </div>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Completed → video + actions */}
          {linkedReel?.status === 'completed' && linkedReel.outputUrl && (
            <>
              <div className="aspect-[9/16] max-h-[400px] bg-black flex items-center justify-center">
                <video
                  src={linkedReel.outputUrl}
                  controls
                  playsInline
                  className="max-h-full max-w-full"
                  poster={linkedReel.thumbnailUrl || undefined}
                />
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  {linkedReel.outputDurationMs
                    ? `${(linkedReel.outputDurationMs / 1000).toFixed(1)}s`
                    : 'Ready'}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={linkedReel.outputUrl}
                    download="carousel-reel.mp4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <button
                    onClick={generateCarouselReel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-lg hover:text-text-primary transition-colors text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Redo
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Trending Audio Suggestion */}
      {trendingAudio && (
        <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
          <Music className="w-4 h-4 text-accent flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary truncate">{trendingAudio}</p>
            <p className="text-xs text-text-tertiary">Trending audio — use when posting</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(trendingAudio);
              setCopiedAudio(true);
              setTimeout(() => setCopiedAudio(false), 2000);
            }}
            className="flex-shrink-0 p-1.5 text-accent hover:bg-accent/10 rounded transition-colors"
            aria-label="Copy audio name"
          >
            {copiedAudio ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* B-Roll Section (admin + video upload only) */}
      {showBRoll && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-text-secondary" />
              <p className="text-sm font-medium text-text-primary">B-Roll Clips</p>
            </div>
            <Link
              href="/app/reels"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Reel Maker
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Speed + Extract row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-secondary">Speed</span>
              {([1, 1.5, 2] as const).map((speed) => (
                <button
                  key={speed}
                  onClick={() => setBrollSpeedUp(speed)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    brollSpeedUp === speed
                      ? 'bg-accent text-white'
                      : 'bg-card text-text-secondary hover:text-text-primary border border-border'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              onClick={extractBRoll}
              disabled={isExtracting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card text-text-primary border border-border rounded-lg hover:bg-muted transition-colors text-xs font-medium disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Extracting...
                </>
              ) : (
                'Extract B-Roll'
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
