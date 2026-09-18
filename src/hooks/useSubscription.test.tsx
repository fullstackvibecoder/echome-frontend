import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSubscription = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  api: { stripe: { getSubscription: (...args: unknown[]) => getSubscription(...args) } },
}));

import { useSubscription } from './useSubscription';

describe('useSubscription isFreeUser', () => {
  beforeEach(() => {
    getSubscription.mockReset();
    localStorage.setItem('authToken', 'token');
  });

  it('is never true while the subscription is still loading (no free-plan banner flash for paid users)', async () => {
    let resolve!: (v: unknown) => void;
    getSubscription.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useSubscription());
    expect(result.current.loading).toBe(true);
    expect(result.current.isFreeUser).toBe(false);

    // Comped partner: no Stripe subscription, tier assigned on the user row.
    resolve({ success: true, data: { isSubscribed: true, tier: 'studio', status: 'active', freeGenerationsUsed: 0, freeGenerationsLimit: 5 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isFreeUser).toBe(false);
  });

  it('is true for a genuinely free user once loaded', async () => {
    getSubscription.mockResolvedValue({ success: true, data: { isSubscribed: false, tier: 'free', status: null, freeGenerationsUsed: 2, freeGenerationsLimit: 5 } });
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isFreeUser).toBe(true);
    expect(result.current.freeGenerationsRemaining).toBe(3);
  });
});
