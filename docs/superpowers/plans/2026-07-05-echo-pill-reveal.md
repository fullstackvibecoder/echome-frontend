# Echo Pill Capability Reveal (SP1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the expanded Echo pill reveal its capabilities: page-aware suggestion chips, an affordance line, and a global ingest-complete event so pill ingests refresh the Create-page advisor.

**Architecture:** One new pure module (route→chips map), two surgical component edits (EchoPill renders chips + affordance line; EchoHero listens for a CustomEvent), one hook edit (useEcho dispatches the event from a single helper that replaces all direct `onIngestCompleteRef` calls).

**Tech Stack:** Next.js app router, React, vitest. Test runner is **vitest** (`npx vitest run <path>`), NOT jest. React Compiler lint bans manual useMemo.

## Global Constraints

- Chips PREFILL the input and focus the textarea. They never auto-submit.
- No em dashes in any user-facing copy. Use periods/commas.
- Collapsed pill markup unchanged. No new modals, tours, or onboarding.
- EchoExchange.tsx is NOT modified (chips and affordance line live in EchoPill.tsx, outside the shared exchange component).
- Branch: `feat/echo-pill-reveal` off develop.

---

### Task 1: Route→chips map module

**Files:**
- Create: `src/components/echo/pill-suggestions.ts`
- Test: `src/components/echo/pill-suggestions.test.ts`

**Interfaces:**
- Produces: `getPillSuggestions(pathname: string): string[]` (max 3 strings), consumed by Task 2.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/echo/pill-suggestions.test.ts
import { describe, it, expect } from 'vitest';
import { getPillSuggestions } from './pill-suggestions';

describe('getPillSuggestions', () => {
  it('returns kit-page chips for a library detail route', () => {
    expect(getPillSuggestions('/app/library/d169fed1-d291-45dd-9216-521d8440cf5a')).toEqual([
      'Regenerate the LinkedIn post',
      "What's in this kit?",
      'Schedule this kit',
    ]);
  });

  it('returns library chips for the library index (no trailing id)', () => {
    expect(getPillSuggestions('/app/library')).toEqual([
      'What should I post next?',
      'Find my kit about...',
    ]);
  });

  it('returns calendar chips', () => {
    expect(getPillSuggestions('/app/calendar')).toEqual([
      "What's scheduled this week?",
      'What should I post next?',
    ]);
  });

  it('returns voice chip', () => {
    expect(getPillSuggestions('/app/voice')).toEqual([
      'How strong is my voice profile?',
    ]);
  });

  it('falls back to default chips on unknown routes', () => {
    expect(getPillSuggestions('/app/settings')).toEqual([
      'Paste a link to create content',
      'Ask me anything about your content',
    ]);
  });

  it('never returns more than 3 chips for any known route', () => {
    for (const p of ['/app/library/abc', '/app/library', '/app/calendar', '/app/voice', '/app/anything']) {
      expect(getPillSuggestions(p).length).toBeLessThanOrEqual(3);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/echo/pill-suggestions.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write the implementation**

```ts
// src/components/echo/pill-suggestions.ts
/**
 * Route-keyed suggestion chips for the expanded Echo pill. Static copy only,
 * no API calls. Chips PREFILL the input (never auto-submit) so the user
 * always reviews before sending. Order matters: most likely ask first.
 */

const KIT_DETAIL = /^\/app\/library\/[^/]+$/;

export function getPillSuggestions(pathname: string): string[] {
  if (KIT_DETAIL.test(pathname)) {
    return [
      'Regenerate the LinkedIn post',
      "What's in this kit?",
      'Schedule this kit',
    ];
  }
  if (pathname === '/app/library') {
    return ['What should I post next?', 'Find my kit about...'];
  }
  if (pathname === '/app/calendar') {
    return ["What's scheduled this week?", 'What should I post next?'];
  }
  if (pathname === '/app/voice') {
    return ['How strong is my voice profile?'];
  }
  return ['Paste a link to create content', 'Ask me anything about your content'];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/echo/pill-suggestions.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/echo/pill-suggestions.ts src/components/echo/pill-suggestions.test.ts
git commit -m "feat(echo): route-keyed suggestion chips map for the pill"
```

---

### Task 2: Render chips + affordance line in EchoPill

**Files:**
- Modify: `src/components/echo/EchoPill.tsx` (expanded panel, around lines 208-292)

**Interfaces:**
- Consumes: `getPillSuggestions(pathname)` from Task 1; existing `setInputText`, `textareaRef`, `pathname`, `state.phase` already in the component.

Context you need (verbatim from current file): the expanded panel is the `{isOpen && (<div ref={exchangeRef} ...>)}` block; `<EchoExchange ... />` is mounted at its end (line 286-290); `pathname` exists at line 38 (`const pathname = usePathname();`); `textareaRef` is a `useRef<HTMLTextAreaElement | null>` filled via `onTextareaMount`.

- [ ] **Step 1: Add import**

At the top of `EchoPill.tsx`, next to the other local imports:

```tsx
import { getPillSuggestions } from './pill-suggestions';
```

- [ ] **Step 2: Insert chips block ABOVE `<EchoExchange`**

Immediately before the `<EchoExchange` JSX (after the a11y `aria-live` div), insert:

```tsx
          {/* Page-aware suggestion chips. Prefill only, never auto-submit:
              the user always reviews before sending. Shown only while the
              exchange is idle/open so receipts and forks keep the space. */}
          {(state.phase === 'idle' || state.phase === 'open') && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {getPillSuggestions(pathname ?? '').map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInputText(chip);
                    setTimeout(() => textareaRef.current?.focus(), 30);
                  }}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-container)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] hover:text-foreground hover:border-[rgba(0,212,255,0.4)] transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
```

NOTE: check the actual phase union in `useEcho` state before using `'idle' | 'open'` — read `EchoState` in `useEcho.ts` and gate on the phase(s) that represent "no exchange in progress" (the pre-submit state). If only `'idle'` exists pre-open and the panel is only rendered when open, gate on the pre-submit phase used when the panel first expands.

- [ ] **Step 3: Insert affordance line BELOW `<EchoExchange ... />`**

Immediately after the `<EchoExchange ... />` element, still inside the panel div:

```tsx
          {/* Do-to-get affordance line: reveal the pill's non-obvious powers. */}
          <p className="mt-2 px-1 text-[11px] leading-snug text-[var(--muted-foreground)]/70">
            Drop a video or doc to teach Echo. Paste a link to create content. Tap the mic to talk.
          </p>
```

- [ ] **Step 4: Typecheck + lint + full echo suite**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx vitest run src/components/echo` — all existing echo tests still pass.
Run: `npx eslint src/components/echo/EchoPill.tsx` — no NEW errors vs baseline (`git stash` compare if unsure).

- [ ] **Step 5: Commit**

```bash
git add src/components/echo/EchoPill.tsx
git commit -m "feat(echo): page-aware chips + affordance line in expanded pill"
```

---

### Task 3: Ingest-complete event (useEcho dispatch + EchoHero listener)

**Files:**
- Modify: `src/components/echo/useEcho.ts`
- Modify: `src/components/echo/EchoHero.tsx`
- Test: `src/components/echo/useEcho.ingest-event.test.ts` (new)

**Interfaces:**
- Produces: `window` CustomEvent `'echo:ingest-complete'` (no detail payload consumers depend on).

- [ ] **Step 1: Add the helper in useEcho.ts**

Directly after the existing `onIngestCompleteRef` block (lines 174-177):

```ts
  // Single ingest-complete fanout: fires the direct callback (EchoHero passes
  // its advisor refetch) AND a window event, so surfaces that did not mount
  // this hook instance (the Create-page hero when ingest happens via the
  // global pill) can refresh too.
  const notifyIngestComplete = useCallback(() => {
    onIngestCompleteRef.current?.();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('echo:ingest-complete'));
    }
  }, []);
```

- [ ] **Step 2: Replace every `onIngestCompleteRef.current?.();` call with `notifyIngestComplete();`**

Six existing sites (audio 508, document 534, mbox 574, text-file 594, URL-import 644, plain note 654 — line numbers approximate, match on the exact string). Also ADD `notifyIngestComplete();` at the two ingest-success sites that today never fire it:
- `chooseDestination` stockpile branch: after the `setState` that sets `confirmation: { title: \`Saved ${res.savedCount} videos to clip later\`...}` (~line 842)
- `chooseFileDestination` stockpile-poll success: inside the `if (statusMessage === 'Saved to your library.')` block after its `setState` (~line 929)

If `notifyIngestComplete` is defined after the callbacks that need it, hoist via the same ref pattern the file already uses for `scheduleRebake`-style forward references, or simply define the helper before the first usage (preferred; it only depends on the ref).

- [ ] **Step 3: Add EchoHero listener**

In `EchoHero.tsx`, after the existing mount `useEffect` (lines 107-119), add:

```tsx
  // Pill ingests happen in a different useEcho instance; the window event is
  // how they reach this advisor. Direct hero ingests already refetch via
  // onIngestComplete, so a double refetch here is a harmless no-op fetch.
  useEffect(() => {
    const onIngest = () => refetchAdvisor();
    window.addEventListener('echo:ingest-complete', onIngest);
    return () => window.removeEventListener('echo:ingest-complete', onIngest);
  }, [refetchAdvisor]);
```

- [ ] **Step 4: Write the test**

```ts
// src/components/echo/useEcho.ingest-event.test.ts
// Asserts the plain-note ingest path dispatches the window event.
// Mock pattern: copy the api mock setup style from useEcho.fork.test.ts
// (same module mocks, same renderHook harness). The assertion:
import { describe, it, expect, vi } from 'vitest';
// ...same mocks as useEcho.fork.test.ts...

it('dispatches echo:ingest-complete after a successful text-note ingest', async () => {
  const listener = vi.fn();
  window.addEventListener('echo:ingest-complete', listener);
  // drive the hook through classify->ingest confirm for a plain text note,
  // exactly as useEcho.fork.test.ts drives chooseDestination
  // ...
  expect(listener).toHaveBeenCalled();
  window.removeEventListener('echo:ingest-complete', listener);
});
```

Follow `useEcho.fork.test.ts` for the concrete harness; the deliverable is one passing test proving the event fires on an ingest success path.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/echo`
Expected: all pass including the new one.

- [ ] **Step 6: Commit**

```bash
git add src/components/echo/useEcho.ts src/components/echo/EchoHero.tsx src/components/echo/useEcho.ingest-event.test.ts
git commit -m "fix(echo): pill ingests refresh the Create advisor via window event"
```
