// src/app/onboarding/lookup/connect/ConnectContent.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => search,
}));

const connectGmail = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { social: { connectGmail: (...args: unknown[]) => connectGmail(...args) } },
}));

const showSuccessToast = vi.fn();
const showErrorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  showSuccessToast: (...args: unknown[]) => showSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => showErrorToast(...args),
}));

import ConnectContent from './ConnectContent';

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;

describe('ConnectContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = new URLSearchParams();
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'true';
  });

  afterEach(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = ORIGINAL_FLAG;
    }
  });

  it('bounces to /app when the flag is off', () => {
    process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED = 'false';
    render(<ConnectContent />);
    expect(replace).toHaveBeenCalledWith('/app');
  });

  it('renders the spec copy and both buttons', () => {
    render(<ConnectContent />);
    expect(screen.getByText('Connect Gmail so Echo learns how you actually write.')).toBeInTheDocument();
    expect(
      screen.getByText('It reads sent mail only. Nothing is kept except your own words. Disconnect any time.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument();
  });

  it('Skip for now goes to /app', async () => {
    render(<ConnectContent />);
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(push).toHaveBeenCalledWith('/app');
  });

  it('Connect Gmail asks the backend for an auth url with return_to onboarding and redirects', async () => {
    connectGmail.mockResolvedValue({
      success: true,
      data: { authUrl: 'https://accounts.google.com/o/oauth2/auth?x=1', platform: 'gmail' },
    });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, assign }, writable: true });

    render(<ConnectContent />);
    await userEvent.click(screen.getByRole('button', { name: 'Connect Gmail' }));

    await waitFor(() => expect(connectGmail).toHaveBeenCalledWith('onboarding'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth?x=1'));

    Object.defineProperty(window, 'location', { value: original, writable: true });
  });

  it('shows an error toast and stays put when the connect call fails', async () => {
    connectGmail.mockRejectedValue(new Error('boom'));
    render(<ConnectContent />);
    await userEvent.click(screen.getByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it('?gmail=connected toasts success and moves on to /app', () => {
    search = new URLSearchParams('gmail=connected');
    render(<ConnectContent />);
    expect(showSuccessToast).toHaveBeenCalledWith('Gmail connected. Echo is reading your sent mail.');
    expect(replace).toHaveBeenCalledWith('/app');
  });

  it('?gmail=error toasts an error and stays on the page', () => {
    search = new URLSearchParams('gmail=error');
    render(<ConnectContent />);
    expect(showErrorToast).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
  });
});
