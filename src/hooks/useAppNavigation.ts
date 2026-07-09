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
  BookOpen,
  CalendarDays,
  MessageCircle,
  CreditCard,
  Settings,
  BarChart3,
  Code,
  Mail,
  FileDown,
  FileText,
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
  external?: boolean;
  badge?: string;
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
      { id: 'library', label: 'Your Library', icon: Package, path: '/app/library' },
      { id: 'reels', label: 'Reel Maker', icon: Film, path: '/app/library?tab=reels', adminOnly: true },
    ],
  },
  {
    label: 'Your Voice',
    items: [
      { id: 'voice', label: 'Your Voice', icon: Brain, path: '/app/voice' },
      { id: 'team-voices', label: 'Team Voices', icon: Mic, path: '/app/voice?tab=team', teamsOnly: true },
      { id: 'toolkit', label: 'Toolkit', icon: FolderOpen, path: '/app/toolkit' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { id: 'guides', label: 'Guides', icon: BookOpen, path: '/guides', external: true },
      { id: 'radar', label: 'Creator Radar', icon: Users, path: '/app/radar' },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/app/calendar' },
      { id: 'community', label: 'Community', icon: MessageCircle, path: '/community', external: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'compress', label: 'Video Compressor', icon: FileDown, path: '/tools/compress-video', external: true, badge: 'FREE' },
      { id: 'transcribe', label: 'YouTube Transcript', icon: FileText, path: '/tools/transcribe', external: true, badge: 'FREE' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'billing', label: 'Billing', icon: CreditCard, path: '/app/billing' },
      { id: 'developers', label: 'Developers', icon: Code, path: '/app/developers' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
    ],
  },
];

/** Admin-only nav group (appended when user is admin) */
export const ADMIN_NAV_GROUP: NavGroup = {
  label: 'Admin',
  items: [
    { id: 'admin', label: 'Dashboard', icon: BarChart3, path: '/app/admin/dashboard' },
    { id: 'admin-campaigns', label: 'Campaigns', icon: Mail, path: '/app/admin/campaigns', adminOnly: true },
    { id: 'admin-drafts', label: 'Drafts Analytics', icon: BarChart3, path: '/app/admin/drafts', adminOnly: true },
  ],
};

/** Flat list of all items (for active-item matching) */
export function getAllNavItems(): NavItem[] {
  return [...NAV_GROUPS.flatMap(g => g.items), ...ADMIN_NAV_GROUP.items];
}

interface UseAppNavigationReturn {
  activeItem: string;
  navigate: (path: string, external?: boolean) => void;
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

  const navigate = (path: string, external?: boolean) => {
    if (external) {
      window.open(path, '_blank', 'noopener');
    } else {
      router.push(path);
    }
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
