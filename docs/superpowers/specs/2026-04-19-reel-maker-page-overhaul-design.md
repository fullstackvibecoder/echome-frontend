# Reel Maker Page Overhaul — Design Spec

**Goal:** Fix the empty-card problem, remove the duplicate inline editor, add status grouping, and make the reel maker page match the content kit list page pattern.

**Scope:** Frontend only. No backend changes needed — all endpoints exist.

---

## Problems Being Solved

1. **Empty cards on wide monitors** — 3-column grid with 9:16 aspect ratio thumbnails creates ~1066px tall cards. Drafts with no thumbnail are a void of empty space.
2. **Duplicate editors** — `ReelsContent.tsx` has a 150-line inline editor AND there's a full editor at `/app/reels/[id]` (793 lines). Two editors for the same thing.
3. **No status grouping** — all reels dumped in one flat grid. Can't distinguish drafts from ready-to-publish.
4. **No card actions** — can't delete from the card. Have to enter editor first.
5. **Draft cards are indistinguishable** — no thumbnail, no hook text preview.
6. **Create flow is limited** — only a topic input. No way to start from B-Roll wizard or content kit.

---

## Page Layout

### Header
"Reel Maker" title + subtitle. Clean, minimal.

### Create Bar
Single compact row, not a giant card. Three entry points:

1. **Topic input + Create button** — text input ("What's this reel about?") creates a new reel project with AI-generated hooks
2. **"B-Roll Wizard" link** — opens the existing `BRollReelWizard` component (863 lines, already built, just not wired in)
3. **"From Content Kit" link** — opens a simple kit picker (recent kits list), then opens `ReelEditorModal` with the selected kit's content

### Status-Grouped Grid
Four sections using the shared `StatusSection` component:

| Section | Dot Color | Default State |
|---------|-----------|---------------|
| Drafts | Gray (#888) | Expanded |
| Rendering | Amber (#f59e0b) | Always expanded |
| Ready | Green (#22c55e) | Expanded |
| Earlier | Muted (#666) | Collapsed |

Status mapping from `project.status`:
- `draft` → Drafts
- `processing` / `rendering` → Rendering
- `completed` → Ready
- `failed` → Drafts (show with error indicator)
- Anything older than 30 days → Earlier (regardless of status)

---

## Card Design

### Grid
`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5` — cards land at ~200-240px wide. Keeps 9:16 aesthetic without the 1066px void.

### Completed Cards (have thumbnail)
- 9:16 thumbnail image
- Play button overlay on hover
- Status badge top-left: "Ready" green pill
- Below thumbnail: title (1 line, truncated), date + style pill (e.g., "Bold Impact")
- Hover action row: Open / Delete

### Draft Cards (no thumbnail)
- Same 9:16 aspect container
- Dark background with hook text rendered in the reel's selected text style — looks like a fake reel frame, gives instant visual context
- Falls back to topic text if no hook text exists
- Status badge: "Draft" gray pill
- Below: title, date
- Hover actions: Open / Delete

### Rendering Cards
- Thumbnail if available, otherwise draft-style preview
- Animated progress bar at bottom edge
- Status badge: "Rendering..." amber pill with pulse animation
- No hover actions while rendering

### Card Click Behavior
- **B-Roll type reels** (no `templateId`): open `ReelEditorModal` as a modal on the current page
- **Template-based reels** (have `templateId`): navigate to `/app/reels/[id]`

### Delete Action
- Hover-revealed trash icon
- Click shows inline confirmation ("Delete?" with confirm/cancel)
- Calls `api.reels.deleteProject(projectId)`
- Removes card from state immediately (optimistic)

---

## Shared StatusSection Component

Move `src/components/content-kit/StatusSection.tsx` to `src/components/StatusSection.tsx`.

Current version renders hardcoded `ContentKitCard`. New version accepts `children: ReactNode`:

```typescript
interface StatusSectionProps {
  label: string;
  dotColor: string;
  count: number;
  defaultCollapsed?: boolean;
  children: ReactNode;
}
```

Both the content kit list page and reel maker page import from the same shared path. The content kit list page wraps its cards in StatusSection; the reel maker page wraps its cards in StatusSection. Same component, different card children.

---

## Inline Editor Removal

Delete the entire `showEditor` branch from `ReelsContent.tsx` (~150 lines, lines 310-455). This includes:
- The phone preview with TextOverlayPreview
- The B-Roll picker
- The hook text textarea
- The style selector
- The generate/download buttons

All of this functionality already exists in `ReelEditorModal` (for B-Roll reels) and `ReelEditorContent` at `/app/reels/[id]` (for template reels).

The topic create flow in the create bar:
1. User enters topic, clicks Create
2. Call `api.reels.createProject({ topic })` to create a draft
3. Open `ReelEditorModal` with the new project (for B-Roll reel editing)

---

## What This Does NOT Include

- Duplicate reel action (no backend endpoint, add later if needed)
- Bulk actions (multi-select, bulk delete)
- Search/filter within the reel list
- Drag-to-reorder
- Backend changes (all endpoints exist)

---

## File Summary

| Action | File | What |
|--------|------|------|
| Move | `src/components/content-kit/StatusSection.tsx` → `src/components/StatusSection.tsx` | Promote to shared, accept children instead of hardcoded cards |
| Modify | `src/components/content-kit/ContentKitContent.tsx` | Update import path for StatusSection |
| Rewrite | `src/app/app/reels/ReelsContent.tsx` | Drop inline editor, add status grouping, compact create bar, wire B-Roll wizard + kit picker |
| Modify | `src/components/reels/ReelProjectCard.tsx` | Draft hook preview, style pill, hover actions, click routing |
