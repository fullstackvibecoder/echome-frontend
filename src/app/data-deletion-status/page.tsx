import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DataDeletionStatus } from './DataDeletionStatus';

export const metadata: Metadata = {
  title: 'Data Deletion Status | EchoMe',
  description: 'Confirmation of your EchoMe data deletion request.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://tryechome.com/data-deletion-status' },
};

export default function DataDeletionStatusPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <Suspense fallback={<div className="text-center text-text-secondary">Loading...</div>}>
          <DataDeletionStatus />
        </Suspense>
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-accent hover:underline">&larr; Back to EchoMe</Link>
        </div>
      </div>
    </div>
  );
}
