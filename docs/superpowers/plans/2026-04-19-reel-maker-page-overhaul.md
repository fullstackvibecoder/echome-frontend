# Reel Maker Page Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the empty-card problem, remove the inline editor, add status grouping, and match the content kit list page pattern.

**Architecture:** Promote `StatusSection` to a shared generic component with `children` instead of hardcoded cards. Rewrite `ReelsContent.tsx` with compact create bar + status-grouped grid. Overhaul `ReelProjectCard` with draft hook preview, style pill, hover actions, and click routing (B-Roll → modal, template → navigate).

**Tech Stack:** React, Next.js App Router, TypeScript, Tailwind CSS, lucide-react

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/components/StatusSection.tsx` | **New** — shared generic status section (children-based) |
| Modify | `src/components/content-library/StatusSection.tsx` | Re-export from new shared location for backwards compat |
| Modify | `src/app/app/content-kit/ContentKitContent.tsx` | Update import path |
| Rewrite | `src/app/app/reels/ReelsContent.tsx` | Drop inline editor, add create bar + status grouping |
| Rewrite | `src/components/reels/ReelProjectCard.tsx` | Draft preview, style pill, hover actions, click routing |

---

### Task 1: Promote StatusSection to shared generic component

**Files:**
- Create: `src/components/StatusSection.tsx`
- Modify: `src/components/content-library/StatusSection.tsx`
- Modify: `src/app/app/content-kit/ContentKitContent.tsx`

- [ ] **Step 1: Create the shared generic StatusSection**

Create `src/components/StatusSection.tsx`:

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface StatusSectionProps {
  label: string;
  dotColor: string;
  count: number;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export function StatusSection({
  label,
  dotColor,
  count,
  defaultCollapsed = false,
  children,
}: StatusSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (count === 0) return null;

  return (
    <section className="mb-7">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center gap-2 py-2 text-left"
        aria-expanded={!collapsed}
      >
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {count}
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            !collapsed ? 'rotate-90' : ''
          }`}
        />
      </button>

      {!collapsed && children}
    </section>
  );
}
```

- [ ] **Step 2: Update the content-library StatusSection to re-export**

Replace `src/components/content-library/StatusSection.tsx` with a thin wrapper that uses the shared component but preserves the existing `items` API for backwards compatibility:

```tsx
'use client';

import { StatusSection as SharedStatusSection } from '@/components/StatusSection';
import { ContentKitCard } from './ContentKitCard';
import type { NormalizedContent } from '@/lib/content-normalizer';

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
  return (
    <SharedStatusSection
      label={label}
      dotColor={dotColor}
      count={items.length}
      defaultCollapsed={defaultCollapsed}
    >
      <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ContentKitCard key={item.id} item={item} />
        ))}
      </div>
    </SharedStatusSection>
  );
}

export default StatusSection;
```

- [ ] **Step 3: Verify ContentKitContent imports still work**

The import in `src/app/app/content-kit/ContentKitContent.tsx` is:
```typescript
import { StatusSection } from '@/components/content-library/StatusSection';
```
This still works because the content-library version now wraps the shared one. No change needed.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusSection.tsx src/components/content-library/StatusSection.tsx
git commit -m "feat: promote StatusSection to shared generic component with children"
```

---

### Task 2: Overhaul ReelProjectCard

**Files:**
- Rewrite: `src/components/reels/ReelProjectCard.tsx`

- [ ] **Step 1: Rewrite the card component**

Replace the entire file:

```tsx
'use client';

import { useState } from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import type { ReelProject } from '@/types';

interface ReelProjectCardProps {
  project: ReelProject;
  onClick: () => void;
  onDelete?: (projectId: string) => void;
}

const STYLE_LABELS: Record<string, string> = {
  bold_impact: 'Bold Impact',
  minimal_clean: 'Minimal Clean',
  brand_gradient: 'Brand Gradient',
  story_cards: 'Story Cards',
  outlined_stroke: 'Outlined',
  neon_glow: 'Neon',
};

export function ReelProjectCard({ project, onClick, onDelete }: ReelProjectCardProps) {
  const [confirming, setConfirming] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const statusConfig = {
    completed: { label: 'Ready', bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
    processing: { label: 'Rendering...', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500 animate-pulse' },
    failed: { label: 'Failed', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
    draft: { label: 'Draft', bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500' },
  };

  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;

  // Get hook text for draft preview
  const hookText = project.generatedContent?.hookText
    || project.generatedContent?.segmentOverlays?.[0]?.text
    || project.title
    || 'Untitled Reel';

  // Get style label from generatedContent or template
  const styleId = project.generatedContent?.style || '';
  const styleLabel = STYLE_LABELS[styleId] || '';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onDelete?.(project.id);
      setConfirming(false);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  const isRendering = project.status === 'processing';

  return (
    <button
      onClick={onClick}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary-interactive/40 transition-all text-left w-full"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* Thumbnail / Draft Preview */}
      <div className="aspect-[9/16] relative overflow-hidden bg-surface-container-low">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title || 'Reel'}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          /* Draft: fake reel frame with hook text */
          <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
            <p className="text-white text-center text-sm font-bold leading-snug line-clamp-6">
              {hookText}
            </p>
          </div>
        )}

        {/* Play overlay for completed */}
        {project.status === 'completed' && project.outputUrl && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1.5 ${status.bg} backdrop-blur-sm rounded-full px-2 py-0.5`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className={`text-[10px] font-medium ${status.text}`}>{status.label}</span>
        </div>

        {/* Progress bar for rendering */}
        {isRendering && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${project.progress || 5}%` }} />
          </div>
        )}

        {/* Hover actions (not during rendering) */}
        {!isRendering && onDelete && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleDelete}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium backdrop-blur-sm transition-colors ${
                confirming
                  ? 'bg-red-500/80 text-white'
                  : 'bg-black/50 text-white/80 hover:bg-black/70'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              {confirming ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-[13px] font-medium text-foreground truncate">
          {project.title || 'Untitled Reel'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground">{formatDate(project.createdAt)}</span>
          {styleLabel && (
            <>
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground/60">{styleLabel}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/reels/ReelProjectCard.tsx
git commit -m "feat: overhaul ReelProjectCard with draft preview, style pill, hover delete"
```

---

### Task 3: Rewrite ReelsContent with status grouping and create bar

**Files:**
- Rewrite: `src/app/app/reels/ReelsContent.tsx`

- [ ] **Step 1: Rewrite the entire file**

Replace `src/app/app/reels/ReelsContent.tsx` with the new implementation. The subagent should read the current file first to understand the existing data fetching patterns (api calls, project types), then rewrite with:

**Page structure:**
1. Header: "Reel Maker" + subtitle
2. Create bar: topic input + Create button, "B-Roll Wizard" link, "From Content Kit" link
3. Status-grouped grid using shared `StatusSection` from `@/components/StatusSection`

**Status grouping logic:**
```typescript
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

const drafts = projects.filter(p =>
  (p.status === 'draft' || p.status === 'failed') &&
  new Date(p.createdAt).getTime() > thirtyDaysAgo
);
const rendering = projects.filter(p =>
  p.status === 'processing' || p.status === 'rendering'
);
const ready = projects.filter(p =>
  p.status === 'completed' &&
  new Date(p.createdAt).getTime() > thirtyDaysAgo
);
const earlier = projects.filter(p =>
  new Date(p.createdAt).getTime() <= thirtyDaysAgo
);
```

**Grid per section:** `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3`

**Card rendering:** Use `ReelProjectCard` with:
- `onClick`: if `project.templateId` → `router.push(/app/reels/${project.id})`, else → open `ReelEditorModal`
- `onDelete`: call `api.reels.deleteProject(id)`, remove from state

**Create bar:**
- Topic input state + handleCreate: calls `api.reels.createProject({ title: topic })`, then opens the new project in `ReelEditorModal`
- "B-Roll Wizard" button: sets `showWizard` state → renders `BRollReelWizard` component (import from `@/components/reels/BRollReelWizard`)
- "From Content Kit" button: sets `showKitPicker` state → renders a simple modal listing recent content kits via `api.contentKits.list()`, selecting one opens `ReelEditorModal` with that kit's ID

**What to DELETE from current file:**
- The entire inline editor (`showEditor` branch, ~150 lines)
- The B-Roll library fetching (moved to modal)
- The TextOverlayPreview integration
- The compose/render polling logic (handled by modal)

**Imports needed:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Film, Wand2, FolderOpen, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { StatusSection } from '@/components/StatusSection';
import { ReelProjectCard } from '@/components/reels/ReelProjectCard';
import ReelEditorModal from '@/components/reels/ReelEditorModal';
import { BRollReelWizard } from '@/components/reels/BRollReelWizard';
import type { ReelProject } from '@/types';
```

**State:**
```typescript
const [projects, setProjects] = useState<ReelProject[]>([]);
const [loading, setLoading] = useState(true);
const [topic, setTopic] = useState('');
const [creating, setCreating] = useState(false);
const [showWizard, setShowWizard] = useState(false);
const [showKitPicker, setShowKitPicker] = useState(false);
const [reelModalProject, setReelModalProject] = useState<{ id: string; contentKitId?: string } | null>(null);
```

**Target file size:** ~250 lines (down from 532).

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit and push**

```bash
git add src/app/app/reels/ReelsContent.tsx
git commit -m "feat: rewrite Reel Maker page with status grouping and compact create bar"
git push
```
