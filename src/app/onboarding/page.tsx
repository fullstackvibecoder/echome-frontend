'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { AlertCircle, RefreshCw } from 'lucide-react';
import OnboardingContent from './OnboardingContent';

export const dynamic = 'force-dynamic';

function OnboardingErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  console.error('[OnboardingPage] Error boundary caught:', error);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Onboarding Error</h2>
        <p className="text-text-secondary mb-2">
          {error.message?.includes('NotFoundError') || error.message?.includes('not found') || error.message?.includes('404')
            ? 'A required service was not found. This may be a temporary issue.'
            : 'Something went wrong during onboarding setup.'}
        </p>
        <p className="text-sm text-text-secondary mb-6">
          Error: {error.message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/app'}
            className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-bg-secondary transition-colors"
          >
            Skip to App
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 p-4 bg-bg-secondary rounded-lg text-left">
            <summary className="cursor-pointer text-sm font-medium">Debug Info</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-40 text-text-secondary">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ErrorBoundary
      FallbackComponent={OnboardingErrorFallback}
      onError={(error, errorInfo) => {
        console.error('[OnboardingPage] Error boundary triggered:', error, errorInfo);
        // Could send to Sentry here
      }}
    >
      <OnboardingContent />
    </ErrorBoundary>
  );
}
