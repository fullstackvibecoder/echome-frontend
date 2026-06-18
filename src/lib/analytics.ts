'use client';

import { track } from '@vercel/analytics';

/** Fired once per landing section when it scrolls into view. */
export function trackSectionView(section: string): void {
  track('section_view', { section });
}

/** Fired when a primary call-to-action is clicked. */
export function trackCtaClick(location: string): void {
  track('cta_click', { location });
}
