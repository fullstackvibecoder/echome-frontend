import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LinkGuidance } from './LinkGuidance';

describe('LinkGuidance', () => {
  it('renders nothing with no URL and no hint', () => {
    render(<LinkGuidance inputText="just some text" hintActive={false} />);
    expect(screen.queryByTestId('link-guidance')).toBeNull();
  });

  it('shows the source hint when the paste-a-link card was clicked', () => {
    render(<LinkGuidance inputText="" hintActive={true} />);
    expect(screen.getByTestId('link-guidance').textContent).toContain('YouTube, Instagram, Zoom, Loom, and Vimeo');
  });

  it('names the YouTube outcomes when a YouTube URL is present', () => {
    render(<LinkGuidance inputText="check https://youtu.be/abc123" hintActive={false} />);
    expect(screen.getByTestId('link-guidance').textContent).toContain('cut clips, make content, or learn your voice');
  });

  it('names the clips-only outcome for a recording URL', () => {
    render(<LinkGuidance inputText="https://us02web.zoom.us/rec/share/xyz" hintActive={false} />);
    expect(screen.getByTestId('link-guidance').textContent).toContain('cuts clips and makes content');
  });

  it('names the voice outcome for an article URL', () => {
    render(<LinkGuidance inputText="https://myblog.com/post" hintActive={false} />);
    expect(screen.getByTestId('link-guidance').textContent).toContain('learns how you write');
  });

  it('detection wins over the hint', () => {
    render(<LinkGuidance inputText="https://youtu.be/abc" hintActive={true} />);
    expect(screen.getByTestId('link-guidance').textContent).toContain('YouTube link.');
  });
});
