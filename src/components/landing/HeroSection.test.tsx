import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackCtaClick = vi.fn();
vi.mock('@/lib/analytics', () => ({
  trackCtaClick: (...a: unknown[]) => trackCtaClick(...a),
  trackSectionView: vi.fn(),
}));

import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  beforeEach(() => trackCtaClick.mockClear());

  it('renders the headline visible at first paint (no opacity-0 LCP trap)', () => {
    render(<HeroSection />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.className).not.toContain('opacity-0');
  });

  it('shows the "Context is King" eyebrow above the headline', () => {
    render(<HeroSection />);
    expect(screen.getByText('Context is King')).toBeInTheDocument();
  });

  it('tracks a cta_click when the primary Start Free button is clicked', async () => {
    render(<HeroSection />);
    await userEvent.click(screen.getByRole('link', { name: /start free/i }));
    expect(trackCtaClick).toHaveBeenCalledWith('hero_primary');
  });
});
