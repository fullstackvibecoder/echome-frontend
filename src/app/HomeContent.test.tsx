import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep the public help widget out of the integration render (it does data work).
vi.mock('@/components/help-widget', () => ({ HelpWidget: () => null }));

// Analytics is exercised in unit tests; stub here so the tree renders cleanly.
vi.mock('@/lib/analytics', () => ({
  trackSectionView: vi.fn(),
  trackCtaClick: vi.fn(),
}));

// next/font only runs inside the Next compiler.
vi.mock('@/lib/fonts', () => ({ spaceGrotesk: { variable: '' } }));

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

  it('leads with the outcome headline', () => {
    render(<HomeContent />);
    expect(screen.getByRole('heading', { level: 1, name: 'Talk once. Show up all week.' })).toBeInTheDocument();
  });

  it('renders the kit demo with real proof from Jess', () => {
    render(<HomeContent />);
    expect(screen.getByRole('region', { name: 'Watch one recording become a week of content' })).toBeInTheDocument();
    expect(screen.getByText(/Real: Jess Lenouvel/)).toBeInTheDocument();
  });

  it('keeps the anchors other pages link to', () => {
    const { container } = render(<HomeContent />);
    for (const id of ['how', 'demo', 'voice', 'pricing', 'community']) {
      expect(container.querySelector(`#${id}`), `#${id}`).not.toBeNull();
    }
  });

  it('drops the cut sections and unverifiable proof', () => {
    render(<HomeContent />);
    expect(screen.queryByText('300+ Creators')).not.toBeInTheDocument();
    expect(screen.queryByText('Context is King')).not.toBeInTheDocument();
    expect(screen.queryByText(/Earn 25% Recurring/)).not.toBeInTheDocument();
  });

  it('every signup CTA goes to /auth/signup', () => {
    render(<HomeContent />);
    for (const name of ['Start free', 'Make your first kit free']) {
      for (const link of screen.getAllByRole('link', { name })) {
        expect(link).toHaveAttribute('href', '/auth/signup');
      }
    }
  });
});
