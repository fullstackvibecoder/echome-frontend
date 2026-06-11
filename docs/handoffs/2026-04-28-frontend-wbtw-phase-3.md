# Frontend Handoff — WBTW Phase 3 signup integration + review UI

> **Backend Phase 2 + Phase 3 just shipped to production** (echome-platform-v2). This handoff is for the frontend signup integration that turns the backend into a user-facing feature. Hand to a fresh frontend session in `echome-frontend`.

---

## Context

The Work Before The Work tenet — *the system arrives at the user's first session already knowing things about them* — is now real on the backend. Today's session shipped:

- **Phase 1** (`f3a1bfa`) — public-data-lookup service: brand site + RE/MAX + NAR + orchestrator + cache. Migration applied (`public_profiles` table).
- **Phase 2** (commit pending — coming with this push) — Instagram via Sociavault + Cloudflare-fallback (Apify) for hostile brand sites. Both feature-flagged.
- **Phase 3 backend** (commit pending — coming with this push) — four `/api/wbtw/*` HTTP routes with tier gating, rate limiting, cost cap, override-lock, feature flag. Default off until frontend ships.

**Your job**: build the signup-time UX that calls these routes and lets the user confirm the auto-populated profile in ~30 seconds with zero typing. When you ship and the `WBTW_ENABLED_AT_SIGNUP=true` flag flips on Railway prod, the audit's biggest items go from "shippable in theory" to "shipping in production."

---

## API contract (live on backend after this batch deploys)

Base URL: `https://api.tryechome.com/api/wbtw/`

All routes require `Authorization: Bearer <supabase-jwt>` (existing `authenticateUser` middleware).

When `WBTW_ENABLED_AT_SIGNUP !== 'true'` on Railway, every route returns `404` (looks like it doesn't exist). Until you ship and we flip the flag, your dev experience hits 404s — for local dev set `WBTW_ENABLED_AT_SIGNUP=true` in your local backend `.env`.

### `POST /api/wbtw/lookup`

Kicks off a lookup. Synchronous (5-15 sec).

**Body** (all optional):
```json
{
  "email": "user@example.com",        // defaults to current user's email
  "domain": "askjay.ca",              // optional explicit brand domain
  "instagram_handle": "@jayandjayahomes" // optional
}
```

**Response 200**:
```json
{
  "profile_id": "uuid",
  "fields": {
    "full_name": "Jaya Dewan",
    "role": "Re/Max Real Estate Centre — Realtor",
    "bio": "Helping families find their forever home since 2015...",
    "topics": ["Mississauga homes", "family-focused real estate", "market updates"],
    "headshot_url": "https://...",
    "voice_samples": ["I love working with first-time buyers...", "..."]
  },
  "field_confidence": {
    "full_name": 0.95,
    "role": 0.78,
    "bio": 0.82,
    "...": "..."
  },
  "source_trace": {
    "full_name": "https://www.remax.ca/...",
    "role": "https://askjay.ca",
    "bio": "https://askjay.ca/about"
  },
  "ready": true,
  "expires_at": "2026-05-28T18:00:00Z"
}
```

**Errors**:
- `404` — feature flag off
- `402` — free tier already used their 1 lifetime lookup, OR cost cap exceeded (response code `WBTW_COST_CAP_EXCEEDED`)
- `429` — paid tier hit 1/24h limit
- `500` — lookup orchestrator failed (rare; retryable)

**Empty profile is a valid response.** If `fields` is `{}` and `ready: true`, the system tried but found nothing public. The user gracefully degrades to current onboarding flow (drop them at `/app` with empty welcome banner — the existing copy "give me a topic, link, or video" works fine without context).

### `GET /api/wbtw/profile`

Read-only fetch of latest profile for current user. Same shape as `POST /lookup` response, but no work performed. Use this to render the review screen on subsequent visits or after a refresh.

### `POST /api/wbtw/profile/confirm`

User accepts/overrides the profile. Backend writes to `users.profile_*` columns and ingests bios/captions as KB voice samples.

**Body**:
```json
{
  "fields_to_accept": ["full_name", "role", "topics", "headshot_url"],
  "fields_to_override": {
    "bio": "Custom bio the user typed instead",
    "role": "Senior Realtor with Re/Max"
  }
}
```

Once a field is overridden, it's **locked from auto-update** on future lookups (founder decision Q3). The user can override the lock via an explicit "Refresh from public sources" button (defer that UI to v1.1).

**Response 200**:
```json
{ "success": true, "fields_written": 6, "kb_chunks_ingested": 14 }
```

### `DELETE /api/wbtw/profile`

Hard-deletes the user's `public_profiles` row(s) AND any KB chunks with `metadata.source === 'wbtw_lookup'`. Fully reversible (next lookup re-populates) but respects user privacy if they want a clean slate.

**Response 200**: `{ "success": true }`

---

## UX spec — three new surfaces

### 1. Signup loading screen

After successful signup → email confirmation → currently routes to `/app`. Insert a brief loading state instead.

**Route**: new `/onboarding/lookup` (or whatever fits the existing onboarding routing — current `/onboarding` exists; this can be a new sub-route or replace the chat-driven flow).

**UI**:
```
[Echo avatar] Hey Jaya — give me 30 seconds. Going to look you up...

  • Reading askjay.ca         ✓
  • Reading remax.ca/agent/jaya-dewan  ✓
  • Reading @jayandjayahomes on Instagram  ✓

  Done. Let's confirm what I got right.
                                                [ Continue → ]
```

**Logic**:
- On mount, call `POST /api/wbtw/lookup` (no body — backend uses current user's email).
- Show animated source-by-source progress (the response is one shot, but you can simulate progress for perceived speed — or fire-and-forget a few "Reading X" placeholders that resolve to ✓ when the response lands).
- On 200 with non-empty `fields`, route to the review screen (next surface).
- On 200 with empty `fields`, route to `/app` with a banner: *"Couldn't find much yet. Drop a video, paste a YouTube link, or type a topic — Echo learns from anything you give it."*
- On 402/404/429, route to `/app` cleanly (no error scaring the user — silent degradation).
- **Privacy disclosure must appear BEFORE the lookup runs.** See §5 below.

### 2. Review screen

```
[Echo avatar] Here's what I have. Reply 'change [field]' if anything's wrong, 
              or hit Looks Good and we'll start.

              Name: Jaya Dewan ✓
              Role: Re/Max Real Estate Centre — Realtor (Hall of Fame) ✓
              Topics: Mississauga homes, family-focused real estate, market updates ✓
              Bio: "Helping families find their forever home since 2015..." ✓
              Brand voice: warm, direct, no jargon ✓
              Headshot: [thumbnail] ✓

              I also read 14 of your recent Instagram captions and 8 blog posts 
              from askjay.ca. Voice strength so far: 47/100 (Growing).

              [ Looks Good ]   [ Change something ]
```

**Logic**:
- Render fields from the `lookup` response.
- Each field gets a checkmark + edit affordance.
- "Looks Good" → call `POST /api/wbtw/profile/confirm` with all fields in `fields_to_accept`, no overrides. Then redirect to `/app`.
- "Change something" → flip into chat-shaped edit mode. User says "change bio to ..." → store in pending overrides → on Save, call confirm with `fields_to_override`.
- Voice strength comes from existing `GET /api/voice/strength` endpoint (which now returns `voiceMode` per handoff #2). Backend will have ingested KB chunks during the lookup, so voice strength is non-zero by the time this screen renders.

**Tenet alignment**: this is **chat-first** (per the operating tenets memory). NOT a form. Use the existing onboarding chat component shape if it fits.

### 3. `/app/voice` source badges

When the user later visits `/app/voice` (the renamed Knowledge Base page from Q5):

- Each source card shows a badge indicating origin: `🔍 Found by Echo` for `wbtw_lookup` source, vs `✋ Added by you` for manual paste/upload.
- Hover/tap the badge → tooltip with source URL from `source_trace`.
- A "Refresh from public sources" button (deferred to v1.1) somewhere in the page header — calls `POST /api/wbtw/lookup` again and re-enters the review screen.

---

## Privacy disclosure copy

Required, on the loading screen BEFORE the lookup fires (or as a one-time signup-flow step). Verbatim from scoping doc §8.4:

> EchoMe will read your public web presence (your brand site, public Instagram, public realtor profiles) so you don't have to fill out a profile manually. We don't share, sell, or use this data anywhere except for your own content generation. You can edit or delete anything we find at any time.

Plus a link to `/privacy` (which should also reflect this — copy update needed there too).

If the user declines, route to `/app` with the empty-state welcome banner. No lookup runs.

---

## Founder decisions already locked

You don't need to decide these — they're already in backend. For your awareness only:

- **Free tier**: 1 lifetime WBTW lookup. Plenty for first-impression magic.
- **Paid tier**: 1 lookup per 24 hours. Backend rate-limits this.
- **Re-lookup cache**: 30 days. After expiry, next `POST /lookup` triggers fresh fetch.
- **Override lock**: once a user manually edits a `users.profile_*` field, that field is locked. Re-lookup won't overwrite. Surface this in the UI (e.g., a small lock icon next to manually-edited fields). Out-of-scope for v1, but worth the icon design now.
- **Cost cap**: $1/user/month. If exceeded, `POST /lookup` returns 402 with `WBTW_COST_CAP_EXCEEDED`. Show a polite "We've hit your monthly lookup budget — refresh next month" message. Should never trigger at current scale.

---

## Audit items this unblocks

When you ship and the flag flips:

| Audit recommendation | Status today | After your ship |
|---|---|---|
| §1.9 onboarding "let me look you up" framing | aspirational | live |
| §1.12 KB first-visit "here's what it knows" | unbuildable | live |
| §1.15 Settings auto-population (replaces 11-field form) | aspirational | live |
| Sliding influence dial starts at ~50% day 1 | starts at 0% | starts at ~50% |
| `/onboarding` 3-source gate deletable per strict NO ONBOARDING reading | depends on this | unblocked |
| Jaya class of churn ("I had to teach the system everything") | open | closed |

---

## Required env var coordination

When ready to ship, ping me (backend session) to flip:

- `WBTW_ENABLED_AT_SIGNUP=true` on Railway prod (currently `false` so backend routes 404)

I'll confirm the flag is set before you point users at the new flow. Until then your local dev should set it true in local `.env` to test.

---

## Out of scope for this PR

- "Refresh from public sources" button (override-lock unlock UI). v1.1.
- Per-field confidence visualization beyond the checkmark. Show ✓ for confidence ≥ 0.7, ⚠ otherwise — that's enough.
- Source-trace inspector beyond hover tooltips. v1.1.
- Industry expansion beyond realtors. v2.

---

## Repo conventions to honor

- Read `~/.claude/projects/-Users-aramammo-Side-Quests-echome-frontend/memory/MEMORY.md` (or whatever the frontend session's memory dir is) before starting. Specifically: `feedback_chat_belongs_in_onboarding.md` validates that this signup flow is the **right** place for chat (vs the KB page where chat got reverted).
- The shipped operating tenets:
  - **CONTEXT IS KING** — everything you build here embodies this. The screen is literally the system showing what it knows.
  - **CHAT FIRST** — prefer chat-shaped interaction over form fields where possible.
  - **WORK BEFORE THE WORK** — this entire flow is the canonical embodiment of the tenet.
  - **NO ONBOARDING** — the loading screen + review is two clicks; should feel like zero ceremony.

---

## Pre-merge checklist

- [ ] `POST /api/wbtw/lookup` wired to signup completion
- [ ] Privacy disclosure shown before lookup runs
- [ ] Loading screen with simulated source-by-source progress
- [ ] Review screen rendering all field types
- [ ] `Looks Good` → `POST /confirm` → redirect to `/app`
- [ ] Empty-fields response degrades gracefully (banner copy)
- [ ] 402/404/429 responses fall through to `/app` silently
- [ ] `/app/voice` shows source badges (🔍 / ✋)
- [ ] Override-lock indicator (lock icon) on manually-edited fields
- [ ] E2E test: signup → lookup → review → confirm → `/app`
- [ ] Ready to flip `WBTW_ENABLED_AT_SIGNUP=true` after merge
