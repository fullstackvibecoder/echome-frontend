'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGeneration } from '@/hooks/useGeneration';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { useGenerationProgress, GENERATION_STEPS, mapStepToIndex } from '@/hooks/useGenerationProgress';
import { FirstGeneration } from '@/components/first-generation';
import { ContentCards } from '@/components/content-cards';
import { CarouselPreview } from '@/components/carousel-preview';
import { setActiveGeneration, clearActiveGeneration } from '@/components/generation-banner';
import { requestNotificationPermission, showNotificationIfHidden } from '@/lib/notifications';
import { InputType, Platform, BackgroundConfig, CarouselSlide } from '@/types';
import { api, VideoUpload, VideoClip, ContentKit } from '@/lib/api-client';

// Progress step component with EchoMe branding
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
      <div className="text-2xl flex-shrink-0">
        {completed ? '✅' : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-body font-medium ${active ? 'text-accent' : ''}`}>
            {text}
          </span>
          {active && (
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <span className="text-small text-text-secondary">{subtext}</span>
      </div>
    </div>
  );
}

// Fun tips that rotate during generation
const ECHO_TIPS = [
  "💡 Your content sounds better because it's actually YOU",
  "🎯 We're matching your exact writing style from your Echosystem",
  "🔮 AI + Your Voice = Content that converts",
  "📚 Drawing from your knowledge base to keep it authentic",
  "✨ Quality over quantity - every Echo matters",
  "🎤 Your voice, amplified across every platform",
];

export default function AppDashboard() {
  const router = useRouter();
  const { generating, requestId, results, error, voiceScore, qualityScore, generate, repurpose, reset } = useGeneration();
  const { sendFeedback, copyToClipboard } = useResultsFeedback();

  // Real-time progress from SSE
  const { progress, isComplete: progressComplete, hasError: progressError } = useGenerationProgress(requestId);

  // Derive progress step from real SSE events (fallback to 0 if not connected)
  const progressStep = progress ? mapStepToIndex(progress.step) : 0;
  const [currentTip, setCurrentTip] = useState(0);

  // Carousel state
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[] | null>(null);
  const [carouselGenerating, setCarouselGenerating] = useState(false);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [carouselQuality, setCarouselQuality] = useState<{
    isOptimal: boolean;
    score: number;
  } | null>(null);
  const pendingCarouselRef = useRef<{
    bgConfig: BackgroundConfig;
    bgFile?: File;
    userInput: string; // Store user input for TLL context
  } | null>(null);

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

  // Rotate tips every 5 seconds during generation
  useEffect(() => {
    if (!generating) return;

    const tipTimer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % ECHO_TIPS.length);
    }, 5000);

    return () => clearInterval(tipTimer);
  }, [generating]);

  // Generate TLL-structured carousel after content generation completes
  useEffect(() => {
    const generateCarousel = async () => {
      if (!results || !pendingCarouselRef.current) return;

      // Find Instagram content
      const instagramContent = results.find((r) => r.platform === 'instagram');
      if (!instagramContent) return;

      const { bgConfig, bgFile, userInput } = pendingCarouselRef.current;
      pendingCarouselRef.current = null; // Clear pending

      try {
        setCarouselGenerating(true);
        setCarouselError(null);
        setCarouselQuality(null);

        const contentId = `carousel-${Date.now()}`;

        let response;
        if (bgConfig.type === 'image' && bgFile) {
          // For upload, we need to parse slides first then use upload endpoint
          // TODO: Add TLL upload endpoint on backend
          const slideTexts = instagramContent.content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith('#'))
            .slice(0, 10);
          const slides = slideTexts.map((text) => ({ text }));

          response = await api.images.generateCarouselWithUpload(
            contentId,
            slides,
            bgFile
          );

          if (response.success && response.data?.carousel?.slides) {
            setCarouselSlides(response.data.carousel.slides);
          } else {
            throw new Error(response.error || 'Failed to generate carousel');
          }
        } else {
          // Use optimized carousel endpoint for proper slide structure
          response = await api.images.generateOptimizedCarousel(
            contentId,
            instagramContent.content,
            userInput,
            { background: bgConfig }
          );

          if (response.success && response.data?.carousel?.slides) {
            setCarouselSlides(response.data.carousel.slides);
            // Store quality score (internal validation)
            if (response.data.quality) {
              setCarouselQuality({
                isOptimal: response.data.quality.score >= 70,
                score: response.data.quality.score,
              });
            }
          } else {
            throw new Error(response.error || 'Failed to generate carousel');
          }
        }
      } catch (err) {
        setCarouselError(err instanceof Error ? err.message : 'Carousel generation failed');
      } finally {
        setCarouselGenerating(false);
      }
    };

    generateCarousel();
  }, [results]);

  const handleGenerate = async (
    input: string,
    inputType: InputType,
    platforms: Platform[],
    carouselBackground?: BackgroundConfig,
    carouselBackgroundFile?: File
  ) => {
    // Store carousel config and user input for TLL-structured generation
    if (carouselBackground) {
      pendingCarouselRef.current = {
        bgConfig: carouselBackground,
        bgFile: carouselBackgroundFile,
        userInput: input, // Store for TLL context
      };
    }
    setCarouselSlides(null);
    setCarouselError(null);
    setCarouselQuality(null);
    await generate(input, inputType, platforms);
  };

  const handleRepurpose = async (contentId: string, platforms: Platform[], carouselBackground?: BackgroundConfig) => {
    setCarouselSlides(null);
    setCarouselError(null);
    setCarouselQuality(null);
    // Pass carouselBackground in the new options format
    await repurpose(contentId, platforms, carouselBackground ? { carouselBackground } : undefined);
  };

  // Handle video processing results from Clip Finder
  const handleVideoProcessing = (data: {
    upload: VideoUpload;
    clips: VideoClip[];
    contentKit: ContentKit | null;
  }) => {
    // If we have a generation request ID, redirect to Content Kit
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
    setCarouselQuality(null);
    setCarouselError(null);
    pendingCarouselRef.current = null;
    // Reset video processing state
    setVideoUpload(null);
    setVideoClips([]);
    setContentKit(null);
  };

  // Check if we have any results to display
  const hasResults = results || contentKit || videoClips.length > 0;

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {!hasResults && !generating && (
        <div className="animate-fade-in">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-display text-4xl mb-2">Welcome back!</h1>
            <p className="text-body text-text-secondary">
              What would you like to create today?
            </p>
          </div>

          {/* Input Form */}
          <FirstGeneration
            onGenerate={handleGenerate}
            onRepurpose={handleRepurpose}
            onVideoProcessing={handleVideoProcessing}
            generating={false}
          />

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
          {/* Loading Animation */}
          <div className="mb-8">
            <div className="w-20 h-20 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-display text-3xl mb-2">
              Echoing your voice...
            </h2>
            <p className="text-body text-text-secondary">
              {progress?.message || 'Your Echosystem is working its magic ✨'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${progress?.percent || 5}%` }}
              />
            </div>
            <p className="text-small text-text-secondary mt-2">
              {progress?.percent || 5}% complete
            </p>
          </div>

          {/* Progress Steps - Fun EchoMe Branded */}
          <div className="space-y-3 text-left max-w-md mx-auto">
            <ProgressStep
              icon="🎤"
              text="Tuning into your unique voice patterns"
              subtext={progress?.step === 'init' || progress?.step === 'context' ? progress.message : 'Reading your Echosystem DNA...'}
              active={progressStep === 0 || progressStep === 1}
              completed={progressStep > 1}
            />
            <ProgressStep
              icon="🧠"
              text="Applying your voice DNA"
              subtext={progress?.step === 'voice' ? progress.message : 'Matching your unique style'}
              active={progressStep === 1 && progress?.step === 'voice'}
              completed={progressStep > 1}
            />
            <ProgressStep
              icon="🎨"
              text="Crafting platform-perfect content"
              subtext={progress?.step === 'generate' ? progress.message : 'Making each platform sing YOUR tune'}
              active={progressStep === 2}
              completed={progressStep > 2}
            />
            <ProgressStep
              icon="✨"
              text="Polishing your Echo"
              subtext={progress?.step === 'validate' || progress?.step === 'carousel' ? progress.message : 'Quality check in progress...'}
              active={progressStep === 3}
              completed={progressStep > 3}
            />
          </div>

          {/* Rotating fun tips */}
          <p className="text-small text-text-secondary mt-8 italic transition-opacity duration-500">
            {ECHO_TIPS[currentTip]}
          </p>
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

          {/* Carousel Section */}
          {(carouselGenerating || carouselError || (carouselSlides && carouselSlides.length > 0)) && (
            <div className="mt-12">
              <h3 className="text-display text-2xl mb-6 text-center">Instagram Carousel</h3>

              {carouselGenerating && (
                <div className="text-center p-8 bg-bg-secondary rounded-lg border border-border">
                  <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-body text-text-secondary">Creating your carousel slides...</p>
                </div>
              )}

              {carouselError && (
                <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
                  {carouselError}
                </div>
              )}

              {carouselSlides && carouselSlides.length > 0 && (
                <CarouselPreview
                  slides={carouselSlides}
                  contentId={`carousel-${Date.now()}`}
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
