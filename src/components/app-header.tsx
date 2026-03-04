'use client';

import { Menu, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppNavigation } from '@/hooks/useAppNavigation';

export function AppHeader() {
  const { user } = useAuth();
  const { toggleMobileMenu } = useAppNavigation();

  return (
    <header className="glass sticky top-0 z-30 border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Mobile menu + KB Status */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* KB Status */}
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full border border-border/50 shadow-sm">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Echo trained</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* User Avatar (mobile) */}
          <div className="lg:hidden w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
