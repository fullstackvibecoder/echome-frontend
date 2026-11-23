import { describe, it, expect, vi, beforeEach } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: { create: () => ({ get: vi.fn(), post: postMock, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }) },
}));

import { api } from './api-client';

// R-03: Echo Teams is billed per voice. The picked voice count must reach the
// backend, and only for Teams.
describe('stripe checkout and switch quantity', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { success: true, data: {} } });
  });

  it('sends the voice count with an echo-teams checkout', async () => {
    await api.stripe.createCheckoutSession('echo-teams', 'month', 4);
    expect(postMock.mock.calls[0][0]).toBe('/stripe/checkout');
    expect(postMock.mock.calls[0][1]).toEqual(expect.objectContaining({ planId: 'echo-teams', quantity: 4 }));
  });

  it('sends no quantity for other plans', async () => {
    await api.stripe.createCheckoutSession('echo-studio', 'month', 4);
    expect(postMock.mock.calls[0][1]).not.toHaveProperty('quantity');
  });

  it('sends the voice count with an echo-teams switch', async () => {
    await api.stripe.switchPlan('echo-teams', 'year', 3);
    expect(postMock.mock.calls[0][1]).toEqual({ planId: 'echo-teams', billingInterval: 'year', quantity: 3 });
  });
});
