/**
 * WatchWalkthroughLink.tsx
 * Small secondary link to the founder's 20-minute walkthrough video,
 * anchored to the video embed on the platform-overview guide. Rendered
 * in first-run surfaces (Create hero empty state, library empty state,
 * help widget) so a stuck user always has a way to watch someone else
 * do the flow.
 */

import Link from 'next/link';
import { Play } from 'lucide-react';

interface WatchWalkthroughLinkProps {
  className?: string;
}

export function WatchWalkthroughLink({ className = '' }: WatchWalkthroughLinkProps) {
  return (
    <Link
      href="/guides/platform-overview#watch"
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      <Play className="w-3 h-3" aria-hidden="true" />
      Not sure what to do? Watch the walkthrough
    </Link>
  );
}
