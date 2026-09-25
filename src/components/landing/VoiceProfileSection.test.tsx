import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VoiceProfileSection } from './VoiceProfileSection';

describe('VoiceProfileSection', () => {
  it('renders the "Your voice profile builds itself" heading', () => {
    render(<VoiceProfileSection />);
    expect(
      screen.getByRole('heading', { name: 'Your voice profile builds itself' })
    ).toBeInTheDocument();
  });

  it('renders all three points', () => {
    render(<VoiceProfileSection />);
    expect(screen.getByText("It starts from what's public")).toBeInTheDocument();
    expect(screen.getByText("You confirm, you don't configure")).toBeInTheDocument();
    expect(screen.getByText('Feed it more any time')).toBeInTheDocument();
  });

  it('links to the build-your-voice guide', () => {
    render(<VoiceProfileSection />);
    const link = screen.getByRole('link', { name: /how your voice profile works/i });
    expect(link).toHaveAttribute('href', '/guides/build-your-voice');
  });
});
