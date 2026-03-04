'use client';

import { ReactNode, Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { NavigationProvider } from '@/contexts/navigation-context';
import { VoiceProvider } from '@/contexts/voice-context';
import { useAuth } from '@/hooks/useAuth';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-border/50 p-6 space-y-6">
          <div className="skeleton h-8 w-28" />
          <div className="space-y-3 flex-1">
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
          </div>
          <div className="skeleton h-12 rounded-lg" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-8 space-y-6">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export default function AppLayout({ children }: { children: ReactNode }) {

  return (
    <Suspense fallback={
      <div className="flex min-h-screen">
        <div className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-border/50 p-6 space-y-6">
          <div className="skeleton h-8 w-28" />
          <div className="space-y-3 flex-1">
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
          </div>
          <div className="skeleton h-12 rounded-lg" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    }>
      <AuthGuard>
        <NavigationProvider>
          <VoiceProvider>
            <AppShell>
              {children}
            </AppShell>
          </VoiceProvider>
        </NavigationProvider>
      </AuthGuard>
    </Suspense>
  );
}
