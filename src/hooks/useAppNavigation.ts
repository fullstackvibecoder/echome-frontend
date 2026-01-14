'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useNavigationContext } from '@/contexts/navigation-context';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/app' },
  { id: 'following', label: 'Following', icon: '👥', path: '/app/following' },
  { id: 'knowledge', label: 'Knowledge Base', icon: '📚', path: '/app/knowledge' },
  { id: 'content-kit', label: 'Content Kit', icon: '📦', path: '/app/content-kit' },
  { id: 'calendar', label: 'Calendar', icon: '📅', path: '/app/calendar' },
  { id: 'billing', label: 'Billing', icon: '💳', path: '/app/billing' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/app/settings' },
];

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
  const activeItem = NAV_ITEMS.find((item) => {
    if (item.path === '/app') {
      return pathname === '/app';
    }
    return pathname.startsWith(item.path);
  })?.id || 'dashboard';

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
