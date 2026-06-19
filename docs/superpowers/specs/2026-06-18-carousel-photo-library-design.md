# Saved Carousel Photos — Design Spec

**Date:** 2026-06-18
**Status:** Approved (design); pending spec review
**Repos:** `echome-frontend` (Next.js), `echome-platform-v2` (Express/Railway)

## Goal

Every carousel photo a user uploads persists, attributed to that user, and surfaces in the PhotoPicker of *every* content kit — not just the kit it was uploaded under. Mirrors the existing B-roll-uploads pattern. Deletion is soft (hide). A one-time backfill seeds the 25 existing attributable folders.

## Background / Problem

Today the carousel upload route `POST /api/images/background/upload`
(`echome-platform-v2/src/routes/images.ts:346`) is **unauthenticated**: no
`authenticateUser`, no `req.user`, no userId recorded. It calls
`processUploadedBackground` (`src/services/image/background-service.ts`),
sharp-resizes to 1080×1080, and writes to the `carousel-backgrounds` bucket
at `uploads/{contentId}/background-{ts}.jpg` with **no DB row**.

PhotoPicker (`echome-frontend/src/components/content-kit/PhotoPicker.tsx:114`)
always passes the real kit uuid as `contentId`, so those uploads land at
`uploads/{kitUuid}/`. But because no row is written and the route never knew
the user, the photo is invisible in any other kit and unattributable after
the fact.

### Yield audit (2026-06-18, read-only Supabase probe)

`carousel-backgrounds` bucket, 263 upload folders / ~289 image files:

| Folder type | Count | Attributable |
|---|---|---|
| Real kit UUID | 25 | ✅ all 25 → 14 distinct users via `content_kits.id` join |
| `preview-<ts>` / `carousel-<ts>` / `e2e-*` | 238 | ❌ synthetic ids, preview-render throwaways, test junk |

Conclusion: 90% of the bucket is unattributable (no user in path, no owner
metadata on service-role uploads). Only the 25 uuid folders can be
backfilled. Going-forward fix = persist attribution on upload, like B-roll.

## Reference pattern: B-roll uploads (already shipped)

| Component | Location |
|---|---|
| Table `user_broll_clips` | `echome-platform-v2/supabase/migrations/20260418_user_broll_uploads.sql` |
| `POST /reels/broll-uploads` (auth, persists) | `src/routes/reels.ts:1037` |
| `GET /reels/broll-uploads` (list mine) | `src/routes/reels.ts:1140` |
| `DELETE /reels/broll-uploads/:id` (hard delete: storage + row) | `src/routes/reels.ts:1182` |
| Editor merges saved clips on open | `echome-frontend/src/components/reels/ReelEditorModal.tsx:117-133` |

This spec copies that triad. The one intentional divergence: **soft-delete
(hide) instead of B-roll's hard-delete**.

## Architecture

A dedicated authenticated triad parallel to B-roll. The existing
`/background/upload` route is left untouched (it is shared by preview/compose
flows that call it without a kit id — the 238 `preview-*` artifacts). Forcing
auth there would break those callers. PhotoPicker switches its upload to the
new persisted endpoint.

### Component 1 — Table `user_carousel_photos`

New migration in `echome-platform-v2/supabase/migrations/`. Mirrors
`user_broll_clips` minus video-specific columns, plus a soft-delete column:

| Column | Type |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `url` | `TEXT NOT NULL` |
| `storage_path` | `TEXT NOT NULL` |
| `original_filename` | `TEXT` |
| `file_size` | `INTEGER NOT NULL` |
| `width` | `INTEGER` |
| `height` | `INTEGER` |
| `hidden_at` | `TIMESTAMPTZ` (null = visible) |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |

RLS disabled; access control enforced at the API layer (same convention as
`user_broll_clips`). Index on `(user_id, hidden_at, created_at DESC)` for the
list query.

### Component 2 — Storage layout

Reuse the existing `carousel-backgrounds` bucket. New uploads use a
user-namespaced prefix: `library/{userId}/{photoId}.jpg`. Attribution lives
in the path as well as the row. Backfilled rows keep their existing
`uploads/{kitUuid}/...` paths (no file move — mixed paths coexist).

### Component 3 — `POST /api/images/carousel-photos` (authenticated)

New route in `echome-platform-v2/src/routes/images.ts`, with
`authenticateUser` middleware. Flow:
1. Accept `upload.single('image')` (reuse existing multer config + `handleUploadErrors`).
2. Sharp-resize to 1080×1080 (reuse the resize logic from
   `processUploadedBackground`; extract a shared helper if needed rather than
   duplicating).
3. Upload to `library/{userId}/{photoId}.jpg` in `carousel-backgrounds`.
4. Insert a `user_carousel_photos` row (`user_id` from `req.user`, `width`/
   `height` = 1080, `file_size`, `original_filename`).
5. Return `{ id, url }`. The `url` is a normal public background url, so the
   carousel compose path consumes it unchanged.

### Component 4 — `GET /api/images/carousel-photos` (authenticated)

List the caller's photos where `hidden_at IS NULL`, newest first. Returns
`{ photos: [{ id, url, original_filename, created_at }] }`.

### Component 5 — `DELETE /api/images/carousel-photos/:id` (authenticated)

Ownership-checked (`user_id = req.user.id`). Sets `hidden_at = NOW()`. Leaves
the storage object in place (soft delete). Returns 204. Diverges from B-roll's
hard delete by design — a hidden photo can be un-hidden later and is never
orphaned from a kit that still references it.

### Component 6 — Frontend api client

`echome-frontend/src/lib/api-client.ts`, add to `api.images`:
- `listCarouselPhotos()` → `GET /images/carousel-photos`
- `saveCarouselPhoto(file: File)` → `POST /images/carousel-photos` (multipart, mirrors `uploadBackground` shape but no `contentId`)
- `hideCarouselPhoto(id: string)` → `DELETE /images/carousel-photos/:id`

### Component 7 — PhotoPicker integration

`echome-frontend/src/components/content-kit/PhotoPicker.tsx`:
- **Upload (line ~114):** swap `api.images.uploadBackground(file, kitId)` for
  `api.images.saveCarouselPhoto(file)`. The returned `url` is used exactly as
  today; the photo is now also persisted.
- **Candidate assembly (lines 40–92):** add a third source after the profile
  block (line 81), before `setCandidates` (line 85): fetch
  `listCarouselPhotos()` and push each as `source: 'library'`.
- **Hide control:** a small ✕ on each `source: 'library'` thumbnail,
  confirm-on-click, calls `hideCarouselPhoto(id)` and removes it from the
  local list optimistically. Snapshot/profile sources have no hide control.

### Component 8 — One-time backfill script

`echome-platform-v2/src/scripts/backfill-carousel-photos.cjs` (committed,
not throwaway). For the 25 `uploads/{uuid}/` folders whose uuid joins
`content_kits.id`:
1. Resolve `user_id` via the kit join.
2. For each image file in the folder, insert a `user_carousel_photos` row
   with `storage_path` = existing path, `url` = existing public url,
   `hidden_at` = null. **No file move.**
3. Idempotent: skip if a row with that `storage_path` already exists.
Run once manually against prod. 14 users gain their historical photos.

## Out of scope (deferred)

- **Thread 2:** YouTube channel video download + ingestion with consent.
- **Thread 3:** Unified Dropbox-style asset library + Echo auto-pull during generation.
- B-roll uploads — left exactly as-is.
- The 238 unattributable `preview-*`/`carousel-*`/test folders — not migrated.
- The unauthenticated `/background/upload` route — left as-is for compose.

## Testing

- **Backend unit:** `POST` persists a row + returns url; `GET` returns only
  the caller's non-hidden rows (not another user's); `DELETE` sets `hidden_at`
  and leaves storage intact; ownership check rejects cross-user delete.
- **Backfill:** dry-run mode logs intended inserts; idempotent re-run inserts
  zero duplicates.
- **Frontend:** PhotoPicker shows library photos across two different kits
  (cross-kit persistence); upload adds a photo that then appears; hide removes
  it from the list.

## Risks

- **Shared resize logic:** extracting the sharp helper from
  `processUploadedBackground` must not change the existing compose path's
  output. Keep the existing function calling the extracted helper.
- **Mixed storage paths:** backfilled rows point at `uploads/`, new rows at
  `library/`. Both are valid public urls; no consumer assumes a prefix.
- **Soft-delete storage growth:** hidden photos accumulate in the bucket.
  Acceptable for v1; a future sweep can hard-delete rows hidden > N days.
