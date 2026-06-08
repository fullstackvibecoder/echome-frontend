'use client';

/**
 * Unified Content Kit Detail Page
 *
 * Displays full content kit details including video clips,
 * written content, carousels, and share options.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useContentKitDetail } from '@/hooks/useContentKit';
import { useGenerationProgress, mapStepToIndex, GENERATION_STEPS, VIDEO_GENERATION_STEPS, isVideoStep } from '@/hooks/useGenerationProgress';
import { ScheduleModal, QuickScheduleModal } from '@/components/scheduling';
import { SuggestedScheduleModal } from '@/components/scheduling/SuggestedScheduleModal';
import { CONTENT_TYPE_CONFIG } from '@/lib/content-kit-utils';
import api from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { showErrorToast } from '@/lib/toast';
import { ContentCategory } from '@/types';
import { CalendarPlus, Film, Pen } from 'lucide-react';
import { useVoiceContext } from '@/contexts/voice-context';
import ReelEditorModal from '@/components/reels/ReelEditorModal';
import { ExportProgressModal } from '@/components/ExportProgressModal';
import { OutputCard } from '@/components/content-kit/OutputCard';
import { InlineWrittenContent } from '@/components/content-kit/InlineWrittenContent';
import SubstackEditorModal from '@/components/content-kit/SubstackEditorModal';
import WrittenContentModal from '@/components/content-kit/WrittenContentModal';
import ClipEditorModal from '@/components/content-kit/ClipEditorModal';
import CarouselEditorModal from '@/components/content-kit/CarouselEditorModal';
import { EmptyStateCards } from '@/components/content-kit/EmptyStateCards';

// Progress step component
function ProgressStep({
  icon,
  text,
  subtext,
  active,
  completed,
}: {
  icon: string;
  text: string;
  subtext: string;
  active: boolean;
  completed?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg transition-all duration-300 ${
        active
          ? 'bg-accent/10 border border-accent/30'
          : completed
          ? 'bg-success/10 border border-success/30'
          : 'bg-bg-secondary border border-transparent opacity-50'
      }`}
    >
      <span className="text-2xl">{completed ? '✓' : icon}</span>
      <div>
        <p className={`font-medium ${active || completed ? 'text-text-primary' : 'text-text-secondary'}`}>
          {text}
        </p>
        <p className="text-sm text-text-secondary">{subtext}</p>
      </div>
    </div>
  );
}

export default function ContentKitDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { item, detail, loading, error, refresh } = useContentKitDetail({ id });
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const { activeVoice, isTeamsUser } = useVoiceContext();
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<import('@/lib/caption-parser').CaptionStylePreset>('highlight');
  const [exportingClip, setExportingClip] = useState(false);
  // ID of the clip currently being exported — opens the progress modal when set
  const [exportingClipId, setExportingClipId] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [suggestedScheduleOpen, setSuggestedScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [quickScheduleConfig, setQuickScheduleConfig] = useState<{
    type: 'platform' | 'clips' | 'carousel';
    platform?: string;
  } | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [reelEditorOpen, setReelEditorOpen] = useState(false);
  const [substackModalOpen, setSubstackModalOpen] = useState(false);
  const [writtenContentModalOpen, setWrittenContentModalOpen] = useState(false);
  const [clipEditorOpen, setClipEditorOpen] = useState(false);
  const [carouselEditorOpen, setCarouselEditorOpen] = useState(false);
  const [activeClipForEditor, setActiveClipForEditor] = useState<any>(null);

  // Determine if we're in processing state
  const isProcessing = item?.status === 'processing' || (item?.status as string) === 'pending';

  // Check if we're still waiting for carousel (Instagram content but no carousel yet)
  const hasInstagramContentCheck = detail?.contentKit?.contentInstagram;
  const hasCarouselCheck = detail?.carousel?.slides && detail.carousel.slides.length > 0;
  const awaitingCarousel = hasInstagramContentCheck && !hasCarouselCheck;

  // Connect to SSE for:
  // 1. Processing state (content generation in progress)
  // 2. Awaiting carousel (content done but carousel still generating)
  const shouldConnectSSE = isProcessing || (awaitingCarousel && item?.status === 'completed');

  // The URL `id` is a content_kit_id, but useGenerationProgress needs a
  // generation_request_id to poll /api/generate/:id. Pull the real request ID
  // from the loaded content kit.
  const generationRequestId = detail?.contentKit?.generationRequestId || null;

  const {
    progress,
    isComplete: progressComplete,
    hasError: progressError,
    carouselReady,
    carouselFailed,
  } = useGenerationProgress(shouldConnectSSE && generationRequestId ? generationRequestId : null);

  // Detect if this is a video generation flow based on progress step
  const isVideoFlow = progress ? isVideoStep(progress.step) : false;
  const generationSteps = isVideoFlow ? VIDEO_GENERATION_STEPS : GENERATION_STEPS;
  const progressStep = progress ? mapStepToIndex(progress.step, isVideoFlow) : 0;

  // Auto-refresh when SSE signals content completion
  useEffect(() => {
    if (progressComplete && !progressError) {
      // Small delay to ensure backend has saved everything
      const timer = setTimeout(() => {
        refresh();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [progressComplete, progressError, refresh]);

  // Auto-refresh when SSE signals an error so we get the updated item status
  useEffect(() => {
    if (progressError) {
      refresh();
    }
  }, [progressError, refresh]);

  // Auto-refresh when SSE signals carousel is ready (no more polling needed!)
  useEffect(() => {
    if (carouselReady) {
      // Refresh to get the carousel data
      refresh();
    }
  }, [carouselReady, refresh]);

  // (removed) Auto-fetch of 1:1 resize on kit-page mount.
  // The state it set (`resizedCarousel`) was never rendered, so the call
  // was dead work — a full backend round-trip + storage writes per page
  // load with the result thrown away. For branded-overlay carousels (the
  // new default) it also tripped the alt-aspect stomping bug fixed in
  // 1bfc0ce. Removed entirely; if a 1:1 surface is needed in the future,
  // bring it back gated on actual UI consumption.
  const contentKitId = detail?.contentKit?.id;

  // Reel/B-Roll handlers moved to useVideoReel hook

  const handleQuickSchedule = async (data: {
    scheduledFor: string;
    platforms: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => {
    // Build content snapshot based on what's being scheduled
    let contentType: 'written' | 'clips' | 'carousel' | undefined;
    let contentSnapshot: any = undefined;

    if (quickScheduleConfig?.type === 'clips' && detail?.clips?.[activeClipIndex]) {
      const clip = detail.clips[activeClipIndex];
      contentType = 'clips';
      contentSnapshot = {
        type: 'clips',
        videoUrl: clip.exports?.[0]?.url,
        thumbnailUrl: clip.thumbnailUrl,
        suggestedCaption: clip.suggestedCaption,
      };
    } else if (quickScheduleConfig?.type === 'carousel' && detail?.carousel?.slides) {
      contentType = 'carousel';
      contentSnapshot = {
        type: 'carousel',
        carouselSlides: detail.carousel.slides.map((slide: any) => ({
          slideNumber: slide.slideNumber,
          imageUrl: slide.publicUrl,
          text: slide.text,
        })),
      };
    } else if (quickScheduleConfig?.type === 'platform' && quickScheduleConfig.platform) {
      // Get the text content for the specific platform
      const platformContent = getPlatformContent().find(
        p => p.platform === quickScheduleConfig.platform
      );
      if (platformContent) {
        contentType = 'written';
        contentSnapshot = {
          type: 'written',
          text: platformContent.content,
        };
      }
    }

    const response = await api.scheduling.create({
      contentKitId: id,
      title: item?.title || 'Scheduled Content',
      scheduledFor: data.scheduledFor,
      platforms: data.platforms,
      contentCategory: data.contentCategory,
      contentType,
      contentSnapshot,
      notes: data.notes,
    });

    if (!response.success) {
      throw new Error('Failed to schedule content');
    }

    // Show success message
    setScheduleSuccess('Content scheduled successfully!');
    setTimeout(() => setScheduleSuccess(null), 3000);
  };

  /**
   * Download a clip as a 1080p MP4 with captions burned in at export quality.
   * Opens the ExportProgressModal to show live SSE progress while FFmpeg runs,
   * then opens the resulting file in a new tab when complete.
   */
  const handleDownloadClip = async (
    clip: { id: string; videoUploadId?: string; captionsBurnedIn?: boolean; splitScreenUrl?: string; exports?: Array<{ url?: string }> },
    viewMode: 'single' | 'split',
    // Optional override — when the call comes from the editor modal, the
    // modal passes its own captionStyle state so the user's most recent
    // pick wins regardless of any persistence timing. Falls back to the
    // page-level state for older callsites that don't pass one.
    captionStyleOverride?: import('@/lib/caption-parser').CaptionStylePreset,
    /** Pass true for the no-captions ("clean") download option. Caller is
     *  responsible for the UI affordance — this just plumbs the flag through
     *  to the backend's skip_captions path. */
    skipCaptions: boolean = false,
  ) => {
    const uploadId = clip.videoUploadId || id;

    // Legacy clips have captions already burned in — serve the existing URL directly
    if (clip.captionsBurnedIn !== false) {
      const legacyUrl = viewMode === 'split' ? clip.splitScreenUrl : clip.exports?.[0]?.url;
      if (legacyUrl) {
        window.open(legacyUrl, '_blank');
        return;
      }
    }

    setExportingClip(true);
    setExportingClipId(clip.id); // Opens the modal + SSE subscription
    try {
      const r = await api.clips.exportClip(uploadId, clip.id, {
        captionStyle: captionStyleOverride ?? captionStyle,
        viewMode,
        addCaptions: skipCaptions ? false : captionsEnabled,
      });
      if (r.data?.export?.url) {
        window.open(r.data.export.url, '_blank');
      } else {
        showErrorToast('Export failed.');
      }
    } catch (err) {
      showErrorToast(err, 'exporting clip');
    } finally {
      setExportingClip(false);
      // Modal auto-closes 1.2s after export_complete SSE event,
      // but clear the ID here as a safety net in case SSE dropped
      setTimeout(() => setExportingClipId(null), 1500);
    }
  };

  const handleScheduleSave = async (data: {
    contentKitId: string;
    scheduledFor: string;
    platforms: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => {
    setScheduling(true);
    try {
      await api.scheduling.create({
        contentKitId: data.contentKitId,
        scheduledFor: data.scheduledFor,
        platforms: data.platforms,
        contentCategory: data.contentCategory,
        notes: data.notes,
      });
      setScheduleModalOpen(false);
    } catch (err) {
      console.error('Failed to schedule content:', err);
      showErrorToast(err, 'scheduling content');
      throw err;
    } finally {
      setScheduling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get platform content from content kit + generated_content table (merged)
  // Blog and other slow-generating platforms may finish after the content kit
  // is created, so we merge both sources to avoid missing late-arriving content.
  const getPlatformContent = () => {
    const platformMap = new Map<string, string>();

    // Start with contentKit (unified content_kits table)
    if (detail?.contentKit) {
      const kit = detail.contentKit;
      const kitContent = [
        { platform: 'linkedin', content: kit.contentLinkedin },
        { platform: 'twitter', content: kit.contentTwitter },
        { platform: 'instagram', content: kit.contentInstagram },
        { platform: 'tiktok', content: kit.contentTiktok },
        { platform: 'blog', content: kit.contentBlog },
        { platform: 'email', content: kit.contentEmail },
        { platform: 'youtube', content: kit.contentYoutube },
        { platform: 'video-script', content: kit.contentVideoScript },
      ];
      for (const { platform, content } of kitContent) {
        if (content) platformMap.set(platform, content);
      }
    }

    // Merge in generated_content table (picks up late-arriving platforms like blog)
    if (detail?.content && detail.content.length > 0) {
      for (const item of detail.content) {
        if (item.content && item.platform && !platformMap.has(item.platform)) {
          platformMap.set(item.platform, item.content);
        }
      }
    }

    return Array.from(platformMap.entries()).map(([platform, content]) => ({ platform, content }));
  };

  const platformContent = getPlatformContent();
  const hasClips = detail?.clips && detail.clips.length > 0;
  const hasWrittenContent = platformContent.length > 0;

  // Map of platform → generated_content.id for feedback widgets.
  // Pulls from detail.content[] (per-platform generated_content rows). Late-arriving
  // platforms may not have a row yet; the thumbs widget hides for those.
  const platformIds: Record<string, string> = {};
  if (detail?.content && Array.isArray(detail.content)) {
    for (const item of detail.content) {
      if (item?.platform && item?.id) platformIds[item.platform] = item.id;
    }
  }
  const hasCarousel = detail?.carousel?.slides && detail.carousel.slides.length > 0;
  const typeConfig = item ? CONTENT_TYPE_CONFIG[item.type] : null;

  // Check if Instagram content was generated (means carousel should be coming)
  const hasInstagramContent = platformContent.some(p => p.platform === 'instagram') ||
    detail?.contentKit?.contentInstagram;

  // Show carousel loading when: Instagram content exists, no carousel yet, and item was created recently
  const itemCreatedRecently = item?.createdAt &&
    (Date.now() - new Date(item.createdAt).getTime()) < 5 * 60 * 1000; // 5 minutes
  const carouselExpected = hasInstagramContent && !hasCarousel && itemCreatedRecently;

  // Carousel status is now tracked via SSE (carouselReady/carouselFailed)
  // No polling needed - the useEffect above handles refresh when carousel_complete event arrives

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Back Button */}
      <Link
        href="/app/library"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to Content Kit</span>
      </Link>

      {/* Active Voice Indicator (Teams users) */}
      {isTeamsUser && activeVoice && (
        <div className="flex items-center gap-3 mb-6 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {activeVoice.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-foreground">
            Voice: <span className="font-medium">{activeVoice.name}</span>
          </span>
          <Link
            href="/app/voice?tab=team"
            className="text-xs text-primary hover:underline ml-auto"
          >
            Switch
          </Link>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading content...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
          {error}
          <button onClick={refresh} className="ml-4 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && item && (
        <div className="animate-fade-in space-y-8">
          {/* Header */}
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {/* Type Badge */}
                {typeConfig && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3 ${typeConfig.color}`}>
                    <span>{typeConfig.icon}</span>
                    <span>{typeConfig.label}</span>
                  </div>
                )}
                <h1 className="text-display text-3xl mb-2">{item.title}</h1>
                <div className="flex items-center gap-4 text-text-secondary text-sm flex-wrap">
                  <span>Created {formatDate(item.createdAt)}</span>
                  {hasClips && (
                    <>
                      <span>•</span>
                      <span className="text-accent font-medium">
                        🎬 {detail.clips.length} clip{detail.clips.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {hasWrittenContent && (
                    <>
                      <span>•</span>
                      <span className="text-accent font-medium">
                        ✍️ {platformContent.length} platform{platformContent.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {hasCarousel && (
                    <>
                      <span>•</span>
                      <span className="text-accent font-medium">
                        📸 {detail.carousel.slides.length} slides
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-accent bg-bg-tertiary rounded-lg transition-colors"
                >
                  <span className={loading ? 'animate-spin' : ''}>↻</span>
                  <span>Refresh</span>
                </button>
                {!isProcessing && item?.status === 'completed' && (
                  <>
                    <button
                      onClick={() => setSuggestedScheduleOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                      title="Let EchoMe suggest an AI-picked rollout for this whole kit"
                    >
                      <span>✨</span>
                      <span>AI Schedule</span>
                    </button>
                    <button
                      onClick={() => setScheduleModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <span>📅</span>
                      <span>Schedule</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Processing State with Step Progress */}
            {isProcessing && (
              <div className="mt-6 bg-bg-tertiary rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="font-medium text-text-primary text-lg">
                      {progress?.message || item.statusMessage || 'Processing your content...'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {isVideoFlow
                        ? `Processing video${progress?.metadata?.videoDuration ? ` (${Math.round(progress.metadata.videoDuration / 60)} min)` : ''}...`
                        : 'This usually takes 30-60 seconds'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-500 ease-out"
                      style={{ width: `${progress?.percent || 5}%` }}
                    />
                  </div>
                </div>

                {/* Step indicators */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {generationSteps.map((step, index) => (
                    <ProgressStep
                      key={step.id}
                      icon={step.icon}
                      text={step.label}
                      subtext={step.description}
                      active={index === progressStep}
                      completed={index < progressStep}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Visual Content */}
          {((detail?.clips?.length ?? 0) > 0 || hasCarousel || carouselExpected) && (
            <section className="mt-8">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Film className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">Visual Content</h3>
                  <p className="text-[11px] text-muted-foreground">Clips, carousels, and reels ready to publish</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {/* Clip cards */}
                {detail?.clips?.map((clip: any, index: number) => (
                  <OutputCard
                    key={clip.id}
                    title={clip.title || `Clip ${index + 1}`}
                    subtitle={`${Math.floor(clip.duration / 60)}:${String(Math.floor(clip.duration % 60)).padStart(2, '0')}`}
                    thumbnailUrl={clip.thumbnailUrl}
                    aspectRatio="4/5"
                    platform="clip"
                    variant="visual"
                    onClick={() => {
                      setActiveClipForEditor(clip);
                      setClipEditorOpen(true);
                    }}
                  />
                ))}

                {/* Carousel card */}
                {hasCarousel && (
                  <OutputCard
                    title="Instagram Carousel"
                    subtitle={`${detail.carousel.slides.length} slides`}
                    thumbnailUrl={detail.carousel.slides?.[0]?.publicUrl || detail.carousel.slides?.[0]?.thumbnailUrl}
                    platform="carousel"
                    variant="visual"
                    aspectRatio="1/1"
                    onClick={() => setCarouselEditorOpen(true)}
                    badge={`${detail.carousel.slides.length} slides`}
                  />
                )}

                {/* Carousel loading */}
                {carouselExpected && (
                  <OutputCard
                    title="Instagram Carousel"
                    subtitle="Generating..."
                    platform="carousel"
                    variant="visual"
                    thumbnailFallback={
                      <div className="flex flex-col items-center justify-center gap-2 py-6">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-muted-foreground">Rendering slides...</span>
                      </div>
                    }
                    onClick={() => {}}
                  />
                )}

                {/* B-Roll Reel */}
                {(hasCarousel || detail?.contentKit?.videoUploadId) && (
                  <OutputCard
                    title="B-Roll Reel"
                    subtitle="Authority hook overlay"
                    thumbnailUrl={(detail as any)?.reel?.thumbnailUrl}
                    aspectRatio="4/5"
                    platform="reel"
                    variant="visual"
                    onClick={() => setReelEditorOpen(true)}
                  />
                )}
              </div>
            </section>
          )}

          {/* Written Content */}
          {(detail?.contentKit?.contentBlog || detail?.contentKit?.contentLinkedin) && (
            <section className="mt-8">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                  <Pen className="w-4 h-4 text-accent-purple" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">Written Content</h3>
                  <p className="text-[11px] text-muted-foreground">Long-form articles and platform posts</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Substack card — opens modal */}
                {detail?.contentKit?.contentBlog && (
                  <OutputCard
                    title="Substack"
                    platform="substack"
                    variant="text"
                    thumbnailFallback={detail.contentKit.contentBlog.slice(0, 150)}
                    onClick={() => setSubstackModalOpen(true)}
                  />
                )}

                {/* Platform posts — inline tabbed editor */}
                {detail?.contentKit?.contentLinkedin && (
                  <InlineWrittenContent
                    contentKitId={detail.contentKit.id}
                    contentKitTitle={detail.contentKit.title}
                    knowledgeBaseId={detail.contentKit.knowledgeBaseId}
                    content={{
                      linkedin: detail.contentKit.contentLinkedin,
                      instagram: detail.contentKit.contentInstagram,
                      twitter: detail.contentKit.contentTwitter,
                      email: detail.contentKit.contentEmail,
                      tiktok: detail.contentKit.contentTiktok,
                      youtube: detail.contentKit.contentYoutube,
                      'video-script': detail.contentKit.contentVideoScript,
                    }}
                    platformIds={platformIds}
                    onContentUpdate={() => refresh()}
                    onSchedule={(platform) => setQuickScheduleConfig({ type: 'platform', platform })}
                  />
                )}
              </div>
            </section>
          )}

          {/* Failed Generation State */}
          {!hasClips && !hasWrittenContent && !hasCarousel && !isProcessing && (item?.status === 'failed' || progressError) && (
            <div className="text-center py-16 bg-error/5 rounded-xl border border-error/20">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Generation failed</h3>
              <p className="text-text-secondary mb-6">
                {item?.statusMessage || 'Something went wrong while generating your content. Please try again.'}
              </p>
              <Link href="/app" className="btn-primary">
                Try Again
              </Link>
            </div>
          )}

          {/* Empty State */}
          {!hasClips && !hasWrittenContent && !hasCarousel && !isProcessing && item?.status !== 'failed' && !progressError && (
            <EmptyStateCards fallbackKitId={null} />
          )}

          {/* Quick Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Link
              href="/app/library"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              ← Back to Content Kit
            </Link>
            <Link
              href="/app"
              className="btn-primary"
            >
              ✨ Create New
            </Link>
          </div>
        </div>
      )}

      {/* Schedule Modal (for full kit) */}
      {item && (
        <ScheduleModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          onSave={handleScheduleSave}
          unscheduledContent={[{
            id: item.id,
            title: item.title,
            thumbnailUrl: detail?.clips?.[0]?.thumbnailUrl || detail?.carousel?.slides?.[0]?.publicUrl,
            createdAt: item.createdAt,
          }]}
        />
      )}

      {/* AI Suggested Schedule Modal — rollout across platforms with best-time defaults */}
      {item && (
        <SuggestedScheduleModal
          open={suggestedScheduleOpen}
          onClose={() => setSuggestedScheduleOpen(false)}
          kitId={item.id}
          kitTitle={item.title}
          onScheduled={() => { refresh(); }}
        />
      )}

      {/* Quick Schedule Modal (for individual content) */}
      {item && (
        <QuickScheduleModal
          isOpen={!!quickScheduleConfig}
          onClose={() => setQuickScheduleConfig(null)}
          onSchedule={handleQuickSchedule}
          contentKitId={id}
          contentTitle={item.title}
          defaultPlatform={quickScheduleConfig?.type === 'platform' ? quickScheduleConfig.platform : undefined}
          defaultPlatforms={
            quickScheduleConfig?.type === 'clips'
              ? ['tiktok', 'instagram', 'youtube']
              : quickScheduleConfig?.type === 'carousel'
              ? ['instagram']
              : undefined
          }
        />
      )}

      {/* Success Toast */}
      {scheduleSuccess && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-xl">✓</span>
            <span className="font-medium">{scheduleSuccess}</span>
          </div>
        </div>
      )}

      {/* Substack Editor Modal */}
      <SubstackEditorModal
        open={substackModalOpen}
        onClose={() => setSubstackModalOpen(false)}
        content={detail?.contentKit?.contentBlog || ''}
        title={detail?.contentKit?.title || 'Untitled'}
        contentKitId={detail?.contentKit?.id || id}
        onContentUpdate={() => refresh()}
      />

      {/* Written Content Modal */}
      <WrittenContentModal
        open={writtenContentModalOpen}
        onClose={() => setWrittenContentModalOpen(false)}
        contentKitId={detail?.contentKit?.id || id}
        content={{
          linkedin: detail?.contentKit?.contentLinkedin,
          twitter: detail?.contentKit?.contentTwitter,
          instagram: detail?.contentKit?.contentInstagram,
          email: detail?.contentKit?.contentEmail,
          tiktok: detail?.contentKit?.contentTiktok,
          youtube: detail?.contentKit?.contentYoutube,
          videoScript: detail?.contentKit?.contentVideoScript,
        }}
        onContentUpdate={() => refresh()}
      />

      {/* Clip Editor Modal */}
      {activeClipForEditor && (
        <ClipEditorModal
          open={clipEditorOpen}
          onClose={() => { setClipEditorOpen(false); setActiveClipForEditor(null); }}
          clip={activeClipForEditor}
          uploadId={detail?.clips?.[0]?.videoUploadId || (detail as any)?.uploadId || id}
          onExport={(clipId, viewMode, modalCaptionStyle, skipCaptions) => {
            // Capture the clip object before we close the modal — once
            // setActiveClipForEditor(null) fires, we lose the reference.
            const clipForExport = activeClipForEditor && activeClipForEditor.id === clipId
              ? activeClipForEditor
              : null;
            setClipEditorOpen(false);
            setActiveClipForEditor(null);
            if (clipForExport) {
              // Both viewMode AND captionStyle come straight from the
              // modal's own state, so the user's picks win regardless of
              // any parent-level state or PATCH timing.
              // handleDownloadClip both opens the progress modal AND fires
              // the POST that starts the encoder.
              void handleDownloadClip(clipForExport, viewMode, modalCaptionStyle, skipCaptions);
            } else {
              // Fallback: at least open the progress modal so the user sees
              // SOME indication. Without the clip object we can't POST, so
              // surface an error.
              setExportingClipId(clipId);
              showErrorToast('Could not start export — please retry from the clip card.');
            }
          }}
          contentKitId={contentKitId || id}
          instagramCaption={detail?.contentKit?.contentInstagram}
        />
      )}

      {/* Export Progress Modal — shown while a 1080p clip download is being rendered */}
      <ExportProgressModal
        clipId={exportingClipId}
        onClose={() => setExportingClipId(null)}
      />

      {/* Carousel Editor Modal */}
      {hasCarousel && (
        <CarouselEditorModal
          open={carouselEditorOpen}
          onClose={() => setCarouselEditorOpen(false)}
          slides={detail.carousel.slides.map((s: any) => ({
            slideNumber: s.slideNumber,
            publicUrl: s.publicUrl,
            backgroundUrl: s.backgroundUrl || s.background_url,
            // backgroundImageUrl is the SOURCE photo URL (separate from
            // backgroundUrl which is the cached two-phase legacy background).
            // Required by the client-side canvas renderer for branded-overlay
            // templates — without it, the preview falls back to solid fill.
            backgroundImageUrl: s.backgroundImageUrl,
            text: s.text || '',
            template: s.template || s.slideType,
          }))}
          contentKitId={contentKitId || id}
          designPreset={detail.carousel.designPreset}
          uploadId={detail?.clips?.[0]?.videoUploadId}
          suggestedCaption={(detail.carousel as any)?.suggestedCaption}
          fallbackCaption={detail?.contentKit?.contentInstagram}
          onCarouselUpdate={() => refresh()}
        />
      )}

      {/* Reel Editor Modal */}
      {contentKitId && (
        <ReelEditorModal
          open={reelEditorOpen}
          onClose={() => setReelEditorOpen(false)}
          contentKitId={contentKitId}
          reelProjectId={(detail as any)?.reel?.id}
          instagramCaption={detail?.contentKit?.contentInstagram}
          postCaption={(detail as any)?.reelContent?.postCaption}
        />
      )}
    </div>
  );
}
