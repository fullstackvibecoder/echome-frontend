'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Profile page - Redirects to Settings
 *
 * Profile functionality has been consolidated into the Settings page.
 * This redirect ensures backwards compatibility for bookmarks and direct links.
 */
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/app/settings');
  }, [router]);

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Redirecting to Settings...</p>
      </div>
    </div>
  );
}
