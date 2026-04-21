/**
 * App Providers
 * Wraps the app with necessary context providers
 */

'use client';

import { ReactNode } from 'react';
import GlobalErrorHandler from '@/components/GlobalErrorHandler';
import WebViewErrorBoundary from '@/components/WebViewErrorBoundary';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WebViewErrorBoundary>
      <GlobalErrorHandler>
        {children}
      </GlobalErrorHandler>
    </WebViewErrorBoundary>
  );
}
