import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackSectionView = vi.fn();
vi.mock('@/lib/analytics', () => ({
  trackSectionView: (...a: unknown[]) => trackSectionView(...a),
  trackCtaClick: vi.fn(),
}));

import { TrackedSection } from './TrackedSection';

// jsdom has no IntersectionObserver. Stub one that immediately reports the
// target as intersecting so the hook's fire-once path runs synchronously.
class MockIO {
  cb: (entries: { isIntersecting: boolean }[]) => void;
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ isIntersecting: true }]);
  }
  disconnect() {}
}

describe('TrackedSection', () => {
  beforeEach(() => {
    trackSectionView.mockClear();
    vi.stubGlobal('IntersectionObserver', MockIO as unknown as typeof IntersectionObserver);
  });

  it('renders children and fires section_view once when it enters view', () => {
    render(
      <TrackedSection name="pricing">
        <p>inner content</p>
      </TrackedSection>,
    );
    expect(screen.getByText('inner content')).toBeInTheDocument();
    expect(trackSectionView).toHaveBeenCalledTimes(1);
    expect(trackSectionView).toHaveBeenCalledWith('pricing');
  });
});
