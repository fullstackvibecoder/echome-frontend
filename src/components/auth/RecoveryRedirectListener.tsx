'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const RESET_PATH = '/auth/reset-password';

/**
 * Routes a Supabase PASSWORD_RECOVERY session to the reset-password form.
 *
 * supabase-js parses the recovery token from the URL hash on page load and
 * fires a PASSWORD_RECOVERY auth event. The reset-password page listens for
 * that event itself — but a recovery link only lands there if GoTrue honors
 * its redirect_to. When it doesn't (missing/omitted redirect_to, or a URL not
 * in the allow-list), GoTrue falls back to the Site URL (the homepage), where
 * nothing consumes the recovery session and the user dead-ends with no form.
 *
 * Mounted once at the root, this listener catches PASSWORD_RECOVERY wherever it
 * lands and routes to the reset form. It acts ONLY on that event, so it has no
 * effect on normal navigation. On the reset page itself it no-ops (that page
 * handles its own recovery session).
 */
export function RecoveryRedirectListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && pathname !== RESET_PATH) {
        router.replace(RESET_PATH);
      }
    });
    return () => subscription.unsubscribe();
  }, [router, pathname]);

  return null;
}
