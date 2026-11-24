import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let pathname = '/app';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { ServiceNotice, SERVICE_NOTICE } from './service-notice';

describe('ServiceNotice', () => {
  it.skipIf(SERVICE_NOTICE)('renders nothing while no notice is set', () => {
    render(<ServiceNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  beforeEach(() => {
    sessionStorage.clear();
    pathname = '/app';
  });

  it.skipIf(!SERVICE_NOTICE)('shows the notice on app pages', async () => {
    render(<ServiceNotice />);
    expect(await screen.findByRole('status')).toHaveTextContent(SERVICE_NOTICE?.message ?? '');
  });

  it('stays off marketing pages', () => {
    pathname = '/';
    render(<ServiceNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.skipIf(!SERVICE_NOTICE)('hides for the session once dismissed', async () => {
    const { unmount } = render(<ServiceNotice />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('serviceNoticeDismissed')).toBe(SERVICE_NOTICE?.id);
    unmount();
    render(<ServiceNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
