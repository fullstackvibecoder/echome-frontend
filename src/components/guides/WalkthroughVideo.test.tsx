import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WalkthroughVideo } from './WalkthroughVideo';

describe('WalkthroughVideo', () => {
  it('renders the Loom embed at #watch (hero variant)', () => {
    render(<WalkthroughVideo variant="hero" />);
    const iframe = screen.getByTitle('EchoMe walkthrough');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/77e3e0f47fdc406cb5487ded1b87206c');
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(document.getElementById('watch')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Watch the 20-minute walkthrough' })).toBeInTheDocument();
    expect(
      screen.getByText('Ara takes four members through the whole flow, from dropping a video to posting, live.'),
    ).toBeInTheDocument();
  });

  it('renders the same embed for the inline variant', () => {
    render(<WalkthroughVideo variant="inline" />);
    const iframe = screen.getByTitle('EchoMe walkthrough');
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/77e3e0f47fdc406cb5487ded1b87206c');
    expect(document.getElementById('watch')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Watch the 20-minute walkthrough' })).toBeInTheDocument();
  });
});
