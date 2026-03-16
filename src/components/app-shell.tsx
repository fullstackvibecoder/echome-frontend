'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { AppHeader } from './app-header';
import { GenerationBanner } from './generation-banner';
import { HelpWidget } from './help-widget';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useSubscription } from '@/hooks/useSubscription';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isMobileMenuOpen, closeMobileMenu } = useAppNavigation();
  const { subscription, loading: subLoading } = useSubscription();

  // Show banner if subscription is canceled (not pending cancellation, actually ended)
  const showExpiredBanner = !subLoading
    && subscription?.status === 'canceled'
    && !subscription?.cancelAtPeriodEnd;

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

        {/* Subscription expired banner */}
        {showExpiredBanner && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your subscription has ended. Resubscribe to keep generating.
            </p>
            <Link
              href="/app/billing"
              className="shrink-0 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              View Plans
            </Link>
          </div>
        )}

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
