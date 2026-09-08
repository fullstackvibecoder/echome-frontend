import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockReplace = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (k: string) => mockGet(k),
    toString: () => {
      const v = mockGet('tab');
      return v ? `tab=${v}` : '';
    },
  }),
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('./ContentKitContent', () => ({
  default: () => <div data-testid="kits-content" />,
}));
vi.mock('./ReelsContent', () => ({
  default: () => <div data-testid="reels-content" />,
}));
vi.mock('../toolkit/CreatorLibraryContent', () => ({
  default: () => <div data-testid="toolkit-content" />,
}));
vi.mock('../radar/FollowingContent', () => ({
  default: () => <div data-testid="radar-content" />,
}));

import LibraryTabs from './LibraryTabs';

function setTab(tab: string | null) {
  mockGet.mockImplementation((k: string) => (k === 'tab' ? tab : null));
}

describe('LibraryTabs', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', isAdmin: false } });
    setTab(null);
  });

  it('renders Kits by default', () => {
    render(<LibraryTabs />);
    expect(screen.getByTestId('kits-content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /kits/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows Kits, Toolkit, Radar tabs for non-admins and hides Reels', () => {
    render(<LibraryTabs />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual(['Kits', 'Toolkit', 'Radar']);
  });

  it('renders CreatorLibraryContent on ?tab=toolkit', () => {
    setTab('toolkit');
    render(<LibraryTabs />);
    expect(screen.getByTestId('toolkit-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kits-content')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /toolkit/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders FollowingContent on ?tab=radar', () => {
    setTab('radar');
    render(<LibraryTabs />);
    expect(screen.getByTestId('radar-content')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /radar/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores ?tab=reels for non-admins and falls back to Kits', () => {
    setTab('reels');
    render(<LibraryTabs />);
    expect(screen.getByTestId('kits-content')).toBeInTheDocument();
  });

  it('honors ?tab=reels for admins and shows the Reels tab', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', isAdmin: true } });
    setTab('reels');
    render(<LibraryTabs />);
    expect(screen.getByTestId('reels-content')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual(['Kits', 'Toolkit', 'Radar', 'Reels']);
  });

  it('falls back to Kits on an unknown tab value', () => {
    setTab('bogus');
    render(<LibraryTabs />);
    expect(screen.getByTestId('kits-content')).toBeInTheDocument();
  });

  it('writes ?tab=toolkit to the URL when the Toolkit tab is clicked', async () => {
    render(<LibraryTabs />);
    await userEvent.click(screen.getByRole('tab', { name: /toolkit/i }));
    expect(mockReplace).toHaveBeenCalledWith('/app/library?tab=toolkit', { scroll: false });
  });
});
