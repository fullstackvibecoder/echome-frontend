import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WalkthroughVideo } from './WalkthroughVideo';

describe('WalkthroughVideo', () => {
  it('renders the Loom embed at #watch (hero variant)', () => {
    render(<WalkthroughVideo variant="hero" />);
    const iframe = screen.getByTitle('EchoMe walkthrough');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/df3ea6a04b8e4173be0b85a0f0557829');
    expect(iframe).toHaveAttribute('loading', 'lazy');
    expect(document.getElementById('watch')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Watch the 30-minute walkthrough' })).toBeInTheDocument();
    expect(
      screen.getByText('Ara walks members through the whole flow live, from dropping in a video to posting, plus Creator Radar.'),
    ).toBeInTheDocument();
  });

  it('renders the same embed for the inline variant', () => {
    render(<WalkthroughVideo variant="inline" />);
    const iframe = screen.getByTitle('EchoMe walkthrough');
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/df3ea6a04b8e4173be0b85a0f0557829');
    expect(document.getElementById('watch')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Watch the 30-minute walkthrough' })).toBeInTheDocument();
  });
});
