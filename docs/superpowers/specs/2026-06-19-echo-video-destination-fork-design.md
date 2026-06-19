# Echo Video-URL Destination Fork + Channel Clip-Stockpile — Design

**Date:** 2026-06-19
**Status:** Approved (design); pending implementation plan
**Repos:** `echome-frontend` (Next.js) + `echome-platform-v2` (Express/TS, Railway)

## Problem

The unified Echo create chat tries to *classify* a pasted video URL into an
intent (`create` vs `ingest`) via an LLM prompt. For YouTube/Instagram links
the classifier always steers to `create`, and it never distinguishes a single
video from a whole channel/profile. Result: a pasted channel link dead-ends at
a create-path error toast, even though the KB-ingest plumbing behind it works.

The desired behavior, per the product owner: **do not classify these URLs at
all — ask the user where the link should go.** A pasted video URL is ambiguous
by nature, so the system should present the destinations and let the user
direct, every time.

## Goal

When the Echo input contains a video URL, the confirm step presents a
**two-button destination fork** instead of a guessed intent. The fork's copy
varies by link type (single video vs channel/profile). Picking a destination
routes to the matching existing pipeline — and adds **one** new capability:
saving a channel's videos as a stockpile of source rows the user can clip
later.

## Non-Goals (deferred to a follow-up spec)

- Pre-downloading/storing channel video media to R2 (B2 prefetch / B3 full
  store). B1 here stores rows only; ClipFinder downloads on demand.
- A richer dedicated "stockpile library" tab/page with its own UX.
- Re-ingest dedup when the same channel is stockpiled twice.
- Async-progress polling polish in the Echo thread beyond a terminal
  success/failure surface.
- The OAuth-Instagram `storeChunks` gap.

## Architecture overview

```
Echo input (text + URL)
      │
      ▼
classifyEchoInput ──► confirm step
      │
      ├─ URL is a video URL?  ──► DESTINATION FORK (2 buttons), not intent chips
      │       │
      │       ├─ single video + "Add to Voice/KB"  ──► startSocialImport('youtube')   [exists]
      │       ├─ single video + "Make content now" ──► clip path (POST /clips)         [exists]
      │       ├─ channel + "Add to Voice/KB"        ──► startSocialImport('youtube')   [exists]
      │       └─ channel + "Save to clip later"     ──► STOCKPILE MODE (new)           [build]
      │
      └─ not a video URL ──► existing intent flow (unchanged)
```

The only genuinely new server capability is **stockpile mode**. Everything else
is wiring the fork to pipelines that already exist.

### Key reuse insight

`video_uploads` already holds one row per source video (upload *or* URL via
`source_url`), and **ClipFinder already runs off a `video_uploads` row** to
produce `video_clips`. Channel import today (`youtube-service.ts:195-314`)
fetches per-video `{id, url, title}` objects, transcribes them to chunks, and
**discards the per-video objects**. Stockpile mode stops discarding them: it
writes one `video_uploads` stub row per video. The existing clip pipeline then
treats a stockpiled video identically to a freshly-pasted URL.

## Components

### Component 1 — Frontend: single-vs-channel URL detection

**File:** `echome-frontend/src/lib/url-platform.ts`

Today `detectIngestUrlKind` returns `'youtube'` for both a channel and a single
video (domain-only regex, lines 23-47). Add a path-based discriminator that
mirrors the backend `parseYouTubeUrl` (`youtube-service.ts:60`):

- **Channel/profile:** `/@handle`, `/channel/<id>`, `/c/<name>`, `/user/<name>`,
  `playlist?list=`, or a bare `youtube.com`/`youtu.be` root with no video id;
  for Instagram, a profile URL (no `/p/`, `/reel/`, `/tv/` segment).
- **Single video:** `/watch?v=`, `youtu.be/<id>`, `/shorts/<id>`, `/live/<id>`;
  for Instagram, `/p/`, `/reel/`, `/reels/`, `/tv/`.
- **Uncertain → treat as channel-or-single-unknown** and still show the fork
  (asking is always safe).

The function must be unit-tested with the canonical URL shapes (see Testing).

### Component 2 — Frontend: the destination fork in the Echo confirm step

**File:** `echome-frontend/src/components/echo/useEcho.ts` (+ a small presentational
component for the fork buttons).

In `submit()`/the confirming state, when `extractFirstUrl(text)` yields a video
URL (YouTube or Instagram per Component 1), render a **DestinationFork** with
exactly two buttons instead of the generic intent chips. Copy by link type:

| Link type | Button 1 | Button 2 |
|---|---|---|
| Single video | "Add to Voice/KB" | "Make content now" |
| Channel / profile | "Add to Voice/KB" | "Save videos to clip later" |

Each button maps to a concrete handler (Component 3). No auto-act: the v1
contract (one explicit click before execution) is preserved — the fork *is* the
one click. Copy uses periods/commas, no em dashes.

Non-video URLs and non-URL input keep the existing intent flow untouched.

### Component 3 — Frontend: route each fork choice

**File:** `echome-frontend/src/components/echo/useEcho.ts`

| Choice | Call | Source |
|---|---|---|
| single + Voice/KB | `api.kbContent.startSocialImport({ platform, url })` | exists (`api-client.ts:~1320`) |
| single + create | `api.clips.upload({ sourceType: platform, sourceUrl: url })` then `api.clips.process(uploadId, { generateContent: true })` (the exact two-call flow `generation-form.tsx:processVideoWithClipFinder` uses) | exists |
| channel + Voice/KB | `api.kbContent.startSocialImport({ platform: 'youtube', url })` | exists |
| channel + clip-later | `api.kbContent.startChannelStockpile({ url })` (new method, Component 5) | build |

On dispatch, surface a terminal outcome in the Echo thread (queued / failed /
empty), not a silent fire-and-forget.

### Component 4 — Backend: stockpile mode service

**File:** `echome-platform-v2/src/services/kb-content/youtube-service.ts`
(or a sibling `stockpile-service.ts` if cleaner — decide in the plan).

New method (working name `stockpileChannel`):

1. Parse the URL; require a channel/playlist type (reuse `parseYouTubeUrl`,
   line 60). Reject a single-video URL with a clear error.
2. Enumerate videos via the existing `getChannelVideos(identifier, maxVideos)`
   SociaVault call (used at `youtube-service.ts:225`). `maxVideos` default
   stays 20 (matches existing channel import).
3. For each video, insert one `video_uploads` row:
   - `user_id`, `source_url` = the video URL, `source_type` = `'youtube'`
     (the `video_source_type` enum value for YouTube),
   - `metadata` = `{ title }` — `video_uploads` has NO `title`/`thumbnail`
     column; `metadata` is the JSONB added by `20260416_video_uploads_metadata.sql`.
     `getChannelVideos` returns only `{ id, url, title }`, so no thumbnail is
     available (strip degrades to title-only, see Component 7),
   - `status` = `saved` (new state — see Component 6),
   - no media download, no transcription, no chunks.
4. Idempotency: skip insert if a `video_uploads` row already exists for the same
   `(user_id, source_url)` — avoids duplicate stockpile rows on re-run.
5. Return a summary `{ savedCount, skippedCount }`.

Failure (SociaVault error, zero videos) returns a clear error; zero videos must
not create orphan rows.

### Component 5 — Backend: routes + frontend api-client methods

**Backend file:** `echome-platform-v2/src/routes/kb-content.ts` (or wherever the
clip/video routes live — keep it next to `social/import`). Two routes, both
`authenticateUser`:

- `POST .../channel/stockpile` — body `{ url }` → `stockpileChannel`.
- `GET .../videos/saved` — list the caller's `video_uploads` rows with
  `status = 'saved'` (id, source_url, title, thumbnail, created_at), newest
  first, paginated.

**Frontend file:** `echome-frontend/src/lib/api-client.ts` — add
`api.kbContent.startChannelStockpile({ url })` and
`api.kbContent.listSavedVideos()` (or `api.videos.*` if that namespace fits
better). Additive only; do not touch auth/interceptor/JWT-sync logic.

### Component 6 — Backend: the `saved` video state

**File:** a new migration under `echome-platform-v2/supabase/migrations/`.

`video_uploads.status` is the `video_processing_status` enum
(`20260106_000001_clip_finder.sql:41-67`). Add a `saved` value (a stockpiled
video that has not entered processing):

```sql
ALTER TYPE video_processing_status ADD VALUE IF NOT EXISTS 'saved';
```

**Decision: enum-add, not a boolean column.** Repo precedent favors enum-add
(`subscription_tier`, `caption_style_preset`, and the `fix_upload_status_enum`
migration all use `ALTER TYPE ... ADD VALUE IF NOT EXISTS`), and `saved` fits
the lifecycle (`saved` -> `pending` -> ... -> `completed` when later clipped) as
one more status value rather than an orthogonal flag. No consumer does an
exhaustive `switch`/`default: throw` on this enum (checked: `admin-webhook-health.ts`,
`reels.ts`, `clips.ts` are equality checks on `completed`/`failed`/`processing`),
so a new value breaks nothing.

**Postgres constraint (the lesson the `fix_upload_status_enum` migration teaches):**
`ALTER TYPE ... ADD VALUE` cannot be used in the same transaction that then
references the new value. The `saved` value therefore lands in **its own
migration**, deployed before any code (Component 4's insert) references it. This
is why the backend PR's migration and the stockpile insert can ship together
only if the migration runs first in deploy order, which Railway's
migrate-then-boot sequence guarantees.

### Component 7 — Frontend: the inline saved-videos result strip

**File:** the Echo thread surface (`src/components/echo/` — the same thread that
renders the destination fork in Component 2) + a small presentational strip
component.

After a successful `startChannelStockpile`, the Echo thread renders **one
result card**, not N cards:

- a headline: "Saved N videos to clip later",
- a **horizontal scroll strip** of the saved videos (**title-only** — no
  thumbnails exist; `getChannelVideos` returns no thumbnail), ~5 visible, the
  rest scroll horizontally. With `maxVideos=20` the strip is bounded at 20
  items — a hard ceiling, so a plain horizontal scroll suffices (no pagination,
  no virtualization).
- each item has a "Clip" affordance; picking one calls
  `api.clips.process(uploadId, { generateContent: true })` **directly** on the
  stockpiled row's `uploadId` (no re-upload — the `video_uploads` row already
  exists). No new clip logic.

The strip's source is the `startChannelStockpile` response (it already returns
the saved rows). `listSavedVideos` (Component 5) backs a re-fetch when the
thread card is gone — e.g. the strip's "see all" re-pulls the user's `saved`
rows. The richer dedicated library surface stays deferred.

**Coupling note for the implementer:** the inline strip is viable *only because*
`maxVideos` caps the row count at 20. Leave a code comment at the strip tying it
to the `maxVideos` constant; if that cap ever rises, the inline strip must move
to pagination or a dedicated surface.

## Data flow — channel + clip-later (the new path)

```
Echo: paste channel URL
  → fork: "Save videos to clip later"
  → POST /channel/stockpile { url }
  → stockpileChannel: SociaVault getChannelVideos → N video_uploads rows (status=saved)
  → Echo thread renders ONE result card: "Saved N videos to clip later"
    + horizontal scroll strip of the N saved videos (bounded at 20)

Pick a video from the strip (now or later via "see all" re-fetch):
  → existing clip pipeline runs on that video_uploads row (downloads on demand)
  → video_clips produced, exactly as a pasted single URL would
```

## Error handling

- **SociaVault failure / `SOCIAVAULT_API_KEY` missing:** stockpile call returns
  an error surfaced in the Echo thread, not a silent 200.
- **Zero videos found:** clear "no videos found for that channel" message; no
  rows written.
- **Single-video URL sent to stockpile:** rejected with a message telling the
  user to use "Make content now" instead.
- **URL type uncertain (Component 1):** show the fork anyway; both buttons are
  safe. A channel-shaped URL that turns out single still works (its
  `startSocialImport`/stockpile handles it or returns a clean error).
- **Duplicate stockpile (same channel twice):** idempotent on
  `(user_id, source_url)`; re-run skips existing rows.

## Testing

**Frontend (vitest):**
- `url-platform.test.ts`: `youtube.com/@handle` → channel; `youtube.com/channel/UC...`
  → channel; `youtube.com/watch?v=ID` → single; `youtu.be/ID` → single;
  `youtube.com/shorts/ID` → single; `instagram.com/handle` → channel/profile;
  `instagram.com/reel/ID` → single. Plus the bare-domain and uncertain cases.
- `useEcho` fork test: a single-video URL renders the single-video fork copy and
  routes Button 2 to the clip path; a channel URL renders the channel fork copy
  and routes Button 2 to `startChannelStockpile`. Non-video URL still shows the
  existing intent flow.
- Inline strip test: after a stockpile success, the thread renders one result
  card with a scroll strip of the returned saved videos; picking a thumbnail
  invokes the clip entry with the right `video_upload_id`/`source_url`. A
  20-item response renders without overflow breakage (bounded strip).

**Backend (existing test runner):**
- `stockpileChannel`: a channel URL produces N `video_uploads` rows with
  `status='saved'` and correct `source_url`; a single-video URL is rejected;
  zero-video channel writes no rows; re-run is idempotent on `(user_id, source_url)`.
- Route tests: `POST /channel/stockpile` and `GET /videos/saved` are
  auth-gated and return the documented shapes.
- Migration: `saved` enum value present after migrate; no existing status
  filter breaks.

## Global Constraints

- **Two repos, branch + PR each** — never push to `main` directly
  (frontend → Vercel, backend → Railway auto-deploy). Backend PR merges and
  deploys to Railway **before** the frontend PR reaches users, or the fork's
  new buttons call routes that 404 in prod.
- **No em dashes** in any user-facing copy (button labels, thread messages,
  toasts). Periods or commas.
- **Sensitive paths — additive only, do not alter logic:** frontend
  `src/lib/api-client.ts` (add methods, never touch auth/interceptor/JWT-sync),
  `src/app/auth/`, `src/app/app/admin/`, billing/subscription components;
  backend auth/admin/billing.
- **Reuse, do not rebuild:** the stockpile is `video_uploads` rows + the
  existing clip pipeline. No new media storage, no new clip logic, no parallel
  video store.
- **maxVideos** default stays 20 (matches existing channel import).
- Migration applies to staging first; any prod apply is a gated operational
  action requiring explicit go-ahead.

## Cross-repo PR sequencing

1. Backend PR (Components 4, 5-backend, 6) → merge → confirm routes live on
   Railway.
2. Frontend PR (Components 1, 2, 3, 5-frontend, 7) → merge → Vercel.

Frontend api-client methods are inert until the fork wires them, so they can
ride in the frontend PR safely, but the backend routes must be live first.
