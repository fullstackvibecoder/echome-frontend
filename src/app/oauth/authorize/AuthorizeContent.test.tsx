import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const replace = vi.fn();
let auth = { isAuthenticated: true, loading: false };
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('client_id=ecc_1&state=s1&code_challenge=c&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcb'),
  useRouter: () => ({ replace, push: vi.fn() }),
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const check = vi.fn();
const decide = vi.fn();
vi.mock('@/lib/oauth-consent', async (orig) => ({
  ...(await orig<typeof import('@/lib/oauth-consent')>()),
  checkAuthorize: (...a: unknown[]) => check(...a),
  decideAuthorize: (...a: unknown[]) => decide(...a),
}));

import AuthorizeContent from './AuthorizeContent';

const assign = vi.fn();
beforeEach(() => {
  auth = { isAuthenticated: true, loading: false };
  replace.mockReset();
  check.mockReset();
  decide.mockReset();
  assign.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname: '/oauth/authorize', search: '?client_id=ecc_1', assign },
  });
  localStorage.clear();
});

const consent = {
  kind: 'consent',
  client: { name: 'Claude', logoUri: null, clientUri: null, redirectHost: 'claude.ai' },
  email: 'me@x.co',
  csrfToken: 't',
  silent: false,
};

describe('EchoMe in Claude consent page', () => {
  it('sends signed-out users to login and keeps the way back', async () => {
    auth = { isAuthenticated: false, loading: false };
    render(<AuthorizeContent />);
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(replace.mock.calls[0][0]).toBe('/auth/login?redirect=%2Foauth%2Fauthorize%3Fclient_id%3Decc_1');
    expect(localStorage.getItem('redirectAfterLogin')).toBe('/oauth/authorize?client_id=ecc_1');
    expect(check).not.toHaveBeenCalled();
  });

  it('shows the app, account and what it can do, then allows', async () => {
    check.mockResolvedValue(consent);
    decide.mockResolvedValue('https://claude.ai/cb?code=eac_1&state=s1');
    render(<AuthorizeContent />);
    expect(await screen.findByText(/Let Claude act as you in EchoMe/)).toBeTruthy();
    expect(screen.getByText('me@x.co')).toBeTruthy();
    expect(screen.getByText('Returns to claude.ai')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://claude.ai/cb?code=eac_1&state=s1'));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'ecc_1', state: 's1' }), 't', 'allow');
  });

  it('deny returns to the app with the denial', async () => {
    check.mockResolvedValue(consent);
    decide.mockResolvedValue('https://claude.ai/cb?error=access_denied&state=s1');
    render(<AuthorizeContent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://claude.ai/cb?error=access_denied&state=s1'));
    expect(decide.mock.calls[0][2]).toBe('deny');
  });

  it('finishes silently when the app is already approved', async () => {
    check.mockResolvedValue({ ...consent, silent: true });
    decide.mockResolvedValue('https://claude.ai/cb?code=eac_2&state=s1');
    render(<AuthorizeContent />);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://claude.ai/cb?code=eac_2&state=s1'));
    expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull();
  });

  it('shows errors and the Studio upgrade without redirecting', async () => {
    check.mockResolvedValueOnce({ kind: 'render_error', message: 'Unknown app.' });
    const { unmount } = render(<AuthorizeContent />);
    expect(await screen.findByText('Unknown app.')).toBeTruthy();
    unmount();
    check.mockResolvedValueOnce({ kind: 'plan_required', message: 'Studio only.' });
    render(<AuthorizeContent />);
    expect(await screen.findByText('Studio only.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See plans' })).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it('never navigates to an unsafe return address', async () => {
    check.mockResolvedValue({ kind: 'redirect', redirectTo: 'javascript:alert(1)' });
    render(<AuthorizeContent />);
    expect(await screen.findByText(/return somewhere unsafe/)).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});
