import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let authCb: ((event: string) => void) | null = null;
const unsubscribe = vi.fn();
const replace = vi.fn();
let pathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (e: string) => void) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  },
}));

import { RecoveryRedirectListener } from './RecoveryRedirectListener';

describe('RecoveryRedirectListener', () => {
  beforeEach(() => {
    authCb = null;
    replace.mockClear();
    unsubscribe.mockClear();
    pathname = '/';
  });

  it('routes to reset-password on PASSWORD_RECOVERY when elsewhere', () => {
    render(<RecoveryRedirectListener />);
    authCb!('PASSWORD_RECOVERY');
    expect(replace).toHaveBeenCalledWith('/auth/reset-password');
  });

  it('does nothing on PASSWORD_RECOVERY when already on the reset page', () => {
    pathname = '/auth/reset-password';
    render(<RecoveryRedirectListener />);
    authCb!('PASSWORD_RECOVERY');
    expect(replace).not.toHaveBeenCalled();
  });

  it('ignores non-recovery events', () => {
    render(<RecoveryRedirectListener />);
    authCb!('SIGNED_IN');
    expect(replace).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = render(<RecoveryRedirectListener />);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
