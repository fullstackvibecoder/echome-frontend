'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export function DataDeletionStatus() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  return (
    <div className="bg-bg-secondary border border-border rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-6 h-6 text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-3">
        Data Deletion Request Received
      </h1>
      <p className="text-text-secondary mb-6">
        Your data deletion request has been received and is being processed. We will remove your data within 30 days.
      </p>
      {code && (
        <div className="p-4 bg-bg-primary border border-border rounded-xl mb-4">
          <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Confirmation Code</p>
          <p className="text-sm font-mono text-text-primary break-all">{code}</p>
        </div>
      )}
      <p className="text-xs text-text-secondary">
        Questions? Email{' '}
        <a href="mailto:support@tryechome.com" className="text-accent hover:underline">
          support@tryechome.com
        </a>
        {' '}or see our{' '}
        <Link href="/data-deletion" className="text-accent hover:underline">
          data deletion page
        </Link>
        .
      </p>
    </div>
  );
}
