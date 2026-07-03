# Create Page Fold Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Create page so the first viewport contains only a personalized question, the composer, and suggestion chips; recents, voice strength, and Teams onboarding move below the fold.

**Architecture:** All changes live in `echome-frontend`. New small components under `src/components/create/` (CreateHeroHeader, QuotaLine, ProposalChips, StarterChips, RecentKitsStrip, VoiceStrengthStrip) are assembled by `src/components/echo/EchoHero.tsx`. `AppContent.tsx` stops rendering the quota banner and Teams banner above the hero on the redesign path and passes quota data down as a prop. Zero backend changes.

**Tech Stack:** Next.js (App Router), React 18, TypeScript, Tailwind classes + CSS custom properties, vitest + @testing-library/react + userEvent for unit tests.

**Spec:** `docs/superpowers/specs/2026-07-03-create-page-fold-discipline-design.md` (read it; it governs).

## Global Constraints

- Frontend only. Zero backend changes, no new endpoints, no schema changes.
- No em dashes in any user-facing copy. Use periods or commas.
- Cyan (`--primary` / `rgba(0,212,255,...)`) is reserved for: focus glow, waveform, and the single top-pick proposal chip. Nothing else gets cyan.
- All existing `data-tour` attributes must survive: `echo-hero-input`, `echo-hero-attach`, `echo-hero-mic` stay where they are; `echo-hero-voice` moves onto the VoiceStrengthStrip's /app/voice link.
- Voice-scope rule: voice = written posts only. Never write copy saying clips "sound like you".
- `useEcho` state machine, `EchoExchange` behavior, hidden `GenerationForm` mount contract, `SketchExplainer`, and the non-redesign rollback branch in AppContent are untouched except where a task explicitly says otherwise.
- `EchoExchange`'s current placeholder must NOT change for `EchoPill` (the docked pill also renders EchoExchange). The new placeholder applies only to the hero.
- `CoverageMeter.tsx` and `AutopilotProposalCard.tsx` are NOT deleted: `AdaptiveCreateSurface.tsx` still imports them. Only their EchoHero-path usage (via AdvisorThread) goes away. `AdvisorThread.tsx` (+ its test) and `VoiceLearningChip.tsx` ARE deleted.
- Exact H1 copy, placeholder copy, quota copy, chip copy: use the strings in this plan verbatim.
- Test runner is vitest: `npx vitest run <file>`. Full unit suite: `npm run test:unit`.
- Commit after every task. Branch: `feat/create-fold-discipline` (already exists, spec committed on it).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/components/create/CreateHeroHeader.tsx` | create | H1 + one-line nudge for thin/rich states |
| `src/components/create/QuotaLine.tsx` | create | Quiet free-quota line under composer |
| `src/components/create/ProposalChips.tsx` | create | Advisor proposals as pill chips (thin/rich) |
| `src/components/create/StarterChips.tsx` | create | Empty-state starter chips |
| `src/components/create/RecentKitsStrip.tsx` | create | Below-fold recent content kits |
| `src/components/create/VoiceStrengthStrip.tsx` | create | Below-fold voice tier ring + coverage subline + CTA |
| `src/components/echo/EchoExchange.tsx` | modify | Add optional `placeholder` prop |
| `src/components/echo/EchoHero.tsx` | modify | Assemble everything; drop AdvisorThread, helper copy, VoiceLearningChip |
| `src/app/app/AppContent.tsx` | modify | Demote quota banner + Teams banner on redesign path; pass quota prop |
| `src/components/create/AdvisorThread.tsx` + `.test.tsx` | delete | Replaced by header/chips/strip |
| `src/components/echo/VoiceLearningChip.tsx` | delete | Merged into VoiceStrengthStrip |

---

### Task 1: CreateHeroHeader component

**Files:**
- Create: `src/components/create/CreateHeroHeader.tsx`
- Test: `src/components/create/CreateHeroHeader.test.tsx`

**Interfaces:**
- Consumes: `AdvisorState` from `@/types/advisor` (`'empty' | 'thin' | 'rich'` — check the actual export name in `src/types/advisor.ts`; it is the `state` field type of `AdvisorResponse`).
- Produces: `CreateHeroHeader({ state, nudgeHeadline, firstName }: { state: 'empty' | 'thin' | 'rich' | null; nudgeHeadline?: string; firstName?: string })`. Renders null for `empty`/`null` state. Task 4 mounts this in EchoHero.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/create/CreateHeroHeader.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CreateHeroHeader } from './CreateHeroHeader';

describe('CreateHeroHeader', () => {
  it('renders nothing for empty state (EchoHero owns the teach-first header)', () => {
    const { container } = render(
      <CreateHeroHeader state="empty" nudgeHeadline="x" firstName="Ara" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while advisor state is unknown (null)', () => {
    const { container } = render(<CreateHeroHeader state={null} firstName="Ara" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders personalized H1 in rich state', () => {
    render(<CreateHeroHeader state="rich" firstName="Ara" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to create, Ara?' }),
    ).toBeInTheDocument();
  });

  it('renders personalized H1 in thin state', () => {
    render(<CreateHeroHeader state="thin" firstName="Ara" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to create, Ara?' }),
    ).toBeInTheDocument();
  });

  it('renders nameless H1 when firstName is missing', () => {
    render(<CreateHeroHeader state="rich" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to create?' }),
    ).toBeInTheDocument();
  });

  it('renders the nudge line when headline is non-empty', () => {
    render(<CreateHeroHeader state="rich" firstName="Ara" nudgeHeadline="Echo learned from 3 new videos" />);
    expect(screen.getByText('Echo learned from 3 new videos')).toBeInTheDocument();
  });

  it('renders no nudge line when headline is empty or absent', () => {
    render(<CreateHeroHeader state="rich" firstName="Ara" nudgeHeadline="" />);
    expect(screen.queryByTestId('hero-nudge-line')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/create/CreateHeroHeader.test.tsx`
Expected: FAIL, cannot resolve `./CreateHeroHeader`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/create/CreateHeroHeader.tsx
'use client';

/**
 * CreateHeroHeader.tsx
 * Personalized H1 + one-line advisor nudge for the Create page hero,
 * shown in thin/rich KB states. The empty state keeps its own
 * teach-first header inside EchoHero, so this renders nothing there.
 */

interface CreateHeroHeaderProps {
  state: 'empty' | 'thin' | 'rich' | null;
  nudgeHeadline?: string;
  firstName?: string;
}

export function CreateHeroHeader({ state, nudgeHeadline, firstName }: CreateHeroHeaderProps) {
  if (state !== 'thin' && state !== 'rich') return null;

  const heading = firstName
    ? `What do you want to create, ${firstName}?`
    : 'What do you want to create?';

  return (
    <div className="w-full max-w-2xl">
      <h1
        className="mb-2 text-center font-semibold leading-tight"
        style={{
          fontSize: 'clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem)',
          color: 'var(--foreground)',
          textWrap: 'balance',
        }}
      >
        {heading}
      </h1>
      {nudgeHeadline ? (
        <p
          data-testid="hero-nudge-line"
          className="mb-6 text-center text-sm leading-snug text-muted-foreground"
        >
          {nudgeHeadline}
        </p>
      ) : (
        <div className="mb-4" aria-hidden="true" />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/create/CreateHeroHeader.test.tsx`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/create/CreateHeroHeader.tsx src/components/create/CreateHeroHeader.test.tsx
git commit -m "feat(create): CreateHeroHeader — personalized H1 + one-line nudge for thin/rich states"
```

---

### Task 2: Composer copy strip (placeholder prop + remove helper chrome)

**Files:**
- Modify: `src/components/echo/EchoExchange.tsx` (textarea placeholder, ~line 425)
- Modify: `src/components/echo/EchoHero.tsx` (machine caption span ~lines 308-313; helper paragraph ~lines 361-364; pass placeholder)
- Modify: `src/components/echo/EchoHero.copy.test.tsx` (helper-line assertion, ~line 140)
- Test: `src/components/echo/EchoHero.copy.test.tsx`

**Interfaces:**
- Produces: `EchoExchange` gains optional prop `placeholder?: string` (default: the current string `"Type here. Paste a link, or use the buttons on the left to attach a video or record your voice."`). EchoPill passes nothing and is unaffected.

- [ ] **Step 1: Update the copy test to pin the NEW contract (fails first)**

In `src/components/echo/EchoHero.copy.test.tsx`, replace the "source helper line is present" test with:

```tsx
  it('helper paragraph and machine caption are gone; placeholder carries affordances', () => {
    renderHero();
    // Old helper paragraph must not render
    expect(
      screen.queryByText(/Best way to start: tap the mic/),
    ).not.toBeInTheDocument();
    // Old machine caption must not render
    expect(
      screen.queryByText(/VIDEO · AUDIO · DOCS · LINKS · TOPIC/),
    ).not.toBeInTheDocument();
    // New placeholder on the hero textarea
    expect(
      screen.getByPlaceholderText(
        'Talk, type, or drop a file. A video, a link, or just a topic.',
      ),
    ).toBeInTheDocument();
  });
```

(`renderHero` = whatever render helper the file already uses; reuse it. If the file renders EchoHero with mocks, keep those mocks.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/echo/EchoHero.copy.test.tsx`
Expected: FAIL on the new test (old copy still renders).

- [ ] **Step 3: Add the placeholder prop to EchoExchange**

In `src/components/echo/EchoExchange.tsx`: add `placeholder?: string` to the component's props interface, and change the textarea line

```tsx
placeholder="Type here. Paste a link, or use the buttons on the left to attach a video or record your voice."
```

to

```tsx
placeholder={placeholder ?? 'Type here. Paste a link, or use the buttons on the left to attach a video or record your voice.'}
```

destructuring `placeholder` alongside the existing props.

- [ ] **Step 4: Strip EchoHero chrome and pass the new placeholder**

In `src/components/echo/EchoHero.tsx`:

1. Pass the placeholder to the exchange:
```tsx
<EchoExchange
  state={state}
  handlers={{ setInputText, submit, selectIntent, confirm, reset, chooseOwnership, chooseDestination, chooseFileDestination, clipSavedVideo, confirmAction }}
  placeholder="Talk, type, or drop a file. A video, a link, or just a topic."
  onTextareaMount={(el) => {
    textareaRef.current = el;
  }}
/>
```

2. Delete the machine caption span in the bottom toolbar (the `<span className="flex-1 text-machine" ...>VIDEO · AUDIO · DOCS...</span>` block) and replace it with a plain spacer so the toolbar layout holds:
```tsx
<div className="flex-1" />
```

3. Delete the helper paragraph entirely (the `<p className="mt-2 text-xs text-muted-foreground leading-snug">Best way to start: ...</p>` block at the bottom of the composer surface).

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/echo/EchoHero.copy.test.tsx src/components/echo/EchoExchange.feedback.test.tsx src/components/echo/EchoExchange.fork.test.tsx src/components/echo/EchoExchange.ownership.test.tsx src/components/echo/EchoExchange.status.test.tsx`
Expected: PASS (EchoExchange default keeps existing tests green; hero copy test passes).

- [ ] **Step 6: Commit**

```bash
git add src/components/echo/EchoExchange.tsx src/components/echo/EchoHero.tsx src/components/echo/EchoHero.copy.test.tsx
git commit -m "feat(create): strip composer chrome — placeholder carries affordances, helper copy removed"
```

---

### Task 3: QuotaLine + AppContent demotion

**Files:**
- Create: `src/components/create/QuotaLine.tsx`
- Test: `src/components/create/QuotaLine.test.tsx`
- Modify: `src/components/echo/EchoHero.tsx` (accept + render `quota` prop under the composer)
- Modify: `src/app/app/AppContent.tsx` (skip banner on redesign path, pass prop)

**Interfaces:**
- Produces: `QuotaLine({ remaining, limit }: { remaining: number; limit: number })`; `EchoHero` gains optional prop `quota?: { remaining: number; limit: number } | null`.
- Consumes (AppContent, already present at line 37): `const { isFreeUser, freeGenerationsRemaining, freeGenerationsLimit } = useSubscription();`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/create/QuotaLine.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuotaLine } from './QuotaLine';

describe('QuotaLine', () => {
  it('shows remaining count with Upgrade link', () => {
    render(<QuotaLine remaining={3} limit={5} />);
    expect(screen.getByText('3 of 5 free content kits left')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Upgrade' });
    expect(link).toHaveAttribute('href', '/app/billing');
  });

  it('flips to amber Subscribe on the last kit', () => {
    render(<QuotaLine remaining={1} limit={5} />);
    expect(screen.getByText('Last free content kit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', '/app/billing');
  });

  it('shows exhausted copy at zero', () => {
    render(<QuotaLine remaining={0} limit={5} />);
    expect(screen.getByText('Free content kits used up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upgrade' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/create/QuotaLine.test.tsx`
Expected: FAIL, cannot resolve `./QuotaLine`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/create/QuotaLine.tsx
'use client';

/**
 * QuotaLine.tsx
 * Quiet free-tier counter rendered directly under the Create composer.
 * Replaces the banner that used to push the hero down. Amber on the
 * last kit preserves the urgency signal at lower visual cost.
 */

import Link from 'next/link';

interface QuotaLineProps {
  remaining: number;
  limit: number;
}

export function QuotaLine({ remaining, limit }: QuotaLineProps) {
  const isLast = remaining === 1;
  const isExhausted = remaining <= 0;

  const label = isExhausted
    ? 'Free content kits used up'
    : isLast
      ? 'Last free content kit'
      : `${remaining} of ${limit} free content kits left`;

  return (
    <p
      className={[
        'mt-2.5 flex items-center justify-center gap-1.5 text-xs',
        isLast ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground',
      ].join(' ')}
    >
      <span>{label}</span>
      <span aria-hidden="true">·</span>
      <Link
        href="/app/billing"
        className={isLast ? 'font-semibold underline underline-offset-2' : 'underline underline-offset-2 hover:text-foreground'}
      >
        {isLast ? 'Subscribe' : 'Upgrade'}
      </Link>
    </p>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/create/QuotaLine.test.tsx`
Expected: 3 passed.

- [ ] **Step 5: Wire EchoHero + AppContent**

In `src/components/echo/EchoHero.tsx`:

```tsx
import { QuotaLine } from '@/components/create/QuotaLine';

interface EchoHeroProps {
  quota?: { remaining: number; limit: number } | null;
}

export function EchoHero({ quota }: EchoHeroProps = {}) {
```

Render directly AFTER the composer surface `</div>` (the hero input surface), BEFORE VoiceLearningChip:

```tsx
{quota && <QuotaLine remaining={quota.remaining} limit={quota.limit} />}
```

In `src/app/app/AppContent.tsx`, inside the redesign IIFE:

1. Change the quota banner condition at line 397 from `{isFreeUser && (() => {` to `{isFreeUser && !showCreateRedesign && (() => {` so the banner only renders on the rollback branch.
2. Pass the prop where EchoHero mounts (line 430):
```tsx
<EchoHero quota={isFreeUser ? { remaining: freeGenerationsRemaining, limit: freeGenerationsLimit } : null} />
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run src/components/create/QuotaLine.test.tsx src/app/app/AppContent.resting.test.tsx && npx tsc --noEmit`
Expected: PASS. If `AppContent.resting.test.tsx` asserts the quota banner renders, update that assertion to expect the banner absent and the EchoHero quota prop path instead (read the failing assertion first; do not delete unrelated tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/create/QuotaLine.tsx src/components/create/QuotaLine.test.tsx src/components/echo/EchoHero.tsx src/app/app/AppContent.tsx src/app/app/AppContent.resting.test.tsx
git commit -m "feat(create): quota banner becomes quiet line under composer"
```

---

### Task 4: Chips (proposals + starters), header wiring, AdvisorThread retirement

**Files:**
- Create: `src/components/create/ProposalChips.tsx`
- Create: `src/components/create/StarterChips.tsx`
- Test: `src/components/create/ProposalChips.test.tsx`, `src/components/create/StarterChips.test.tsx`
- Modify: `src/components/echo/EchoHero.tsx` (mount CreateHeroHeader + chips; unmount AdvisorThread)
- Modify: `src/components/echo/EchoHero.advisor.test.tsx` (assertions move from cards to chips)
- Delete: `src/components/create/AdvisorThread.tsx`, `src/components/create/AdvisorThread.test.tsx`

**Interfaces:**
- Consumes: `CreateHeroHeader` (Task 1), `Proposal` from `@/types/advisor`, existing `handleProposalSelect` in EchoHero, existing `startMic`, `fileInputRef`, `textareaRef` in EchoHero, `useAuth` from `@/hooks/useAuth` (for `full_name`).
- Produces: `ProposalChips({ proposals, onSelect }: { proposals: Proposal[]; onSelect: (p: Proposal) => void })`; `StarterChips({ onTalk, onAttach, onType }: { onTalk: () => void; onAttach: () => void; onType: () => void })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/create/ProposalChips.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProposalChips } from './ProposalChips';
import type { Proposal } from '@/types/advisor';

const proposals: Proposal[] = [
  { id: 'p1', title: 'Clip Tuesday coaching call', rationale: '', kitType: 'clips', sourceRefs: [] },
  { id: 'p2', title: 'Post about pricing objections', rationale: '', kitType: 'linkedin_post', sourceRefs: [] },
  { id: 'p3', title: 'Carousel: 5 listing myths', rationale: '', kitType: 'carousel', sourceRefs: [] },
  { id: 'p4', title: 'Fourth proposal', rationale: '', kitType: 'newsletter', sourceRefs: [] },
];

describe('ProposalChips', () => {
  it('renders at most 3 chips', () => {
    render(<ProposalChips proposals={proposals} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('Fourth proposal')).not.toBeInTheDocument();
  });

  it('marks only the first chip as the top pick', () => {
    render(<ProposalChips proposals={proposals} onSelect={vi.fn()} />);
    const chips = screen.getAllByRole('button');
    expect(chips[0]).toHaveAttribute('data-top-pick', 'true');
    expect(chips[1]).not.toHaveAttribute('data-top-pick');
  });

  it('clicking a chip calls onSelect with that proposal', async () => {
    const onSelect = vi.fn();
    render(<ProposalChips proposals={proposals} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Post about pricing objections'));
    expect(onSelect).toHaveBeenCalledWith(proposals[1]);
  });

  it('renders the knowledge-base caption when chips exist', () => {
    render(<ProposalChips proposals={proposals} onSelect={vi.fn()} />);
    expect(screen.getByText(/suggested from your knowledge base/i)).toBeInTheDocument();
  });

  it('renders nothing with no proposals', () => {
    const { container } = render(<ProposalChips proposals={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

```tsx
// src/components/create/StarterChips.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StarterChips } from './StarterChips';

describe('StarterChips', () => {
  it('renders the three starter actions', () => {
    render(<StarterChips onTalk={vi.fn()} onAttach={vi.fn()} onType={vi.fn()} />);
    expect(screen.getByText('Talk for one minute')).toBeInTheDocument();
    expect(screen.getByText('Drop a Zoom recording')).toBeInTheDocument();
    expect(screen.getByText('Paste a YouTube link')).toBeInTheDocument();
  });

  it('wires each chip to its handler', async () => {
    const onTalk = vi.fn(); const onAttach = vi.fn(); const onType = vi.fn();
    render(<StarterChips onTalk={onTalk} onAttach={onAttach} onType={onType} />);
    await userEvent.click(screen.getByText('Talk for one minute'));
    await userEvent.click(screen.getByText('Drop a Zoom recording'));
    await userEvent.click(screen.getByText('Paste a YouTube link'));
    expect(onTalk).toHaveBeenCalledOnce();
    expect(onAttach).toHaveBeenCalledOnce();
    expect(onType).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/create/ProposalChips.test.tsx src/components/create/StarterChips.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the components**

```tsx
// src/components/create/ProposalChips.tsx
'use client';

/**
 * ProposalChips.tsx
 * Advisor autopilot proposals as tappable pill chips under the Create
 * composer. Tap prefills the composer (handled by the parent). The first
 * proposal is the top pick and gets the reserved cyan accent; all other
 * chips stay neutral.
 */

import type { Proposal } from '@/types/advisor';

const MAX_CHIPS = 3;

interface ProposalChipsProps {
  proposals: Proposal[];
  onSelect: (proposal: Proposal) => void;
}

export function ProposalChips({ proposals, onSelect }: ProposalChipsProps) {
  const shown = proposals.slice(0, MAX_CHIPS);
  if (shown.length === 0) return null;

  return (
    <div className="mt-5 w-full max-w-2xl">
      <div className="flex flex-wrap justify-center gap-2">
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            {...(i === 0 ? { 'data-top-pick': 'true' } : {})}
            className={[
              'rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
              i === 0
                ? 'border-[rgba(0,212,255,0.5)] text-foreground hover:border-[rgba(0,212,255,0.8)]'
                : 'border-[var(--border)] text-muted-foreground hover:border-[var(--muted-foreground)] hover:text-foreground',
            ].join(' ')}
          >
            {p.title}
          </button>
        ))}
      </div>
      <p
        className="mt-3 text-center text-machine"
        style={{ color: 'var(--muted-foreground)', fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}
      >
        Suggested from your knowledge base
      </p>
    </div>
  );
}
```

```tsx
// src/components/create/StarterChips.tsx
'use client';

/**
 * StarterChips.tsx
 * Empty-state starter actions under the Create composer. Each chip
 * reuses an existing hero affordance (mic, file picker, composer focus).
 * No new ingest logic lives here.
 */

interface StarterChipsProps {
  onTalk: () => void;
  onAttach: () => void;
  onType: () => void;
}

const CHIP_CLASS =
  'rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:border-[var(--muted-foreground)] hover:text-foreground';

export function StarterChips({ onTalk, onAttach, onType }: StarterChipsProps) {
  return (
    <div className="mt-5 flex w-full max-w-2xl flex-wrap justify-center gap-2">
      <button type="button" className={CHIP_CLASS} onClick={onTalk}>Talk for one minute</button>
      <button type="button" className={CHIP_CLASS} onClick={onAttach}>Drop a Zoom recording</button>
      <button type="button" className={CHIP_CLASS} onClick={onType}>Paste a YouTube link</button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/create/ProposalChips.test.tsx src/components/create/StarterChips.test.tsx`
Expected: 7 passed.

- [ ] **Step 5: Rewire EchoHero**

In `src/components/echo/EchoHero.tsx`:

1. Imports: remove `AdvisorThread`; add:
```tsx
import { CreateHeroHeader } from '@/components/create/CreateHeroHeader';
import { ProposalChips } from '@/components/create/ProposalChips';
import { StarterChips } from '@/components/create/StarterChips';
import { useAuth } from '@/hooks/useAuth';
```

2. Inside the component, derive the first name (near the other hooks):
```tsx
const { user } = useAuth();
const firstName = user?.full_name?.trim().split(/\s+/)[0] || undefined;
const advisorState = advisor?.state ?? null;
```

3. Replace the current thread block

```tsx
<div className="w-full max-w-2xl space-y-4 mb-6">
  {advisor && (
    <AdvisorThread advisor={advisor} onProposalSelect={handleProposalSelect} />
  )}
  <DraftsThreadMessage />
</div>
```

with

```tsx
<CreateHeroHeader
  state={advisorState}
  nudgeHeadline={advisor?.nudge.headline}
  firstName={firstName}
/>
<div className="w-full max-w-2xl space-y-4 mb-6">
  <DraftsThreadMessage />
</div>
```

4. After the composer surface (and after the QuotaLine from Task 3), add:

```tsx
{(advisorState === 'thin' || advisorState === 'rich') && advisor && (
  <ProposalChips proposals={advisor.proposals} onSelect={handleProposalSelect} />
)}
{!advisorLoading && (!advisor || advisor.state === 'empty') && (
  <StarterChips
    onTalk={() => { if (micState === 'idle' || micState === 'error') void startMic(); }}
    onAttach={() => fileInputRef.current?.click()}
    onType={focusComposer}
  />
)}
```

5. The existing empty-state header + SketchExplainer block stays exactly as-is.

- [ ] **Step 6: Update EchoHero.advisor.test.tsx**

Read the file first. Its assertions about AdvisorThread rendering (cards above the composer) become assertions about the new surfaces:
- rich advisor → H1 `What do you want to create...` present, chips with proposal titles present, chip click prefills composer (same handler contract).
- empty advisor → teach-first header present, starter chips present.
Keep the file's existing mock setup (useAdvisor mock etc.); change only what the UI contract changed. Mock `useAuth` to return `{ user: { full_name: 'Ara Mamourian' } }` shape if not already mocked.

- [ ] **Step 7: Delete AdvisorThread**

```bash
git rm src/components/create/AdvisorThread.tsx src/components/create/AdvisorThread.test.tsx
```

Verify nothing else imports it: `grep -rn "AdvisorThread" src/ --include="*.tsx" --include="*.ts"` must return nothing.

- [ ] **Step 8: Run tests + typecheck**

Run: `npx vitest run src/components/echo/EchoHero.advisor.test.tsx src/components/echo/EchoHero.copy.test.tsx src/components/create/ && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(create): personalized header + proposals-as-chips; retire AdvisorThread"
```

---

### Task 5: RecentKitsStrip

**Files:**
- Create: `src/components/create/RecentKitsStrip.tsx`
- Test: `src/components/create/RecentKitsStrip.test.tsx`
- Modify: `src/components/echo/EchoHero.tsx` (mount below chips)

**Interfaces:**
- Consumes: `api.contentKits.list(limit)` from `@/lib/api-client` — returns `{ success, data: { kits: ContentKitListItem[] } }`; each kit has `id, title, thumbnailUrl?, clipsGenerated, contentGenerated, createdAt, hasLinkedin, hasTwitter, hasInstagram, hasBlog, hasEmail, hasTiktok, hasYoutube` (camelCase, transformed in the client).
- Produces: `RecentKitsStrip()` — self-fetching, renders null on empty/error.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/create/RecentKitsStrip.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecentKitsStrip } from './RecentKitsStrip';

const listMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { contentKits: { list: (...args: unknown[]) => listMock(...args) } },
}));

function kit(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Kit ${id}`,
    thumbnailUrl: undefined,
    clipsGenerated: 2,
    contentGenerated: true,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    hasLinkedin: true, hasTwitter: true, hasInstagram: false,
    hasBlog: false, hasEmail: false, hasTiktok: false, hasYoutube: false,
    ...overrides,
  };
}

describe('RecentKitsStrip', () => {
  beforeEach(() => listMock.mockReset());

  it('renders up to 4 recent kits with links into the kit detail', async () => {
    listMock.mockResolvedValue({ success: true, data: { kits: [kit('a'), kit('b')] } });
    render(<RecentKitsStrip />);
    await waitFor(() => expect(screen.getByText('Kit a')).toBeInTheDocument());
    expect(listMock).toHaveBeenCalledWith(4);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    const cards = screen.getAllByTestId('recent-kit-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('href', '/app/library/a');
    expect(screen.getByRole('link', { name: /view all in library/i })).toHaveAttribute('href', '/app/library');
  });

  it('shows Processing status when contentGenerated is false', async () => {
    listMock.mockResolvedValue({ success: true, data: { kits: [kit('a', { contentGenerated: false })] } });
    render(<RecentKitsStrip />);
    await waitFor(() => expect(screen.getByText('Processing')).toBeInTheDocument());
  });

  it('renders nothing when the list is empty', async () => {
    listMock.mockResolvedValue({ success: true, data: { kits: [] } });
    const { container } = render(<RecentKitsStrip />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the fetch fails', async () => {
    listMock.mockRejectedValue(new Error('network'));
    const { container } = render(<RecentKitsStrip />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/create/RecentKitsStrip.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the component**

```tsx
// src/components/create/RecentKitsStrip.tsx
'use client';

/**
 * RecentKitsStrip.tsx
 * Below-the-fold strip of the user's 4 most recent content kits on the
 * Create page. Continuation loop: finished work stays one scroll away
 * instead of disappearing into Library. Silent on empty/error; never
 * blocks the hero.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { ContentKitListItem } from '@/types';

const PLATFORM_FLAGS = [
  'hasLinkedin', 'hasTwitter', 'hasInstagram', 'hasBlog', 'hasEmail', 'hasTiktok', 'hasYoutube',
] as const;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function detailLine(k: ContentKitListItem): string {
  const parts: string[] = [];
  if (k.clipsGenerated > 0) parts.push(`${k.clipsGenerated} clip${k.clipsGenerated === 1 ? '' : 's'}`);
  const platforms = PLATFORM_FLAGS.filter((f) => (k as unknown as Record<string, boolean>)[f]).length;
  if (platforms > 0) parts.push(`${platforms} platform${platforms === 1 ? '' : 's'}`);
  parts.push(timeAgo(k.createdAt));
  return parts.join(' · ');
}

export function RecentKitsStrip() {
  const [kits, setKits] = useState<ContentKitListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api.contentKits.list(4)
      .then((res) => {
        if (!alive) return;
        setKits(res?.data?.kits ?? []);
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  if (!loaded || kits.length === 0) return null;

  return (
    <section aria-label="Recent content kits" className="mt-12 w-full max-w-4xl">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[0.9375rem] font-semibold text-foreground">Recent</h2>
        <Link href="/app/library" className="text-[0.8125rem] text-muted-foreground hover:text-foreground">
          View all in Library →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kits.map((k) => (
          <Link
            key={k.id}
            href={`/app/library/${k.id}`}
            data-testid="recent-kit-card"
            className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-container-low)] transition-colors hover:border-[var(--muted-foreground)]"
          >
            <div className="relative aspect-video bg-[var(--surface-container-lowest)]">
              {k.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={k.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
                  <span className="text-lg text-muted-foreground opacity-40">▮▮▮</span>
                </div>
              )}
              <span
                className={[
                  'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.5625rem] uppercase tracking-wider',
                  'bg-black/45',
                  k.contentGenerated ? 'text-emerald-300' : 'text-amber-300',
                ].join(' ')}
              >
                {k.contentGenerated ? 'Ready' : 'Processing'}
              </span>
            </div>
            <div className="px-3 py-2.5">
              <p className="truncate text-[0.8125rem] font-medium text-foreground">{k.title}</p>
              <p className="mt-0.5 text-[0.71875rem] text-muted-foreground">{detailLine(k)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

If `ContentKitListItem` lacks any referenced field, check `src/types/index.ts` and use the actual field names; the API-client transform in `src/lib/api-client.ts:2392-2415` is the source of truth.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/create/RecentKitsStrip.test.tsx`
Expected: 4 passed.

- [ ] **Step 5: Mount in EchoHero**

In `src/components/echo/EchoHero.tsx`, import and render after the chips (thin/rich only; the empty state has nothing below the fold):

```tsx
import { RecentKitsStrip } from '@/components/create/RecentKitsStrip';
```
```tsx
{(advisorState === 'thin' || advisorState === 'rich') && <RecentKitsStrip />}
```

- [ ] **Step 6: Run tests + typecheck, commit**

Run: `npx vitest run src/components/create/ src/components/echo/ && npx tsc --noEmit`
Expected: PASS.

```bash
git add src/components/create/RecentKitsStrip.tsx src/components/create/RecentKitsStrip.test.tsx src/components/echo/EchoHero.tsx
git commit -m "feat(create): Recent kits strip below the fold"
```

---

### Task 6: VoiceStrengthStrip (merge VoiceLearningChip + coverage subline)

**Files:**
- Create: `src/components/create/VoiceStrengthStrip.tsx`
- Test: `src/components/create/VoiceStrengthStrip.test.tsx`
- Modify: `src/components/echo/EchoHero.tsx` (replace VoiceLearningChip mount)
- Delete: `src/components/echo/VoiceLearningChip.tsx`

**Interfaces:**
- Consumes: `useVoiceStrength()` from `@/hooks/useVoiceStrength` (returns `{ data: VoiceStrengthData | null }`, score at `data.overallStrength`, 0-100); `api.wbtw.outcome()` (returns `{ outcome: 'pending' | ... }`); `Coverage`, `DIMENSION_KEYS`, `DIMENSION_LABELS` from `@/types/advisor` (`coverage[key] = { covered, strength, sampleCount }`; exclude `relationships`, backend hardcodes it to 0).
- Produces: `VoiceStrengthStrip({ coverage, onTeachMore }: { coverage: Coverage | null; onTeachMore: () => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/create/VoiceStrengthStrip.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceStrengthStrip } from './VoiceStrengthStrip';
import type { Coverage } from '@/types/advisor';

const strengthMock = vi.fn();
vi.mock('@/hooks/useVoiceStrength', () => ({
  useVoiceStrength: () => strengthMock(),
}));
const outcomeMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { wbtw: { outcome: () => outcomeMock() } },
}));

const COVERAGE: Coverage = {
  work: { covered: true, strength: 0.9, sampleCount: 5 },
  industry: { covered: true, strength: 0.7, sampleCount: 3 },
  interests: { covered: false, strength: 0.2, sampleCount: 1 },
  personal: { covered: false, strength: 0.1, sampleCount: 0 },
  relationships: { covered: false, strength: 0, sampleCount: 0 },
  voice: { covered: true, strength: 0.8, sampleCount: 10 },
};

describe('VoiceStrengthStrip', () => {
  beforeEach(() => {
    strengthMock.mockReset();
    outcomeMock.mockReset();
    outcomeMock.mockResolvedValue({ outcome: 'done' });
  });

  it('shows tier label from the strength score', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 62 } });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    expect(screen.getByText('Voice profile: Strong')).toBeInTheDocument();
  });

  it('links the tier area to /app/voice and carries the tour anchor', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 80 } });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    const link = screen.getByRole('link', { name: /voice profile/i });
    expect(link).toHaveAttribute('href', '/app/voice');
    expect(link).toHaveAttribute('data-tour', 'echo-hero-voice');
  });

  it('renders a coverage subline naming strongest and thinnest areas', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 40 } });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    expect(screen.getByText(/Strongest: Work, Voice/)).toBeInTheDocument();
    expect(screen.getByText(/Thinnest: Personal/)).toBeInTheDocument();
  });

  it('omits the subline without coverage', () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 40 } });
    render(<VoiceStrengthStrip coverage={null} onTeachMore={vi.fn()} />);
    expect(screen.queryByText(/Strongest:/)).not.toBeInTheDocument();
  });

  it('Teach Echo more calls onTeachMore', async () => {
    strengthMock.mockReturnValue({ data: { overallStrength: 40 } });
    const onTeachMore = vi.fn();
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={onTeachMore} />);
    await userEvent.click(screen.getByRole('button', { name: 'Teach Echo more' }));
    expect(onTeachMore).toHaveBeenCalledOnce();
  });

  it('shows learning state while WBTW is pending and no score exists', async () => {
    strengthMock.mockReturnValue({ data: null });
    outcomeMock.mockResolvedValue({ outcome: 'pending' });
    render(<VoiceStrengthStrip coverage={COVERAGE} onTeachMore={vi.fn()} />);
    expect(await screen.findByText('Learning your voice...')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/create/VoiceStrengthStrip.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the component**

Port the state logic from `src/components/echo/VoiceLearningChip.tsx` verbatim (tier thresholds, WBTW-pending fallback), then wrap it in the strip layout:

```tsx
// src/components/create/VoiceStrengthStrip.tsx
'use client';

/**
 * VoiceStrengthStrip.tsx
 * Below-the-fold voice area on the Create page. Absorbs VoiceLearningChip
 * (tier + /app/voice link + WBTW pending state + tour anchor) and adds a
 * coverage subline plus a "Teach Echo more" CTA that focuses the composer.
 *
 * Voice-scope rule: voice = written posts only. Never say clips "sound
 * like you". The clip IS the user on camera.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { api } from '@/lib/api-client';
import { DIMENSION_KEYS, DIMENSION_LABELS, type Coverage, type DimensionKey } from '@/types/advisor';

type StripState = 'idle' | 'wbtw-pending' | 'Seed' | 'Growing' | 'Strong' | 'Signature';

function getTier(score: number): 'Seed' | 'Growing' | 'Strong' | 'Signature' {
  if (score >= 76) return 'Signature';
  if (score >= 51) return 'Strong';
  if (score >= 26) return 'Growing';
  return 'Seed';
}

function getLabel(state: StripState): string {
  switch (state) {
    case 'wbtw-pending': return 'Learning your voice...';
    case 'idle': return 'Teach Echo your voice';
    default: return `Voice profile: ${state}`;
  }
}

// 'relationships' is hardcoded to 0 on the backend; exclude it like CoverageMeter does.
const DISPLAYED_KEYS = DIMENSION_KEYS.filter((k): k is DimensionKey => k !== 'relationships');

function coverageSubline(coverage: Coverage): string | null {
  const sorted = [...DISPLAYED_KEYS].sort((a, b) => coverage[b].strength - coverage[a].strength);
  const strongest = sorted.filter((k) => coverage[k].covered).slice(0, 2);
  const thinnest = sorted.filter((k) => !coverage[k].covered).slice(-1);
  if (strongest.length === 0 && thinnest.length === 0) return null;
  const parts: string[] = [];
  if (strongest.length > 0) parts.push(`Strongest: ${strongest.map((k) => DIMENSION_LABELS[k]).join(', ')}.`);
  if (thinnest.length > 0) parts.push(`Thinnest: ${thinnest.map((k) => DIMENSION_LABELS[k]).join(', ')}.`);
  return parts.join(' ');
}

interface VoiceStrengthStripProps {
  coverage: Coverage | null;
  onTeachMore: () => void;
}

export function VoiceStrengthStrip({ coverage, onTeachMore }: VoiceStrengthStripProps) {
  const { data: voiceStrength } = useVoiceStrength();
  const [stripState, setStripState] = useState<StripState>('idle');

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (voiceStrength !== null && voiceStrength !== undefined) {
        if (!cancelled) setStripState(getTier(voiceStrength.overallStrength));
        return;
      }
      try {
        const result = await api.wbtw.outcome();
        if (cancelled) return;
        setStripState(result.outcome === 'pending' ? 'wbtw-pending' : 'idle');
      } catch {
        if (!cancelled) setStripState('idle');
      }
    }
    void resolve();
    return () => { cancelled = true; };
  }, [voiceStrength]);

  const isPending = stripState === 'wbtw-pending';
  const score = voiceStrength?.overallStrength ?? 0;
  const subline = coverage ? coverageSubline(coverage) : null;

  return (
    <div className="mt-4 flex w-full max-w-4xl items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-container-low)] px-4 py-3">
      <Link
        href="/app/voice"
        data-tour="echo-hero-voice"
        className="flex min-w-0 flex-1 items-center gap-3 group"
        aria-label={getLabel(stripState)}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) 0 ${Math.max(0, Math.min(100, score))}%, var(--border) ${Math.max(0, Math.min(100, score))}% 100%)` }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
            {isPending
              ? <Loader2 size={11} className="animate-spin text-muted-foreground" />
              : <Sparkles size={11} className="text-muted-foreground" />}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-medium text-foreground group-hover:underline underline-offset-2">
            {getLabel(stripState)}
          </span>
          {subline && (
            <span className="block truncate text-xs text-muted-foreground">{subline}</span>
          )}
        </span>
      </Link>
      <button
        type="button"
        onClick={onTeachMore}
        className="shrink-0 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:border-[var(--muted-foreground)] hover:text-foreground"
      >
        Teach Echo more
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/create/VoiceStrengthStrip.test.tsx`
Expected: 6 passed.

- [ ] **Step 5: Replace the chip in EchoHero and delete it**

In `src/components/echo/EchoHero.tsx`:
1. Remove `import { VoiceLearningChip } ...` and the `<VoiceLearningChip />` mount.
2. Import and render after RecentKitsStrip (thin/rich only):
```tsx
import { VoiceStrengthStrip } from '@/components/create/VoiceStrengthStrip';
```
```tsx
{(advisorState === 'thin' || advisorState === 'rich') && (
  <VoiceStrengthStrip coverage={advisor?.coverage ?? null} onTeachMore={focusComposer} />
)}
```

3. Delete the chip:
```bash
git rm src/components/echo/VoiceLearningChip.tsx
```
Verify: `grep -rn "VoiceLearningChip" src/` returns nothing. If any test mocked it (check `EchoHero.copy.test.tsx` / `EchoHero.advisor.test.tsx` mocks), update those mocks to mock `VoiceStrengthStrip` instead.

- [ ] **Step 6: Run tests + typecheck, commit**

Run: `npx vitest run src/components/create/ src/components/echo/ && npx tsc --noEmit`
Expected: PASS.

```bash
git add -A
git commit -m "feat(create): VoiceStrengthStrip below fold, absorbs VoiceLearningChip + coverage subline"
```

---

### Task 7: Teams note demotion + final assembly check

**Files:**
- Modify: `src/app/app/AppContent.tsx` (Teams banner → below EchoHero as quiet note on redesign path)
- Modify: `docs/superpowers/specs/2026-07-03-create-page-fold-discipline-design.md` (record the CoverageMeter deviation)
- Test: `src/app/app/AppContent.resting.test.tsx`

**Interfaces:**
- Consumes: existing `showTeamsOnboarding`, `voiceLimit`, `setShowTeamsOnboarding` state in AppContent (lines 36-40, 370-392).

- [ ] **Step 1: Move the Teams banner on the redesign path**

In `src/app/app/AppContent.tsx`, redesign branch only (the rollback branch keeps the old banner):

1. Wrap the existing gradient Teams banner (lines 370-392) in `{!showCreateRedesign && ...}` so it only renders on the rollback branch — i.e. change its condition to `{showTeamsOnboarding && !showCreateRedesign && (`.
2. In the redesign branch, AFTER the hidden GenerationForm block, add the demoted note:

```tsx
{showTeamsOnboarding && (
  <div className="mt-10 flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-[0.8125rem] text-muted-foreground">
    <span aria-hidden="true">👥</span>
    <span>
      <span className="font-semibold text-foreground">EchoTeams:</span>{' '}
      your account supports up to {voiceLimit} voice{voiceLimit !== 1 ? 's' : ''}.
    </span>
    <a href="/app/voice?tab=team" className="ml-auto whitespace-nowrap underline underline-offset-2 hover:text-foreground">
      Set up team voices →
    </a>
    <button
      onClick={() => {
        localStorage.setItem('echome_teams_onboarding_dismissed', new Date().toISOString());
        setShowTeamsOnboarding(false);
      }}
      aria-label="Dismiss"
      className="p-1 text-muted-foreground hover:text-foreground"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
)}
```

Same dismiss key, same gating; only position and visual weight change.

- [ ] **Step 2: Update AppContent.resting.test.tsx**

Read the file. If it asserts Teams banner or quota banner position/presence, update assertions to the new contract: on the redesign path, neither banner renders before EchoHero; the Teams note renders after it when `showTeamsOnboarding` is true. Add no new test infrastructure; follow the file's existing mock pattern.

- [ ] **Step 3: Record the spec deviation**

In `docs/superpowers/specs/2026-07-03-create-page-fold-discipline-design.md`, in the Voice strength strip section, change the deletion sentence to:

```
- `VoiceLearningChip.tsx` is deleted. `CoverageMeter.tsx` is NOT deleted: `AdaptiveCreateSurface.tsx` still imports it. Only its EchoHero-path usage goes away. (Amended during implementation planning.)
```

- [ ] **Step 4: Full unit suite + typecheck + lint**

Run: `npm run test:unit && npx tsc --noEmit && npm run lint`
Expected: unit suite green except pre-existing failures unrelated to this branch (if any fail, confirm they fail on `develop` too before dismissing: `git stash && npx vitest run <file> && git stash pop`).

- [ ] **Step 5: Visual sanity (dev server)**

Run: `npm run dev` and load `http://localhost:3000/app` (or the port Next picks). Verify with a quick manual pass: hero shows H1 + composer + chips only; scroll shows Recent strip, voice strip, Teams note (when applicable). Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(create): demote Teams onboarding below the fold; spec amendment"
```

---

## Verification (after all tasks)

1. `npm run test:unit` green (modulo pre-existing failures also present on develop).
2. `npx tsc --noEmit` clean. `npm run lint` clean.
3. PR from `feat/create-fold-discipline` → `develop`. Staging smoke (per release policy): empty-KB account sees teach-first header + starter chips; content account sees personalized H1 + proposal chips + recents; free account sees quota line not banner; tour still runs (`echo-hero-voice` anchor now below fold — verify the tour scrolls to it or shows correctly).
4. Founder review on staging before main promote.
