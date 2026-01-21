'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { NavigationProvider } from '@/contexts/navigation-context';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

// Routes that don't require subscription (billing page needs to be accessible)
const UNPROTECTED_ROUTES = ['/app/billing', '/app/settings'];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Check if current route is unprotected
  const isUnprotectedRoute = UNPROTECTED_ROUTES.some(route =>
    pathname?.startsWith(route)
  );

  return (
    <NavigationProvider>
      <AppShell>
        {isUnprotectedRoute ? (
          children
        ) : (
          <SubscriptionGuard
            loadingFallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
          >
            {children}
          </SubscriptionGuard>
        )}
      </AppShell>
    </NavigationProvider>
  );
}
