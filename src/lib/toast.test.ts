import { describe, it, expect, vi, beforeEach } from 'vitest';

const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import { showErrorToast } from './toast';

describe('showErrorToast', () => {
  beforeEach(() => {
    toastErrorMock.mockClear();
  });

  it('does not call sonner for a 402 (payment required) axios error', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 402,
        data: { error: 'Subscription required' },
      },
    };

    showErrorToast(error);

    // The global api-client interceptor already fires the "Subscription
    // required" toast (with a "View Plans" action) for every 402 response.
    // showErrorToast must return early so users don't see a second toast.
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('still calls sonner for a non-402 axios error', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 500,
        data: { error: 'Something went wrong on our end.' },
      },
    };

    showErrorToast(error);

    expect(toastErrorMock).toHaveBeenCalledTimes(1);
  });
});
