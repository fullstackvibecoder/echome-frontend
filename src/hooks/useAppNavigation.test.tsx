import { renderHook } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/contexts/navigation-context', () => ({
  useNavigationContext: () => ({
    isMobileMenuOpen: false,
    toggleMobileMenu: vi.fn(),
    closeMobileMenu: vi.fn(),
  }),
}));

import {
  useAppNavigation,
  NAV_GROUPS,
  ADMIN_NAV_GROUP,
  DEMOTED_OWNER,
  navHref,
} from './useAppNavigation';

function activeFor(pathname: string) {
  mockUsePathname.mockReturnValue(pathname);
  const { result } = renderHook(() => useAppNavigation());
  return result.current.activeItem;
}

describe('NAV_GROUPS shape', () => {
  it('is a single group with exactly the four primary items', () => {
    expect(NAV_GROUPS).toHaveLength(1);
    expect(NAV_GROUPS[0].items.map((i) => i.id)).toEqual(['create', 'library', 'calendar', 'settings']);
    expect(NAV_GROUPS[0].items.map((i) => i.path)).toEqual(['/app', '/app/library', '/app/calendar', '/app/settings']);
  });

  it('keeps the admin group intact', () => {
    expect(ADMIN_NAV_GROUP.items.map((i) => i.id)).toEqual(['admin', 'admin-drafts']);
  });
});

describe('navHref', () => {
  it('returns path alone when no query', () => {
    expect(navHref({ id: 'x', label: 'X', icon: Sparkles, path: '/app/library' })).toBe('/app/library');
  });

  it('appends query when present', () => {
    expect(navHref({ id: 'x', label: 'X', icon: Sparkles, path: '/app/library', query: 'tab=reels' })).toBe(
      '/app/library?tab=reels',
    );
  });
});

describe('useAppNavigation activeItem', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/app');
  });

  it('is create on /app exactly', () => {
    expect(activeFor('/app')).toBe('create');
  });

  it('is library on /app/library (spec test 7, query never reaches usePathname)', () => {
    expect(activeFor('/app/library')).toBe('library');
  });

  it('is library on demoted toolkit and radar routes (spec test 4)', () => {
    expect(activeFor('/app/toolkit')).toBe('library');
    expect(activeFor('/app/radar')).toBe('library');
  });

  it('is settings on demoted billing and developers routes (spec test 5)', () => {
    expect(activeFor('/app/billing')).toBe('settings');
    expect(activeFor('/app/developers')).toBe('settings');
  });

  it('is create on demoted voice route (spec test 6)', () => {
    expect(activeFor('/app/voice')).toBe('create');
    expect(activeFor('/app/voice/anything')).toBe('create');
  });

  it('is admin on admin dashboard', () => {
    expect(activeFor('/app/admin/dashboard')).toBe('admin');
  });

  it('is null on an unknown app path, not create', () => {
    expect(activeFor('/app/some-unknown-page')).toBeNull();
  });

  it('does not match a demoted prefix without a path boundary', () => {
    expect(activeFor('/app/voicemail')).toBeNull();
  });

  it('exposes the demoted owner map', () => {
    expect(DEMOTED_OWNER).toEqual({
      '/app/voice': 'create',
      '/app/toolkit': 'library',
      '/app/radar': 'library',
      '/app/billing': 'settings',
      '/app/developers': 'settings',
    });
  });
});
