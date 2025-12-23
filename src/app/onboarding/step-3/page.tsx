'use client';

import { useRouter } from 'next/navigation';
import { useGeneration } from '@/hooks/useGeneration';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { FirstGeneration } from '@/components/first-generation';
import { ContentCards } from '@/components/content-cards';
import { InputType, Platform } from '@/types';

export default function OnboardingStep3Page() {
  const router = useRouter();
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
    // Note: contentId should be the actual content ID from the result
    sendFeedback(contentId, liked);
  };

  const handleGoToDashboard = () => {
    router.push('/app');
  };

  const handleCreateAnother = () => {
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-secondary">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-display font-bold text-accent">EchoMe</h1>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center text-sm">
          ✓
        </div>
        <div className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center text-sm">
          ✓
        </div>
        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
          3
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-20">
        {!results && !generating && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-display text-4xl md:text-5xl mb-4">
                You&apos;re Ready! 🎉
              </h1>
              <p className="text-body text-xl text-text-secondary">
                Create your first piece of content
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
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
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
              <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-body">Analyzing your voice...</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg opacity-50">
                <div className="w-5 h-5 border-2 border-border rounded-full" />
                <span className="text-body">Generating for 6 platforms...</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg opacity-50">
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
              <p className="text-body text-text-secondary">
                Generated content for 6 platforms
              </p>

              {/* Scores */}
              {(voiceScore || qualityScore) && (
                <div className="flex items-center justify-center gap-6 mt-6">
                  {voiceScore && (
                    <div className="bg-bg-primary rounded-lg px-6 py-3 border border-border">
                      <p className="text-small text-text-secondary mb-1">
                        Voice Match
                      </p>
                      <p className="text-subheading text-2xl font-semibold text-accent">
                        {voiceScore}%
                      </p>
                    </div>
                  )}
                  {qualityScore && (
                    <div className="bg-bg-primary rounded-lg px-6 py-3 border border-border">
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

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 mt-12">
              <button
                onClick={handleCreateAnother}
                className="px-6 py-3 border-2 border-border rounded-lg text-body font-medium hover:border-accent transition-colors"
              >
                Create Another
              </button>
              <button onClick={handleGoToDashboard} className="btn-primary px-8 py-3">
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
