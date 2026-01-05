'use client';

/**
 * Clips Page Redirect
 * Redirects to the new unified Content Kit page
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClipsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/app/content-kit?filter=videos');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to Content Kit...</p>
      </div>
    </div>
  );
}
