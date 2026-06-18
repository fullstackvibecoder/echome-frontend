import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@vercel/analytics', () => ({ track: (...args: unknown[]) => track(...args) }));

import { trackSectionView, trackCtaClick } from './analytics';

describe('analytics wrapper', () => {
  beforeEach(() => track.mockClear());

  it('trackSectionView emits a section_view event with the section name', () => {
    trackSectionView('pricing');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('section_view', { section: 'pricing' });
  });

  it('trackCtaClick emits a cta_click event with the location', () => {
    trackCtaClick('hero_primary');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('cta_click', { location: 'hero_primary' });
  });
});
