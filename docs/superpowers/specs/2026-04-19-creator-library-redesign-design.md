# Creator Library Redesign — Design Spec

**Goal:** Redesign the Creator Library from a tab-based browse-only catalog into a section-based, action-oriented content toolkit with AI B-Roll generation, real estate focus, and "Use in Reel" actions on every asset.

**Scope:** Frontend redesign + integration with existing Kling B-Roll generation backend. Generated clips saved to `user_broll_clips` table (already exists from upload feature).

---

## Page Layout

No tabs. One scrollable page with an AI generation input at the top and three content sections below.

```
┌─ Creator Library
│  "Your content toolkit — clips, templates, and scripts"
│
├─ [AI B-Roll input]
│  "Describe your ideal B-Roll clip..."
│  [sparkle] [→]
│  Hints: luxury kitchen · aerial neighborhood · open house walkthrough
│
├─ B-Roll Clips
│  [category pills: realestate · lifestyle · abstract · ...]
│  [grid: curated + user generated + user uploaded]
│
├─ Caption Templates
│  [compact text cards with Copy + Use actions]
│
└─ Reel Scripts
│  [compact text cards with Copy + Use in Reel actions]
```

---

## AI B-Roll Generation

**Input:** Textarea with placeholder "Describe your ideal B-Roll clip..." — sparkle icon left, submit arrow right. Same input pattern as Create page and Build Your Voice.

**Helper hint pills** below the input (clickable, fill the input):
- "luxury kitchen walkthrough"
- "aerial neighborhood shot"
- "modern condo lobby"
- "open house walkthrough"
- "sold sign celebration"

**On submit:** Calls the existing Kling B-Roll generation API. Shows inline progress below the input: spinner + "Generating your clip... usually takes 30-60 seconds."

**On completion:** Generated clip appears at the top of the B-Roll section with a "New" badge. Also saved to `user_broll_clips` table so it shows up in the Reel Editor's BRollStrip under "My Clips."

**Storage:** `reels` bucket at `{userId}/broll-generated/{generationId}.mp4` + thumbnail. Row inserted into `user_broll_clips` with the same interface as uploaded clips.

**Backend:** The existing `broll_generations` table and Kling integration handle the generation. We need one new backend endpoint to bridge the gap: take the generated clip from `broll_generations` and copy it to `user_broll_clips` so it appears in the Reel Editor.

---

## B-Roll Section

**Header:** "B-Roll Clips" + count + collapsible toggle. Expanded by default.

**Category pills:** realestate (default) + all other categories from the data + "All". Same pill pattern used throughout the app.

**Grid:** `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3`. Cards at 4:5 aspect ratio.

**Card types in the grid (mixed):**
1. **Curated clips** — from `curated_assets` table. No badge.
2. **User-generated clips** — from `user_broll_clips` where source is AI generation. "Generated" badge.
3. **User-uploaded clips** — from `user_broll_clips` where source is upload. "My Clip" badge.

**Card design:**
- 4:5 thumbnail
- Hover overlay with two actions: "Use in Reel" + "Save"
- "Use in Reel" opens `ReelEditorModal` with this clip pre-selected
- "Save" downloads the clip
- Category badge bottom-left on curated clips

**Data fetching:** Fetch both `api.curatedAssets.list({ type: 'b_roll' })` and `api.brollReels.getUserClips()` in parallel. Merge user clips at the top, curated below.

---

## Caption Templates Section

**Header:** "Caption Templates" + count + collapsible toggle. Expanded by default.

**Cards:** Compact horizontal layout (not the tall video grid). Each card is full-width with:
- Preview text (first ~120 chars, truncated)
- Category pill inline
- Two actions right-aligned: "Copy" (clipboard) + "Use" (opens Create page with template pre-filled as topic)

**Data:** `api.curatedAssets.list({ type: 'caption_template' })`. No category filter needed (fewer items).

---

## Reel Scripts Section

**Header:** "Reel Scripts" + count + collapsible toggle. Expanded by default.

**Cards:** Same compact horizontal layout as Caption Templates:
- Preview text (~100 chars)
- Category pill
- Two actions: "Copy" + "Use in Reel" (opens Reel Editor with script text as segment overlays)

**Data:** `api.curatedAssets.list({ type: 'reel_script' })`.

---

## Integration with Reel Editor

Generated and uploaded B-Roll clips already appear in the `BRollStrip` component via `api.brollReels.getUserClips()` (built in the B-Roll upload sprint). No additional wiring needed — the `ReelEditorModal` already fetches user clips on mount.

"Use in Reel" action from the library: opens `ReelEditorModal` with the clip's ID pre-selected via `selectedClipId` state.

---

## What Gets Removed

1. **3 tab navigation** (B-Roll / Caption Templates / Reel Scripts) — replaced by sections
2. **Month navigation** (already removed in quick-wins)
3. **Browse-only interaction** — every card now has actions

---

## File Changes

| Action | File | What |
|--------|------|------|
| Rewrite | `src/app/app/library/CreatorLibraryContent.tsx` | Section-based layout, AI input, action cards, merged data fetching |
| Create | `src/app/app/library/BRollGenerateInput.tsx` | **New** — AI B-Roll generation input with hints + progress |
| Create | `src/app/app/library/AssetTextCard.tsx` | **New** — compact horizontal card for caption templates + reel scripts |

**Backend (echome-platform-v2):**
| Action | File | What |
|--------|------|------|
| Modify | `src/routes/reels.ts` | Add endpoint to save a `broll_generation` result to `user_broll_clips` |

---

## What This Does NOT Include

- Monthly content drops UI (removed — show all content)
- Admin curation tools
- Asset rating or favorites
- Search within the library
- Tier-gating per asset (existing `min_tier` field respected but no new UI)
- Mobile-specific layout (responsive follows naturally)
