'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useVoiceContext } from '@/contexts/voice-context';
import { StatusSection } from '@/components/content-library/StatusSection';
import { Search, RefreshCw } from 'lucide-react';
import type { NormalizedContent } from '@/lib/content-normalizer';

const EARLIER_THRESHOLD_DAYS = 7;

const PROCESSING_STATUSES = new Set([
  'pending',
  'processing',
  'uploading',
  'transcribing',
  'analyzing',
  'extracting',
  'captioning',
  'generating',
]);

function sortByCreatedAtDesc(a: NormalizedContent, b: NormalizedContent) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function ContentKitListInner() {
  const { voices, isTeamsUser } = useVoiceContext();
  const [voiceFilter, setVoiceFilter] = useState<string>('all');

  const {
    items: rawItems,
    stats,
    isLoading,
    error,
    setSearchQuery,
    refresh,
  } = useContentLibrary();

  // Apply voice filter for teams users
  const items = useMemo(() => {
    if (!isTeamsUser || voiceFilter === 'all') return rawItems;
    if (voiceFilter === 'none') return rawItems.filter(i => !i.voiceId);
    return rawItems.filter(i => i.voiceId === voiceFilter);
  }, [rawItems, voiceFilter, isTeamsUser]);

  // Group items by status
  const { readyToPublish, processing, failed, earlier } = useMemo(() => {
    const now = Date.now();
    const threshold = EARLIER_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    const ready: NormalizedContent[] = [];
    const proc: NormalizedContent[] = [];
    const fail: NormalizedContent[] = [];
    const old: NormalizedContent[] = [];

    for (const item of items) {
      if (item.status === 'failed') {
        fail.push(item);
      } else if (PROCESSING_STATUSES.has(item.status)) {
        proc.push(item);
      } else if (item.status === 'completed') {
        const age = now - new Date(item.createdAt).getTime();
        if (age < threshold) {
          ready.push(item);
        } else {
          old.push(item);
        }
      }
    }

    return {
      readyToPublish: ready.sort(sortByCreatedAtDesc),
      processing: proc.sort(sortByCreatedAtDesc),
      failed: fail.sort(sortByCreatedAtDesc),
      earlier: old.sort(sortByCreatedAtDesc),
    };
  }, [items]);

  // Summary line
  const summaryLine = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${stats.total} kit${stats.total !== 1 ? 's' : ''}`);
    const postCount = stats.written;
    parts.push(`${postCount} post${postCount !== 1 ? 's' : ''}`);
    const clipCount = stats.videos;
    parts.push(`${clipCount} clip${clipCount !== 1 ? 's' : ''}`);
    return parts.join(' \u00b7 ');
  }, [stats]);

  // Error state
  if (error && items.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={refresh}
            className="text-accent hover:underline font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0 && !error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h3 className="text-lg font-semibold mb-1">No content kits yet</h3>
          <p className="text-text-secondary mb-6 text-sm">
            Create your first content kit to get started
          </p>
          <Link href="/app" className="btn-primary">
            Create Content
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Content Kits</h1>
          <p className="text-sm text-text-secondary mt-0.5">{summaryLine}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Search kits..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50 w-48 sm:w-56"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-secondary hover:text-accent hover:border-accent/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Voice filter for teams */}
          {isTeamsUser && voices.length > 0 && (
            <select
              value={voiceFilter}
              onChange={(e) => setVoiceFilter(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="all">All Voices</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
              <option value="none">No Voice</option>
            </select>
          )}
        </div>
      </div>

      {/* Inline error banner (when items exist but refresh fails) */}
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm text-center mb-6">
          {error}
          <button onClick={refresh} className="ml-3 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Status sections */}
      <StatusSection
        label="Ready to Publish"
        dotColor="#22c55e"
        items={readyToPublish}
      />
      <StatusSection
        label="Processing"
        dotColor="#f59e0b"
        items={processing}
      />
      <StatusSection
        label="Failed"
        dotColor="#ef4444"
        items={failed}
      />
      <StatusSection
        label="Earlier"
        dotColor="#555"
        items={earlier}
        defaultCollapsed
      />
    </div>
  );
}

// Wrap in Suspense for router
export default function ContentKitContent() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
        </div>
      </div>
    }>
      <ContentKitListInner />
    </Suspense>
  );
}
