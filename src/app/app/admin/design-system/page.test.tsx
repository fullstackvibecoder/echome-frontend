import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DesignSystemPage from './page';
import AdminLayout from '../layout';

const auth = vi.hoisted(() => ({ user: { isAdmin: true } as { isAdmin: boolean } | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/admin/design-system' }));
vi.mock('@/lib/api-client', () => ({
  api: { help: { adminUnreadCount: () => Promise.resolve({ success: true, count: 0 }) } },
}));

describe('DesignSystemPage', () => {
  it('renders nothing for non-admins', () => {
    auth.user = { isAdmin: false };
    const { container } = render(<DesignSystemPage />);
    expect(container).toBeEmptyDOMElement();
    auth.user = null;
    const b = render(<DesignSystemPage />);
    expect(b.container).toBeEmptyDOMElement();
    auth.user = { isAdmin: true };
  });

  it('shows a Dark and a Light column and the live theme switch', () => {
    const { container } = render(<DesignSystemPage />);
    expect(screen.getByRole('heading', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    const forced = Array.from(container.querySelectorAll('[data-je-theme]')).map((el) =>
      el.getAttribute('data-je-theme'),
    );
    expect(forced).toEqual(['dark', 'light']);
  });

  it('does not override ds component size through className on row thumbs', () => {
    const { container } = render(<DesignSystemPage />);
    expect(container.querySelector('.w-10.w-full')).toBeNull();
  });

  it('is linked from the admin tab list', async () => {
    render(<AdminLayout>x</AdminLayout>);
    expect(await screen.findByRole('link', { name: 'Design' })).toHaveAttribute('href', '/app/admin/design-system');
  });
});
