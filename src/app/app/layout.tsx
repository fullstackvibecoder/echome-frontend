'use client';

import { ReactNode, Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { NavigationProvider } from '@/contexts/navigation-context';
import { VoiceProvider } from '@/contexts/voice-context';
import { useAuth } from '@/hooks/useAuth';
import { ShellSwitch } from '@/components/just-echo/ShellSwitch';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, reconnecting, connectionFailed, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !reconnecting && !connectionFailed) {
      // Keep the deep link (e.g. /app?transfer=claude from an email) so
      // login, signup and the OAuth callback return the user to it.
      try {
        const path = window.location.pathname + window.location.search;
        if (path !== '/app') localStorage.setItem('redirectAfterLogin', path);
      } catch {
        // storage blocked: user lands on /app after login
      }
      router.replace('/auth/login');
    }
  }, [loading, user, reconnecting, connectionFailed, router]);

  if (reconnecting) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" role="status">
        <p className="text-sm text-muted-foreground">Reconnecting...</p>
      </div>
    );
  }

  if (connectionFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          We can&apos;t reach EchoMe right now. You are still signed in.
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

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
        <ShellSwitch>
          <NavigationProvider>
            <VoiceProvider>
              <AppShell>
                {children}
              </AppShell>
            </VoiceProvider>
          </NavigationProvider>
        </ShellSwitch>
      </AuthGuard>
    </Suspense>
  );
}
