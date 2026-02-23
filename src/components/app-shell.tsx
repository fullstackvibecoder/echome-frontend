'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { AppHeader } from './app-header';
import { GenerationBanner } from './generation-banner';
import { HelpWidget } from './help-widget';
import { useAppNavigation } from '@/hooks/useAppNavigation';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isMobileMenuOpen, closeMobileMenu } = useAppNavigation();

  return (
    <div className="flex h-screen overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-4 focus:bg-background focus:text-foreground focus:rounded-lg focus:shadow-lg">
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>

      {/* Floating Generation Progress Banner */}
      <GenerationBanner />

      {/* Floating Help Chat Widget */}
      <HelpWidget />
    </div>
  );
}
