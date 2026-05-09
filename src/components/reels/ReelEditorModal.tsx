'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { BRollStrip } from './BRollStrip';
import SegmentPreview from './SegmentPreview';
import SegmentEditor from './SegmentEditor';
import { PostCaptionBlock } from '@/components/content-kit/PostCaptionBlock';
import type { TextOverlayStyleId } from '@/types';

interface BRollClip {
  id: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  label?: string;
}

interface ReelEditorModalProps {
  open: boolean;
  onClose: () => void;
  contentKitId: string;
  reelProjectId?: string;
  /** Kit-level IG caption — also used as the default text overlay body */
  instagramCaption?: string;
  /** Per-reel post caption (preferred for the post-caption display) */
  postCaption?: string | null;
}

const STYLE_OPTIONS: Array<{
  id: TextOverlayStyleId;
  label: string;
}> = [
  { id: 'bold_impact', label: 'Bold Impact' },
  { id: 'minimal_clean', label: 'Minimal Clean' },
  { id: 'brand_gradient', label: 'Brand Gradient' },
  { id: 'story_cards', label: 'Story Cards' },
  { id: 'outlined_stroke', label: 'Outlined' },
  { id: 'neon_glow', label: 'Neon' },
];

export default function ReelEditorModal({
  open,
  onClose,
  contentKitId,
  reelProjectId,
  instagramCaption,
  postCaption,
}: ReelEditorModalProps) {
  // ---- State ----
  const [clips, setClips] = useState<BRollClip[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Array<{ text: string; duration: number }>>([
    { text: '', duration: 3 },
    { text: '', duration: 3 },
    { text: '', duration: 3 },
  ]);
  const [singleBlockText, setSingleBlockText] = useState(instagramCaption ?? '');
  const [mode, setMode] = useState<'segments' | 'single'>('segments');
  const [selectedStyle, setSelectedStyle] = useState<TextOverlayStyleId>('bold_impact');
  const [textScale, setTextScale] = useState(0.5);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(reelProjectId);
  // Editable per-reel post caption. Mirrors the carousel editor pattern:
  // local mirror feeds the textarea instantly, debounced PATCH persists to
  // content_kits.content_reels.post_caption (JSONB nested).
  const [postCaptionDraft, setPostCaptionDraft] = useState<string>(postCaption ?? '');
  const [savingCaption, setSavingCaption] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const captionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePostCaptionChange = useCallback(
    (next: string) => {
      setPostCaptionDraft(next);
      if (captionSaveTimerRef.current) clearTimeout(captionSaveTimerRef.current);
      captionSaveTimerRef.current = setTimeout(async () => {
        setSavingCaption(true);
        try {
          await api.contentKits.update(contentKitId, { reelPostCaption: next });
        } catch (err) {
          console.error('Failed to save reel caption', err);
        } finally {
          setSavingCaption(false);
        }
      }, 600);
    },
    [contentKitId],
  );

  // ---- Data fetching ----
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [libraryRes, reelProject, userClipsRes] = await Promise.all([
        api.brollReels.getBRollLibrary(),
        projectId
          ? api.reels.getProject(projectId).then((r) => r.data?.project ?? null)
          : api.brollReels.getByKitId(contentKitId),
        api.brollReels.getUserClips().catch(() => ({ clips: [] })),
      ]);

      // Merge user clips with library clips
      const userClips = userClipsRes?.clips || [];
      const allClips = [...userClips, ...(libraryRes?.clips || [])];
      const allCategories = [
        ...(userClips.length > 0 ? ['My Clips'] : []),
        ...(libraryRes?.categories || []),
      ];

      setClips(allClips);
      setCategories(allCategories);

      // Project defaults
      if (reelProject) {
        setProjectId(reelProject.id);
        const overlays = reelProject.generatedContent?.segmentOverlays;
        if (overlays && overlays.length >= 2) {
          setMode('segments');
          setSegments(overlays.map((o: any) => ({ text: o.text || '', duration: o.duration || 3 })));
        } else if (reelProject.generatedContent?.hookText) {
          setMode('single');
          setSingleBlockText(reelProject.generatedContent.hookText);
        }
        if (reelProject.outputUrl) setOutputUrl(reelProject.outputUrl);
      }

      // Select first realestate clip if nothing selected, else first clip
      if (!selectedClipId && allClips.length > 0) {
        const realEstateClip = allClips.find((c: BRollClip) => c.category === 'realestate');
        setSelectedClipId(realEstateClip?.id || allClips[0].id);
      }
    } catch (err) {
      console.error('Failed to load reel editor data', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId, contentKitId, selectedClipId]);

  const handleBrollUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await api.brollReels.uploadClip(file);
      if (result.success && result.data?.clip) {
        const newClip = result.data.clip;
        setClips((prev) => [newClip, ...prev]);
        setCategories((prev) =>
          prev.includes('My Clips') ? prev : ['My Clips', ...prev]
        );
        setSelectedClipId(newClip.id);
      }
    } catch (err) {
      console.error('B-Roll upload failed', err);
      setError('Upload failed. Check file size (max 50MB) and format (MP4/MOV/WebM).');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // ---- Escape key ----
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // ---- Backdrop click ----
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  // ---- Generate / render ----
  const handleGenerate = async () => {
    if (!selectedClipId) return;
    setRendering(true);
    setError(null);
    setOutputUrl(null);

    try {
      // Build text overlays from current mode
      const textOverlays = mode === 'segments'
        ? segments.filter(s => s.text.trim()).map((s) => ({
            text: s.text,
            position: 'center' as const,
          }))
        : [{ text: singleBlockText, position: 'center' as const }];

      // Compose a B-roll reel
      const composeRes = await api.brollReels.compose({
        brollClipIds: [selectedClipId],
        templateStyle: selectedStyle,
        contentKitId,
        generateText: false,
        textOverlays,
      });

      const newProjectId = composeRes.data?.projectId;
      if (!newProjectId) throw new Error('No project ID returned');

      setProjectId(newProjectId);

      // Poll for render status
      const maxPolls = 60;
      let polls = 0;
      const pollInterval = 3000;

      const poll = async (): Promise<string> => {
        const statusRes = await api.reels.getRenderStatus(newProjectId);
        const status = statusRes.data;

        if (status?.status === 'completed' && status?.outputUrl) {
          return status.outputUrl;
        }
        if (status?.status === 'failed') {
          throw new Error(status?.errorMessage ?? 'Rendering failed');
        }

        polls++;
        if (polls >= maxPolls) throw new Error('Rendering timed out');

        return new Promise((resolve, reject) => {
          setTimeout(() => poll().then(resolve).catch(reject), pollInterval);
        });
      };

      const url = await poll();
      setOutputUrl(url);
    } catch (err: any) {
      console.error('Render failed', err);
      setError(err?.message ?? 'Render failed. Please try again.');
    } finally {
      setRendering(false);
    }
  };

  // ---- Derived ----
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[800px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Mobile: vertical, Desktop: side-by-side */}
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Phone Preview */}
          <div className="flex items-center justify-center p-6 lg:w-[40%] shrink-0 bg-background/50">
            <div className="w-full max-w-[200px]">
              <SegmentPreview
                thumbnailUrl={selectedClip?.thumbnailUrl}
                videoUrl={selectedClip?.url}
                segments={mode === 'segments' ? segments.filter(s => s.text.trim()) : []}
                style={selectedStyle}
                textScale={textScale}
                singleBlockText={mode === 'single' ? singleBlockText : undefined}
              />
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col gap-5 p-6 lg:w-[60%] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Edit B-Roll Reel</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading editor...</p>
              </div>
            ) : (
              <>
                {/* B-Roll picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">B-Roll Clip</label>
                  <BRollStrip
                    clips={clips}
                    categories={categories}
                    selectedClipId={selectedClipId}
                    onSelect={setSelectedClipId}
                    onUpload={handleBrollUpload}
                    uploading={uploading}
                  />
                </div>

                {/* Segment / Single-block text editor */}
                <SegmentEditor
                  segments={segments}
                  onSegmentsChange={setSegments}
                  singleBlockText={singleBlockText}
                  onSingleBlockTextChange={setSingleBlockText}
                  mode={mode}
                  onModeChange={setMode}
                />

                {/* Style selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Text Style</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setSelectedStyle(style.id);
                        }}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                          selectedStyle === style.id
                            ? 'bg-primary-interactive text-white'
                            : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text size slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Text Size</label>
                    <span className="text-[11px] text-muted-foreground/50">{Math.round(textScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">A</span>
                    <input
                      type="range"
                      min="0.25"
                      max="0.75"
                      step="0.025"
                      value={textScale}
                      onChange={(e) => setTextScale(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 accent-primary-interactive cursor-pointer"
                    />
                    <span className="text-sm font-bold text-muted-foreground">A</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Post caption — the text to paste into Instagram when uploading.
                    Falls back to the kit-level IG caption if a per-reel caption
                    hasn't been generated yet. */}
                <PostCaptionBlock
                  caption={postCaptionDraft}
                  fallback={instagramCaption}
                  onChange={handlePostCaptionChange}
                  saving={savingCaption}
                />

                {/* Action button */}
                <div className="pt-2">
                  {outputUrl ? (
                    <>
                      <div className="flex gap-3">
                        <a
                          href={outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                        >
                          <Download className="h-4 w-4" />
                          Download Reel
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setOutputUrl(null);
                            handleGenerate();
                          }}
                          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Re-generate
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={rendering || !selectedClipId}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rendering ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Rendering...
                        </>
                      ) : (
                        'Generate Reel'
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
