# Echo Video-URL Destination Fork + Channel Clip-Stockpile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the Echo create chat receives a video URL, present a two-button destination fork (no auto-classify); add a channel "stockpile" mode that saves one `video_uploads` row per channel video so the user can clip them later.

**Architecture:** Backend (`echome-platform-v2`, Express/TS, Railway) adds a `saved` enum value, a `stockpileChannel` service method that reuses the existing `getChannelVideos` SociaVault call, and two auth-gated routes. Frontend (`echome-frontend`, Next.js/TS, Vercel) adds single-vs-channel URL detection, two additive api-client methods, a destination fork in the Echo confirm step, and an inline saved-videos strip. No new media storage, no new clip logic: stockpiled rows are clipped through the existing `clipFinderService.processVideo` entry.

**Tech Stack:** Backend — Express, TypeScript, Supabase (Postgres), Jest + supertest. Frontend — Next.js App Router, React, TypeScript, Vitest + @testing-library/react.

## Global Constraints

- **Two repos, branch + PR each — never push `main`.** Frontend → Vercel, backend → Railway auto-deploy on push to main.
- **Backend ships first:** backend PR (Tasks 1-3) merges and deploys to Railway *before* the frontend PR (Tasks 4-7) reaches users, or the fork's buttons call routes that 404 in prod.
- **No em dashes** in any user-facing copy (button labels, thread messages, toasts, receipts). Use periods or commas.
- **Sensitive paths — additive only, never alter auth/interceptor/JWT-sync logic:** frontend `src/lib/api-client.ts` (add methods only), `src/app/auth/`, `src/app/app/admin/`, billing/subscription components; backend auth/admin/billing.
- **Reuse, do not rebuild:** stockpile = `video_uploads` rows + the existing clip pipeline (`api.clips.upload` / `api.clips.process` / `clipFinderService.processVideo`). No new media storage, no parallel video store.
- **`maxVideos` default stays 20** (matches existing channel import). The inline strip's "no pagination" design depends on this cap.
- **`video_uploads` has no `title`/`thumbnail` column.** Store title in `metadata.title` (the JSONB added by `20260416_video_uploads_metadata.sql`). `getChannelVideos` returns only `{ id, url, title }`, so no thumbnail is available; the strip is title-only.
- **Migration is its own file, runs before any code references `saved`** (`ALTER TYPE ... ADD VALUE` cannot be used in the same transaction that references the new value). Apply to staging first; prod apply is a gated operational action requiring explicit go-ahead.
- **Commit trailer:** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

**Backend (`echome-platform-v2`):**
- `supabase/migrations/20260619_video_uploads_saved_status.sql` (create) — add `saved` enum value.
- `src/scripts/_apply-saved-status-migration.ts` (create) — staging apply + verify, mirrors `_apply-carousel-photos-migration.ts`.
- `src/services/kb-content/youtube-service.ts` (modify) — add `stockpileChannel` method on `YouTubeService`.
- `src/routes/kb-content.ts` (modify) — add `POST /channel/stockpile` and `GET /videos/saved`.
- `tests/unit/youtube-stockpile.test.ts` (create) — unit test for `stockpileChannel`.
- `tests/integration/channel-stockpile.test.ts` (create) — route auth + shape tests.

**Frontend (`echome-frontend`):**
- `src/lib/url-platform.ts` (modify) — add `detectVideoUrlTarget`.
- `src/lib/url-platform.test.ts` (create) — detection tests.
- `src/lib/api-client.ts` (modify) — add `startChannelStockpile`, `listSavedVideos` to `kbContent`.
- `src/components/echo/useEcho.ts` (modify) — `videoUrlTarget`/`savedVideos`/`savedCount` state, `chooseDestination`, `clipSavedVideo`.
- `src/components/echo/EchoExchange.tsx` (modify) — destination fork (replaces intent chips for video URLs) + inline saved-videos strip.
- `src/components/echo/EchoHero.tsx` (modify) — pass the new handlers through.
- `src/components/echo/EchoExchange.fork.test.tsx` (create) — fork + strip render/wiring tests.
- `src/components/echo/useEcho.fork.test.ts` (create) — `chooseDestination` routing test.

---

# BACKEND (echome-platform-v2) — merge + deploy to Railway first

All backend tasks run in `/Users/aramammo/Side Quests/echome-platform-v2`. Create a branch first: `git checkout -b feat/channel-stockpile`.

### Task 1: Migration — add `saved` to `video_processing_status`

**Files:**
- Create: `echome-platform-v2/supabase/migrations/20260619_video_uploads_saved_status.sql`
- Create: `echome-platform-v2/src/scripts/_apply-saved-status-migration.ts`

**Interfaces:**
- Produces: the enum value `'saved'` on type `video_processing_status`, consumed by Task 2's insert (`status: 'saved'`) and Task 3's `GET /videos/saved` filter.

- [ ] **Step 1: Write the migration**

Create `echome-platform-v2/supabase/migrations/20260619_video_uploads_saved_status.sql`:

```sql
-- Add 'saved' to video_processing_status for stockpiled channel videos.
-- A 'saved' row is a source video with no media download / no transcription;
-- it is clipped later via clipFinderService.processVideo, which transitions it
-- saved -> transcribing -> ... -> completed exactly like a freshly-pasted URL.
--
-- Own migration: Postgres forbids ALTER TYPE ... ADD VALUE in the same
-- transaction that then references the new value, so this value must land and
-- deploy before any code inserts status='saved' (Task 2).
ALTER TYPE video_processing_status ADD VALUE IF NOT EXISTS 'saved';
```

- [ ] **Step 2: Write the staging apply + verify script**

Create `echome-platform-v2/src/scripts/_apply-saved-status-migration.ts` (mirrors the structure of the existing `src/scripts/_apply-carousel-photos-migration.ts`):

```typescript
/**
 * One-shot: apply 20260619_video_uploads_saved_status.sql to staging.
 *
 * Idempotent (ADD VALUE IF NOT EXISTS), safe to re-run. Verifies the 'saved'
 * label exists on video_processing_status after apply.
 *
 * Pass --staging (default) to apply to staging; --prod is gated and not run here.
 */
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(file: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

async function apply(label: string, connectionString: string) {
  console.log(`\n=== Applying to ${label} ===`);
  const c = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260619_video_uploads_saved_status.sql'),
    'utf8',
  );
  await c.query(sql);
  console.log('  ✓ Migration executed');

  const check = await c.query(`
    SELECT 1 FROM pg_enum
     WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'video_processing_status')
       AND enumlabel = 'saved'
  `);
  if (check.rows.length !== 1) {
    console.error("  ✗ 'saved' label missing from video_processing_status after apply!");
    process.exit(1);
  }
  console.log("  ✓ 'saved' present on video_processing_status");

  await c.end();
}

(async () => {
  const env = loadEnv(path.join(process.cwd(), '.env'));
  const args = process.argv.slice(2);
  const doStaging = args.length === 0 || args.includes('--staging');
  const doProd = args.includes('--prod');

  if (doProd) {
    console.error('FATAL: --prod apply is gated. Run only on explicit human go-ahead.');
    process.exit(1);
  }
  if (doStaging) {
    if (!env.SUPABASE_DATABASE_URL_STAGING) throw new Error('SUPABASE_DATABASE_URL_STAGING missing');
    await apply('STAGING', env.SUPABASE_DATABASE_URL_STAGING);
  }
  console.log('\nDone.');
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
```

- [ ] **Step 3: Apply to staging and verify**

Run: `cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx tsx src/scripts/_apply-saved-status-migration.ts`
Expected output ends with:
```
  ✓ Migration executed
  ✓ 'saved' present on video_processing_status

Done.
```
If `SUPABASE_DATABASE_URL_STAGING` is absent, STOP and ask the human for the staging connection string — do not apply to prod.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260619_video_uploads_saved_status.sql src/scripts/_apply-saved-status-migration.ts
git commit -m "feat(stockpile): add 'saved' video_processing_status + staging apply script

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `stockpileChannel` service method

**Files:**
- Modify: `echome-platform-v2/src/services/kb-content/youtube-service.ts`
- Test: `echome-platform-v2/tests/unit/youtube-stockpile.test.ts`

**Interfaces:**
- Consumes: existing private methods on `YouTubeService` — `parseYouTubeUrl(url): { type: 'video' | 'channel' | 'playlist'; identifier: string; videoId?: string }` and `getChannelVideos(identifier: string, maxVideos: number): Promise<Array<{ id: string; url: string; title: string }>>`; the module-level `supabase` client; the `'saved'` enum from Task 1.
- Produces: `stockpileChannel(url: string, userId: string, knowledgeBaseId?: string): Promise<{ savedCount: number; skippedCount: number; videos: Array<{ uploadId: string; sourceUrl: string; title: string }> }>` — consumed by Task 3's route.

- [ ] **Step 1: Write the failing test**

Create `echome-platform-v2/tests/unit/youtube-stockpile.test.ts`. First read the top of `src/services/kb-content/youtube-service.ts` to confirm the export (class `YouTubeService` and how it imports `supabase` and `sociaVault`), then mock those modules. NOTE: confirm the exact import paths for `supabase` and the SociaVault client by reading the file's imports, and match them in the `jest.mock` calls below.

```typescript
// Mock the supabase client and the SociaVault client this service imports.
// NOTE: adjust the two mock paths to match youtube-service.ts's actual imports.
const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockInsertSelect = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: mockInsertSelect }));
const mockSelectChain = {
  eq: jest.fn(function (this: any) { return this; }),
  is: jest.fn(function (this: any) { return this; }),
  maybeSingle: mockMaybeSingle,
};
const mockSelect = jest.fn(() => mockSelectChain);
const mockFrom = jest.fn(() => ({ select: mockSelect, insert: mockInsert }));

jest.mock('../../src/utils/supabase', () => ({ supabase: { from: mockFrom } }));

import { YouTubeService } from '../../src/services/kb-content/youtube-service';

describe('YouTubeService.stockpileChannel', () => {
  let service: YouTubeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new YouTubeService();
    // No existing rows by default.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    // Each insert returns a fresh row id.
    let n = 0;
    mockSingle.mockImplementation(() => Promise.resolve({ data: { id: `row-${++n}` }, error: null }));
    // Stub getChannelVideos (private) to avoid hitting SociaVault.
    jest.spyOn(service as any, 'getChannelVideos').mockResolvedValue([
      { id: 'v1', url: 'https://youtube.com/watch?v=v1', title: 'First' },
      { id: 'v2', url: 'https://youtube.com/watch?v=v2', title: 'Second' },
    ]);
  });

  it('saves one row per channel video and returns the saved list', async () => {
    const result = await service.stockpileChannel('https://youtube.com/@handle', 'user-1');
    expect(result.savedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    expect(result.videos).toEqual([
      { uploadId: 'row-1', sourceUrl: 'https://youtube.com/watch?v=v1', title: 'First' },
      { uploadId: 'row-2', sourceUrl: 'https://youtube.com/watch?v=v2', title: 'Second' },
    ]);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        source_type: 'youtube',
        source_url: 'https://youtube.com/watch?v=v1',
        status: 'saved',
        metadata: { title: 'First' },
      }),
    );
  });

  it('rejects a single-video URL', async () => {
    await expect(service.stockpileChannel('https://youtube.com/watch?v=abc', 'user-1'))
      .rejects.toThrow(/single video/i);
  });

  it('skips videos already stockpiled (idempotent on user_id + source_url)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing' }, error: null }); // v1 exists
    const result = await service.stockpileChannel('https://youtube.com/@handle', 'user-1');
    expect(result.skippedCount).toBe(1);
    expect(result.savedCount).toBe(1);
  });

  it('throws a clear error when the channel has no videos', async () => {
    jest.spyOn(service as any, 'getChannelVideos').mockResolvedValue([]);
    await expect(service.stockpileChannel('https://youtube.com/@empty', 'user-1'))
      .rejects.toThrow(/no videos/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx jest tests/unit/youtube-stockpile.test.ts`
Expected: FAIL — `stockpileChannel is not a function` (method not implemented yet).

- [ ] **Step 3: Implement `stockpileChannel`**

Add this method to the `YouTubeService` class in `src/services/kb-content/youtube-service.ts` (place it as a `public` method near `processImport`). It calls the existing private `parseYouTubeUrl` and `getChannelVideos`, and uses the module-level `supabase`:

```typescript
/**
 * Stockpile mode: save one video_uploads row per channel video (status='saved'),
 * with NO media download or transcription. The existing clip pipeline
 * (clipFinderService.processVideo) clips a saved row later, downloading on demand.
 * Idempotent on (user_id, source_url). Rejects single-video URLs.
 */
async stockpileChannel(
  url: string,
  userId: string,
  knowledgeBaseId?: string,
): Promise<{
  savedCount: number;
  skippedCount: number;
  videos: Array<{ uploadId: string; sourceUrl: string; title: string }>;
}> {
  const parsed = this.parseYouTubeUrl(url);
  if (parsed.type === 'video') {
    throw new Error('That is a single video URL. Use "Make content now" to clip it.');
  }

  // maxVideos stays 20 (matches existing channel import; the inline strip's
  // no-pagination design depends on this cap).
  const channelVideos = await this.getChannelVideos(parsed.identifier, 20);
  if (channelVideos.length === 0) {
    throw new Error('No videos found for that channel.');
  }

  const videos: Array<{ uploadId: string; sourceUrl: string; title: string }> = [];
  let skippedCount = 0;

  for (const video of channelVideos) {
    // Idempotency: skip if a non-deleted row already exists for this user+url.
    const { data: existing } = await supabase
      .from('video_uploads')
      .select('id')
      .eq('user_id', userId)
      .eq('source_url', video.url)
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) {
      skippedCount += 1;
      continue;
    }

    const { data: row, error } = await supabase
      .from('video_uploads')
      .insert({
        user_id: userId,
        source_type: 'youtube',
        source_url: video.url,
        knowledge_base_id: knowledgeBaseId,
        status: 'saved',
        progress_percent: 0,
        metadata: { title: video.title }, // video_uploads has no title column
      })
      .select('id')
      .single();
    if (error || !row) {
      throw new Error(`Failed to save video: ${error?.message ?? 'unknown error'}`);
    }
    videos.push({ uploadId: row.id, sourceUrl: video.url, title: video.title });
  }

  return { savedCount: videos.length, skippedCount, videos };
}
```

NOTE: if `youtube-service.ts` imports supabase under a different local name or path than `../../src/utils/supabase`, use the file's existing reference rather than adding a new import.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx jest tests/unit/youtube-stockpile.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/services/kb-content/youtube-service.ts tests/unit/youtube-stockpile.test.ts
git commit -m "feat(stockpile): stockpileChannel saves one video_uploads row per channel video

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Routes — `POST /channel/stockpile` and `GET /videos/saved`

**Files:**
- Modify: `echome-platform-v2/src/routes/kb-content.ts`
- Test: `echome-platform-v2/tests/integration/channel-stockpile.test.ts`

**Interfaces:**
- Consumes: `YouTubeService.stockpileChannel` (Task 2); the module-level `supabase`; `authenticateUser` (already applied to the whole router via `router.use(authenticateUser)`); `req.user?.id`.
- Produces:
  - `POST /kb/content/channel/stockpile` body `{ url: string; knowledgeBaseId?: string }` → `{ success: true; savedCount: number; skippedCount: number; videos: Array<{ uploadId: string; sourceUrl: string; title: string }> }`.
  - `GET /kb/content/videos/saved` → `{ success: true; videos: Array<{ uploadId: string; sourceUrl: string; title: string; createdAt: string }> }`.
  - Both consumed by the frontend api-client (Task 5).

- [ ] **Step 1: Write the failing test**

Create `echome-platform-v2/tests/integration/channel-stockpile.test.ts`. NOTE: mirror the imports/helpers of an existing integration test (e.g. `tests/integration/knowledge-base.test.ts`) — `request from 'supertest'`, `app from '../../src/index'`, and `TestHelpers` for a real auth token.

```typescript
import request from 'supertest';
import { TestHelpers } from '../utils/test-helpers';
import app from '../../src/index';

describe('Channel stockpile routes', () => {
  let testUser: { id: string; email: string; authToken: string };

  beforeAll(async () => {
    testUser = await TestHelpers.createTestUser();
  });
  afterAll(async () => {
    if (testUser) await TestHelpers.cleanupTestUser(testUser.id);
  });

  it('POST /channel/stockpile requires auth', async () => {
    await request(app)
      .post('/api/kb/content/channel/stockpile')
      .send({ url: 'https://youtube.com/@handle' })
      .expect(401);
  });

  it('POST /channel/stockpile rejects a missing url with 400', async () => {
    await request(app)
      .post('/api/kb/content/channel/stockpile')
      .set('Authorization', `Bearer ${testUser.authToken}`)
      .send({})
      .expect(400);
  });

  it('GET /videos/saved requires auth', async () => {
    await request(app).get('/api/kb/content/videos/saved').expect(401);
  });

  it('GET /videos/saved returns the saved-videos envelope', async () => {
    const res = await request(app)
      .get('/api/kb/content/videos/saved')
      .set('Authorization', `Bearer ${testUser.authToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.videos)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx jest tests/integration/channel-stockpile.test.ts`
Expected: FAIL — the new routes return 404 (not yet defined), so the auth/400/200 expectations fail.

- [ ] **Step 3: Implement the routes**

In `src/routes/kb-content.ts`, add the two routes alongside the existing `/social/import` routes. NOTE: reach `stockpileChannel` through the **same** `YouTubeService` reference the existing `/social/import` handler uses (read that handler around the `/social/import` route to get the exact symbol — whether it's an imported singleton or `new YouTubeService()`); reuse the file's existing `supabase` import (the `GET /social/import/:jobId` handler already uses it).

```typescript
// POST /kb/content/channel/stockpile — save a channel's videos as 'saved' rows.
router.post('/channel/stockpile', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'User not authenticated', code: 'UNAUTHORIZED' } });
      return;
    }
    const { url, knowledgeBaseId } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: { message: 'url is required', code: 'BAD_REQUEST' } });
      return;
    }
    // youTubeService: use the same reference the /social/import handler uses.
    const result = await youTubeService.stockpileChannel(url, userId, knowledgeBaseId);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Channel stockpile failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(400).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Stockpile failed', code: 'STOCKPILE_FAILED' },
    });
  }
});

// GET /kb/content/videos/saved — list the caller's stockpiled (status='saved') videos.
router.get('/videos/saved', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'User not authenticated', code: 'UNAUTHORIZED' } });
      return;
    }
    const { data, error } = await supabase
      .from('video_uploads')
      .select('id, source_url, metadata, created_at')
      .eq('user_id', userId)
      .eq('status', 'saved')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const videos = (data ?? []).map((r: any) => ({
      uploadId: r.id,
      sourceUrl: r.source_url,
      title: (r.metadata && r.metadata.title) || '',
      createdAt: r.created_at,
    }));
    res.json({ success: true, videos });
  } catch (error) {
    next(error);
  }
});
```

NOTE: confirm `AuthenticatedRequest`, `Response`, `NextFunction`, and `logger` are already imported in `kb-content.ts` (the existing `/social/import` handlers use all four). If `youTubeService` is not already in scope, import/instantiate it exactly as the `/social/import` handler does.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx jest tests/integration/channel-stockpile.test.ts`
Expected: PASS (4/4). If the suite needs DB/staging env the existing integration tests also need, run with the same env those tests use.

- [ ] **Step 5: Commit**

```bash
git add src/routes/kb-content.ts tests/integration/channel-stockpile.test.ts
git commit -m "feat(stockpile): channel/stockpile + videos/saved routes (auth-gated)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Open the backend PR, merge, and confirm deploy**

```bash
git push -u origin feat/channel-stockpile
gh pr create --title "feat: channel video stockpile (saved status + service + routes)" \
  --body "$(cat <<'EOF'
Adds stockpile mode: save one video_uploads row per channel video (status=saved), clipped later via the existing pipeline.

- Migration: `saved` video_processing_status value (own migration; staging-applied).
- Service: `YouTubeService.stockpileChannel` (reuses getChannelVideos; idempotent).
- Routes: `POST /kb/content/channel/stockpile`, `GET /kb/content/videos/saved` (auth-gated).

Frontend PR (destination fork + inline strip) follows once this is live on Railway.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
After CI passes, merge (admin override is the standard path here): `gh pr merge --admin --squash --delete-branch`. Then confirm the route is live on Railway before starting the frontend PR — e.g. an unauthenticated `POST /api/kb/content/channel/stockpile` should return **401** (route live), not 404.

---

# FRONTEND (echome-frontend) — only after the backend route is live

All frontend tasks run in `/Users/aramammo/Side Quests/echome-frontend`. Create a branch first: `git checkout -b feat/echo-destination-fork`. Test command throughout: `npm run test:unit`.

### Task 4: Single-vs-channel URL detection

**Files:**
- Modify: `echome-frontend/src/lib/url-platform.ts`
- Test: `echome-frontend/src/lib/url-platform.test.ts`

**Interfaces:**
- Consumes: existing module constants `YOUTUBE_RE`, `INSTAGRAM_RE`, `RECORDING_RE` and `extractFirstUrl` (already in the file).
- Produces: `export interface VideoUrlTarget { platform: 'youtube' | 'instagram'; kind: 'single' | 'channel' }` and `export function detectVideoUrlTarget(url: string): VideoUrlTarget | null` — consumed by `useEcho` (Task 6).

- [ ] **Step 1: Write the failing test**

Create `echome-frontend/src/lib/url-platform.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectVideoUrlTarget } from './url-platform';

describe('detectVideoUrlTarget', () => {
  it('youtube watch is single', () => {
    expect(detectVideoUrlTarget('https://youtube.com/watch?v=abc123')).toEqual({ platform: 'youtube', kind: 'single' });
  });
  it('youtu.be is single', () => {
    expect(detectVideoUrlTarget('https://youtu.be/abc123')).toEqual({ platform: 'youtube', kind: 'single' });
  });
  it('youtube shorts is single', () => {
    expect(detectVideoUrlTarget('https://youtube.com/shorts/abc')).toEqual({ platform: 'youtube', kind: 'single' });
  });
  it('youtube @handle is channel', () => {
    expect(detectVideoUrlTarget('https://youtube.com/@somehandle')).toEqual({ platform: 'youtube', kind: 'channel' });
  });
  it('youtube /channel/ is channel', () => {
    expect(detectVideoUrlTarget('https://youtube.com/channel/UC123')).toEqual({ platform: 'youtube', kind: 'channel' });
  });
  it('bare youtube root is channel (uncertain, ask anyway)', () => {
    expect(detectVideoUrlTarget('https://youtube.com')).toEqual({ platform: 'youtube', kind: 'channel' });
  });
  it('instagram reel is single', () => {
    expect(detectVideoUrlTarget('https://instagram.com/reel/xyz')).toEqual({ platform: 'instagram', kind: 'single' });
  });
  it('instagram /p/ is single', () => {
    expect(detectVideoUrlTarget('https://instagram.com/p/xyz')).toEqual({ platform: 'instagram', kind: 'single' });
  });
  it('instagram profile is channel', () => {
    expect(detectVideoUrlTarget('https://instagram.com/someuser')).toEqual({ platform: 'instagram', kind: 'channel' });
  });
  it('loom returns null (not forkable here)', () => {
    expect(detectVideoUrlTarget('https://loom.com/share/abc')).toBeNull();
  });
  it('plain blog url returns null', () => {
    expect(detectVideoUrlTarget('https://example.com/post')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- src/lib/url-platform.test.ts`
Expected: FAIL — `detectVideoUrlTarget is not exported`.

- [ ] **Step 3: Implement the detection function**

Append to `echome-frontend/src/lib/url-platform.ts` (reuse the existing `YOUTUBE_RE`, `INSTAGRAM_RE`, `RECORDING_RE` constants already defined near the top):

```typescript
export interface VideoUrlTarget {
  platform: 'youtube' | 'instagram';
  kind: 'single' | 'channel';
}

// Mirrors backend parseYouTubeUrl: single = watch/shorts/live/youtu.be;
// channel = @handle, /channel/, /c/, /user/, playlist, or bare root.
const YT_SINGLE_RE = /[?&]v=|youtu\.be\/|\/shorts\/|\/live\//i;
const IG_SINGLE_RE = /\/(p|reel|reels|tv)\//i;

/**
 * Classify a video URL for the Echo destination fork. Returns null for URLs
 * that should NOT show the fork (recordings, blogs, anything non-video).
 * Uncertain YouTube/Instagram URLs resolve to 'channel' — asking is safe, and
 * the channel fork offers both "Add to Voice/KB" and "Save to clip later".
 */
export function detectVideoUrlTarget(url: string): VideoUrlTarget | null {
  if (RECORDING_RE.test(url)) return null; // loom/zoom/vimeo: not forkable here
  if (YOUTUBE_RE.test(url)) {
    return { platform: 'youtube', kind: YT_SINGLE_RE.test(url) ? 'single' : 'channel' };
  }
  if (INSTAGRAM_RE.test(url)) {
    return { platform: 'instagram', kind: IG_SINGLE_RE.test(url) ? 'single' : 'channel' };
  }
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- src/lib/url-platform.test.ts`
Expected: PASS (11/11).

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-platform.ts src/lib/url-platform.test.ts
git commit -m "feat(echo): detectVideoUrlTarget single-vs-channel URL classifier

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: api-client methods (additive)

**Files:**
- Modify: `echome-frontend/src/lib/api-client.ts`

**Interfaces:**
- Consumes: backend routes from Task 3.
- Produces: `api.kbContent.startChannelStockpile({ url, knowledgeBaseId? })` → `{ success; savedCount; skippedCount; videos: Array<{ uploadId; sourceUrl; title }> }` and `api.kbContent.listSavedVideos()` → `{ success; videos: Array<{ uploadId; sourceUrl; title; createdAt }> }`. Consumed by `useEcho` (Tasks 6, 7).

- [ ] **Step 1: Add the two methods**

In `src/lib/api-client.ts`, inside the existing `kbContent` namespace (next to `startSocialImport`, near line 1307), add — **additive only; do not touch the interceptor/auth/JWT-sync code:**

```typescript
/** Stockpile a YouTube channel's videos as saved rows to clip later */
startChannelStockpile: async (data: { url: string; knowledgeBaseId?: string }) => {
  const response = await apiClient.post('/kb/content/channel/stockpile', data, {
    timeout: 30000, // enumerates the channel, no media download
  });
  return response.data as {
    success: boolean;
    savedCount: number;
    skippedCount: number;
    videos: Array<{ uploadId: string; sourceUrl: string; title: string }>;
  };
},

/** List the caller's stockpiled (saved) videos */
listSavedVideos: async () => {
  const response = await apiClient.get('/kb/content/videos/saved');
  return response.data as {
    success: boolean;
    videos: Array<{ uploadId: string; sourceUrl: string; title: string; createdAt: string }>;
  };
},
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `api-client.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat(echo): api-client startChannelStockpile + listSavedVideos (additive)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Destination fork — useEcho state/handler + EchoExchange buttons

**Files:**
- Modify: `echome-frontend/src/components/echo/useEcho.ts`
- Modify: `echome-frontend/src/components/echo/EchoExchange.tsx`
- Modify: `echome-frontend/src/components/echo/EchoHero.tsx`
- Test: `echome-frontend/src/components/echo/EchoExchange.fork.test.tsx`
- Test: `echome-frontend/src/components/echo/useEcho.fork.test.ts`

**Interfaces:**
- Consumes: `detectVideoUrlTarget`/`VideoUrlTarget` (Task 4), `extractFirstUrl` (existing import in useEcho), `api.kbContent.startSocialImport` + `startChannelStockpile` (Task 5), `api.clips.upload({ sourceType, sourceUrl }) => { id }` and `api.clips.process(uploadId, { generateContent: true })` (existing).
- Produces: on `EchoState` — `videoUrlTarget: VideoUrlTarget | null`, `savedVideos: Array<{ uploadId: string; sourceUrl: string; title: string }> | null`, `savedCount: number | null`; on `UseEchoReturn` — `chooseDestination: (choice: 'voice' | 'create' | 'stockpile') => Promise<void>`. (`savedVideos`/`savedCount` are read by Task 7; `clipSavedVideo` is added in Task 7.)

- [ ] **Step 1: Write the failing UI test**

Create `echome-frontend/src/components/echo/EchoExchange.fork.test.tsx`. NOTE: copy the `BASE_STATE` and `handlers` setup from the existing `EchoExchange.feedback.test.tsx`, then extend `handlers` with `chooseDestination: vi.fn()` and (for Task 7) `clipSavedVideo: vi.fn()`, and add the new fields to the state overrides.

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EchoExchange } from './EchoExchange';
import type { EchoState } from './useEcho';

// NOTE: import or recreate BASE_STATE exactly as EchoExchange.feedback.test.tsx does.
import { BASE_STATE } from './EchoExchange.feedback.test';

const handlers = {
  setInputText: vi.fn(), submit: vi.fn(), selectIntent: vi.fn(),
  confirm: vi.fn(), reset: vi.fn(), chooseDestination: vi.fn(), clipSavedVideo: vi.fn(),
};

function renderExchange(overrides: Partial<EchoState>) {
  return render(<EchoExchange state={{ ...BASE_STATE, ...overrides }} handlers={handlers} />);
}

describe('EchoExchange destination fork', () => {
  it('renders single-video fork copy and routes "Make content now" to create', () => {
    renderExchange({ phase: 'confirming', videoUrlTarget: { platform: 'youtube', kind: 'single' } });
    expect(screen.getByText('Add to Voice/KB')).toBeInTheDocument();
    const btn = screen.getByText('Make content now');
    fireEvent.click(btn);
    expect(handlers.chooseDestination).toHaveBeenCalledWith('create');
  });

  it('renders channel fork copy and routes "Save videos to clip later" to stockpile', () => {
    renderExchange({ phase: 'confirming', videoUrlTarget: { platform: 'youtube', kind: 'channel' } });
    expect(screen.getByText('Add to Voice/KB')).toBeInTheDocument();
    const btn = screen.getByText('Save videos to clip later');
    fireEvent.click(btn);
    expect(handlers.chooseDestination).toHaveBeenCalledWith('stockpile');
  });

  it('does NOT render the fork when videoUrlTarget is null (intent chips path)', () => {
    renderExchange({ phase: 'confirming', videoUrlTarget: null });
    expect(screen.queryByText('Save videos to clip later')).not.toBeInTheDocument();
  });
});
```

NOTE: `BASE_STATE` is defined locally in `EchoExchange.feedback.test.tsx`; if it is not exported, copy its literal into this file instead of importing. Ensure the literal includes the new fields `videoUrlTarget: null, savedVideos: null, savedCount: null`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- src/components/echo/EchoExchange.fork.test.tsx`
Expected: FAIL — fork buttons not rendered / `chooseDestination` not a prop.

- [ ] **Step 3: Extend `EchoState`, `UseEchoReturn`, and add `chooseDestination` in useEcho.ts**

In `src/components/echo/useEcho.ts`:

(a) Add to the `EchoState` interface: `videoUrlTarget: VideoUrlTarget | null;`, `savedVideos: Array<{ uploadId: string; sourceUrl: string; title: string }> | null;`, `savedCount: number | null;`. Add `import { extractFirstUrl, detectIngestUrlKind, detectVideoUrlTarget, type VideoUrlTarget } from '@/lib/url-platform';` (extend the existing import). Initialise the three new fields to `null` wherever the initial state object is created (and in any `reset()` state).

(b) Add `chooseDestination` to the `UseEchoReturn` interface: `chooseDestination: (choice: 'voice' | 'create' | 'stockpile') => Promise<void>;`.

(c) In `submit()`, after a successful classification and just before setting `phase: 'confirming'`, compute the target and include it in the new state:

```typescript
const firstUrl = extractFirstUrl(classifyText);
const videoUrlTarget = firstUrl ? detectVideoUrlTarget(firstUrl) : null;
// ...include `videoUrlTarget` in the setState that moves phase to 'confirming'.
```

(d) Implement the handler (place near the existing `confirm` handler; reuse the existing `addReceipt`, `formatReceipt`, `INTENT_META`, `stateRef`, `onIngestCompleteRef` helpers this file already defines):

```typescript
const chooseDestination = useCallback(async (choice: 'voice' | 'create' | 'stockpile') => {
  const { inputText, videoUrlTarget } = stateRef.current;
  const url = extractFirstUrl(inputText);
  if (!url || !videoUrlTarget) return;

  setState((prev) => ({ ...prev, phase: 'executing', error: null }));
  try {
    if (choice === 'voice') {
      await api.kbContent.startSocialImport({ platform: videoUrlTarget.platform, url });
      addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · ${videoUrlTarget.platform.toUpperCase()} IMPORT`));
      setState((prev) => ({
        ...prev, phase: 'done', inputText: '', videoUrlTarget: null,
        confirmation: { title: 'Importing to your Voice', detail: `${videoUrlTarget.platform} link` },
      }));
      onIngestCompleteRef.current?.();
    } else if (choice === 'create') {
      const upload = await api.clips.upload({ sourceType: videoUrlTarget.platform, sourceUrl: url });
      await api.clips.process(upload.id, { generateContent: true });
      addReceipt(formatReceipt('CLIP · MAKE CONTENT NOW'));
      setState((prev) => ({
        ...prev, phase: 'done', inputText: '', videoUrlTarget: null,
        confirmation: { title: 'Clipping your video', detail: 'Making content now' },
      }));
    } else {
      const res = await api.kbContent.startChannelStockpile({ url });
      addReceipt(formatReceipt(`STOCKPILE · SAVED ${res.savedCount} VIDEOS`));
      setState((prev) => ({
        ...prev, phase: 'done', inputText: '', videoUrlTarget: null,
        savedVideos: res.videos, savedCount: res.savedCount,
        confirmation: { title: `Saved ${res.savedCount} videos to clip later`, detail: '' },
      }));
    }
  } catch (err) {
    setState((prev) => ({
      ...prev, phase: 'confirming',
      error: err instanceof Error ? err.message : 'Something went wrong. Try again.',
    }));
  }
}, []);
```

(e) Add `chooseDestination` to the returned object from `useEcho`.

NOTE: match the exact shapes of `addReceipt`/`formatReceipt`/`INTENT_META.ingest.receiptVerb` and the `confirmation` field already used by the existing `confirm()` ingest branch — read that branch and mirror its receipt + confirmation usage. `api.clips.upload` returns an object with `.id` (as used in `generation-form.tsx:processVideoWithClipFinder`).

- [ ] **Step 4: Render the fork in EchoExchange.tsx**

In `src/components/echo/EchoExchange.tsx`, the confirming/executing block currently renders intent chips when `(isConfirming || isAnswered) && classification`. Add a sibling branch: when `(isConfirming) && state.videoUrlTarget`, render the **DestinationFork instead of** the intent-chip block (guard the existing chip block with `&& !state.videoUrlTarget` so they are mutually exclusive). Add `chooseDestination` to the `handlers` prop type.

```tsx
{isConfirming && state.videoUrlTarget && (
  <div className="flex flex-col gap-2">
    <span className="text-machine" style={{ color: 'var(--muted-foreground)' }}>
      WHERE SHOULD THIS GO
    </span>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a destination for this video link.">
      <button
        type="button"
        onClick={() => handlers.chooseDestination('voice')}
        disabled={phase === 'executing'}
        className="text-machine rounded px-2.5 py-1 border border-[var(--border)] bg-[var(--surface-container)] text-[var(--muted-foreground)] hover:bg-[var(--surface-container-high)] disabled:opacity-50"
        style={{ fontSize: '0.625rem', letterSpacing: '0.12em' }}
      >
        Add to Voice/KB
      </button>
      <button
        type="button"
        onClick={() => handlers.chooseDestination(state.videoUrlTarget!.kind === 'single' ? 'create' : 'stockpile')}
        disabled={phase === 'executing'}
        className="text-machine rounded px-2.5 py-1 border border-[rgba(0,212,255,0.6)] bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.9)] hover:bg-[rgba(0,212,255,0.12)] disabled:opacity-50"
        style={{ fontSize: '0.625rem', letterSpacing: '0.12em' }}
      >
        {state.videoUrlTarget.kind === 'single' ? 'Make content now' : 'Save videos to clip later'}
      </button>
    </div>
  </div>
)}
```

NOTE: confirm the prop the component receives for state is named `state` (the feedback test renders `<EchoExchange state={...} handlers={...} />`). Guard the existing intent-chip block so it only renders when `!state.videoUrlTarget`.

- [ ] **Step 5: Pass `chooseDestination` through EchoHero.tsx**

In `src/components/echo/EchoHero.tsx`, the component that calls `useEcho` and renders `EchoExchange`: destructure `chooseDestination` from the `useEcho(...)` return and include it in the `handlers` object passed to `EchoExchange` (alongside `setInputText`, `submit`, `selectIntent`, `confirm`, `reset`).

- [ ] **Step 6: Write the hook routing test**

Create `echome-frontend/src/components/echo/useEcho.fork.test.ts`. NOTE: read the top of `useEcho.ts` to find the module that `submit()` imports `classifyEchoInput` from, and mock that module so `submit()` resolves to an `ingest`-ish classification without a network call. Mock `@/lib/api-client` with the methods the handler calls.

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    kbContent: {
      startSocialImport: vi.fn().mockResolvedValue({ success: true }),
      startChannelStockpile: vi.fn().mockResolvedValue({
        success: true, savedCount: 2, skippedCount: 0,
        videos: [
          { uploadId: 'u1', sourceUrl: 'https://youtube.com/watch?v=a', title: 'A' },
          { uploadId: 'u2', sourceUrl: 'https://youtube.com/watch?v=b', title: 'B' },
        ],
      }),
    },
    clips: {
      upload: vi.fn().mockResolvedValue({ id: 'up-1' }),
      process: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

// NOTE: also vi.mock the module that exports classifyEchoInput so submit()
// returns a classification synchronously (read useEcho.ts for the path).

describe('useEcho chooseDestination', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes a channel URL stockpile choice to startChannelStockpile and stores savedVideos', async () => {
    const { result } = renderHook(() => useEcho(vi.fn()));
    act(() => { result.current.open(); result.current.setInputText('https://youtube.com/@handle'); });
    await act(async () => { await result.current.submit(); });
    await waitFor(() => expect(result.current.state.videoUrlTarget).toEqual({ platform: 'youtube', kind: 'channel' }));
    await act(async () => { await result.current.chooseDestination('stockpile'); });
    expect(api.kbContent.startChannelStockpile).toHaveBeenCalledWith({ url: 'https://youtube.com/@handle' });
    expect(result.current.state.savedCount).toBe(2);
    expect(result.current.state.savedVideos).toHaveLength(2);
  });

  it('routes a single-video create choice to clips.upload + clips.process', async () => {
    const { result } = renderHook(() => useEcho(vi.fn()));
    act(() => { result.current.open(); result.current.setInputText('https://youtube.com/watch?v=abc'); });
    await act(async () => { await result.current.submit(); });
    await waitFor(() => expect(result.current.state.videoUrlTarget).toEqual({ platform: 'youtube', kind: 'single' }));
    await act(async () => { await result.current.chooseDestination('create'); });
    expect(api.clips.upload).toHaveBeenCalledWith({ sourceType: 'youtube', sourceUrl: 'https://youtube.com/watch?v=abc' });
    expect(api.clips.process).toHaveBeenCalledWith('up-1', { generateContent: true });
  });
});
```

- [ ] **Step 7: Run both tests to verify they pass**

Run: `npm run test:unit -- src/components/echo/EchoExchange.fork.test.tsx src/components/echo/useEcho.fork.test.ts`
Expected: PASS. If the hook test cannot drive `submit()` cleanly because of the classify mock, fix the mock to match the real `classifyEchoInput` import path (do not weaken the assertions).

- [ ] **Step 8: Commit**

```bash
git add src/components/echo/useEcho.ts src/components/echo/EchoExchange.tsx src/components/echo/EchoHero.tsx src/components/echo/EchoExchange.fork.test.tsx src/components/echo/useEcho.fork.test.ts
git commit -m "feat(echo): destination fork for video URLs (Voice/KB, create, stockpile)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Inline saved-videos strip

**Files:**
- Modify: `echome-frontend/src/components/echo/useEcho.ts`
- Modify: `echome-frontend/src/components/echo/EchoExchange.tsx`
- Modify: `echome-frontend/src/components/echo/EchoHero.tsx`
- Test: `echome-frontend/src/components/echo/EchoExchange.fork.test.tsx` (extend)

**Interfaces:**
- Consumes: `state.savedVideos` / `state.savedCount` set by `chooseDestination('stockpile')` (Task 6); `api.clips.process(uploadId, { generateContent: true })` (existing).
- Produces: on `UseEchoReturn` — `clipSavedVideo: (uploadId: string) => Promise<void>`; an inline strip in `EchoExchange` shown in the `done` phase when `savedVideos` is non-empty.

- [ ] **Step 1: Write the failing test (extend the fork test file)**

Add to `echome-frontend/src/components/echo/EchoExchange.fork.test.tsx`:

```tsx
describe('EchoExchange saved-videos strip', () => {
  it('renders one result card with a title per saved video and clips on pick', () => {
    renderExchange({
      phase: 'done',
      savedCount: 2,
      savedVideos: [
        { uploadId: 'u1', sourceUrl: 'https://youtube.com/watch?v=a', title: 'First clip' },
        { uploadId: 'u2', sourceUrl: 'https://youtube.com/watch?v=b', title: 'Second clip' },
      ],
    });
    expect(screen.getByText('Saved 2 videos to clip later')).toBeInTheDocument();
    expect(screen.getByText('First clip')).toBeInTheDocument();
    expect(screen.getByText('Second clip')).toBeInTheDocument();
    // Each saved video offers a Clip action.
    const clipButtons = screen.getAllByRole('button', { name: /clip/i });
    fireEvent.click(clipButtons[0]);
    expect(handlers.clipSavedVideo).toHaveBeenCalledWith('u1');
  });

  it('renders no strip when savedVideos is null', () => {
    renderExchange({ phase: 'done', savedVideos: null, savedCount: null });
    expect(screen.queryByText(/Saved .* videos to clip later/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- src/components/echo/EchoExchange.fork.test.tsx`
Expected: FAIL — strip not rendered / `clipSavedVideo` not a handler.

- [ ] **Step 3: Add `clipSavedVideo` to useEcho.ts**

Add to `UseEchoReturn`: `clipSavedVideo: (uploadId: string) => Promise<void>;`. Implement (near `chooseDestination`):

```typescript
const clipSavedVideo = useCallback(async (uploadId: string) => {
  setState((prev) => ({ ...prev, phase: 'executing', error: null }));
  try {
    await api.clips.process(uploadId, { generateContent: true });
    addReceipt(formatReceipt('CLIP · STARTED'));
    setState((prev) => ({
      ...prev,
      phase: 'done',
      savedVideos: prev.savedVideos ? prev.savedVideos.filter((v) => v.uploadId !== uploadId) : null,
      confirmation: { title: 'Clipping started', detail: '' },
    }));
  } catch (err) {
    setState((prev) => ({
      ...prev, phase: 'done',
      error: err instanceof Error ? err.message : 'Could not start clipping. Try again.',
    }));
  }
}, []);
```

Add `clipSavedVideo` to the returned object.

- [ ] **Step 4: Render the strip in EchoExchange.tsx**

Add `clipSavedVideo` to the `handlers` prop type. In the `done` phase block, when `state.savedVideos && state.savedVideos.length > 0`, render the result card + horizontal scroll strip (title-only, bounded at 20 by `maxVideos`):

```tsx
{isDone && state.savedVideos && state.savedVideos.length > 0 && (
  <div className="flex flex-col gap-2">
    <span className="text-sm font-medium text-foreground">
      Saved {state.savedCount} videos to clip later
    </span>
    {/* Horizontal scroll strip. Bounded at 20 items because stockpileChannel
        caps getChannelVideos at maxVideos=20. If maxVideos ever rises, this
        strip must move to pagination or a dedicated surface. */}
    <div className="flex gap-2 overflow-x-auto pb-1">
      {state.savedVideos.map((v) => (
        <div
          key={v.uploadId}
          className="flex min-w-[10rem] max-w-[10rem] flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-container)] p-2"
        >
          <span className="line-clamp-2 text-xs text-foreground">{v.title || v.sourceUrl}</span>
          <button
            type="button"
            onClick={() => handlers.clipSavedVideo(v.uploadId)}
            disabled={phase === 'executing'}
            className="self-start rounded px-2 py-0.5 text-[0.625rem] tracking-[0.12em] text-machine border border-[rgba(0,212,255,0.6)] bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.9)] hover:bg-[rgba(0,212,255,0.12)] disabled:opacity-50"
          >
            Clip
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Pass `clipSavedVideo` through EchoHero.tsx**

In `src/components/echo/EchoHero.tsx`, destructure `clipSavedVideo` from `useEcho(...)` and add it to the `handlers` object passed to `EchoExchange`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:unit -- src/components/echo/EchoExchange.fork.test.tsx`
Expected: PASS (all fork + strip cases).

- [ ] **Step 7: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS (no regressions in existing Echo tests).

- [ ] **Step 8: Commit and open the frontend PR**

```bash
git add src/components/echo/useEcho.ts src/components/echo/EchoExchange.tsx src/components/echo/EchoHero.tsx src/components/echo/EchoExchange.fork.test.tsx
git commit -m "feat(echo): inline saved-videos strip with clip-now action

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push -u origin feat/echo-destination-fork
gh pr create --title "feat: Echo video-URL destination fork + inline stockpile strip" \
  --body "$(cat <<'EOF'
Replaces auto-classify of video URLs with a two-button destination fork, and adds an inline saved-videos strip for channel "save to clip later".

- url-platform: detectVideoUrlTarget (single vs channel).
- api-client: startChannelStockpile + listSavedVideos (additive).
- Echo: destination fork (Voice/KB, create, stockpile) + inline saved-videos strip.

Depends on backend channel-stockpile routes (already live on Railway).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Merge with admin override once CI is green: `gh pr merge --admin --squash --delete-branch`.

---

## Self-Review

**1. Spec coverage:**
- Component 1 (single-vs-channel detection in `url-platform.ts`) → Task 4 ✅
- Component 2 (destination fork in the confirm step) → Task 6 (EchoExchange fork + useEcho) ✅
- Component 3 (route each fork choice: voice/create/stockpile) → Task 6 `chooseDestination` ✅
- Component 4 (backend `stockpileChannel`) → Task 2 ✅ (title → `metadata.title`, source_type `youtube`, idempotent, reject single, zero-videos error)
- Component 5 (routes + api-client methods) → Task 3 (routes) + Task 5 (api-client) ✅
- Component 6 (`saved` enum value, own migration) → Task 1 ✅
- Component 7 (inline saved-videos strip, title-only, bounded by maxVideos) → Task 7 ✅
- Error handling (SociaVault failure, zero videos, single-URL rejected, duplicate idempotent) → Task 2 logic + Task 3 400 path ✅
- Testing bullets (url detection cases, fork render/route, stockpile rows + reject + idempotent + zero, route auth) → Tasks 2/3/4/6/7 ✅
- Cross-repo sequencing (backend live before frontend) → Task 3 Step 6 + frontend "only after route is live" header ✅

**2. Placeholder scan:** No "TBD"/"implement later"/"add validation". Five NOTE blocks flag verify-then-match points (supabase import name/path; `youTubeService` reference in kb-content.ts; `AuthenticatedRequest`/`logger` imports; `classifyEchoInput` mock path; `BASE_STATE` export) — each names the exact file to read, matching the established carousel-plan NOTE convention. Every code step shows full code.

**3. Type consistency:** `{ uploadId, sourceUrl, title }` is identical across Task 2 (`stockpileChannel` return), Task 3 (POST response), Task 5 (api-client type), Task 6 (`savedVideos` state + hook test), Task 7 (strip render). `VideoUrlTarget { platform; kind }` consistent across Task 4 (def), Task 6 (state + handler). `chooseDestination(choice: 'voice'|'create'|'stockpile')` consistent Task 6 def + tests. `clipSavedVideo(uploadId)` consistent Task 7 def + test. `api.clips.upload(...) => { id }` and `api.clips.process(uploadId, { generateContent: true })` match the verified `generation-form.tsx` usage. Backend insert columns (`user_id, source_type, source_url, knowledge_base_id, status, progress_percent, metadata`) all exist on `video_uploads` per the verified migrations.
