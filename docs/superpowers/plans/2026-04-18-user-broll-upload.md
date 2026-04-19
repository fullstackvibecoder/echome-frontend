# User B-Roll Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload their own video clips as B-Roll backgrounds in the reel editor, with a "+" button in the clip strip, thumbnail generation, and a "My Clips" category.

**Architecture:** New `user_broll_clips` table (RLS disabled). Backend handles multipart upload → Supabase Storage → FFmpeg thumbnail + duration probe → DB insert. Frontend merges user clips into the existing BRollStrip with a "My Clips" category tab and "+" upload button.

**Tech Stack:** Multer (multipart), FFmpeg (thumbnail/probe), Supabase Storage (`reels` bucket), React

---

## File Structure

**Backend — `/Users/aramammo/Side Quests/echome-platform-v2/`**

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260418_user_broll_uploads.sql` | **New** — create table, disable RLS |
| `src/routes/reels.ts` | Add 3 endpoints: POST/GET/DELETE `/broll-uploads` |

**Frontend — `/Users/aramammo/Side Quests/echome-frontend/`**

| File | Responsibility |
|------|---------------|
| `src/lib/api-client.ts` | Add `uploadClip`, `getUserClips`, `deleteClip` to `brollReels` |
| `src/components/reels/BRollStrip.tsx` | Add `onUpload` prop, "+" button, upload spinner |
| `src/components/reels/ReelEditorModal.tsx` | Fetch + merge user clips, wire upload handler |

---

### Task 1: Database migration

**Files:**
- Create: `echome-platform-v2/supabase/migrations/20260418_user_broll_uploads.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- User-uploaded B-Roll clips for the reel editor
CREATE TABLE IF NOT EXISTS user_broll_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER NOT NULL,
  duration REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_broll_user ON user_broll_clips(user_id);

-- RLS disabled — backend uses service_role key, access control at API layer
ALTER TABLE user_broll_clips DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply the migration**

Run: `cd /Users/aramammo/Side\ Quests/echome-platform-v2 && npx supabase db push`

Or apply via Supabase MCP if available. Verify the table exists:

```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_broll_clips';
```

- [ ] **Step 3: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2
git add supabase/migrations/20260418_user_broll_uploads.sql
git commit -m "feat: add user_broll_clips table for user B-Roll uploads"
```

---

### Task 2: Backend endpoints (POST/GET/DELETE broll-uploads)

**Files:**
- Modify: `echome-platform-v2/src/routes/reels.ts` (add before `export default router` at line 983)

- [ ] **Step 1: Add a multer config for B-Roll video uploads**

Find the existing multer config (around line 58-68). Add a new one below it for B-Roll uploads that accepts MOV files too:

```typescript
// Multer for user B-Roll uploads (video files up to 50MB)
const brollUpload = multer({
  storage: multer.diskStorage({
    destination: '/tmp/echome-broll-uploads',
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype));
  },
});
```

Also add `fs` and `path` imports at the top if not already present:
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

And ensure the temp directory exists by adding after the multer config:
```typescript
// Ensure temp dir for B-Roll uploads exists
try { fs.mkdirSync('/tmp/echome-broll-uploads', { recursive: true }); } catch {}
```

- [ ] **Step 2: Add the POST endpoint**

Add before `export default router`:

```typescript
// ============================================================
// USER B-ROLL UPLOADS
// ============================================================

/**
 * POST /api/reels/broll-uploads
 * Upload a user's own B-Roll video clip
 */
router.post('/broll-uploads', brollUpload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      throw new AppError('No file uploaded', 400);
    }

    const clipId = crypto.randomUUID();
    const ext = path.extname(file.originalname || '.mp4') || '.mp4';
    const storagePath = `${userId}/broll-uploads/${clipId}${ext}`;
    const thumbPath = `${userId}/broll-uploads/${clipId}-thumb.jpg`;

    // Read file from disk
    const fileBuffer = fs.readFileSync(file.path);

    // Upload video to storage
    const { error: uploadError } = await supabase.storage
      .from('reels')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new AppError(`Failed to upload video: ${uploadError.message}`, 500);
    }

    // Probe duration with FFmpeg
    const { FFmpegService } = await import('../services/video/ffmpeg');
    let duration: number | null = null;
    try {
      const metadata = await FFmpegService.getVideoMetadata(file.path);
      duration = metadata.duration;

      if (duration > 60) {
        // Clean up uploaded file from storage
        await supabase.storage.from('reels').remove([storagePath]);
        throw new AppError('Video must be 60 seconds or shorter', 400);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.warn('Could not probe video duration', { error: err });
    }

    // Extract thumbnail
    const thumbLocalPath = `${file.path}-thumb.jpg`;
    try {
      await FFmpegService.extractThumbnail(file.path, thumbLocalPath, 1, {
        width: 480,
        height: 480,
        fillMode: 'cover',
      });

      const thumbBuffer = fs.readFileSync(thumbLocalPath);
      const { error: thumbError } = await supabase.storage
        .from('reels')
        .upload(thumbPath, thumbBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (thumbError) {
        logger.warn('Thumbnail upload failed', { error: thumbError.message });
      }

      // Clean up local thumbnail
      fs.unlinkSync(thumbLocalPath);
    } catch (err) {
      logger.warn('Thumbnail extraction failed', { error: err });
    }

    // Clean up local upload file
    try { fs.unlinkSync(file.path); } catch {}

    // Get public URLs
    const { data: videoUrlData } = supabase.storage.from('reels').getPublicUrl(storagePath);
    const { data: thumbUrlData } = supabase.storage.from('reels').getPublicUrl(thumbPath);

    // Insert database row
    const { error: dbError } = await supabase.from('user_broll_clips').insert({
      id: clipId,
      user_id: userId,
      url: videoUrlData.publicUrl,
      thumbnail_url: thumbUrlData.publicUrl,
      storage_path: storagePath,
      thumbnail_path: thumbPath,
      original_filename: file.originalname,
      file_size: file.size,
      duration,
    });

    if (dbError) {
      logger.error('Failed to save B-Roll clip metadata', { error: dbError });
      throw new AppError('Failed to save clip', 500);
    }

    logger.info('User B-Roll clip uploaded', { userId, clipId, duration, fileSize: file.size });

    const response: ApiResponse = {
      success: true,
      data: {
        clip: {
          id: clipId,
          url: videoUrlData.publicUrl,
          thumbnailUrl: thumbUrlData.publicUrl,
          category: 'My Clips',
          label: file.originalname || 'My clip',
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    // Clean up temp file on error
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    if (error instanceof AppError) throw error;
    logger.error('B-Roll upload failed', { error });
    throw new AppError('Upload failed', 500);
  }
});

/**
 * GET /api/reels/broll-uploads
 * List the authenticated user's uploaded B-Roll clips
 */
router.get('/broll-uploads', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('user_broll_clips')
      .select('id, url, thumbnail_url, original_filename, duration, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to list clips', 500);
    }

    const clips = (data || []).map((row: any) => ({
      id: row.id,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      category: 'My Clips',
      label: row.original_filename || 'My clip',
    }));

    const response: ApiResponse = {
      success: true,
      data: { clips },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to list user B-Roll clips', { error });
    throw new AppError('Failed to list clips', 500);
  }
});

/**
 * DELETE /api/reels/broll-uploads/:id
 * Delete a user's uploaded B-Roll clip
 */
router.delete('/broll-uploads/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const clipId = req.params.id;

    // Fetch clip to verify ownership and get storage paths
    const { data: clip, error: fetchError } = await supabase
      .from('user_broll_clips')
      .select('storage_path, thumbnail_path')
      .eq('id', clipId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !clip) {
      throw new AppError('Clip not found', 404);
    }

    // Delete from storage
    await supabase.storage.from('reels').remove([clip.storage_path, clip.thumbnail_path]);

    // Delete database row
    await supabase.from('user_broll_clips').delete().eq('id', clipId).eq('user_id', userId);

    logger.info('User B-Roll clip deleted', { userId, clipId });

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to delete B-Roll clip', { error });
    throw new AppError('Failed to delete clip', 500);
  }
});
```

- [ ] **Step 3: Add missing imports if needed**

Check the top of `reels.ts`. Add `crypto` if not imported (needed for `crypto.randomUUID()`):
```typescript
import * as crypto from 'crypto';
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-platform-v2 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2
git add src/routes/reels.ts
git commit -m "feat: add POST/GET/DELETE broll-uploads endpoints for user B-Roll"
```

---

### Task 3: Frontend API client methods

**Files:**
- Modify: `echome-frontend/src/lib/api-client.ts` (add to the `brollReels` object, around line 3809)

- [ ] **Step 1: Add three methods to brollReels**

Find the `brollReels` object. Add these methods at the end (before the closing `}`):

```typescript
    /** Upload a user's own B-Roll video clip */
    uploadClip: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/reels/broll-uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min for large uploads
      });
      return response.data as {
        success: boolean;
        data: {
          clip: { id: string; url: string; thumbnailUrl: string; category: string; label: string };
        };
      };
    },

    /** List the authenticated user's uploaded B-Roll clips */
    getUserClips: async () => {
      const response = await apiClient.get('/reels/broll-uploads', { timeout: LIST_TIMEOUT });
      const envelope = response.data as { success: boolean; data: { clips: Array<{ id: string; url: string; thumbnailUrl: string; category: string; label: string }> } };
      return envelope.data;
    },

    /** Delete a user's uploaded B-Roll clip */
    deleteClip: async (clipId: string) => {
      const response = await apiClient.delete(`/reels/broll-uploads/${clipId}`);
      return response.data as { success: boolean };
    },
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/lib/api-client.ts
git commit -m "feat: add uploadClip, getUserClips, deleteClip to brollReels API client"
```

---

### Task 4: BRollStrip "+" upload button

**Files:**
- Modify: `echome-frontend/src/components/reels/BRollStrip.tsx`

- [ ] **Step 1: Add onUpload prop and upload button**

Replace the entire file:

```tsx
'use client';

import { useState, useRef } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface BRollClip {
  id: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  label?: string;
}

interface BRollStripProps {
  clips: BRollClip[];
  categories: string[];
  selectedClipId: string | null;
  onSelect: (clipId: string) => void;
  defaultCategory?: string;
  onUpload?: (file: File) => void;
  uploading?: boolean;
}

export function BRollStrip({
  clips,
  categories,
  selectedClipId,
  onSelect,
  defaultCategory,
  onUpload,
  uploading,
}: BRollStripProps) {
  const [activeCategory, setActiveCategory] = useState<string>(
    defaultCategory || (categories.includes('realestate') ? 'realestate' : 'All')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClips =
    activeCategory === 'All'
      ? clips
      : clips.filter((clip) => clip.category === activeCategory);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveCategory('All')}
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            activeCategory === 'All'
              ? 'bg-primary-interactive text-white'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-primary-interactive text-white'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Clip thumbnails */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {/* Upload button */}
        {onUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-primary-interactive/40 flex items-center justify-center text-primary-interactive hover:bg-primary-interactive/5 transition-colors disabled:opacity-50"
              title="Upload your own clip"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </>
        )}

        {filteredClips.length === 0 && !onUpload ? (
          <p className="py-4 text-center text-sm text-muted-foreground w-full">
            No clips in this category
          </p>
        ) : (
          filteredClips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              onClick={() => onSelect(clip.id)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-opacity hover:opacity-80 ${
                selectedClipId === clip.id
                  ? 'ring-2 ring-primary-interactive'
                  : ''
              }`}
              title={clip.label ?? clip.category}
            >
              <img
                src={clip.thumbnailUrl}
                alt={clip.label ?? clip.category}
                className="h-full w-full object-cover"
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/components/reels/BRollStrip.tsx
git commit -m "feat: add upload button and onUpload prop to BRollStrip"
```

---

### Task 5: Wire upload into ReelEditorModal

**Files:**
- Modify: `echome-frontend/src/components/reels/ReelEditorModal.tsx`

- [ ] **Step 1: Add uploading state and fetch user clips**

Find the `fetchData` callback (around line 68). Add `uploading` state near the other state declarations:

```typescript
const [uploading, setUploading] = useState(false);
```

Inside `fetchData`, update the `Promise.all` to also fetch user clips:

```typescript
const [libraryRes, reelProject, userClipsRes] = await Promise.all([
  api.brollReels.getBRollLibrary(),
  projectId
    ? api.reels.getProject(projectId).then((r) => r.data?.project ?? null)
    : api.brollReels.getByKitId(contentKitId),
  api.brollReels.getUserClips().catch(() => ({ clips: [] })),
]);
```

Then merge user clips into the clips array and categories:

```typescript
// Merge user clips (prepend "My Clips" category)
const userClips = userClipsRes?.clips || [];
const allClips = [...userClips, ...(libraryRes?.clips || [])];
const allCategories = [
  ...(userClips.length > 0 ? ['My Clips'] : []),
  ...(libraryRes?.categories || []),
];

setClips(allClips);
setCategories(allCategories);
```

Update the default clip selection to still prefer realestate:

```typescript
if (!selectedClipId && allClips.length > 0) {
  const realEstateClip = allClips.find((c: BRollClip) => c.category === 'realestate');
  setSelectedClipId(realEstateClip?.id || allClips[0].id);
}
```

- [ ] **Step 2: Add the upload handler**

Add after the `fetchData` callback:

```typescript
const handleBrollUpload = async (file: File) => {
  setUploading(true);
  try {
    const result = await api.brollReels.uploadClip(file);
    if (result.success && result.data?.clip) {
      const newClip = result.data.clip;
      setClips((prev) => [newClip, ...prev]);
      // Ensure "My Clips" is in categories
      setCategories((prev) =>
        prev.includes('My Clips') ? prev : ['My Clips', ...prev]
      );
      // Auto-select the new clip
      setSelectedClipId(newClip.id);
    }
  } catch (err) {
    console.error('B-Roll upload failed', err);
    setError('Upload failed. Check file size (max 50MB) and format (MP4/MOV/WebM).');
  } finally {
    setUploading(false);
  }
};
```

- [ ] **Step 3: Pass onUpload and uploading to BRollStrip**

Find the `<BRollStrip` JSX (around line 254). Add the new props:

```tsx
<BRollStrip
  clips={clips}
  categories={categories}
  selectedClipId={selectedClipId}
  onSelect={setSelectedClipId}
  onUpload={handleBrollUpload}
  uploading={uploading}
/>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit and push both repos**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/components/reels/ReelEditorModal.tsx
git commit -m "feat: wire user B-Roll upload into ReelEditorModal"
git push

cd /Users/aramammo/Side\ Quests/echome-platform-v2
git push
```
