# Saved Carousel Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every carousel photo a user uploads persists, is attributed to that user, and surfaces in the PhotoPicker of every content kit; deletion is soft-hide; a one-time backfill seeds the 25 existing attributable folders.

**Architecture:** Add an authenticated triad (`POST`/`GET`/`DELETE /api/images/carousel-photos`) backed by a new `user_carousel_photos` table, mirroring the shipped B-roll-uploads pattern. The existing unauthenticated `/background/upload` route is left untouched (it serves preview/compose flows). PhotoPicker swaps its upload to the persisted endpoint, fetches the caller's saved photos as a new `library` candidate source, and exposes a per-photo hide control. A committed one-time script backfills the 25 `uploads/{kitUuid}/` folders whose uuid joins `content_kits.id`.

**Tech Stack:** Backend `echome-platform-v2` — Express/TypeScript, jest + supertest, `supabase` service-role client, sharp, multer, Supabase Storage (`carousel-backgrounds` bucket), path alias `@/`→`src/`, deployed Railway. Frontend `echome-frontend` — Next.js App Router/TS/Tailwind, vitest + @testing-library/react, deployed Vercel.

## Global Constraints

- **Two repos.** Backend tasks (1–5, 8) land in `echome-platform-v2`. Frontend tasks (6–7) land in `echome-frontend`. Each repo has its own branch, test command, and commits.
- **Never commit/push to `main`.** Both repos auto-deploy from `main` (frontend→Vercel, backend→Railway). Work on a feature branch; open a PR.
- **`images.ts` route convention:** raw `try/catch` + `next(error)`. Do NOT use `asyncHandler`/`AppError` (that is `reels.ts`'s convention, not this file's).
- **`req.user!.id`** is the userId source on authenticated routes (set by `authenticateUser` middleware). `interface AuthenticatedRequest extends Request { user?: { id: string; email?: string }; }` already declared in `images.ts`.
- **Service-role client** `import { supabase } from '../utils/supabase';` bypasses RLS. RLS stays disabled on `user_carousel_photos`; access control is enforced at the API layer (same as `user_broll_clips`).
- **Sharp `.rotate()` must be preserved** in any extracted resize helper — it applies EXIF orientation, critical for iPhone portraits. Removing it silently rotates portrait uploads.
- **Bucket:** `carousel-backgrounds`. New uploads → `library/{userId}/{photoId}.jpg`. Backfilled rows keep existing `uploads/{kitUuid}/...` paths (no file move). No consumer assumes a path prefix.
- **Slide size:** 1080×1080, `fit: 'cover'`, `position: 'center'`, `.jpeg({ quality: 85 })` — identical to existing `processUploadedBackground`.
- **MAX_UPLOAD_BYTES:** `10 * 1024 * 1024`. Allowed MIME: `image/jpeg`, `image/png`, `image/webp` (existing multer config — reuse, do not redefine).
- **api-client.ts is a SENSITIVE path.** Add methods only inside the existing `api.images` object. Do NOT touch auth/interceptor/JWT-sync logic.
- **No em dashes in user-facing copy** (PhotoPicker confirm text, labels): use periods or commas.
- **Soft-delete:** `DELETE` sets `hidden_at = NOW()`, leaves the storage object in place. Diverges from B-roll's hard delete by design.

---

### Task 1: Migration — `user_carousel_photos` table

**Files:**
- Create: `echome-platform-v2/supabase/migrations/20260618_user_carousel_photos.sql`

**Interfaces:**
- Produces: table `user_carousel_photos` with columns `id`, `user_id`, `url`, `storage_path`, `original_filename`, `file_size`, `width`, `height`, `hidden_at`, `created_at`; index `idx_user_carousel_photos_user_visible` on `(user_id, hidden_at, created_at DESC)`. Consumed by Tasks 3, 4, 5, 8.

- [ ] **Step 1: Read the reference migration**

Read `echome-platform-v2/supabase/migrations/20260418_user_broll_uploads.sql` to match column conventions, `gen_random_uuid()` usage, and the `ON DELETE CASCADE` FK style. Match its formatting.

- [ ] **Step 2: Write the migration**

Create `echome-platform-v2/supabase/migrations/20260618_user_carousel_photos.sql`:

```sql
-- Saved carousel photos: per-user persisted uploads surfaced in every kit's PhotoPicker.
-- Mirrors user_broll_clips (minus video columns) plus a soft-delete column.
-- RLS disabled by design; access control enforced at the API layer (service-role client).

CREATE TABLE IF NOT EXISTS public.user_carousel_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  original_filename TEXT,
  file_size         INTEGER NOT NULL,
  width             INTEGER,
  height            INTEGER,
  hidden_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- List query: caller's visible photos, newest first.
CREATE INDEX IF NOT EXISTS idx_user_carousel_photos_user_visible
  ON public.user_carousel_photos (user_id, hidden_at, created_at DESC);

-- Backfill idempotency lookup is by storage_path.
CREATE INDEX IF NOT EXISTS idx_user_carousel_photos_storage_path
  ON public.user_carousel_photos (storage_path);
```

- [ ] **Step 3: Write the one-shot apply script (repo convention)**

This repo has no `supabase db push` / npm migration script. Migrations apply via a one-off TS runner using `pg` `Client` + a local `.env` loader, exactly as in `src/scripts/_apply-preferences-migration.ts` (read it first). Create `echome-platform-v2/src/scripts/_apply-carousel-photos-migration.ts` modeled on it: load `.env`, connect with `ssl: { rejectUnauthorized: false }`, read `supabase/migrations/20260618_user_carousel_photos.sql`, `await c.query(sql)`, then verify via `information_schema.columns` that `user_carousel_photos` has the expected columns. Default = `--staging` only; `--prod` gated.

```typescript
// Verify block — confirm the table + key columns exist after apply.
const check = await c.query(`
  SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'user_carousel_photos'
   ORDER BY ordinal_position
`);
if (check.rows.length < 10) {
  console.error('  ✗ user_carousel_photos missing or incomplete after apply!');
  process.exit(1);
}
console.log('  ✓ user_carousel_photos columns:', check.rows.map((r) => r.column_name).join(', '));
```

- [ ] **Step 4: Apply to STAGING and confirm**

Run: `npx tsx src/scripts/_apply-carousel-photos-migration.ts --staging`
Expected: `✓ user_carousel_photos columns: id, user_id, url, storage_path, original_filename, file_size, width, height, hidden_at, created_at`.

> NOTE: prod apply (`--prod`) is a deliberate, gated operational write — do NOT run it during task execution. The migration uses `CREATE TABLE IF NOT EXISTS` so it is re-run-safe, but prod apply happens only on explicit go-ahead, same as Task 8's `--apply`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260618_user_carousel_photos.sql src/scripts/_apply-carousel-photos-migration.ts
git commit -m "feat(carousel): add user_carousel_photos table + apply script"
```

---

### Task 2: Extract shared resize helper + add `processLibraryUpload`

**Files:**
- Modify: `echome-platform-v2/src/services/image/background-service.ts`
- Test: `echome-platform-v2/tests/unit/services/background-service.test.ts` (create if absent)

**Interfaces:**
- Consumes: existing `BUCKET_NAME = 'carousel-backgrounds'`, `SLIDE_SIZE = { width: 1080, height: 1080 }`, `ensureBucketExists()` in this file.
- Produces:
  - `export async function resizeToSlide(imageBuffer: Buffer): Promise<Buffer>` — sharp pipeline `.rotate().resize(1080,1080,{fit:'cover',position:'center'}).jpeg({quality:85}).toBuffer()`.
  - `export async function processLibraryUpload(imageBuffer: Buffer, userId: string, photoId: string): Promise<{ url: string; storagePath: string; fileSize: number }>` — resizes, uploads to `library/${userId}/${photoId}.jpg`, returns the public url, the storage path, and the resized byte length. Consumed by Task 3.
  - Existing `processUploadedBackground` keeps its signature and behavior, now calling `resizeToSlide` internally.

- [ ] **Step 1: Write the failing test**

Create `echome-platform-v2/tests/unit/services/background-service.test.ts`:

```typescript
import sharp from 'sharp';
import { resizeToSlide } from '../../../src/services/image/background-service';

describe('resizeToSlide', () => {
  it('resizes any input to 1080x1080 jpeg', async () => {
    // 400x900 portrait PNG -> must come out 1080x1080 jpeg (cover crop).
    const input = await sharp({
      create: { width: 400, height: 900, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).png().toBuffer();

    const out = await resizeToSlide(input);
    const meta = await sharp(out).metadata();

    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
    expect(meta.format).toBe('jpeg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- background-service`
Expected: FAIL — `resizeToSlide` is not exported / not a function.

- [ ] **Step 3: Refactor the service**

In `echome-platform-v2/src/services/image/background-service.ts`, add the exported helper and refactor `processUploadedBackground` to use it. Add `processLibraryUpload`. Keep `.rotate()`.

```typescript
// Shared resize: applies EXIF orientation (.rotate), crops to a centered 1080x1080 jpeg.
// Both the legacy compose upload and the new persisted library upload use this — do not fork it.
export async function resizeToSlide(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize(SLIDE_SIZE.width, SLIDE_SIZE.height, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// Persisted, user-namespaced upload for the saved-photos library.
export async function processLibraryUpload(
  imageBuffer: Buffer,
  userId: string,
  photoId: string,
): Promise<{ url: string; storagePath: string; fileSize: number }> {
  await ensureBucketExists();

  const resized = await resizeToSlide(imageBuffer);
  const storagePath = `library/${userId}/${photoId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, resized, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    throw new Error(`Failed to upload library photo: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return { url: publicUrlData.publicUrl, storagePath, fileSize: resized.length };
}
```

Then change `processUploadedBackground`'s sharp pipeline so it calls `resizeToSlide(imageBuffer)` instead of inlining the chain. Leave everything else in that function (base64 return, the `uploads/${contentId}/background-${Date.now()}.jpg` path) unchanged.

> NOTE: confirm `supabase` and `sharp` are already imported at the top of this file (they are — `processUploadedBackground` uses both). Do not add duplicate imports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- background-service`
Expected: PASS (resizes to 1080x1080 jpeg).

- [ ] **Step 5: Commit**

```bash
git add src/services/image/background-service.ts tests/unit/services/background-service.test.ts
git commit -m "refactor(image): extract resizeToSlide, add processLibraryUpload"
```

---

### Task 3: `POST /api/images/carousel-photos` (authenticated, persists)

**Files:**
- Modify: `echome-platform-v2/src/routes/images.ts`
- Test: `echome-platform-v2/tests/integration/routes/carousel-photos.test.ts` (create)

**Interfaces:**
- Consumes: `authenticateUser` (already imported in `images.ts`), `upload`/`handleUploadErrors` (existing multer config in `images.ts`), `processLibraryUpload` from Task 2, `supabase` service-role client, `crypto.randomUUID()`.
- Produces: route `POST /carousel-photos` returning `201 { success: true, data: { photo: { id, url } } }`. Inserts one `user_carousel_photos` row. Consumed by frontend Task 6.

- [ ] **Step 1: Write the failing test**

Create `echome-platform-v2/tests/integration/routes/carousel-photos.test.ts`. Mirror the auth+supertest pattern from `tests/integration/routes/admin-emails-upload-image.test.ts` (real test user via `TestHelpers.createTestUser`, dynamic `import('../../../src/index')`).

```typescript
import request from 'supertest';
import { TestHelpers } from '../../utils/test-helpers';
import { supabase } from '../../../src/utils/supabase';

// Minimal 1x1 PNG (raw bytes, no FS/canvas).
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('POST /api/images/carousel-photos', () => {
  let testUser: { id: string; email: string; authToken: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  const createdPhotoIds: string[] = [];

  beforeAll(async () => {
    testUser = await TestHelpers.createTestUser();
    app = (await import('../../../src/index')).default;
  }, 40000);

  afterAll(async () => {
    if (createdPhotoIds.length) {
      await supabase.from('user_carousel_photos').delete().in('id', createdPhotoIds);
    }
    if (testUser) await TestHelpers.cleanupTestUser(testUser.id);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app)
      .post('/api/images/carousel-photos')
      .attach('image', PNG_1x1, { filename: 'p.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('persists a row and returns id + url (201)', async () => {
    const res = await request(app)
      .post('/api/images/carousel-photos')
      .set('Authorization', `Bearer ${testUser.authToken}`)
      .attach('image', PNG_1x1, { filename: 'p.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.photo.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(res.body.data.photo.url).toMatch(/^https?:\/\//);
    createdPhotoIds.push(res.body.data.photo.id);

    const { data: row } = await supabase
      .from('user_carousel_photos')
      .select('user_id, storage_path, hidden_at, width, height')
      .eq('id', res.body.data.photo.id)
      .single();
    expect(row?.user_id).toBe(testUser.id);
    expect(row?.storage_path).toBe(`library/${testUser.id}/${res.body.data.photo.id}.jpg`);
    expect(row?.hidden_at).toBeNull();
    expect(row?.width).toBe(1080);
    expect(row?.height).toBe(1080);
  });

  it('rejects a non-image with 4xx', async () => {
    const res = await request(app)
      .post('/api/images/carousel-photos')
      .set('Authorization', `Bearer ${testUser.authToken}`)
      .attach('image', Buffer.from('plain text'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- carousel-photos`
Expected: FAIL — route returns 404 (not yet defined), the 201 assertion fails.

- [ ] **Step 3: Implement the route**

In `echome-platform-v2/src/routes/images.ts`, import `processLibraryUpload` alongside the existing `processUploadedBackground` import, and add the route. Use the file's `try/catch + next(error)` convention. Place it near the other `/background/*` routes. `photoId` is generated server-side and reused as both the storage filename and the row id.

```typescript
// Authenticated, persisted carousel upload. Unlike /background/upload, this attributes
// the photo to the caller and writes a user_carousel_photos row so it surfaces in every kit.
router.post(
  '/carousel-photos',
  authenticateUser,
  handleUploadErrors(upload.single('image')),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const imageFile = req.file;
      if (!imageFile) {
        return res.status(400).json({ success: false, error: 'No image file provided' });
      }

      const photoId = crypto.randomUUID();
      const { url, storagePath, fileSize } = await processLibraryUpload(
        imageFile.buffer,
        userId,
        photoId,
      );

      const { data: row, error: insertError } = await supabase
        .from('user_carousel_photos')
        .insert({
          id: photoId,
          user_id: userId,
          url,
          storage_path: storagePath,
          original_filename: imageFile.originalname || null,
          file_size: fileSize,
          width: 1080,
          height: 1080,
        })
        .select('id, url')
        .single();

      if (insertError || !row) {
        throw new Error(`Failed to persist carousel photo: ${insertError?.message}`);
      }

      return res.status(201).json({ success: true, data: { photo: { id: row.id, url: row.url } } });
    } catch (error) {
      next(error);
    }
  },
);
```

> NOTE: confirm `crypto`, `Response`, and `NextFunction` are imported/available at the top of `images.ts`. `crypto` is a Node builtin (`import crypto from 'crypto';` if not already present). `Response`/`NextFunction` come from `express` — match how existing routes in this file type their handlers; if they use bare `(req, res, next)` without explicit types, follow that.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- carousel-photos`
Expected: PASS (401 without token; 201 persists row with correct user_id, storage_path, hidden_at null, 1080×1080; non-image rejected 4xx).

- [ ] **Step 5: Commit**

```bash
git add src/routes/images.ts tests/integration/routes/carousel-photos.test.ts
git commit -m "feat(carousel): authenticated POST /images/carousel-photos persists uploads"
```

---

### Task 4: `GET /api/images/carousel-photos` (list mine, visible only)

**Files:**
- Modify: `echome-platform-v2/src/routes/images.ts`
- Test: `echome-platform-v2/tests/integration/routes/carousel-photos.test.ts` (extend)

**Interfaces:**
- Produces: route `GET /carousel-photos` returning `200 { success: true, data: { photos: [{ id, url, original_filename, created_at }] } }`, only the caller's rows where `hidden_at IS NULL`, newest first. Consumed by frontend Tasks 6, 7.

- [ ] **Step 1: Write the failing test**

Append to `echome-platform-v2/tests/integration/routes/carousel-photos.test.ts` a `describe('GET /api/images/carousel-photos', ...)` block. Seed two rows for the test user (one visible, one hidden) and one row for a different user directly via `supabase.from('user_carousel_photos').insert(...)`, then assert the response contains only the caller's visible row.

```typescript
describe('GET /api/images/carousel-photos', () => {
  let testUser: { id: string; email: string; authToken: string };
  let otherUser: { id: string; email: string; authToken: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  const seeded: string[] = [];

  beforeAll(async () => {
    testUser = await TestHelpers.createTestUser();
    otherUser = await TestHelpers.createTestUser();
    app = (await import('../../../src/index')).default;

    const rows = [
      { user_id: testUser.id, url: 'https://x/v.jpg', storage_path: `library/${testUser.id}/v.jpg`, file_size: 1, original_filename: 'visible.jpg', hidden_at: null },
      { user_id: testUser.id, url: 'https://x/h.jpg', storage_path: `library/${testUser.id}/h.jpg`, file_size: 1, original_filename: 'hidden.jpg', hidden_at: new Date().toISOString() },
      { user_id: otherUser.id, url: 'https://x/o.jpg', storage_path: `library/${otherUser.id}/o.jpg`, file_size: 1, original_filename: 'other.jpg', hidden_at: null },
    ];
    const { data } = await supabase.from('user_carousel_photos').insert(rows).select('id');
    (data || []).forEach((r: { id: string }) => seeded.push(r.id));
  }, 40000);

  afterAll(async () => {
    if (seeded.length) await supabase.from('user_carousel_photos').delete().in('id', seeded);
    await TestHelpers.cleanupTestUser(testUser.id);
    await TestHelpers.cleanupTestUser(otherUser.id);
  });

  it('returns only the caller visible photos', async () => {
    const res = await request(app)
      .get('/api/images/carousel-photos')
      .set('Authorization', `Bearer ${testUser.authToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.photos.map((p: { original_filename: string }) => p.original_filename);
    expect(names).toContain('visible.jpg');
    expect(names).not.toContain('hidden.jpg');
    expect(names).not.toContain('other.jpg');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/images/carousel-photos');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- carousel-photos`
Expected: FAIL — GET returns 404, `res.body.data.photos` is undefined.

- [ ] **Step 3: Implement the route**

In `echome-platform-v2/src/routes/images.ts`, add below the POST:

```typescript
// List the caller's visible saved photos, newest first.
router.get(
  '/carousel-photos',
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { data, error } = await supabase
        .from('user_carousel_photos')
        .select('id, url, original_filename, created_at')
        .eq('user_id', userId)
        .is('hidden_at', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to list carousel photos: ${error.message}`);

      return res.json({ success: true, data: { photos: data || [] } });
    } catch (error) {
      next(error);
    }
  },
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- carousel-photos`
Expected: PASS (returns visible.jpg only; excludes hidden + other-user; 401 without token).

- [ ] **Step 5: Commit**

```bash
git add src/routes/images.ts tests/integration/routes/carousel-photos.test.ts
git commit -m "feat(carousel): GET /images/carousel-photos lists caller visible photos"
```

---

### Task 5: `DELETE /api/images/carousel-photos/:id` (soft-hide, ownership-checked)

**Files:**
- Modify: `echome-platform-v2/src/routes/images.ts`
- Test: `echome-platform-v2/tests/integration/routes/carousel-photos.test.ts` (extend)

**Interfaces:**
- Produces: route `DELETE /carousel-photos/:id` → `204` on success. Sets `hidden_at = NOW()` on the caller's matching row; leaves storage in place. Cross-user delete returns `404` and does not modify the row. Consumed by frontend Tasks 6, 7.

- [ ] **Step 1: Write the failing test**

Append a `describe('DELETE /api/images/carousel-photos/:id', ...)` block. Seed one row for the test user and one for another user; assert own-delete sets `hidden_at` and returns 204, cross-user delete returns 404 and leaves `hidden_at` null.

```typescript
describe('DELETE /api/images/carousel-photos/:id', () => {
  let testUser: { id: string; email: string; authToken: string };
  let otherUser: { id: string; email: string; authToken: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let ownPhotoId = '';
  let otherPhotoId = '';

  beforeAll(async () => {
    testUser = await TestHelpers.createTestUser();
    otherUser = await TestHelpers.createTestUser();
    app = (await import('../../../src/index')).default;

    const { data } = await supabase
      .from('user_carousel_photos')
      .insert([
        { user_id: testUser.id, url: 'https://x/a.jpg', storage_path: `library/${testUser.id}/a.jpg`, file_size: 1, hidden_at: null },
        { user_id: otherUser.id, url: 'https://x/b.jpg', storage_path: `library/${otherUser.id}/b.jpg`, file_size: 1, hidden_at: null },
      ])
      .select('id, user_id');
    ownPhotoId = (data || []).find((r: { user_id: string }) => r.user_id === testUser.id)!.id;
    otherPhotoId = (data || []).find((r: { user_id: string }) => r.user_id === otherUser.id)!.id;
  }, 40000);

  afterAll(async () => {
    await supabase.from('user_carousel_photos').delete().in('id', [ownPhotoId, otherPhotoId]);
    await TestHelpers.cleanupTestUser(testUser.id);
    await TestHelpers.cleanupTestUser(otherUser.id);
  });

  it('soft-hides the caller own photo (204) and sets hidden_at', async () => {
    const res = await request(app)
      .delete(`/api/images/carousel-photos/${ownPhotoId}`)
      .set('Authorization', `Bearer ${testUser.authToken}`);
    expect(res.status).toBe(204);

    const { data: row } = await supabase
      .from('user_carousel_photos')
      .select('hidden_at')
      .eq('id', ownPhotoId)
      .single();
    expect(row?.hidden_at).not.toBeNull();
  });

  it('returns 404 on cross-user delete and leaves the row visible', async () => {
    const res = await request(app)
      .delete(`/api/images/carousel-photos/${otherPhotoId}`)
      .set('Authorization', `Bearer ${testUser.authToken}`);
    expect(res.status).toBe(404);

    const { data: row } = await supabase
      .from('user_carousel_photos')
      .select('hidden_at')
      .eq('id', otherPhotoId)
      .single();
    expect(row?.hidden_at).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- carousel-photos`
Expected: FAIL — DELETE returns 404 for own photo too (route undefined), `hidden_at` stays null.

- [ ] **Step 3: Implement the route**

In `echome-platform-v2/src/routes/images.ts`, add below the GET. The ownership check is the `.eq('user_id', userId)` on the update plus a returned-row check; if no row matches (wrong owner or unknown id), return 404.

```typescript
// Soft-hide: ownership-checked, sets hidden_at, leaves the storage object in place.
router.delete(
  '/carousel-photos/:id',
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const photoId = req.params.id;

      const { data: updated, error } = await supabase
        .from('user_carousel_photos')
        .update({ hidden_at: new Date().toISOString() })
        .eq('id', photoId)
        .eq('user_id', userId)
        .is('hidden_at', null)
        .select('id');

      if (error) throw new Error(`Failed to hide carousel photo: ${error.message}`);
      if (!updated || updated.length === 0) {
        return res.status(404).json({ success: false, error: 'Photo not found' });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
```

> NOTE: the `.is('hidden_at', null)` guard makes a repeat delete of an already-hidden photo return 404 (idempotent-safe; nothing to re-hide). This is acceptable — the frontend removes the photo from the list optimistically on first delete, so a second delete never fires.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- carousel-photos`
Expected: PASS (own delete 204 + hidden_at set; cross-user 404 + row untouched).

- [ ] **Step 5: Commit**

```bash
git add src/routes/images.ts tests/integration/routes/carousel-photos.test.ts
git commit -m "feat(carousel): DELETE /images/carousel-photos/:id soft-hides, ownership-checked"
```

---

### Task 6: Frontend api-client methods

**Files:**
- Modify: `echome-frontend/src/lib/api-client.ts` (SENSITIVE — add to `api.images` only)
- Test: `echome-frontend/src/lib/carousel-photos-api.test.ts` (create)

**Interfaces:**
- Consumes: existing `apiClient` axios instance and `ApiResponse<T>` type already used by `uploadBackground`.
- Produces, inside `api.images`:
  - `listCarouselPhotos(): Promise<ApiResponse<{ photos: CarouselPhoto[] }>>` where `CarouselPhoto = { id: string; url: string; original_filename: string | null; created_at: string }`.
  - `saveCarouselPhoto(image: File): Promise<ApiResponse<{ photo: { id: string; url: string } }>>`.
  - `hideCarouselPhoto(id: string): Promise<void>`.
  Consumed by Task 7.

- [ ] **Step 1: Write the failing test**

Create `echome-frontend/src/lib/carousel-photos-api.test.ts`. Mock the underlying axios instance the same way existing api-client tests in this repo do (check a sibling `*.test.ts` near `api-client.ts` for the established mock shape; if none exists, mock `axios` default export's `.create()` to return an object with `get/post/delete` vi.fn()s, matching how `apiClient` is constructed).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const get = vi.fn();
const del = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: () => ({
      post, get, delete: del,
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }),
  },
}));

// Imported after the mock so apiClient is built on the mocked axios.
import { api } from './api-client';

describe('api.images carousel photos', () => {
  beforeEach(() => { post.mockReset(); get.mockReset(); del.mockReset(); });

  it('saveCarouselPhoto posts multipart to /images/carousel-photos', async () => {
    post.mockResolvedValue({ data: { success: true, data: { photo: { id: 'p1', url: 'https://x/p1.jpg' } } } });
    const file = new File([new Uint8Array([1, 2, 3])], 'x.jpg', { type: 'image/jpeg' });

    const out = await api.images.saveCarouselPhoto(file);

    expect(post).toHaveBeenCalledWith(
      '/images/carousel-photos',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(out.data?.photo.id).toBe('p1');
  });

  it('listCarouselPhotos gets /images/carousel-photos', async () => {
    get.mockResolvedValue({ data: { success: true, data: { photos: [{ id: 'p1', url: 'u', original_filename: null, created_at: 't' }] } } });
    const out = await api.images.listCarouselPhotos();
    expect(get).toHaveBeenCalledWith('/images/carousel-photos');
    expect(out.data?.photos).toHaveLength(1);
  });

  it('hideCarouselPhoto deletes /images/carousel-photos/:id', async () => {
    del.mockResolvedValue({ status: 204 });
    await api.images.hideCarouselPhoto('p1');
    expect(del).toHaveBeenCalledWith('/images/carousel-photos/p1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/carousel-photos-api.test.ts`
Expected: FAIL — `api.images.saveCarouselPhoto is not a function`.

- [ ] **Step 3: Add the methods**

In `echome-frontend/src/lib/api-client.ts`, inside the existing `api.images` object (next to `uploadBackground`), add the three methods. Model `saveCarouselPhoto` on `uploadBackground` (same multipart shape, no `contentId`). Define the `CarouselPhoto` type near the other api-client types.

```typescript
// Saved carousel photos (persisted, per-user, surfaced in every kit's PhotoPicker).
export interface CarouselPhoto {
  id: string;
  url: string;
  original_filename: string | null;
  created_at: string;
}

// ...inside api.images: {
  saveCarouselPhoto: async (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    const response = await apiClient.post<ApiResponse<{ photo: { id: string; url: string } }>>(
      '/images/carousel-photos',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 },
    );
    return response.data;
  },

  listCarouselPhotos: async () => {
    const response = await apiClient.get<ApiResponse<{ photos: CarouselPhoto[] }>>(
      '/images/carousel-photos',
    );
    return response.data;
  },

  hideCarouselPhoto: async (id: string) => {
    await apiClient.delete(`/images/carousel-photos/${id}`);
  },
// }
```

> NOTE: place `CarouselPhoto` wherever exported types live in this file (do not nest it inside the object). Do NOT touch the interceptor/JWT-sync logic — methods only.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/carousel-photos-api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-client.ts src/lib/carousel-photos-api.test.ts
git commit -m "feat(carousel): api-client save/list/hide carousel photo methods"
```

---

### Task 7: PhotoPicker integration — persist upload, library source, hide control

**Files:**
- Modify: `echome-frontend/src/components/content-kit/PhotoPicker.tsx`
- Test: `echome-frontend/src/components/content-kit/PhotoPicker.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `api.images.saveCarouselPhoto`, `api.images.listCarouselPhotos`, `api.images.hideCarouselPhoto` from Task 6; existing `PhotoCandidate` interface.
- Produces: PhotoPicker that (1) uploads via the persisted endpoint, (2) shows the caller's saved photos as `source: 'library'` candidates fetched on mount, (3) renders a hide ✕ on library candidates that calls `hideCarouselPhoto` and removes the photo optimistically.

- [ ] **Step 1: Write the failing test**

Create `echome-frontend/src/components/content-kit/PhotoPicker.test.tsx`. Mock `api.images`. Match this repo's component-test idiom (`render`/`screen` from `@testing-library/react`, `userEvent`, `vi`, as in `ClipCleanBanner.test.tsx`).

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotoPicker } from './PhotoPicker';

const listCarouselPhotos = vi.fn();
const hideCarouselPhoto = vi.fn();
const saveCarouselPhoto = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: { images: { listCarouselPhotos: (...a: unknown[]) => listCarouselPhotos(...a), hideCarouselPhoto: (...a: unknown[]) => hideCarouselPhoto(...a), saveCarouselPhoto: (...a: unknown[]) => saveCarouselPhoto(...a) } },
}));

// Minimal props for the picker; match the component's real required props.
const baseProps = { kitId: 'kit-1', onSelect: vi.fn(), snapshots: [], profileImageUrl: null };

describe('PhotoPicker library photos', () => {
  beforeEach(() => { listCarouselPhotos.mockReset(); hideCarouselPhoto.mockReset(); saveCarouselPhoto.mockReset(); });

  it('renders saved library photos fetched on mount', async () => {
    listCarouselPhotos.mockResolvedValue({ success: true, data: { photos: [
      { id: 'p1', url: 'https://x/p1.jpg', original_filename: 'beach.jpg', created_at: 't' },
    ] } });

    render(<PhotoPicker {...baseProps} />);

    await waitFor(() => expect(screen.getByAltText(/beach.jpg|saved photo/i)).toBeInTheDocument());
  });

  it('hides a library photo on confirm and removes it from the list', async () => {
    listCarouselPhotos.mockResolvedValue({ success: true, data: { photos: [
      { id: 'p1', url: 'https://x/p1.jpg', original_filename: 'beach.jpg', created_at: 't' },
    ] } });
    hideCarouselPhoto.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<PhotoPicker {...baseProps} />);
    const img = await screen.findByAltText(/beach.jpg|saved photo/i);

    await userEvent.click(screen.getByRole('button', { name: /remove saved photo|hide/i }));

    await waitFor(() => expect(hideCarouselPhoto).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(img).not.toBeInTheDocument());
  });
});
```

> NOTE: adjust `baseProps` to PhotoPicker's actual required prop names before running. Read the component's `interface ...Props` first and set them exactly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/content-kit/PhotoPicker.test.tsx`
Expected: FAIL — no library photos render; no remove button exists.

- [ ] **Step 3: Implement the integration**

In `echome-frontend/src/components/content-kit/PhotoPicker.tsx`:

1. Extend the candidate type: `source: 'snapshot' | 'profile' | 'upload' | 'library'`, and carry the photo id on library candidates (add an optional `photoId?: string` field to `PhotoCandidate`).

2. **Upload swap (line ~114):** replace
```typescript
const resp = await api.images.uploadBackground(file, kitId);
```
with
```typescript
const resp = await api.images.saveCarouselPhoto(file);
```
The success path still reads the returned url; adjust the property access to `resp.data?.photo?.url` (the new shape). Keep the existing `MAX_FILE_SIZE` / accept-type guards unchanged.

3. **Library source fetch:** in the candidate-assembly `useEffect` (after the profile block, before `setCandidates`), fetch saved photos and push them. Since the existing effect is synchronous over `snapshots`/`profile`, fetch in a separate `useEffect` on mount and merge into state:
```typescript
const [libraryPhotos, setLibraryPhotos] = useState<PhotoCandidate[]>([]);

useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const resp = await api.images.listCarouselPhotos();
      if (cancelled) return;
      const mapped = (resp.data?.photos || []).map((p) => ({
        url: p.url,
        label: p.original_filename || 'Saved photo',
        source: 'library' as const,
        photoId: p.id,
      }));
      setLibraryPhotos(mapped);
    } catch {
      // Library fetch is best-effort; picker still works with snapshot/profile/upload.
    }
  })();
  return () => { cancelled = true; };
}, []);
```
Then include `libraryPhotos` where the final candidate list is composed (concatenate after profile candidates, before render).

4. **Hide control:** on each candidate where `source === 'library'`, render a small ✕ button. Use periods/commas in copy, no em dashes.
```tsx
{candidate.source === 'library' && (
  <button
    type="button"
    aria-label="Remove saved photo"
    className="absolute top-1 right-1 rounded-full bg-black/60 text-white w-5 h-5 flex items-center justify-center text-xs"
    onClick={async (e) => {
      e.stopPropagation();
      if (!candidate.photoId) return;
      if (!window.confirm('Remove this saved photo? It stays in any kit already using it.')) return;
      const removedId = candidate.photoId;
      setLibraryPhotos((prev) => prev.filter((p) => p.photoId !== removedId));
      try {
        await api.images.hideCarouselPhoto(removedId);
      } catch {
        // Re-fetch on failure so the list reflects server truth.
        const resp = await api.images.listCarouselPhotos();
        setLibraryPhotos((resp.data?.photos || []).map((p) => ({
          url: p.url, label: p.original_filename || 'Saved photo', source: 'library' as const, photoId: p.id,
        })));
      }
    }}
  >
    ✕
  </button>
)}
```

> NOTE: read the component's existing JSX to place the ✕ inside the per-candidate wrapper (it must be `position: relative` for `absolute` to anchor — add `relative` to the wrapper class if absent). Newly uploaded photos appear after the next `listCarouselPhotos` refresh or you may push the returned `{id,url}` into `libraryPhotos` directly in the upload success path for instant feedback.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/content-kit/PhotoPicker.test.tsx`
Expected: PASS (renders library photo; hide removes it + calls `hideCarouselPhoto('p1')`).

- [ ] **Step 5: Run the full frontend suite (no regressions in PhotoPicker consumers)**

Run: `npx vitest run src/components/content-kit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/content-kit/PhotoPicker.tsx src/components/content-kit/PhotoPicker.test.tsx
git commit -m "feat(carousel): PhotoPicker persists uploads, shows saved library, hide control"
```

---

### Task 8: One-time backfill script (committed)

**Files:**
- Create: `echome-platform-v2/src/scripts/_backfill-carousel-photos.ts`

**Interfaces:**
- Consumes: the repo's existing service-role client `import { supabase } from '../utils/supabase';` (has both `.from()` and `.storage` — confirm the import path/name by reading `src/utils/supabase.ts`), bucket `carousel-backgrounds`, table `content_kits` (join on `id`), table `user_carousel_photos`. Follows the `_<name>.ts` one-off-script convention (see siblings like `_backfill-null-clip-thumbs.ts`).
- Produces: a runnable script with `--dry-run` (default) and `--apply` modes. For each `uploads/{uuid}/` folder whose `{uuid}` matches a `content_kits.id`, inserts a `user_carousel_photos` row per image file with `storage_path` = existing path, `url` = existing public url, `hidden_at = null`. Idempotent on `storage_path`. Run via `npx tsx`.

- [ ] **Step 1: Read a reference script + the supabase client export**

Read one existing `echome-platform-v2/src/scripts/_backfill-*.ts` to copy the `_<name>.ts` convention and run style (`npx tsx src/scripts/<name>.ts`). Read `src/utils/supabase.ts` to confirm the exported client name (`supabase`) and that it is a service-role client with `.storage`. Match both exactly.

- [ ] **Step 2: Write the script**

Create `echome-platform-v2/src/scripts/_backfill-carousel-photos.ts`:

```typescript
/**
 * One-time backfill: seed user_carousel_photos from the 25 attributable
 * uploads/{kitUuid}/ folders in the carousel-backgrounds bucket.
 *
 * Attribution: folder name is a content_kits.id; that kit's user_id owns the photo.
 * No file move. Idempotent on storage_path. Default is dry-run.
 *
 * Usage:
 *   npx tsx src/scripts/_backfill-carousel-photos.ts            # dry-run (default)
 *   npx tsx src/scripts/_backfill-carousel-photos.ts --apply    # write rows
 */
import { supabase } from '../utils/supabase';

const BUCKET = 'carousel-backgrounds';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(`[backfill] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  // 1. List top-level folders under uploads/.
  const { data: topLevel, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list('uploads', { limit: 1000 });
  if (listErr) throw new Error(`list uploads/ failed: ${listErr.message}`);

  const uuidFolders = (topLevel || [])
    .filter((e) => e.id === null || e.metadata === null) // folders, not files
    .map((e) => e.name)
    .filter((name) => UUID_RE.test(name));
  console.log(`[backfill] uuid-shaped folders under uploads/: ${uuidFolders.length}`);

  // 2. Resolve which uuids are real content_kits, and their owners.
  const { data: kits, error: kitErr } = await supabase
    .from('content_kits')
    .select('id, user_id')
    .in('id', uuidFolders);
  if (kitErr) throw new Error(`content_kits lookup failed: ${kitErr.message}`);

  const ownerByKit = new Map((kits || []).map((k) => [k.id, k.user_id]));
  console.log(`[backfill] attributable folders: ${ownerByKit.size} / ${uuidFolders.length}`);

  let intended = 0;
  let inserted = 0;
  let skipped = 0;

  // 3. Per attributable folder, per image file, build + (maybe) insert a row.
  for (const [kitId, userId] of ownerByKit.entries()) {
    const { data: files, error: filesErr } = await supabase.storage
      .from(BUCKET)
      .list(`uploads/${kitId}`, { limit: 1000 });
    if (filesErr) {
      console.warn(`[backfill] skip ${kitId}: list failed (${filesErr.message})`);
      continue;
    }

    for (const file of files || []) {
      if (!file.name || file.id === null) continue; // skip nested folders
      if (!/\.(jpe?g|png|webp)$/i.test(file.name)) continue;

      const storagePath = `uploads/${kitId}/${file.name}`;
      intended += 1;

      // Idempotency: skip if a row with this storage_path already exists.
      const { data: existing } = await supabase
        .from('user_carousel_photos')
        .select('id')
        .eq('storage_path', storagePath)
        .limit(1);
      if (existing && existing.length) {
        skipped += 1;
        continue;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      if (!APPLY) {
        console.log(`[dry-run] would insert: user=${userId} path=${storagePath}`);
        continue;
      }

      const { error: insErr } = await supabase.from('user_carousel_photos').insert({
        user_id: userId,
        url: pub.publicUrl,
        storage_path: storagePath,
        original_filename: file.name,
        file_size: file.metadata && file.metadata.size ? file.metadata.size : 0,
        hidden_at: null,
      });
      if (insErr) {
        console.warn(`[backfill] insert failed ${storagePath}: ${insErr.message}`);
        continue;
      }
      inserted += 1;
    }
  }

  console.log(`[backfill] intended=${intended} inserted=${inserted} skipped(existing)=${skipped}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Dry-run against prod (read-only — no `--apply`)**

Run: `npx tsx src/scripts/_backfill-carousel-photos.ts`
Expected: logs `mode: DRY-RUN`, `attributable folders: 25 / ...` (the audit found 25 across 14 users), and one `[dry-run] would insert` line per image file. Zero writes.

- [ ] **Step 4: Verify idempotency logic via a re-run after apply (manual, deliberate)**

This step runs only when you are ready to seed prod. Run apply once, then run apply again; the second run must insert zero.

Run: `npx tsx src/scripts/_backfill-carousel-photos.ts --apply`
Then: `npx tsx src/scripts/_backfill-carousel-photos.ts --apply`
Expected: first run `inserted=N skipped(existing)=0`; second run `inserted=0 skipped(existing)=N`.

> NOTE: Step 4's apply is a deliberate prod write — run it only with explicit go-ahead. The committed script and the dry-run (Step 3) are the deliverable; the apply is an operational action, not part of CI.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/_backfill-carousel-photos.ts
git commit -m "feat(carousel): one-time backfill script for attributable upload folders"
```

---

## Cross-repo PR sequencing

Backend (`echome-platform-v2`) Tasks 1–5 + 8 must merge and deploy to Railway **before** the frontend (`echome-frontend`) Task 7 reaches users, or PhotoPicker will call endpoints that 404 in prod. Open both PRs; merge backend first, confirm the route is live, then merge frontend. Task 6 (api-client methods) is inert until Task 7 wires them, so it can ride in the frontend PR safely.

## Self-Review

**1. Spec coverage:**
- Component 1 (table) → Task 1 ✅
- Component 2 (storage layout `library/{userId}/{photoId}.jpg`) → Task 2 (`processLibraryUpload`) ✅
- Component 3 (POST) → Task 3 ✅
- Component 4 (GET) → Task 4 ✅
- Component 5 (DELETE soft-hide) → Task 5 ✅
- Component 6 (api-client) → Task 6 ✅
- Component 7 (PhotoPicker upload swap + library source + hide ✕) → Task 7 ✅
- Component 8 (backfill script, idempotent, dry-run) → Task 8 ✅
- Spec "Testing" bullets (POST persists, GET excludes hidden + other-user, DELETE sets hidden_at + leaves storage, ownership rejects cross-user, backfill dry-run + idempotent, frontend cross-kit/upload/hide) → covered by Tasks 3/4/5/7/8 tests ✅
- Spec Risk "keep existing function calling the extracted helper" → Task 2 keeps `processUploadedBackground` calling `resizeToSlide` ✅

**2. Placeholder scan:** No TBD/TODO/"add validation"/"similar to Task N". Every code step shows full code. Three NOTE blocks flag verify-then-match points (env var names, import presence, actual prop names) rather than leaving logic unspecified.

**3. Type consistency:** `CarouselPhoto` shape `{ id, url, original_filename, created_at }` is identical in Task 4 (GET response), Task 6 (type def), Task 7 (mapping). POST returns `{ photo: { id, url } }` consistently in Tasks 3, 6, 7. `processLibraryUpload` return `{ url, storagePath, fileSize }` defined in Task 2, consumed in Task 3. `hideCarouselPhoto(id)` signature consistent across Tasks 6, 7.
