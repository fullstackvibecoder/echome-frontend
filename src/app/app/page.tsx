'use client';

import { useState, useEffect, useRef } from 'react';
import { useGeneration } from '@/hooks/useGeneration';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { FirstGeneration } from '@/components/first-generation';
import { ContentCards } from '@/components/content-cards';
import { CarouselPreview } from '@/components/carousel-preview';
import { InputType, Platform, BackgroundConfig, CarouselSlide } from '@/types';
import { api } from '@/lib/api-client';

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
  const { generating, results, error, voiceScore, qualityScore, generate, repurpose, reset } = useGeneration();
  const { sendFeedback, copyToClipboard } = useResultsFeedback();

  // Progress state for animated steps
  const [progressStep, setProgressStep] = useState(0);
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

  // Animate progress steps during generation
  useEffect(() => {
    if (!generating) {
      setProgressStep(0);
      return;
    }

    // Progress through steps
    const stepTimings = [0, 3000, 8000, 15000]; // When each step starts
    const timers: NodeJS.Timeout[] = [];

    stepTimings.forEach((delay, index) => {
      const timer = setTimeout(() => setProgressStep(index), delay);
      timers.push(timer);
    });

    // Rotate tips every 5 seconds
    const tipTimer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % ECHO_TIPS.length);
    }, 5000);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tipTimer);
    };
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

  const handleRepurpose = async (contentId: string, platforms: Platform[]) => {
    setCarouselSlides(null);
    setCarouselError(null);
    setCarouselQuality(null);
    await repurpose(contentId, platforms);
  };

  const handleCopy = async (content: string) => {
    await copyToClipboard(content);
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
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {!results && !generating && (
        <div className="animate-fade-in">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-display text-4xl mb-2">Welcome back!</h1>
            <p className="text-body text-text-secondary">
              What would you like to create today?
            </p>
          </div>

          {/* Input Form */}
          <FirstGeneration onGenerate={handleGenerate} onRepurpose={handleRepurpose} generating={false} />

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
              Your Echosystem is working its magic ✨
            </p>
          </div>

          {/* Progress Steps - Fun EchoMe Branded */}
          <div className="space-y-3 text-left max-w-md mx-auto">
            <ProgressStep
              icon="🎤"
              text="Tuning into your unique voice patterns"
              subtext="Reading your Echosystem DNA..."
              active={progressStep === 0}
              completed={progressStep > 0}
            />
            <ProgressStep
              icon="🧠"
              text="Channeling the TLL framework"
              subtext="Teach • Learn • Lead"
              active={progressStep === 1}
              completed={progressStep > 1}
            />
            <ProgressStep
              icon="🎨"
              text="Crafting platform-perfect content"
              subtext="Making each platform sing YOUR tune"
              active={progressStep === 2}
              completed={progressStep > 2}
            />
            <ProgressStep
              icon="✨"
              text="Polishing your Echo"
              subtext="Quality check in progress..."
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

      {results && !generating && (
        <div className="animate-fade-in">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-display text-4xl mb-2">Your Content is Ready!</h2>
            <p className="text-body text-text-secondary mb-6">
              Generated content for {results.length} platforms
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

          {/* Content Cards */}
          <ContentCards
            results={results}
            onCopy={handleCopy}
            onFeedback={handleFeedback}
          />

          {/* Carousel Section */}
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
