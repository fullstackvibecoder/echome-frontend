import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroDemoVideo } from './HeroDemoVideo';

describe('HeroDemoVideo', () => {
  it('renders the hero-transform sketch, not the screenshot carousel', () => {
    render(<HeroDemoVideo />);
    // The sketch scene exposes an accessible svg.
    expect(screen.getByRole('img')).toBeInTheDocument();
    // Old carousel artifacts are gone.
    expect(screen.queryByAltText('EchoMe create page')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show slide/ })).not.toBeInTheDocument();
  });

  it('keeps the floating proof cards', () => {
    render(<HeroDemoVideo />);
    expect(screen.getByText('Voice Matched 99%')).toBeInTheDocument();
    expect(screen.getByText('Instagram Carousel Gen')).toBeInTheDocument();
  });
});
