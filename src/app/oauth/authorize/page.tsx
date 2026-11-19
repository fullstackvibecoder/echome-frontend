import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthorizeContent from './AuthorizeContent';

export const metadata: Metadata = {
  title: 'Connect to EchoMe',
  description: 'Let an app use EchoMe as you.',
  robots: { index: false, follow: false },
};

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <AuthorizeContent />
    </Suspense>
  );
}
