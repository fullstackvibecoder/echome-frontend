import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep the public help widget out of the integration render (it does data work).
vi.mock('@/components/help-widget', () => ({ HelpWidget: () => null }));

// Analytics is exercised in unit tests; stub here so the tree renders cleanly.
vi.mock('@/lib/analytics', () => ({
  trackSectionView: vi.fn(),
  trackCtaClick: vi.fn(),
}));

// OutputShowcase calls scrollRef.current.scrollTo() on mount; jsdom doesn't
// implement it on HTMLElement. Stub it globally so the effect doesn't throw.
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = () => {};
}

import HomeContent from './HomeContent';

describe('HomeContent landing structure', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof IntersectionObserver,
    );
  });

  it('renders the hero "Context is King" eyebrow', () => {
    render(<HomeContent />);
    expect(screen.getByText('Context is King')).toBeInTheDocument();
  });

  it('mounts the resurrected UseCases section', () => {
    render(<HomeContent />);
    expect(screen.getByText('Real Estate Agent')).toBeInTheDocument();
  });

  it('no longer renders the cut HowItWorks section', () => {
    render(<HomeContent />);
    // "Feed it your history" is HowItWorks-only copy.
    expect(screen.queryByText('Feed it your history')).not.toBeInTheDocument();
  });

  it('repoints the #how anchor onto a rendered section', () => {
    const { container } = render(<HomeContent />);
    const how = container.querySelector('#how');
    expect(how).not.toBeNull();
    expect(how!.tagName.toLowerCase()).toBe('section');
  });
});
