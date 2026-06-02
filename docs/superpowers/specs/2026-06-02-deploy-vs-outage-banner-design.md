# Deploy-vs-Outage Banner — Design

**Date:** 2026-06-02
**Repo:** echome-frontend (Next.js 16 App Router, React 19, Vercel)
**Branch:** feat/deploy-vs-outage-banner

## Problem

`OutageBanner` (driven by `useBackendHealth`, polling the Railway backend `/health`
every 30s, showing after 2 consecutive failures) fires **identically** for a routine
Railway deploy and a genuine provider outage. During a normal `git push` deploy it
shows an alarming message — *"Our hosting provider is having a service disruption …"*
with a link to Railway's status page — which is false and unsettling for users. Some
Railway deploys take several minutes, so the banner is visible for the whole window.

From `/health` alone the frontend **cannot** tell a deploy apart from an outage; both
look like "backend unreachable." We need a signal source that is up even while the
Railway backend is down (the frontend is on Vercel, which stays up).

## Goal

When the backend is unreachable, show the **right** message:

- **Deploy in progress** → neutral *"EchoMe is updating — back in a moment."*
- **Genuine outage** → the existing amber *"Service disruption"* message + status link.

Hard requirement: it must be **impossible** for a real outage to silently render the
calm "Updating" message. Any uncertainty resolves to the outage message.

## Approach (chosen)

**Pull-based.** A small Vercel route handler asks **Railway's GraphQL API** whether the
backend service is mid-deployment *right now*. The browser calls that route only when
`/health` is already failing. Because it reads Railway's **live** deployment state on
every call, it is self-correcting and can never get "stuck" — which is the failure mode
that rules out the rejected alternative.

### Rejected alternative

**Push-flag in Vercel Edge Config**, flipped on/off by a Railway deploy webhook. Rejected
because a deploy that crashes (or a missed "clear" webhook) leaves the flag stuck at
"deploying," so a real outage would render as "Updating" — exactly the failure we must
prevent. The pull approach has no persisted flag to get stuck.

## Components

### 1. Vercel route handler — `src/app/api/backend-status/route.ts`

- First API route in this repo. **Node runtime** (`export const runtime = 'nodejs'`).
- Queries Railway GraphQL (`https://backboard.railway.app/graphql/v2`) for the
  **latest deployment** of the configured service + environment, reads its `status`.
- Maps to a small response: `{ state: 'deploying' | 'up' | 'unknown' }`
  - `deploying` — status ∈ { BUILDING, DEPLOYING, INITIALIZING, QUEUED, WAITING, NEEDS_APPROVAL }
  - `up` — status ∈ { SUCCESS, SLEEPING }
  - `unknown` — any other status, OR any error (missing/invalid token, timeout,
    network failure, unexpected shape). Logged server-side.
- Server-side cache ~10s (avoid hammering Railway when many clients poll). The browser
  fetches with `cache: 'no-store'`; the route applies its own short cache.
- Secrets (server-only Vercel env vars, never `NEXT_PUBLIC_`):
  `RAILWAY_API_TOKEN`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_ID`.
- Has a short fetch timeout (~3s) to Railway so a hung control plane can't hang the route.

### 2. Hook — `src/hooks/useBackendHealth.ts` (modified)

- Keeps the existing `/health` poll **unchanged**: 30s interval, 8s timeout,
  show-after-2-consecutive-failures, clear-on-first-success.
- New behavior: when it transitions to "down," it fetches `/api/backend-status` to
  determine *why*, then exposes a richer return value.
- **Return shape changes** from `{ isDown: boolean }` to
  `{ status: 'ok' | 'updating' | 'outage' }`.
  - `/health` ok → `ok` (and reset failure counter)
  - `/health` down + backend-status `deploying` → `updating`
  - `/health` down + backend-status `up` or `unknown` → `outage` (safe default)
  - First `/health` success → back to `ok`.
- Anti-flip-flop: while the `/api/backend-status` call is in flight on first detection,
  do not render anything yet; if it does not resolve within ~3s, fall through to
  `outage`. Re-checks backend-status on each subsequent failed `/health` poll so a
  deploy that *becomes* an outage (crash) escalates to the outage message.

### 3. `OutageBanner` — `src/components/outage-banner.tsx` (modified)

- `status === 'ok'` → render nothing.
- `status === 'updating'` → neutral variant (e.g. slate/blue, calm copy, **no** Railway
  status link). Copy TBD-at-review; default: *"EchoMe is updating — the app will be back
  in a moment."*
- `status === 'outage'` → the **existing** amber message + `status.railway.com` link,
  unchanged.

### 4. Login inline notice — `src/app/auth/login/LoginContent.tsx` (modified)

- Currently reads the same down-signal to explain why "Sign in" is dead. Switch it to
  consume the new `status` so its wording matches the banner (calm during a deploy,
  disruption during an outage).

## Data flow

```
browser ── GET /health (Railway) ──▶ fails 2× (~60s)
browser ── GET /api/backend-status (Vercel) ──▶ Railway GraphQL (latest deployment.status)
        ◀── { state } ──
browser maps:  deploying → "Updating"   |   up / unknown → "Service disruption"
browser ── GET /health succeeds ──▶ clears to ok
```

## Error handling — the anti-stuck guarantee

Every uncertain path resolves to **outage**, never "updating":

| Condition | Route result | Banner |
|-----------|-------------|--------|
| Railway API token missing/invalid | `unknown` | Service disruption |
| Railway API timeout / unreachable (e.g. Railway platform outage) | `unknown` | Service disruption |
| Unexpected GraphQL shape | `unknown` | Service disruption |
| `/api/backend-status` itself errors / Vercel route 5xx | treated as `unknown` by client | Service disruption |
| backend-status fetch in flight > ~3s | — | Service disruption |

There is no code path where a real outage renders the calm "Updating" message.

## Testing

- **Route handler** (`backend-status`): mock Railway GraphQL responses →
  assert `deploying` / `up` / `unknown`; assert `unknown` on missing token, on timeout,
  and on malformed payload.
- **Hook** (`useBackendHealth`): mock `/health` + `/api/backend-status` fetch sequences →
  assert transitions: ok→updating (deploying), ok→outage (up/unknown), updating→ok on
  recovery, updating→outage when a deploy starts crashing, and the in-flight/timeout
  fall-through to outage.

## Prerequisites (one-time, provided by Ara)

- A Railway **read-only API token**.
- Backend **service ID** and **prod environment ID**.
- Set `RAILWAY_API_TOKEN`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_ID` as server-side
  env vars in Vercel (Production + Preview). Verify the GraphQL query/IDs against a real
  deploy before promoting.

## Rollout

- Work on `feat/deploy-vs-outage-banner`; verify on a Vercel **preview** deployment
  (force a backend deploy and confirm "Updating" shows; simulate token-missing and
  confirm "Service disruption" shows) before promoting to `main`/production.

## Open questions (resolve at spec review)

1. Exact "Updating" copy.
2. Does the Updating variant keep any link (e.g. a neutral "status" link), or none?
3. Confirm the login inline notice should switch to the new status (default: yes).
