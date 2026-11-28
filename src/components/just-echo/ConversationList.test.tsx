import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationList } from './ConversationList';

const logout = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Ana Lee', email: 'ana@x.com', avatar: undefined }, logout }),
}));
vi.mock('@/components/ds/ThemeSwitch', () => ({ ThemeSwitch: () => <div data-testid="theme" /> }));

const convs = [
  { id: 'a', title: null, updatedAt: '2026-11-25T00:00:00Z', thumbnailUrl: null, jobRunning: true },
  { id: 'b', title: 'Second', updatedAt: '2026-11-25T00:00:00Z', thumbnailUrl: null, jobRunning: false },
];
const props = { loading: false, activeId: 'b', onNew: vi.fn(), onSearch: vi.fn(), onPick: vi.fn() };

describe('ConversationList', () => {
  it('ConversationList shows the running dot and the untitled fallback', () => {
    render(<ConversationList {...props} conversations={convs} />);
    expect(screen.getByText('New conversation')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Working')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Second/ })).toHaveClass('bg-je-tint');
  });

  it('shows the empty copy', () => {
    render(<ConversationList {...props} conversations={[]} />);
    expect(screen.getByText('Your conversations will show up here.')).toBeInTheDocument();
  });

  it('ConversationList calls onSearch, onNew and onPick', async () => {
    const user = userEvent.setup();
    const p = { ...props, onNew: vi.fn(), onSearch: vi.fn(), onPick: vi.fn() };
    render(<ConversationList {...p} conversations={convs} />);
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(p.onSearch).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'New' }));
    expect(p.onNew).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Second/ }));
    expect(p.onPick).toHaveBeenCalledWith('b');
  });

  it('avatar menu links to the classic view', () => {
    render(<ConversationList {...props} conversations={[]} />);
    expect(screen.getByRole('link', { name: 'Classic view' })).toHaveAttribute('href', '/app?classic=1');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/app/settings');
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/app/billing');
    expect(screen.getByRole('link', { name: 'Developers' })).toHaveAttribute('href', '/app/developers');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/app/profile');
  });

  it('signs out', async () => {
    const user = userEvent.setup();
    render(<ConversationList {...props} conversations={[]} />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalled();
  });
});
