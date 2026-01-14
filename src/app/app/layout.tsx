'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { NavigationProvider } from '@/contexts/navigation-context';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <AppShell>{children}</AppShell>
    </NavigationProvider>
  );
}
