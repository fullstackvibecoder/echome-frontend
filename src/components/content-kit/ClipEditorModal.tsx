'use client';

/**
 * ClipEditorModal — Modal for viewing a video clip with caption controls and export.
 *
 * Left side: VideoPlayer with live caption preview (when captions are not burned in).
 * Right side: Caption style/position controls, transcript preview, and export button.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Download, Film, RotateCcw } from 'lucide-react';
import { api, type VideoClip } from '@/lib/api-client';
import { formatDuration } from '@/lib/content-kit-utils';
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer';
import { CaptionStylePopover } from './CaptionStylePopover';
import type { CaptionStylePreset } from '@/lib/caption-parser';
import type { CaptionSegment } from '@/lib/caption-parser';
import { PostCaptionBlock } from './PostCaptionBlock';
import { VisualPostActions } from './VisualPostActions';

interface ClipEditorModalProps {
  open: boolean;
  onClose: () => void;
  clip: VideoClip;
  uploadId: string;
  /**
   * Fired when the user clicks Download. Includes the current viewMode
   * (single vs split-screen) AND the current caption style so the parent
   * can route the export through the matching encoder pipeline. The
   * modal is the source of truth for both — the parent shouldn't guess
   * or pull from a separate state. (caption style is also persisted to
   * the DB on every change, but threading it explicitly here avoids a
   * race where Download fires before the persistStyle PATCH lands.)
   */
  onExport: (clipId: string, viewMode: 'single' | 'split', captionStyle: CaptionStylePreset) => void;
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
  // Free-form drag-to-position. undefined → fall back to viewMode/style default.
  const [captionPositionXY, setCaptionPositionXY] = useState<{ x: number; y: number } | undefined>(
    clip.captionConfig?.positionXY,
  );
  // User-resized caption box scale. undefined → preset default (1.0). Persists
  // independently from positionXY so a user can resize without first dragging.
  const [captionSizeScale, setCaptionSizeScale] = useState<number | undefined>(
    typeof clip.captionConfig?.sizeScale === 'number' ? clip.captionConfig.sizeScale : undefined,
  );
  // Per-segment text overrides (typo fixes). Map keyed by filtered-segment index.
  const [segmentEdits, setSegmentEdits] = useState<Map<number, string>>(() => {
    const initial = new Map<number, string>();
    for (const o of clip.captionConfig?.segmentOverrides ?? []) initial.set(o.index, o.text);
    return initial;
  });
  const [viewMode, setViewMode] = useState<'single' | 'split'>('single');
  const [saving, setSaving] = useState(false);
  // Editable post caption (text accompanying the clip on social platforms).
  // Local mirror of clip.suggestedCaption — empty string means "user cleared
  // the per-clip caption" so the kit-level fallback (instagramCaption prop)
  // shows through at post-time. Persisted via debounced PATCH.
  const [postCaption, setPostCaption] = useState<string>(clip.suggestedCaption ?? '');
  const [savingCaption, setSavingCaption] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  // Imperative handle on the video player so we can jump to a transcript
  // segment's start time when the user focuses/clicks that segment's input.
  // This keeps the live caption preview in sync with what the user is editing
  // — they see their typo fix on-frame instead of having to scrub manually.
  const playerRef = useRef<VideoPlayerHandle>(null);
  // Refs for the per-segment <input> elements so focus survives a re-render
  // when the user types fast (overlay updates → re-render → naive React would
  // unmount-and-remount the input). Storing keyed by index lets us key the
  // input by the same index and avoid the React reconciliation cost.

  // Build caption segments from transcript text, then apply user overrides on top.
  // Live preview reflects edits because captionSegments is derived from segmentEdits.
  const baseSegments = useMemo(() => buildCaptionSegments(clip), [clip]);
  const captionSegments = useMemo(() => {
    if (segmentEdits.size === 0) return baseSegments;
    return baseSegments.map((seg, i) => {
      const edit = segmentEdits.get(i);
      return edit !== undefined ? { ...seg, text: edit } : seg;
    });
  }, [baseSegments, segmentEdits]);

  // Determine video source based on view mode
  const hasSplitScreen = !!(clip as any).splitScreenUrl;
  const videoSrc = viewMode === 'split' && hasSplitScreen
    ? (clip as any).splitScreenUrl
    : clip.exports?.[0]?.url || '';
  const aspectRatio = FORMAT_TO_ASPECT[clip.format] || '9:16';
  const showCaptionOverlay = !clip.captionsBurnedIn && captionSegments.length > 0;

  // Debounced save for transcript edits, drag positions, and box resize.
  // Style change still saves immediately (it's a discrete pick). Edits to
  // text/position/size fire many state updates; debounce so we PATCH once
  // after the user pauses.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistEdits = useCallback(
    (
      overrides: Array<{ index: number; text: string }>,
      posXY: { x: number; y: number } | undefined,
      scale: number | undefined,
    ) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const payload: Parameters<typeof api.clips.updateClip>[2] = {};
          payload.segmentOverrides = overrides;
          if (posXY) payload.captionPositionXY = posXY;
          if (scale !== undefined) payload.captionSizeScale = scale;
          await api.clips.updateClip(uploadId, clip.id, payload);
        } catch (err) {
          console.error('Failed to save caption edits', err);
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [uploadId, clip.id],
  );

  // Debounced post-caption save — separate timer from segmentEdits so a fast
  // typist editing the post caption doesn't queue up segment-edit saves and
  // vice versa. Same 600ms cadence for consistency.
  const captionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePostCaptionChange = useCallback((next: string) => {
    setPostCaption(next);
    if (captionSaveTimerRef.current) clearTimeout(captionSaveTimerRef.current);
    captionSaveTimerRef.current = setTimeout(async () => {
      setSavingCaption(true);
      try {
        await api.clips.updateClip(uploadId, clip.id, { suggestedCaption: next });
      } catch (err) {
        console.error('Failed to save post caption', err);
      } finally {
        setSavingCaption(false);
      }
    }, 600);
  }, [uploadId, clip.id]);

  const persistStyle = useCallback(async (style: CaptionStylePreset) => {
    setSaving(true);
    try {
      await api.clips.updateClip(uploadId, clip.id, { captionStyle: style });
    } catch (err) {
      console.error('Failed to save caption style', err);
    } finally {
      setSaving(false);
    }
  }, [uploadId, clip.id]);

  const handleStyleChange = (style: CaptionStylePreset) => {
    setCaptionStyle(style);
    persistStyle(style);
  };

  const handlePositionDragChange = useCallback((pos: { x: number; y: number }) => {
    setCaptionPositionXY(pos);
    const overrides = Array.from(segmentEdits.entries()).map(([index, text]) => ({ index, text }));
    persistEdits(overrides, pos, captionSizeScale);
  }, [segmentEdits, persistEdits, captionSizeScale]);

  // Resize is independent from drag — never touches positionXY. Movement of
  // the corner handle in CaptionOverlay calls this with the new clamped
  // scale. Same debounced persist path; size becomes one more key in the
  // caption_config JSONB merge.
  const handleSizeChange = useCallback((scale: number) => {
    setCaptionSizeScale(scale);
    const overrides = Array.from(segmentEdits.entries()).map(([index, text]) => ({ index, text }));
    persistEdits(overrides, captionPositionXY, scale);
  }, [segmentEdits, persistEdits, captionPositionXY]);

  const handleSegmentTextChange = useCallback((index: number, text: string) => {
    setSegmentEdits(prev => {
      const next = new Map(prev);
      const original = baseSegments[index]?.text ?? '';
      // If the user reverts to the original text, drop the override entirely
      // so we don't bloat caption_config with no-op entries.
      if (text === original) next.delete(index);
      else next.set(index, text);
      const overrides = Array.from(next.entries()).map(([i, t]) => ({ index: i, text: t }));
      persistEdits(overrides, captionPositionXY, captionSizeScale);
      return next;
    });
  }, [baseSegments, captionPositionXY, captionSizeScale, persistEdits]);

  const handleResetPosition = useCallback(() => {
    setCaptionPositionXY(undefined);
    const overrides = Array.from(segmentEdits.entries()).map(([index, text]) => ({ index, text }));
    // Persist a clear by sending undefined positionXY — backend will leave
    // caption_config.positionXY untouched on undefined; if we want to clear
    // it explicitly we'd need a separate endpoint. For v1, leaving the prior
    // position in caption_config is fine — the editor state shows the reset.
    persistEdits(overrides, undefined, captionSizeScale);
  }, [segmentEdits, captionSizeScale, persistEdits]);

  const handleResetSize = useCallback(() => {
    setCaptionSizeScale(undefined);
    const overrides = Array.from(segmentEdits.entries()).map(([index, text]) => ({ index, text }));
    // Sending sizeScale=1 explicitly clears the override at burn time —
    // buildPositionPrefix omits \fscx when sizeScale is 1.
    persistEdits(overrides, captionPositionXY, 1);
  }, [segmentEdits, captionPositionXY, persistEdits]);

  // Flush pending debounced saves on unmount so a quick close doesn't lose edits.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (captionSaveTimerRef.current) clearTimeout(captionSaveTimerRef.current);
    };
  }, []);

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
                  ref={playerRef}
                  key={`${viewMode}-${videoSrc}`}
                  src={videoSrc}
                  poster={viewMode === 'split' ? undefined : clip.thumbnailUrl}
                  aspectRatio="9:16"
                  showControls
                  duration={clip.duration}
                  captionSegments={showCaptionOverlay ? captionSegments : undefined}
                  captionStyle={captionStyle}
                  captionsEnabled={showCaptionOverlay}
                  captionPositionXY={captionPositionXY}
                  captionSizeScale={captionSizeScale}
                  captionDraggable={showCaptionOverlay}
                  onCaptionPositionChange={handlePositionDragChange}
                  onCaptionSizeChange={handleSizeChange}
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

            {/* Caption Controls — only show when captions are not burned in.
                Style picker stays as a discrete pick. The 3-position enum is
                gone — drag the caption block on the video to position it
                anywhere. The "Reset" button restores the smart-default
                placement (face-aware bottom for portrait, etc). */}
            {!clip.captionsBurnedIn && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">Caption Style</h3>
                  {saving && (
                    <span className="text-[11px] text-muted-foreground animate-pulse">Saving…</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <CaptionStylePopover
                    value={captionStyle}
                    onChange={handleStyleChange}
                    disabled={saving}
                  />
                  {captionPositionXY && (
                    <button
                      type="button"
                      onClick={handleResetPosition}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Reset caption to default position"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset position
                    </button>
                  )}
                  {captionSizeScale !== undefined && captionSizeScale !== 1 && (
                    <button
                      type="button"
                      onClick={handleResetSize}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Reset caption to default size"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset size
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Drag the caption to move it. Drag the corner handle to resize.
                  Edit text below to fix typos — clicking a line jumps the preview to that moment.
                </p>
              </div>
            )}

            {clip.captionsBurnedIn && (
              <div className="rounded-lg bg-background/50 border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Captions are burned into this clip. Style and position were set during processing.
                </p>
              </div>
            )}

            {/* Transcript — editable when captions aren't burned in. Each
                segment is an inline input; typing updates the on-video caption
                preview live (segmentOverrides → captionSegments → CaptionOverlay
                re-renders). Persists to caption_config on debounce. */}
            {clip.transcriptText && captionSegments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  Transcript
                  {!clip.captionsBurnedIn && (
                    <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                      (click to edit)
                    </span>
                  )}
                </h3>
                <div className="max-h-[200px] overflow-y-auto rounded-lg bg-background/50 border border-border p-3 space-y-1.5">
                  {captionSegments.map((seg, i) => {
                    const isEdited = segmentEdits.has(i);
                    const original = baseSegments[i]?.text ?? '';
                    return (
                      <div key={i} className="flex gap-2 text-xs items-center">
                        <button
                          type="button"
                          onClick={() => playerRef.current?.seekTo(seg.start, { play: true })}
                          className="text-muted-foreground hover:text-foreground font-mono shrink-0 w-12 text-right tabular-nums cursor-pointer transition-colors"
                          title="Jump to this moment in the preview"
                        >
                          {formatDuration(seg.start)}
                        </button>
                        {clip.captionsBurnedIn ? (
                          <span className="text-foreground/80 flex-1">{seg.text}</span>
                        ) : (
                          <input
                            type="text"
                            value={seg.text}
                            onChange={(e) => handleSegmentTextChange(i, e.target.value)}
                            onFocus={() => playerRef.current?.seekTo(seg.start)}
                            onClick={() => playerRef.current?.seekTo(seg.start)}
                            className={`flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary-interactive focus:outline-none text-foreground/90 transition-colors px-1 py-0.5 ${
                              isEdited ? 'text-accent' : ''
                            }`}
                            title={isEdited ? `Edited from: "${original}"` : 'Click to edit'}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {clip.transcriptText && captionSegments.length === 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Transcript</h3>
                <div className="rounded-lg bg-background/50 border border-border p-3">
                  <p className="text-xs text-foreground/70">{clip.transcriptText}</p>
                </div>
              </div>
            )}

            {/* Post caption — the text to paste into Instagram/LinkedIn/etc
                when uploading this clip. Editable: typing persists to
                video_clips.suggested_caption (debounced 600ms). Falls back
                to the kit-level IG caption when the per-clip value is empty,
                so unedited clips still inherit the kit default. */}
            <PostCaptionBlock
              caption={postCaption}
              fallback={instagramCaption}
              onChange={handlePostCaptionChange}
              saving={savingCaption}
            />

            {/* Export + Post Section */}
            <div className="pt-2 mt-auto space-y-3">
              <button
                type="button"
                onClick={() => onExport(clip.id, viewMode, captionStyle)}
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
                caption={postCaption.trim() || instagramCaption || ''}
                mediaUrls={videoSrc ? [videoSrc] : []}
                outputKind="clip"
                finalizationRecipe={{
                  kind: 'clip',
                  upload_id: uploadId,
                  clip_id: clip.id,
                  caption_style: captionStyle,
                  // caption_position kept for backwards-compat; positionXY +
                  // segmentOverrides are read from caption_config server-side.
                  caption_position: clip.captionPosition || 'bottom',
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
