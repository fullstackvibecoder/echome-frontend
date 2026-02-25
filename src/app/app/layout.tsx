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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
