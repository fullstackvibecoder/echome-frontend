import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('renders the headline visible at first paint (no opacity-0 LCP trap)', () => {
    render(<HeroSection />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.className).not.toContain('opacity-0');
  });
});
