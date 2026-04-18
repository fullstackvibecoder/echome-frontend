# B-Roll Reel Content Kit Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make B-roll reels an auto-generated content kit output with Level 3 authority hook text, editable via a modal over the content kit detail page.

**Architecture:** The existing `compose-broll` endpoint and `reel_projects` table are reused. A new service generates Level 3 authority hook text via LLM. The content kit pipeline auto-creates a `reel_project` row after content generation. The frontend adds a modal editor (phone preview + B-roll strip + text editor + style picker) that opens from the content kit detail page, replacing the 3-step wizard for kit-linked reels.

**Tech Stack:** Backend: Node.js, Anthropic SDK, Supabase, existing FFmpeg pipeline. Frontend: React, TypeScript, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-18-broll-reel-content-kit-integration.md`

**Repos:**
- Backend: `/Users/aramammo/Side Quests/echome-platform-v2`
- Frontend: `/Users/aramammo/Side Quests/echome-frontend`

---

## File Structure

### Backend

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/services/video/authority-hook-generator.ts` | LLM service: generates Level 3 authority hook text segments from content kit context |
| Modify | `src/services/video/reel-orchestrator.ts` | Add `autoCreateFromContentKit(kitId, userId)` method that auto-selects B-roll, generates hook text, creates reel_project row |
| Modify | `src/services/clip-finder/clip-finder-service.ts` | Call `autoCreateFromContentKit` after content generation step in `runProcessingPipeline` |
| Create | `src/routes/broll-library.ts` | New endpoint: `GET /api/reels/broll-library` returning curated clips grouped by category |

### Frontend

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/reels/BRollStrip.tsx` | Compact horizontal scrollable strip of B-roll thumbnails with category tabs |
| Create | `src/components/reels/ReelEditorModal.tsx` | Modal: phone preview left, controls right (B-roll strip, text editor, style picker, generate button) |
| Modify | `src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` | Add reel card to output grid, wire modal open/close |
| Modify | `src/lib/api-client.ts` | Add `api.reels.getBRollLibrary()` and `api.reels.getByKitId(kitId)` methods |

---

### Task 1: Backend — Authority Hook Generator Service

**Files:**
- Create: `echome-platform-v2/src/services/video/authority-hook-generator.ts`

- [ ] **Step 1: Create the service**

This service takes content kit context and generates Level 3 authority hook text segments via the Anthropic SDK. Read the existing Anthropic usage pattern in the codebase first — check `src/services/generation/templates/reel-content.ts` or any other LLM call to match the client instantiation pattern (`new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`).

The service exports one function:

```typescript
export interface HookSegment {
  text: string;
  duration: number; // seconds
}

export async function generateAuthorityHook(context: {
  topic: string;
  instagramCaption: string;
  userRole?: string;
  userTopics?: string;
  userCta?: string;
  knowledgeBaseContext?: string;
}): Promise<HookSegment[]>
```

The system prompt is specified in the spec under "Authority Content Framework — Text Overlay Prompting". Include the full prompt with all 8 rules and the JSON output format. Use `claude-haiku-4-5-20251001` for speed (this runs in the content kit pipeline and shouldn't add significant latency).

Parse the JSON array response. Validate 2-4 segments, each with `text` (string, non-empty) and `duration` (number, 2-6 seconds). If parsing fails, fall back to splitting the Instagram caption into 2-3 segments of ~8 words each.

- [ ] **Step 2: Run typecheck**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/video/authority-hook-generator.ts
git commit -m "feat: add authority hook generator — Level 3 text overlay via LLM"
```

---

### Task 2: Backend — B-Roll Library Endpoint

**Files:**
- Create: `echome-platform-v2/src/routes/broll-library.ts`
- Modify: `echome-platform-v2/src/index.ts` (mount the route)

- [ ] **Step 1: Investigate where curated B-roll clips are stored**

Search the backend for how the current Reel Maker's B-roll grid gets its data. Check:
- Is there a `curated_broll_clips` table?
- Are they stored in Supabase Storage?
- Is there a config file listing them?
- Check `src/routes/reels.ts` for any endpoint that returns B-roll clips for the wizard

The answer determines whether this is a DB query or a static file read.

- [ ] **Step 2: Create the endpoint**

```typescript
// GET /api/reels/broll-library?category=abstract
// Returns curated B-roll clips grouped by category

router.get('/broll-library', authenticateUser, async (req, res) => {
  const category = req.query.category as string | undefined;
  
  // Fetch clips (implementation depends on storage — DB table, storage bucket, or config)
  // Return: { categories: string[], clips: Array<{ id, url, thumbnailUrl, category, tags, label }> }
});
```

- [ ] **Step 3: Mount the route in index.ts**

Read `src/index.ts`, find where other routes are mounted (e.g., `app.use('/api/reels', reelsRouter)`), and add the new route. If the existing reels router already handles this path, add the endpoint there instead of creating a new file.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/routes/broll-library.ts src/index.ts
git commit -m "feat: add B-roll library endpoint for curated clips by category"
```

---

### Task 3: Backend — Auto-Create Reel in Content Kit Pipeline

**Files:**
- Modify: `echome-platform-v2/src/services/video/reel-orchestrator.ts`
- Modify: `echome-platform-v2/src/services/clip-finder/clip-finder-service.ts`

- [ ] **Step 1: Read the existing reel orchestrator**

Read `src/services/video/reel-orchestrator.ts` fully. Find the `CreateFromContentKitRequest` interface — it already exists. Understand how reel projects are created from content kits today (the current manual flow).

- [ ] **Step 2: Add autoCreateFromContentKit method**

Add a method to the reel orchestrator that:

1. Fetches the content kit (title, topic, Instagram caption)
2. Fetches the user's profile (profile_role, profile_topics, profile_cta)
3. Calls `generateAuthorityHook()` to get Level 3 text segments
4. Auto-selects a B-roll clip from the curated library (first clip in the most relevant category, or default to "abstract")
5. Creates a `reel_projects` row with:
   - `content_kit_id` = the kit ID
   - `user_id` = the user
   - `status` = 'draft'
   - `title` = content kit title
6. Creates `reel_project_clips` row(s) for the selected B-roll
7. Stores the text segments in the project (check if there's a `text_segments` column or if they go in a separate table/JSON field — adapt to the existing schema)
8. Returns the created project

This method should NOT render the reel video — just create the config. Rendering happens when the user clicks "Generate Reel" in the modal.

Wrap in try/catch — if reel auto-creation fails, log a warning and continue. Don't let reel failures break the content kit pipeline.

- [ ] **Step 3: Hook into the content kit pipeline**

Read `src/services/clip-finder/clip-finder-service.ts`, find the `runProcessingPipeline` method. Locate the content generation step (after `updateUploadStatus(uploadId, 'generating', ...)`). After content generation completes successfully, add:

```typescript
// Auto-create B-roll reel from the content kit (non-blocking)
try {
  const reelOrchestrator = getReelOrchestrator(); // or however the service is accessed
  await reelOrchestrator.autoCreateFromContentKit(contentKit.id, userId);
  logger.info('Auto-created B-roll reel for content kit', { contentKitId: contentKit.id });
} catch (reelErr) {
  // Don't fail the pipeline — reel is optional
  logger.warn('Failed to auto-create B-roll reel', { contentKitId: contentKit.id, error: reelErr });
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/services/video/reel-orchestrator.ts src/services/clip-finder/clip-finder-service.ts
git commit -m "feat: auto-create B-roll reel in content kit pipeline with Level 3 hook"
```

- [ ] **Step 5: Push backend**

```bash
git push origin main
```

---

### Task 4: Frontend — BRollStrip Component

**Files:**
- Create: `echome-frontend/src/components/reels/BRollStrip.tsx`

- [ ] **Step 1: Create the compact B-roll picker**

A horizontal scrollable strip of B-roll thumbnails with category tabs above. Replaces the overwhelming full-page grid from the current wizard.

Props:
```typescript
interface BRollStripProps {
  clips: Array<{ id: string; url: string; thumbnailUrl: string; category: string; label?: string }>;
  categories: string[];
  selectedClipId: string | null;
  onSelect: (clipId: string) => void;
}
```

Layout:
- Category tabs (horizontal pills): `abstract | realistic | lifestyle | creative | vintage`
- Below: horizontal scrollable strip of clip thumbnails (~64px square, rounded-lg)
- Selected clip has `border-primary-interactive` border (2px)
- Scrollable with overflow-x-auto, no scrollbar on desktop (use `-webkit-scrollbar: none`)
- ~6 clips visible at a time

- [ ] **Step 2: Typecheck + commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit
git add src/components/reels/BRollStrip.tsx
git commit -m "feat: add BRollStrip — compact horizontal B-roll picker"
```

---

### Task 5: Frontend — ReelEditorModal Component

**Files:**
- Create: `echome-frontend/src/components/reels/ReelEditorModal.tsx`
- Modify: `echome-frontend/src/lib/api-client.ts`

- [ ] **Step 1: Add API methods**

Add to `api-client.ts`:

```typescript
// In the reels namespace
getBRollLibrary: async (category?: string) => {
  const response = await apiClient.get('/reels/broll-library', { params: { category } });
  return response.data;
},

getByKitId: async (kitId: string) => {
  // Check if there's already an endpoint for this, or use the projects list with a filter
  const response = await apiClient.get('/reels/projects', { params: { content_kit_id: kitId } });
  return response.data;
},
```

Check what `api.reels` namespace already exists in the api client. Add these methods to it. If the namespace doesn't exist, create it.

- [ ] **Step 2: Create the modal component**

The modal opens over the content kit detail page. It does NOT navigate away.

Layout (desktop ≥1024px):
- Left: Phone frame preview (9:16 aspect ratio) showing B-roll + text overlay
- Right: Controls stacked vertically:
  1. B-Roll picker (BRollStrip component)
  2. Text editor (textarea pre-filled with generated hook text, editable)
     - "Use IG Caption" button to reset to the original caption
     - Segment tabs if multiple segments
  3. Style selector (horizontal pills — Bold Impact, Minimal Clean, etc.)
  4. Generate Reel / Download button

Props:
```typescript
interface ReelEditorModalProps {
  open: boolean;
  onClose: () => void;
  contentKitId: string;
  reelProjectId?: string; // if auto-generated, this exists
  instagramCaption?: string; // for the "Use IG Caption" fallback
}
```

The modal fetches its own data on mount:
- B-roll library via `api.reels.getBRollLibrary()`
- Reel project details (if reelProjectId provided)
- Text overlay styles via existing endpoint

Use the existing `TextOverlayPreview` component for the phone preview if it works standalone, otherwise build a simple preview.

Modal behavior:
- Fade + slide-up animation
- Close on ×, Escape, backdrop click
- Max width 800px, vertically centered
- Stacks vertically on mobile (<1024px)

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/reels/ReelEditorModal.tsx src/lib/api-client.ts
git commit -m "feat: add ReelEditorModal — inline B-roll reel editor"
```

---

### Task 6: Frontend — Content Kit Detail Page Integration

**Files:**
- Modify: `echome-frontend/src/app/app/content-kit/[id]/ContentKitDetailContent.tsx`

- [ ] **Step 1: Read the current file**

Read `ContentKitDetailContent.tsx` fully. Find:
- Where `VideoReelSection` is rendered (this is the existing reel integration point)
- How the content kit data is fetched (what API call, what response shape)
- Whether the linked reel project is already fetched (check for `reel_project` or `linkedReel` in the data)

- [ ] **Step 2: Add reel card + modal integration**

Replace or augment the existing `VideoReelSection` with:

1. A reel card in the output grid (alongside clips and posts):
   - If reel project exists and has a thumbnail: show phone-frame preview + "B-Roll Reel" title + style/segment info
   - If reel project exists but no thumbnail: show a placeholder card with "B-Roll Reel" + "Edit" link
   - If no reel project: show "Create a Reel" card with a + icon
   - Clicking any state opens the ReelEditorModal

2. Import and render `ReelEditorModal` with:
   - `open` controlled by local state
   - `contentKitId` from the page params
   - `reelProjectId` from the fetched reel project (if exists)
   - `instagramCaption` from the content kit's Instagram content field

3. The existing "Generate Reel" button in VideoReelSection should be replaced by this card. If VideoReelSection does more than just the button (like showing reel status), integrate that into the card.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/app/content-kit/[id]/ContentKitDetailContent.tsx
git commit -m "feat: add reel card + modal editor to content kit detail page"
```

---

### Task 7: Build + Push Frontend

- [ ] **Step 1: Production build**

```bash
npm run build
```

- [ ] **Step 2: Push**

```bash
git push origin HEAD:main
```

---

## Notes

- The authority hook generator uses `claude-haiku-4-5-20251001` for speed. The content kit pipeline already takes 2-5 minutes; adding a fast LLM call (~1-2 seconds) is acceptable. A slow model is not.
- The auto-generation step in `runProcessingPipeline` is wrapped in try/catch and logs on failure. A reel creation failure must NEVER break the content kit pipeline.
- The reel project is created as `status: 'draft'`. The actual video rendering (FFmpeg composition) only happens when the user clicks "Generate Reel" in the modal. This keeps the pipeline fast.
- The B-roll library endpoint may need to be adapted based on how curated clips are currently stored (DB table vs storage bucket vs config file). Task 2 includes an investigation step.
- The `TextOverlayPreview` component already exists in `src/components/reels/` — reuse it in the modal if it works standalone. If it depends on the wizard context, build a simpler preview.
- The standalone Reel Maker page (`/app/reels`) is NOT modified or removed. It continues to work as the "reel from scratch" secondary path.
