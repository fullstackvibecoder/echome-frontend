import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FailedUploadCard } from './FailedUploadCard';
import type { NormalizedContent } from '@/lib/content-normalizer';

function makeItem(upload: Record<string, unknown>): NormalizedContent {
  return {
    id: 'u1', type: 'video-upload', title: 'My video', status: 'failed', platforms: [],
    createdAt: new Date(), sourceId: 'u1', videoUploadId: 'u1',
    raw: { id: 'u1', sourceType: 'upload', status: 'failed', ...upload } as unknown as NormalizedContent["raw"],
  };
}

describe('FailedUploadCard', () => {
  it('shows the backend message and a working Try again for a file upload', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(<FailedUploadCard item={makeItem({ statusMessage: 'We could not read that file.', errorCode: 'processing_failed' })} onRetry={onRetry} onPasscode={vi.fn()} />);
    expect(screen.getByText('We could not read that file.')).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    await waitFor(() => expect(onRetry).toHaveBeenCalledWith('u1'));
  });

  it('shows the API error text inline when Try again fails', async () => {
    const onRetry = vi.fn().mockRejectedValue(new Error('You have used all your video minutes this month.'));
    render(<FailedUploadCard item={makeItem({ errorCode: 'x' })} onRetry={onRetry} onPasscode={vi.fn()} />);
    fireEvent.click(screen.getByText('Try again'));
    expect((await screen.findByRole('alert')).textContent).toBe('You have used all your video minutes this month.');
    // Button is usable again
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('falls back to a plain message and hides Try again for an incomplete upload', () => {
    render(<FailedUploadCard item={makeItem({ errorCode: 'upload_incomplete' })} onRetry={vi.fn()} onPasscode={vi.fn()} />);
    expect(screen.getByText('This video did not finish.')).toBeTruthy();
    expect(screen.getByText('Upload again')).toBeTruthy();
    expect(screen.queryByText('Try again')).toBeNull();
  });

  it('opens the passcode prompt for a zoom passcode failure', () => {
    const onPasscode = vi.fn();
    render(<FailedUploadCard item={makeItem({ sourceType: 'zoom', errorCode: 'zoom_password_required' })} onRetry={vi.fn()} onPasscode={onPasscode} />);
    fireEvent.click(screen.getByText('Enter passcode'));
    expect(onPasscode).toHaveBeenCalled();
  });

  it('offers both actions for a failed link', () => {
    render(<FailedUploadCard item={makeItem({ sourceType: 'youtube', errorCode: 'download_failed' })} onRetry={vi.fn()} onPasscode={vi.fn()} />);
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Upload the file instead')).toBeTruthy();
  });
});
