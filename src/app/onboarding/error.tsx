'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Segment-scoped error boundary for /onboarding/*. Before this existed,
// a render crash here (e.g. ECHO-ME-FRONTEND-30's translate-engine
// insertBefore throw) fell through to global-error.tsx, unmounting the
// whole shell and stranding the user mid-onboarding with no way forward.
export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-5xl mb-4">&#9888;&#65039;</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-6">
          An unexpected error occurred. Please try again, or contact support if the problem persists.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <a
            href="mailto:support@tryechome.com"
            className="px-6 py-2.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
