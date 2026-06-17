'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGeneration } from '@/hooks/useGeneration';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { usePendingCheckout } from '@/hooks/usePendingCheckout';
import { GenerationForm } from '@/components/generation-form';
import { ContentCards } from '@/components/content-cards';
import { CarouselPreview } from '@/components/carousel-preview';
import { setActiveGeneration, clearActiveGeneration } from '@/components/generation-banner';
import { requestNotificationPermission, showNotificationIfHidden } from '@/lib/notifications';
import { InputType, Platform, BackgroundConfig, CarouselSlide, DesignPreset } from '@/types';
import { EchoHero } from '@/components/echo/EchoHero';
import { GetStartedChecklist } from '@/components/dashboard/GetStartedChecklist';
import { DraftedForYou } from '@/components/dashboard/DraftedForYou';
import { OutcomeChips } from '@/components/dashboard/OutcomeChips';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { useVoiceContext } from '@/contexts/voice-context';
import { useSubscription } from '@/hooks/useSubscription';
import { showErrorToast, showInfoToast } from '@/lib/toast';
import { X } from 'lucide-react';
import { api, VideoUpload, VideoClip, ContentKit } from '@/lib/api-client';

export default function AppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?topic=… set by the Mind-Reader chip's "Generate" button — pre-fills the
  // input so the user can review/edit before submitting. Read once on mount;
  // subsequent navigation away clears it.
  const initialTopic = searchParams.get('topic') ?? undefined;
  const { generating, requestId, results, error, isQuotaError, voiceScore, qualityScore, generate, repurpose, reset } = useGeneration();
  const { sendFeedback, copyToClipboard } = useResultsFeedback();
  const { isFirstTime, dismissWelcome } = useFirstTimeUser();
  const { activeVoice, isTeamsUser, voiceLimit } = useVoiceContext();
  const { isFreeUser, freeGenerationsRemaining, freeGenerationsLimit } = useSubscription();
  const formRef = useRef<HTMLDivElement>(null);
  // Teams onboarding banner (dismissible via localStorage)
  const [showTeamsOnboarding, setShowTeamsOnboarding] = useState(false);
  useEffect(() => {
    if (isTeamsUser && !activeVoice) {
      setShowTeamsOnboarding(!localStorage.getItem('echome_teams_onboarding_dismissed'));
    } else {
      setShowTeamsOnboarding(false);
    }
  }, [isTeamsUser, activeVoice]);

  // Check for pending checkout from signup flow
  const { checking: checkingPendingPlan, checkoutLoading } = usePendingCheckout();

  // Real-time progress from SSE (including carousel status)
  const { progress, isComplete: progressComplete, hasError: progressError, carouselReady, carouselFailed } = useGenerationProgress(requestId);


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
      <div className="min-h-[60vh] p-6 max-w-7xl mx-auto">
        {checkoutLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary">Redirecting to checkout...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="skeleton h-8 w-64" />
            <div className="skeleton h-4 w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
            </div>
            <div className="skeleton h-64 rounded-xl" />
          </div>
        )}
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
        showErrorToast(uploadErr, 'uploading background image');
      }
    }

    // Pass carousel design options and voice ID to the generate function
    const reqId = await generate(input, inputType, platforms, {
      designPreset,
      carouselBackground: finalCarouselBackground,
      voiceId: isTeamsUser ? activeVoice?.id : undefined,
    });

    // Redirect to content kit detail page for proper progress UI
    // This matches the behavior of handleRepurpose and handleVideoProcessing.
    // The toast confirms the click registered — without it the Create page
    // unmounts instantly and the detail page shows a generic spinner, so
    // users perceive their prompt as "disappearing" (seen on Alicia demo).
    if (reqId) {
      clearActiveGeneration();
      showInfoToast('Generating your content kit', 'Opening it now — should be ready in a moment.');
      router.push(`/app/library/${reqId}`);
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
      router.push(`/app/library/${reqId}`);
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
      router.push(`/app/library/${data.contentKit.generationRequestId}`);
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
          {/*
           * SP1.5 Create redesign — GA for all users as of 2026-06-17.
           * `showCreateRedesign` is the rollback lever: to re-gate to admins,
           * re-add `import { useAuth }` + `const { user } = useAuth()` and set
           * this to `!!user?.isAdmin`. The non-admin JSX branch below is
           * retained as the rollback target — dead while this is `true`.
           * All users see: EchoHero chat surface + hidden GenerationForm engine.
           */}
          {(() => {
            const showCreateRedesign = true;

            return (
              <>
                {/* Teams Onboarding Banner (zero-voice state) -- shared across both paths */}
                {showTeamsOnboarding && (
                  <div className="mb-6 p-5 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl relative">
                    <button
                      onClick={() => {
                        localStorage.setItem('echome_teams_onboarding_dismissed', new Date().toISOString());
                        setShowTeamsOnboarding(false);
                      }}
                      className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <h3 className="font-bold text-lg mb-1">Welcome to EchoTeams!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your account supports up to {voiceLimit} voice{voiceLimit !== 1 ? 's' : ''}. Let&apos;s get set up:
                    </p>
                    <a
                      href="/app/voice?tab=team"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
                    >
                      Go to Team Voices
                    </a>
                  </div>
                )}

                {/* Free User Quota Counter -- shared across both paths. Flips to an
                    amber accent on the last generation so users know they're about
                    to hit the wall. */}
                {isFreeUser && (() => {
                  const isLastOne = freeGenerationsRemaining === 1;
                  const isExhausted = freeGenerationsRemaining <= 0;
                  const containerClass = isLastOne
                    ? 'mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-2 border-amber-500/40 rounded-lg text-sm'
                    : 'mb-4 flex items-center gap-2 px-4 py-2.5 glass border border-accent-yellow/30 rounded-lg text-sm';
                  const label = isExhausted
                    ? 'Free content kits used up'
                    : isLastOne
                      ? '⚠️ Last free content kit -- make it count'
                      : `${freeGenerationsRemaining} of ${freeGenerationsLimit} free content kits remaining`;
                  return (
                    <div className={containerClass}>
                      <span className="text-lg">{isLastOne ? '⚡' : '⚡'}</span>
                      <span className="font-medium text-foreground">{label}</span>
                      {isExhausted && (
                        <a href="/app/billing" className="ml-auto text-primary font-semibold hover:underline text-sm">
                          Upgrade
                        </a>
                      )}
                      {isLastOne && (
                        <a href="/app/billing" className="ml-auto text-amber-700 dark:text-amber-400 font-bold hover:underline text-sm whitespace-nowrap">
                          Subscribe →
                        </a>
                      )}
                    </div>
                  );
                })()}

                {showCreateRedesign ? (
                  /* Admin path: SP1.5 EchoHero chat surface */
                  <>
                    {/* EchoHero owns the resting Create page surface for admins. */}
                    <EchoHero />

                    {/* GenerationForm: hidden execution engine. Kept mounted so its
                        effects (processVideoWithClipFinder, handleUnifiedSubmit,
                        useSearchParams ?echoPrompt=/?echoFile=1) keep running.
                        display:none does NOT unmount the component or block React
                        effects. */}
                    <div className="hidden" aria-hidden="true">
                      <GenerationForm
                        onGenerate={handleGenerate}
                        onRepurpose={handleRepurpose}
                        onVideoProcessing={handleVideoProcessing}
                        generating={false}
                        isQuotaError={isQuotaError}
                        activeVoice={isTeamsUser && activeVoice ? activeVoice : undefined}
                        initialInput={initialTopic}
                        surfaceProcessingOverlay
                        echoExperience={showCreateRedesign}
                      />
                    </div>
                  </>
                ) : (
                  /* Non-admin path: production Create page (main branch parity) */
                  <>
                    {/* Get Started checklist -- auto-hides when complete or dismissed */}
                    <GetStartedChecklist />

                    {/* Drafted For You -- Echo-proposed kits the user can review/schedule/kill */}
                    <DraftedForYou />

                    {/* Outcome Chips -- intent-driven suggestions keyed off real data state */}
                    <div className="mb-6">
                      <OutcomeChips />
                    </div>

                    {/* Input Form */}
                    <div ref={formRef}>
                      <GenerationForm
                        onGenerate={handleGenerate}
                        onRepurpose={handleRepurpose}
                        onVideoProcessing={handleVideoProcessing}
                        generating={false}
                        isQuotaError={isQuotaError}
                        activeVoice={isTeamsUser && activeVoice ? activeVoice : undefined}
                        initialInput={initialTopic}
                        echoExperience={showCreateRedesign}
                      />
                    </div>
                  </>
                )}

                {/* Error -- shared across both paths */}
                {error && (
                  isQuotaError ? (
                    <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-center">
                      <div className="text-3xl mb-2">🔒</div>
                      <h3 className="text-lg font-bold text-foreground mb-1">Free generations used</h3>
                      <p className="text-sm text-text-secondary mb-4">Subscribe to keep generating from your knowledge base.</p>
                      <button
                        onClick={() => router.push('/app/billing')}
                        className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all hover:scale-[1.02]"
                      >
                        View Plans →
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
                      {error}
                    </div>
                  )
                )}
              </>
            );
          })()}
        </div>
      )}

      {hasResults && !generating && (
        <div className="animate-fade-in">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4 animate-bounce">{videoClips.length > 0 ? '🎬' : '✨'}</div>
            <h2 className="text-display text-4xl mb-2 bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
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
                      {/* Strength score badge — comparative clip strength */}
                      {clip.engagementPotential ? (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-accent to-accent/80 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                          🔥 {clip.engagementPotential}% strength
                        </div>
                      ) : null}
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
