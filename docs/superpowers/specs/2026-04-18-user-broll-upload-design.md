# User B-Roll Upload — Design Spec

**Goal:** Let users upload their own video clips to use as B-Roll backgrounds in the reel editor, alongside the curated library.

**Scope:** Upload, store, thumbnail, display, delete. Private to the uploading user. No categorization — all user clips appear under "My Clips".

---

## Database

New table: `user_broll_clips`

```sql
CREATE TABLE user_broll_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,                -- Public URL to video in reels bucket
  thumbnail_url TEXT NOT NULL,      -- Public URL to generated thumbnail
  storage_path TEXT NOT NULL,       -- Storage path for cleanup on delete
  thumbnail_path TEXT NOT NULL,     -- Storage path for thumbnail cleanup
  original_filename TEXT,           -- Original upload filename
  file_size INTEGER NOT NULL,       -- Bytes
  duration REAL,                    -- Seconds (extracted by FFmpeg)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_broll_user ON user_broll_clips(user_id);
```

RLS disabled (backend uses service_role key, access control at API layer):
```sql
ALTER TABLE user_broll_clips DISABLE ROW LEVEL SECURITY;
```

---

## Backend API

Three endpoints on the existing reels router:

### `POST /api/reels/broll-uploads`

Request: `multipart/form-data` with a `file` field (MP4/MOV/WebM, max 50MB).

Processing:
1. Validate file type and size (reject > 50MB)
2. Upload video to `reels` bucket at path `{userId}/broll-uploads/{clipId}.mp4`
3. Probe duration with FFmpeg (`ffprobe`). Reject if > 60 seconds.
4. Extract thumbnail at 1-second mark (480x480, JPEG) via FFmpeg
5. Upload thumbnail to `reels` bucket at `{userId}/broll-uploads/{clipId}-thumb.jpg`
6. Insert row into `user_broll_clips`
7. Return the clip data

Response:
```json
{
  "success": true,
  "data": {
    "clip": {
      "id": "uuid",
      "url": "https://...mp4",
      "thumbnailUrl": "https://...thumb.jpg",
      "category": "My Clips",
      "label": "original-filename.mp4"
    }
  }
}
```

### `GET /api/reels/broll-uploads`

Returns all clips for the authenticated user. No pagination needed (users won't have hundreds).

Response matches the `BRollClip` interface — `id`, `url`, `thumbnailUrl`, `category: "My Clips"`, `label`.

### `DELETE /api/reels/broll-uploads/:id`

1. Verify ownership (user_id matches auth user)
2. Delete video and thumbnail from storage
3. Delete database row
4. Return success

---

## Frontend Changes

### BRollStrip

- Accept a new prop: `onUpload: (file: File) => void`
- When `onUpload` is provided, render a "+" button as the first item in the thumbnail row
- The "+" button opens a file input (hidden `<input type="file">`)
- During upload, the "+" button shows a spinner
- "My Clips" tab appears in category tabs when user has uploaded clips

### ReelEditorModal

- On mount, fetch both `getBRollLibrary()` and `getUserBrollClips()` in parallel
- Merge results: user clips get `category: "My Clips"`, prepended to clips array
- `"My Clips"` prepended to categories array (only if user has clips or upload is in progress)
- New `handleBrollUpload(file: File)` function:
  1. Call `api.brollReels.uploadClip(file)` (new API client method)
  2. On success, add the returned clip to state
  3. Auto-select the newly uploaded clip
- Pass `onUpload={handleBrollUpload}` to BRollStrip

### API Client

Add to `api.brollReels`:
```typescript
uploadClip: async (file: File) => { /* POST multipart to /reels/broll-uploads */ },
getUserClips: async () => { /* GET /reels/broll-uploads */ },
deleteClip: async (clipId: string) => { /* DELETE /reels/broll-uploads/:id */ },
```

---

## Storage

- **Bucket:** `reels` (existing, public, 500MB limit)
- **Video path:** `{userId}/broll-uploads/{clipId}.mp4`
- **Thumbnail path:** `{userId}/broll-uploads/{clipId}-thumb.jpg`
- **Existing policies** cover authenticated upload, public read, owner delete

---

## Constraints

- Max file size: 50MB (validated on backend, not bucket-level)
- Max duration: 60 seconds (validated via FFmpeg probe after upload)
- Accepted formats: MP4, MOV, WebM
- No categorization — all uploads are "My Clips"
- Private to uploader — no sharing, no team visibility
- No limit on number of uploads (reasonable given 50MB cap)

---

## What This Does NOT Include

- Team sharing of uploaded clips
- AI-generated B-Roll from prompts
- Clip trimming or editing after upload
- Category/tag management
- Drag-and-drop upload (file picker only, via "+" button)

---

## File Summary

**Backend (echome-platform-v2):**
| File | Change |
|------|--------|
| `supabase/migrations/20260418_user_broll_uploads.sql` | **New** — table, RLS disabled |
| `src/routes/reels.ts` | Add 3 endpoints (POST/GET/DELETE broll-uploads) |

**Frontend (echome-frontend):**
| File | Change |
|------|--------|
| `src/components/reels/BRollStrip.tsx` | Add "+" upload button, `onUpload` prop |
| `src/components/reels/ReelEditorModal.tsx` | Fetch + merge user clips, handle upload |
| `src/lib/api-client.ts` | Add `uploadClip`, `getUserClips`, `deleteClip` methods |
