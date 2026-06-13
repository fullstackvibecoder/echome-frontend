import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoLibraryDrop } from './VideoLibraryDrop';

describe('VideoLibraryDrop', () => {
  it('renders the entry affordance with the KB-feed truth statement', () => {
    render(<VideoLibraryDrop />);
    expect(screen.getByText(/add videos or links/i)).toBeInTheDocument();
    expect(screen.getByText(/teach me your voice/i)).toBeInTheDocument();
  });

  it('adds a pasted link to the tray', async () => {
    render(<VideoLibraryDrop />);
    const input = screen.getByPlaceholderText(/paste a youtube or zoom link/i);
    await userEvent.type(input, 'https://youtu.be/abc123');
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));
    expect(screen.getByText('https://youtu.be/abc123')).toBeInTheDocument();
    expect(screen.getByText(/stockpile/i)).toBeInTheDocument();
  });
});
