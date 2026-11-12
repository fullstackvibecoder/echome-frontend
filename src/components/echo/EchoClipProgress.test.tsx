import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EchoClipProgress } from './EchoClipProgress';
import { EchoExchange } from './EchoExchange';
import { api } from '@/lib/api-client';
import type { EchoState } from './useEcho';

vi.mock('@/lib/api-client', () => ({
  api: { clips: { getJob: vi.fn(), get: vi.fn() } },
}));

const getJob = vi.mocked(api.clips.getJob);
const getUpload = vi.mocked(api.clips.get);

function job(over: Record<string, unknown>) {
  return { success: true, data: { job: { id: 'j1', progressPercent: 0, stepsCompleted: [], ...over } } } as never;
}
function upload(over: Record<string, unknown>) {
  return { success: true, data: { upload: { id: 'u1', progressPercent: 0, ...over }, clips: [], contentKit: null } } as never;
}

async function flush(ms = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

describe('EchoClipProgress', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { vi.useRealTimers(); });

  it('shows an indeterminate bar during download and ticks elapsed', async () => {
    getJob.mockResolvedValue(job({ status: 'transcribing', currentStep: 'Downloading video...', progressPercent: 5, startedAt: new Date(Date.now() - 65000).toISOString() }));
    getUpload.mockResolvedValue(upload({ status: 'pending', progressPercent: 5 }));
    render(<EchoClipProgress uploadId="u1" jobId="j1" onRetry={vi.fn()} />);
    await flush();
    expect(screen.getByText('Downloading your video')).toBeTruthy();
    expect(screen.getByTestId('clip-bar-indeterminate')).toBeTruthy();
    expect(screen.getByTestId('clip-elapsed').textContent).toBe('1:05');
    await flush(1000);
    expect(screen.getByTestId('clip-elapsed').textContent).toBe('1:06');
    expect(screen.getByText(/You can leave this page/)).toBeTruthy();
  });

  it('shows a real percent merged from the upload row while cutting', async () => {
    getJob.mockResolvedValue(job({ status: 'extracting', progressPercent: 55 }));
    getUpload.mockResolvedValue(upload({ status: 'extracting', progressPercent: 72 }));
    render(<EchoClipProgress uploadId="u1" jobId="j1" onRetry={vi.fn()} />);
    await flush();
    expect(screen.getByText('Cutting clips')).toBeTruthy();
    expect(screen.getByTestId('clip-bar-fill').style.width).toBe('72%');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('72');
  });

  it('renders done with a link and stops polling', async () => {
    getJob.mockResolvedValue(job({ status: 'completed', progressPercent: 100 }));
    getUpload.mockResolvedValue(upload({ status: 'completed', progressPercent: 100 }));
    render(<EchoClipProgress uploadId="u1" jobId="j1" onRetry={vi.fn()} />);
    await flush();
    expect(screen.getByText('Your clips are ready')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/app/library/u1');
    const calls = getJob.mock.calls.length;
    await flush(10000);
    expect(getJob.mock.calls.length).toBe(calls);
  });

  it('renders the friendly failure message, not the raw error, and retries', async () => {
    const onRetry = vi.fn();
    getJob.mockResolvedValue(job({ status: 'failed', errorMessage: 'ECONNRESET raw stack' }));
    getUpload.mockResolvedValue(upload({ status: 'failed', statusMessage: 'This video is private.' }));
    render(<EchoClipProgress uploadId="u1" jobId="j1" onRetry={onRetry} />);
    await flush();
    expect(screen.getByText('This video is private.')).toBeTruthy();
    expect(screen.queryByText(/ECONNRESET/)).toBeNull();
    fireEvent.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
    const calls = getJob.mock.calls.length;
    await flush(10000);
    expect(getJob.mock.calls.length).toBe(calls);
  });

  it('keeps polling through a transient error and stops on unmount', async () => {
    getJob.mockRejectedValueOnce(new Error('network')).mockResolvedValue(job({ status: 'analyzing', progressPercent: 40 }));
    getUpload.mockRejectedValue(new Error('network'));
    const { unmount } = render(<EchoClipProgress uploadId="u1" jobId="j1" onRetry={vi.fn()} />);
    await flush();
    expect(screen.queryByTestId('clip-progress-failed')).toBeNull();
    await flush(3000);
    expect(screen.getByText('Finding the best moments')).toBeTruthy();
    unmount();
    const calls = getJob.mock.calls.length;
    await flush(10000);
    expect(getJob.mock.calls.length).toBe(calls);
  });
});

describe('EchoExchange done card', () => {
  const base = {
    phase: 'done', inputText: '', attachment: null, attachmentError: null, attachmentNote: null,
    classification: null, selectedIntent: null, answer: null, receipts: [], error: null,
    confirmation: { title: 'Clipping your video', detail: 'Making content now' }, clipJob: null,
    videoUrlTarget: null, videoFileTarget: null, fileUploadProgress: null, savedVideos: null,
    savedCount: null, videoOwnership: null, ingestPhase: null, pendingAction: null, answerUpsell: false,
  } as unknown as EchoState;
  const handlers = {
    setInputText: vi.fn(), submit: vi.fn(), selectIntent: vi.fn(), confirm: vi.fn(), reset: vi.fn(),
    chooseOwnership: vi.fn(), chooseDestination: vi.fn(), chooseFileDestination: vi.fn(),
    clipSavedVideo: vi.fn(), confirmAction: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    getJob.mockResolvedValue(job({ status: 'analyzing', progressPercent: 40 }));
    getUpload.mockResolvedValue(upload({ status: 'analyzing', progressPercent: 40 }));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('shows live progress and no "Echo can use this now." for a clip job', async () => {
    render(<EchoExchange state={{ ...base, clipJob: { uploadId: 'u1', jobId: 'j1' } }} handlers={handlers} />);
    await flush();
    expect(screen.getByTestId('clip-progress-running')).toBeTruthy();
    expect(screen.queryByText('Echo can use this now.')).toBeNull();
  });

  it('keeps "Echo can use this now." for ingests', () => {
    render(<EchoExchange state={{ ...base, confirmation: { title: 'Added to your Voice', detail: 'x' } }} handlers={handlers} />);
    expect(screen.getByText('Echo can use this now.')).toBeTruthy();
  });
});
