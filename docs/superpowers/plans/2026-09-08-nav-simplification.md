# Nav Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the app sidebar from 13 items in 5 labelled groups to 4 flat items (Create, Library, Calendar, Settings) while keeping every demoted route reachable and correctly highlighted.

**Architecture:** `NAV_GROUPS` in `useAppNavigation.ts` shrinks to one group; active-item matching gains a `DEMOTED_OWNER` map so demoted routes highlight their owner. Toolkit and Radar become Library tabs (`?tab=toolkit`, `?tab=radar`). Billing and Developers get links inside Settings. Guides, Community, and the two free tools move into a new `AccountMenu` popover that replaces the footer block in both sidebars. The legacy sidebar hint system is deleted.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind, lucide-react, vitest 4 + jsdom + @testing-library/react + @testing-library/user-event.

**Spec:** `docs/superpowers/specs/2026-09-08-nav-simplification-design.md`

## Global Constraints

- Repo: `/Users/aramammo/Side Quests/echome-frontend`, branch `feat/nav-simplification` (already exists, based on `develop`). Never commit to `develop` or `main` directly.
- Run tests with `npm run test:unit -- <path>` (this is `vitest run`). Type check with `npx tsc --noEmit`. Lint with `npm run lint`.
- `vitest.setup.ts` calls `cleanup()` in `beforeEach` and `vi.resetAllMocks()` in `afterEach`. Every `vi.fn()` return value MUST be set inside `beforeEach`, never at module scope, or the second test in a file sees `undefined`.
- Mocked modules must be declared with `vi.mock(...)` BEFORE the component import in the test file.
- No em dashes in any user-facing copy. Use periods or commas.
- Existing tests that MUST stay green: `src/app/app/AppContent.resting.test.tsx`, `src/components/create/VoiceStrengthStrip.test.tsx`, `src/app/app/settings/SettingsContent.test.tsx`.
- Out of scope: deleting any route, backend changes, mobile app, changes to what `/app` renders.
- Commit trailer on every commit:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9
  ```

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/hooks/useAppNavigation.ts` | Modify | Nav data (`NAV_GROUPS`, `ADMIN_NAV_GROUP`), `navHref`, `DEMOTED_OWNER`, active-item logic |
| `src/hooks/useAppNavigation.test.tsx` | Create | Active-item and `navHref` tests |
| `src/hooks/useFirstTimeUser.ts` | Modify | Drop sidebar hint state |
| `src/hooks/useFirstTimeUser.test.ts` | Create | Hook return shape |
| `src/components/AccountMenu.tsx` | Create | Avatar popover with external links + logout |
| `src/components/AccountMenu.test.tsx` | Create | Links + logout test |
| `src/components/sidebar.tsx` | Modify | Flat 4-item list, `AccountMenu` footer |
| `src/components/mobile-sidebar.tsx` | Modify | Same for mobile drawer |
| `src/components/sidebar.test.tsx` | Create | Item counts by role, Teams path |
| `src/app/app/library/LibraryTabs.tsx` | Modify | Add `toolkit` and `radar` tabs |
| `src/app/app/library/LibraryTabs.test.tsx` | Create | Tab to content-component mapping |
| `src/app/app/settings/SettingsContent.tsx` | Modify | "View plans" link, "Developers" card |
| `src/app/app/settings/SettingsContent.links.test.tsx` | Create | Link presence per tab |
| `src/app/app/demoted-routes.test.tsx` | Create | Each demoted page still renders its content |

---

### Task 1: Nav data and active-item logic

**Files:**
- Modify: `src/hooks/useAppNavigation.ts` (whole file, 137 lines)
- Test: `src/hooks/useAppNavigation.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `NavItem` gains `query?: string`. `path` is used for active matching; `query` only for navigation.
  - `export function navHref(item: NavItem): string` returns `item.query ? \`${item.path}?${item.query}\` : item.path`.
  - `export const DEMOTED_OWNER: Record<string, string>` maps demoted paths to owning nav id.
  - `useAppNavigation()` returns `activeItem: string | null` (was `string`). Tasks 2 and 3 compare `activeItem === item.id`, which is unaffected.
  - `NAV_GROUPS` is one group, label `'Main'`, items `create`, `library`, `calendar`, `settings`. `ADMIN_NAV_GROUP` unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useAppNavigation.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsePathname = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/hooks/useAppNavigation.test.tsx`
Expected: FAIL. `navHref` and `DEMOTED_OWNER` are not exported, `NAV_GROUPS` has length 5, `/app/toolkit` resolves to `toolkit`.

- [ ] **Step 3: Replace `src/hooks/useAppNavigation.ts` with the new implementation**

Overwrite the whole file:

```ts
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useNavigationContext } from '@/contexts/navigation-context';
import {
  Sparkles,
  Package,
  CalendarDays,
  Settings,
  BarChart3,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Pathname used for active-item matching. Never contains a query string. */
  path: string;
  /** Optional query string (without the leading `?`) appended only when navigating. */
  query?: string;
  comingSoon?: boolean;
  teamsOnly?: boolean;
  adminOnly?: boolean;
  external?: boolean;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Primary navigation. One flat group, four items. Everything else that used
 * to live here is reachable from inside these four surfaces:
 *   Your Voice   -> Create (VoiceStrengthStrip link) and /app/voice direct
 *   Toolkit      -> Library ?tab=toolkit
 *   Creator Radar-> Library ?tab=radar
 *   Reel Maker   -> Library ?tab=reels (admin)
 *   Billing      -> Settings Billing tab "View plans"
 *   Developers   -> Settings Account tab "Open Developers"
 *   Guides, Community, Video Compressor, YouTube Transcript -> AccountMenu
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { id: 'create', label: 'Create', icon: Sparkles, path: '/app' },
      { id: 'library', label: 'Library', icon: Package, path: '/app/library' },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/app/calendar' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
    ],
  },
];

export const ADMIN_NAV_GROUP: NavGroup = {
  label: 'Admin',
  items: [
    { id: 'admin', label: 'Admin', icon: BarChart3, path: '/app/admin/dashboard' },
    { id: 'admin-drafts', label: 'Drafts', icon: FileText, path: '/app/admin/drafts', adminOnly: true },
  ],
};

/**
 * Routes that no longer have their own sidebar item, mapped to the nav id
 * that should highlight while the user is on them. Keys are pathname
 * prefixes; matching requires a path boundary (`/app/voice` matches
 * `/app/voice` and `/app/voice/x`, never `/app/voicemail`).
 */
export const DEMOTED_OWNER: Record<string, string> = {
  '/app/voice': 'create',
  '/app/toolkit': 'library',
  '/app/radar': 'library',
  '/app/billing': 'settings',
  '/app/developers': 'settings',
};

/** Build the URL to navigate to for a nav item. */
export function navHref(item: NavItem): string {
  return item.query ? `${item.path}?${item.query}` : item.path;
}

export function getAllNavItems(): NavItem[] {
  return [...NAV_GROUPS.flatMap((g) => g.items), ...ADMIN_NAV_GROUP.items];
}

function atPathBoundary(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveActiveItem(pathname: string): string | null {
  if (pathname === '/app') return 'create';

  const direct = getAllNavItems().find(
    (item) => item.path !== '/app' && atPathBoundary(pathname, item.path),
  );
  if (direct) return direct.id;

  const demoted = Object.keys(DEMOTED_OWNER).find((prefix) => atPathBoundary(pathname, prefix));
  if (demoted) return DEMOTED_OWNER[demoted];

  return null;
}

export interface UseAppNavigationReturn {
  /** Id of the highlighted nav item, or null when no item owns the current route. */
  activeItem: string | null;
  navigate: (path: string, external?: boolean) => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export function useAppNavigation(): UseAppNavigationReturn {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useNavigationContext();

  const activeItem = resolveActiveItem(pathname);

  const navigate = (path: string, external?: boolean) => {
    if (external) {
      window.open(path, '_blank', 'noopener');
    } else {
      router.push(path);
    }
    closeMobileMenu();
  };

  return { activeItem, navigate, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu };
}
```

Note on `atPathBoundary`: the old code used bare `startsWith`, which is why `/app/library` stayed highlighted on `/app/library-anything`. The boundary check applies to primary items too. `/app/admin/dashboard` still matches `admin` because the pathname equals the item path.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/hooks/useAppNavigation.test.tsx`
Expected: PASS, 13 tests.

- [ ] **Step 5: Type check. The sidebars still compile because they only compare `activeItem === item.id`.**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit`
Expected: no errors. If `Waveform` or lucide icons are reported unused in the sidebars, ignore for now. Task 3 rewrites both sidebars.

- [ ] **Step 6: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/hooks/useAppNavigation.ts src/hooks/useAppNavigation.test.tsx
git commit -m "feat(nav): collapse NAV_GROUPS to four items and add demoted-route owner matching

Sidebar data goes from five labelled groups to one flat group of four.
NavItem splits path (matching) from query (navigation) so a query string
never leaks into pathname matching. DEMOTED_OWNER keeps Voice, Toolkit,
Radar, Billing and Developers highlighting their new owner. Unknown
routes now resolve to null instead of defaulting to Create.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9"
```

---

### Task 2: Remove sidebar hint state from `useFirstTimeUser`

**Files:**
- Modify: `src/hooks/useFirstTimeUser.ts` (whole file, 37 lines)
- Test: `src/hooks/useFirstTimeUser.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useFirstTimeUser()` returns `{ isFirstTime: boolean; dismissWelcome: () => void }` only. `AppContent.tsx:35` already destructures only these two. Task 3 removes the sidebar callers.

Note: Task 3 removes the only consumers of `sidebarHintsSeen` and `markSidebarHintSeen`. Until Task 3 lands, `tsc` will report those two names missing in `sidebar.tsx` and `mobile-sidebar.tsx`. That is expected; run `tsc` after Task 3.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useFirstTimeUser.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useFirstTimeUser } from './useFirstTimeUser';

describe('useFirstTimeUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes only isFirstTime and dismissWelcome', () => {
    const { result } = renderHook(() => useFirstTimeUser());
    expect(Object.keys(result.current).sort()).toEqual(['dismissWelcome', 'isFirstTime']);
  });

  it('is first time until dismissed, and persists dismissal', () => {
    const { result } = renderHook(() => useFirstTimeUser());
    expect(result.current.isFirstTime).toBe(true);
    act(() => result.current.dismissWelcome());
    expect(result.current.isFirstTime).toBe(false);
    expect(localStorage.getItem('echome_welcome_dismissed')).toBeTruthy();
  });

  it('never touches the legacy sidebar hints key', () => {
    localStorage.setItem('echome_sidebar_hints_seen', '{"knowledge":true}');
    renderHook(() => useFirstTimeUser());
    // Key is left alone (not read into state, not rewritten). Sidebar hints are gone.
    expect(localStorage.getItem('echome_sidebar_hints_seen')).toBe('{"knowledge":true}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/hooks/useFirstTimeUser.test.ts`
Expected: FAIL on the first test. Keys are `dismissWelcome, isFirstTime, markSidebarHintSeen, sidebarHintsSeen`.

- [ ] **Step 3: Replace `src/hooks/useFirstTimeUser.ts`**

Overwrite the whole file:

```ts
'use client';

import { useState, useCallback, useEffect } from 'react';

const WELCOME_KEY = 'echome_welcome_dismissed';

export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setIsFirstTime(!localStorage.getItem(WELCOME_KEY));
  }, []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, new Date().toISOString());
    setIsFirstTime(false);
  }, []);

  return { isFirstTime, dismissWelcome };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/hooks/useFirstTimeUser.test.ts src/app/app/AppContent.resting.test.tsx`
Expected: PASS for both files.

- [ ] **Step 5: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/hooks/useFirstTimeUser.ts src/hooks/useFirstTimeUser.test.ts
git commit -m "refactor(nav): drop sidebar hint state from useFirstTimeUser

The pulsing sidebar hint dots targeted nav ids that no longer exist.
Keep isFirstTime and dismissWelcome, which AppContent still uses.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9"
```

---

### Task 3: `AccountMenu` component and both sidebars

**Files:**
- Create: `src/components/AccountMenu.tsx`
- Test: `src/components/AccountMenu.test.tsx`
- Modify: `src/components/sidebar.tsx` (whole file)
- Modify: `src/components/mobile-sidebar.tsx` (whole file)
- Test: `src/components/sidebar.test.tsx`

**Interfaces:**
- Consumes from Task 1: `NAV_GROUPS`, `ADMIN_NAV_GROUP`, `useAppNavigation`, `navHref`, types `NavItem`, `NavGroup`.
- Consumes from Task 2: `useFirstTimeUser` no longer exports hint state, so the sidebars must not import it.
- Produces: `export function AccountMenu(props: { user: { name?: string; email?: string }; onLogout: () => void })`.

- [ ] **Step 1: Write the failing `AccountMenu` test (spec test 11)**

Create `src/components/AccountMenu.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('opens on avatar click and shows the four external links plus logout', async () => {
    const onLogout = vi.fn();
    render(<AccountMenu user={{ name: 'Ara', email: 'ara@example.com' }} onLogout={onLogout} />);

    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    const links = screen.getAllByRole('menuitem').filter((el) => el.tagName === 'A') as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/guides',
      '/community',
      '/tools/compress-video',
      '/tools/transcribe',
    ]);
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(screen.getAllByText('FREE')).toHaveLength(2);

    await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and on outside click', async () => {
    render(
      <div>
        <button>outside</button>
        <AccountMenu user={{ name: 'Ara', email: 'ara@example.com' }} onLogout={vi.fn()} />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: /account menu/i });

    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('falls back to U when the user has no name', () => {
    render(<AccountMenu user={{ email: 'x@example.com' }} onLogout={vi.fn()} />);
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveTextContent('U');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/components/AccountMenu.test.tsx`
Expected: FAIL, `Cannot find module './AccountMenu'`.

- [ ] **Step 3: Create `src/components/AccountMenu.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, MessageCircle, FileDown, FileText, LogOut, type LucideIcon } from 'lucide-react';

interface AccountMenuProps {
  user: { name?: string; email?: string };
  onLogout: () => void;
}

interface MenuLink {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

/**
 * External surfaces demoted out of the sidebar. All open in a new tab; they
 * are marketing/tool pages, not app routes.
 */
const MENU_LINKS: MenuLink[] = [
  { label: 'Guides', href: '/guides', icon: BookOpen },
  { label: 'Community', href: '/community', icon: MessageCircle },
  { label: 'Video Compressor', href: '/tools/compress-video', icon: FileDown, badge: 'FREE' },
  { label: 'YouTube Transcript', href: '/tools/transcribe', icon: FileText, badge: 'FREE' },
];

export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = user.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div ref={rootRef} className="relative p-4 border-t border-outline-variant/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-surface-container-low transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm ring-2 ring-primary/10 flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">{user.email}</p>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute left-4 right-4 bottom-full mb-2 rounded-xl border border-border bg-surface-container-lowest dark:bg-surface shadow-lg p-1.5 z-50"
        >
          {MENU_LINKS.map(({ label, href, icon: Icon, badge }) => (
            <a
              key={href}
              role="menuitem"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-surface-container-low transition-colors"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </a>
          ))}
          <div className="my-1.5 border-t border-border/50" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the `AccountMenu` test**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/components/AccountMenu.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing sidebar test (spec tests 1, 2, 3)**

Create `src/components/sidebar.test.tsx`:

```tsx
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/components/sidebar.test.tsx`
Expected: FAIL. The current sidebars import `sidebarHintsSeen` from `useFirstTimeUser` (now undefined, so `sidebarHintsSeen[item.id]` throws), render "Main" as a group header, and have no "Account menu" button.

- [ ] **Step 7: Replace `src/components/sidebar.tsx`**

Overwrite the whole file:

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, ADMIN_NAV_GROUP, useAppNavigation, navHref } from '@/hooks/useAppNavigation';
import type { NavItem } from '@/hooks/useAppNavigation';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';
import { AccountMenu } from '@/components/AccountMenu';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isTeamsUser } = useVoiceContext();

  const isAdmin = !!user?.isAdmin;

  // One flat list. Primary items first, admin items appended for admins.
  const visibleItems: NavItem[] = [
    ...NAV_GROUPS.flatMap((group) => group.items),
    ...(isAdmin ? ADMIN_NAV_GROUP.items : []),
  ].filter((item) => (!item.teamsOnly || isTeamsUser) && (!item.adminOnly || isAdmin));

  return (
    <aside className="h-screen w-64 bg-surface-container-lowest dark:bg-surface border-r border-outline-variant/40 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6">
        <button onClick={() => navigate('/app')} className="flex items-center gap-2.5 group" aria-label="Go to dashboard">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-black text-sm">
            E
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white font-headline group-hover:text-primary transition-colors">
            EchoMe
          </span>
        </button>
      </div>

      {/* Voice Switcher (teams users only) */}
      <VoiceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label="Main navigation">
        <div className="space-y-0.5">
          {visibleItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeItem === item.id}
              isAdmin={isAdmin}
              onNavigate={navigate}
            />
          ))}
        </div>
      </nav>

      {/* User Section */}
      {user && <AccountMenu user={user} onLogout={logout} />}
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  isAdmin,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isAdmin: boolean;
  onNavigate: (path: string, external?: boolean) => void;
}) {
  const Icon = item.icon;
  const disabled = item.comingSoon && !isAdmin;

  return (
    <button
      onClick={() => {
        if (disabled) return;
        onNavigate(navHref(item), item.external);
      }}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border
        text-sm font-semibold font-headline tracking-tight transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          disabled
            ? 'border-transparent text-muted-foreground/60 cursor-not-allowed'
            : isActive
              ? 'bg-surface-container-low text-foreground border-border shadow-sm'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-surface-container-low hover:translate-x-0.5'
        }
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.badge && (
        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
      {item.comingSoon && !isAdmin && (
        <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container-high text-slate-lavender px-2 py-0.5 rounded-full">
          Soon
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 8: Replace `src/components/mobile-sidebar.tsx`**

Overwrite the whole file:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, ADMIN_NAV_GROUP, useAppNavigation, navHref } from '@/hooks/useAppNavigation';
import type { NavItem } from '@/hooks/useAppNavigation';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';
import { AccountMenu } from '@/components/AccountMenu';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isTeamsUser } = useVoiceContext();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isAdmin = !!user?.isAdmin;

  // One flat list. Primary items first, admin items appended for admins.
  const visibleItems: NavItem[] = [
    ...NAV_GROUPS.flatMap((group) => group.items),
    ...(isAdmin ? ADMIN_NAV_GROUP.items : []),
  ].filter((item) => (!item.teamsOnly || isTeamsUser) && (!item.adminOnly || isAdmin));

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus close button on open
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar border-r border-border/50 shadow-sm flex flex-col z-50 lg:hidden animate-fade-in" role="dialog" aria-modal="true" aria-label="Navigation menu">
        {/* Logo */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <button onClick={() => navigate('/app')} className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
            EchoMe
          </button>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2.5 -m-2.5 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Voice Switcher (teams users only) */}
        <VoiceSwitcher />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
          <div className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const disabled = item.comingSoon && !isAdmin;
              const isActive = activeItem === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (disabled) return;
                    navigate(navHref(item), item.external);
                  }}
                  disabled={disabled}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border
                    text-sm font-semibold font-headline tracking-tight transition-all duration-200
                    focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${
                      disabled
                        ? 'border-transparent text-muted-foreground/60 cursor-not-allowed'
                        : isActive
                          ? 'bg-surface-container-low text-foreground border-border shadow-sm'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-surface-container-low hover:text-foreground hover:translate-x-0.5'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.comingSoon && !isAdmin && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container-high text-slate-lavender px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        {user && <AccountMenu user={user} onLogout={logout} />}
      </aside>
    </>
  );
}
```

- [ ] **Step 9: Run the sidebar and AccountMenu tests**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/components/sidebar.test.tsx src/components/AccountMenu.test.tsx`
Expected: PASS, 12 tests total.

- [ ] **Step 10: Type check and lint**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit && npm run lint`
Expected: no errors. `Waveform` and `LogOut` imports are gone from both sidebars, `useFirstTimeUser` is no longer imported by them.

- [ ] **Step 11: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/components/AccountMenu.tsx src/components/AccountMenu.test.tsx src/components/sidebar.tsx src/components/mobile-sidebar.tsx src/components/sidebar.test.tsx
git commit -m "feat(nav): flat four-item sidebar with AccountMenu footer

Both sidebars render one flat list with no group headers. The footer
avatar block becomes AccountMenu, a popover holding Guides, Community,
Video Compressor, YouTube Transcript and Logout. Sidebar hint dots are
removed along with the Waveform decoration on the retired Voice item.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9"
```

---

### Task 4: Library tabs for Toolkit and Radar

**Files:**
- Modify: `src/app/app/library/LibraryTabs.tsx` (whole file)
- Test: `src/app/app/library/LibraryTabs.test.tsx`

**Interfaces:**
- Consumes: `CreatorLibraryContent` default export from `src/app/app/toolkit/CreatorLibraryContent.tsx`, `FollowingContent` default export from `src/app/app/radar/FollowingContent.tsx`. Both keep their own `<h1>`; no `embedded` prop is added.
- Produces: `?tab=toolkit` and `?tab=radar` on `/app/library`. `type Tab = 'kits' | 'toolkit' | 'radar' | 'reels'`.

- [ ] **Step 1: Write the failing test (spec test 9)**

Create `src/app/app/library/LibraryTabs.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/app/app/library/LibraryTabs.test.tsx`
Expected: FAIL. Only Kits and Reels tabs exist, `?tab=toolkit` renders Kits.

- [ ] **Step 3: Replace `src/app/app/library/LibraryTabs.tsx`**

Overwrite the whole file:

```tsx
'use client';

/**
 * Library page wrapper with tabs.
 *
 * Tab state is URL-driven via ?tab=kits|toolkit|radar|reels so deep links
 * and the old /reels -> /library?tab=reels redirect both land in the right
 * place. Toolkit and Radar were promoted here from their own sidebar items
 * in the 2026-09 nav simplification; /app/toolkit and /app/radar still
 * exist for direct links.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { Package, FolderOpen, Users, Film } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ContentKitContent from './ContentKitContent';
import ReelsContent from './ReelsContent';
import CreatorLibraryContent from '../toolkit/CreatorLibraryContent';
import FollowingContent from '../radar/FollowingContent';

type Tab = 'kits' | 'toolkit' | 'radar' | 'reels';

const ALL_TABS: Array<{ id: Tab; label: string; icon: typeof Package; adminOnly?: boolean }> = [
  { id: 'kits', label: 'Kits', icon: Package },
  { id: 'toolkit', label: 'Toolkit', icon: FolderOpen },
  { id: 'radar', label: 'Radar', icon: Users },
  { id: 'reels', label: 'Reels', icon: Film, adminOnly: true },
];

function parseTab(raw: string | null, isAdmin: boolean): Tab {
  if (raw === 'toolkit' || raw === 'radar') return raw;
  // ?tab=reels honored only for admins. Non-admins always see Kits even if they paste the URL.
  if (raw === 'reels' && isAdmin) return 'reels';
  return 'kits';
}

function LibraryTabsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const tabs = ALL_TABS.filter(t => !t.adminOnly || isAdmin);
  const tab = parseTab(searchParams.get('tab'), isAdmin);

  const setTab = useCallback(
    (next: Tab) => {
      // Preserve other query params (e.g., voice filters) when switching tabs.
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'kits') {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const qs = params.toString();
      router.replace(`/app/library${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div>
      {/* Tab nav */}
      <div className="container mx-auto px-6 pt-6 max-w-7xl">
        <div className="flex items-center gap-1 border-b border-border" role="tablist" aria-label="Library sections">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`library-panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-primary-interactive text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active panel */}
      <div
        id={`library-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'kits' && <ContentKitContent />}
        {tab === 'toolkit' && <CreatorLibraryContent />}
        {tab === 'radar' && <FollowingContent />}
        {tab === 'reels' && <ReelsContent />}
      </div>
    </div>
  );
}

export default function LibraryTabs() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 max-w-7xl" />}>
      <LibraryTabsInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/app/app/library/LibraryTabs.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Type check**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/app/app/library/LibraryTabs.tsx src/app/app/library/LibraryTabs.test.tsx
git commit -m "feat(library): add Toolkit and Radar tabs

Toolkit (CreatorLibraryContent) and Radar (FollowingContent) become
Library tabs reachable via ?tab=toolkit and ?tab=radar. Their standalone
routes are untouched so existing deep links keep working.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9"
```

---

### Task 5: Settings links to Billing and Developers

**Files:**
- Modify: `src/app/app/settings/SettingsContent.tsx` (import block lines 3-14, Account tab around line 644, Billing tab around line 1002)
- Test: `src/app/app/settings/SettingsContent.links.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: a `View plans` link to `/app/billing` in the Billing tab for every tier, and a `Developers` card with an `Open Developers` link to `/app/developers` in the Account tab.

- [ ] **Step 1: Write the failing test (spec test 10)**

Create `src/app/app/settings/SettingsContent.links.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTab = vi.fn();
const mockGetUsageLimits = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'tab' ? mockTab() : null) }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com' } }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isFreeUser: false, tier: 'studio', subscription: null }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } },
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('./ConnectedAccounts', () => ({
  ConnectedAccounts: () => <div data-testid="connected-accounts" />,
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    auth: {
      getProfile: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'u1',
          email: 'test@example.com',
          subscription_tier: 'studio',
          credits_remaining: 100,
          email_notifications: true,
          weekly_digest: false,
          auto_clean_clips: true,
        },
      }),
      updateProfile: vi.fn(),
      uploadProfileImage: vi.fn(),
    },
    stripe: {
      getUsageLimits: (...a: unknown[]) => mockGetUsageLimits(...a),
      getPortalUrl: vi.fn(),
    },
    account: {
      getDataSummary: vi.fn(),
      submitFeedback: vi.fn(),
      applyWinback: vi.fn(),
      cancelSubscription: vi.fn(),
      deleteAccount: vi.fn(),
    },
  },
}));

import SettingsContent from './SettingsContent';

const paidUsage = {
  userId: 'u1',
  tier: 'studio',
  currentMonth: '2026-09',
  generationsUsed: 3,
  generationsLimit: 0,
  generationsRemaining: 0,
  tokensUsed: 0,
  costUsd: 0,
  isUnlimited: true,
  videoMinutesUsed: 0,
  videoMinutesLimit: 0,
  videoMinutesRemaining: 0,
};

describe('SettingsContent demoted-route links', () => {
  beforeEach(() => {
    mockGetUsageLimits.mockResolvedValue({ success: true, data: paidUsage });
  });

  it('Billing tab shows a View plans link to /app/billing for a paid user', async () => {
    mockTab.mockReturnValue('billing');
    render(<SettingsContent />);
    const link = await screen.findByRole('link', { name: /view plans/i });
    expect(link).toHaveAttribute('href', '/app/billing');
    // Paid users do not get the free-tier upgrade button.
    expect(screen.queryByRole('button', { name: /upgrade to pro/i })).not.toBeInTheDocument();
  });

  it('Billing tab still shows View plans for a free user alongside the upgrade button', async () => {
    mockTab.mockReturnValue('billing');
    mockGetUsageLimits.mockResolvedValue({
      success: true,
      data: { ...paidUsage, tier: 'free', isUnlimited: false, generationsLimit: 5, generationsRemaining: 2 },
    });
    render(<SettingsContent />);
    expect(await screen.findByRole('link', { name: /view plans/i })).toHaveAttribute('href', '/app/billing');
    expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument();
  });

  it('Account tab shows an Open Developers link to /app/developers', async () => {
    mockTab.mockReturnValue('account');
    render(<SettingsContent />);
    const link = await screen.findByRole('link', { name: /open developers/i });
    expect(link).toHaveAttribute('href', '/app/developers');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/app/app/settings/SettingsContent.links.test.tsx`
Expected: FAIL, `Unable to find role="link" and name /view plans/i`.

- [ ] **Step 3: Add the `next/link` import**

In `src/app/app/settings/SettingsContent.tsx`, after line 4 (`import { useSearchParams, useRouter } from 'next/navigation';`) add:

```ts
import Link from 'next/link';
```

- [ ] **Step 4: Add the "View plans" link to the Billing tab**

Find this block in the Billing tab (currently around line 1026):

```tsx
                  {(!usage || usage.tier === 'free') && (
                    <button
                      onClick={() => window.location.href = '/app/billing'}
                      className="btn-primary"
                    >
                      Upgrade to Pro
                    </button>
                  )}
                </div>
```

Replace it with:

```tsx
                  <div className="flex items-center gap-4">
                    <Link href="/app/billing" className="text-small text-accent hover:underline">
                      View plans
                    </Link>
                    {(!usage || usage.tier === 'free') && (
                      <button
                        onClick={() => window.location.href = '/app/billing'}
                        className="btn-primary"
                      >
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                </div>
```

- [ ] **Step 5: Add the "Developers" card to the Account tab**

Find this block in the Account tab (currently around line 644):

```tsx
          {/* Account Deletion / Cancellation */}
          <div className="card border-2 border-error/20">
            <h3 className="text-subheading text-xl mb-2 text-error">Danger Zone</h3>
```

Insert this card directly above the `{/* Account Deletion / Cancellation */}` comment:

```tsx
          {/* Developers */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-2">Developers</h3>
            <p className="text-body text-text-secondary mb-4">
              API keys, docs, and usage for the EchoMe public API.
            </p>
            <Link href="/app/developers" className="btn-secondary inline-flex">
              Open Developers
            </Link>
          </div>

```

- [ ] **Step 6: Run the new test and the existing Settings test**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/app/app/settings/SettingsContent.links.test.tsx src/app/app/settings/SettingsContent.test.tsx`
Expected: PASS for both files.

- [ ] **Step 7: Type check and lint**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/app/app/settings/SettingsContent.tsx src/app/app/settings/SettingsContent.links.test.tsx
git commit -m "feat(settings): link to Billing and Developers from Settings

Billing and Developers lose their sidebar items. Every tier now sees a
View plans link in the Billing tab, and the Account tab gains a
Developers card so the public API surface stays one click away.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9"
```

---

### Task 6: Demoted route regression test and full verification

**Files:**
- Test: `src/app/app/demoted-routes.test.tsx`

**Interfaces:**
- Consumes: the five page modules `toolkit/page.tsx`, `radar/page.tsx`, `voice/page.tsx`, `billing/page.tsx`, `developers/page.tsx`. Each is a trivial wrapper that renders one default-exported content component.
- Produces: nothing. This is a guard that no route was deleted.

- [ ] **Step 1: Write the test (spec test 8)**

Create `src/app/app/demoted-routes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./toolkit/CreatorLibraryContent', () => ({
  default: () => <div data-testid="toolkit-content" />,
}));
vi.mock('./radar/FollowingContent', () => ({
  default: () => <div data-testid="radar-content" />,
}));
vi.mock('./voice/VoiceTabs', () => ({
  default: () => <div data-testid="voice-content" />,
}));
vi.mock('./billing/BillingContent', () => ({
  default: () => <div data-testid="billing-content" />,
}));
vi.mock('./developers/DevelopersContent', () => ({
  default: () => <div data-testid="developers-content" />,
}));

import ToolkitPage from './toolkit/page';
import RadarPage from './radar/page';
import VoicePage from './voice/page';
import BillingPage from './billing/page';
import DevelopersPage from './developers/page';

describe('demoted routes still render their content', () => {
  it.each([
    ['/app/toolkit', ToolkitPage, 'toolkit-content'],
    ['/app/radar', RadarPage, 'radar-content'],
    ['/app/voice', VoicePage, 'voice-content'],
    ['/app/billing', BillingPage, 'billing-content'],
    ['/app/developers', DevelopersPage, 'developers-content'],
  ] as const)('%s renders its content component', (_route, Page, testId) => {
    render(<Page />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- src/app/app/demoted-routes.test.tsx`
Expected: PASS, 5 tests. This test passes immediately; it exists so a future route deletion fails CI.

- [ ] **Step 3: Run the full unit suite, type check, and lint**

Run: `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit && npx tsc --noEmit && npm run lint`
Expected: all green. Known pre-existing failures on `develop` (if any) must be listed in the final report with their file names, not fixed here.

- [ ] **Step 4: Grep for dead references**

Run:
```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
grep -rn "sidebarHintsSeen\|markSidebarHintSeen\|HINT_ITEMS\|echome_sidebar_hints_seen" src || echo "clean"
grep -rn "@/components/ui/waveform" src/components/sidebar.tsx src/components/mobile-sidebar.tsx || echo "clean"
```
Expected: `clean` twice.

- [ ] **Step 5: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/app/app/demoted-routes.test.tsx
git commit -m "test(nav): guard that demoted routes still render

Voice, Toolkit, Radar, Billing and Developers lost their sidebar items
but keep their routes. This test fails if any page wrapper is deleted.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9"
```

- [ ] **Step 6: Push the branch and open a PR against `develop`**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git push -u origin feat/nav-simplification
gh pr create --base develop --title "feat(nav): simplify sidebar to four items" --body "$(cat <<'EOF'
## Summary
- Sidebar goes from 13 items in 5 groups to 4 flat items: Create, Library, Calendar, Settings
- Toolkit and Radar become Library tabs (`?tab=toolkit`, `?tab=radar`)
- Billing and Developers are linked from Settings
- Guides, Community, Video Compressor and YouTube Transcript move into a new AccountMenu popover in the sidebar footer
- Demoted routes keep working and highlight their new owner in the sidebar
- Legacy sidebar hint dots removed

Spec: `docs/superpowers/specs/2026-09-08-nav-simplification-design.md`
Plan: `docs/superpowers/plans/2026-09-08-nav-simplification.md`

## Test plan
- [ ] `npm run test:unit` green
- [ ] `npx tsc --noEmit` and `npm run lint` clean
- [ ] Staging smoke: paid non-admin sees 4 items, admin sees 6, Teams user sees VoiceSwitcher
- [ ] Staging smoke: `/app/toolkit`, `/app/radar`, `/app/billing`, `/app/developers`, `/app/voice` load and highlight Library / Settings / Create
- [ ] Staging smoke: AccountMenu opens, four links open in new tabs, Logout works on desktop and mobile drawer

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01ATsSynV3NYyoKZ31UyPMy9
EOF
)"
```

Do not merge. Release policy is develop, then staging smoke, then main, with a merge commit and never a squash.
