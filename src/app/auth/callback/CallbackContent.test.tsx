import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: () => getSession() } } }));

const kbList = vi.fn();
const kbGetContent = vi.fn();
const wbtwOutcome = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    kb: { list: () => kbList(), getContent: (id: string) => kbGetContent(id) },
    wbtw: { outcome: () => wbtwOutcome() },
  },
}));

import CallbackContent from './CallbackContent';

function signedIn() {
  getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
}
function newUser() {
  kbList.mockResolvedValue({ success: true, data: [] });
  wbtwOutcome.mockResolvedValue({ outcome: null });
}
function onboardedUser() {
  kbList.mockResolvedValue({ success: true, data: [{ id: 'kb1' }] });
  kbGetContent.mockResolvedValue({ success: true, data: { items: [{}] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  signedIn();
});

// R-08: a brand-new Google signup coming from a partner /redeem link or the
// Claude connect consent screen must land back there, not in onboarding.
describe('auth callback routing', () => {
  it('sends a NEW user to the stored return path, skipping onboarding', async () => {
    newUser();
    localStorage.setItem('redirectAfterLogin', '/redeem?code=partner');
    render(<CallbackContent />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/redeem?code=partner'));
    expect(push).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
  });

  it('sends a new user with no return path to onboarding', async () => {
    newUser();
    render(<CallbackContent />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/onboarding/lookup'));
  });

  it('sends an onboarded user to the stored return path', async () => {
    onboardedUser();
    localStorage.setItem('redirectAfterLogin', '/oauth/authorize?client_id=ecc_1');
    render(<CallbackContent />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/oauth/authorize?client_id=ecc_1'));
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com'])('ignores and clears an unsafe stored path %s', async (bad) => {
    onboardedUser();
    localStorage.setItem('redirectAfterLogin', bad);
    render(<CallbackContent />);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
  });
});
