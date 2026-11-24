import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let pathname = '/app';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { ServiceNotice, SERVICE_NOTICE } from './service-notice';

describe('ServiceNotice', () => {
  beforeEach(() => {
    sessionStorage.clear();
    pathname = '/app';
  });

  it('shows the notice on app pages', async () => {
    render(<ServiceNotice />);
    expect(await screen.findByRole('status')).toHaveTextContent(/long YouTube videos/i);
  });

  it('stays off marketing pages', () => {
    pathname = '/';
    render(<ServiceNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides for the session once dismissed', async () => {
    const { unmount } = render(<ServiceNotice />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('serviceNoticeDismissed')).toBe(SERVICE_NOTICE?.id);
    unmount();
    render(<ServiceNotice />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
