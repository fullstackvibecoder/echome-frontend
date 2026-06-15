# Create Empty State Voice-Ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Create-page empty-state pitch sentence with the existing `/app/voice` ingest menu (`KBUnifiedInput`) under a "Teach Echo your voice" heading, so the 34.9% empty cohort can build their voice profile (Job A) in place.

**Architecture:** `EchoHero` owns the data: `useKnowledgeBase()` supplies the default KB id, `useAdvisor()` (extended with `refetch`) supplies advisor state. Both flow as props into `AdvisorThread`, whose empty branch mounts `KBUnifiedInput`. A successful import calls `onImportComplete` → `refetch`, advancing empty → thin in place. Composer below (Job B) is untouched. No backend changes.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-15-create-empty-state-voice-ingest-design.md`

**Branch:** `feat/create-empty-state-voice-ingest` (already created; spec already committed).

---

## File Structure

- `src/components/echo/useAdvisor.ts` — MODIFY. Extract mount fetch into a `useCallback`, expose `refetch` in the result. New field on `UseAdvisorResult`.
- `src/components/echo/useAdvisor.test.ts` — CREATE (or MODIFY if exists). Test that `refetch()` re-hits `api.kb.advisor()`.
- `src/components/create/AdvisorThread.tsx` — MODIFY. Two new props (`kbId`, `onImportComplete`); empty branch renders heading + `KBUnifiedInput` (or null-kbId stub). Remove `PITCH`.
- `src/components/create/AdvisorThread.test.tsx` — MODIFY. Rewrite empty-state tests; mock `KBUnifiedInput`. Thin/rich unchanged. Update `makeAdvisor` callers to pass new props.
- `src/components/echo/EchoHero.tsx` — MODIFY. Add `useKnowledgeBase`, consume `refetch`, pass `kbId`/`onImportComplete` to `AdvisorThread`, swap empty-state h1/subhead to Job-A copy.
- `src/components/echo/EchoHero.advisor.test.tsx` — MODIFY. Mock `useKnowledgeBase`; assert AdvisorThread receives `kbId` + that `onImportComplete` triggers refetch.

---

### Task 1: Add `refetch` to useAdvisor

**Files:**
- Modify: `src/components/echo/useAdvisor.ts`
- Test: `src/components/echo/useAdvisor.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/echo/useAdvisor.test.ts`:

```ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdvisor } from './useAdvisor';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: { kb: { advisor: vi.fn() } },
}));

const ADVISOR = {
  state: 'empty' as const,
  coverage: {},
  nudge: { headline: '', subhead: '', actions: [] },
  proposals: [],
};

describe('useAdvisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.kb.advisor).mockResolvedValue({ success: true, data: ADVISOR } as never);
  });

  it('fetches the advisor once on mount', async () => {
    const { result } = renderHook(() => useAdvisor());
    await waitFor(() => expect(result.current.advisor).toEqual(ADVISOR));
    expect(api.kb.advisor).toHaveBeenCalledTimes(1);
  });

  it('refetch() re-hits api.kb.advisor', async () => {
    const { result } = renderHook(() => useAdvisor());
    await waitFor(() => expect(result.current.advisor).toEqual(ADVISOR));
    await act(async () => {
      await result.current.refetch();
    });
    expect(api.kb.advisor).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/echo/useAdvisor.test.ts`
Expected: FAIL — `result.current.refetch is not a function`.

- [ ] **Step 3: Implement refetch**

Replace the body of `src/components/echo/useAdvisor.ts` with:

```ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import type { AdvisorResponse } from '@/types/advisor';

export interface UseAdvisorResult {
  advisor: AdvisorResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches the KB advisor for the Echo thread. The advisor drives the in-thread
 * coverage line, gap nudges, and autopilot proposals. Fetches once on mount;
 * `refetch` re-runs it (used after a voice-ingest import so the empty state
 * advances to thin/rich in place).
 */
export function useAdvisor(): UseAdvisorResult {
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvisor = useCallback(async () => {
    try {
      const res = await api.kb.advisor();
      if (res?.success && res.data) {
        setAdvisor(res.data);
        setError(null);
      } else {
        setAdvisor(null);
        setError(res?.error ?? 'Advisor unavailable');
      }
    } catch (e) {
      setAdvisor(null);
      setError(extractErrorMessage(e, 'Advisor failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdvisor();
  }, [fetchAdvisor]);

  return { advisor, loading, error, refetch: fetchAdvisor };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/echo/useAdvisor.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/echo/useAdvisor.ts src/components/echo/useAdvisor.test.ts
git commit -m "feat(create): expose refetch from useAdvisor"
```

---

### Task 2: AdvisorThread empty branch mounts KBUnifiedInput

**Files:**
- Modify: `src/components/create/AdvisorThread.tsx:14-15` (remove PITCH), `:17-21` (props), `:64-75` (empty branch)
- Test: `src/components/create/AdvisorThread.test.tsx`

- [ ] **Step 1: Update the tests first (failing)**

In `src/components/create/AdvisorThread.test.tsx`:

(a) Add a `KBUnifiedInput` mock at the top with the other `vi.mock` calls:

```tsx
vi.mock('@/app/app/voice/KBUnifiedInput', () => ({
  KBUnifiedInput: ({ knowledgeBaseId }: { knowledgeBaseId: string | null }) => (
    <div data-testid="kb-unified-input" data-kbid={knowledgeBaseId ?? ''} />
  ),
}));
```

(b) Change the import line to drop `PITCH`:

```tsx
import { AdvisorThread } from './AdvisorThread';
```

(c) Add the new required props to every `<AdvisorThread .../>` render in the file. The simplest path: add a helper and use it. Replace each `render(<AdvisorThread advisor={...} onNudgeAction={...} onProposalSelect={...} />)` so it also passes `kbId="kb1"` and `onImportComplete={vi.fn()}`. Concretely, every render call gains these two props, e.g.:

```tsx
render(
  <AdvisorThread
    advisor={advisor}
    onNudgeAction={vi.fn()}
    onProposalSelect={vi.fn()}
    kbId="kb1"
    onImportComplete={vi.fn()}
  />,
);
```

(d) Replace the entire `describe('empty state', ...)` block with:

```tsx
describe('empty state', () => {
  it('renders the advisor-empty wrapper', () => {
    const advisor = makeAdvisor({ state: 'empty' });
    render(
      <AdvisorThread
        advisor={advisor}
        onNudgeAction={vi.fn()}
        onProposalSelect={vi.fn()}
        kbId="kb1"
        onImportComplete={vi.fn()}
      />,
    );
    expect(screen.getByTestId('advisor-empty')).toBeInTheDocument();
  });

  it('shows the "Teach Echo your voice" heading', () => {
    const advisor = makeAdvisor({ state: 'empty' });
    render(
      <AdvisorThread
        advisor={advisor}
        onNudgeAction={vi.fn()}
        onProposalSelect={vi.fn()}
        kbId="kb1"
        onImportComplete={vi.fn()}
      />,
    );
    expect(screen.getByText('Teach Echo your voice')).toBeInTheDocument();
  });

  it('mounts KBUnifiedInput with the kbId when kbId is set', () => {
    const advisor = makeAdvisor({ state: 'empty' });
    render(
      <AdvisorThread
        advisor={advisor}
        onNudgeAction={vi.fn()}
        onProposalSelect={vi.fn()}
        kbId="kb1"
        onImportComplete={vi.fn()}
      />,
    );
    const input = screen.getByTestId('kb-unified-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('data-kbid', 'kb1');
  });

  it('renders a setup stub (no KBUnifiedInput) when kbId is null', () => {
    const advisor = makeAdvisor({ state: 'empty' });
    render(
      <AdvisorThread
        advisor={advisor}
        onNudgeAction={vi.fn()}
        onProposalSelect={vi.fn()}
        kbId={null}
        onImportComplete={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('kb-unified-input')).not.toBeInTheDocument();
    expect(screen.getByText('Setting up your voice...')).toBeInTheDocument();
  });

  it('does not render coverage or proposals', () => {
    const advisor = makeAdvisor({ state: 'empty' });
    render(
      <AdvisorThread
        advisor={advisor}
        onNudgeAction={vi.fn()}
        onProposalSelect={vi.fn()}
        kbId="kb1"
        onImportComplete={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('coverage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('proposal')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/components/create/AdvisorThread.test.tsx`
Expected: FAIL — TypeScript/prop errors (AdvisorThread has no `kbId`/`onImportComplete`) and "Teach Echo your voice" not found.

- [ ] **Step 3: Implement the AdvisorThread changes**

In `src/components/create/AdvisorThread.tsx`:

(a) Add the import near the top (after the existing imports):

```tsx
import { KBUnifiedInput } from '@/app/app/voice/KBUnifiedInput';
```

(b) Remove the `PITCH` export (lines 14-15):

```tsx
// (delete these two lines)
export const PITCH =
  'The fastest way to sound like you is to talk to me. Two minutes of your voice teaches me more than a stack of documents.';
```

(c) Extend the props interface:

```tsx
interface AdvisorThreadProps {
  advisor: AdvisorResponse;
  onNudgeAction: (action: NudgeAction) => void;
  onProposalSelect: (proposal: Proposal) => void;
  kbId: string | null;
  onImportComplete: () => void;
}
```

(d) Update the function signature destructure:

```tsx
export function AdvisorThread({
  advisor,
  onNudgeAction,
  onProposalSelect,
  kbId,
  onImportComplete,
}: AdvisorThreadProps) {
```

(e) Replace the empty branch (the `if (advisor.state === 'empty')` block) with:

```tsx
  if (advisor.state === 'empty') {
    return (
      <div data-testid="advisor-empty" className="space-y-3">
        <div>
          <p className="text-base font-semibold leading-snug text-foreground">
            Teach Echo your voice
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Echo learns how you write from what you share. The more you give it, the more every post sounds like you.
          </p>
        </div>
        {kbId ? (
          <KBUnifiedInput knowledgeBaseId={kbId} onImportComplete={onImportComplete} />
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Setting up your voice...
          </p>
        )}
      </div>
    );
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/create/AdvisorThread.test.tsx`
Expected: PASS (all empty/thin/rich tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors from `AdvisorThread.tsx`. (NOTE: `EchoHero.tsx` will now error because it renders `AdvisorThread` without the new props — that is fixed in Task 3. If `tsc` reports ONLY EchoHero.tsx errors, proceed; they resolve in Task 3.)

- [ ] **Step 6: Commit**

```bash
git add src/components/create/AdvisorThread.tsx src/components/create/AdvisorThread.test.tsx
git commit -m "feat(create): empty-state mounts voice-ingest menu (Job A)"
```

---

### Task 3: Wire EchoHero (KB id, refetch, Job-A hero copy)

**Files:**
- Modify: `src/components/echo/EchoHero.tsx` (imports ~24-31, advisor hook ~97, hero header ~171-189, AdvisorThread render ~192-199)
- Test: `src/components/echo/EchoHero.advisor.test.tsx`

- [ ] **Step 1: Update the test first (failing)**

In `src/components/echo/EchoHero.advisor.test.tsx`:

(a) Add a `useKnowledgeBase` mock alongside the other `vi.mock` calls:

```tsx
vi.mock('@/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ selectedKb: 'kb1' }),
}));
```

(b) Extend the `AdvisorThread` mock so the test can observe the new props. Replace the existing `vi.mock('@/components/create/AdvisorThread', ...)` block with:

```tsx
vi.mock('@/components/create/AdvisorThread', () => ({
  AdvisorThread: ({
    onNudgeAction,
    onProposalSelect,
    kbId,
    onImportComplete,
  }: {
    onNudgeAction: (action: { type: string; label: string; payload?: Record<string, unknown> }) => void;
    onProposalSelect: (proposal: { id: string; title: string; rationale: string; kitType: string; sourceRefs: string[] }) => void;
    kbId: string | null;
    onImportComplete: () => void;
  }) => (
    <div data-testid="advisor-thread" data-kbid={kbId ?? ''}>
      <button
        data-testid="na-voice"
        onClick={() => onNudgeAction({ type: 'voice', label: 'Record now' })}
      />
      <button
        data-testid="na-ingest"
        onClick={() => onNudgeAction({ type: 'ingest', label: 'Add a file' })}
      />
      <button
        data-testid="na-create"
        onClick={() =>
          onNudgeAction({ type: 'create', label: 'x', payload: { prompt: 'hello world' } })
        }
      />
      <button
        data-testid="na-create-no-payload"
        onClick={() =>
          onNudgeAction({ type: 'create', label: 'Make something now' })
        }
      />
      <button
        data-testid="prop-select"
        onClick={() =>
          onProposalSelect({
            id: 'p1',
            title: 'My Proposal',
            rationale: '',
            kitType: '',
            sourceRefs: [],
          })
        }
      />
      <button data-testid="trigger-import" onClick={() => onImportComplete()} />
    </div>
  ),
}));
```

(c) Update the `useAdvisor` mock default in `beforeEach` to include `refetch`:

```tsx
vi.mocked(useAdvisor).mockReturnValue({
  advisor: ADVISOR_FIXTURE,
  loading: false,
  error: null,
  refetch: vi.fn(),
});
```

Also update the null-advisor case in the test "hides AdvisorThread...":

```tsx
vi.mocked(useAdvisor).mockReturnValue({ advisor: null, loading: false, error: null, refetch: vi.fn() });
```

(d) Add two new tests at the end of the `describe`:

```tsx
  it('passes the resolved kbId into AdvisorThread', () => {
    render(<EchoHero />);
    expect(screen.getByTestId('advisor-thread')).toHaveAttribute('data-kbid', 'kb1');
  });

  it('onImportComplete triggers advisor refetch', () => {
    const refetch = vi.fn();
    vi.mocked(useAdvisor).mockReturnValue({
      advisor: ADVISOR_FIXTURE,
      loading: false,
      error: null,
      refetch,
    });
    render(<EchoHero />);
    fireEvent.click(screen.getByTestId('trigger-import'));
    expect(refetch).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/components/echo/EchoHero.advisor.test.tsx`
Expected: FAIL — `data-kbid` is empty (EchoHero not passing kbId) and refetch not wired.

- [ ] **Step 3: Implement EchoHero changes**

In `src/components/echo/EchoHero.tsx`:

(a) Add the import (with the other `@/` imports near the top):

```tsx
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
```

(b) Update the advisor hook line (was `const { advisor } = useAdvisor();`):

```tsx
  // ---- KB Advisor ----
  const { advisor, refetch: refetchAdvisor } = useAdvisor();

  // ---- KB id (default KB auto-resolves for non-teams users) ----
  const { selectedKb } = useKnowledgeBase();
```

(c) Replace the empty-state static hero header block (the `h1` + `p` inside the `{(!advisor || advisor.state === 'empty') && (...)}` guard) with Job-A copy:

```tsx
      {(!advisor || advisor.state === 'empty') && (
        <>
          <h1
            className="mb-2 text-center font-semibold leading-tight"
            style={{
              fontSize: 'clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem)',
              color: 'var(--foreground)',
            }}
          >
            Teach Echo to write in your voice.
          </h1>
          <p
            className="mb-6 text-center text-sm leading-snug max-w-xl"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Share how you already communicate. Echo learns your voice from it. Then it writes posts that sound like you.
          </p>
        </>
      )}
```

(d) Update the `<AdvisorThread />` render to pass the two new props:

```tsx
        {advisor && (
          <AdvisorThread
            advisor={advisor}
            onNudgeAction={handleNudgeAction}
            onProposalSelect={handleProposalSelect}
            kbId={selectedKb}
            onImportComplete={refetchAdvisor}
          />
        )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/echo/EchoHero.advisor.test.tsx`
Expected: PASS (all original tests + 2 new).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/echo/EchoHero.tsx src/components/echo/EchoHero.advisor.test.tsx
git commit -m "feat(create): wire EchoHero kbId + advisor refetch; Job-A hero copy"
```

---

### Task 4: Full suite + lint gate

**Files:** none (verification only)

- [ ] **Step 1: Run the affected suites together**

Run: `npx vitest run src/components/echo src/components/create`
Expected: PASS — all advisor/hero/thread tests green.

- [ ] **Step 2: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Lint the changed files**

Run: `npx eslint src/components/echo/useAdvisor.ts src/components/create/AdvisorThread.tsx src/components/echo/EchoHero.tsx`
Expected: No errors.

- [ ] **Step 4: Final commit if lint auto-fixed anything (else skip)**

```bash
git add -A && git commit -m "chore(create): lint fixes for voice-ingest empty state" || echo "nothing to commit"
```

---

## Self-Review

**1. Spec coverage:**
- Empty branch heading + KBUnifiedInput + subhead → Task 2 ✓
- Null-kbId stub → Task 2 (Step 3e + test) ✓
- Remove PITCH → Task 2 (Step 3b) ✓
- EchoHero kbId via useKnowledgeBase → Task 3 ✓
- EchoHero Job-A h1/subhead → Task 3 (Step 3c) ✓
- onImportComplete → refetch in place → Tasks 1 + 3 ✓
- useAdvisor refetch → Task 1 ✓
- Do NOT touch scrape plumbing / composer / thin-rich branches → no task modifies them ✓
- Tests for all three units → Tasks 1, 2, 3 ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**3. Type consistency:** `kbId: string | null` and `onImportComplete: () => void` identical across AdvisorThread props (Task 2), EchoHero render (Task 3), and mocks. `refetch: () => Promise<void>` on `UseAdvisorResult` (Task 1) matches consumption in EchoHero (`refetch: refetchAdvisor`) and test mocks (`refetch: vi.fn()`). `KBUnifiedInput` props `{ knowledgeBaseId, onImportComplete }` match the real component. ✓
