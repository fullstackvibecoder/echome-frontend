'use client';

/**
 * Library Detail Page Redirect
 * Redirects to the new unified Content Kit detail page
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LibraryDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/app/content-kit/${id}`);
    } else {
      router.replace('/app/content-kit');
    }
  }, [router, id]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Redirecting to Content Kit...</p>
      </div>
    </div>
  );
}
