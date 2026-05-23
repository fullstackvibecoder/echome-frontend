# Guided-Tour System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the guided-tour system specified in `docs/superpowers/specs/2026-05-23-guided-tour-system-design.md` — coach marks for the clip + carousel editors, a 4-step Get Started checklist on the dashboard, and a kit-detail empty-state upgrade.

**Architecture:** Three sub-systems sharing one persistence backbone (`users.preferences.toursSeen` JSONB column). Coach marks use `react-joyride` on desktop and a custom bottom-sheet on mobile. All three sub-systems read/write through a shared `useTourState()` hook hitting `PATCH /api/me/preferences`.

**Tech Stack:** Next.js App Router + Tailwind + Lucide (FE at `/Users/aramammo/Side Quests/echome-frontend`); Express + Supabase + Jest (BE at `/Users/aramammo/Side Quests/echome-platform-v2`); reference patterns from `/Users/aramammo/Side Quests/closr` (especially `src/components/tour/feature-tour.tsx`).

**Release policy:** Each PR ships on `develop` first; merge to `main` only after staging smoke. FE has no unit test framework (Playwright e2e only) — TDD applies to BE work; FE work validates via type-check + manual smoke + targeted Playwright e2e.

---

## PR 1 — Persistence backbone (migration + endpoint + hook)

**Estimated time:** ~half day. Touches both repos. No user-visible UI change; unblocks PRs 2–4.

### Task 1.1 — Create the `preferences` JSONB migration

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-platform-v2/supabase/migrations/20260523_users_preferences_jsonb.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260523_users_preferences_jsonb.sql
-- Add a JSONB preferences column to users for arbitrary client-controlled state.
-- Reserved keys: toursSeen (string[]), setupChecklistDismissed (bool).
-- See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §8.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.preferences IS
  'Arbitrary user-scoped JSON preferences. Reserved keys: toursSeen (string[]), setupChecklistDismissed (bool).';
```

- [ ] **Step 2: Apply to Supabase (manual, founder runs via SQL Editor)**

This repo applies migrations manually via the Supabase SQL Editor (not via the CLI). Note in the PR description that the founder needs to paste the file contents into the Supabase SQL Editor for staging + prod.

- [ ] **Step 3: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2"
git checkout -b feat/users-preferences-jsonb develop
git add supabase/migrations/20260523_users_preferences_jsonb.sql
git commit -m "feat(users): add preferences JSONB column for client-controlled state"
```

---

### Task 1.2 — Backend test for `PATCH /api/me/preferences` endpoint (FAIL first)

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-platform-v2/tests/integration/routes/me-preferences.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/integration/routes/me-preferences.test.ts
import request from 'supertest';
import { app } from '../../../src/index';
import { supabase } from '../../../src/utils/supabase';
import { createTestUser, deleteTestUser, getAuthToken } from '../../fixtures/users';

describe('PATCH /api/me/preferences', () => {
  let userId: string;
  let token: string;

  beforeEach(async () => {
    const u = await createTestUser();
    userId = u.id;
    token = await getAuthToken(u);
  });

  afterEach(async () => {
    await deleteTestUser(userId);
  });

  it('writes new keys to preferences', async () => {
    const res = await request(app)
      .patch('/api/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ toursSeen: ['clip-editor-v1'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.preferences.toursSeen).toEqual(['clip-editor-v1']);
  });

  it('merges with existing preferences (does not clobber)', async () => {
    await supabase.from('users')
      .update({ preferences: { existingKey: 'keep', toursSeen: ['old-tour'] } })
      .eq('id', userId);

    const res = await request(app)
      .patch('/api/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ toursSeen: ['old-tour', 'new-tour'] });

    expect(res.body.data.preferences.existingKey).toBe('keep');
    expect(res.body.data.preferences.toursSeen).toEqual(['old-tour', 'new-tour']);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .patch('/api/me/preferences')
      .send({ toursSeen: ['x'] });
    expect(res.status).toBe(401);
  });

  it('rejects invalid body shapes', async () => {
    const res = await request(app)
      .patch('/api/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ toursSeen: 'not-an-array' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2"
npx jest tests/integration/routes/me-preferences.test.ts
```

Expected: FAIL — route does not exist yet.

If `createTestUser/getAuthToken/deleteTestUser` fixtures don't exist in `tests/fixtures/users.ts`, look for the existing pattern in `tests/integration/` (other tests will show the fixture shape). If no test-user fixture exists at all, create one before this step using the existing test setup.

---

### Task 1.3 — Implement `PATCH /api/me/preferences` endpoint

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-platform-v2/src/routes/auth.ts:289` (after the existing `GET /me` handler)

- [ ] **Step 1: Add the route handler**

Add after the `GET /me` handler in `src/routes/auth.ts`:

```typescript
import { z } from 'zod';
import { supabase } from '../utils/supabase';

const updatePreferencesSchema = z.object({
  toursSeen: z.array(z.string()).optional(),
  setupChecklistDismissed: z.boolean().optional(),
}).passthrough();

/**
 * PATCH /api/me/preferences
 * Merge-write to users.preferences JSONB. Existing keys not in the body are preserved.
 *
 * Body shape is permissive — any JSON-serialisable values are allowed under
 * known keys (toursSeen, setupChecklistDismissed). Other keys also pass through
 * for forward-compat.
 */
router.patch('/me/preferences', authenticateUser, async (req: Request, res: Response) => {
  try {
    const validated = updatePreferencesSchema.parse(req.body);
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
    }

    const { data: existing, error: readErr } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (readErr || !existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    const merged = { ...(existing.preferences ?? {}), ...validated };
    const { error: writeErr } = await supabase
      .from('users')
      .update({ preferences: merged })
      .eq('id', userId);

    if (writeErr) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to update preferences', code: 'UPDATE_FAILED' },
      });
    }

    return res.json({
      success: true,
      data: { preferences: merged },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Update failed',
        code: 'UPDATE_ERROR',
      },
    });
  }
});
```

- [ ] **Step 2: Run the test, confirm it passes**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2"
npx jest tests/integration/routes/me-preferences.test.ts
```

Expected: PASS, all 4 cases.

- [ ] **Step 3: Commit**

```bash
git add src/routes/auth.ts tests/integration/routes/me-preferences.test.ts
git commit -m "feat(api): PATCH /api/me/preferences merges JSON keys into users.preferences"
```

---

### Task 1.4 — Extend `GET /api/me` to include `preferences`

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-platform-v2/src/routes/auth.ts:292-318` (the existing `GET /me` handler)

- [ ] **Step 1: Update the response to include preferences**

Replace the existing `GET /me` handler with:

```typescript
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const user = await authService.getCurrentUser(token);
    const adminStatus = await isUserAdmin(user.id, user.email ?? undefined);

    const { data: row } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatar: user.user_metadata?.avatar,
        subscription: 'free', // Would come from database in production
        isAdmin: adminStatus,
        createdAt: user.created_at,
        preferences: row?.preferences ?? {},
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    });
  }
});
```

- [ ] **Step 2: Add a regression test that GET /me returns preferences**

Append to `tests/integration/routes/me-preferences.test.ts`:

```typescript
describe('GET /api/me', () => {
  it('returns the preferences blob', async () => {
    const u = await createTestUser();
    const token = await getAuthToken(u);
    await supabase.from('users')
      .update({ preferences: { toursSeen: ['x'] } })
      .eq('id', u.id);

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.preferences.toursSeen).toEqual(['x']);
    await deleteTestUser(u.id);
  });
});
```

- [ ] **Step 3: Run the test, confirm pass**

```bash
npx jest tests/integration/routes/me-preferences.test.ts
```

- [ ] **Step 4: Commit + push**

```bash
git add src/routes/auth.ts tests/integration/routes/me-preferences.test.ts
git commit -m "feat(api): include preferences in GET /api/me response"
git push -u origin feat/users-preferences-jsonb
```

- [ ] **Step 5: Open the BE PR**

```bash
gh pr create --base develop --title "feat(api): users.preferences JSONB + PATCH /me/preferences endpoint" --body "$(cat <<'EOF'
## Summary
- Adds `preferences JSONB DEFAULT '{}'` to `public.users` (migration 20260523).
- Adds `PATCH /api/me/preferences` (merge-write).
- Extends `GET /api/me` to return the preferences blob.

Unblocks FE work for the guided-tour system (spec: `docs/superpowers/specs/2026-05-23-guided-tour-system-design.md`).

## Migration note
**Action required after deploy:** paste `supabase/migrations/20260523_users_preferences_jsonb.sql` into the Supabase SQL Editor for staging, then prod, after the deploy lands.

## Test plan
- [ ] CI green (Jest integration tests pass)
- [ ] After deploy: `curl -X PATCH .../api/me/preferences -d '{"toursSeen":["test"]}'` returns 200 with merged payload
- [ ] Confirm `GET /api/me` returns the new key
EOF
)"
```

---

### Task 1.5 — Frontend: extend `User` type with `preferences`

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/types/index.ts:10-20`

- [ ] **Step 1: Add preferences to the User interface**

Replace lines 10-20 with:

```typescript
export interface UserPreferences {
  /** Tour IDs the user has already seen (e.g., "clip-editor-v1"). */
  toursSeen?: string[];
  /** True once the user has dismissed the Get Started checklist. */
  setupChecklistDismissed?: boolean;
  /** Forward-compat: unknown keys are allowed. */
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: 'free' | 'starter' | 'creator' | 'studio';
  onboardingStep?: 1 | 2 | 3 | 'complete';
  isAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git checkout -b feat/tour-state-persistence develop
npx tsc --noEmit
```

Expected: no errors.

---

### Task 1.6 — Add `api.profile.updatePreferences` to api-client

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/lib/api-client.ts:976-991` (the existing `profile` namespace)

- [ ] **Step 1: Add the new method to the profile namespace**

Inside the `profile: { ... }` object (around line 976), after the existing `update` method, add:

```typescript
    updatePreferences: async (partial: Partial<import('@/types').UserPreferences>) => {
      const response = await apiClient.patch('/me/preferences', partial);
      return response.data as {
        success: boolean;
        data?: { preferences: import('@/types').UserPreferences };
      };
    },
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 1.7 — Create `useTourState` hook

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/hooks/useTourState.ts`

- [ ] **Step 1: Write the hook**

```typescript
'use client';

/**
 * useTourState — shared hook for the guided-tour system.
 *
 * Reads `user.preferences.toursSeen` to decide whether to fire a tour, and
 * writes back via PATCH /api/me/preferences when a tour is dismissed or
 * completed. The localStorage fallback prevents the same tab from re-firing
 * a tour within a session if the PATCH failed (network blip).
 *
 * See spec §8.3.
 */
import { useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from './useAuth';

const FALLBACK_KEY = 'toursSeenFallback';

function readFallback(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeFallback(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(ids));
  } catch {
    /* localStorage full or disabled — accept the loss */
  }
}

export function useTourState() {
  const { user, refreshUser } = useAuth();

  const serverSeen: string[] = user?.preferences?.toursSeen ?? [];
  const localSeen = readFallback();
  const allSeen = Array.from(new Set([...serverSeen, ...localSeen]));

  const hasSeen = useCallback(
    (id: string) => allSeen.includes(id),
    [allSeen],
  );

  const markSeen = useCallback(
    async (id: string) => {
      if (allSeen.includes(id)) return;
      const next = [...serverSeen, id];
      try {
        await api.profile.updatePreferences({ toursSeen: next });
        await refreshUser();
      } catch (err) {
        console.warn('[useTourState] PATCH failed, falling back to localStorage', err);
        writeFallback([...localSeen, id]);
      }
    },
    [allSeen, serverSeen, localSeen, refreshUser],
  );

  return { hasSeen, markSeen };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 1.8 — Create `useTourViewport` hook

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/hooks/useTourViewport.ts`

- [ ] **Step 1: Write the hook**

```typescript
'use client';

/**
 * useTourViewport — returns 'desktop' | 'mobile' based on viewport width.
 * Switches at the 768px breakpoint (matches Tailwind's `md:` prefix).
 * SSR-safe default: 'desktop' (no flash of mobile UI on hydration).
 *
 * See spec §5.3.
 */
import { useEffect, useState } from 'react';

export type TourViewport = 'desktop' | 'mobile';

export function useTourViewport(): TourViewport {
  const [viewport, setViewport] = useState<TourViewport>('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setViewport(mq.matches ? 'desktop' : 'mobile');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return viewport;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 1.9 — Commit + open FE PR for persistence layer

- [ ] **Step 1: Commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git add src/types/index.ts src/lib/api-client.ts src/hooks/useTourState.ts src/hooks/useTourViewport.ts
git commit -m "feat(tour): persistence hook + viewport hook + User.preferences type"
git push -u origin feat/tour-state-persistence
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --base develop --title "feat(tour): persistence layer for guided-tour system" --body "$(cat <<'EOF'
## Summary
- Extends `User` type with `preferences: UserPreferences` (forward-compat shape).
- Adds `api.profile.updatePreferences(partial)` to api-client.
- New `useTourState()` hook — `hasSeen(id)` / `markSeen(id)` with localStorage fallback.
- New `useTourViewport()` hook — 'desktop' | 'mobile' from matchMedia.

Depends on backend PR (users.preferences JSONB + PATCH /me/preferences). Merge that one first.

Spec: `docs/superpowers/specs/2026-05-23-guided-tour-system-design.md`

## Test plan
- [ ] `npx tsc --noEmit` clean
- [ ] After BE merges: smoke test in dev — call `api.profile.updatePreferences({ toursSeen: ['test'] })` from console, refresh, confirm hook reads it back
EOF
)"
```

**PR 1 complete.** Wait for BE + FE PRs to merge before proceeding to PR 2.

---

## PR 2 — Empty-state upgrade on kit detail

**Estimated time:** ~half day. FE only. Independently shippable — no dependency on PR 1.

### Task 2.1 — Locate the current empty state

**Files (read-only first):**
- Read: `/Users/aramammo/Side Quests/echome-frontend/src/app/app/library/[id]/ContentKitDetailContent.tsx:680-710`

- [ ] **Step 1: Confirm the empty-state location**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
grep -n "No content available\|empty\|No clips\|No carousel" src/app/app/library/\[id\]/ContentKitDetailContent.tsx
```

Confirm the lines roughly match the audit finding around 691-704. If they've drifted (file edits since the audit), use the actual grep output as the source of truth.

- [ ] **Step 2: Create branch**

```bash
git checkout develop && git pull
git checkout -b feat/kit-empty-state-upgrade
```

---

### Task 2.2 — Build the `EmptyStateCards` component

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/EmptyStateCards.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client';

/**
 * EmptyStateCards
 *
 * Replaces the generic "No content available" empty state on kit detail with
 * four labeled cards explaining what each section produces. The teleprompter
 * card is the discoverability lever — links to the Video Script tab of the
 * user's most recent kit, or /app/create if they have none.
 *
 * See spec §7.
 */
import Link from 'next/link';
import { Film, LayoutGrid, Sparkles, Video } from 'lucide-react';

interface Props {
  /** ID of the user's most recent OTHER kit, used to deep-link the teleprompter
   *  card. Null when this is the user's first kit. */
  fallbackKitId: string | null;
}

interface CardSpec {
  icon: typeof Film;
  iconColor: string;
  title: string;
  body: string;
  badge: string;
  href: string | null;
}

export function EmptyStateCards({ fallbackKitId }: Props) {
  const teleprompterHref = fallbackKitId
    ? `/app/library/${fallbackKitId}?tab=video-script`
    : '/app/create';

  const cards: CardSpec[] = [
    {
      icon: Film,
      iconColor: 'text-blue-400',
      title: 'Clips',
      body: '30–90 sec moments auto-found in your video. Edit captions, fix typos, drag them around. Appears after your video finishes processing.',
      badge: 'Coming when ready',
      href: null,
    },
    {
      icon: LayoutGrid,
      iconColor: 'text-purple-400',
      title: 'Carousel',
      body: '10 swipeable slides for Instagram. Reorder, edit text, swap photos. Appears within ~60s of generation.',
      badge: 'Coming when ready',
      href: null,
    },
    {
      icon: Sparkles,
      iconColor: 'text-amber-400',
      title: 'Reels',
      body: 'Stitched-together highlights set to music. Appears once clips are ready.',
      badge: 'Coming when ready',
      href: null,
    },
    {
      icon: Video,
      iconColor: 'text-green-400',
      title: 'Teleprompter',
      body: 'Want to record on camera instead? Open any Video Script tab and read it back while we record.',
      badge: 'Try this instead →',
      href: teleprompterHref,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const inner = (
          <div className="border border-border rounded-xl p-4 h-full opacity-75 hover:opacity-100 transition-opacity">
            <Icon className={`w-5 h-5 mb-3 ${c.iconColor}`} />
            <div className="text-sm font-semibold text-foreground mb-1">{c.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed mb-3">{c.body}</div>
            <div className="text-[11px] text-muted-foreground/70">{c.badge}</div>
          </div>
        );
        return c.href ? (
          <Link key={c.title} href={c.href} className="block">{inner}</Link>
        ) : (
          <div key={c.title}>{inner}</div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 2.3 — Wire the component into `ContentKitDetailContent`

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/app/app/library/[id]/ContentKitDetailContent.tsx` (the empty-state block found in Task 2.1)

- [ ] **Step 1: Add the import at the top of the file**

Near the other component imports in `ContentKitDetailContent.tsx`:

```typescript
import { EmptyStateCards } from '@/components/content-kit/EmptyStateCards';
```

- [ ] **Step 2: Replace the empty-state block**

Find the block matching `No content available` (from Task 2.1) and replace its inner JSX with:

```tsx
<EmptyStateCards fallbackKitId={otherKitsMostRecentId} />
```

Where `otherKitsMostRecentId` is derived from the existing kit-list state. If a list of the user's kits isn't already in scope, fetch the most recent one. Quick check: `grep -n "kits\|content_kits" ContentKitDetailContent.tsx` — if there's an existing prop or hook providing kit lists, use it. Otherwise, pass `null` for v1 and the teleprompter card will link to `/app/create`.

For the v1 minimum-viable, just pass `null`:

```tsx
<EmptyStateCards fallbackKitId={null} />
```

(Future iteration can wire a real recent-kit lookup; teleprompter card still works as a CTA either way.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
```

In the browser, navigate to a kit that has no content yet (or temporarily mock the empty-state condition). Visually confirm: four cards render, teleprompter card is clickable, the rest are static.

- [ ] **Step 5: Commit + push + PR**

```bash
git add src/components/content-kit/EmptyStateCards.tsx src/app/app/library/\[id\]/ContentKitDetailContent.tsx
git commit -m "feat(kit-detail): teaching empty state with 4 labelled cards (incl. teleprompter)"
git push -u origin feat/kit-empty-state-upgrade
gh pr create --base develop --title "feat(kit-detail): teaching empty state with 4 labelled cards" --body "Replaces 'No content available' generic message with 4 cards explaining each section. Teleprompter card is the discoverability lever per audit P1 finding. Spec §7."
```

**PR 2 complete.**

---

## PR 3 — FeatureTour + MobileTourSheet + 2 tours

**Estimated time:** ~1.5 days. FE only. Depends on PR 1 (needs `useTourState`).

### Task 3.1 — Add `react-joyride` dependency

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/package.json`

- [ ] **Step 1: Install**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git checkout develop && git pull
git checkout -b feat/coach-marks
npm install --save react-joyride@^2.9.3
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 3.2 — Lift + theme `FeatureTour` from closr

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/tour/FeatureTour.tsx`

- [ ] **Step 1: Read closr's reference implementation**

```bash
cat "/Users/aramammo/Side Quests/closr/src/components/tour/feature-tour.tsx"
```

- [ ] **Step 2: Write the EchoMe-themed version**

```typescript
'use client';

/**
 * FeatureTour
 *
 * First-access guided tour for a feature. Drop one of these on any page;
 * the tour fires exactly once per user per `tourId`. Completing or skipping
 * the tour persists the id into User.preferences.toursSeen via PATCH
 * /api/me/preferences so it never fires again unless the user explicitly
 * reopens via a Help icon (forceShow={true}).
 *
 * Lifted from closr/src/components/tour/feature-tour.tsx with EchoMe theming.
 *
 * On mobile (<768px) the desktop Joyride spotlight is replaced with a
 * MobileTourSheet bottom sheet. Same step content, different chrome.
 *
 * See spec §5.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { CallBackProps, Step } from 'react-joyride';
import { useTourState } from '@/hooks/useTourState';
import { useTourViewport } from '@/hooks/useTourViewport';
import { MobileTourSheet } from './MobileTourSheet';

const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

interface Props {
  tourId: string;
  steps: Step[];
  /** Force-show even if previously seen. Used by the replay help button. */
  forceShow?: boolean;
  onClose?: () => void;
}

export function FeatureTour({ tourId, steps, forceShow = false, onClose }: Props) {
  const { hasSeen, markSeen } = useTourState();
  const viewport = useTourViewport();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (forceShow || !hasSeen(tourId)) {
      const t = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(t);
    }
  }, [tourId, forceShow, hasSeen]);

  const handleClose = () => {
    setRun(false);
    void markSeen(tourId);
    onClose?.();
  };

  function handleJoyrideCallback(data: CallBackProps) {
    const { status, action } = data;
    if (status === 'finished' || status === 'skipped' || action === 'close') {
      handleClose();
    }
  }

  if (!run) return null;

  if (viewport === 'mobile') {
    return <MobileTourSheet steps={steps} onClose={handleClose} />;
  }

  if (typeof window === 'undefined') return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableScrolling={false}
      scrollToFirstStep
      scrollOffset={80}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Got it',
        next: 'Next',
        skip: 'Skip tour',
      }}
      styles={{
        options: {
          primaryColor: 'var(--accent, #FFB800)',
          textColor: 'var(--text, #f5f5f5)',
          backgroundColor: 'var(--surface-low, #16181c)',
          arrowColor: 'var(--surface-low, #16181c)',
          overlayColor: 'rgba(0,0,0,0.55)',
          zIndex: 9000,
        },
        tooltip: {
          fontSize: 14,
          padding: 18,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
        },
        tooltipContent: { padding: '8px 0', lineHeight: 1.55 },
        buttonNext: { fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8 },
        buttonBack: { fontSize: 13, marginRight: 6 },
        buttonSkip: { fontSize: 13 },
      }}
    />
  );
}
```

- [ ] **Step 3: Type-check (will fail until MobileTourSheet exists)**

```bash
npx tsc --noEmit
```

Expected: error on `MobileTourSheet` import. Resolved in next task.

---

### Task 3.3 — Build `MobileTourSheet`

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/tour/MobileTourSheet.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client';

/**
 * MobileTourSheet
 *
 * Bottom-sheet variant of FeatureTour for viewports <768px. Renders the same
 * Step[] array but as a fixed-bottom sheet rather than a Joyride spotlight.
 *
 * Behavior:
 *  - Sheet covers bottom 45vh; upper content dimmed at 35% opacity.
 *  - Tap grabber, tap-outside, or tap "Skip" all close → onClose() (which marks seen).
 *  - "Got it" on the last step closes the same way.
 *
 * See spec §5.2.
 */
import { useState } from 'react';
import type { Step } from 'react-joyride';

interface Props {
  steps: Step[];
  onClose: () => void;
}

export function MobileTourSheet({ steps, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  if (!step) {
    onClose();
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/35 z-[9000] md:hidden"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[9001] bg-card border-t border-border rounded-t-2xl shadow-2xl px-4 pt-3 pb-5 md:hidden"
        style={{ maxHeight: '45vh' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Grabber */}
        <div
          className="w-9 h-1 bg-border rounded-full mx-auto mb-3 cursor-pointer"
          onClick={onClose}
          aria-label="Close tour"
        />

        {/* Step counter + skip */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>

        {/* Title */}
        <div className="text-[15px] font-semibold text-foreground mb-1.5">
          {typeof step.title === 'string' ? step.title : ''}
        </div>

        {/* Body */}
        <div className="text-[13px] text-muted-foreground leading-relaxed mb-4">
          {typeof step.content === 'string' ? step.content : null}
        </div>

        {/* Progress dots + Next */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i === stepIndex ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (isLast ? onClose() : setStepIndex((s) => s + 1))}
            className="bg-accent text-accent-foreground px-4 py-1.5 rounded-lg text-[13px] font-semibold"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. (If `bg-accent`/`bg-card`/`bg-border` tokens don't exist in your Tailwind config, substitute with what the rest of the app uses — grep `CarouselEditorModal` for the actual class names.)

---

### Task 3.4 — Build the replay help pill

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/tour/TourReplayPill.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client';

/**
 * TourReplayPill
 *
 * Floating help pill that re-fires a tour without writing to toursSeen again.
 * Placement: bottom-left on desktop, bottom-right on mobile.
 *
 * See spec §5.5.
 */
import { HelpCircle } from 'lucide-react';

interface Props {
  onClick: () => void;
  /** Short label shown next to the icon. e.g. "Replay clip tour". */
  label: string;
}

export function TourReplayPill({ onClick, label }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed z-[8500] inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-full shadow-md bg-card border border-border text-muted-foreground hover:text-foreground transition-colors md:bottom-4 md:left-4 bottom-4 right-4"
    >
      <HelpCircle className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 3.5 — Add `data-tour` anchors to ClipEditorModal

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/ClipEditorModal.tsx`
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/CaptionOverlay.tsx`

- [ ] **Step 1: Locate the three anchor targets**

```bash
grep -n "CaptionOverlay\|resize\|transcript" src/components/content-kit/ClipEditorModal.tsx | head -20
grep -n "Resize\|corner handle\|aria-label=.Resize" src/components/content-kit/CaptionOverlay.tsx | head -10
```

- [ ] **Step 2: Add anchors**

Three additions:

1. On the `<CaptionOverlay>` outer wrapper (the draggable container) in `CaptionOverlay.tsx`:
   ```tsx
   <div data-tour="clip-editor-caption" /* existing props */>
   ```

2. On the resize handle button inside `CaptionOverlay.tsx`:
   ```tsx
   <div data-tour="clip-editor-resize" /* existing resize handle attrs */ />
   ```

3. On the transcript list container in `ClipEditorModal.tsx` (around the section rendering per-line transcript inputs):
   ```tsx
   <div data-tour="clip-editor-transcript" /* existing wrapper */>
   ```

For each, locate the existing element first via grep, then add the `data-tour` attribute without changing other attributes.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 3.6 — Create + mount the clip-editor tour

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/tour/tours/clip-editor.tsx`
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/ClipEditorModal.tsx`

- [ ] **Step 1: Write the tour wrapper**

```typescript
'use client';

/**
 * Clip editor tour — v1.
 *
 * Mounts inside ClipEditorModal; fires 500ms after the modal opens, exactly
 * once per user (tour id: clip-editor-v1). Replay pill re-fires without
 * persisting again.
 *
 * Anchors live on:
 *   - clip-editor-caption    CaptionOverlay outer wrapper
 *   - clip-editor-resize     CaptionOverlay's corner resize handle
 *   - clip-editor-transcript Transcript list container in ClipEditorModal
 *
 * Versioning: bump to clip-editor-v2 when affordances change meaningfully
 * (resize handle moves, new keyboard shortcut added, etc.).
 *
 * See spec §9.1.
 */
import { useState } from 'react';
import type { Step } from 'react-joyride';
import { FeatureTour } from '../FeatureTour';
import { TourReplayPill } from '../TourReplayPill';

const STEPS: Step[] = [
  {
    target: "[data-tour='clip-editor-caption']",
    title: 'Drag the caption to move it',
    content:
      'Captions are auto-positioned at the bottom, but you can drag them anywhere on the video.',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: "[data-tour='clip-editor-resize']",
    title: 'Resize from the corner handle',
    content:
      "Drag the small square at the caption's bottom-right corner to scale font and padding together.",
    placement: 'top',
  },
  {
    target: "[data-tour='clip-editor-transcript']",
    title: 'Click a transcript line to jump',
    content:
      'Tap any line in the transcript and the preview seeks to that moment. Useful for fast review.',
    placement: 'top',
  },
];

export function ClipEditorTour() {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="clip-editor-v1"
        steps={STEPS}
        forceShow={replayKey > 0}
        onClose={() => setReplayKey(0)}
      />
      <TourReplayPill
        onClick={() => setReplayKey((k) => k + 1)}
        label="Replay clip tour"
      />
    </>
  );
}
```

- [ ] **Step 2: Mount inside ClipEditorModal**

In `ClipEditorModal.tsx`, near the top of the modal's JSX (inside the modal root, so the pill renders only when the modal is open):

```tsx
import { ClipEditorTour } from '@/components/tour/tours/clip-editor';
// ... inside the rendered modal JSX:
<ClipEditorTour />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 3.7 — Add `data-tour` anchors to CarouselEditorModal

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/CarouselEditorModal.tsx`
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/CarouselFilmstrip.tsx` (or wherever the filmstrip JSX lives)
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/PhotoPicker.tsx` (or wherever the photo-swap UI lives)

- [ ] **Step 1: Locate the three anchor targets**

```bash
grep -n "Headline\|Body\|structured\|right.*pane\|PhotoPicker\|Filmstrip" src/components/content-kit/CarouselEditorModal.tsx | head -20
```

- [ ] **Step 2: Add anchors**

1. On the text-editing right-pane wrapper in `CarouselEditorModal.tsx`:
   ```tsx
   <div data-tour="carousel-editor-text" /* existing */>
   ```

2. On the PhotoPicker mount point (or its wrapper):
   ```tsx
   <div data-tour="carousel-editor-photo" /* existing */>
   ```

3. On the filmstrip wrapper in `CarouselFilmstrip.tsx`:
   ```tsx
   <div data-tour="carousel-editor-filmstrip" /* existing */>
   ```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 3.8 — Create + mount the carousel-editor tour

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/tour/tours/carousel-editor.tsx`
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/components/content-kit/CarouselEditorModal.tsx`

- [ ] **Step 1: Write the tour wrapper**

```typescript
'use client';

/**
 * Carousel editor tour — v1.
 *
 * Mounts inside CarouselEditorModal; fires 500ms after the modal opens,
 * exactly once per user (tour id: carousel-editor-v1).
 *
 * Anchors live on:
 *   - carousel-editor-text       Right-pane text-editing wrapper
 *   - carousel-editor-photo      PhotoPicker mount point
 *   - carousel-editor-filmstrip  Filmstrip wrapper (reorder/add/delete)
 *
 * Versioning: bump to carousel-editor-v2 when filmstrip affordances or
 * structured-field shape change meaningfully.
 *
 * See spec §9.2.
 */
import { useState } from 'react';
import type { Step } from 'react-joyride';
import { FeatureTour } from '../FeatureTour';
import { TourReplayPill } from '../TourReplayPill';

const STEPS: Step[] = [
  {
    target: "[data-tour='carousel-editor-text']",
    title: "Edit any slide's text here",
    content:
      'Cover, body, CTA — each field is editable. Changes save automatically and re-render the preview.',
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: "[data-tour='carousel-editor-photo']",
    title: 'Swap the photo on cover / last slides',
    content:
      'Tap "Change photo" to upload your own image or pick from a curated set. Body slides keep the template look.',
    placement: 'left',
  },
  {
    target: "[data-tour='carousel-editor-filmstrip']",
    title: 'Reorder, add, or remove slides',
    content:
      'Drag any thumbnail to reorder. Click + to insert a slide. Hover and tap ✕ to delete.',
    placement: 'top',
  },
];

export function CarouselEditorTour() {
  const [replayKey, setReplayKey] = useState(0);
  return (
    <>
      <FeatureTour
        tourId="carousel-editor-v1"
        steps={STEPS}
        forceShow={replayKey > 0}
        onClose={() => setReplayKey(0)}
      />
      <TourReplayPill
        onClick={() => setReplayKey((k) => k + 1)}
        label="Replay carousel tour"
      />
    </>
  );
}
```

- [ ] **Step 2: Mount inside CarouselEditorModal**

```tsx
import { CarouselEditorTour } from '@/components/tour/tours/carousel-editor';
// ... inside the rendered modal JSX:
<CarouselEditorTour />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 3.9 — Manual smoke + Playwright e2e for tour fire-on-open

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/tests/e2e/tour-fires-on-clip-editor-open.spec.ts`

- [ ] **Step 1: Manual smoke (both repos running)**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend" && npm run dev
```

In a fresh browser session (or after clearing `toursSeen`), open a content kit with clips, click a clip to open the editor. Confirm: tour fires after ~500ms, 3 steps render in order, "Got it" on step 3 closes the tour, refresh → does not re-fire. Click "Replay clip tour" pill → tour re-fires.

Repeat for the carousel editor.

- [ ] **Step 2: Optional Playwright e2e (recommended)**

```typescript
// tests/e2e/tour-fires-on-clip-editor-open.spec.ts
import { test, expect } from '@playwright/test';

test.describe('clip-editor tour', () => {
  test('fires on first open of a clip editor', async ({ page }) => {
    // SETUP: log in as a test user with toursSeen cleared
    // (use whatever auth helper already exists in tests/e2e/)
    // ...

    await page.goto('/app/library/<test-kit-id>');
    await page.click('[data-testid="clip-card-0"]'); // or actual selector
    await page.waitForTimeout(700); // 500ms delay + buffer

    await expect(page.locator('text=Drag the caption to move it')).toBeVisible();
    await page.click('text=Next');
    await expect(page.locator('text=Resize from the corner handle')).toBeVisible();
    await page.click('text=Next');
    await expect(page.locator('text=Click a transcript line to jump')).toBeVisible();
    await page.click('text=Got it');

    // Reopen — tour should not re-fire
    await page.reload();
    await page.click('[data-testid="clip-card-0"]');
    await page.waitForTimeout(700);
    await expect(page.locator('text=Drag the caption to move it')).not.toBeVisible();
  });
});
```

Run: `npm run test:e2e -- tour-fires-on-clip-editor-open.spec.ts`.

The exact auth helper and clip-card selector depend on existing test infrastructure — adapt to match.

---

### Task 3.10 — Commit + open PR

- [ ] **Step 1: Commit**

```bash
git add package.json package-lock.json \
  src/components/tour/ \
  src/components/content-kit/ClipEditorModal.tsx \
  src/components/content-kit/CaptionOverlay.tsx \
  src/components/content-kit/CarouselEditorModal.tsx \
  src/components/content-kit/CarouselFilmstrip.tsx \
  src/components/content-kit/PhotoPicker.tsx \
  tests/e2e/tour-fires-on-clip-editor-open.spec.ts
git commit -m "feat(tour): coach marks for clip + carousel editors (Joyride + mobile sheet)"
git push -u origin feat/coach-marks
gh pr create --base develop --title "feat(tour): clip + carousel editor coach marks" --body "$(cat <<'EOF'
## Summary
- Adds react-joyride as a dep.
- New FeatureTour shell (lifted from closr, themed for EchoMe).
- New MobileTourSheet for <768px viewports — same step content, bottom sheet chrome.
- TourReplayPill — floating help button that re-fires a tour.
- Two tours wired: clip-editor-v1, carousel-editor-v1 (3 steps each, ≤25 words per step).
- data-tour anchors added to CaptionOverlay, ClipEditorModal, CarouselEditorModal, CarouselFilmstrip, PhotoPicker.

Depends on PR 1 (useTourState hook). Spec §5, §9.

## Test plan
- [ ] `npx tsc --noEmit` clean
- [ ] Manual smoke: tour fires once per user per editor, replay pill re-fires
- [ ] Mobile (DevTools 375px): bottom sheet renders instead of Joyride spotlight
- [ ] Playwright e2e (if wired): tour-fires-on-clip-editor-open passes
EOF
)"
```

**PR 3 complete.**

---

## PR 4 — GetStartedChecklist + setup-progress endpoint

**Estimated time:** ~1 day. Both repos. Depends on PR 1.

### Task 4.1 — Backend test for `GET /api/me/setup-progress` (FAIL first)

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-platform-v2/tests/integration/routes/me-setup-progress.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import request from 'supertest';
import { app } from '../../../src/index';
import { supabase } from '../../../src/utils/supabase';
import { createTestUser, deleteTestUser, getAuthToken } from '../../fixtures/users';

describe('GET /api/me/setup-progress', () => {
  let userId: string;
  let token: string;

  beforeEach(async () => {
    const u = await createTestUser();
    userId = u.id;
    token = await getAuthToken(u);
  });

  afterEach(async () => {
    await deleteTestUser(userId);
  });

  it('returns all-false for a fresh user', async () => {
    const res = await request(app)
      .get('/api/me/setup-progress')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      generatedFirstKit: false,
      connectedSocial: false,
      scheduledFirstPost: false,
      recordedTeleprompter: false,
    });
  });

  it('flips generatedFirstKit when a content_kit exists', async () => {
    await supabase.from('content_kits').insert({ user_id: userId, title: 'test' });
    const res = await request(app)
      .get('/api/me/setup-progress')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.generatedFirstKit).toBe(true);
  });

  it('flips connectedSocial when a user_social_accounts row exists', async () => {
    await supabase.from('user_social_accounts').insert({
      user_id: userId,
      platform: 'instagram',
      outstand_account_id: 'TEST',
    });
    const res = await request(app)
      .get('/api/me/setup-progress')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.connectedSocial).toBe(true);
  });

  it('flips scheduledFirstPost when a scheduled_posts row exists', async () => {
    await supabase.from('scheduled_posts').insert({
      user_id: userId,
      platform: 'instagram',
      text: 'x',
      scheduled_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString(),
      status: 'scheduled',
    });
    const res = await request(app)
      .get('/api/me/setup-progress')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data.scheduledFirstPost).toBe(true);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/me/setup-progress');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2"
git checkout develop && git pull
git checkout -b feat/setup-progress-endpoint
npx jest tests/integration/routes/me-setup-progress.test.ts
```

Expected: FAIL — route does not exist.

---

### Task 4.2 — Implement `GET /api/me/setup-progress`

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-platform-v2/src/routes/auth.ts` (add after the PATCH /me/preferences handler)

- [ ] **Step 1: Add the handler**

```typescript
/**
 * GET /api/me/setup-progress
 * Returns booleans for the 4 onboarding-checklist items. Single SQL pass.
 * See spec §6.3.
 */
router.get('/me/setup-progress', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      });
    }

    const [{ count: kitCount }, { count: socialCount }, { count: postCount }] = await Promise.all([
      supabase.from('content_kits').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_social_accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('scheduled_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    // Teleprompter detection: KB entries tagged source=teleprompter.
    // Table is knowledge_base_entries; if your KB schema differs, grep for
    // 'metadata->>source' across src/routes to find the canonical lookup.
    const { count: telepromterCount } = await supabase
      .from('knowledge_base_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('metadata->>source', 'teleprompter');

    return res.json({
      success: true,
      data: {
        generatedFirstKit: (kitCount ?? 0) > 0,
        connectedSocial: (socialCount ?? 0) > 0,
        scheduledFirstPost: (postCount ?? 0) > 0,
        recordedTeleprompter: (telepromterCount ?? 0) > 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch progress',
        code: 'PROGRESS_ERROR',
      },
    });
  }
});
```

If `knowledge_base_entries` doesn't exist or the metadata-source path differs, fall back to a hard-coded `recordedTeleprompter: false` for v1 and open a follow-up issue. The rest of the checklist works without it; the teleprompter item just stays as the soft-hint forever, which is the same UX as a never-completed item.

- [ ] **Step 2: Run tests, confirm pass**

```bash
npx jest tests/integration/routes/me-setup-progress.test.ts
```

- [ ] **Step 3: Commit + push + PR**

```bash
git add src/routes/auth.ts tests/integration/routes/me-setup-progress.test.ts
git commit -m "feat(api): GET /api/me/setup-progress returns onboarding-checklist booleans"
git push -u origin feat/setup-progress-endpoint
gh pr create --base develop --title "feat(api): /me/setup-progress endpoint for dashboard checklist" --body "Powers PR 4 of the guided-tour system. Spec §6.3. Single-query, returns 4 booleans."
```

---

### Task 4.3 — Add `api.me.getSetupProgress` to api-client

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/lib/api-client.ts:291` (the `api` export root)

- [ ] **Step 1: Add a new `me` namespace if not present**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git checkout develop && git pull
git checkout -b feat/get-started-checklist
grep -n "^  me: " src/lib/api-client.ts
```

If no `me:` namespace exists, add one after the `profile:` namespace:

```typescript
  me: {
    getSetupProgress: async () => {
      const response = await apiClient.get('/me/setup-progress');
      return response.data as {
        success: boolean;
        data?: {
          generatedFirstKit: boolean;
          connectedSocial: boolean;
          scheduledFirstPost: boolean;
          recordedTeleprompter: boolean;
        };
      };
    },
  },
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 4.4 — Build `GetStartedChecklist` component

**Files:**
- Create: `/Users/aramammo/Side Quests/echome-frontend/src/components/dashboard/GetStartedChecklist.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client';

/**
 * GetStartedChecklist
 *
 * Top-of-dashboard 4-item activation card. Renders on /app for any user
 * who has NOT seen tour id "get-started-checklist-v1" AND has at least
 * one incomplete item. Auto-marks-seen on full completion; manual Dismiss
 * also marks seen.
 *
 * See spec §6.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTourState } from '@/hooks/useTourState';

const TOUR_ID = 'get-started-checklist-v1';

interface Progress {
  generatedFirstKit: boolean;
  connectedSocial: boolean;
  scheduledFirstPost: boolean;
  recordedTeleprompter: boolean;
}

interface Item {
  key: keyof Progress;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  blockedBy?: Array<keyof Progress>;
  blockedLabel?: string;
}

const ITEMS: Item[] = [
  {
    key: 'generatedFirstKit',
    title: 'Generate your first content kit',
    cta: { label: 'Create →', href: '/app/create' },
  },
  {
    key: 'connectedSocial',
    title: 'Connect a social account',
    description: 'Instagram, LinkedIn, Facebook, or Threads',
    cta: { label: 'Connect →', href: '/app/settings?tab=connections' },
  },
  {
    key: 'scheduledFirstPost',
    title: 'Schedule your first post',
    cta: { label: 'Schedule →', href: '/app/library' },
    blockedBy: ['generatedFirstKit', 'connectedSocial'],
    blockedLabel: 'Locked until you connect a social account',
  },
  {
    key: 'recordedTeleprompter',
    title: 'Record yourself on the teleprompter',
    description: 'Open any kit\'s Video Script tab',
  },
];

export function GetStartedChecklist() {
  const { hasSeen, markSeen } = useTourState();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasSeen(TOUR_ID)) return;
    api.me.getSetupProgress()
      .then((r) => { if (r.success && r.data) setProgress(r.data); })
      .catch(() => { /* silent — dashboard renders without the card */ });
  }, [hasSeen]);

  // Auto-mark-seen when all 4 complete
  useEffect(() => {
    if (!progress) return;
    const allDone = Object.values(progress).every(Boolean);
    if (allDone && !hasSeen(TOUR_ID)) {
      void markSeen(TOUR_ID);
    }
  }, [progress, hasSeen, markSeen]);

  if (hasSeen(TOUR_ID) || dismissed || !progress) return null;
  const allDone = Object.values(progress).every(Boolean);
  if (allDone) return null;

  const completedCount = Object.values(progress).filter(Boolean).length;
  const progressPct = Math.round((completedCount / ITEMS.length) * 100);

  function handleDismiss() {
    setDismissed(true);
    void markSeen(TOUR_ID);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Get the most out of EchoMe</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {ITEMS.length} steps · about 5 minutes
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-muted h-[3px] rounded-full overflow-hidden mb-3">
        <div className="bg-accent h-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const done = progress[item.key];
          const blocked = !done && (item.blockedBy?.some((k) => !progress[k]) ?? false);
          const isNext = !done && !blocked && ITEMS.findIndex((i) => !progress[i.key] && !(i.blockedBy?.some((k) => !progress[k]))) === ITEMS.indexOf(item);

          return (
            <div
              key={item.key}
              className={`flex items-center justify-between px-2 py-2 rounded-md ${
                isNext ? 'bg-muted/40 border-l-2 border-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    done
                      ? 'bg-accent text-accent-foreground'
                      : 'border-[1.5px] border-border'
                  }`}
                >
                  {done ? '✓' : ''}
                </div>
                <div>
                  <div
                    className={`text-[13px] ${
                      done ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                  )}
                </div>
              </div>

              {!done && blocked && (
                <div className="text-[11px] text-muted-foreground italic">{item.blockedLabel}</div>
              )}
              {!done && !blocked && item.cta && (
                <Link
                  href={item.cta.href}
                  className="bg-accent text-accent-foreground px-3 py-1 rounded-md text-[11px] font-semibold"
                >
                  {item.cta.label}
                </Link>
              )}
              {!done && !blocked && !item.cta && item.description && (
                <div className="text-[11px] text-muted-foreground italic">{item.description}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

### Task 4.5 — Mount on the dashboard

**Files:**
- Modify: `/Users/aramammo/Side Quests/echome-frontend/src/app/app/AppContent.tsx:436-440`

- [ ] **Step 1: Add import**

Near the other dashboard imports in `AppContent.tsx`:

```typescript
import { GetStartedChecklist } from '@/components/dashboard/GetStartedChecklist';
```

- [ ] **Step 2: Mount above OutcomeChips**

Replace the existing `<DraftedForYou />` + `<OutcomeChips />` block (around line 433-438) with:

```tsx
{/* Get Started checklist — auto-hides when complete or dismissed */}
<GetStartedChecklist />

{/* Drafted For You — Echo-proposed kits the user can review/schedule/kill */}
<DraftedForYou />

{/* Outcome Chips — intent-driven suggestions keyed off real data state */}
<div className="mb-6">
  <OutcomeChips />
</div>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
```

In a fresh session with toursSeen cleared, navigate to `/app`. Confirm: checklist renders at top with 1+ items incomplete, Dismiss works, items with completion data flip to done. After all 4 complete (or Dismiss), refresh — checklist gone.

---

### Task 4.6 — Commit + open PR

- [ ] **Step 1: Commit + push + PR**

```bash
git add src/lib/api-client.ts \
  src/components/dashboard/GetStartedChecklist.tsx \
  src/app/app/AppContent.tsx
git commit -m "feat(dashboard): Get Started checklist with 4 server-derivable items"
git push -u origin feat/get-started-checklist
gh pr create --base develop --title "feat(dashboard): Get Started checklist" --body "$(cat <<'EOF'
## Summary
- New GetStartedChecklist card on /app dashboard.
- 4 items derived server-side from content_kits/user_social_accounts/scheduled_posts/KB.
- Locked-until-prerequisite pattern for Schedule item.
- Auto-marks-seen on full completion; Dismiss also marks seen. No nag, no celebration.

Depends on PR 1 (useTourState) + the setup-progress endpoint PR. Spec §6.

## Test plan
- [ ] `npx tsc --noEmit` clean
- [ ] Fresh user dashboard renders checklist
- [ ] Completing items in DB → flips to done on refresh
- [ ] Dismiss → unmounts, refresh → stays gone
- [ ] All 4 complete → auto-unmounts, refresh → stays gone
EOF
)"
```

**PR 4 complete.** All four PRs done.

---

## Merge order

1. Backend PR 1 (`feat/users-preferences-jsonb`) — including the Supabase SQL Editor migration step in staging.
2. Frontend PR 1 (`feat/tour-state-persistence`).
3. Frontend PR 2 (`feat/kit-empty-state-upgrade`) — can ship in parallel with FE PR 1; no dependency.
4. Frontend PR 3 (`feat/coach-marks`) — depends on FE PR 1.
5. Backend PR 4 (`feat/setup-progress-endpoint`) — independent, can ship after BE PR 1.
6. Frontend PR 4 (`feat/get-started-checklist`) — depends on FE PR 1 + BE PR 4.

After each PR merges to `develop`, run a staging smoke before merging to `main` per the release policy.

---

## Out of scope (deferred per spec §3)

- Generic tour engine for non-engineers
- Reels coach marks
- Teleprompter coach marks
- Library / calendar / KB / voice empty-state rewrites
- Celebration UI when the checklist completes
- Setup-progress instrumentation (we use server-side derivation only)
