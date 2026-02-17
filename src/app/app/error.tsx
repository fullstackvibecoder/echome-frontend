'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
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
