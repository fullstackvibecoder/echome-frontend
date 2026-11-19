import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ canAutoPost: true, autoPostBlockedReason: null }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/lib/api-client', () => ({
  api: {
    socialPosting: {
      listAccounts: vi.fn(),
      getAuthUrl: vi.fn(),
      disconnectAccount: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api-client';
import { ConnectedAccounts } from './ConnectedAccounts';

const list = vi.mocked(api.socialPosting.listAccounts);
const authUrl = vi.mocked(api.socialPosting.getAuthUrl);

function popupStub() {
  const popup = { closed: false };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  return popup;
}

async function startInstagram() {
  render(<ConnectedAccounts />);
  fireEvent.click(await screen.findByRole('button', { name: /connect account/i }));
  fireEvent.click(screen.getByRole('button', { name: /^instagram/i }));
}

describe('ConnectedAccounts: a connect that never came back', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    list.mockResolvedValue({ success: true, data: { accounts: [] } } as never);
    authUrl.mockResolvedValue({ success: true, data: { url: 'https://outstand.example/auth' } } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('says Instagram did not finish when the popup closes with no new account', async () => {
    const popup = popupStub();
    await startInstagram();
    await waitFor(() => expect(authUrl).toHaveBeenCalledWith('instagram'));
    popup.closed = true;
    await act(async () => { vi.advanceTimersByTime(1100); });
    expect(await screen.findByText("Instagram didn't finish connecting")).toBeTruthy();
    expect(screen.getByText(/Business or Creator account/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /email us/i }).getAttribute('href')).toMatch(/^mailto:support@tryechome\.com/);
  });

  it('offers help when the user comes back to the tab while the popup sits open', async () => {
    popupStub();
    await startInstagram();
    await waitFor(() => expect(authUrl).toHaveBeenCalled());
    await act(async () => { vi.advanceTimersByTime(16_000); });
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(await screen.findByText("Instagram didn't finish connecting")).toBeTruthy();
  });

  it('Try again starts a fresh connect', async () => {
    const popup = popupStub();
    await startInstagram();
    await waitFor(() => expect(authUrl).toHaveBeenCalledTimes(1));
    popup.closed = true;
    await act(async () => { vi.advanceTimersByTime(1100); });
    fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
    await waitFor(() => expect(authUrl).toHaveBeenCalledTimes(2));
  });

  it('shows no help when the account arrives', async () => {
    const popup = popupStub();
    await startInstagram();
    await waitFor(() => expect(authUrl).toHaveBeenCalled());
    list.mockResolvedValue({
      success: true,
      data: { accounts: [{ id: 'a1', outstandAccountId: 'x', platform: 'instagram', platformUsername: 'aramammo', platformAvatarUrl: null, connectedAt: new Date().toISOString(), status: 'connected' }] },
    } as never);
    popup.closed = true;
    await act(async () => { vi.advanceTimersByTime(1100); });
    await waitFor(() => expect(screen.getByText('@aramammo')).toBeTruthy());
    expect(screen.queryByText("Instagram didn't finish connecting")).toBeNull();
  });
});
