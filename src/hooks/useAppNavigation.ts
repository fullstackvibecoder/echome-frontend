'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/app/settings' },
  { id: 'profile', label: 'Profile', icon: '👤', path: '/app/profile' },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine active nav item based on current path
  const activeItem = NAV_ITEMS.find((item) => {
    if (item.path === '/app') {
      return pathname === '/app';
    }
    return pathname.startsWith(item.path);
  })?.id || 'dashboard';

  const navigate = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return {
    activeItem,
    navigate,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  };
}
