# EchoHero Tile Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut resting-state text density on EchoHero's drafted-for-you tiles and autopilot proposal tiles by rendering one featured draft (short preview) plus compact single-line rows, and moving proposal rationale to hover.

**Architecture:** Featured + compact-rows pattern. `DraftsThreadMessage` renders `drafts[0]` via the existing `DraftCard` (with a shortened preview) and `drafts.slice(1)` via a new `DraftRow`. Both variants share action logic through a new `useDraftActions` hook so behavior (telemetry-with-timeout, 404-gone, dismiss errors) stays in sync. A new `pickPlatform` helper maps the primary populated platform field to a lucide icon + label. `AutopilotProposalCard` keeps title + kit label at rest and reveals `rationale` on hover.

**Tech Stack:** Next.js (App Router, client components), React, TypeScript, Tailwind, lucide-react, Vitest + @testing-library/react.

**Repo:** `echome-frontend` (separate from the backend). Branch: `feat/echohero-tile-density` (already created; spec committed at `docs/superpowers/specs/2026-06-14-echohero-tile-density-design.md`).

**Conventions (verified in repo):**
- Run a single test file: `npm run test:unit -- src/path/to/file.test.tsx`
- Tests use `vitest` (`describe/it/expect/vi/beforeEach`), `@testing-library/react`, `@testing-library/user-event`.
- Mock modules with `vi.mock('@/lib/...', () => ({...}))`; type mocks with `vi.mocked(...)`.
- `DraftProposal` shape (`src/types/index.ts`): `{ id: string; title: string | null; created_at: string; origin: 'user' | 'autonomous'; content_linkedin: string | null; content_instagram: string | null; content_twitter: string | null }`.
- `Proposal` shape (`src/types/advisor.ts`): includes `id`, `title`, `rationale`, `kitType`, `sourceRefs`.

---

## File Structure

- `src/components/dashboard/draft-format.ts` — **new.** `pickPlatform(draft)` pure helper: primary populated platform → `{ Icon, label }`. One responsibility: format derivation.
- `src/components/dashboard/useDraftActions.ts` — **new.** Shared hook: review/schedule/dismiss handlers, telemetry-with-timeout, 404-gone, busy + dismissError state. Consumed by both `DraftCard` and `DraftRow`.
- `src/components/dashboard/DraftCard.tsx` — **modify.** Shorten preview (220→120, clamp-3→clamp-2); consume `useDraftActions`. Stays the "featured" variant.
- `src/components/dashboard/DraftRow.tsx` — **new.** Compact single-line row variant.
- `src/components/create/DraftsThreadMessage.tsx` — **modify.** Render `drafts[0]` featured + `drafts.slice(1)` rows.
- `src/components/create/AutopilotProposalCard.tsx` — **modify.** Rationale to hover.

---

### Task 1: `pickPlatform` format helper

**Files:**
- Create: `src/components/dashboard/draft-format.ts`
- Test: `src/components/dashboard/draft-format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/dashboard/draft-format.test.ts
import { describe, it, expect } from 'vitest';
import { Linkedin, Instagram, Twitter, FileText } from 'lucide-react';
import { pickPlatform } from './draft-format';
import type { DraftProposal } from '@/types';

function makeDraft(overrides: Partial<DraftProposal>): DraftProposal {
  return {
    id: 'd1',
    title: 'A draft',
    created_at: '2026-06-14T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: null,
    content_instagram: null,
    content_twitter: null,
    ...overrides,
  };
}

describe('pickPlatform', () => {
  it('prefers LinkedIn when present', () => {
    const r = pickPlatform(makeDraft({ content_linkedin: 'x', content_instagram: 'y', content_twitter: 'z' }));
    expect(r).toEqual({ Icon: Linkedin, label: 'LinkedIn' });
  });

  it('falls back to Instagram when no LinkedIn', () => {
    const r = pickPlatform(makeDraft({ content_instagram: 'y', content_twitter: 'z' }));
    expect(r).toEqual({ Icon: Instagram, label: 'Instagram' });
  });

  it('falls back to X (Twitter) when only twitter', () => {
    const r = pickPlatform(makeDraft({ content_twitter: 'z' }));
    expect(r).toEqual({ Icon: Twitter, label: 'X' });
  });

  it('returns a generic Draft fallback when no platform copy', () => {
    const r = pickPlatform(makeDraft({}));
    expect(r).toEqual({ Icon: FileText, label: 'Draft' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/dashboard/draft-format.test.ts`
Expected: FAIL — `pickPlatform` is not defined / module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/components/dashboard/draft-format.ts
import { Linkedin, Instagram, Twitter, FileText, type LucideIcon } from 'lucide-react';
import type { DraftProposal } from '@/types';

export interface DraftPlatform {
  Icon: LucideIcon;
  label: string;
}

// Drafts carry no format/kit field, only per-platform copy. Derive the glyph
// and meta label from the primary populated platform, using the same priority
// as pickPreview in DraftCard (LinkedIn first: longest, most-shareable copy).
export function pickPlatform(draft: DraftProposal): DraftPlatform {
  if (draft.content_linkedin) return { Icon: Linkedin, label: 'LinkedIn' };
  if (draft.content_instagram) return { Icon: Instagram, label: 'Instagram' };
  if (draft.content_twitter) return { Icon: Twitter, label: 'X' };
  return { Icon: FileText, label: 'Draft' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/dashboard/draft-format.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/draft-format.ts src/components/dashboard/draft-format.test.ts
git commit -m "feat(drafts): add pickPlatform format helper"
```

---

### Task 2: Shorten featured preview + bring DraftCard under test

Reduce the preview from 220 chars / `line-clamp-3` to 120 chars / `line-clamp-2`, and add a regression test so later refactors are safe.

**Files:**
- Modify: `src/components/dashboard/DraftCard.tsx:17` (`PREVIEW_LENGTH`), `:118` (preview `<p>` class)
- Test: `src/components/dashboard/DraftCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/dashboard/DraftCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftCard } from './DraftCard';
import type { DraftProposal } from '@/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/api-client', () => ({
  api: { drafts: { recordAction: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('@/lib/toast', () => ({ showInfoToast: vi.fn() }));

function makeDraft(overrides: Partial<DraftProposal> = {}): DraftProposal {
  return {
    id: 'd1',
    title: 'My title',
    created_at: '2026-06-14T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: 'A'.repeat(300),
    content_instagram: null,
    content_twitter: null,
    ...overrides,
  };
}

describe('DraftCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('truncates preview to 120 chars with an ellipsis', () => {
    render(<DraftCard draft={makeDraft()} onDismissed={() => {}} />);
    const preview = screen.getByText(/A+…$/);
    // 120 chars of body + the ellipsis character
    expect(preview.textContent).toHaveLength(121);
  });

  it('applies line-clamp-2 to the preview', () => {
    render(<DraftCard draft={makeDraft()} onDismissed={() => {}} />);
    const preview = screen.getByText(/A+…$/);
    expect(preview).toHaveClass('line-clamp-2');
  });

  it('shows the Echo drafted badge only for autonomous origin', () => {
    const { rerender } = render(<DraftCard draft={makeDraft({ origin: 'autonomous' })} onDismissed={() => {}} />);
    expect(screen.getByText('Echo drafted')).toBeInTheDocument();
    rerender(<DraftCard draft={makeDraft({ origin: 'user' })} onDismissed={() => {}} />);
    expect(screen.queryByText('Echo drafted')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/dashboard/DraftCard.test.tsx`
Expected: FAIL — preview is 220+1 chars and has class `line-clamp-3`, so the length and class assertions fail.

- [ ] **Step 3: Change the preview length and clamp**

In `src/components/dashboard/DraftCard.tsx`, change the constant:

```ts
const PREVIEW_LENGTH = 120;
```

And change the preview paragraph class from `line-clamp-3` to `line-clamp-2`:

```tsx
      <p className="relative text-xs text-muted-foreground leading-relaxed line-clamp-2">{preview}</p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/dashboard/DraftCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DraftCard.tsx src/components/dashboard/DraftCard.test.tsx
git commit -m "feat(drafts): shorten featured preview to 120/clamp-2 + add DraftCard test"
```

---

### Task 3: Extract `useDraftActions` shared hook

Move review/schedule/dismiss logic out of `DraftCard` into a reusable hook so `DraftRow` shares identical behavior. Pure refactor — DraftCard's behavior and DOM are unchanged.

**Files:**
- Create: `src/components/dashboard/useDraftActions.ts`
- Modify: `src/components/dashboard/DraftCard.tsx` (consume the hook)
- Test: existing `src/components/dashboard/DraftCard.test.tsx` (regression) + `src/components/create/DraftsThreadMessage.test.tsx`

- [ ] **Step 1: Create the hook**

```ts
// src/components/dashboard/useDraftActions.ts
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DraftProposal } from '@/types';
import { api } from '@/lib/api-client';
import { showInfoToast } from '@/lib/toast';

// Telemetry races against this timeout. If the API hangs we give up after 2s
// and navigate anyway — never block the user on a side-effect call.
const TELEMETRY_TIMEOUT_MS = 2000;

type TelemetryResult = 'ok' | 'gone' | 'error' | 'timeout';

// A 404 from the action endpoint means the kit is no longer a draft proposal
// (dismissed in another tab, auto-cleaned by cron). Navigating there would
// land the user on a stale/empty kit-detail page; acknowledge and remove instead.
async function recordWithTimeout(p: Promise<unknown>): Promise<TelemetryResult> {
  return Promise.race<TelemetryResult>([
    p
      .then<TelemetryResult>(() => 'ok')
      .catch((err): TelemetryResult => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        return status === 404 ? 'gone' : 'error';
      }),
    new Promise<TelemetryResult>((resolve) =>
      setTimeout(() => resolve('timeout'), TELEMETRY_TIMEOUT_MS),
    ),
  ]);
}

interface UseDraftActionsArgs {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: 'reviewed' | 'scheduled') => void;
}

export interface DraftActions {
  review: () => Promise<void>;
  schedule: () => Promise<void>;
  dismiss: () => Promise<void>;
  busy: 'none' | 'dismissing';
  dismissError: string | null;
  href: string;
}

export function useDraftActions({ draft, onDismissed, onActionRecorded }: UseDraftActionsArgs): DraftActions {
  const router = useRouter();
  const [busy, setBusy] = useState<'none' | 'dismissing'>('none');
  const [dismissError, setDismissError] = useState<string | null>(null);
  const href = `/app/library/${draft.id}`;

  async function navigateAfter(action: 'reviewed' | 'scheduled') {
    onActionRecorded?.(draft.id, action);
    const result = await recordWithTimeout(api.drafts.recordAction(draft.id, action));
    if (result === 'gone') {
      showInfoToast('That draft was already removed', 'Refreshing your inbox.');
      onDismissed(draft.id);
      return;
    }
    router.push(href);
  }

  return {
    review: () => navigateAfter('reviewed'),
    schedule: () => navigateAfter('scheduled'),
    dismiss: async () => {
      if (busy !== 'none') return;
      setBusy('dismissing');
      setDismissError(null);
      try {
        await api.drafts.dismiss(draft.id);
        onDismissed(draft.id);
      } catch {
        // 401/402/403 are toasted by api-client interceptors; surface the rest inline.
        setBusy('none');
        setDismissError("Couldn't dismiss. Try again.");
      }
    },
    busy,
    dismissError,
    href,
  };
}
```

- [ ] **Step 2: Refactor DraftCard to consume the hook**

Replace the body of `src/components/dashboard/DraftCard.tsx` so the inline router/state/handlers and `recordWithTimeout`/`TelemetryResult` are removed and `useDraftActions` is used. `pickPreview` and `PREVIEW_LENGTH` stay (featured-only). Final file:

```tsx
"use client";

import Link from "next/link";
import { Calendar, Eye, Trash2 } from "lucide-react";
import type { DraftProposal } from "@/types";
import { useDraftActions } from "./useDraftActions";

interface DraftCardProps {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: "reviewed" | "scheduled") => void;
}

const PREVIEW_LENGTH = 120;

function pickPreview(draft: DraftProposal): string {
  // LinkedIn first: typically the longest, most-shareable copy for the
  // real-estate creators this product targets.
  const body = draft.content_linkedin || draft.content_instagram || draft.content_twitter || "";
  if (!body) return "Echo couldn't pull a preview. Click Review to see the full kit.";
  return body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH).trim()}…` : body;
}

export function DraftCard({ draft, onDismissed, onActionRecorded }: DraftCardProps) {
  const { review, schedule, dismiss, busy, dismissError, href } = useDraftActions({
    draft,
    onDismissed,
    onActionRecorded,
  });

  const title = draft.title || "Untitled draft";
  const preview = pickPreview(draft);

  return (
    <article className="relative flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/[0.04] blur-2xl rounded-full pointer-events-none" />

      <header className="relative flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">{title}</h3>
        {draft.origin === "autonomous" && (
          <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
            Echo drafted
          </span>
        )}
      </header>

      <p className="relative text-xs text-muted-foreground leading-relaxed line-clamp-2">{preview}</p>

      <div className="relative flex items-center gap-2 mt-1">
        <Link
          href={href}
          onClick={(e) => {
            e.preventDefault();
            void review();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Eye size={14} />
          Review
        </Link>
        <Link
          href={href}
          onClick={(e) => {
            e.preventDefault();
            void schedule();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
        >
          <Calendar size={14} />
          Schedule
        </Link>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy === "dismissing"}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Dismiss draft"
        >
          <Trash2 size={14} />
          {busy === "dismissing" ? "Dismissing…" : "Kill"}
        </button>
      </div>

      {dismissError && (
        <p role="alert" className="relative text-[11px] text-destructive">
          {dismissError}
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Run the DraftCard + DraftsThreadMessage tests to verify no regression**

Run: `npm run test:unit -- src/components/dashboard/DraftCard.test.tsx src/components/create/DraftsThreadMessage.test.tsx`
Expected: PASS (existing DraftCard tests from Task 2 + all DraftsThreadMessage tests still green).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/useDraftActions.ts src/components/dashboard/DraftCard.tsx
git commit -m "refactor(drafts): extract useDraftActions hook from DraftCard"
```

---

### Task 4: `DraftRow` compact variant

Single-line row: platform glyph + truncated title + meta label, with actions revealed on hover (desktop) and always visible on touch. Row click triggers Review.

**Files:**
- Create: `src/components/dashboard/DraftRow.tsx`
- Test: `src/components/dashboard/DraftRow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/dashboard/DraftRow.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftRow } from './DraftRow';
import type { DraftProposal } from '@/types';
import { api } from '@/lib/api-client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api-client', () => ({
  api: { drafts: { recordAction: vi.fn().mockResolvedValue(undefined), dismiss: vi.fn().mockResolvedValue(undefined) } },
}));
vi.mock('@/lib/toast', () => ({ showInfoToast: vi.fn() }));

function makeDraft(overrides: Partial<DraftProposal> = {}): DraftProposal {
  return {
    id: 'd1',
    title: 'Why I stopped doing open houses',
    created_at: '2026-06-14T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: 'body',
    content_instagram: null,
    content_twitter: null,
    ...overrides,
  };
}

describe('DraftRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockClear();
  });

  it('renders the title on a single truncated line', () => {
    render(<DraftRow draft={makeDraft()} onDismissed={() => {}} />);
    const title = screen.getByText('Why I stopped doing open houses');
    expect(title).toHaveClass('truncate');
  });

  it('shows the platform meta label derived from populated copy', () => {
    render(<DraftRow draft={makeDraft({ content_linkedin: 'x' })} onDismissed={() => {}} />);
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('records a review and navigates when the row is clicked', async () => {
    render(<DraftRow draft={makeDraft()} onDismissed={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /why i stopped/i }));
    expect(vi.mocked(api.drafts.recordAction)).toHaveBeenCalledWith('d1', 'reviewed');
    expect(push).toHaveBeenCalledWith('/app/library/d1');
  });

  it('exposes Review, Schedule, and Kill controls', () => {
    render(<DraftRow draft={makeDraft()} onDismissed={() => {}} />);
    expect(screen.getByLabelText('Review draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Schedule draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss draft')).toBeInTheDocument();
  });

  it('removes the draft on dismiss', async () => {
    const onDismissed = vi.fn();
    render(<DraftRow draft={makeDraft()} onDismissed={onDismissed} />);
    await userEvent.click(screen.getByLabelText('Dismiss draft'));
    expect(vi.mocked(api.drafts.dismiss)).toHaveBeenCalledWith('d1');
    expect(onDismissed).toHaveBeenCalledWith('d1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/dashboard/DraftRow.test.tsx`
Expected: FAIL — `DraftRow` module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/dashboard/DraftRow.tsx
"use client";

import { Calendar, Eye, Trash2 } from "lucide-react";
import type { DraftProposal } from "@/types";
import { useDraftActions } from "./useDraftActions";
import { pickPlatform } from "./draft-format";

interface DraftRowProps {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: "reviewed" | "scheduled") => void;
}

export function DraftRow({ draft, onDismissed, onActionRecorded }: DraftRowProps) {
  const { review, schedule, dismiss, busy, dismissError } = useDraftActions({
    draft,
    onDismissed,
    onActionRecorded,
  });
  const { Icon, label } = pickPlatform(draft);
  const title = draft.title || "Untitled draft";

  return (
    <div className="group flex flex-col">
      {/* Row click = Review (primary). It is a button so it is keyboard-operable. */}
      <button
        type="button"
        onClick={() => void review()}
        aria-label={title}
        className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors"
      >
        <Icon size={15} className="shrink-0 text-primary/80" />
        <span className="flex-1 truncate text-sm text-foreground">{title}</span>

        {/* Meta label: shown at rest, hidden on hover (hover-capable) to make
            room for the action trio. Actions are always visible on touch. */}
        <span className="text-xs text-muted-foreground whitespace-nowrap [@media(hover:hover)]:group-hover:hidden">
          {label}
        </span>

        <span className="hidden items-center gap-3 [@media(hover:hover)]:group-hover:flex" aria-hidden="true">
          <Eye size={14} className="text-primary" />
          <Calendar size={14} className="text-foreground" />
          <Trash2 size={14} className="text-muted-foreground" />
        </span>
      </button>

      {/* Accessible / touch-operable controls. On hover-capable widths these sit
          inline-collapsed; the always-rendered buttons keep screen readers and
          touch users fully operable regardless of hover. */}
      <div className="flex items-center gap-4 px-3 pb-1.5 [@media(hover:hover)]:sr-only">
        <button type="button" onClick={() => void review()} aria-label="Review draft" className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Eye size={14} /> Review
        </button>
        <button type="button" onClick={() => void schedule()} aria-label="Schedule draft" className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Calendar size={14} /> Schedule
        </button>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy === "dismissing"}
          aria-label="Dismiss draft"
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground disabled:opacity-50"
        >
          <Trash2 size={14} /> {busy === "dismissing" ? "Dismissing…" : "Kill"}
        </button>
      </div>

      {dismissError && (
        <p role="alert" className="px-3 text-[11px] text-destructive">
          {dismissError}
        </p>
      )}
    </div>
  );
}
```

> Note on the action controls: the visible-on-hover glyph cluster inside the row button is decorative (`aria-hidden`). The real, labeled Review/Schedule/Kill buttons are always in the DOM (in the second div) so the component is fully operable by keyboard, screen reader, and touch. On hover-capable devices that second row is visually collapsed via `sr-only` and the glyphs reveal on `group-hover`; on touch devices (no hover) the labeled buttons render normally. This keeps the resting state to a single line while satisfying the spec's "touch must be operable without hover" requirement.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/dashboard/DraftRow.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DraftRow.tsx src/components/dashboard/DraftRow.test.tsx
git commit -m "feat(drafts): add DraftRow compact variant"
```

---

### Task 5: Wire `DraftsThreadMessage` to featured + rows

`drafts[0]` renders as `DraftCard` (featured); `drafts.slice(1)` render as `DraftRow`. Dismissing the featured draft promotes the next one automatically (it becomes the new `drafts[0]`).

**Files:**
- Modify: `src/components/create/DraftsThreadMessage.tsx:41-43`
- Test: `src/components/create/DraftsThreadMessage.test.tsx`

- [ ] **Step 1: Update the test to assert featured + rows**

Replace the `DraftCard` mock block and add a `DraftRow` mock + featured/rows assertions. Full updated test file:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftsThreadMessage } from './DraftsThreadMessage';
import { api } from '@/lib/api-client';
import type { DraftProposal } from '@/types';

vi.mock('@/lib/api-client', () => ({
  api: { drafts: { list: vi.fn() } },
}));

vi.mock('@/components/dashboard/DraftCard', () => ({
  DraftCard: ({ draft, onDismissed }: { draft: DraftProposal; onDismissed: (id: string) => void }) => (
    <div data-testid="draft-featured">
      <span>{draft.id}</span>
      <button onClick={() => onDismissed(draft.id)}>dismiss-featured</button>
    </div>
  ),
}));

vi.mock('@/components/dashboard/DraftRow', () => ({
  DraftRow: ({ draft, onDismissed }: { draft: DraftProposal; onDismissed: (id: string) => void }) => (
    <div data-testid="draft-row">
      <span>{draft.id}</span>
      <button onClick={() => onDismissed(draft.id)}>dismiss-row</button>
    </div>
  ),
}));

const listMock = vi.mocked(api.drafts.list);

function makeDraft(id: string): DraftProposal {
  return {
    id,
    title: `Draft ${id}`,
    created_at: '2026-06-13T00:00:00Z',
    origin: 'autonomous',
    content_linkedin: 'LinkedIn content',
    content_instagram: 'Instagram content',
    content_twitter: 'Twitter content',
  };
}

describe('DraftsThreadMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) renders nothing while loading', () => {
    listMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<DraftsThreadMessage />);
    expect(container.querySelector('#drafts')).toBeNull();
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });

  it('(b) renders nothing when API returns empty array', async () => {
    listMock.mockResolvedValue([]);
    const { container } = render(<DraftsThreadMessage />);
    await waitFor(() => {
      expect(container.querySelector('#drafts')).toBeNull();
    });
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });

  it('(c) renders the first draft featured and the rest as rows', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1'), makeDraft('draft-2'), makeDraft('draft-3')]);
    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByText('I drafted 3 things for you while you were away. Take a look.')).toBeInTheDocument();
    });

    const section = container.querySelector('#drafts');
    expect(section).not.toBeNull();
    expect(section).toHaveClass('scroll-mt-20');
    expect(section).toHaveAttribute('aria-label', 'Drafted for you');

    expect(screen.getAllByTestId('draft-featured')).toHaveLength(1);
    expect(screen.getByTestId('draft-featured')).toHaveTextContent('draft-1');
    const rows = screen.getAllByTestId('draft-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('draft-2');
    expect(rows[1]).toHaveTextContent('draft-3');
  });

  it('(d) renders only the featured card when a single draft resolves', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1')]);
    render(<DraftsThreadMessage />);
    await waitFor(() => {
      expect(screen.getByText('I drafted 1 thing for you while you were away. Take a look.')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('draft-featured')).toHaveLength(1);
    expect(screen.queryAllByTestId('draft-row')).toHaveLength(0);
  });

  it('(e) dismissing the featured draft promotes the next draft to featured', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1'), makeDraft('draft-2')]);
    render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByTestId('draft-featured')).toHaveTextContent('draft-1');
    });
    expect(screen.getByTestId('draft-row')).toHaveTextContent('draft-2');

    await userEvent.click(screen.getByRole('button', { name: 'dismiss-featured' }));

    await waitFor(() => {
      expect(screen.getByTestId('draft-featured')).toHaveTextContent('draft-2');
    });
    expect(screen.queryAllByTestId('draft-row')).toHaveLength(0);
  });

  it('(f) dismissing the last draft hides the section', async () => {
    listMock.mockResolvedValue([makeDraft('draft-1')]);
    const { container } = render(<DraftsThreadMessage />);

    await waitFor(() => {
      expect(screen.getByTestId('draft-featured')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'dismiss-featured' }));

    await waitFor(() => {
      expect(container.querySelector('#drafts')).toBeNull();
    });
    expect(screen.queryByText(/I drafted/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/create/DraftsThreadMessage.test.tsx`
Expected: FAIL — component still renders every draft via `DraftCard`; `draft-row` testid not found and featured-promotion assertions fail.

- [ ] **Step 3: Update the component render**

In `src/components/create/DraftsThreadMessage.tsx`, add the `DraftRow` import and split the map. Replace the import line and the `<section>` body:

```tsx
import { DraftCard } from '@/components/dashboard/DraftCard';
import { DraftRow } from '@/components/dashboard/DraftRow';
```

```tsx
  return (
    <section id="drafts" aria-label="Drafted for you" className="mb-2 scroll-mt-20">
      <p>I drafted {n} {noun} for you while you were away. Take a look.</p>
      <DraftCard key={drafts[0].id} draft={drafts[0]} onDismissed={handleDismiss} />
      {drafts.slice(1).map((d) => (
        <DraftRow key={d.id} draft={d} onDismissed={handleDismiss} />
      ))}
    </section>
  );
```

(The `if (!loaded || drafts.length === 0) return null;` guard above guarantees `drafts[0]` exists.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/create/DraftsThreadMessage.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/create/DraftsThreadMessage.tsx src/components/create/DraftsThreadMessage.test.tsx
git commit -m "feat(drafts): render first draft featured, rest as compact rows"
```

---

### Task 6: AutopilotProposalCard rationale to hover

Keep kit label + title at rest; reveal `rationale` on hover (hover-capable devices), keep it visible on touch.

**Files:**
- Modify: `src/components/create/AutopilotProposalCard.tsx:23`
- Test: `src/components/create/AutopilotProposalCard.test.tsx`

- [ ] **Step 1: Update the test**

Replace the file with assertions that title + kit label are always present and rationale carries the hover-collapse class:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutopilotProposalCard } from './AutopilotProposalCard';
import type { Proposal } from '@/types/advisor';

const proposal: Proposal = {
  id: 'p1',
  title: 'A LinkedIn post on hiring',
  rationale: 'You talk about team building often.',
  kitType: 'social_post',
  sourceRefs: [],
};

describe('AutopilotProposalCard', () => {
  it('always shows the title and kit label', () => {
    render(<AutopilotProposalCard proposal={proposal} onSelect={() => {}} />);
    expect(screen.getByText('A LinkedIn post on hiring')).toBeInTheDocument();
    expect(screen.getByText('social post')).toBeInTheDocument();
  });

  it('keeps the rationale in the DOM but collapses it at rest on hover devices', () => {
    render(<AutopilotProposalCard proposal={proposal} onSelect={() => {}} />);
    const rationale = screen.getByText(/team building/i);
    expect(rationale).toBeInTheDocument();
    expect(rationale.className).toContain('[@media(hover:hover)]:hidden');
    expect(rationale.className).toContain('[@media(hover:hover)]:group-hover:block');
  });

  it('calls onSelect with the proposal on click', async () => {
    const onSelect = vi.fn();
    render(<AutopilotProposalCard proposal={proposal} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(proposal);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/create/AutopilotProposalCard.test.tsx`
Expected: FAIL — rationale `<span>` has no hover classes; the className assertions fail.

- [ ] **Step 3: Update the component**

In `src/components/create/AutopilotProposalCard.tsx`, add `group` to the button class and update the rationale span. The button className becomes:

```tsx
      className="group flex h-full w-full flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
```

And the rationale span:

```tsx
      <span className="text-xs leading-relaxed text-muted-foreground [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:block">
        {proposal.rationale}
      </span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/create/AutopilotProposalCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/create/AutopilotProposalCard.tsx src/components/create/AutopilotProposalCard.test.tsx
git commit -m "feat(advisor): move proposal rationale to hover reveal"
```

---

### Task 7: Full suite + typecheck

Confirm nothing else broke (EchoHero advisor tests, etc.) and types are clean.

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS — all suites green, including `src/components/echo/EchoHero.advisor.test.tsx`, `src/components/create/AdvisorThread.test.tsx`, and the four files touched above.

- [ ] **Step 2: Typecheck / lint**

Run: `npm run lint`
Expected: no errors. (If the repo also exposes `npm run typecheck` or `tsc --noEmit`, run it; resolve any type errors before finishing.)

- [ ] **Step 3: Commit any lint fixups (if needed)**

```bash
git add -A
git commit -m "chore(drafts): lint/type fixups for tile density"
```

---

## Self-Review

**Spec coverage:**
- Featured + compact rows layout → Tasks 2 (preview), 4 (DraftRow), 5 (wiring). ✓
- Featured = `drafts[0]` → Task 5. ✓
- Preview 220→120, clamp-3→clamp-2 → Task 2. ✓
- Platform glyph + meta derivation (LinkedIn→Instagram→X→Draft) → Task 1. ✓
- Row hover→actions desktop, always-visible touch, row click→Review → Task 4 (sr-only/group-hover pattern + labeled always-rendered buttons). ✓
- Shared action logic (telemetry-with-timeout, 404-gone, dismiss error) reused → Task 3 (`useDraftActions`) consumed by both variants. ✓
- Dismiss promotes next to featured → Task 5 test (e). ✓
- Single-draft state, last-draft hides section → Task 5 tests (d), (f). ✓
- Proposal rationale to hover with touch fallback → Task 6. ✓
- No backend/API/type changes → confirmed; only FE components touched. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". All steps contain full code and exact commands. ✓

**Type consistency:** `DraftProposal` and `Proposal` fields match the verified shapes. `useDraftActions` return type `DraftActions` (`review/schedule/dismiss/busy/dismissError/href`) is used consistently by `DraftCard` (Task 3) and `DraftRow` (Task 4). `pickPlatform` returns `{ Icon, label }` used consistently in Task 1 and Task 4. Component prop names (`draft`, `onDismissed`, `onActionRecorded`) consistent across tasks. ✓
