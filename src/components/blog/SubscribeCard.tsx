import { Rss } from 'lucide-react';

// Email subscriptions need a backend list; until then, RSS plus the free plan.
export function SubscribeCard({ compact }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-accent/5 ${compact ? 'p-5' : 'p-6 sm:p-8'} text-center`}>
      <p className="text-lg font-bold text-text-primary mb-1">Follow the EchoMe blog</p>
      <p className="text-sm text-text-secondary mb-5 max-w-md mx-auto">
        Case studies, office hours recaps and how-tos. New posts land in your reader as soon as they go up.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="/blog/rss.xml"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-text-primary font-semibold hover:border-accent transition-colors"
        >
          <Rss className="w-4 h-4" />
          Subscribe via RSS
        </a>
        <a
          href="/auth/signup"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition-colors"
        >
          Try EchoMe free
        </a>
      </div>
    </div>
  );
}
