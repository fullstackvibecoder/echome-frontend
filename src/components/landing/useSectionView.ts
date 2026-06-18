'use client';

import { useEffect, useRef } from 'react';
import { trackSectionView } from '@/lib/analytics';

/**
 * Attach the returned ref to an element; fires a single section_view analytics
 * event the first time the element scrolls into view, then stops observing.
 * No-ops where IntersectionObserver is unavailable (SSR / jsdom without stub).
 */
export function useSectionView<T extends HTMLElement>(section: string) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let fired = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          trackSectionView(section);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [section]);

  return ref;
}
