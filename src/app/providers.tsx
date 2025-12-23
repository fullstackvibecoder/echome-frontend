/**
 * App Providers
 * Wraps the app with necessary context providers
 */

'use client';

import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
