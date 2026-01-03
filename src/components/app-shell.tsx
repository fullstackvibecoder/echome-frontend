'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { AppHeader } from './app-header';
import { useAppNavigation } from '@/hooks/useAppNavigation';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isMobileMenuOpen, closeMobileMenu } = useAppNavigation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
