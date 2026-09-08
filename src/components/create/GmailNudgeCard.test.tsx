import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getStatus = vi.fn();
const connectGmail = vi.fn();
const dismissGmailNudge = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    social: {
      getStatus: () => getStatus(),
      connectGmail: (...a: unknown[]) => connectGmail(...a),
      dismissGmailNudge: () => dismissGmailNudge(),
    },
  },
}));

const showErrorToast = vi.fn();
const showSuccessToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  showErrorToast: (...a: unknown[]) => showErrorToast(...a),
  showSuccessToast: (...a: unknown[]) => showSuccessToast(...a),
}));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: (...a: unknown[]) => replace(...a) }),
  useSearchParams: () => searchParams,
}));

import { GmailNudgeCard } from './GmailNudgeCard';

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;

describe('GmailNudgeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'true';
    searchParams = new URLSearchParams();
  });

  afterEach(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = ORIGINAL_FLAG;
    }
  });

  it('renders nothing and calls nothing when the flag is off', () => {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'false';
    const { container } = render(<GmailNudgeCard />);
    expect(container).toBeEmptyDOMElement();
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('renders nothing when the backend says not eligible', async () => {
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: false, timestamp: 'now' });
    const { container } = render(<GmailNudgeCard />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the status call fails', async () => {
    getStatus.mockRejectedValue(new Error('offline'));
    const { container } = render(<GmailNudgeCard />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it('renders the spec copy when eligible', async () => {
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: true, timestamp: 'now' });
    render(<GmailNudgeCard />);
    expect(await screen.findByText('Connect Gmail so Echo learns how you actually write.')).toBeInTheDocument();
    expect(
      screen.getByText('It reads sent mail only. Nothing is kept except your own words. Disconnect any time.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
  });

  it('Connect Gmail starts OAuth with return_to create', async () => {
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: true, timestamp: 'now' });
    connectGmail.mockResolvedValue({ success: true, data: { authUrl: 'https://g/auth', platform: 'gmail' } });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, assign }, writable: true });

    render(<GmailNudgeCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() => expect(connectGmail).toHaveBeenCalledWith('create'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://g/auth'));

    Object.defineProperty(window, 'location', { value: original, writable: true });
  });

  it('Skip for now dismisses on the backend and hides the card', async () => {
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: true, timestamp: 'now' });
    dismissGmailNudge.mockResolvedValue({ success: true, data: { dismissed: true } });
    const { container } = render(<GmailNudgeCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(dismissGmailNudge).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('hides the card even if the dismiss call fails', async () => {
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: true, timestamp: 'now' });
    dismissGmailNudge.mockRejectedValue(new Error('boom'));
    const { container } = render(<GmailNudgeCard />);
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows a success toast and clears the url on ?gmail=connected', async () => {
    searchParams = new URLSearchParams('gmail=connected');
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: false, timestamp: 'now' });
    render(<GmailNudgeCard />);
    await waitFor(() =>
      expect(showSuccessToast).toHaveBeenCalledWith('Gmail connected. Echo is reading your sent mail.'),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/app'));
  });

  it('shows an error toast and clears the url on ?gmail=error', async () => {
    searchParams = new URLSearchParams('gmail=error');
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: false, timestamp: 'now' });
    render(<GmailNudgeCard />);
    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith('Gmail connect failed. Try again from Settings.'),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/app'));
  });

  it('does nothing when there is no gmail param', async () => {
    getStatus.mockResolvedValue({ success: true, data: [], nudgeEligible: false, timestamp: 'now' });
    render(<GmailNudgeCard />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(showErrorToast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does nothing on ?gmail=connected when the flag is off', () => {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'false';
    searchParams = new URLSearchParams('gmail=connected');
    render(<GmailNudgeCard />);
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(getStatus).not.toHaveBeenCalled();
  });
});
