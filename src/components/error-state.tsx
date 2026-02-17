'use client';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  showSupport?: boolean;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  showSupport = true,
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-4xl mb-3">&#9888;&#65039;</div>
        <p className="text-muted-foreground mb-4">{message}</p>
        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          )}
          {showSupport && (
            <a
              href="mailto:support@tryechome.com"
              className="px-5 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Contact Support
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
