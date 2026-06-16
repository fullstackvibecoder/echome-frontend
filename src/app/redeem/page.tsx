import type { Metadata } from 'next';
import { Suspense } from 'react';
import RedeemContent from './RedeemContent';

export const metadata: Metadata = {
  title: 'Claim your Echo Studio access',
  description: 'Redeem your partner access to Echo Studio.',
  robots: { index: false, follow: false },
};

export default function RedeemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <RedeemContent />
    </Suspense>
  );
}
