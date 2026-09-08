import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();
const mockUseVoiceContext = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/app',
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));
vi.mock('@/contexts/navigation-context', () => ({
  useNavigationContext: () => ({
    isMobileMenuOpen: false,
    toggleMobileMenu: vi.fn(),
    closeMobileMenu: vi.fn(),
  }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock('@/contexts/voice-context', () => ({
  useVoiceContext: () => mockUseVoiceContext(),
}));

import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';

const paidUser = { id: 'u1', name: 'Ara', email: 'ara@example.com', isAdmin: false };
const adminUser = { ...paidUser, isAdmin: true };

function voiceCtx(overrides: Partial<{ isTeamsUser: boolean; voices: unknown[] }> = {}) {
  return {
    activeVoice: null,
    voices: [],
    isTeamsUser: false,
    isTeamsTier: false,
    loading: false,
    voiceCount: 0,
    voiceLimit: 1,
    switchVoice: vi.fn(),
    ...overrides,
  };
}

function navLabels() {
  const nav = screen.getByRole('navigation', { name: /main navigation/i });
  return within(nav)
    .getAllByRole('button')
    .map((b) => b.textContent?.trim());
}

describe('Sidebar (desktop)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: paidUser, logout: vi.fn() });
    mockUseVoiceContext.mockReturnValue(voiceCtx());
  });

  it('shows exactly Create, Library, Calendar, Settings for a paid non-admin (spec test 1)', () => {
    render(<Sidebar />);
    expect(navLabels()).toEqual(['Create', 'Library', 'Calendar', 'Settings']);
    expect(screen.queryByText('Your Voice')).not.toBeInTheDocument();
    expect(screen.queryByText('Toolkit')).not.toBeInTheDocument();
    expect(screen.queryByText('Creator Radar')).not.toBeInTheDocument();
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
    expect(screen.queryByText('Developers')).not.toBeInTheDocument();
    expect(screen.queryByText('Guides')).not.toBeInTheDocument();
  });

  it('renders no group headers', () => {
    render(<Sidebar />);
    expect(screen.queryByText('Main')).not.toBeInTheDocument();
    expect(screen.queryByText('Discover')).not.toBeInTheDocument();
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
  });

  it('appends the admin group for admins (spec test 2)', () => {
    mockUseAuth.mockReturnValue({ user: adminUser, logout: vi.fn() });
    render(<Sidebar />);
    expect(navLabels()).toEqual(['Create', 'Library', 'Calendar', 'Settings', 'Admin', 'Drafts']);
  });

  it('gives Teams users a path to Team Voices through the VoiceSwitcher (spec test 3)', () => {
    mockUseVoiceContext.mockReturnValue(voiceCtx({ isTeamsUser: true, voices: [] }));
    render(<Sidebar />);
    const link = screen.getByRole('link', { name: /set up your voices/i });
    expect(link).toHaveAttribute('href', '/app/voice?tab=team');
    expect(navLabels()).toEqual(['Create', 'Library', 'Calendar', 'Settings']);
  });

  it('navigates through navHref on click', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: 'Library' }));
    expect(mockPush).toHaveBeenCalledWith('/app/library');
  });

  it('renders the AccountMenu trigger in the footer', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^logout$/i })).not.toBeInTheDocument();
  });
});

describe('MobileSidebar', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: paidUser, logout: vi.fn() });
    mockUseVoiceContext.mockReturnValue(voiceCtx());
  });

  it('renders nothing when closed', () => {
    const { container } = render(<MobileSidebar isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the same four items and the AccountMenu when open', () => {
    render(<MobileSidebar isOpen onClose={vi.fn()} />);
    expect(navLabels()).toEqual(['Create', 'Library', 'Calendar', 'Settings']);
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });

  it('shows the admin group for admins', () => {
    mockUseAuth.mockReturnValue({ user: adminUser, logout: vi.fn() });
    render(<MobileSidebar isOpen onClose={vi.fn()} />);
    expect(navLabels()).toEqual(['Create', 'Library', 'Calendar', 'Settings', 'Admin', 'Drafts']);
  });
});
