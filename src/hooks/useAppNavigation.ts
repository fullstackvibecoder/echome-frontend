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
