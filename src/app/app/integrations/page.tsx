'use client';

import { Suspense } from 'react';
import { Link2 } from 'lucide-react';

function IntegrationsContent() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Connected Accounts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your accounts to sync content into your knowledge base for AI-powered generation
        </p>
      </div>

      {/* Coming Soon */}
      <div className="flex flex-col items-center justify-center py-16 px-8 bg-card border-2 border-dashed border-border rounded-2xl">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Link2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Account integrations are being finalized. Soon you&apos;ll be able to connect Google, Meta, and other platforms to automatically sync your content.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground">
            Google (YouTube, Calendar, Drive)
          </span>
          <span className="px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground">
            Meta (Facebook, Instagram)
          </span>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams (required by Next.js 16)
export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
