'use client';

/**
 * ClipEditorModal — Modal for viewing a video clip with caption controls and export.
 *
 * Left side: VideoPlayer with live caption preview (when captions are not burned in).
 * Right side: Caption style/position controls, transcript preview, and export button.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Film } from 'lucide-react';
import { api, type VideoClip } from '@/lib/api-client';
import { formatDuration } from '@/lib/content-kit-utils';
import { VideoPlayer } from './VideoPlayer';
import { CaptionStylePopover } from './CaptionStylePopover';
import { CaptionPositionControl } from './CaptionPositionControl';
import type { CaptionStylePreset } from '@/lib/caption-parser';
import type { CaptionPosition } from './CaptionOverlay';
import type { CaptionSegment } from '@/lib/caption-parser';
import { PostCaptionBlock } from './PostCaptionBlock';
import { VisualPostActions } from './VisualPostActions';

interface ClipEditorModalProps {
  open: boolean;
  onClose: () => void;
  clip: VideoClip;
  uploadId: string;
  onExport: (clipId: string) => void;
  contentKitId?: string;
  instagramCaption?: string;
}

/**
 * Build CaptionSegment[] from the clip's transcriptText for the overlay.
 * Uses simple sentence splitting since we don't have word-level timing on clips.
 */
function buildCaptionSegments(clip: VideoClip): CaptionSegment[] {
  if (!clip.transcriptText) return [];

  const text = clip.transcriptText.trim();
  if (!text) return [];

  // Split transcript into roughly sentence-sized chunks
  const sentences = text.match(/[^.!?]+[.!?]?\s*/g) || [text];
  const totalDuration = clip.duration || (clip.endTime - clip.startTime);
  const totalChars = text.length;
  let currentTime = 0;

  return sentences.map((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return null;

    const proportion = trimmed.length / totalChars;
    const segDuration = proportion * totalDuration;
    const start = currentTime;
    const end = currentTime + segDuration;
    currentTime = end;

    // Build approximate word timings within the segment
    const wordTexts = trimmed.split(/\s+/);
    const wordDuration = segDuration / wordTexts.length;
    const words = wordTexts.map((word, i) => ({
      word,
      start: start + i * wordDuration,
      end: start + (i + 1) * wordDuration,
    }));

    return { text: trimmed, start, end, words };
  }).filter(Boolean) as CaptionSegment[];
}

const FORMAT_LABELS: Record<string, string> = {
  portrait: 'Portrait (9:16)',
  landscape: 'Landscape (16:9)',
  square: 'Square (1:1)',
};

const FORMAT_TO_ASPECT: Record<string, '9:16' | '16:9' | '1:1'> = {
  portrait: '9:16',
  landscape: '16:9',
  square: '1:1',
};

export default function ClipEditorModal({
  open,
  onClose,
  clip,
  uploadId,
  onExport,
  contentKitId,
  instagramCaption,
}: ClipEditorModalProps) {
  const [captionStyle, setCaptionStyle] = useState<CaptionStylePreset>(clip.captionStyle || 'modern');
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>(clip.captionPosition || 'bottom');
  const [viewMode, setViewMode] = useState<'single' | 'split'>('single');
  const [saving, setSaving] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Build caption segments from transcript text
  const captionSegments = buildCaptionSegments(clip);

  // Determine video source based on view mode
  const hasSplitScreen = !!(clip as any).splitScreenUrl;
  const videoSrc = viewMode === 'split' && hasSplitScreen
    ? (clip as any).splitScreenUrl
    : clip.exports?.[0]?.url || '';
  const aspectRatio = FORMAT_TO_ASPECT[clip.format] || '9:16';
  const showCaptionOverlay = !clip.captionsBurnedIn && captionSegments.length > 0;

  // Persist caption style changes to backend
  const saveCaptionSettings = useCallback(async (
    style: CaptionStylePreset,
    position: CaptionPosition,
  ) => {
    setSaving(true);
    try {
      await api.clips.updateClip(uploadId, clip.id, {
        captionStyle: style,
        captionPosition: position,
      });
    } catch (err) {
      console.error('Failed to save caption settings', err);
    } finally {
      setSaving(false);
    }
  }, [uploadId, clip.id]);

  const handleStyleChange = (style: CaptionStylePreset) => {
    setCaptionStyle(style);
    saveCaptionSettings(style, captionPosition);
  };

  const handlePositionChange = (position: CaptionPosition) => {
    setCaptionPosition(position);
    saveCaptionSettings(captionStyle, position);
  };

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[800px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Video Player (45%) */}
          <div className="flex items-center justify-center p-4 lg:w-[45%] shrink-0 bg-background/50">
            <div className="w-full max-w-[280px]">
              {videoSrc ? (
                <VideoPlayer
                  key={`${viewMode}-${videoSrc}`}
                  src={videoSrc}
                  poster={viewMode === 'split' ? undefined : clip.thumbnailUrl}
                  aspectRatio="9:16"
                  showControls
                  duration={clip.duration}
                  captionSegments={showCaptionOverlay ? captionSegments : undefined}
                  captionStyle={captionStyle}
                  captionsEnabled={showCaptionOverlay}
                  captionPosition={captionPosition}
                />
              ) : (
                <div className={`flex items-center justify-center bg-black/40 rounded-lg ${
                  aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
                }`}>
                  <div className="text-center text-muted-foreground">
                    <Film className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No video available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls (55%) */}
          <div className="flex flex-col gap-5 p-6 lg:w-[55%] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {clip.title || `Clip ${clip.sortOrder + 1}`}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{formatDuration(clip.duration)}</span>
                  <span className="text-border">|</span>
                  <span>{FORMAT_LABELS[clip.format] || clip.format}</span>
                  {clip.viralityScore != null && clip.viralityScore > 0 && (
                    <>
                      <span className="text-border">|</span>
                      <span className="text-accent">{clip.viralityScore}% viral</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* View Mode Toggle — single vs split screen */}
            {hasSplitScreen && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">View</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      viewMode === 'single'
                        ? 'bg-primary-interactive text-white'
                        : 'border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Single Speaker
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      viewMode === 'split'
                        ? 'bg-primary-interactive text-white'
                        : 'border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Split Screen
                  </button>
                </div>
              </div>
            )}

            {/* Caption Controls — only show when captions are not burned in */}
            {!clip.captionsBurnedIn && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Caption Style</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <CaptionStylePopover
                    value={captionStyle}
                    onChange={handleStyleChange}
                    disabled={saving}
                  />
                  <CaptionPositionControl
                    value={captionPosition}
                    onChange={handlePositionChange}
                    disabled={saving}
                  />
                  {saving && (
                    <span className="text-[11px] text-muted-foreground animate-pulse">Saving...</span>
                  )}
                </div>
              </div>
            )}

            {clip.captionsBurnedIn && (
              <div className="rounded-lg bg-background/50 border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Captions are burned into this clip. Style and position were set during processing.
                </p>
              </div>
            )}

            {/* Transcript Preview */}
            {clip.transcriptText && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Transcript</h3>
                <div className="max-h-[200px] overflow-y-auto rounded-lg bg-background/50 border border-border p-3 space-y-2">
                  {captionSegments.length > 0 ? (
                    captionSegments.map((seg, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-muted-foreground font-mono shrink-0 w-12 text-right">
                          {formatDuration(seg.start)}
                        </span>
                        <span className="text-foreground/80">{seg.text}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-foreground/70">{clip.transcriptText}</p>
                  )}
                </div>
              </div>
            )}

            {/* Post caption — the text to paste into Instagram/LinkedIn/etc
                when uploading this clip. Falls back to kit-level IG caption
                if this clip's per-clip caption is missing (rare, older data). */}
            <PostCaptionBlock caption={clip.suggestedCaption} fallback={instagramCaption} />

            {/* Export + Post Section */}
            <div className="pt-2 mt-auto space-y-3">
              <button
                type="button"
                onClick={() => onExport(clip.id)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Download 1080p
              </button>

              {/* Multi-platform post actions — after the user has reviewed the clip
                  and its caption, they pick platforms and post or schedule. We pass
                  a finalization recipe so the backend worker burns captions with the
                  user's current style/position *before* posting to Outstand. Without
                  this, LinkedIn/IG/FB receive the raw uncaptioned clip. */}
              <VisualPostActions
                contentKitId={undefined}
                sourceOutputId={`clip:${clip.id}`}
                caption={clip.suggestedCaption || instagramCaption || ''}
                mediaUrls={videoSrc ? [videoSrc] : []}
                outputKind="clip"
                finalizationRecipe={{
                  kind: 'clip',
                  upload_id: uploadId,
                  clip_id: clip.id,
                  caption_style: captionStyle,
                  caption_position: captionPosition,
                  view_mode: viewMode,
                  skip_captions: clip.captionsBurnedIn ? false : captionSegments.length === 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
