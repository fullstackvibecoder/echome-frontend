# Backend Handoff #1 — Gate the unauth-tier-exposed onboarding endpoints

> **Urgency**: ~4 weeks of unprotected ElevenLabs Conversational AI + Claude Haiku cost exposure since `acdd455` (2026-03-29). Hand this to a backend session in `echome-platform-v2`.

> **Hand-off note for the backend Claude**: read everything below the divider as a self-contained spec. Verify diagnoses with verbatim citations before changing code. If reality differs from this prompt, stop and report.

---

## Context

The ElevenLabs voice-agent onboarding backend at `src/services/onboarding/` ships 5 live HTTP endpoints under `/api/onboarding/*` (mounted in `src/index.ts:248-302`). Every endpoint is behind only `authenticateUser` — there is no tier check, no quota, no per-user rate limit. Any authenticated user, free tier included, can hit `POST /api/onboarding/session` in a loop and burn ElevenLabs Conversational AI minutes plus Claude Haiku tokens (used in `profile-extractor.ts` and `transcript-cleaner.ts`).

The exposure has been live since `acdd455` (2026-03-29) — about 4 weeks. The frontend never wired up to it, so it's a dark feature, but anyone with auth + the route name could hit it directly.

This task: gate access and add rate limiting before someone discovers it.

## Existing infrastructure to reuse — do not reinvent

The codebase already has these helpers — use them:

- **`src/middleware/subscription.ts`**:
  - `requireTier('pro' | 'studio' | 'enterprise')` (line 98) — minimum-tier gate
  - `requireSubscription()` (line 35) — any paid tier
  - `requireAutoPostAccess()` (line 177) — added in `a95a061` (2026-04-24); pattern of "free-with-quota + Studio+ unlimited." Read this one as a template for the recommended approach below.
- **`src/middleware/security/`** — has `apiRateLimiter` (server-wide, 15-min window, 100 req max) and `apiKeyRateLimiter` (for public API). For per-user onboarding rate limiting we'll likely need a thin custom middleware; see Step 2.

## Verify the bug first

Before touching anything, confirm with verbatim code excerpts:

1. Read `src/routes/onboarding.ts` end-to-end. Confirm:
   - All 5 routes (`POST /session`, `POST /complete`, `POST /chat`, `GET /status/:sessionId`, `POST /skip`) use only `authenticateUser`, no tier or quota check.
   - The `/chat` endpoint also calls Claude Haiku per request (verify cost path).

2. Confirm there is NO existing call to `usageService` or quota tracking specifically on onboarding endpoints (it may exist inside `onboarding-service.ts` for cost recording but not for gating).

3. Confirm `.env` has `ELEVEN_LABS_API_KEY` and `ELEVENLABS_ONBOARDING_AGENT_ID` set. **Check Railway production env — are these set in production too?** If yes, the exposure is live. If no, the exposure is local-only and the urgency drops (but still ship the gate so it's safe when production keys go in).

4. Look for any feature flag or `if (process.env.ENABLE_VOICE_ONBOARDING)` toggle. If there's already a flag I missed, the answer might be "just turn it off" — much smaller change.

If any of this doesn't match the diagnosis, **stop and report what's actually true** before proceeding.

## Decisions for the founder (Ara) to make

Before implementing, get clarity on these — they're product decisions, not engineering ones. **Recommend defaults below, but flag in the PR description for Ara to confirm before merge.**

- **Q1: Which tiers can use the voice-agent onboarding?**
  - Recommended default: `requireTier('studio')` (Studio = $49 and up). The voice agent is the most expensive onboarding modality; a 5-min ElevenLabs Conversational AI call costs real money. Studio+ is the natural floor.
  - Alternative: free-with-1-session, paid-tier multi-session — model after `requireAutoPostAccess` (`a95a061`). Worth implementing only if Ara explicitly wants free users to try voice onboarding once.

- **Q2: How many sessions per user per period?**
  - Recommended default: 1 session per user per 24 hours, max 3 lifetime for free-tier (if free is allowed at all per Q1), unlimited for Studio+.
  - The `/complete` endpoint also costs (Haiku x2). Apply the same rate limit there, keyed by `sessionId`.

- **Q3: The text fallback `/api/onboarding/chat`.**
  - This is just Claude Haiku — much cheaper than voice. Should it have looser limits than `/session` and `/complete`?
  - Recommended default: gate it behind `requireSubscription()` (any paid tier) but with a generous rate limit (e.g., 30 chat turns per user per hour). It's the path the frontend is most likely to actually use.

## Implementation steps

### Step 1: Apply tier gates in `src/routes/onboarding.ts`

Add `requireTier(...)` (or `requireAutoPostAccess`-style helper if a "free-with-quota + paid-unlimited" model is wanted) to each route. Defaults:

```ts
// POST /session — most expensive
router.post('/session', authenticateUser, requireTier('studio'), perUserRateLimit('onboarding-session', 1, '24h'), ...);

// POST /complete — also expensive (Haiku x2 + voice clone)
router.post('/complete', authenticateUser, requireTier('studio'), perUserRateLimit('onboarding-complete', 1, '24h'), ...);

// POST /chat — Haiku only, cheaper
router.post('/chat', authenticateUser, requireSubscription(), perUserRateLimit('onboarding-chat', 30, '1h'), ...);

// GET /status/:sessionId — read-only, light
router.get('/status/:sessionId', authenticateUser, ...);  // no extra gate

// POST /skip — light
router.post('/skip', authenticateUser, ...);  // no extra gate
```

Adjust the exact tier/quota per Ara's answers in the Decisions section above.

### Step 2: Add a per-user rate limit middleware

If `perUserRateLimit(...)` doesn't already exist as a helper, create it in `src/middleware/security/` next to `apiRateLimiter`. Probably a thin wrapper around `express-rate-limit` (already a dep) that keys on `req.user?.id` instead of IP. Reuse the storage backend (likely Redis or in-memory) used by `apiKeyRateLimiter`.

### Step 3: Add a feature flag

Add `ENABLE_VOICE_ONBOARDING` env var. Default `false`. If unset/false, ALL `/api/onboarding/*` routes return 404 (not 503 or 401 — 404, so the routes look like they don't exist). This lets Ara flip the kill-switch instantly without a code deploy if the gates fail or costs spike.

```ts
if (process.env.ENABLE_VOICE_ONBOARDING !== 'true') {
  return res.status(404).end();
}
```

Set `ENABLE_VOICE_ONBOARDING=false` on Railway production immediately as part of this PR.

### Step 4: Cost tracking

Confirm `onboarding-service.ts` already calls `usageService.recordApiUsage()` for the Haiku calls (the audit said it does — `profile-extractor.ts:79`, `transcript-cleaner.ts:159`). If the ElevenLabs voice-call cost is NOT tracked, add it. Use ElevenLabs' billed-minutes from the conversation transcript fetch, or estimate from session duration — whichever is available.

### Step 5: Document `.env.example`

Add the ElevenLabs vars to `.env.example` (the audit found `ELEVENLABS_ONBOARDING_AGENT_ID` is missing from `.env.example`). Mark them as optional and gated by `ENABLE_VOICE_ONBOARDING`.

## Testing

1. **Unit tests**: confirm 401 / 402 / 403 / 429 are returned for unauth / wrong-tier / over-quota / over-rate-limit cases.
2. **Manual test**: with `ENABLE_VOICE_ONBOARDING=false`, every endpoint should 404. With it `=true` and a free-tier user, `/session` should 402 (tier gate). With a Studio user, `/session` should succeed once and 429 on the second call within 24h.
3. **Regression**: run the full test suite. Subscription middleware is a hot path; don't break other gates.

## Out of scope for this PR

- Don't build the frontend voice-agent UI. That's a separate large project.
- Don't refactor `onboarding-service.ts` internals.
- Don't change the agent prompt in `agent-prompt.ts`.
- Don't touch `MIN_SAMPLES_FOR_ANALYSIS = 3`, `VOICE_EMBEDDING_WEIGHT = 0`, or any of the items called out in the sliding-dial handoff.

## Commit message

```
fix(onboarding): gate /api/onboarding/* behind tier + rate limit + flag

The ElevenLabs voice-agent onboarding endpoints were exposed to any
authenticated user (including free tier) since acdd455 (2026-03-29).
A tight loop on POST /session would burn ElevenLabs Conversational AI
minutes; /complete would burn Claude Haiku tokens twice per call.

- requireTier('studio') on /session and /complete
- requireSubscription() + 30/hour rate on /chat
- New per-user rate limit: 1 session and 1 complete per 24h
- New ENABLE_VOICE_ONBOARDING feature flag, defaults off (returns 404)
- Add ElevenLabs vars to .env.example
- Set ENABLE_VOICE_ONBOARDING=false on Railway production
```

## Pre-merge checklist

- [ ] Bug confirmed with verbatim citations from `routes/onboarding.ts`
- [ ] Production Railway env checked — are ElevenLabs keys set there?
- [ ] Ara's three decisions (tier floor, rate quotas, /chat handling) confirmed
- [ ] `requireTier(...)` applied to expensive endpoints
- [ ] `perUserRateLimit(...)` middleware created or reused
- [ ] `ENABLE_VOICE_ONBOARDING` flag wired and defaults off
- [ ] `ENABLE_VOICE_ONBOARDING=false` set on Railway production
- [ ] `.env.example` updated with both ElevenLabs vars
- [ ] Cost tracking covers ElevenLabs minutes (not just Haiku)
- [ ] Unit tests for 401/402/429 paths
- [ ] Existing test suite still green
- [ ] No regressions in other tier-gated endpoints
