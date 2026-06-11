# Clip Caption Editing — Phase 1 Design Spec

**Date:** 2026-04-30
**Author:** Ara + Claude
**Status:** DRAFT — for review

---

## Goal

Give users two abilities on every generated video clip:

1. **Edit caption text** — fix typos in the auto-transcribed captions burned onto the video.
2. **Move captions anywhere on the screen** — drag the caption block to any x/y position (not just top/middle/bottom).

Phase 2 (deferred): **extend the clip duration** to recover footage trimmed from the source. Out of scope here; the data model in this spec leaves room for it.

---

## Why this isn't a fresh design — we already built the foundation

This is the second half of a pattern that already shipped for **carousels** (commits `7ea94a1`, `f088cd5`, `6fb8457`, `f306e0d`). The carousel-drag-to-position spec at `docs/superpowers/specs/2026-04-18-carousel-drag-to-position-design.md` says explicitly (line 5):

> "Scope: Carousel slides only. **Clip captions will follow the same pattern in a future spec.**"

And line 159, on the `DraggableTextOverlay` component:

> "This component is **designed to be reusable for the future clip caption drag-to-position feature.**"

This spec is that future spec.

---

## What's already in the codebase (Phase 0 audit)

### Frontend (`src/components/content-kit/`)

| Component | LOC | What it does |
|---|---|---|
| `ClipEditorModal.tsx` | 348 | Already has video preview, caption STYLE picker, caption POSITION enum (`top`/`middle`/`bottom`), transcript preview (read-only), download button. **Missing**: editable transcript, drag-to-position. |
| `CarouselEditorModal.tsx` | 387 | Already has draggable text overlay on slide background. **Working pattern to copy.** |
| `DraggableTextOverlay.tsx` | 128 | Reusable component. Has the `fix(84581a0): fixed pixel width to prevent resize on drag` battle-scar fix. **Use as-is.** |

### Backend (`src/services/`)

| File | What it does |
|---|---|
| `video/reel-orchestrator.ts` | Renders B-roll reels with captions burned in via FFmpeg. Reads `trim_start_ms`/`trim_end_ms` from clip rows. |
| `clip-finder/clip-finder-service.ts` | Stores `caption_config` as JSONB on clip rows. |
| `routes/clips.ts` (and friends) | Has `PATCH /api/clips/:id` that accepts `captionStyle` + `captionPosition`. |

### Database

- `caption_position` is **NOT a column** — it's stored inside `caption_config` JSONB. This was learned the hard way:
  - `562adcc Revert caption_config workaround, use caption_position column` (added column)
  - `68ab35a Fix caption position: column doesn't exist, use caption_config JSON` (reverted to JSON)
  - **Lesson: don't add a column. Extend the JSONB.**

---

## Mistakes from prior attempts — what NOT to do

From git history:

1. **`ee04494 revert: disable carousel editor pending drag-to-position redesign`** — *"The burned-in text overlay approach doesn't work — need background-only slides with draggable text layers. Will rebuild after brainstorming proper architecture."*
   → **Lesson: never try to edit text on top of an already-burned-in image/video. Always render without captions, layer captions on the frontend, composite at export time.**

2. **`562adcc` → `68ab35a` (caption position column thrash)** → **Lesson: extend the existing `caption_config` JSONB. No new columns.**

3. **`a4185d2 Fix: overlapping captions in downloaded clips`** + **`0cb659c Fix: caption overlap from Layer 0/1 width mismatch in highlight style`** → **Lesson: caption rendering has subtle layer-width math. Test the `highlight` style + edge positions specifically.**

4. **`81414c8 Fix caption burn-in: respect user's position choice for split-screen exports`** → **Lesson: split-screen mode has its own constraints. New caption-position logic must work in both single AND split modes.**

5. **`84581a0 fix: use fixed pixel width for draggable text to prevent resize on drag`** → Already fixed in `DraggableTextOverlay`. Inherit this fix; don't undo it.

---

## Architecture — borrow the carousel two-phase pattern

```
                 ┌─────────────────────────┐
                 │  Source video (S3/R2)   │
                 │  Already preserved as   │
                 │  uploads.original_url   │
                 └────────────┬────────────┘
                              │
                              ▼
     ┌────────────────────────────────────────┐
     │  Clip extraction (FFmpeg)              │
     │  trim_start_ms / trim_end_ms applied   │
     │  ──────────────────────────────────── │
     │  Output A: clip-{id}-raw.mp4           │  ← NEW: text-free clip
     │  (background analog of carousel slide) │
     │                                        │
     │  Output B: clip-{id}.mp4               │  ← Existing burned-in clip
     │  Burned-in captions at default pos     │     for backwards compat
     └────────────────────────────────────────┘
                              │
                              ▼
       Frontend ClipEditorModal:
         - Plays clip-{id}-raw.mp4 (no burned captions)
         - Overlays captions as <DraggableTextOverlay>
         - User edits text in transcript pane
         - User drags caption block to any x/y
                              │
                              ▼
              At Download/Post:
                ┌────────────────────────────┐
                │  POST /api/clips/{id}/     │
                │       finalize             │
                │  body: {                   │
                │    captionPosition:{x,y},  │
                │    captionSegments: [...], │
                │    captionStyle, viewMode  │
                │  }                         │
                └─────────────┬──────────────┘
                              │
                              ▼
               Backend: FFmpeg drawtext / ASS file
               with user-edited text at user x/y
                              │
                              ▼
                ┌────────────────────────────┐
                │  clip-{id}-final-{hash}.mp4│
                │  Cached by recipe hash     │
                └────────────────────────────┘
```

The cache hash is critical: `2a39ee5 Cache-bust clip exports by settings hash + early cache-hit return` — already wired. Re-rendering the same edit is free.

---

## Backend changes

### 1. Render a captionless "raw" clip alongside every export

**File:** `src/services/video/clip-renderer.ts` (or wherever the FFmpeg burn-in lives)

Render passes:
- **Pass A**: clip + audio, **no captions**, upload as `clip-{id}-raw.mp4`. Stored alongside existing exports.
- **Pass B**: existing burned-in clip — keep for backwards compat (older preview pages, scheduled posts that already locked in a recipe).

For new clips going forward, both pass A and pass B can still run, OR we skip pass B entirely if frontend uses pass A + overlay (saves render time + storage). Recommend skipping pass B in new pipeline; falling back to legacy pass B for clips that don't yet have raw.

### 2. Extend `caption_config` JSONB shape

**No schema migration.** Add fields to the JSON:

```typescript
interface CaptionConfig {
  // Existing
  style?: 'modern' | 'highlight' | 'bold' | ...;
  position?: 'top' | 'middle' | 'bottom';  // legacy enum, kept for old clips

  // NEW
  positionXY?: { x: number; y: number };   // 0-1 normalized; takes precedence over position enum
  segmentOverrides?: Array<{
    index: number;       // segment index in transcriptSegments
    text: string;        // user-edited text replacing the auto-transcribed text
  }>;
}
```

Migration order on read: `positionXY` if set → `position` enum if set → default `bottom`.

### 3. New endpoint: `POST /api/clips/:id/finalize`

Replaces the implicit "settings hash → re-export" flow with an explicit finalize call. Body:

```typescript
{
  captionStyle: CaptionStylePreset;
  captionPositionXY?: { x: number; y: number };  // optional — falls back to position enum
  segmentOverrides?: Array<{ index: number; text: string }>;
  viewMode: 'single' | 'split';
  outputFormat: '9:16' | '1:1' | '16:9';
}
```

Response:
```typescript
{
  status: 'cached' | 'rendering';
  url: string;          // ready when cached, polling target when rendering
  recipeHash: string;
}
```

### 4. Caption rendering supports x/y placement

Two implementation options for FFmpeg:

**Option A: ASS subtitle file with `\an5\pos(x,y)`** (preferred)
- ASS lets us position each subtitle line precisely
- Already used elsewhere — see `830fc80 Fix caption file upload: use application/octet-stream for SRT/ASS files`
- Cleanest for variable-position-per-segment if we ever want it

**Option B: FFmpeg drawtext filter with `x=` / `y=` formulas**
- Simpler for static positioning but harder for word-by-word highlight styles
- Existing pipeline likely uses this — refactor risk

**Recommend ASS file generation for the captionPositionXY path; keep drawtext for legacy enum positions.**

---

## Frontend changes

### 1. ClipEditorModal — add edit capabilities

**File:** `src/components/content-kit/ClipEditorModal.tsx`

Replace the read-only transcript pane (lines 285–303) with editable segments:

```tsx
{captionSegments.map((seg, i) => (
  <div key={i} className="flex gap-2 text-xs">
    <span className="font-mono shrink-0 w-12 text-right">{formatDuration(seg.start)}</span>
    <input
      value={segmentEdits[i]?.text ?? seg.text}
      onChange={e => setSegmentEdits(prev => ({ ...prev, [i]: { index: i, text: e.target.value } }))}
      className="flex-1 bg-transparent border-b border-border focus:border-primary-interactive outline-none"
    />
  </div>
))}
```

Preview overlay reflects edits in real-time.

### 2. Replace 3-position picker with `DraggableTextOverlay`

Replace `<CaptionPositionControl>` (line 264–268) with the existing `DraggableTextOverlay`. Wire it to the `VideoPlayer` so the caption renders as an absolutely-positioned `<div>` inside the player container, not via the existing burned-in path.

State:
```tsx
const [captionPositionXY, setCaptionPositionXY] = useState<{ x: number; y: number }>(
  clip.captionConfig?.positionXY ?? legacyEnumToXY(clip.captionPosition ?? 'bottom')
);
```

`legacyEnumToXY` returns `{x: 0.5, y: 0.85}` for bottom, `{x: 0.5, y: 0.5}` for middle, `{x: 0.5, y: 0.15}` for top — same anchor points the enum implied.

### 3. VideoPlayer caption overlay — render edited segments at x/y

**File:** `src/components/video-player.tsx` (or wherever caption rendering lives)

The player already has a `captionSegments` prop. Add:

```tsx
positionXY?: { x: number; y: number };
draggableMode?: boolean;
onPositionChange?: (pos: { x: number; y: number }) => void;
```

When `draggableMode` is true and the modal is open, captions render via `DraggableTextOverlay` instead of the static-position rendering. Outside the modal (kit detail card, scheduled post preview), it stays static — no drag UI on the public-facing thumbnail.

### 4. Persist edits on Save / Download

Save button = persist `captionConfig.positionXY` and `segmentOverrides` via `PATCH /api/clips/:id`.

Download / Post = call new `POST /api/clips/:id/finalize` with the recipe; the existing `VisualPostActions` already passes a `finalizationRecipe` (line 332-340) — extend the recipe to include `captionPositionXY` and `segmentOverrides`. Backend's existing cache-by-hash logic dedupes if user hasn't changed anything since last export.

---

## What this does NOT include (deferred to Phase 2)

- **Clip extension** (recovering trimmed footage): needs source video scrubber UI + trim handle drag + re-extract from source. Bigger lift, separate spec.
- **Per-segment caption position** (different x/y per segment): the data model supports it, but UI would be a confusing scrubber-overlay-drag interaction. Single global position for v1.
- **Caption font / color / size pickers**: keep template-driven via `captionStyle` for v1.
- **Multi-line caption support beyond what FFmpeg already handles**: word-wrap stays at FFmpeg's default for v1.
- **Undo/redo**: edits are ephemeral until Save.

---

## Files to touch

### Backend (echome-platform-v2)

| File | Change |
|---|---|
| `src/services/video/clip-renderer.ts` (or equivalent) | Add captionless render pass; output `clip-{id}-raw.mp4`. |
| `src/services/clip-finder/clip-finder-service.ts` | Read/write extended `caption_config` JSONB shape; expose helper for `getRawClipUrl()`. |
| `src/routes/clips.ts` | New `POST /api/clips/:id/finalize` endpoint; extend `PATCH /:id` to accept new caption_config fields. |
| `src/services/video/caption-renderer.ts` (or equivalent) | ASS subtitle generation with `\an5\pos()` for `positionXY` path; keep drawtext for legacy enum. |
| (no migration) | `caption_config` is JSONB — no schema change. |

### Frontend (echome-frontend)

| File | Change |
|---|---|
| `src/components/content-kit/ClipEditorModal.tsx` | Editable transcript pane; replace position enum with DraggableTextOverlay; wire finalize endpoint. |
| `src/components/video-player.tsx` | Caption overlay renders at `positionXY`; supports draggable mode. |
| `src/components/content-kit/DraggableTextOverlay.tsx` | **No changes** — reuse as-is. |
| `src/lib/api-client.ts` | Add `clips.finalize()`; extend `clips.updateClip()` payload. |
| `src/types/clip.ts` (or equivalent) | Extend `CaptionConfig` interface to match backend. |

---

## Test cases that must pass

Drawn from prior bug fixes — these are the regression hot zones:

1. **Highlight style at edge positions** (`0cb659c` regression). Drag caption to top edge with highlight style — no layer-width mismatch.
2. **Split-screen mode** (`81414c8` regression). Caption position user-set in split-screen mode burns at the right place in the export.
3. **Long captions wrap correctly** at all positions. Don't run off-screen at left/right edges.
4. **Legacy clips with enum-only position** still render correctly. `positionXY` undefined → fall back to enum → fall back to `bottom`.
5. **Re-export with no edits** hits the cache (recipe hash unchanged) — `2a39ee5` regression check.
6. **Edited segment text** survives a refresh of the modal. `segmentOverrides` persists in `caption_config`.
7. **Captions burned in (legacy clips)** — edit panel is read-only. Match existing behavior at line 276-282.

---

## Rollout

1. Ship the captionless render pass. Run for 1 week alongside the existing pipeline; verify both outputs work.
2. Ship `POST /:id/finalize`. Verify cache hit on no-change.
3. Ship the new ClipEditorModal behind a per-user feature flag (`CLIP_EDIT_V2_ENABLED`). Internal-only first.
4. Flip the flag for paying users.
5. Drop the legacy burned-in render pass once flag is global.

No DB migration required at any step.

---

## Open questions

1. **Storage cost**: every clip now stores TWO versions (raw + final-cached-per-recipe). Storage doubles for active editing users. Worth it? Estimate: at current scale (~180 users, ~5 clips/user), maybe 100GB extra at most. Trivial. Approve.

2. **Render time**: every new clip pays the cost of 2 render passes upfront. Should we lazy-render the raw clip only on first edit? **Recommended yes** — track `raw_url` as nullable; render on first edit-modal-open.

3. **Mobile drag UX**: `DraggableTextOverlay` already supports touch via the carousel work. Verify on iOS Safari at modal-portrait sizes.

4. **Delete-and-recreate vs. update**: when user changes segments, do we update the existing clip row or create a new variant? Recommend update + recipe-hash cache for the rendered file.

---

## What ships in Phase 1

- ✅ Edit caption text inline in the transcript pane
- ✅ Drag caption to any x/y position
- ✅ Live preview reflects edits
- ✅ Export uses edited text + drag position
- ✅ Existing recipe-hash cache deduplicates re-renders
- ❌ Clip extension (Phase 2)
- ❌ Per-segment positions (deferred — single global position only)
- ❌ Font/color customization (deferred — template-driven)

---

## Estimated effort

| Phase 1 piece | Days |
|---|---|
| Backend captionless render pass + lazy-render | 1.5 |
| Backend `caption_config` extension + finalize endpoint | 1 |
| Backend ASS-based positioning render | 1 |
| Frontend ClipEditorModal rebuild | 1.5 |
| Frontend VideoPlayer caption overlay updates | 1 |
| Test cases + edge case fixes | 1 |
| **Total** | **~7 days** |

Phase 2 (clip extension): rough estimate +5 days. Source-video scrubber UI is the biggest unknown.
