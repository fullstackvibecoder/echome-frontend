'use client';

import { ReactNode, Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { NavigationProvider } from '@/contexts/navigation-context';

export default function AppLayout({ children }: { children: ReactNode }) {

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <NavigationProvider>
        <AppShell>
          {children}
        </AppShell>
      </NavigationProvider>
    </Suspense>
  );
}
