'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useNavigationContext } from '@/contexts/navigation-context';
import {
  Sparkles,
  Users,
  Brain,
  Package,
  Mic,
  Film,
  FolderOpen,
  TrendingUp,
  CalendarDays,
  MessageCircle,
  CreditCard,
  Settings,
  BarChart3,
  Clapperboard,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  comingSoon?: boolean;
  teamsOnly?: boolean;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Create',
    items: [
      { id: 'create', label: 'Create', icon: Sparkles, path: '/app' },
      { id: 'content-kit', label: 'Content Kit', icon: Package, path: '/app/content-kit' },
      { id: 'reels', label: 'Reel Maker', icon: Film, path: '/app/reels', adminOnly: true },
    ],
  },
  {
    label: 'Your Voice',
    items: [
      { id: 'knowledge', label: 'Knowledge Base', icon: Brain, path: '/app/knowledge' },
      { id: 'team-voices', label: 'Team Voices', icon: Mic, path: '/app/team-voices', teamsOnly: true },
      { id: 'library', label: 'Creator Library', icon: FolderOpen, path: '/app/library' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { id: 'following', label: 'Following', icon: Users, path: '/app/following' },
      { id: 'trends', label: 'Trends', icon: TrendingUp, path: '/app/trends', adminOnly: true },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/app/calendar' },
      { id: 'community', label: 'Community', icon: MessageCircle, path: '/community' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'billing', label: 'Billing', icon: CreditCard, path: '/app/billing' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
    ],
  },
];

/** Admin-only nav group (appended when user is admin) */
export const ADMIN_NAV_GROUP: NavGroup = {
  label: 'Admin',
  items: [
    { id: 'admin', label: 'Admin', icon: BarChart3, path: '/app/admin' },
    { id: 'descript', label: 'Descript Studio', icon: Clapperboard, path: '/app/descript', adminOnly: true },
  ],
};

/** Flat list of all items (for active-item matching) */
export function getAllNavItems(): NavItem[] {
  return [...NAV_GROUPS.flatMap(g => g.items), ...ADMIN_NAV_GROUP.items];
}

interface UseAppNavigationReturn {
  activeItem: string;
  navigate: (path: string) => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

export function useAppNavigation(): UseAppNavigationReturn {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useNavigationContext();

  // Determine active nav item based on current path
  const allItems = getAllNavItems();
  const activeItem = allItems.find((item) => {
    if (item.path === '/app') {
      return pathname === '/app';
    }
    return pathname.startsWith(item.path);
  })?.id || 'create';

  const navigate = (path: string) => {
    router.push(path);
    closeMobileMenu();
  };

  return {
    activeItem,
    navigate,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  };
}
