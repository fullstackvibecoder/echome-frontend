# Deploy-vs-Outage Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the OutageBanner show a calm "EchoMe is updating" during a Railway deploy and the existing "Service disruption" only during a genuine outage, by reading Railway's live deployment state from a Vercel-side route.

**Architecture:** A Node-runtime Vercel route (`/api/backend-status`) queries Railway's GraphQL API for the backend service's latest deployment status and returns `deploying | up | unknown`. The `useBackendHealth` hook keeps polling `/health`; when it's down it asks `/api/backend-status` why, and maps the answer to `ok | updating | outage` via a pure reducer. Every uncertain path resolves to `outage`, so a real outage can never render the calm message.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vercel; Railway GraphQL API; Vitest (new, node env) for unit tests; Playwright (existing) for one e2e.

**Spec:** `docs/superpowers/specs/2026-06-02-deploy-vs-outage-banner-design.md`

**Branch:** `feat/deploy-vs-outage-banner` (already created)

---

## File Structure

- **Create** `src/lib/railway-deploy-status.ts` — pure status→state mapping, the GraphQL query, env-config reader, and the thin network fetch. Single responsibility: "what is Railway's deployment state."
- **Create** `src/lib/backend-health-state.ts` — pure reducer mapping (healthOk, failures, deployState) → `ok|updating|outage`. Single responsibility: "what should the banner say."
- **Create** `src/app/api/backend-status/route.ts` — Vercel route handler; wraps the network fetch with a 10s cache.
- **Modify** `src/hooks/useBackendHealth.ts` — return `{ status }` instead of `{ isDown }`; fetch `/api/backend-status` when down.
- **Modify** `src/components/outage-banner.tsx` — two visual variants.
- **Modify** `src/app/auth/login/LoginContent.tsx` — inline notice consumes `status`.
- **Create** `vitest.config.ts`, `vitest.setup.ts` (minimal), unit test files.
- **Create** `e2e/outage-banner.spec.ts` — Playwright variant assertions.

**Testing note (deliberate, not a shortcut):** Vitest runs in **node** environment over the *extracted pure logic* (`mapDeploymentStatusToState`, `computeBackendStatus`) and the route handler. We do **not** add jsdom / @testing-library/react — the React hook+banner *rendering* is covered by the Playwright e2e, which exercises the real component tree. This keeps the new dev-dependency surface to just `vitest`.

---

## Task 0: Prerequisites (USER — Ara provides; blocks Task 5 verification + preview)

**This task needs you. Flag and pause here for these values/actions.**

- [ ] **Step 1: Create a Railway read-only API token**

In the Railway dashboard → Account Settings → Tokens (or a project token), create a token. Treat it as a secret. (No code can create this; it must be done by you.)

- [ ] **Step 2: Get the backend service / environment / project IDs**

Run in the `echome-platform-v2` (backend) repo if it's `railway link`-ed:

```bash
railway status --json
```

Expected: JSON containing `projectId`, and the service + environment IDs for production. If the CLI isn't linked, copy them from the service's Railway dashboard URL (`railway.app/project/<projectId>/service/<serviceId>?environmentId=<environmentId>`).

- [ ] **Step 3: Set local env vars for development/testing**

Add to `echome-frontend/.env.local` (gitignored — confirm it is):

```
RAILWAY_API_TOKEN=<token>
RAILWAY_PROJECT_ID=<projectId>
RAILWAY_SERVICE_ID=<serviceId>
RAILWAY_ENVIRONMENT_ID=<environmentId>
```

- [ ] **Step 4: Set the same four vars in Vercel (Production + Preview)**

```bash
cd echome-frontend
for v in RAILWAY_API_TOKEN RAILWAY_PROJECT_ID RAILWAY_SERVICE_ID RAILWAY_ENVIRONMENT_ID; do echo "set $v"; done
# Use: vercel env add <NAME> production   and   vercel env add <NAME> preview
```

None are `NEXT_PUBLIC_` — they must stay server-only.

---

## Task 1: Add the Vitest harness

**Files:**
- Modify: `package.json` (devDeps + `test:unit` script)
- Create: `vitest.config.ts`
- Create: `src/lib/__smoke__.test.ts` (temporary smoke test, deleted in Step 5)

- [ ] **Step 1: Install Vitest**

Run:
```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
npm install -D vitest@^3
```
Expected: installs without peer-dep errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block add:
```json
    "test:unit": "vitest run",
    "test:unit:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test to prove the harness runs**

Create `src/lib/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it, confirm pass, then delete the smoke test**

Run:
```bash
npm run test:unit
```
Expected: 1 passing test. Then:
```bash
rm src/lib/__smoke__.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest (node env) harness for unit tests"
```

---

## Task 2: Pure helper — `mapDeploymentStatusToState`

**Files:**
- Create: `src/lib/railway-deploy-status.ts`
- Test: `src/lib/railway-deploy-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/railway-deploy-status.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapDeploymentStatusToState } from './railway-deploy-status';

describe('mapDeploymentStatusToState', () => {
  it('maps in-progress statuses to deploying', () => {
    for (const s of ['BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED', 'WAITING', 'NEEDS_APPROVAL']) {
      expect(mapDeploymentStatusToState(s)).toBe('deploying');
    }
  });
  it('maps healthy statuses to up', () => {
    expect(mapDeploymentStatusToState('SUCCESS')).toBe('up');
    expect(mapDeploymentStatusToState('SLEEPING')).toBe('up');
  });
  it('maps failures and anything else to unknown', () => {
    for (const s of ['FAILED', 'CRASHED', 'REMOVED', 'SOMETHING_NEW']) {
      expect(mapDeploymentStatusToState(s)).toBe('unknown');
    }
  });
  it('treats null/undefined/empty as unknown', () => {
    expect(mapDeploymentStatusToState(null)).toBe('unknown');
    expect(mapDeploymentStatusToState(undefined)).toBe('unknown');
    expect(mapDeploymentStatusToState('')).toBe('unknown');
  });
  it('is case-insensitive', () => {
    expect(mapDeploymentStatusToState('building')).toBe('deploying');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:unit -- railway-deploy-status`
Expected: FAIL — cannot find module / `mapDeploymentStatusToState` is not a function.

- [ ] **Step 3: Implement the mapping**

Create `src/lib/railway-deploy-status.ts`:
```ts
export type DeployState = 'deploying' | 'up' | 'unknown';

// Railway deployment.status values. The DEPLOYING/UP membership is verified
// against the live API in Task 4, Step 5 — adjust the sets there if reality differs.
const DEPLOYING_STATUSES = new Set([
  'BUILDING', 'DEPLOYING', 'INITIALIZING', 'QUEUED', 'WAITING', 'NEEDS_APPROVAL',
]);
const UP_STATUSES = new Set(['SUCCESS', 'SLEEPING']);

export function mapDeploymentStatusToState(status: string | null | undefined): DeployState {
  if (!status) return 'unknown';
  const s = status.toUpperCase();
  if (DEPLOYING_STATUSES.has(s)) return 'deploying';
  if (UP_STATUSES.has(s)) return 'up';
  return 'unknown';
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm run test:unit -- railway-deploy-status`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/railway-deploy-status.ts src/lib/railway-deploy-status.test.ts
git commit -m "feat(banner): map Railway deployment status to deploy state"
```

---

## Task 3: Pure reducer — `computeBackendStatus`

**Files:**
- Create: `src/lib/backend-health-state.ts`
- Test: `src/lib/backend-health-state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/backend-health-state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeBackendStatus, DOWN_THRESHOLD } from './backend-health-state';

describe('computeBackendStatus', () => {
  it('is ok when health is fine', () => {
    expect(computeBackendStatus({ healthOk: true, consecutiveFailures: 0, deployState: 'up' })).toBe('ok');
    expect(computeBackendStatus({ healthOk: true, consecutiveFailures: 9, deployState: 'unknown' })).toBe('ok');
  });
  it('is ok while failures are below the threshold (single flake)', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: 1, deployState: 'unknown' })).toBe('ok');
  });
  it('renders nothing (ok) while the deploy-state probe is in flight', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'pending' })).toBe('ok');
  });
  it('is updating when down and a deploy is in progress', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'deploying' })).toBe('updating');
  });
  it('is outage when down and deploy-state is up or unknown', () => {
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'up' })).toBe('outage');
    expect(computeBackendStatus({ healthOk: false, consecutiveFailures: DOWN_THRESHOLD, deployState: 'unknown' })).toBe('outage');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:unit -- backend-health-state`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement the reducer**

Create `src/lib/backend-health-state.ts`:
```ts
import type { DeployState } from './railway-deploy-status';

export type BackendStatus = 'ok' | 'updating' | 'outage';

/** Consecutive failed /health checks before we treat the backend as down. */
export const DOWN_THRESHOLD = 2;

export interface HealthInputs {
  healthOk: boolean;
  consecutiveFailures: number;
  /** 'pending' = down and the deploy-state probe hasn't resolved yet. */
  deployState: DeployState | 'pending';
}

export function computeBackendStatus({ healthOk, consecutiveFailures, deployState }: HealthInputs): BackendStatus {
  if (healthOk) return 'ok';
  if (consecutiveFailures < DOWN_THRESHOLD) return 'ok';
  if (deployState === 'pending') return 'ok'; // in flight — render nothing until we know
  if (deployState === 'deploying') return 'updating';
  return 'outage'; // 'up' | 'unknown' — the conservative default
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm run test:unit -- backend-health-state`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/backend-health-state.ts src/lib/backend-health-state.test.ts
git commit -m "feat(banner): pure reducer mapping health signals to banner status"
```

---

## Task 4: Railway config reader + network fetch

**Files:**
- Modify: `src/lib/railway-deploy-status.ts` (append config reader + fetch)
- Test: `src/lib/railway-deploy-status.test.ts` (append)

- [ ] **Step 1: Write the failing tests (append)**

Append to `src/lib/railway-deploy-status.test.ts`:
```ts
import { readRailwayConfig, fetchLatestDeploymentState } from './railway-deploy-status';

describe('readRailwayConfig', () => {
  const full = {
    RAILWAY_API_TOKEN: 't', RAILWAY_PROJECT_ID: 'p',
    RAILWAY_SERVICE_ID: 's', RAILWAY_ENVIRONMENT_ID: 'e',
  };
  it('returns config when all vars present', () => {
    expect(readRailwayConfig(full)).toEqual({ token: 't', projectId: 'p', serviceId: 's', environmentId: 'e' });
  });
  it('returns null if any var missing', () => {
    expect(readRailwayConfig({ ...full, RAILWAY_API_TOKEN: undefined })).toBeNull();
    expect(readRailwayConfig({})).toBeNull();
  });
});

describe('fetchLatestDeploymentState', () => {
  const cfg = { token: 't', projectId: 'p', serviceId: 's', environmentId: 'e' };
  it('returns the mapped state from the latest deployment', async () => {
    const fakeFetch = (async () => ({
      ok: true,
      json: async () => ({ data: { deployments: { edges: [{ node: { status: 'DEPLOYING' } }] } } }),
    })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('deploying');
  });
  it('returns unknown on non-ok response', async () => {
    const fakeFetch = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('unknown');
  });
  it('returns unknown when the fetch throws (network/abort)', async () => {
    const fakeFetch = (async () => { throw new Error('boom'); }) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('unknown');
  });
  it('returns unknown when there are no deployments', async () => {
    const fakeFetch = (async () => ({ ok: true, json: async () => ({ data: { deployments: { edges: [] } } }) })) as unknown as typeof fetch;
    expect(await fetchLatestDeploymentState(cfg, fakeFetch)).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm run test:unit -- railway-deploy-status`
Expected: FAIL — `readRailwayConfig` / `fetchLatestDeploymentState` not exported.

- [ ] **Step 3: Implement config reader + fetch (append to `railway-deploy-status.ts`)**

```ts
export interface RailwayConfig {
  token: string;
  projectId: string;
  serviceId: string;
  environmentId: string;
}

export function readRailwayConfig(env: Record<string, string | undefined> = process.env): RailwayConfig | null {
  const token = env.RAILWAY_API_TOKEN;
  const projectId = env.RAILWAY_PROJECT_ID;
  const serviceId = env.RAILWAY_SERVICE_ID;
  const environmentId = env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !projectId || !serviceId || !environmentId) return null;
  return { token, projectId, serviceId, environmentId };
}

const LATEST_DEPLOYMENT_QUERY = `
  query LatestDeployment($input: DeploymentListInput!) {
    deployments(first: 1, input: $input) {
      edges { node { id status createdAt } }
    }
  }
`;

export async function fetchLatestDeploymentState(
  cfg: RailwayConfig,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 3000,
): Promise<DeployState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({
        query: LATEST_DEPLOYMENT_QUERY,
        variables: { input: { projectId: cfg.projectId, environmentId: cfg.environmentId, serviceId: cfg.serviceId } },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return 'unknown';
    const json = await res.json();
    const status = json?.data?.deployments?.edges?.[0]?.node?.status;
    return mapDeploymentStatusToState(status);
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm run test:unit -- railway-deploy-status`
Expected: PASS (all old + new cases).

- [ ] **Step 5: Verify the query + status enum against the LIVE Railway API**

Requires Task 0 env vars in `.env.local`. Run this one-off probe (delete after):
```bash
node --env-file=.env.local -e '
const q = `query L($input: DeploymentListInput!){deployments(first:1,input:$input){edges{node{id status createdAt}}}}`;
fetch("https://backboard.railway.app/graphql/v2",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RAILWAY_API_TOKEN}`},body:JSON.stringify({query:q,variables:{input:{projectId:process.env.RAILWAY_PROJECT_ID,environmentId:process.env.RAILWAY_ENVIRONMENT_ID,serviceId:process.env.RAILWAY_SERVICE_ID}}})}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j,null,2)));
'
```
Expected: a JSON payload with `data.deployments.edges[0].node.status` set to a real value (e.g. `SUCCESS`). **If the query errors** (e.g. `DeploymentListInput` requires different fields, or `deployments` is named differently): adjust `LATEST_DEPLOYMENT_QUERY` and the `input` variables to match the error/schema, and re-run until it returns a status. **If the returned status string is not in the DEPLOYING/UP sets** as expected, update `DEPLOYING_STATUSES` / `UP_STATUSES` in `railway-deploy-status.ts` and the Task 2 test accordingly. Re-run `npm run test:unit`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/railway-deploy-status.ts src/lib/railway-deploy-status.test.ts
git commit -m "feat(banner): fetch latest Railway deployment state (verified vs live API)"
```

---

## Task 5: Vercel route handler `/api/backend-status`

**Files:**
- Create: `src/app/api/backend-status/route.ts`
- Test: `src/app/api/backend-status/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/backend-status/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/railway-deploy-status', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/railway-deploy-status')>();
  return {
    ...actual,
    readRailwayConfig: vi.fn(),
    fetchLatestDeploymentState: vi.fn(),
  };
});

import { GET } from './route';
import { readRailwayConfig, fetchLatestDeploymentState } from '@/lib/railway-deploy-status';

describe('GET /api/backend-status', () => {
  beforeEach(() => {
    vi.mocked(readRailwayConfig).mockReset();
    vi.mocked(fetchLatestDeploymentState).mockReset();
  });

  it('returns unknown when config is missing', async () => {
    vi.mocked(readRailwayConfig).mockReturnValue(null);
    const res = await GET();
    expect(await res.json()).toEqual({ state: 'unknown' });
    expect(fetchLatestDeploymentState).not.toHaveBeenCalled();
  });

  it('returns the fetched deploy state when config is present', async () => {
    vi.mocked(readRailwayConfig).mockReturnValue({ token: 't', projectId: 'p', serviceId: 's', environmentId: 'e' });
    vi.mocked(fetchLatestDeploymentState).mockResolvedValue('deploying');
    const res = await GET();
    expect(await res.json()).toEqual({ state: 'deploying' });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:unit -- backend-status`
Expected: FAIL — cannot find `./route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/backend-status/route.ts`:
```ts
import { NextResponse } from 'next/server';
import {
  fetchLatestDeploymentState,
  readRailwayConfig,
  type DeployState,
} from '@/lib/railway-deploy-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10_000;
let cache: { state: DeployState; at: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ state: cache.state });
  }
  const cfg = readRailwayConfig();
  if (!cfg) {
    // No credentials → we cannot know; caller treats unknown as outage. Do not cache.
    return NextResponse.json({ state: 'unknown' as DeployState });
  }
  const state = await fetchLatestDeploymentState(cfg);
  cache = { state, at: now };
  return NextResponse.json({ state });
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm run test:unit -- backend-status`
Expected: PASS.

> Note: the in-memory `cache` is module-scoped and best-effort across Vercel instances — acceptable; it only debounces Railway API calls. The config-missing path is intentionally uncached so it self-heals the instant env vars are added.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/backend-status/route.ts src/app/api/backend-status/route.test.ts
git commit -m "feat(banner): /api/backend-status route reading Railway deploy state"
```

---

## Task 6: Rewire `useBackendHealth` to return `{ status }`

**Files:**
- Modify: `src/hooks/useBackendHealth.ts` (full rewrite of the hook body)

- [ ] **Step 1: Replace the hook implementation**

Replace the entire contents of `src/hooks/useBackendHealth.ts` with:
```ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { computeBackendStatus, DOWN_THRESHOLD, type BackendStatus } from '@/lib/backend-health-state';
import type { DeployState } from '@/lib/railway-deploy-status';

/**
 * Polls the backend `/health` endpoint. When it goes down (>= DOWN_THRESHOLD
 * consecutive failures), asks the Vercel-side `/api/backend-status` route whether
 * Railway is mid-deploy, then maps the combined signal to a banner status.
 *
 *   ok       — backend reachable
 *   updating — backend down AND a deploy is in progress
 *   outage   — backend down AND not a deploy (or we couldn't tell — safe default)
 *
 * `/health` poll is unchanged from the prior version: fires on mount and every 30s,
 * 8s timeout, show-after-two-failures, clear-on-first-success. See
 * backend-health-state.ts for the pure mapping and its tests.
 */
export function useBackendHealth(): { status: BackendStatus } {
  const [status, setStatus] = useState<BackendStatus>('ok');
  const failuresRef = useRef(0);
  const deployStateRef = useRef<DeployState | 'pending'>('up');

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
    const healthUrl = `${apiBase}/health`;
    let cancelled = false;

    function recompute() {
      if (cancelled) return;
      setStatus(
        computeBackendStatus({
          healthOk: false,
          consecutiveFailures: failuresRef.current,
          deployState: deployStateRef.current,
        }),
      );
    }

    async function fetchDeployState(): Promise<DeployState> {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/backend-status', { cache: 'no-store', signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) return 'unknown';
        const json = await res.json();
        return json?.state === 'deploying' || json?.state === 'up' ? json.state : 'unknown';
      } catch {
        return 'unknown';
      }
    }

    async function check() {
      let ok = false;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(healthUrl, { method: 'GET', cache: 'no-store', signal: controller.signal });
        clearTimeout(t);
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (cancelled) return;

      if (ok) {
        failuresRef.current = 0;
        deployStateRef.current = 'up';
        setStatus('ok');
        return;
      }

      failuresRef.current += 1;
      if (failuresRef.current < DOWN_THRESHOLD) return; // single flake — stay silent

      // Down. Probe why; show nothing while pending, then resolve to updating/outage.
      deployStateRef.current = 'pending';
      recompute();
      const state = await fetchDeployState();
      if (cancelled) return;
      deployStateRef.current = state;
      recompute();
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { status };
}
```

- [ ] **Step 2: Type-check (consumers still reference `isDown` — expected to break next two tasks)**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `outage-banner.tsx` and `LoginContent.tsx` (`isDown` no longer exists). No errors inside `useBackendHealth.ts` itself. (Tasks 7 and 8 fix the consumers.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBackendHealth.ts
git commit -m "feat(banner): useBackendHealth returns ok|updating|outage status"
```

---

## Task 7: Two-variant `OutageBanner`

**Files:**
- Modify: `src/components/outage-banner.tsx` (full rewrite)

- [ ] **Step 1: Replace the component**

Replace the entire contents of `src/components/outage-banner.tsx` with:
```tsx
'use client';

import { useBackendHealth } from '@/hooks/useBackendHealth';

/**
 * Sticky page-top banner. Two variants:
 *   - updating: calm slate notice during a Railway deploy (no status link)
 *   - outage:   amber service-disruption notice + Railway status link
 * Auto-hides when /health recovers. Deploy-vs-outage is decided by
 * useBackendHealth via the /api/backend-status route. Originally added
 * 2026-05-19 during a Railway Edge Network outage.
 */
export function OutageBanner() {
  const { status } = useBackendHealth();
  if (status === 'ok') return null;

  if (status === 'updating') {
    return (
      <div
        role="status"
        className="sticky top-0 z-[100] w-full bg-slate-700 text-white px-4 py-2.5 text-sm font-medium text-center shadow-sm"
      >
        EchoMe is updating — the app will be back in a moment.
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] w-full bg-amber-500 text-black px-4 py-2.5 text-sm font-medium text-center shadow-sm"
    >
      Our hosting provider is having a service disruption — generation, scheduling, and sign-in are temporarily unavailable. We&apos;re monitoring and the app will recover automatically once they&apos;re back.{' '}
      <a
        href="https://status.railway.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        Status →
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors now ONLY in `LoginContent.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/outage-banner.tsx
git commit -m "feat(banner): updating vs disruption visual variants"
```

---

## Task 8: Login inline notice consumes `status`

**Files:**
- Modify: `src/app/auth/login/LoginContent.tsx:14` and the notice block at `:33-56`

- [ ] **Step 1: Update the hook destructure**

Change line 14 from:
```tsx
  const { isDown } = useBackendHealth();
```
to:
```tsx
  const { status: backendStatus } = useBackendHealth();
```

- [ ] **Step 2: Replace the notice block**

Replace the block currently at lines 33–56 (the comment + `{isDown && ( ... )}`) with:
```tsx
      {/* Backend-down notice — calm "updating" during a deploy, amber disruption
          during a real outage. Decided by useBackendHealth + /api/backend-status.
          Auto-hides when the backend recovers. */}
      {backendStatus === 'updating' && (
        <div
          role="status"
          className="mb-6 p-4 bg-slate-500/10 border border-slate-500/30 rounded-lg text-sm"
        >
          <p className="font-medium text-foreground mb-1">EchoMe is updating</p>
          <p className="text-muted-foreground">Sign-in will be back in a moment.</p>
        </div>
      )}
      {backendStatus === 'outage' && (
        <div
          role="alert"
          className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm"
        >
          <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
            Sign-in is temporarily down
          </p>
          <p className="text-muted-foreground">
            Our hosting provider is having a service disruption. This page will recover automatically once they&apos;re back.{' '}
            <a
              href="https://status.railway.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Status
            </a>
          </p>
        </div>
      )}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/login/LoginContent.tsx
git commit -m "feat(banner): login notice shows updating vs disruption"
```

---

## Task 9: Playwright e2e for banner variants

**Files:**
- Create: `e2e/outage-banner.spec.ts`

- [ ] **Step 1: Write the e2e test**

Create `e2e/outage-banner.spec.ts`. It intercepts both endpoints so it never needs a real backend. Adjust the `**/health` glob if `NEXT_PUBLIC_API_URL` differs in the e2e env.
```ts
import { test, expect } from '@playwright/test';

// Force /health to fail so the banner logic engages, and control the deploy probe.
async function stubHealth(page: import('@playwright/test').Page) {
  await page.route('**/health', (route) => route.abort());
}

test('shows the calm Updating banner when a deploy is in progress', async ({ page }) => {
  await stubHealth(page);
  await page.route('**/api/backend-status', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'deploying' }) }),
  );
  await page.goto('/auth/login');
  await expect(page.getByText('EchoMe is updating — the app will be back in a moment.')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('service disruption')).toHaveCount(0);
});

test('shows the Service disruption banner during a real outage', async ({ page }) => {
  await stubHealth(page);
  await page.route('**/api/backend-status', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'unknown' }) }),
  );
  await page.goto('/auth/login');
  await expect(page.getByText(/service disruption/i)).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('EchoMe is updating', { exact: false })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e -- outage-banner`
Expected: 2 passing. (The 90s timeout covers the two-failures-at-30s window. If the runner can't reach a dev server, start `npm run dev` per the repo's Playwright config.)

- [ ] **Step 3: Commit**

```bash
git add e2e/outage-banner.spec.ts
git commit -m "test(e2e): banner shows updating vs disruption per backend-status"
```

---

## Task 10: Preview verification (USER-assisted) before promoting

- [ ] **Step 1: Push the branch and open a Vercel preview**

```bash
git push -u origin feat/deploy-vs-outage-banner
```
Confirm the four `RAILWAY_*` env vars from Task 0 Step 4 are set for the **Preview** environment, then open the preview URL Vercel generates.

- [ ] **Step 2: Confirm "Updating" during a real deploy**

Trigger a backend deploy (push a trivial commit to `echome-platform-v2` main, or redeploy from Railway). Within ~1 min on the preview, confirm the **slate "EchoMe is updating"** banner appears — NOT the amber one — and that it clears when the backend is healthy again.

- [ ] **Step 3: Confirm "Service disruption" fallback**

Temporarily unset `RAILWAY_API_TOKEN` in the Vercel **Preview** env and redeploy the preview; with the backend down (or `/health` blocked), confirm the **amber "Service disruption"** banner shows (the safe default when we can't read deploy state). Restore the token afterward.

- [ ] **Step 4: Open PR to `main`**

```bash
gh pr create --base main --head feat/deploy-vs-outage-banner \
  --title "feat(banner): distinguish Railway deploy from outage" \
  --body "Implements docs/superpowers/specs/2026-06-02-deploy-vs-outage-banner-design.md. Calm 'Updating' banner during deploys; 'Service disruption' only during real outages. Verified on preview."
```

---

## Self-Review

- **Spec coverage:** signal source (Task 4/5), self-healing/no-stuck (Task 5 uncached config-miss + Task 3 unknown→outage), hook (Task 6), banner variants (Task 7), login notice (Task 8), tests (Tasks 2–5, 9), prereqs (Task 0), preview verify (Task 10). ✅ Covered. Spec env-var list updated to include `RAILWAY_PROJECT_ID`.
- **Placeholder scan:** no TBD/TODO; all code shown in full. Task 4 Step 5 is an explicit live-API verification with a concrete fallback action, not a placeholder.
- **Type consistency:** `DeployState` (`deploying|up|unknown`) defined in Task 2, reused in Tasks 3–6. `BackendStatus` (`ok|updating|outage`) defined Task 3, used Tasks 6–8. Hook returns `{ status }`; both consumers updated (Tasks 7, 8). `readRailwayConfig`/`fetchLatestDeploymentState` signatures match between Task 4 definition and Task 5 mock.
