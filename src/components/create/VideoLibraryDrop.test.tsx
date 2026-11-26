import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoLibraryDrop } from './VideoLibraryDrop';

describe('VideoLibraryDrop', () => {
  it('renders the entry affordance with the library statement', () => {
    render(<VideoLibraryDrop />);
    expect(screen.getByText(/add videos or links/i)).toBeInTheDocument();
    expect(screen.getByText(/add it to your library for future processing/i)).toBeInTheDocument();
  });

  it('omits Zoom from the placeholder while Zoom import is flagged off', () => {
    render(<VideoLibraryDrop />);
    expect(screen.getByPlaceholderText('Paste a YouTube link')).toBeInTheDocument();
  });

  it('clears the input on add and shows no tray (no ingest backend yet, fc37a49)', async () => {
    render(<VideoLibraryDrop />);
    const input = screen.getByPlaceholderText(/paste a youtube/i) as HTMLInputElement;
    await userEvent.type(input, 'https://youtu.be/abc123');
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));
    expect(input.value).toBe('');
    // Showing the link would imply ingestion that isn't happening.
    expect(screen.queryByText('https://youtu.be/abc123')).not.toBeInTheDocument();
    expect(screen.queryByText(/stockpile/i)).not.toBeInTheDocument();
  });
});
