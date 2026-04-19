'use client';

import { Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppNavigation } from '@/hooks/useAppNavigation';

export function AppHeader() {
  const { user } = useAuth();
  const { toggleMobileMenu } = useAppNavigation();

  return (
    <header className="sticky top-0 z-30 lg:hidden px-4 py-3">
      <div className="flex items-center justify-between">
        <button
          onClick={toggleMobileMenu}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
