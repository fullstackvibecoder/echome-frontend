'use client';

/**
 * useTourViewport — returns 'desktop' | 'mobile' based on viewport width.
 * Switches at the 768px breakpoint (matches Tailwind's `md:` prefix).
 * SSR-safe default: 'desktop' (no flash of mobile UI on hydration).
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §5.3.
 */
import { useEffect, useState } from 'react';

export type TourViewport = 'desktop' | 'mobile';

export function useTourViewport(): TourViewport {
  const [viewport, setViewport] = useState<TourViewport>('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setViewport(mq.matches ? 'desktop' : 'mobile');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return viewport;
}
