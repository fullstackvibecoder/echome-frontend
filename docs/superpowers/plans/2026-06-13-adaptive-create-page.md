# Adaptive Create Page Implementation Plan (SP1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/app` into an adaptive Create surface that senses knowledge-base coverage server-side and nudges the user toward KB population (voice-first) or content creation, backed by a new read-only `GET /api/kb/advisor` endpoint.

**Architecture:** Two layers. Layer 1 is a deterministic gate (instant, free) that computes 6-dimension KB coverage and picks one of three states (empty/thin/rich). Layer 2 is agentic intelligence (model-generated nudge copy + proposals), produced asynchronously and read from an in-memory cache so the page never blocks on a model call. The frontend renders the advisor contract verbatim; it never computes coverage or state.

**Tech Stack:** Backend = `echome-platform-v2` (Express, TypeScript, Jest, Supabase service-role client, `@anthropic-ai/sdk`). Frontend = `echome-frontend` (Next.js App Router, Vitest + @testing-library/react, Tailwind v4 tokens, axios api-client).

**Repos & roots:**
- Backend repo root: `/Users/aramammo/Side Quests/echome-platform-v2` (BE tasks 1-7).
- Frontend repo root: `/Users/aramammo/Side Quests/echome-frontend` (FE tasks 8-15).
- All paths below are relative to the repo named in each task's **Repo** line. Run commands from that repo root.

**Branch:** Work on `develop` in each repo (or a `feat/adaptive-create` branch off it). Do NOT push to `main` — release policy is develop → staging smoke → founder soak → main.

**Key design decisions locked here:**
- **No new DB table / no migration in SP1.** `voice_profiles.kb_hash` is a reserved column not computed in live code, so caching keys on a computed *coverage signature* (a hash of the rounded coverage strengths), held in an in-memory TTL cache. Cache is lost on deploy; that is acceptable for SP1 (cold cache returns the deterministic gate result).
- **The model call is never synchronous on the request path.** On a cache miss the handler returns the deterministic nudge immediately and warms the cache in the background (fire-and-forget). The next load serves the model-generated copy.
- **Coverage is tier-1 approximate.** Work + Voice are reliable; Industry/Interests/Personal are coarse (derived from `voiceContext`); Relationships is always 0 until the SP2 classifier. This is intentional per spec section 3.

**Spec:** `echome-frontend/docs/superpowers/specs/2026-06-13-adaptive-create-page-design.md`

---

## File Structure

### Backend (`echome-platform-v2`)
- Create: `src/services/kb-advisor/types.ts` — contract types, dimension keys, thresholds.
- Create: `src/services/kb-advisor/coverage.ts` — pure scoring (`scoreCoverage`, `pickState`, `coverageSignature`) + DB-reading `computeCoverage`.
- Create: `src/services/kb-advisor/nudge.ts` — `deterministicNudge` (curated fallback) + `generateNudge` (model call).
- Create: `src/services/kb-advisor/cache.ts` — in-memory TTL cache for the Layer-2 model result.
- Create: `src/services/kb-advisor/advisor.ts` — `getAdvisor` orchestrator.
- Modify: `src/routes/knowledge-base.ts` — add `GET /advisor` (router already mounted at `/api/kb`).
- Tests: `tests/unit/kb-advisor/{coverage,nudge,cache,advisor}.test.ts`, `tests/integration/kb-advisor-route.test.ts`.

### Frontend (`echome-frontend`)
- Modify: `package.json` + create `vitest.config.ts`, `vitest.setup.ts` — DOM test infra.
- Create: `src/types/advisor.ts` — `AdvisorResponse` and child types (mirrors BE contract).
- Modify: `src/lib/api-client.ts` — add `kb.advisor()`.
- Create: `src/components/create/CoverageMeter.tsx`
- Create: `src/components/create/AdvisorNudgeCard.tsx`
- Create: `src/components/create/AutopilotProposalCard.tsx`
- Create: `src/components/create/CapabilityTiles.tsx`
- Create: `src/components/create/VideoLibraryDrop.tsx`
- Create: `src/components/create/AdaptiveCreateSurface.tsx`
- Modify: `src/app/app/AppContent.tsx` — mount `AdaptiveCreateSurface`.
- Tests: co-located `*.test.tsx` next to each component.

---

# Backend Tasks (`echome-platform-v2`)

## Task 1: Advisor contract types + pure coverage scoring

**Repo:** `echome-platform-v2`

**Files:**
- Create: `src/services/kb-advisor/types.ts`
- Create: `src/services/kb-advisor/coverage.ts`
- Test: `tests/unit/kb-advisor/coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kb-advisor/coverage.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { scoreCoverage, pickState, coverageSignature } from '@/services/kb-advisor/coverage';
import type { CoverageInputs } from '@/services/kb-advisor/coverage';

const EMPTY_INPUTS: CoverageInputs = {
  profileRole: null,
  profileTopics: [],
  voiceProfilePresent: false,
  chunkCount: 0,
  recurringThemes: [],
  coreBeliefs: [],
};

describe('scoreCoverage', () => {
  it('returns all-zero, nothing covered for empty inputs', () => {
    const c = scoreCoverage(EMPTY_INPUTS);
    expect(c.work.strength).toBe(0);
    expect(c.work.covered).toBe(false);
    expect(c.relationships.strength).toBe(0);
    expect(Object.values(c).every((d) => d.covered === false)).toBe(true);
  });

  it('scores a rich profile across five dimensions', () => {
    const c = scoreCoverage({
      profileRole: 'Founder',
      profileTopics: ['saas', 'growth', 'ai'],
      voiceProfilePresent: true,
      chunkCount: 20,
      recurringThemes: ['a', 'b', 'c', 'd', 'e'],
      coreBeliefs: ['w', 'x', 'y', 'z'],
    });
    expect(c.work.strength).toBeCloseTo(1.0);
    expect(c.work.sampleCount).toBe(4);
    expect(c.voice.strength).toBeCloseTo(1.0);
    expect(c.industry.strength).toBeCloseTo(1.0);
    expect(c.interests.strength).toBeCloseTo(0.6);
    expect(c.personal.strength).toBeCloseTo(1.0);
    expect(c.relationships.covered).toBe(false);
    const coveredCount = Object.values(c).filter((d) => d.covered).length;
    expect(coveredCount).toBe(5);
  });

  it('clamps strengths to the 0..1 range', () => {
    const c = scoreCoverage({
      profileRole: 'Founder',
      profileTopics: ['a', 'b', 'c', 'd', 'e', 'f'],
      voiceProfilePresent: true,
      chunkCount: 999,
      recurringThemes: new Array(50).fill('t'),
      coreBeliefs: new Array(50).fill('b'),
    });
    expect(c.work.strength).toBeLessThanOrEqual(1);
    expect(c.voice.strength).toBeLessThanOrEqual(1);
    expect(c.industry.strength).toBeLessThanOrEqual(1);
    expect(c.interests.strength).toBeLessThanOrEqual(0.6);
  });
});

describe('pickState', () => {
  it('empty for 0-1 covered dimensions', () => {
    expect(pickState(scoreCoverage(EMPTY_INPUTS))).toBe('empty');
    expect(
      pickState(scoreCoverage({ ...EMPTY_INPUTS, profileRole: 'Founder', profileTopics: ['x'] })),
    ).toBe('empty');
  });

  it('thin for 2-3 covered dimensions', () => {
    const c = scoreCoverage({
      ...EMPTY_INPUTS,
      profileRole: 'Founder',
      profileTopics: ['x'],
      voiceProfilePresent: true,
      chunkCount: 10,
    });
    expect(pickState(c)).toBe('thin');
  });

  it('rich for 4-6 covered dimensions', () => {
    const c = scoreCoverage({
      profileRole: 'Founder',
      profileTopics: ['saas', 'growth', 'ai'],
      voiceProfilePresent: true,
      chunkCount: 20,
      recurringThemes: ['a', 'b', 'c', 'd', 'e'],
      coreBeliefs: ['w', 'x', 'y', 'z'],
    });
    expect(pickState(c)).toBe('rich');
  });
});

describe('coverageSignature', () => {
  it('is stable for equal coverage and differs when strength buckets change', () => {
    const a = scoreCoverage(EMPTY_INPUTS);
    const b = scoreCoverage(EMPTY_INPUTS);
    expect(coverageSignature(a)).toBe(coverageSignature(b));
    const c = scoreCoverage({ ...EMPTY_INPUTS, profileRole: 'Founder', profileTopics: ['x', 'y', 'z'] });
    expect(coverageSignature(c)).not.toBe(coverageSignature(a));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- kb-advisor/coverage`
Expected: FAIL — cannot find module `@/services/kb-advisor/coverage`.

- [ ] **Step 3: Write the types**

Create `src/services/kb-advisor/types.ts`:

```ts
// Read-only KB-advisor contract (SP1). Stable shape; SP3 swaps the producer
// (deterministic + cheap model) for the Echo v2 engine without changing this.

export type AdvisorState = 'empty' | 'thin' | 'rich';

export const DIMENSION_KEYS = [
  'work',
  'industry',
  'interests',
  'personal',
  'relationships',
  'voice',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export interface DimensionCoverage {
  covered: boolean;
  strength: number; // 0..1
  sampleCount: number;
}

export type Coverage = Record<DimensionKey, DimensionCoverage>;

export interface NudgeAction {
  label: string;
  type: 'voice' | 'ingest' | 'create';
  payload?: Record<string, unknown>;
}

export interface Nudge {
  headline: string;
  subhead: string;
  actions: NudgeAction[];
}

export interface Proposal {
  id: string;
  title: string;
  rationale: string;
  kitType: string;
  sourceRefs: string[];
}

export interface AdvisorResponse {
  state: AdvisorState;
  coverage: Coverage;
  nudge: Nudge;
  proposals: Proposal[];
}

// "Covered" means the dimension has meaningful material.
export const COVERED_THRESHOLD = 0.2;

// Human-facing dimension labels (no em dashes — platform strips them as an AI tell).
export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  work: 'Work',
  industry: 'Industry',
  interests: 'Interests',
  personal: 'Personal',
  relationships: 'Relationships',
  voice: 'Voice',
};
```

- [ ] **Step 4: Write the pure coverage logic**

Create `src/services/kb-advisor/coverage.ts`:

```ts
import {
  Coverage,
  COVERED_THRESHOLD,
  DimensionCoverage,
  DIMENSION_KEYS,
  AdvisorState,
} from './types';

// Raw signals pulled from the DB, scored into Coverage by the pure function below.
export interface CoverageInputs {
  profileRole: string | null;
  profileTopics: string[];
  voiceProfilePresent: boolean;
  chunkCount: number;
  recurringThemes: string[];
  coreBeliefs: string[];
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const dim = (strength: number, sampleCount: number): DimensionCoverage => ({
  strength,
  sampleCount,
  covered: strength >= COVERED_THRESHOLD,
});

// Tier-1 scoring. Work + Voice reliable; Industry/Interests/Personal coarse from
// voiceContext; Relationships always 0 until the SP2 per-ingest classifier.
export function scoreCoverage(input: CoverageInputs): Coverage {
  const topics = input.profileTopics ?? [];
  const themes = input.recurringThemes ?? [];
  const beliefs = input.coreBeliefs ?? [];

  let workStrength = 0;
  if (input.profileRole && input.profileRole.trim().length > 0) workStrength += 0.5;
  if (topics.length >= 1) workStrength += 0.3;
  if (topics.length >= 3) workStrength += 0.2;
  const work = dim(clamp01(workStrength), (input.profileRole ? 1 : 0) + topics.length);

  let voiceStrength = 0;
  if (input.voiceProfilePresent) voiceStrength += 0.4;
  voiceStrength += Math.min(input.chunkCount / 20, 0.6);
  const voice = dim(clamp01(voiceStrength), input.chunkCount);

  const industry = dim(clamp01(Math.min(themes.length / 5, 1)), themes.length);
  const interests = dim(clamp01(Math.min(themes.length / 8, 0.6)), themes.length);
  const personal = dim(clamp01(Math.min(beliefs.length / 4, 1)), beliefs.length);
  const relationships = dim(0, 0);

  return { work, industry, interests, personal, relationships, voice };
}

export function pickState(coverage: Coverage): AdvisorState {
  const covered = DIMENSION_KEYS.filter((k) => coverage[k].covered).length;
  if (covered <= 1) return 'empty';
  if (covered <= 3) return 'thin';
  return 'rich';
}

// Cache key for the Layer-2 model result. Buckets strengths to one decimal so
// tiny coverage drift does not invalidate the cache on every request.
export function coverageSignature(coverage: Coverage): string {
  return DIMENSION_KEYS.map((k) => `${k}:${Math.round(coverage[k].strength * 10)}`).join('|');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- kb-advisor/coverage`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add src/services/kb-advisor/types.ts src/services/kb-advisor/coverage.ts tests/unit/kb-advisor/coverage.test.ts
git commit -m "feat(kb-advisor): contract types + tier-1 coverage scoring"
```

---

## Task 2: computeCoverage — DB reads

**Repo:** `echome-platform-v2`

**Files:**
- Modify: `src/services/kb-advisor/coverage.ts`
- Test: `tests/unit/kb-advisor/coverage-db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kb-advisor/coverage-db.test.ts`:

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Chainable Supabase query stub: each call returns a per-table canned result.
const tableResults: Record<string, any> = {};
function makeQuery(table: string) {
  const result = tableResults[table];
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn(async () => result),
    then: undefined,
  };
  // For the count query (chunks) we await the chain itself.
  chain.then = (resolve: any) => resolve(result);
  return chain;
}

jest.mock('@/utils/supabase', () => ({
  supabase: { from: jest.fn((table: string) => makeQuery(table)) },
}));

import { computeCoverage } from '@/services/kb-advisor/coverage';

describe('computeCoverage', () => {
  beforeEach(() => {
    for (const k of Object.keys(tableResults)) delete tableResults[k];
  });

  it('maps DB rows into scored coverage', async () => {
    tableResults['users'] = {
      data: { profile_role: 'Founder', profile_topics: ['saas', 'growth', 'ai'] },
      error: null,
    };
    tableResults['voice_profiles'] = {
      data: {
        profile_data: {
          voiceContext: { recurringThemes: ['a', 'b', 'c', 'd', 'e'], coreBeliefs: ['w', 'x', 'y', 'z'] },
        },
      },
      error: null,
    };
    tableResults['chunks'] = { count: 20, error: null };

    const coverage = await computeCoverage('user-1');
    expect(coverage.work.covered).toBe(true);
    expect(coverage.voice.covered).toBe(true);
    expect(coverage.industry.covered).toBe(true);
    expect(coverage.personal.covered).toBe(true);
  });

  it('survives missing rows (new user) and returns empty coverage', async () => {
    tableResults['users'] = { data: null, error: null };
    tableResults['voice_profiles'] = { data: null, error: null };
    tableResults['chunks'] = { count: 0, error: null };

    const coverage = await computeCoverage('new-user');
    expect(coverage.work.covered).toBe(false);
    expect(coverage.voice.covered).toBe(false);
    expect(coverage.relationships.strength).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- kb-advisor/coverage-db`
Expected: FAIL — `computeCoverage` is not exported.

- [ ] **Step 3: Add computeCoverage to coverage.ts**

Append to `src/services/kb-advisor/coverage.ts` (add the import at the top, function at the bottom):

```ts
// add near the existing imports
import { supabase } from '../../utils/supabase';
import { logger } from '../../utils/logger';
```

```ts
// append at the end of the file

// Reads tier-1 signals for one user and scores them. Read-only. Never throws on
// missing data — a brand-new user returns all-zero coverage.
export async function computeCoverage(userId: string): Promise<Coverage> {
  const [userRes, voiceRes, chunkRes] = await Promise.all([
    supabase
      .from('users')
      .select('profile_role, profile_topics')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('voice_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .is('voice_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (userRes.error) logger.warn('kb-advisor: users read failed', { userId, error: userRes.error });
  if (voiceRes.error) logger.warn('kb-advisor: voice_profiles read failed', { userId, error: voiceRes.error });
  if (chunkRes.error) logger.warn('kb-advisor: chunks count failed', { userId, error: chunkRes.error });

  const userRow = (userRes.data ?? {}) as { profile_role?: string | null; profile_topics?: unknown };
  const profileTopics = Array.isArray(userRow.profile_topics)
    ? (userRow.profile_topics as unknown[]).map(String)
    : [];

  const profileData = (voiceRes.data?.profile_data ?? {}) as { voiceContext?: { recurringThemes?: unknown; coreBeliefs?: unknown } };
  const vc = profileData.voiceContext ?? {};
  const recurringThemes = Array.isArray(vc.recurringThemes) ? (vc.recurringThemes as unknown[]).map(String) : [];
  const coreBeliefs = Array.isArray(vc.coreBeliefs) ? (vc.coreBeliefs as unknown[]).map(String) : [];

  return scoreCoverage({
    profileRole: userRow.profile_role ?? null,
    profileTopics,
    voiceProfilePresent: voiceRes.data != null,
    chunkCount: chunkRes.count ?? 0,
    recurringThemes,
    coreBeliefs,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- kb-advisor/coverage-db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/kb-advisor/coverage.ts tests/unit/kb-advisor/coverage-db.test.ts
git commit -m "feat(kb-advisor): computeCoverage reads tier-1 signals from Supabase"
```

---

## Task 3: Deterministic nudge (curated fallback copy)

**Repo:** `echome-platform-v2`

**Files:**
- Create: `src/services/kb-advisor/nudge.ts`
- Test: `tests/unit/kb-advisor/nudge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kb-advisor/nudge.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';
import { deterministicNudge } from '@/services/kb-advisor/nudge';
import { scoreCoverage, type CoverageInputs } from '@/services/kb-advisor/coverage';

const EMPTY: CoverageInputs = {
  profileRole: null,
  profileTopics: [],
  voiceProfilePresent: false,
  chunkCount: 0,
  recurringThemes: [],
  coreBeliefs: [],
};

describe('deterministicNudge', () => {
  it('empty state leads with a voice action and teaches the payoff', () => {
    const n = deterministicNudge('empty', scoreCoverage(EMPTY));
    expect(n.headline.length).toBeGreaterThan(0);
    expect(n.actions.some((a) => a.type === 'voice')).toBe(true);
  });

  it('thin state names a missing dimension in an action', () => {
    const coverage = scoreCoverage({ ...EMPTY, profileRole: 'Founder', profileTopics: ['x'], voiceProfilePresent: true, chunkCount: 10 });
    const n = deterministicNudge('thin', coverage);
    expect(n.actions.length).toBeGreaterThanOrEqual(2);
    expect(n.actions.some((a) => a.type === 'ingest' || a.type === 'voice')).toBe(true);
  });

  it('rich state offers a create action', () => {
    const coverage = scoreCoverage({
      profileRole: 'Founder', profileTopics: ['a', 'b', 'c'], voiceProfilePresent: true, chunkCount: 20,
      recurringThemes: ['a', 'b', 'c', 'd', 'e'], coreBeliefs: ['w', 'x', 'y', 'z'],
    });
    const n = deterministicNudge('rich', coverage);
    expect(n.actions.some((a) => a.type === 'create')).toBe(true);
  });

  it('never emits em dashes in copy (AI tell)', () => {
    for (const state of ['empty', 'thin', 'rich'] as const) {
      const n = deterministicNudge(state, scoreCoverage(EMPTY));
      const text = [n.headline, n.subhead, ...n.actions.map((a) => a.label)].join(' ');
      expect(text).not.toContain('—'); // em dash
      expect(text).not.toContain('–'); // en dash
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- kb-advisor/nudge`
Expected: FAIL — cannot find module `@/services/kb-advisor/nudge`.

- [ ] **Step 3: Write deterministicNudge**

Create `src/services/kb-advisor/nudge.ts`:

```ts
import { AdvisorState, Coverage, DIMENSION_KEYS, DIMENSION_LABELS, Nudge } from './types';

// Lowest-strength uncovered dimensions, as human labels, for "tell me about X".
function topGaps(coverage: Coverage, limit: number): string[] {
  return DIMENSION_KEYS.filter((k) => !coverage[k].covered)
    .sort((a, b) => coverage[a].strength - coverage[b].strength)
    .slice(0, limit)
    .map((k) => DIMENSION_LABELS[k].toLowerCase());
}

// Curated copy per state. Used as the instant fallback when the model cache is
// cold or the model call failed. No em dashes (platform strips them as an AI tell).
export function deterministicNudge(state: AdvisorState, coverage: Coverage): Nudge {
  if (state === 'empty') {
    return {
      headline: 'Teach Echo your voice. Talk for two minutes.',
      subhead: 'The more you tell Echo, the more it makes for you beyond what you ask.',
      actions: [
        { label: 'Talk for two minutes', type: 'voice' },
        { label: 'Add a video or link', type: 'ingest' },
      ],
    };
  }

  if (state === 'thin') {
    const gaps = topGaps(coverage, 2);
    const gapText = gaps.length > 0 ? gaps.join(' and ') : 'the rest of your story';
    return {
      headline: 'Good start. Echo wants to know more.',
      subhead: `Tell Echo about your ${gapText} so it can make content beyond your day job.`,
      actions: [
        { label: `Talk about your ${gaps[0] ?? 'story'}`, type: 'voice' },
        { label: 'Add a video or link', type: 'ingest' },
        { label: 'Make something now', type: 'create' },
      ],
    };
  }

  return {
    headline: 'Echo can build from what you shared.',
    subhead: 'Pick a draft below, or tell Echo what you want next.',
    actions: [
      { label: 'Make something now', type: 'create' },
      { label: 'Add more material', type: 'ingest' },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- kb-advisor/nudge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/kb-advisor/nudge.ts tests/unit/kb-advisor/nudge.test.ts
git commit -m "feat(kb-advisor): deterministic curated nudge fallback"
```

---

## Task 4: Model-generated nudge + proposals (Layer 2)

**Repo:** `echome-platform-v2`

**Files:**
- Modify: `src/services/kb-advisor/nudge.ts`
- Test: `tests/unit/kb-advisor/nudge-model.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kb-advisor/nudge-model.test.ts`:

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const createMock = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: createMock },
  }));
});

import { generateNudge } from '@/services/kb-advisor/nudge';
import { scoreCoverage, type CoverageInputs } from '@/services/kb-advisor/coverage';

const RICH: CoverageInputs = {
  profileRole: 'Founder', profileTopics: ['a', 'b', 'c'], voiceProfilePresent: true, chunkCount: 20,
  recurringThemes: ['a', 'b', 'c', 'd', 'e'], coreBeliefs: ['w', 'x', 'y', 'z'],
};

describe('generateNudge', () => {
  beforeEach(() => createMock.mockReset());

  it('parses model JSON into nudge + proposals', async () => {
    createMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            nudge: { headline: 'Hi', subhead: 'There', actions: [{ label: 'Go', type: 'create' }] },
            proposals: [
              { id: 'p1', title: 'A LinkedIn post', rationale: 'You talk about growth', kitType: 'social_post', sourceRefs: [] },
            ],
          }),
        },
      ],
    });

    const out = await generateNudge('rich', scoreCoverage(RICH));
    expect(out.nudge.headline).toBe('Hi');
    expect(out.proposals).toHaveLength(1);
    expect(out.proposals[0].kitType).toBe('social_post');
  });

  it('tolerates a fenced ```json block', async () => {
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n{"nudge":{"headline":"H","subhead":"S","actions":[]},"proposals":[]}\n```' }],
    });
    const out = await generateNudge('thin', scoreCoverage(RICH));
    expect(out.nudge.headline).toBe('H');
    expect(out.proposals).toEqual([]);
  });

  it('throws on unparseable output so callers fall back', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });
    await expect(generateNudge('rich', scoreCoverage(RICH))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- kb-advisor/nudge-model`
Expected: FAIL — `generateNudge` is not exported.

- [ ] **Step 3: Add generateNudge to nudge.ts**

Add imports at the top of `src/services/kb-advisor/nudge.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '../../config/models';
import { Proposal } from './types';
```

Append to `src/services/kb-advisor/nudge.ts`:

```ts
const METHODOLOGY = [
  'EchoMe turns a creator\'s knowledge base into authentic, on-voice social content.',
  'The more breadth a creator gives across work, industry, interests, personal life,',
  'relationships, and voice, the more Echo can make for them unprompted.',
  'Coach the creator toward the lightest next step that widens their coverage,',
  'and favor talking by voice as the easiest way to add material.',
].join(' ');

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('kb-advisor: no JSON object in model output');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

// One cheap model call producing personalized nudge copy and (rich only)
// proposals. NEVER called on the request path when the cache is warm — the
// orchestrator warms the cache in the background. Throws on any failure so the
// caller can fall back to deterministicNudge.
export async function generateNudge(
  state: AdvisorState,
  coverage: Coverage,
): Promise<{ nudge: Nudge; proposals: Proposal[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('kb-advisor: ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey });

  const wantProposals = state === 'rich';
  const prompt = [
    METHODOLOGY,
    '',
    `Creator KB state: ${state}.`,
    `Coverage (0..1 strength per dimension): ${JSON.stringify(coverage)}.`,
    '',
    'Return ONLY a JSON object with this exact shape, no prose:',
    '{',
    '  "nudge": { "headline": string, "subhead": string,',
    '    "actions": [{ "label": string, "type": "voice"|"ingest"|"create" }] },',
    wantProposals
      ? '  "proposals": [{ "id": string, "title": string, "rationale": string, "kitType": string, "sourceRefs": string[] }]'
      : '  "proposals": []',
    '}',
    'Constraints: warm and concise. Never use em dashes or en dashes.',
    wantProposals
      ? 'Give 2 to 3 proposals grounded in the covered dimensions.'
      : 'proposals must be an empty array.',
  ].join('\n');

  const response = await client.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
  if (!block) throw new Error('kb-advisor: model returned no text block');

  const parsed = extractJson(block.text) as { nudge?: Nudge; proposals?: Proposal[] };
  if (!parsed.nudge || !Array.isArray(parsed.nudge.actions)) {
    throw new Error('kb-advisor: model output missing nudge.actions');
  }
  return {
    nudge: parsed.nudge,
    proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
  };
}
```

Note: `AdvisorState`, `Coverage`, `Nudge` are already imported at the top of `nudge.ts` from Task 3.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- kb-advisor/nudge-model`
Expected: PASS.

- [ ] **Step 5: Verify the MODELS import resolves**

Run: `npx tsc --noEmit -p tsconfig.test.json 2>&1 | grep "kb-advisor/nudge" || echo "OK: no type errors in nudge.ts"`
Expected: `OK: no type errors in nudge.ts`. If `MODELS.SONNET` does not exist, open `src/config/models.ts`, find the Sonnet constant (the generation templates use `MODELS.SONNET`), and use the correct member name.

- [ ] **Step 6: Commit**

```bash
git add src/services/kb-advisor/nudge.ts tests/unit/kb-advisor/nudge-model.test.ts
git commit -m "feat(kb-advisor): model-generated nudge + proposals (Layer 2)"
```

---

## Task 5: In-memory TTL cache for the Layer-2 result

**Repo:** `echome-platform-v2`

**Files:**
- Create: `src/services/kb-advisor/cache.ts`
- Test: `tests/unit/kb-advisor/cache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kb-advisor/cache.test.ts`:

```ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { cacheGet, cacheSet, clearAdvisorCache } from '@/services/kb-advisor/cache';

const VALUE = { nudge: { headline: 'H', subhead: 'S', actions: [] }, proposals: [] };

describe('advisor cache', () => {
  beforeEach(() => clearAdvisorCache());

  it('returns undefined on a miss', () => {
    expect(cacheGet('u1', 'sig')).toBeUndefined();
  });

  it('returns the value on a hit within ttl', () => {
    cacheSet('u1', 'sig', VALUE, 1000);
    expect(cacheGet('u1', 'sig', 500)).toEqual(VALUE);
  });

  it('expires after ttl', () => {
    cacheSet('u1', 'sig', VALUE, 1000, 0); // stored at t=0
    expect(cacheGet('u1', 'sig', 1500)).toBeUndefined();
  });

  it('isolates by user and signature', () => {
    cacheSet('u1', 'sigA', VALUE, 1000, 0);
    expect(cacheGet('u2', 'sigA', 100)).toBeUndefined();
    expect(cacheGet('u1', 'sigB', 100)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- kb-advisor/cache`
Expected: FAIL — cannot find module `@/services/kb-advisor/cache`.

- [ ] **Step 3: Write the cache**

Create `src/services/kb-advisor/cache.ts`:

```ts
import { Nudge, Proposal } from './types';

export interface CachedLayer2 {
  nudge: Nudge;
  proposals: Proposal[];
}

interface Entry extends CachedLayer2 {
  expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const store = new Map<string, Entry>();

const keyFor = (userId: string, signature: string): string => `${userId}::${signature}`;

// `now` defaults to Date.now() so tests can inject a clock.
export function cacheGet(userId: string, signature: string, now: number = Date.now()): CachedLayer2 | undefined {
  const entry = store.get(keyFor(userId, signature));
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    store.delete(keyFor(userId, signature));
    return undefined;
  }
  return { nudge: entry.nudge, proposals: entry.proposals };
}

export function cacheSet(
  userId: string,
  signature: string,
  value: CachedLayer2,
  ttlMs: number = DEFAULT_TTL_MS,
  now: number = Date.now(),
): void {
  store.set(keyFor(userId, signature), { ...value, expiresAt: now + ttlMs });
}

export function clearAdvisorCache(): void {
  store.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- kb-advisor/cache`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/kb-advisor/cache.ts tests/unit/kb-advisor/cache.test.ts
git commit -m "feat(kb-advisor): in-memory ttl cache for layer-2 result"
```

---

## Task 6: getAdvisor orchestrator

**Repo:** `echome-platform-v2`

**Files:**
- Create: `src/services/kb-advisor/advisor.ts`
- Test: `tests/unit/kb-advisor/advisor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/kb-advisor/advisor.test.ts`:

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Keep the pure helpers real; stub only the DB-reading computeCoverage.
jest.mock('@/services/kb-advisor/coverage', () => {
  const actual = jest.requireActual('@/services/kb-advisor/coverage') as Record<string, unknown>;
  return { ...actual, computeCoverage: jest.fn() };
});

// Prevent any real network call from the background cache warm.
const createMock = jest.fn(async () => ({
  content: [{ type: 'text', text: JSON.stringify({ nudge: { headline: 'M', subhead: 'S', actions: [] }, proposals: [] }) }],
}));
jest.mock('@anthropic-ai/sdk', () => jest.fn().mockImplementation(() => ({ messages: { create: createMock } })));

import { getAdvisor } from '@/services/kb-advisor/advisor';
import { computeCoverage, scoreCoverage, coverageSignature, type CoverageInputs } from '@/services/kb-advisor/coverage';
import { cacheSet, clearAdvisorCache } from '@/services/kb-advisor/cache';

const EMPTY: CoverageInputs = {
  profileRole: null, profileTopics: [], voiceProfilePresent: false, chunkCount: 0, recurringThemes: [], coreBeliefs: [],
};

describe('getAdvisor', () => {
  beforeEach(() => {
    clearAdvisorCache();
    (computeCoverage as jest.Mock).mockReset();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('cold cache: returns deterministic nudge and empty proposals immediately', async () => {
    (computeCoverage as jest.Mock).mockResolvedValue(scoreCoverage(EMPTY));
    const res = await getAdvisor('user-cold');
    expect(res.state).toBe('empty');
    expect(res.nudge.actions.some((a) => a.type === 'voice')).toBe(true);
    expect(res.proposals).toEqual([]);
  });

  it('warm cache: serves the cached layer-2 result', async () => {
    const coverage = scoreCoverage(EMPTY);
    (computeCoverage as jest.Mock).mockResolvedValue(coverage);
    cacheSet('user-warm', coverageSignature(coverage), {
      nudge: { headline: 'CACHED', subhead: 'S', actions: [] },
      proposals: [{ id: 'p1', title: 'T', rationale: 'R', kitType: 'social_post', sourceRefs: [] }],
    });
    const res = await getAdvisor('user-warm');
    expect(res.nudge.headline).toBe('CACHED');
    expect(res.proposals).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- kb-advisor/advisor`
Expected: FAIL — cannot find module `@/services/kb-advisor/advisor`.

- [ ] **Step 3: Write the orchestrator**

Create `src/services/kb-advisor/advisor.ts`:

```ts
import { AdvisorResponse, AdvisorState, Coverage } from './types';
import { computeCoverage, pickState, coverageSignature } from './coverage';
import { deterministicNudge, generateNudge } from './nudge';
import { cacheGet, cacheSet } from './cache';
import { logger } from '../../utils/logger';

// Background: run the cheap model call and populate the cache for the NEXT load.
// Fire-and-forget; failures are swallowed so the request path is never affected.
function warmCache(userId: string, signature: string, state: AdvisorState, coverage: Coverage): void {
  void generateNudge(state, coverage)
    .then((result) => cacheSet(userId, signature, result))
    .catch((error) => logger.warn('kb-advisor: cache warm failed', { userId, error }));
}

// Read-only. Always returns instantly: deterministic gate computes state +
// coverage; the model-generated layer is served from cache when warm and warmed
// in the background when cold. Never blocks on a model call.
export async function getAdvisor(userId: string): Promise<AdvisorResponse> {
  const coverage = await computeCoverage(userId);
  const state = pickState(coverage);
  const signature = coverageSignature(coverage);

  const cached = cacheGet(userId, signature);
  if (cached) {
    return { state, coverage, nudge: cached.nudge, proposals: cached.proposals };
  }

  warmCache(userId, signature, state, coverage);
  return { state, coverage, nudge: deterministicNudge(state, coverage), proposals: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- kb-advisor/advisor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/kb-advisor/advisor.ts tests/unit/kb-advisor/advisor.test.ts
git commit -m "feat(kb-advisor): getAdvisor orchestrator (deterministic + cached layer-2)"
```

---

## Task 7: Mount GET /api/kb/advisor

**Repo:** `echome-platform-v2`

**Files:**
- Modify: `src/routes/knowledge-base.ts`
- Test: `tests/integration/kb-advisor-route.test.ts`

- [ ] **Step 1: Read the route file to find the insertion point and auth pattern**

Run: `sed -n '1,40p' src/routes/knowledge-base.ts`
Confirm: it imports `authenticateUser` and applies it (router-level `router.use(authenticateUser)` or per-route). If router-level auth is already applied, the new route inherits it; if per-route, add `authenticateUser` to the new route. Note the exact import names used by this file (e.g. `AuthenticatedRequest`, `Response`, `NextFunction`).

- [ ] **Step 2: Write the failing test**

Create `tests/integration/kb-advisor-route.test.ts`:

```ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Stub auth middleware to inject a user.
jest.mock('@/middleware/auth', () => ({
  authenticateUser: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'u@example.com' };
    next();
  },
}));

const getAdvisorMock = jest.fn();
jest.mock('@/services/kb-advisor/advisor', () => ({ getAdvisor: getAdvisorMock }));

import knowledgeBaseRoutes from '@/routes/knowledge-base';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/kb', knowledgeBaseRoutes);
  return app;
}

describe('GET /api/kb/advisor', () => {
  beforeEach(() => getAdvisorMock.mockReset());

  it('returns the advisor payload for an authenticated user', async () => {
    getAdvisorMock.mockResolvedValue({
      state: 'empty',
      coverage: {},
      nudge: { headline: 'H', subhead: 'S', actions: [] },
      proposals: [],
    });
    const res = await request(buildApp()).get('/api/kb/advisor');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.state).toBe('empty');
    expect(getAdvisorMock).toHaveBeenCalledWith('user-1');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:integration -- kb-advisor-route`
Expected: FAIL — route returns 404 (handler not yet added).

- [ ] **Step 4: Add the route handler**

Add the import near the other service imports at the top of `src/routes/knowledge-base.ts`:

```ts
import { getAdvisor } from '../services/kb-advisor/advisor';
```

Add this route alongside the other `GET` routes in `src/routes/knowledge-base.ts` (use the same `Request/Response/NextFunction` type names the file already imports; if it uses `AuthenticatedRequest`, keep that):

```ts
// Read-only adaptive-create advisor. GA for all users. Never writes; never
// blocks on a model call (see src/services/kb-advisor/advisor.ts).
router.get('/advisor', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'User not authenticated', code: 'UNAUTHORIZED' } });
      return;
    }
    const advisor = await getAdvisor(userId);
    res.json({ success: true, data: advisor });
  } catch (error) {
    logger.error('kb-advisor: /advisor failed', { error });
    next(error);
  }
});
```

If `knowledge-base.ts` applies auth per-route rather than router-level, insert `authenticateUser,` as the second argument: `router.get('/advisor', authenticateUser, async (req, res, next) => { ... })`. If `logger` is not already imported in this file, add `import { logger } from '../utils/logger';`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:integration -- kb-advisor-route`
Expected: PASS.

- [ ] **Step 6: Full backend suite + typecheck**

Run: `npm run test:unit -- kb-advisor && npx tsc --noEmit -p tsconfig.test.json`
Expected: all kb-advisor suites green; no new type errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/knowledge-base.ts tests/integration/kb-advisor-route.test.ts
git commit -m "feat(kb-advisor): mount GET /api/kb/advisor (read-only, GA)"
```

---

# Frontend Tasks (`echome-frontend`)

## Task 8: Component test infrastructure (Vitest + jsdom + testing-library)

**Repo:** `echome-frontend`

The repo has Vitest but no DOM testing setup. This one-time task adds it so components can be render-tested.

**Files:**
- Modify: `package.json` (devDependencies + scripts already present)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Test: `src/lib/__advisor_infra_check.test.tsx` (temporary, deleted in Step 6)

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
npm i -D @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^25 @vitejs/plugin-react@^4
```
Expected: installs without peer-dependency errors. (React 18/19 + testing-library 16 are compatible.)

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3: Create the setup file**

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Write a temporary infra-check test**

Create `src/lib/__advisor_infra_check.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('test infra', () => {
  it('renders a component into jsdom', () => {
    render(<button>Click me</button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it to verify the infra works**

Run: `npm run test:unit -- __advisor_infra_check`
Expected: PASS (renders into jsdom; `toBeInTheDocument` matcher available).

- [ ] **Step 6: Delete the temporary test and commit**

```bash
rm src/lib/__advisor_infra_check.test.tsx
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "test(fe): add jsdom + testing-library component test infra"
```

---

## Task 9: Advisor types + api-client method

**Repo:** `echome-frontend`

**Files:**
- Create: `src/types/advisor.ts`
- Modify: `src/lib/api-client.ts`
- Test: `src/types/advisor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/types/advisor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '@/types/advisor';

describe('advisor dimension constants', () => {
  it('has six dimensions with labels', () => {
    expect(DIMENSION_KEYS).toHaveLength(6);
    for (const k of DIMENSION_KEYS) {
      expect(DIMENSION_LABELS[k].length).toBeGreaterThan(0);
    }
  });

  it('includes voice and relationships', () => {
    expect(DIMENSION_KEYS).toContain('voice');
    expect(DIMENSION_KEYS).toContain('relationships');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- types/advisor`
Expected: FAIL — cannot find module `@/types/advisor`.

- [ ] **Step 3: Write the types (mirror of the BE contract)**

Create `src/types/advisor.ts`:

```ts
export type AdvisorState = 'empty' | 'thin' | 'rich';

export const DIMENSION_KEYS = [
  'work',
  'industry',
  'interests',
  'personal',
  'relationships',
  'voice',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  work: 'Work',
  industry: 'Industry',
  interests: 'Interests',
  personal: 'Personal',
  relationships: 'Relationships',
  voice: 'Voice',
};

export interface DimensionCoverage {
  covered: boolean;
  strength: number; // 0..1
  sampleCount: number;
}

export type Coverage = Record<DimensionKey, DimensionCoverage>;

export type NudgeActionType = 'voice' | 'ingest' | 'create';

export interface NudgeAction {
  label: string;
  type: NudgeActionType;
  payload?: Record<string, unknown>;
}

export interface Nudge {
  headline: string;
  subhead: string;
  actions: NudgeAction[];
}

export interface Proposal {
  id: string;
  title: string;
  rationale: string;
  kitType: string;
  sourceRefs: string[];
}

export interface AdvisorResponse {
  state: AdvisorState;
  coverage: Coverage;
  nudge: Nudge;
  proposals: Proposal[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- types/advisor`
Expected: PASS.

- [ ] **Step 5: Add the api-client method**

In `src/lib/api-client.ts`, add the import near the other type imports at the top:

```ts
import type { AdvisorResponse } from '@/types/advisor';
```

Add an `advisor` method inside the existing `kb` namespace object (next to `list` / `get`):

```ts
    advisor: async (): Promise<ApiResponse<AdvisorResponse>> => {
      const response = await apiClient.get<ApiResponse<AdvisorResponse>>('/kb/advisor');
      return response.data;
    },
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "api-client|advisor" || echo "OK: no advisor type errors"`
Expected: `OK: no advisor type errors`.

- [ ] **Step 7: Commit**

```bash
git add src/types/advisor.ts src/types/advisor.test.ts src/lib/api-client.ts
git commit -m "feat(create): advisor contract types + api.kb.advisor()"
```

---

## Task 10: CoverageMeter component

**Repo:** `echome-frontend`

**Files:**
- Create: `src/components/create/CoverageMeter.tsx`
- Test: `src/components/create/CoverageMeter.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/create/CoverageMeter.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverageMeter } from './CoverageMeter';
import type { Coverage } from '@/types/advisor';

const coverage: Coverage = {
  work: { covered: true, strength: 1, sampleCount: 4 },
  industry: { covered: true, strength: 0.8, sampleCount: 4 },
  interests: { covered: false, strength: 0.1, sampleCount: 1 },
  personal: { covered: false, strength: 0, sampleCount: 0 },
  relationships: { covered: false, strength: 0, sampleCount: 0 },
  voice: { covered: true, strength: 0.9, sampleCount: 20 },
};

describe('CoverageMeter', () => {
  it('renders all six dimension labels', () => {
    render(<CoverageMeter coverage={coverage} />);
    for (const label of ['Work', 'Industry', 'Interests', 'Personal', 'Relationships', 'Voice']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the covered count', () => {
    render(<CoverageMeter coverage={coverage} />);
    expect(screen.getByText(/3 of 6/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- CoverageMeter`
Expected: FAIL — cannot find module `./CoverageMeter`.

- [ ] **Step 3: Write the component**

Create `src/components/create/CoverageMeter.tsx`:

```tsx
'use client';

import { Coverage, DIMENSION_KEYS, DIMENSION_LABELS } from '@/types/advisor';

interface CoverageMeterProps {
  coverage: Coverage;
}

export function CoverageMeter({ coverage }: CoverageMeterProps) {
  const coveredCount = DIMENSION_KEYS.filter((k) => coverage[k].covered).length;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">What Echo knows about you</span>
        <span className="text-sm text-muted-foreground">{coveredCount} of 6</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {DIMENSION_KEYS.map((key) => {
          const d = coverage[key];
          const pct = Math.round(Math.max(0, Math.min(1, d.strength)) * 100);
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-foreground">{DIMENSION_LABELS[key]}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className={d.covered ? 'h-full rounded-full bg-primary' : 'h-full rounded-full bg-primary/40'}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- CoverageMeter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/create/CoverageMeter.tsx src/components/create/CoverageMeter.test.tsx
git commit -m "feat(create): CoverageMeter six-dimension progress"
```

---

## Task 11: AdvisorNudgeCard component

**Repo:** `echome-frontend`

**Files:**
- Create: `src/components/create/AdvisorNudgeCard.tsx`
- Test: `src/components/create/AdvisorNudgeCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/create/AdvisorNudgeCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvisorNudgeCard } from './AdvisorNudgeCard';
import type { Nudge } from '@/types/advisor';

const nudge: Nudge = {
  headline: 'Teach Echo your voice.',
  subhead: 'The more you tell Echo, the more it makes.',
  actions: [
    { label: 'Talk for two minutes', type: 'voice' },
    { label: 'Add a video or link', type: 'ingest' },
  ],
};

describe('AdvisorNudgeCard', () => {
  it('renders headline, subhead and actions', () => {
    render(<AdvisorNudgeCard nudge={nudge} onAction={() => {}} />);
    expect(screen.getByText('Teach Echo your voice.')).toBeInTheDocument();
    expect(screen.getByText(/more it makes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Talk for two minutes' })).toBeInTheDocument();
  });

  it('calls onAction with the clicked action', async () => {
    const onAction = vi.fn();
    render(<AdvisorNudgeCard nudge={nudge} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Talk for two minutes' }));
    expect(onAction).toHaveBeenCalledWith(nudge.actions[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- AdvisorNudgeCard`
Expected: FAIL — cannot find module `./AdvisorNudgeCard`.

- [ ] **Step 3: Write the component**

Create `src/components/create/AdvisorNudgeCard.tsx`:

```tsx
'use client';

import { Mic, Paperclip, Sparkles } from 'lucide-react';
import { Nudge, NudgeAction, NudgeActionType } from '@/types/advisor';

interface AdvisorNudgeCardProps {
  nudge: Nudge;
  onAction: (action: NudgeAction) => void;
}

const ICONS: Record<NudgeActionType, typeof Mic> = {
  voice: Mic,
  ingest: Paperclip,
  create: Sparkles,
};

export function AdvisorNudgeCard({ nudge, onAction }: AdvisorNudgeCardProps) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <h2 className="text-lg font-semibold text-foreground">{nudge.headline}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{nudge.subhead}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {nudge.actions.map((action, i) => {
          const Icon = ICONS[action.type];
          const primary = i === 0;
          return (
            <button
              key={`${action.type}-${i}`}
              type="button"
              onClick={() => onAction(action)}
              className={
                primary
                  ? 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90'
                  : 'inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5'
              }
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- AdvisorNudgeCard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/create/AdvisorNudgeCard.tsx src/components/create/AdvisorNudgeCard.test.tsx
git commit -m "feat(create): AdvisorNudgeCard"
```

---

## Task 12: AutopilotProposalCard component

**Repo:** `echome-frontend`

**Files:**
- Create: `src/components/create/AutopilotProposalCard.tsx`
- Test: `src/components/create/AutopilotProposalCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/create/AutopilotProposalCard.test.tsx`:

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
  it('renders title and rationale', () => {
    render(<AutopilotProposalCard proposal={proposal} onSelect={() => {}} />);
    expect(screen.getByText('A LinkedIn post on hiring')).toBeInTheDocument();
    expect(screen.getByText(/team building/i)).toBeInTheDocument();
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

Run: `npm run test:unit -- AutopilotProposalCard`
Expected: FAIL — cannot find module `./AutopilotProposalCard`.

- [ ] **Step 3: Write the component**

Create `src/components/create/AutopilotProposalCard.tsx`:

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import { Proposal } from '@/types/advisor';

interface AutopilotProposalCardProps {
  proposal: Proposal;
  onSelect: (proposal: Proposal) => void;
}

export function AutopilotProposalCard({ proposal, onSelect }: AutopilotProposalCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(proposal)}
      className="flex w-full flex-col items-start gap-2 rounded-xl border border-border bg-white p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {proposal.kitType.replace(/_/g, ' ')}
      </span>
      <span className="text-sm font-semibold text-foreground">{proposal.title}</span>
      <span className="text-xs text-muted-foreground">{proposal.rationale}</span>
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- AutopilotProposalCard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/create/AutopilotProposalCard.tsx src/components/create/AutopilotProposalCard.test.tsx
git commit -m "feat(create): AutopilotProposalCard"
```

---

## Task 13: CapabilityTiles component

**Repo:** `echome-frontend`

**Files:**
- Create: `src/components/create/CapabilityTiles.tsx`
- Test: `src/components/create/CapabilityTiles.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/create/CapabilityTiles.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapabilityTiles, CAPABILITIES } from './CapabilityTiles';

describe('CapabilityTiles', () => {
  it('renders one tile per capability', () => {
    render(<CapabilityTiles onSelect={() => {}} />);
    for (const cap of CAPABILITIES) {
      expect(screen.getByRole('button', { name: new RegExp(cap.title, 'i') })).toBeInTheDocument();
    }
  });

  it('calls onSelect with the prefill text on click', async () => {
    const onSelect = vi.fn();
    render(<CapabilityTiles onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(CAPABILITIES[0].title, 'i') }));
    expect(onSelect).toHaveBeenCalledWith(CAPABILITIES[0].prefill);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- CapabilityTiles`
Expected: FAIL — cannot find module `./CapabilityTiles`.

- [ ] **Step 3: Write the component**

Create `src/components/create/CapabilityTiles.tsx`:

```tsx
'use client';

import { Clapperboard, Images, PenLine, Newspaper } from 'lucide-react';

interface Capability {
  title: string;
  blurb: string;
  prefill: string;
  icon: typeof Clapperboard;
}

export const CAPABILITIES: Capability[] = [
  { title: 'Clips', blurb: 'from a video', prefill: 'Make clips from this video: ', icon: Clapperboard },
  { title: 'Carousel', blurb: 'slides from a topic', prefill: 'Make a carousel about ', icon: Images },
  { title: 'Post', blurb: 'in your voice', prefill: 'Write a post about ', icon: PenLine },
  { title: 'Newsletter', blurb: 'long form', prefill: 'Draft a newsletter about ', icon: Newspaper },
];

interface CapabilityTilesProps {
  onSelect: (prefill: string) => void;
  heading?: string;
}

export function CapabilityTiles({ onSelect, heading = 'What Echo can do' }: CapabilityTilesProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{heading}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <button
              key={cap.title}
              type="button"
              onClick={() => onSelect(cap.prefill)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-white p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{cap.title}</span>
              <span className="text-xs text-muted-foreground">{cap.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- CapabilityTiles`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/create/CapabilityTiles.tsx src/components/create/CapabilityTiles.test.tsx
git commit -m "feat(create): CapabilityTiles (prefill composer)"
```

---

## Task 14: VideoLibraryDrop shell

**Repo:** `echome-frontend`

SP1 ships only the entry affordance + drop-tray UI shell. Per-item routing reasoning and the deferred-ingestion backend are SP2. The shell accepts files/links into local state and shows a tray; it does NOT call a backend in SP1.

**Files:**
- Create: `src/components/create/VideoLibraryDrop.tsx`
- Test: `src/components/create/VideoLibraryDrop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/create/VideoLibraryDrop.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoLibraryDrop } from './VideoLibraryDrop';

describe('VideoLibraryDrop', () => {
  it('renders the entry affordance with the KB-feed truth statement', () => {
    render(<VideoLibraryDrop />);
    expect(screen.getByText(/add videos or links/i)).toBeInTheDocument();
    expect(screen.getByText(/teach me your voice/i)).toBeInTheDocument();
  });

  it('adds a pasted link to the tray', async () => {
    render(<VideoLibraryDrop />);
    const input = screen.getByPlaceholderText(/paste a youtube or zoom link/i);
    await userEvent.type(input, 'https://youtu.be/abc123');
    await userEvent.click(screen.getByRole('button', { name: /add to library/i }));
    expect(screen.getByText('https://youtu.be/abc123')).toBeInTheDocument();
    expect(screen.getByText(/stockpile/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- VideoLibraryDrop`
Expected: FAIL — cannot find module `./VideoLibraryDrop`.

- [ ] **Step 3: Write the shell component**

Create `src/components/create/VideoLibraryDrop.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Library, Plus } from 'lucide-react';

// SP1 routing labels. SP2 makes these per-item agentic suggestions backed by the
// deferred-ingestion backend. Default route is Stockpile (library), not clip-now.
type Route = 'clip_now' | 'library' | 'context_only';

const ROUTE_LABEL: Record<Route, string> = {
  clip_now: 'Clip now',
  library: 'Stockpile',
  context_only: 'Context only',
};

interface TrayItem {
  id: string;
  label: string;
  route: Route;
}

export function VideoLibraryDrop() {
  const [link, setLink] = useState('');
  const [items, setItems] = useState<TrayItem[]>([]);

  const addLink = () => {
    const trimmed = link.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, { id: `${prev.length}-${trimmed}`, label: trimmed, route: 'library' }]);
    setLink('');
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Library className="h-4 w-4 text-primary" />
        Add videos or links to your library
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Adding these to your knowledge. They will teach me your voice and what you talk about.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addLink();
          }}
          placeholder="Paste a YouTube or Zoom link"
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
        />
        <button
          type="button"
          onClick={addLink}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add to library
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-primary/5 px-3 py-2"
            >
              <span className="truncate text-xs text-foreground">{item.label}</span>
              <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {ROUTE_LABEL[item.route]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- VideoLibraryDrop`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/create/VideoLibraryDrop.tsx src/components/create/VideoLibraryDrop.test.tsx
git commit -m "feat(create): VideoLibraryDrop entry + tray shell (SP1)"
```

---

## Task 15: AdaptiveCreateSurface (state selection + layout) and wire into AppContent

**Repo:** `echome-frontend`

**Files:**
- Create: `src/components/create/AdaptiveCreateSurface.tsx`
- Modify: `src/app/app/AppContent.tsx`
- Test: `src/components/create/AdaptiveCreateSurface.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/create/AdaptiveCreateSurface.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdaptiveCreateSurface } from './AdaptiveCreateSurface';
import type { AdvisorResponse } from '@/types/advisor';

const advisorMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: { kb: { advisor: () => advisorMock() } },
}));

const RICH: AdvisorResponse = {
  state: 'rich',
  coverage: {
    work: { covered: true, strength: 1, sampleCount: 4 },
    industry: { covered: true, strength: 1, sampleCount: 5 },
    interests: { covered: true, strength: 0.6, sampleCount: 5 },
    personal: { covered: true, strength: 1, sampleCount: 4 },
    relationships: { covered: false, strength: 0, sampleCount: 0 },
    voice: { covered: true, strength: 1, sampleCount: 20 },
  },
  nudge: { headline: 'Echo can build from what you shared.', subhead: 'Pick a draft.', actions: [{ label: 'Make something now', type: 'create' }] },
  proposals: [{ id: 'p1', title: 'A post on hiring', rationale: 'You talk about teams.', kitType: 'social_post', sourceRefs: [] }],
};

const EMPTY: AdvisorResponse = {
  state: 'empty',
  coverage: {
    work: { covered: false, strength: 0, sampleCount: 0 },
    industry: { covered: false, strength: 0, sampleCount: 0 },
    interests: { covered: false, strength: 0, sampleCount: 0 },
    personal: { covered: false, strength: 0, sampleCount: 0 },
    relationships: { covered: false, strength: 0, sampleCount: 0 },
    voice: { covered: false, strength: 0, sampleCount: 0 },
  },
  nudge: { headline: 'Teach Echo your voice.', subhead: 'Talk for two minutes.', actions: [{ label: 'Talk for two minutes', type: 'voice' }] },
  proposals: [],
};

describe('AdaptiveCreateSurface', () => {
  beforeEach(() => advisorMock.mockReset());

  it('renders proposals in the rich state', async () => {
    advisorMock.mockResolvedValue({ success: true, data: RICH });
    render(<AdaptiveCreateSurface onPrefill={() => {}} onStartVoice={() => {}} onOpenIngest={() => {}} />);
    await waitFor(() => expect(screen.getByText('A post on hiring')).toBeInTheDocument());
  });

  it('renders the voice-first nudge in the empty state', async () => {
    advisorMock.mockResolvedValue({ success: true, data: EMPTY });
    render(<AdaptiveCreateSurface onPrefill={() => {}} onStartVoice={() => {}} onOpenIngest={() => {}} />);
    await waitFor(() => expect(screen.getByText('Teach Echo your voice.')).toBeInTheDocument());
  });

  it('falls back to a usable layout when the advisor request fails', async () => {
    advisorMock.mockRejectedValue(new Error('network'));
    render(<AdaptiveCreateSurface onPrefill={() => {}} onStartVoice={() => {}} onOpenIngest={() => {}} />);
    await waitFor(() => expect(screen.getByText(/What Echo can do/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- AdaptiveCreateSurface`
Expected: FAIL — cannot find module `./AdaptiveCreateSurface`.

- [ ] **Step 3: Write the component**

Create `src/components/create/AdaptiveCreateSurface.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AdvisorResponse, NudgeAction, Proposal } from '@/types/advisor';
import { CoverageMeter } from './CoverageMeter';
import { AdvisorNudgeCard } from './AdvisorNudgeCard';
import { AutopilotProposalCard } from './AutopilotProposalCard';
import { CapabilityTiles } from './CapabilityTiles';
import { VideoLibraryDrop } from './VideoLibraryDrop';

interface AdaptiveCreateSurfaceProps {
  // Prefill the composer with text (capability tile, create action, or proposal).
  onPrefill: (text: string) => void;
  // Start voice capture (voice action / empty-state primary CTA).
  onStartVoice: () => void;
  // Open the ingest flow (ingest action).
  onOpenIngest: () => void;
}

export function AdaptiveCreateSurface({ onPrefill, onStartVoice, onOpenIngest }: AdaptiveCreateSurfaceProps) {
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api.kb
      .advisor()
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setAdvisor(res.data);
        else setFailed(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAction = (action: NudgeAction) => {
    if (action.type === 'voice') return onStartVoice();
    if (action.type === 'ingest') return onOpenIngest();
    const prefill = typeof action.payload?.prefill === 'string' ? action.payload.prefill : '';
    onPrefill(prefill);
  };

  const handleProposal = (proposal: Proposal) => {
    onPrefill(proposal.title);
  };

  // Fallback: advisor unavailable. Render a usable thin-equivalent layout.
  if (failed) {
    return (
      <div className="space-y-4">
        <CapabilityTiles onSelect={onPrefill} />
        <VideoLibraryDrop />
      </div>
    );
  }

  // Loading skeleton (advisor in flight). Keep it quiet and low-UI.
  if (!advisor) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-primary/5" />
        <div className="h-16 animate-pulse rounded-xl bg-primary/5" />
      </div>
    );
  }

  const { state, coverage, nudge, proposals } = advisor;

  return (
    <div className="space-y-5">
      <AdvisorNudgeCard nudge={nudge} onAction={handleAction} />

      {state === 'rich' && proposals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <AutopilotProposalCard key={p.id} proposal={p} onSelect={handleProposal} />
          ))}
        </div>
      )}

      <CoverageMeter coverage={coverage} />
      <CapabilityTiles onSelect={onPrefill} heading={state === 'empty' ? "What you'll be able to make" : 'What Echo can do'} />
      <VideoLibraryDrop />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- AdaptiveCreateSurface`
Expected: PASS (all three cases: rich proposals, empty nudge, failure fallback).

- [ ] **Step 5: Wire into AppContent**

Open `src/app/app/AppContent.tsx`. Add the import near the other component imports:

```tsx
import { AdaptiveCreateSurface } from '@/components/create/AdaptiveCreateSurface';
```

Inside the main render, mount `AdaptiveCreateSurface` directly above the existing capability/drafts region (above `DraftedForYou`). Wire its callbacks to the page's existing composer/voice/ingest handlers. Find the existing composer state setter (the function that sets the "What are we making?" input value) and the existing voice-capture trigger, and pass them through:

```tsx
<AdaptiveCreateSurface
  onPrefill={(text) => {
    // Reuse the existing composer setter. If the composer value state is named
    // differently, substitute it here (search AppContent for the input bound to
    // the "What are we making?" field).
    setComposerValue(text);
  }}
  onStartVoice={() => {
    // Reuse the existing voice-capture trigger used by EchoHero / useEchoMic.
    startVoiceCapture();
  }}
  onOpenIngest={() => {
    // Reuse the existing attach/ingest trigger.
    openIngest();
  }}
/>
```

Note for the implementer: `setComposerValue`, `startVoiceCapture`, and `openIngest` are placeholders for the ACTUAL handlers already present in `AppContent.tsx`. Read the file, identify the real composer value setter and the existing voice/attach handlers (EchoHero uses `useEchoMic`), and wire to those. Do not add new global state — reuse what exists. If a voice/ingest trigger is not hoisted to `AppContent`, the minimal acceptable wiring is `onStartVoice`/`onOpenIngest` focusing the composer; leave a `// TODO(SP1): hoist voice trigger` only if truly unavailable.

- [ ] **Step 6: Typecheck + full FE unit suite**

Run: `npx tsc --noEmit && npm run test:unit -- create/`
Expected: no type errors; all `src/components/create` suites green.

- [ ] **Step 7: Build check**

Run: `npm run build`
Expected: Next build succeeds (the new client components compile; no server/client boundary errors).

- [ ] **Step 8: Commit**

```bash
git add src/components/create/AdaptiveCreateSurface.tsx src/components/create/AdaptiveCreateSurface.test.tsx src/app/app/AppContent.tsx
git commit -m "feat(create): AdaptiveCreateSurface wired into /app"
```

---

## Final verification (both repos)

- [ ] **Backend:** `cd "/Users/aramammo/Side Quests/echome-platform-v2" && npm run test:unit -- kb-advisor && npm run test:integration -- kb-advisor-route && npx tsc --noEmit -p tsconfig.test.json` — all green.
- [ ] **Frontend:** `cd "/Users/aramammo/Side Quests/echome-frontend" && npm run test:unit -- create/ && npx tsc --noEmit && npm run build` — all green.
- [ ] **Staging smoke (per release policy):** deploy backend to staging (Railway, via develop), open the Vercel preview wired to staging, sign in as `ara.mamourian@tryechome.com`, and confirm:
  - `GET /api/kb/advisor` returns 200 with a valid contract.
  - The page renders the correct state for that account's coverage.
  - First load shows deterministic copy (cold cache); a reload shows model-generated copy (cache warmed). If the model copy never appears, check `ANTHROPIC_API_KEY` is set on staging and inspect logs for `kb-advisor: cache warm failed`.
- [ ] Do NOT push to `main`. Founder soak decides main.

---

## Notes for the implementer

- **Tier-1 coverage is approximate by design.** Relationships is always 0 and Interests caps at 0.6 until the SP2 per-ingest classifier. Do not "fix" this.
- **Never make the model call synchronous.** `getAdvisor` must return without awaiting `generateNudge`. The background warm is fire-and-forget.
- **Read-only.** The advisor touches no sensitive paths (auth, stripe, middleware, email, webhooks) and writes nothing.
- **No em dashes** in any user-facing copy (the platform strips them as an AI tell). The nudge test enforces this for deterministic copy; the model prompt forbids them too.
- **Token names** (`text-primary`, `bg-primary/10`, `border-primary/30`, `border-border`, `text-muted-foreground`, `text-foreground`) follow the existing dashboard components. If `text-muted-foreground`/`text-foreground` are not defined in this project's tokens, substitute the project's existing equivalents (check `DraftedForYou.tsx` and `globals.css`).
