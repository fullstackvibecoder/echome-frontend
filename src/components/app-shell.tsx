'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { AppHeader } from './app-header';
// import { GenerationBanner } from './generation-banner'; // Temporarily disabled, see JSX below
import { HelpWidget } from './help-widget';
import { EchoPill } from '@/components/echo/EchoPill';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useEchoExperience } from '@/hooks/useEchoExperience';
import { installConsoleBuffer } from '@/lib/console-buffer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isMobileMenuOpen, closeMobileMenu } = useAppNavigation();
  const { subscription, loading: subLoading } = useSubscription();
  const echoOn = useEchoExperience();

  useEffect(() => {
    installConsoleBuffer();
  }, []);

  // Show banner if subscription is canceled (not pending cancellation, actually ended)
  const showExpiredBanner = !subLoading
    && subscription?.status === 'canceled'
    && !subscription?.cancelAtPeriodEnd;

  return (
    <div className="app-canvas flex h-screen overflow-hidden bg-surface">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-4 focus:bg-background focus:text-primary focus:rounded-xl focus:shadow-lg">
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AppHeader />

        {/* Ambient glow decoration */}
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.03] blur-[120px] rounded-full -mr-48 -mt-48 z-0" />

        {/* Subscription expired banner */}
        {showExpiredBanner && (
          <div className="relative z-10 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/30 px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Your subscription has ended. Resubscribe to keep generating.
            </p>
            <Link
              href="/app/billing"
              className="shrink-0 text-sm font-bold text-amber-800 dark:text-amber-300 hover:underline"
            >
              View Plans
            </Link>
          </div>
        )}

        <main id="main-content" className={`relative z-10 flex-1 overflow-y-auto bg-transparent${echoOn ? ' pb-24' : ''}`}>
          {children}
        </main>

        {echoOn && <EchoPill />}
      </div>

      {/* Floating Generation Progress Banner — temporarily hidden.
          The inline progress on the Create page is the primary UX.
          Re-enable this when we want the navigate-away follow-along feature. */}
      {/* <GenerationBanner /> */}

      {/* Floating Help Chat Widget */}
      <HelpWidget />
    </div>
  );
}
