'use client';

import { useGeneration } from '@/hooks/useGeneration';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { FirstGeneration } from '@/components/first-generation';
import { ContentCards } from '@/components/content-cards';
import { InputType, Platform } from '@/types';

export default function AppDashboard() {
  const { generating, results, error, voiceScore, qualityScore, generate, reset } = useGeneration();
  const { sendFeedback, copyToClipboard } = useResultsFeedback();

  const handleGenerate = async (
    input: string,
    inputType: InputType,
    platforms: Platform[]
  ) => {
    await generate(input, inputType, platforms);
  };

  const handleCopy = async (content: string) => {
    await copyToClipboard(content);
  };

  const handleFeedback = (contentId: string, liked: boolean) => {
    sendFeedback(contentId, liked);
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
          <FirstGeneration onGenerate={handleGenerate} generating={false} />

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
              Creating your content...
            </h2>
            <p className="text-body text-text-secondary">
              This usually takes 30-60 seconds
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3 text-left max-w-md mx-auto">
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-body">Analyzing your voice...</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg opacity-50">
              <div className="w-5 h-5 border-2 border-border rounded-full" />
              <span className="text-body">Generating for 6 platforms...</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg opacity-50">
              <div className="w-5 h-5 border-2 border-border rounded-full" />
              <span className="text-body">Optimizing content...</span>
            </div>
          </div>
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

          {/* Create Another */}
          <div className="flex justify-center mt-12">
            <button
              onClick={reset}
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
