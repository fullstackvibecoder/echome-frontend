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
import { VideoPlayer } from '@/components/content-kit';
import { ShareDropdown, QuickShareButton } from '@/components/share-buttons';
import { ScheduleModal, QuickScheduleModal } from '@/components/scheduling';
import { PLATFORM_CONFIG, CONTENT_TYPE_CONFIG, formatDuration } from '@/lib/content-kit-utils';
import api from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { ContentCategory, LinkedReelSummary, MusicTrackSummary } from '@/types';
import { CalendarPlus } from 'lucide-react';
import { useVoiceContext } from '@/contexts/voice-context';
import { downloadImage, downloadCarouselImages } from '@/lib/download';
import { BlogPostSection } from '@/components/blog-post-section';

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
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);
  const [resizedCarousel, setResizedCarousel] = useState<{
    aspectRatio: '1:1' | '9:16';
    slides: Array<{ slideNumber: number; publicUrl: string; text: string; template: string }>;
  } | null>(null);
  const squareFetchedRef = useRef(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [quickScheduleConfig, setQuickScheduleConfig] = useState<{
    type: 'platform' | 'clips' | 'carousel';
    platform?: string;
  } | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);

  // Carousel reel state
  const [linkedReel, setLinkedReel] = useState<LinkedReelSummary | null>(null);
  const [isGeneratingCarouselReel, setIsGeneratingCarouselReel] = useState(false);
  const [carouselReelError, setCarouselReelError] = useState<string | null>(null);

  // Reel options state (Phase 1: music + smart timing)
  const [reelOptionsOpen, setReelOptionsOpen] = useState(false);
  const [smartTimingEnabled, setSmartTimingEnabled] = useState(true);
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string | null>(null);
  const [trendingAudioSuggestion, setTrendingAudioSuggestion] = useState<string | null>(null);

  // Music tracks for reel options
  const [musicTracks, setMusicTracks] = useState<MusicTrackSummary[]>([]);
  const [musicTracksLoaded, setMusicTracksLoaded] = useState(false);

  // B-Roll extraction state (Phase 3)
  const [isExtractingBRoll, setIsExtractingBRoll] = useState(false);
  const [brollSpeedUp, setBrollSpeedUp] = useState<1 | 1.5 | 2>(1);

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

  const {
    progress,
    isComplete: progressComplete,
    hasError: progressError,
    carouselReady,
    carouselFailed,
  } = useGenerationProgress(shouldConnectSSE ? id : null);

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

  // Auto-refresh when SSE signals carousel is ready (no more polling needed!)
  useEffect(() => {
    if (carouselReady) {
      // Refresh to get the carousel data
      refresh();
    }
  }, [carouselReady, refresh]);

  // Auto-fetch square (1:1) carousel when portrait carousel is available
  // The backend generates both sizes concurrently, so the square version
  // should be ready by the time the page loads (or shortly after)
  const contentKitId = detail?.contentKit?.id;
  useEffect(() => {
    if (hasCarouselCheck && contentKitId && !resizedCarousel && !resizing && !squareFetchedRef.current) {
      squareFetchedRef.current = true;
      handleResizeCarousel('1:1');
    }
  }, [hasCarouselCheck, contentKitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch music tracks when reel options panel is opened
  useEffect(() => {
    if (reelOptionsOpen && !musicTracksLoaded) {
      setMusicTracksLoaded(true);
      api.reels.listMusic({ limit: 20 }).then((res) => {
        if (res.success && res.data) {
          setMusicTracks(res.data);
        }
      }).catch(() => { /* silent */ });
    }
  }, [reelOptionsOpen, musicTracksLoaded]);

  // Fetch linked reel data when content kit loads
  useEffect(() => {
    if (contentKitId && (detail as any)?.reel) {
      setLinkedReel((detail as any).reel);
    }
  }, [contentKitId, detail]);

  // Handler to generate carousel reel
  const handleGenerateCarouselReel = async () => {
    if (!contentKitId || isGeneratingCarouselReel) return;
    setIsGeneratingCarouselReel(true);
    setCarouselReelError(null);
    setTrendingAudioSuggestion(null);
    try {
      const response = await api.contentKits.generateCarouselReel(contentKitId, {
        musicTrackId: selectedMusicTrackId || undefined,
        smartTiming: smartTimingEnabled,
      });
      if (response.success) {
        if (response.data?.trendingAudioName) {
          setTrendingAudioSuggestion(response.data.trendingAudioName);
        }
        refresh();
      }
    } catch (err: any) {
      console.error('Failed to start carousel reel:', err);
      setCarouselReelError(err?.response?.data?.error?.message || 'Failed to start reel generation');
      setIsGeneratingCarouselReel(false);
    }
  };

  // Handler to extract B-roll from uploaded video (Phase 3)
  const handleExtractBRoll = async () => {
    const uploadId = detail?.contentKit?.videoUploadId;
    if (!uploadId || isExtractingBRoll) return;
    setIsExtractingBRoll(true);
    try {
      await api.clips.extractBRoll(uploadId, {
        maxClips: 5,
        speedUp: brollSpeedUp,
        useVisionScoring: false,
      });
      // Refresh to get the extracted clips
      refresh();
    } catch (err: any) {
      console.error('Failed to extract B-roll:', err);
    } finally {
      setIsExtractingBRoll(false);
    }
  };

  // Poll for carousel reel completion when processing
  useEffect(() => {
    if (!linkedReel || linkedReel.status !== 'processing') {
      setIsGeneratingCarouselReel(false);
      return;
    }
    setIsGeneratingCarouselReel(true);
    const interval = setInterval(() => {
      refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [linkedReel?.status, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async (content: string, contentId: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Fallback for older browsers or restricted contexts
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(contentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const handleResizeCarousel = async (targetAspectRatio: '1:1' | '9:16') => {
    if (resizing) return;
    const kitId = detail?.contentKit?.id;
    if (!kitId) return;
    setResizing(true);
    try {
      const response = await api.contentKits.resizeCarousel(kitId, targetAspectRatio);
      if (response.success && response.data?.carousel) {
        // Map API response to use 'template' (supports both old slideType and new template)
        const mappedSlides = response.data.carousel.slides.map((slide: any) => ({
          slideNumber: slide.slideNumber,
          publicUrl: slide.publicUrl,
          text: slide.text,
          template: slide.template || slide.slideType || 'content',
        }));
        setResizedCarousel({
          aspectRatio: response.data.carousel.aspectRatio,
          slides: mappedSlides,
        });
      }
    } catch (err) {
      console.error('Failed to resize carousel:', err);
    } finally {
      setResizing(false);
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
  const blogContent = platformContent.find(p => p.platform === 'blog');
  const nonBlogContent = platformContent.filter(p => p.platform !== 'blog');
  const hasClips = detail?.clips && detail.clips.length > 0;
  const hasWrittenContent = platformContent.length > 0;
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
        href="/app/content-kit"
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
            href="/app/team-voices"
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
                  <button
                    onClick={() => setScheduleModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <span>📅</span>
                    <span>Schedule</span>
                  </button>
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

          {/* Video Clips Section */}
          {hasClips && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-display text-2xl flex items-center gap-3">
                  <span>🎬</span>
                  <span>Video Clips</span>
                  <span className="text-text-secondary text-lg font-normal">
                    ({detail.clips.length} ready to share)
                  </span>
                </h2>
              </div>

              {/* Featured Clip Player */}
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
                  {detail.clips[activeClipIndex] && (
                    <>
                      <VideoPlayer
                        src={detail.clips[activeClipIndex].exports?.[0]?.url || ''}
                        poster={detail.clips[activeClipIndex].thumbnailUrl}
                        aspectRatio="9:16"
                        viralityScore={detail.clips[activeClipIndex].viralityScore}
                        duration={detail.clips[activeClipIndex].duration}
                        title={detail.clips[activeClipIndex].title}
                        className="max-h-[500px]"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {detail.clips[activeClipIndex].title || `Clip ${activeClipIndex + 1}`}
                        </h3>
                        {detail.clips[activeClipIndex].selectionReason && (
                          <p className="text-text-secondary text-sm mb-3">
                            {detail.clips[activeClipIndex].selectionReason}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                            {detail.clips[activeClipIndex].format === 'portrait' ? '📱 Vertical' :
                             detail.clips[activeClipIndex].format === 'landscape' ? '🖥️ Horizontal' : '⬜ Square'}
                          </span>
                          {detail.clips[activeClipIndex].hasCaptions && (
                            <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
                              CC ✓
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            {detail.clips[activeClipIndex].exports?.[0]?.url && (
                              <a
                                href={detail.clips[activeClipIndex].exports[0].url}
                                download
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
                              >
                                ⬇️ Download
                              </a>
                            )}
                            <button
                              onClick={() => setQuickScheduleConfig({ type: 'clips' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              Schedule
                            </button>
                          </div>
                        </div>

                        {/* Suggested Caption */}
                        {detail.clips[activeClipIndex].suggestedCaption && (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-text-secondary">📝 Suggested Caption</span>
                              <button
                                onClick={() => handleCopy(
                                  detail.clips[activeClipIndex].suggestedCaption || '',
                                  `clip-caption-${detail.clips[activeClipIndex].id}`
                                )}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  copiedId === `clip-caption-${detail.clips[activeClipIndex].id}`
                                    ? 'bg-success/10 text-success'
                                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                {copiedId === `clip-caption-${detail.clips[activeClipIndex].id}` ? '✓ Copied!' : '📋 Copy'}
                              </button>
                            </div>
                            <p className="text-sm text-text-secondary whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3 leading-relaxed">
                              {detail.clips[activeClipIndex].suggestedCaption}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Clip Thumbnails */}
                {detail.clips.length > 1 && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary font-medium">Select a clip</p>
                    <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                      {detail.clips.map((clip, index) => (
                        <button
                          key={clip.id}
                          onClick={() => setActiveClipIndex(index)}
                          className={`
                            relative rounded-lg overflow-hidden border-2 transition-all
                            ${index === activeClipIndex
                              ? 'border-accent ring-2 ring-accent/20'
                              : 'border-border hover:border-accent/50'}
                          `}
                        >
                          <div className="aspect-video bg-bg-tertiary">
                            {clip.thumbnailUrl ? (
                              <img
                                src={clip.thumbnailUrl}
                                alt={clip.title || `Clip ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">
                                🎬
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            {formatDuration(clip.duration)}
                          </div>
                          {clip.viralityScore && (
                            <div className="absolute top-1 left-1 bg-gradient-to-r from-accent to-accent/80 text-white text-xs px-1.5 py-0.5 rounded-full">
                              🔥 {clip.viralityScore}%
                            </div>
                          )}
                          {index === activeClipIndex && (
                            <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                              <span className="text-2xl">▶️</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Written Content Section (excludes blog — blog gets its own section below) */}
          {nonBlogContent.length > 0 && (
            <section id="written-content-section">
              <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
                <span>✍️</span>
                <span>Written Content</span>
                <span className="text-text-secondary text-lg font-normal">
                  (ready to post)
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nonBlogContent.map(({ platform, content }) => {
                  const config = PLATFORM_CONFIG[platform];
                  if (!config || !content) return null;
                  const isExpanded = expandedPlatform === platform;
                  const contentId = `${platform}-${item.id}`;

                  return (
                    <div
                      key={platform}
                      className="bg-bg-secondary rounded-xl border border-border overflow-hidden hover:border-accent/50 transition-colors group"
                    >
                      {/* Platform Header */}
                      <div className={`px-4 py-3 ${config.color} border-b border-border/50`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{config.icon}</span>
                            <h4 className="font-semibold">{config.label}</h4>
                          </div>
                          <ShareDropdown content={content} platform={platform} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <p className={`text-small text-text-secondary whitespace-pre-wrap leading-relaxed ${isExpanded ? '' : 'line-clamp-6'}`}>
                          {content}
                        </p>
                        {content.length > 250 && (
                          <button
                            onClick={() => setExpandedPlatform(isExpanded ? null : platform)}
                            className="text-xs text-accent mt-2 hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'Show more...'}
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="px-4 pb-4 pt-2 border-t border-border/50 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(content, contentId)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              copiedId === contentId
                                ? 'bg-success/10 text-success'
                                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
                            }`}
                          >
                            {copiedId === contentId ? '✓ Copied!' : '📋 Copy'}
                          </button>
                          <QuickShareButton
                            content={content}
                            platformKey={platform}
                            className="flex-1 justify-center"
                          />
                        </div>
                        <button
                          onClick={() => setQuickScheduleConfig({ type: 'platform', platform })}
                          className="w-full py-2 px-3 rounded-lg text-sm font-medium bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Add to Calendar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Blog Post Section — full-width with header image and formatted markdown */}
          {blogContent && (
            <BlogPostSection
              content={blogContent.content}
              contentKitId={item.id}
              sourceContent={item.title}
              onSchedule={() => setQuickScheduleConfig({ type: 'platform', platform: 'blog' })}
            />
          )}

          {/* Instagram Carousel Loading State - show when carousel is expected but not ready */}
          {carouselExpected && (
            <section id="carousel-section">
              <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
                <span>📸</span>
                <span>Instagram Carousel</span>
                <span className="text-text-secondary text-lg font-normal">
                  (generating in background...)
                </span>
              </h2>
              <div className="bg-gradient-to-br from-accent/5 to-purple-500/5 rounded-xl border border-accent/20 p-8">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-5" />
                  <p className="text-text-primary font-semibold text-lg mb-2">Creating your carousel slides...</p>
                  <p className="text-text-secondary text-sm text-center max-w-lg mb-6">
                    Carousel images take a bit longer to render. Your written content is ready to use now!
                  </p>
                  {hasWrittenContent && (
                    <button
                      onClick={() => {
                        const section = document.getElementById('written-content-section');
                        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
                    >
                      <span>↑</span>
                      <span>View Written Content</span>
                      <span>✍️</span>
                    </button>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-center gap-2 text-xs text-text-secondary">
                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                    <span>This page will update automatically when carousel is ready</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Instagram Carousel Section */}
          {hasCarousel && (
            <section>
              <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
                <span>📸</span>
                <span>Instagram Carousel</span>
                <span className="text-text-secondary text-lg font-normal">
                  ({detail.carousel.slides.length} slides)
                </span>
              </h2>

              {/* Square (1:1) Carousel - Primary display */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-accent/10 text-accent px-3 py-1 rounded-full">
                      ⬜ Square (1:1)
                    </span>
                    <span className="text-xs text-text-secondary">Feed post format</span>
                  </div>
                </div>

                {resizedCarousel ? (
                  <>
                    {/* Carousel Preview - Square */}
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
                      {resizedCarousel.slides.map((slide, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 w-72 snap-center"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-bg-tertiary border border-border/50 relative group">
                            <img
                              src={slide.publicUrl}
                              alt={`Square Slide ${slide.slideNumber}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Slide template badge */}
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full capitalize">
                              {slide.template}
                            </div>
                            {/* Slide number */}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                              {slide.slideNumber}/{resizedCarousel.slides.length}
                            </div>
                            {/* Download hover button */}
                            <button
                              onClick={() => downloadImage(slide.publicUrl, `square-slide-${slide.slideNumber}.png`)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
                                ⬇️ Download
                              </span>
                            </button>
                          </div>
                          {/* Slide text preview */}
                          <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                            {slide.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Carousel Footer - Square */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <div className="text-sm text-text-secondary">
                        <span className="font-medium text-text-primary">
                          {resizedCarousel.slides.length} slides
                        </span>
                        <span> • Square format</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQuickScheduleConfig({ type: 'carousel' })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                        >
                          <CalendarPlus className="w-4 h-4" />
                          Add to Calendar
                        </button>
                        <button
                          onClick={async () => {
                            await downloadCarouselImages(
                              resizedCarousel.slides.map(s => ({ publicUrl: s.publicUrl, slideNumber: s.slideNumber })),
                              `${id}-square`
                            );
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
                        >
                          ⬇️ Download All
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12 text-text-secondary">
                    <span className="animate-spin mr-2">⏳</span>
                    <span className="text-sm">Loading square slides...</span>
                  </div>
                )}
              </div>

              {/* Portrait (9:16) Carousel */}
              <div className="bg-bg-secondary rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full">
                      📱 Portrait (9:16)
                    </span>
                    <span className="text-xs text-text-secondary">Stories/Reels format</span>
                  </div>
                </div>

                {/* Carousel Preview - Portrait */}
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
                  {detail.carousel.slides.map((slide: any, index: number) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-48 snap-center"
                    >
                      <div className="aspect-[9/16] rounded-lg overflow-hidden bg-bg-tertiary border border-border/50 relative group">
                        <img
                          src={slide.publicUrl}
                          alt={`Slide ${slide.slideNumber}: ${slide.text?.slice(0, 30)}...`}
                          className="w-full h-full object-cover"
                        />
                        {/* Slide template badge */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full capitalize">
                          {slide.template || slide.slideType}
                        </div>
                        {/* Slide number */}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                          {slide.slideNumber}/{detail.carousel.slides.length}
                        </div>
                        {/* Download hover button */}
                        <button
                          onClick={() => downloadImage(slide.publicUrl, `portrait-slide-${slide.slideNumber}.png`)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
                            ⬇️ Download
                          </span>
                        </button>
                      </div>
                      {/* Slide text preview */}
                      <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                        {slide.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Carousel Footer - Portrait */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {detail.carousel.slides.length} slides
                    </span>
                    {(detail.carousel.designPreset || detail.carousel.backgroundType) && (
                      <span> • {detail.carousel.designPreset || detail.carousel.backgroundType} style</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setQuickScheduleConfig({ type: 'carousel' })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Add to Calendar
                    </button>
                    <button
                      onClick={async () => {
                        await downloadCarouselImages(
                          detail.carousel.slides.map((s: any) => ({ publicUrl: s.publicUrl, slideNumber: s.slideNumber })),
                          `${id}-portrait`
                        );
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
                    >
                      ⬇️ Download All
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Carousel Reel Section */}
          <section id="reel-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>Video Reel</span>
              </h2>
            </div>

            {/* No carousel → show prompt */}
            {!hasCarousel && (
              <div className="p-8 text-center bg-bg-secondary rounded-xl border border-border">
                <div className="text-4xl mb-3">🎬</div>
                <h3 className="text-lg font-semibold mb-1">Generate a carousel first</h3>
                <p className="text-sm text-text-secondary">A carousel is needed to create an animated reel.</p>
              </div>
            )}

            {/* Has carousel, no reel yet → generate with options */}
            {hasCarousel && (!linkedReel || linkedReel.status === 'failed') && !isGeneratingCarouselReel && (
              <div className="p-6 bg-bg-secondary rounded-xl border border-border">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">🎬</div>
                  <h3 className="text-lg font-semibold mb-2">Generate Reel from Carousel</h3>
                  <p className="text-sm text-text-secondary">
                    Turn your {detail?.carousel?.slides?.length || 0} carousel slides into a beat-synced animated reel.
                  </p>
                </div>

                {/* Reel Options Panel (admin only) */}
                {isAdmin && <div className="mb-4">
                  <button
                    onClick={() => setReelOptionsOpen(!reelOptionsOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <span className={`transition-transform ${reelOptionsOpen ? 'rotate-90' : ''}`}>&#9654;</span>
                    Reel Options
                  </button>

                  {reelOptionsOpen && (
                    <div className="mt-3 bg-surface-secondary rounded-xl p-4 border border-border space-y-4">
                      {/* Smart Timing Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-primary">Smart Timing</p>
                          <p className="text-xs text-text-secondary">Adjusts slide duration based on text length</p>
                        </div>
                        <button
                          onClick={() => setSmartTimingEnabled(!smartTimingEnabled)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${smartTimingEnabled ? 'bg-accent' : 'bg-border'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${smartTimingEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {/* Music Track Selection */}
                      <div>
                        <p className="text-sm font-medium text-text-primary mb-2">Music Track</p>
                        <select
                          value={selectedMusicTrackId || ''}
                          onChange={(e) => setSelectedMusicTrackId(e.target.value || null)}
                          className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-accent focus:border-accent"
                        >
                          <option value="">No music</option>
                          {musicTracks.map((track) => (
                            <option key={track.id} value={track.id}>
                              {track.name}{track.artist ? ` — ${track.artist}` : ''}{track.tempo ? ` (${track.tempo} BPM)` : ''}
                            </option>
                          ))}
                        </select>
                        {musicTracks.length === 0 && (
                          <p className="text-xs text-text-secondary mt-1">No music tracks available yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>}

                {carouselReelError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {carouselReelError}
                  </div>
                )}

                <button
                  onClick={handleGenerateCarouselReel}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                >
                  Generate Reel from Carousel
                </button>
              </div>
            )}

            {/* Processing state */}
            {isGeneratingCarouselReel && linkedReel?.status === 'processing' && (
              <div className="p-8 bg-bg-secondary rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="font-medium text-text-primary">Generating your reel...</p>
                    <p className="text-sm text-text-secondary">Animating slides with motion effects. This takes about 20-30 seconds.</p>
                  </div>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {/* Completed state → video player + download */}
            {linkedReel?.status === 'completed' && linkedReel.outputUrl && (
              <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
                <div className="aspect-[9/16] max-h-[500px] bg-black flex items-center justify-center">
                  <video
                    src={linkedReel.outputUrl}
                    controls
                    playsInline
                    className="max-h-full max-w-full"
                    poster={linkedReel.thumbnailUrl || undefined}
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="text-sm text-text-secondary">
                    {linkedReel.outputDurationMs && (
                      <span>{(linkedReel.outputDurationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={linkedReel.outputUrl}
                      download="carousel-reel.mp4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                    >
                      Download MP4
                    </a>
                    <button
                      onClick={handleGenerateCarouselReel}
                      className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:text-text-primary transition-colors text-sm"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trending Audio Suggestion */}
            {trendingAudioSuggestion && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🎵</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary mb-1">Trending Audio Suggestion</p>
                    <p className="text-sm text-text-secondary mb-2">&ldquo;{trendingAudioSuggestion}&rdquo;</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(trendingAudioSuggestion);
                      }}
                      className="text-xs px-3 py-1 bg-accent/10 text-accent rounded-full hover:bg-accent/20 transition-colors"
                    >
                      Copy Name
                    </button>
                    <p className="text-xs text-text-tertiary mt-2">Add this audio when posting to Instagram/TikTok for max reach.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* B-Roll Extraction Section (Phase 3) — admin only */}
          {isAdmin && detail?.contentKit?.videoUploadId && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">B-Roll Clips</h2>
                  <p className="text-sm text-text-secondary">Extract silent, visual-only moments from your video</p>
                </div>
              </div>

              <div className="bg-bg-secondary rounded-xl border border-border p-6">
                {/* Speed selector */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium text-text-primary">Speed</span>
                  <div className="flex gap-2">
                    {([1, 1.5, 2] as const).map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setBrollSpeedUp(speed)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          brollSpeedUp === speed
                            ? 'bg-accent text-white'
                            : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExtractBRoll}
                  disabled={isExtractingBRoll}
                  className="px-6 py-2.5 bg-bg-tertiary text-text-primary border border-border rounded-lg hover:bg-surface-secondary transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isExtractingBRoll ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Extracting B-Roll...
                    </span>
                  ) : (
                    'Extract B-Roll'
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Empty State */}
          {!hasClips && !hasWrittenContent && !hasCarousel && !isProcessing && (
            <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold mb-2">No content available</h3>
              <p className="text-text-secondary mb-6">
                This content kit doesn&apos;t have any content yet.
              </p>
              <Link href="/app" className="btn-primary">
                Create New Content
              </Link>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Link
              href="/app/content-kit"
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
    </div>
  );
}
