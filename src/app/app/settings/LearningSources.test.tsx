import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SocialIntegration } from '@/types';

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => search,
}));

let isFreeUser = true;
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isFreeUser, tier: isFreeUser ? 'free' : 'studio', subscription: null }),
}));

const getStatus = vi.fn();
const connectGmail = vi.fn();
const disconnect = vi.fn();
const syncGmail = vi.fn();
const getGmailSyncStatus = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    social: {
      getStatus: () => getStatus(),
      connectGmail: (...a: unknown[]) => connectGmail(...a),
      disconnect: (...a: unknown[]) => disconnect(...a),
      syncGmail: () => syncGmail(),
      getGmailSyncStatus: (...a: unknown[]) => getGmailSyncStatus(...a),
    },
  },
}));

const showSuccessToast = vi.fn();
const showErrorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  showSuccessToast: (...a: unknown[]) => showSuccessToast(...a),
  showErrorToast: (...a: unknown[]) => showErrorToast(...a),
}));

import LearningSources from './LearningSources';

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;

function gmail(overrides: Partial<SocialIntegration> = {}): SocialIntegration {
  return {
    id: 'int-1',
    platform: 'gmail',
    status: 'connected',
    itemCount: 212,
    lastSyncAt: '2026-09-01T07:00:00.000Z',
    syncMode: 'snapshot',
    activeJob: null,
    ...overrides,
  };
}

function statusWith(entries: SocialIntegration[]) {
  return { success: true, data: entries, timestamp: 'now' };
}

describe('LearningSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    search = new URLSearchParams();
    isFreeUser = true;
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'true';
  });

  afterEach(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = ORIGINAL_FLAG;
    }
  });

  it('renders nothing when the flag is off', () => {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'false';
    const { container } = render(<LearningSources />);
    expect(container).toBeEmptyDOMElement();
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('shows the not-connected state with a Connect Gmail button', async () => {
    getStatus.mockResolvedValue(statusWith([]));
    render(<LearningSources />);
    expect(await screen.findByText('Sources Echo learns from')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
  });

  it('Connect Gmail starts OAuth with return_to settings', async () => {
    getStatus.mockResolvedValue(statusWith([]));
    connectGmail.mockResolvedValue({ success: true, data: { authUrl: 'https://g/auth', platform: 'gmail' } });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, assign }, writable: true });

    render(<LearningSources />);
    await userEvent.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() => expect(connectGmail).toHaveBeenCalledWith('settings'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://g/auth'));

    Object.defineProperty(window, 'location', { value: original, writable: true });
  });

  it('shows the connected snapshot state for free users with upgrade hint', async () => {
    getStatus.mockResolvedValue(statusWith([gmail()]));
    render(<LearningSources />);
    expect(await screen.findByText('212 emails')).toBeInTheDocument();
    expect(screen.getByText('One-time snapshot, upgrade for weekly sync')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });

  it('shows Weekly sync and a Sync now button for paid incremental users', async () => {
    isFreeUser = false;
    getStatus.mockResolvedValue(statusWith([gmail({ syncMode: 'incremental' })]));
    render(<LearningSources />);
    expect(await screen.findByText('Weekly sync')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();
  });

  it('Sync now starts a job and polls until it completes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    isFreeUser = false;
    getStatus
      .mockResolvedValueOnce(statusWith([gmail({ syncMode: 'incremental' })]))
      .mockResolvedValueOnce(statusWith([gmail({ syncMode: 'incremental', itemCount: 230 })]));
    syncGmail.mockResolvedValue({ success: true, data: { jobId: 'job-1' } });
    getGmailSyncStatus
      .mockResolvedValueOnce({ success: true, data: { id: 'job-1', status: 'processing', scanned: 10, kept: 4 } })
      .mockResolvedValueOnce({ success: true, data: { id: 'job-1', status: 'completed', scanned: 40, kept: 18 } });

    render(<LearningSources />);
    await userEvent.click(await screen.findByRole('button', { name: 'Sync now' }));
    await waitFor(() => expect(syncGmail).toHaveBeenCalled());
    expect(await screen.findByText(/Syncing/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    await waitFor(() => expect(getGmailSyncStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('230 emails')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows the syncing state when the status already has an active job', async () => {
    getStatus.mockResolvedValue(
      statusWith([gmail({ activeJob: { id: 'job-9', status: 'processing', scanned: 120, kept: 33 } })]),
    );
    render(<LearningSources />);
    expect(await screen.findByText(/Syncing/)).toBeInTheDocument();
    expect(screen.getByText(/120 scanned/)).toBeInTheDocument();
  });

  it('shows Retry sync for a free user when the last backfill failed', async () => {
    getStatus.mockResolvedValue(
      statusWith([gmail({ activeJob: { id: 'job-5', status: 'failed', scanned: 400, kept: 232 } })]),
    );
    syncGmail.mockResolvedValue({ success: true, data: { jobId: 'job-6', mode: 'backfill' } });
    getGmailSyncStatus.mockResolvedValue({
      success: true,
      data: { id: 'job-6', status: 'processing', scanned: 0, kept: 0 },
    });
    render(<LearningSources />);
    expect(await screen.findByText('Last sync did not finish')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry sync' }));
    await waitFor(() => expect(syncGmail).toHaveBeenCalled());
    expect(await screen.findByText(/Syncing/)).toBeInTheDocument();
  });

  it('shows Needs reconnect with a Reconnect button when expired', async () => {
    getStatus.mockResolvedValue(statusWith([gmail({ status: 'expired' })]));
    render(<LearningSources />);
    expect(await screen.findByText('Needs reconnect')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
  });

  it('Disconnect opens a confirm dialog with the purge warning, then disconnects', async () => {
    getStatus
      .mockResolvedValueOnce(statusWith([gmail()]))
      .mockResolvedValueOnce(statusWith([]));
    disconnect.mockResolvedValue({ success: true, data: { itemsDeleted: 212, vectorsDeleted: 900 } });

    render(<LearningSources />);
    await userEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));
    expect(screen.getByRole('heading', { name: 'Disconnect Gmail' })).toBeInTheDocument();
    expect(
      screen.getByText('This removes everything Echo learned from your Gmail. This cannot be undone.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Disconnect Gmail' }));
    await waitFor(() => expect(disconnect).toHaveBeenCalledWith('gmail'));
    expect(await screen.findByText('Not connected')).toBeInTheDocument();
  });

  it('shows Disconnecting while the purge is in flight and flips to Not connected before the status reload', async () => {
    let resolveDisconnect: (value: unknown) => void = () => {};
    disconnect.mockReturnValue(new Promise((resolve) => { resolveDisconnect = resolve; }));
    // Status reload never resolves: the UI must not depend on it to leave the connected state.
    getStatus
      .mockResolvedValueOnce(statusWith([gmail()]))
      .mockReturnValueOnce(new Promise(() => {}));

    render(<LearningSources />);
    await userEvent.click(await screen.findByRole('button', { name: 'Disconnect' }));
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect Gmail' }));

    const pending = await screen.findByRole('button', { name: 'Disconnecting' });
    expect(pending).toBeDisabled();

    resolveDisconnect({ success: true, data: { itemsDeleted: 1, vectorsDeleted: 1 } });
    expect(await screen.findByText('Not connected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disconnecting' })).not.toBeInTheDocument();
  });

  it('toasts success when landing with ?gmail=connected', async () => {
    search = new URLSearchParams('tab=connections&gmail=connected');
    getStatus.mockResolvedValue(statusWith([gmail()]));
    render(<LearningSources />);
    await waitFor(() =>
      expect(showSuccessToast).toHaveBeenCalledWith('Gmail connected. Echo is reading your sent mail.'),
    );
    expect(replace).toHaveBeenCalledWith('/app/settings?tab=connections');
  });
});
