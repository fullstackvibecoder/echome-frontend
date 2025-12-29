'use client';

import { useAuth } from '@/hooks/useAuth';
import { useAppNavigation } from '@/hooks/useAppNavigation';

interface AppHeaderProps {
  kbChunks?: number;
}

export function AppHeader({ kbChunks = 0 }: AppHeaderProps) {
  const { user } = useAuth();
  const { toggleMobileMenu } = useAppNavigation();

  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Mobile menu + KB Status */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden text-muted-foreground hover:text-foreground text-2xl"
          >
            ☰
          </button>

          {/* KB Status */}
          <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border border-border">
            <span className="text-primary">✓</span>
            <span className="text-muted-foreground">
              Echo trained{' '}
              <span className="font-semibold text-foreground">
                ({kbChunks} chunks)
              </span>
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 border-2 border-border rounded-lg hover:border-primary transition-colors hidden md:block text-foreground"
            onClick={() => {/* Navigate to upload */}}
          >
            📤 Upload
          </button>

          {/* User Avatar (mobile) */}
          <div className="lg:hidden w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
