import type { Metadata } from 'next';
import { Suspense } from 'react';
import UnsubscribeContent from './UnsubscribeContent';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Manage your EchoMe email preferences.',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Processing...</p>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
