/**
 * VideoSourcesList.voice-sources.test.tsx
 *
 * Tests the video sources list on the Your Voice page (KnowledgeContent).
 * Verifies that:
 *   - saved videos are listed using api.kbContent.listSavedVideos
 *   - clicking Remove calls api.kbContent.removeVideoSource with the correct uploadId
 *   - the row disappears and the list refetches on success
 *   - the Remove button is disabled while removal is in flight
 *   - a failure shows an error message and a Retry control
 *
 * No em or en dashes in any asserted copy.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Module mock (must precede the import of the component) ----

vi.mock('@/lib/api-client', () => ({
  api: {
    kbContent: {
      listSavedVideos: vi.fn(),
      removeVideoSource: vi.fn(),
    },
  },
}));

// ---- Import component and mock references (after vi.mock) ----

import { api } from '@/lib/api-client';
import { VideoSourcesList } from './VideoSourcesList';

// ---- Fixtures ----

const VIDEO_A = {
  uploadId: 'vid-1',
  sourceUrl: 'https://youtube.com/watch?v=aaa',
  title: 'Talk at Conf',
  createdAt: '2026-06-01T00:00:00Z',
};

const VIDEO_B = {
  uploadId: 'vid-2',
  sourceUrl: 'https://youtube.com/watch?v=bbb',
  title: 'Product Demo',
  createdAt: '2026-06-02T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(api.kbContent.listSavedVideos).mockResolvedValue({
    success: true,
    videos: [VIDEO_A, VIDEO_B],
  });
  vi.mocked(api.kbContent.removeVideoSource).mockResolvedValue({ success: true });
});

// ---- Tests ----

describe('VideoSourcesList', () => {
  it('renders the list of video source titles from listSavedVideos', async () => {
    render(<VideoSourcesList />);
    await waitFor(() => {
      expect(screen.getByText('Talk at Conf')).toBeInTheDocument();
      expect(screen.getByText('Product Demo')).toBeInTheDocument();
    });
  });

  it('calls removeVideoSource with the correct uploadId when Remove is clicked', async () => {
    // After removal the refetch returns only the second video.
    vi.mocked(api.kbContent.listSavedVideos)
      .mockResolvedValueOnce({ success: true, videos: [VIDEO_A, VIDEO_B] })
      .mockResolvedValue({ success: true, videos: [VIDEO_B] });

    render(<VideoSourcesList />);
    await waitFor(() => expect(screen.getByText('Talk at Conf')).toBeInTheDocument());

    // Remove buttons are identified by the aria-label "Remove <title>"
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(api.kbContent.removeVideoSource).toHaveBeenCalledWith('vid-1');
    });
  });

  it('drops the row from the list and fires a refetch on successful removal', async () => {
    vi.mocked(api.kbContent.listSavedVideos)
      .mockResolvedValueOnce({ success: true, videos: [VIDEO_A, VIDEO_B] })
      .mockResolvedValue({ success: true, videos: [VIDEO_B] });

    render(<VideoSourcesList />);
    await waitFor(() => expect(screen.getByText('Talk at Conf')).toBeInTheDocument());

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    // Row disappears
    await waitFor(() => {
      expect(screen.queryByText('Talk at Conf')).not.toBeInTheDocument();
      expect(screen.getByText('Product Demo')).toBeInTheDocument();
    });

    // listSavedVideos called at least twice: initial load + refetch after remove
    expect(api.kbContent.listSavedVideos).toHaveBeenCalledTimes(2);
  });

  it('disables the Remove button on the targeted row while removal is in flight', async () => {
    // Hold the removal promise so we can assert the pending state.
    let resolveRemove: ((value: { success: boolean }) => void) | undefined;
    vi.mocked(api.kbContent.removeVideoSource).mockReturnValue(
      new Promise<{ success: boolean }>(r => {
        resolveRemove = r;
      }),
    );

    render(<VideoSourcesList />);
    await waitFor(() => expect(screen.getByText('Talk at Conf')).toBeInTheDocument());

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(removeButtons[0]).toBeDisabled());

    // Resolve so the test cleans up without leaving hanging promises.
    resolveRemove!({ success: true });
  });

  it('shows an error message and a Retry button when removal fails', async () => {
    vi.mocked(api.kbContent.removeVideoSource).mockRejectedValue(
      new Error('Server unavailable'),
    );

    render(<VideoSourcesList />);
    await waitFor(() => expect(screen.getByText('Talk at Conf')).toBeInTheDocument());

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Server unavailable')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    // The failed row must still be visible so the user can retry.
    expect(screen.getByText('Talk at Conf')).toBeInTheDocument();
  });

  it('clicking Retry re-invokes removeVideoSource for the failed row', async () => {
    vi.mocked(api.kbContent.removeVideoSource)
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValue({ success: true });

    render(<VideoSourcesList />);
    await waitFor(() => expect(screen.getByText('Talk at Conf')).toBeInTheDocument());

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    const retryBtn = await screen.findByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(api.kbContent.removeVideoSource).toHaveBeenCalledTimes(2);
      expect(api.kbContent.removeVideoSource).toHaveBeenNthCalledWith(2, 'vid-1');
    });
  });
});
