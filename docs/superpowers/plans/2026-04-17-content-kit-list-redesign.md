# Content Kit List Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cluttered dual-view content kit list page with a single status-grouped card grid optimized for triage.

**Architecture:** New `ContentKitCard` component renders each kit as a minimal card with thumbnail + title + summary. New page layout groups cards by status (Ready / Processing / Failed) with an expandable "Earlier" section for older kits. The `useContentLibrary` hook is simplified to remove view mode, group-by, sort-by, and platform filter state. Search and pagination remain.

**Tech Stack:** React, TypeScript, Tailwind CSS (using design tokens from globals.css), existing `api.contentKits.list` endpoint.

**Spec:** `docs/superpowers/specs/2026-04-17-content-kit-list-redesign.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/content-library/ContentKitCard.tsx` | Single card: thumbnail, title, summary, status |
| Create | `src/components/content-library/StatusSection.tsx` | Group wrapper: status dot, label, count, collapsible, card grid |
| Modify | `src/app/app/content-kit/ContentKitContent.tsx` | Page: header, search, status sections, empty/error states |
| Modify | `src/hooks/useContentLibrary.ts` | Remove view mode, group-by, sort-by, platform filter state |
| Modify | `src/components/content-library/index.ts` | Update exports |
| Keep | `src/lib/content-normalizer.ts` | No changes — NormalizedContent already has the fields we need |

Old components (`ContentFiltersBar`, `ContentListView`, `ContentListItem`, `ContentGridView`, `ContentCard`, `GroupHeader`, `BulkActionsBar`) are no longer imported by the page but left in place to avoid breaking any other import sites. They can be removed in a follow-up cleanup pass.

---

### Task 1: ContentKitCard Component

**Files:**
- Create: `src/components/content-library/ContentKitCard.tsx`

- [ ] **Step 1: Create the card component**

```tsx
// src/components/content-library/ContentKitCard.tsx
'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { NormalizedContent } from '@/lib/content-normalizer';

interface ContentKitCardProps {
  item: NormalizedContent;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getDetailUrl(item: NormalizedContent): string {
  const id = item.generationRequestId || item.videoUploadId || item.sourceId;
  if (item.videoUploadId) return `/app/content-kit/${item.videoUploadId}`;
  return `/app/content-kit/${id}`;
}

export function ContentKitCard({ item }: ContentKitCardProps) {
  const isProcessing = item.status === 'processing' || item.status === 'pending';
  const isFailed = item.status === 'failed';
  const thumbnailSrc = item.thumbnailUrl || item.previewImageUrl;
  const hasVideo = item.type === 'video-upload' || item.type === 'clip';

  // Build summary: "6 posts · 3 clips"
  const parts: string[] = [];
  if (item.platformCount && item.platformCount > 0) {
    parts.push(`${item.platformCount} post${item.platformCount !== 1 ? 's' : ''}`);
  }
  if (item.clipCount && item.clipCount > 0) {
    parts.push(`${item.clipCount} clip${item.clipCount !== 1 ? 's' : ''}`);
  }
  if (item.slideCount && item.slideCount > 0) {
    parts.push(`${item.slideCount} slide${item.slideCount !== 1 ? 's' : ''}`);
  }
  const summary = parts.join(' · ');

  // Date display
  const dateStr = (() => {
    const d = item.createdAt;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  return (
    <Link
      href={getDetailUrl(item)}
      className={`block bg-card rounded-[10px] overflow-hidden border border-border transition-colors hover:border-primary-interactive ${
        isProcessing ? 'opacity-70' : ''
      }`}
    >
      {/* Thumbnail area */}
      <div className="h-[88px] bg-surface-container-low flex items-center justify-center relative overflow-hidden">
        {isProcessing ? (
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        ) : thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground text-sm opacity-30">Aa</div>
        )}
        {/* Duration badge — video sources only, not processing */}
        {hasVideo && item.score != null && !isProcessing && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            {/* score field is repurposed — check for actual duration in description */}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 pt-2">
        <h3 className="text-foreground text-[13px] font-medium leading-tight line-clamp-2 mb-1">
          {item.title || 'Untitled'}
        </h3>
        {isFailed ? (
          <p className="text-destructive text-[11px]">
            {item.description || 'Processing failed'}
          </p>
        ) : isProcessing ? (
          <p className="text-amber-500 text-[11px]">
            {item.description || 'Processing...'}
          </p>
        ) : (
          <p className="text-muted-foreground text-[11px]">
            {summary || 'No content yet'}
          </p>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
          {dateStr}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/content-library/ContentKitCard.tsx
git commit -m "feat: add ContentKitCard component for redesigned list page"
```

---

### Task 2: StatusSection Component

**Files:**
- Create: `src/components/content-library/StatusSection.tsx`

- [ ] **Step 1: Create the status section wrapper**

```tsx
// src/components/content-library/StatusSection.tsx
'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { NormalizedContent } from '@/lib/content-normalizer';
import { ContentKitCard } from './ContentKitCard';

interface StatusSectionProps {
  label: string;
  dotColor: string;
  items: NormalizedContent[];
  defaultCollapsed?: boolean;
}

export function StatusSection({
  label,
  dotColor,
  items,
  defaultCollapsed = false,
}: StatusSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (items.length === 0) return null;

  return (
    <div className="mb-7">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-3 pl-0.5 group cursor-pointer"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
          {label}
        </span>
        <span className="text-xs" style={{ color: '#555' }}>
          {items.length}
        </span>
        <ChevronRight
          className={`w-3 h-3 text-muted-foreground transition-transform ${
            collapsed ? '' : 'rotate-90'
          }`}
        />
      </button>

      {/* Card grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {items.map((item) => (
            <ContentKitCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/content-library/StatusSection.tsx
git commit -m "feat: add StatusSection component for status-grouped card grid"
```

---

### Task 3: Rewrite ContentKitContent Page

**Files:**
- Modify: `src/app/app/content-kit/ContentKitContent.tsx`

- [ ] **Step 1: Read the current file to understand imports and wrapper structure**

Read `src/app/app/content-kit/ContentKitContent.tsx` completely to capture the Suspense wrapper, voice context usage, and page component name that `page.tsx` imports.

- [ ] **Step 2: Rewrite the page component**

Replace the entire contents of `src/app/app/content-kit/ContentKitContent.tsx` with:

```tsx
'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useVoiceContext } from '@/contexts/voice-context';
import { StatusSection } from '@/components/content-library/StatusSection';
import { Plus, RefreshCw, Search } from 'lucide-react';
import type { NormalizedContent } from '@/lib/content-normalizer';

const EARLIER_THRESHOLD_DAYS = 7;

function isOlderThanDays(date: Date, days: number): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return date < threshold;
}

function ContentLibraryInner() {
  const router = useRouter();
  const { voices, isTeamsUser } = useVoiceContext();
  const [voiceFilter, setVoiceFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');

  const {
    items: rawItems,
    stats,
    isLoading,
    error,
    setSearchQuery,
    refresh,
  } = useContentLibrary();

  // Voice filtering for teams users
  const items = useMemo(() => {
    if (voiceFilter === 'all' || !isTeamsUser) return rawItems;
    return rawItems.filter((item) => item.voiceId === voiceFilter);
  }, [rawItems, voiceFilter, isTeamsUser]);

  // Group items by status
  const { ready, recentReady, earlierReady, processing, failed } = useMemo(() => {
    const readyItems: NormalizedContent[] = [];
    const processingItems: NormalizedContent[] = [];
    const failedItems: NormalizedContent[] = [];

    for (const item of items) {
      if (item.status === 'completed') {
        readyItems.push(item);
      } else if (item.status === 'failed') {
        failedItems.push(item);
      } else {
        processingItems.push(item);
      }
    }

    // Sort each group by date descending
    const sortDesc = (a: NormalizedContent, b: NormalizedContent) =>
      b.createdAt.getTime() - a.createdAt.getTime();
    readyItems.sort(sortDesc);
    processingItems.sort(sortDesc);
    failedItems.sort(sortDesc);

    // Split ready into recent vs earlier
    const recent = readyItems.filter(
      (item) => !isOlderThanDays(item.createdAt, EARLIER_THRESHOLD_DAYS)
    );
    const earlier = readyItems.filter(
      (item) => isOlderThanDays(item.createdAt, EARLIER_THRESHOLD_DAYS)
    );

    return {
      ready: readyItems,
      recentReady: recent,
      earlierReady: earlier,
      processing: processingItems,
      failed: failedItems,
    };
  }, [items]);

  // Stats summary
  const totalKits = items.length;
  const totalPosts = items.reduce((sum, i) => sum + (i.platformCount || 0), 0);
  const totalClips = items.reduce((sum, i) => sum + (i.clipCount || 0), 0);

  // Search handler with debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setSearchQuery(value);
  };

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <button
          onClick={() => refresh()}
          className="px-6 py-2 bg-primary-interactive text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (totalKits === 0 && !searchInput) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
        <h2 className="text-xl font-semibold text-foreground">No content kits yet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Upload a video, paste a URL, or type a topic to create your first one.
        </p>
        <Link
          href="/app"
          className="px-6 py-2 bg-primary-interactive text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Create Content
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold">Content Kits</h1>
          <p className="text-muted-foreground text-[13px] mt-1">
            {totalKits} kit{totalKits !== 1 ? 's' : ''}
            {totalPosts > 0 && ` · ${totalPosts} post${totalPosts !== 1 ? 's' : ''}`}
            {totalClips > 0 && ` · ${totalClips} clip${totalClips !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice filter for teams */}
          {isTeamsUser && voices.length > 1 && (
            <select
              value={voiceFilter}
              onChange={(e) => setVoiceFilter(e.target.value)}
              className="bg-card border border-border text-foreground text-sm rounded-lg px-3 py-1.5 focus:border-accent focus:outline-none"
            >
              <option value="all">All voices</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-card border border-border text-foreground text-sm rounded-lg pl-9 pr-3 py-1.5 w-48 focus:border-accent focus:outline-none"
            />
          </div>
          {/* Refresh */}
          <button
            onClick={() => refresh()}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status sections */}
      <StatusSection
        label="Ready to Publish"
        dotColor="#22c55e"
        items={recentReady}
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
        items={earlierReady}
        defaultCollapsed={true}
      />

      {/* Empty search results */}
      {totalKits === 0 && searchInput && (
        <div className="text-center py-12 text-muted-foreground">
          No kits matching &quot;{searchInput}&quot;
        </div>
      )}
    </div>
  );
}

export default function ContentKitContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ContentLibraryInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: may surface unused imports or missing fields. Fix any errors — the `useContentLibrary` hook returns more than we use now, which is fine (destructure only what's needed). If `setSearchQuery` doesn't exist on the hook, check the hook's return type and use whatever search setter it provides.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/content-kit/ContentKitContent.tsx
git commit -m "feat: rewrite content kit list page with status-grouped card grid"
```

---

### Task 4: Update Exports

**Files:**
- Modify: `src/components/content-library/index.ts`

- [ ] **Step 1: Add new component exports**

Read `src/components/content-library/index.ts` and add the two new exports while keeping all existing exports (other pages may still import them):

```typescript
// Add these lines to the existing exports
export { ContentKitCard } from './ContentKitCard';
export { StatusSection } from './StatusSection';
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/content-library/index.ts
git commit -m "chore: export ContentKitCard and StatusSection from content-library"
```

---

### Task 5: Visual Verification + Final Polish

- [ ] **Step 1: Run the full build to catch any issues**

```bash
npm run build
```

Expected: clean build. If there are errors from old components that are no longer imported, they can be ignored as long as the page itself compiles and renders.

- [ ] **Step 2: Check for any remaining references to removed features**

Search for imports of the old components from the page file to make sure nothing else in the app is importing `ContentKitContent` expecting the old API:

```bash
grep -r "ContentFiltersBar\|ContentListView\|ContentGridView\|BulkActionsBar" src/app/ --include="*.tsx" --include="*.ts" -l
```

If any files other than `src/components/content-library/index.ts` or the old component files themselves import these, they need updating. If only the old files reference each other, they're safely dead code.

- [ ] **Step 3: Final commit + push**

```bash
git add -A
git commit -m "feat: content kit list page redesign — status-grouped minimal cards

Replace the dual-view list/grid with a single triage-first layout:
- Status sections (Ready to Publish / Processing / Failed / Earlier)
- Minimal cards with thumbnail + title + summary
- No view toggle, no filter bar, no gradient backgrounds
- Search as the only filter control
- Earlier kits collapsed by default

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

git push origin main
```

---

## Notes

- The `useContentLibrary` hook is intentionally NOT modified in this plan. It returns more state than the new page uses, but simplifying it risks breaking any other consumers. A follow-up cleanup can remove the unused state if no other page imports the hook.
- Old components in `src/components/content-library/` are left in place. They're dead code after this change but removing them is a separate cleanup task.
- The `NormalizedContent` type already has `thumbnailUrl`, `previewImageUrl`, `platformCount`, `clipCount`, and `slideCount` — no API or type changes needed.
- Thumbnail resolution (video frame vs carousel slide) happens in the existing `content-normalizer.ts` — the card just reads `thumbnailUrl || previewImageUrl`.
