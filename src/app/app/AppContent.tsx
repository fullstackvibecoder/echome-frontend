'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGeneration } from '@/hooks/useGeneration';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { useGenerationProgress, mapStepToIndex } from '@/hooks/useGenerationProgress';
import { usePendingCheckout } from '@/hooks/usePendingCheckout';
import { FirstGeneration } from '@/components/first-generation';
import { ContentCards } from '@/components/content-cards';
import { CarouselPreview } from '@/components/carousel-preview';
import { setActiveGeneration, clearActiveGeneration } from '@/components/generation-banner';
import { requestNotificationPermission, showNotificationIfHidden } from '@/lib/notifications';
import { InputType, Platform, BackgroundConfig, CarouselSlide, DesignPreset } from '@/types';
import { WelcomeBanner } from '@/components/welcome-banner';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { useAuth } from '@/hooks/useAuth';
import { api, VideoUpload, VideoClip, ContentKit } from '@/lib/api-client';

// Text generation stages with icons, titles, and rotating tips (matching video processing style)
const TEXT_GENERATION_STAGES: Record<string, {
  icon: string;
  title: string;
  tips: string[];
}> = {
  init: {
    icon: '🚀',
    title: 'Starting up',
    tips: [
      'Warming up the content engines...',
      'Getting everything ready for you!',
      'Preparing to create something amazing...',
    ],
  },
  context: {
    icon: '📚',
    title: 'Reading your Echosystem',
    tips: [
      'Pulling context from your knowledge base...',
      'Understanding your unique perspective...',
      'Drawing from your authentic voice patterns...',
      'Your Echosystem DNA is being analyzed...',
    ],
  },
  voice: {
    icon: '🎤',
    title: 'Tuning into your voice',
    tips: [
      'Matching your exact writing style...',
      'Your content sounds better because it\'s actually YOU',
      'Agentic + Your Voice = Content that converts',
      'Capturing your unique tone and rhythm...',
    ],
  },
  generate: {
    icon: '✨',
    title: 'Crafting your content',
    tips: [
      'Making each platform sing YOUR tune...',
      'Creating platform-perfect content...',
      'Quality over quantity - every Echo matters',
      'Tailoring content for maximum engagement...',
    ],
  },
  validate: {
    icon: '✅',
    title: 'Polishing your Echo',
    tips: [
      'Running quality checks...',
      'Ensuring everything sounds like you...',
      'Final polish in progress...',
      'Almost there! Perfecting the details...',
    ],
  },
  carousel: {
    icon: '🎨',
    title: 'Creating carousel images',
    tips: [
      'Designing beautiful slides...',
      'Making your content visual...',
      'Crafting scroll-stopping graphics...',
    ],
  },
  complete: {
    icon: '🎉',
    title: 'All done!',
    tips: [
      'Your content is ready!',
    ],
  },
};

// Stage order for progress indicator dots
const TEXT_GENERATION_STAGE_ORDER = ['init', 'context', 'voice', 'generate', 'validate', 'complete'];

// Dynamic welcome message generator
function getWelcomeMessage(userName?: string, generationsUsed?: number): { headline: string; subheadline: string } {
  const hour = new Date().getHours();
  const name = userName || 'there';
  const firstName = name.split(' ')[0];

  // Time-based greetings
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Activity-based variations
  if (generationsUsed && generationsUsed >= 10) {
    return {
      headline: `${firstName}, you're on fire 🔥`,
      subheadline: `${generationsUsed} pieces created this month and counting. Let's keep the momentum going.`
    };
  }

  if (generationsUsed && generationsUsed >= 5) {
    return {
      headline: `Welcome back, ${firstName}!`,
      subheadline: `You've created ${generationsUsed} pieces this month. Ready to add more?`
    };
  }

  // Time-based defaults
  if (hour < 12) {
    return {
      headline: `${timeGreeting}, ${firstName}!`,
      subheadline: 'Ready to turn some footage into content?'
    };
  }

  if (hour >= 20) {
    return {
      headline: `Working late, ${firstName}?`,
      subheadline: `Let's make it count. Upload and we'll handle the rest.`
    };
  }

  return {
    headline: `Welcome back, ${firstName}!`,
    subheadline: `What would you like to create today?`
  };
}

export default function AppContent() {
  const router = useRouter();
  const { generating, requestId, results, error, voiceScore, qualityScore, generate, repurpose, reset } = useGeneration();
  const { sendFeedback, copyToClipboard } = useResultsFeedback();
  const { isFirstTime, dismissWelcome } = useFirstTimeUser();
  const { user } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  // Usage stats for dynamic messaging
  const [usageStats, setUsageStats] = useState<{ generationsUsed?: number } | null>(null);

  // Check for pending checkout from signup flow
  const { checking: checkingPendingPlan, checkoutLoading } = usePendingCheckout();

  // Load usage stats for dynamic welcome message
  useEffect(() => {
    const loadUsageStats = async () => {
      try {
        const response = await api.stripe.getUsageLimits();
        if (response.success && response.data) {
          setUsageStats({ generationsUsed: response.data.generationsUsed || 0 });
        }
      } catch (err) {
        // Silently fail - not critical for UX
        console.error('Failed to load usage stats:', err);
      }
    };
    loadUsageStats();
  }, []);

  // Real-time progress from SSE (including carousel status)
  const { progress, isComplete: progressComplete, hasError: progressError, carouselReady, carouselFailed } = useGenerationProgress(requestId);

  // Derive progress step and current stage from real SSE events
  const progressStep = progress ? mapStepToIndex(progress.step) : 0;
  const currentStage = progress?.step || 'init';
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Carousel state - now handled by backend background job
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[] | null>(null);
  const [carouselLoading, setCarouselLoading] = useState(false);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [expectingCarousel, setExpectingCarousel] = useState(false);

  // Video processing results (Clip Finder)
  const [videoUpload, setVideoUpload] = useState<VideoUpload | null>(null);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [contentKit, setContentKit] = useState<ContentKit | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Set active generation for navigate-away banner
  useEffect(() => {
    if (requestId && generating) {
      setActiveGeneration(requestId);
    }
  }, [requestId, generating]);

  // Clear active generation when complete or error
  useEffect(() => {
    if (progressComplete || progressError) {
      clearActiveGeneration();
    }
  }, [progressComplete, progressError]);

  // Show notification when complete (if tab hidden)
  useEffect(() => {
    if (progressComplete) {
      showNotificationIfHidden('Content Ready!', 'Your content has been generated and is ready to view.');
    }
  }, [progressComplete]);

  // Request notification permission on first generation
  useEffect(() => {
    if (generating) {
      requestNotificationPermission();
    }
  }, [generating]);

  // Rotate tips every 4 seconds during generation (based on current stage)
  useEffect(() => {
    if (!generating) {
      setCurrentTipIndex(0);
      return;
    }

    const stageTips = TEXT_GENERATION_STAGES[currentStage]?.tips || [];
    if (stageTips.length <= 1) return;

    const tipTimer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % stageTips.length);
    }, 4000);

    return () => clearInterval(tipTimer);
  }, [generating, currentStage]);

  // Reset tip index when stage changes
  useEffect(() => {
    setCurrentTipIndex(0);
  }, [currentStage]);

  // Handle carousel loading when Instagram platform is selected
  // Backend generates carousel in background and notifies via SSE
  useEffect(() => {
    if (expectingCarousel && !carouselSlides && !carouselReady && !carouselFailed) {
      setCarouselLoading(true);
    }
  }, [expectingCarousel, carouselSlides, carouselReady, carouselFailed]);

  // Fetch carousel from backend when SSE notifies it's ready
  useEffect(() => {
    const fetchCarousel = async () => {
      if (!carouselReady || !requestId) return;

      try {
        const response = await api.generation.getRequest(requestId);
        if (response.success && response.data?.carousel?.slides) {
          // Map GeneratedCarouselSlide to CarouselSlide
          const slides: CarouselSlide[] = response.data.carousel.slides.map((s) => ({
            slideNumber: s.slideNumber,
            publicUrl: s.publicUrl,
            storagePath: s.publicUrl, // Use publicUrl as storagePath fallback
            template: s.template,
          }));
          setCarouselSlides(slides);
        }
      } catch (err) {
        console.error('Failed to fetch carousel:', err);
        setCarouselError('Failed to load carousel images');
      } finally {
        setCarouselLoading(false);
      }
    };

    fetchCarousel();
  }, [carouselReady, requestId]);

  // Handle carousel generation failure
  useEffect(() => {
    if (carouselFailed) {
      setCarouselLoading(false);
      setCarouselError('Carousel generation failed. Try regenerating.');
    }
  }, [carouselFailed]);

  // Auto-dismiss welcome banner on first generation
  // (Must be before the early return to maintain consistent hook count)
  const hasResults = !!(results || contentKit || videoClips.length > 0);
  useEffect(() => {
    if (isFirstTime && hasResults) dismissWelcome();
  }, [isFirstTime, hasResults, dismissWelcome]);

  // Show loading state while checking/redirecting for pending checkout
  // (Must be AFTER all hooks to follow rules of hooks)
  if (checkingPendingPlan || checkoutLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary">
          {checkoutLoading ? 'Redirecting to checkout...' : 'Loading...'}
        </p>
      </div>
    );
  }

  const handleGenerate = async (
    input: string,
    inputType: InputType,
    platforms: Platform[],
    carouselBackground?: BackgroundConfig,
    carouselBackgroundFile?: File,
    designPreset?: DesignPreset
  ) => {
    // Track if we should expect a carousel from the backend
    const hasInstagram = platforms.includes('instagram');
    setExpectingCarousel(hasInstagram);
    setCarouselSlides(null);
    setCarouselError(null);
    setCarouselLoading(hasInstagram);

    // If user selected image upload, upload the file first to get a URL
    let finalCarouselBackground = carouselBackground;
    if (carouselBackground?.type === 'image' && carouselBackgroundFile) {
      try {
        const uploadResponse = await api.images.uploadBackground(carouselBackgroundFile);
        if (uploadResponse.success && uploadResponse.data?.background?.publicUrl) {
          finalCarouselBackground = {
            type: 'image',
            imageUrl: uploadResponse.data.background.publicUrl,
          };
        } else {
          console.error('Failed to upload carousel background image');
        }
      } catch (uploadErr) {
        console.error('Error uploading carousel background:', uploadErr);
      }
    }

    // Pass carousel design options to the generate function
    const reqId = await generate(input, inputType, platforms, {
      designPreset,
      carouselBackground: finalCarouselBackground,
    });

    // Redirect to content kit detail page for proper progress UI
    // This matches the behavior of handleRepurpose and handleVideoProcessing
    if (reqId) {
      clearActiveGeneration();
      router.push(`/app/content-kit/${reqId}`);
    }
  };

  const handleRepurpose = async (
    contentId: string,
    platforms: Platform[],
    options?: { designPreset?: DesignPreset; carouselBackground?: BackgroundConfig }
  ) => {
    const hasInstagram = platforms.includes('instagram');
    setExpectingCarousel(hasInstagram);
    setCarouselSlides(null);
    setCarouselError(null);
    setCarouselLoading(hasInstagram);
    // Pass options through to repurpose
    const reqId = await repurpose(contentId, platforms, options);
    // Redirect immediately to detail page - prevents flash of dashboard progress UI
    if (reqId) {
      // Clear the banner since detail page has its own progress UI
      clearActiveGeneration();
      router.push(`/app/content-kit/${reqId}`);
    }
  };

  // Handle video processing results from Clip Finder
  const handleVideoProcessing = (data: {
    upload: VideoUpload;
    clips: VideoClip[];
    contentKit: ContentKit | null;
  }) => {
    // If we have a generation request ID, redirect to Content Kit detail
    if (data.contentKit?.generationRequestId) {
      router.push(`/app/content-kit/${data.contentKit.generationRequestId}`);
      return;
    }

    // Fallback: show results inline (for cases without generated content)
    setVideoUpload(data.upload);
    setVideoClips(data.clips);
    setContentKit(data.contentKit);
  };

  const handleCopy = async (content: string) => {
    await copyToClipboard(content);
  };

  // Copy content kit platform content
  const handleCopyContentKit = async (platform: string, content: string) => {
    await copyToClipboard(content);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const handleFeedback = (contentId: string, liked: boolean) => {
    sendFeedback(contentId, liked);
  };

  const handleReset = () => {
    reset();
    setCarouselSlides(null);
    setCarouselError(null);
    setCarouselLoading(false);
    setExpectingCarousel(false);
    // Reset video processing state
    setVideoUpload(null);
    setVideoClips([]);
    setContentKit(null);
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {!hasResults && !generating && (
        <div className="animate-fade-in">
          {/* Welcome Header */}
          {isFirstTime ? (
            <WelcomeBanner
              userName={undefined}
              onDismiss={dismissWelcome}
              onScrollToForm={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />
          ) : (
            (() => {
              const { headline, subheadline } = getWelcomeMessage(user?.name, usageStats?.generationsUsed);
              return (
                <div className="mb-8">
                  <h1 className="text-display text-4xl mb-2">{headline}</h1>
                  <p className="text-body text-text-secondary">
                    {subheadline}
                  </p>
                </div>
              );
            })()
          )}

          {/* Input Form */}
          <div ref={formRef}>
            <FirstGeneration
              onGenerate={handleGenerate}
              onRepurpose={handleRepurpose}
              onVideoProcessing={handleVideoProcessing}
              generating={false}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {generating && (
        <div className="max-w-2xl mx-auto text-center animate-fade-in py-12">
          {/* Stage Icon & Title */}
          <div className="text-5xl mb-3 animate-bounce">
            {TEXT_GENERATION_STAGES[currentStage]?.icon || '⏳'}
          </div>
          <p className="text-body font-semibold mb-1">
            {TEXT_GENERATION_STAGES[currentStage]?.title || 'Processing...'}
          </p>

          {/* Rotating Tip */}
          <p className="text-small text-text-secondary mb-6 min-h-[40px] transition-opacity duration-500">
            {TEXT_GENERATION_STAGES[currentStage]?.tips[currentTipIndex] || 'Working on it...'}
          </p>

          {/* Progress Bar - Gradient with pulse */}
          <div className="w-full max-w-sm mx-auto mb-3">
            <div className="bg-bg-secondary rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-accent to-accent/70 h-2.5 rounded-full transition-all duration-500 relative"
                style={{ width: `${progress?.percent || 5}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Progress Percentage */}
          <p className="text-small text-text-secondary font-medium mb-4">
            {progress?.percent || 5}% complete
          </p>

          {/* Stage indicator dots */}
          <div className="flex justify-center gap-2 mt-4">
            {TEXT_GENERATION_STAGE_ORDER.map((stage, idx) => {
              const currentIdx = TEXT_GENERATION_STAGE_ORDER.indexOf(currentStage);
              const isComplete = idx < currentIdx;
              const isCurrent = stage === currentStage || (currentStage === 'carousel' && stage === 'validate');
              return (
                <div
                  key={stage}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-accent' :
                    isCurrent ? 'bg-accent animate-pulse scale-125' :
                    'bg-bg-secondary'
                  }`}
                  title={TEXT_GENERATION_STAGES[stage]?.title}
                />
              );
            })}
          </div>
        </div>
      )}

      {hasResults && !generating && (
        <div className="animate-fade-in">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">{videoClips.length > 0 ? '🎬' : '✨'}</div>
            <h2 className="text-display text-4xl mb-2">
              {videoClips.length > 0 ? 'Your Content Kit is Ready!' : 'Your Content is Ready!'}
            </h2>
            <p className="text-body text-text-secondary mb-6">
              {videoClips.length > 0
                ? `${videoClips.length} clips extracted • Content generated for 6 platforms`
                : results ? `Generated content for ${results.length} platforms` : ''}
            </p>

            {/* Scores */}
            {(voiceScore || qualityScore) && (
              <div className="flex items-center justify-center gap-6">
                {voiceScore && (
                  <div className="bg-bg-secondary rounded-lg px-6 py-3 border border-border">
                    <p className="text-small text-text-secondary mb-1">
                      Voice Match
                    </p>
                    <p className="text-subheading text-2xl font-semibold text-accent">
                      {voiceScore}%
                    </p>
                  </div>
                )}
                {qualityScore && (
                  <div className="bg-bg-secondary rounded-lg px-6 py-3 border border-border">
                    <p className="text-small text-text-secondary mb-1">
                      Quality Score
                    </p>
                    <p className="text-subheading text-2xl font-semibold text-success">
                      {qualityScore}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Clips Section - Show if we have clips */}
          {videoClips.length > 0 && (
            <div className="mb-12">
              <h3 className="text-display text-2xl mb-6">
                🎬 Video Clips <span className="text-text-secondary text-lg font-normal">({videoClips.length} ready to share)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videoClips.map((clip, index) => (
                  <div
                    key={clip.id}
                    className="bg-bg-secondary rounded-xl border border-border overflow-hidden hover:border-accent/50 transition-colors"
                  >
                    {/* Clip Video Player */}
                    <div className="aspect-[9/16] bg-black relative">
                      {clip.exports && clip.exports[0]?.url ? (
                        <video
                          src={clip.exports[0].url}
                          poster={clip.thumbnailUrl}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                        />
                      ) : clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title || `Clip ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-accent/20 to-accent/5">
                          🎬
                        </div>
                      )}
                      {/* Virality score badge */}
                      {clip.viralityScore && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-accent to-accent/80 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                          🔥 {clip.viralityScore}% viral
                        </div>
                      )}
                      {/* Duration badge */}
                      <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2.5 py-1 rounded-full font-mono">
                        {Math.floor(clip.duration / 60)}:{String(Math.floor(clip.duration % 60)).padStart(2, '0')}
                      </div>
                    </div>
                    {/* Clip Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-body mb-2 line-clamp-2">
                        {clip.title || `Clip ${index + 1}`}
                      </h4>
                      {clip.selectionReason && (
                        <p className="text-small text-text-secondary line-clamp-2 mb-3">
                          {clip.selectionReason}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                          {clip.format === 'portrait' ? '📱 Vertical' : clip.format === 'landscape' ? '🖥️ Horizontal' : '⬜ Square'}
                        </span>
                        {clip.hasCaptions && (
                          <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
                            CC ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Kit Section - Show if we have a content kit */}
          {contentKit && (
            <div className="mb-12">
              <h3 className="text-display text-2xl mb-6">
                ✍️ Written Content <span className="text-text-secondary text-lg font-normal">(ready to post)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { platform: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'bg-blue-500/10 text-blue-600', content: contentKit.contentLinkedin },
                  { platform: 'twitter', label: 'Twitter/X', icon: '𝕏', color: 'bg-slate-500/10 text-slate-700', content: contentKit.contentTwitter },
                  { platform: 'instagram', label: 'Instagram', icon: '📸', color: 'bg-pink-500/10 text-pink-600', content: contentKit.contentInstagram },
                  { platform: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-slate-800/10 text-slate-800', content: contentKit.contentTiktok },
                  { platform: 'blog', label: 'Blog Post', icon: '📝', color: 'bg-emerald-500/10 text-emerald-600', content: contentKit.contentBlog },
                  { platform: 'email', label: 'Newsletter', icon: '✉️', color: 'bg-amber-500/10 text-amber-600', content: contentKit.contentEmail },
                ].filter(p => p.content).map(({ platform, label, icon, color, content }) => (
                  <div
                    key={platform}
                    className="bg-bg-secondary rounded-xl border border-border overflow-hidden hover:border-accent/50 transition-colors group"
                  >
                    {/* Platform Header */}
                    <div className={`px-4 py-3 ${color} border-b border-border/50`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{icon}</span>
                          <h4 className="font-semibold">{label}</h4>
                        </div>
                        <button
                          onClick={() => handleCopyContentKit(platform, content!)}
                          className={`text-small px-3 py-1.5 rounded-full font-medium transition-all ${
                            copiedPlatform === platform
                              ? 'bg-success text-white scale-105'
                              : 'bg-white/80 text-text-primary hover:bg-white shadow-sm'
                          }`}
                        >
                          {copiedPlatform === platform ? '✓ Copied!' : '📋 Copy'}
                        </button>
                      </div>
                    </div>
                    {/* Content Preview */}
                    <div className="p-4">
                      <p className="text-small text-text-secondary line-clamp-6 whitespace-pre-wrap leading-relaxed">
                        {content}
                      </p>
                      {content && content.length > 200 && (
                        <button className="text-xs text-accent mt-2 hover:underline">
                          Show more...
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Content Cards - Show if we have normal results */}
          {results && (
            <ContentCards
              results={results}
              onCopy={handleCopy}
              onFeedback={handleFeedback}
            />
          )}

          {/* Carousel Section - shows when expecting carousel from backend */}
          {(carouselLoading || carouselError || (carouselSlides && carouselSlides.length > 0)) && (
            <div className="mt-12">
              <h3 className="text-display text-2xl mb-6 text-center">Instagram Carousel</h3>

              {carouselLoading && !carouselSlides && (
                <div className="text-center p-8 bg-bg-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-body text-text-secondary">Creating your carousel slides...</p>
                  <p className="text-small text-text-tertiary mt-2">This runs in the background - your content is ready above!</p>
                </div>
              )}

              {carouselError && !carouselSlides && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
                  {carouselError}
                </div>
              )}

              {carouselSlides && carouselSlides.length > 0 && (
                <CarouselPreview
                  slides={carouselSlides}
                  contentId={requestId || `carousel-${Date.now()}`}
                />
              )}
            </div>
          )}

          {/* Create Another */}
          <div className="flex justify-center mt-12">
            <button
              onClick={handleReset}
              className="btn-primary px-8 py-3"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
