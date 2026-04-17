# Content Kit List Page Redesign

**Date:** 2026-04-17
**Scope:** `src/app/app/content-kit/ContentKitContent.tsx` and related components in `src/components/content-library/`
**Goal:** Replace the cluttered dual-view list/grid with a single, low-UI triage view optimized for "what's ready to publish?"

## Problem

The current page has two views (list + grid), both amateur-looking:
- List view: dense rows with scattered checkmark/X icons, no hierarchy
- Grid view: decorative gradient card backgrounds, noisy platform indicators
- Too many controls (view toggle, group-by, sort-by, filters) overwhelm new users
- Violates the product's "low UI" ethos — the opposite of what EchoMe preaches

## Design Direction

**Minimal cards grouped by status.** Hybrid of Descript-style content cards (thumbnail anchor + summary) and Superhuman-style inbox grouping (status sections as page structure).

### Page Structure

Top-down triage flow with three sections:

1. **Ready to Publish** — green status dot, 4-column card grid. Primary section, always expanded.
2. **Processing** — amber status dot, same card grid but cards are dimmed (opacity 0.7), spinner replaces thumbnail content. Shows live status text ("Analyzing clips...").
3. **Earlier / Older** — collapsed by default into a single expandable row showing kit count. Expands to the same card grid on click. Prevents stale content from cluttering the triage view.

Failed kits surface inline with a red status dot and error summary text replacing the output count.

### Card Design

Each card is a vertical stack:

```
┌─────────────────────┐
│                     │
│   Thumbnail area    │  88px height
│   (dark, muted)     │  Duration badge bottom-right (video)
│                     │
├─────────────────────┤
│ Title (2-line clamp)│  13px, font-weight 500, #f3f1ec
│ 6 posts · 3 clips   │  11px, muted-foreground
│ Yesterday            │  10px, #555
└─────────────────────┘
```

**Thumbnail source priority:**
1. Video frame thumbnail (from processing pipeline) + duration badge overlay
2. First carousel slide image (for text/voice/repurpose kits — already generated)
3. Spinner on dark frame (still processing, no assets yet)

No gradient backgrounds. No decorative colors. The thumbnail is always real content or a processing indicator.

**Hover state:** Cyan border (`border-color: var(--primary-interactive)`). No other visual signals. No visible buttons — click navigates to the detail page.

### Header

Minimal page header:
- Left: "Content Kits" (h2) + summary line ("8 kits · 42 posts · 18 clips")
- Right: Search input only (no filter bar, no group/sort dropdowns)

The status grouping eliminates the need for filters. Search is the escape hatch for finding specific content.

### What Gets Removed

- View toggle (list/grid) — single view only
- Group-by dropdown — status grouping is hardcoded
- Sort-by dropdown — within each group, newest first (hardcoded)
- Content type filter tabs (All, Videos, Written, Carousels, Processing) — status groups replace these
- Bulk actions bar — removed from list page (bulk actions live in the detail page if needed)
- Platform-by-platform checkmark/X icons — replaced by "N posts · N clips" summary
- Colorful gradient card backgrounds — removed entirely
- Selection checkboxes — removed from list page

### Responsive Behavior

- Desktop (≥1280px): 4-column grid
- Tablet (≥768px): 3-column grid
- Mobile (≥480px): 2-column grid
- Small mobile (<480px): 1-column grid

Card height stays consistent at each breakpoint. Thumbnail area scales proportionally.

### Data Requirements

Each card needs from the API:
- `title` — content kit title (2-line clamp)
- `status` — completed | processing | failed
- `thumbnailUrl` — video frame thumbnail OR first carousel slide URL
- `videoDuration` — seconds (for duration badge, only for video sources)
- `postCount` — number of written content pieces generated
- `clipCount` — number of video clips extracted
- `createdAt` — for date display and grouping
- `statusMessage` — for processing/failed states ("Analyzing clips..." / "Download failed")
- `sourceType` — upload | youtube | zoom | loom | text | voice (determines thumbnail fallback)

The existing `GET /api/clips` and content kit endpoints already return most of this. May need to add `postCount` as a computed field (count of non-null content fields on the content kit).

### Status Grouping Logic

```
Ready to Publish:  status === 'completed'
Processing:        status IN ('pending','uploading','transcribing','analyzing',
                              'extracting','captioning','generating')
Failed:            status === 'failed'
```

Within each group, sort by `createdAt` descending (newest first).

"Earlier" collapse threshold: kits older than 7 days in the "Ready to Publish" group get collapsed into an expandable "Earlier" section. Processing and Failed kits are never collapsed — they always need attention.

### Empty State

If no content kits exist at all:
- Centered message: "No content kits yet"
- Subtitle: "Upload a video, paste a URL, or type a topic to create your first one."
- Single CTA button linking to the Create page

### Error State

If the API call fails:
- Centered error with retry button (matches existing error-state.tsx pattern)

## Implementation Notes

- Replace `ContentKitContent.tsx` (300 lines) with the new component
- Remove or deprecate `ContentFiltersBar`, `ContentListView`, `ContentGridView`, `BulkActionsBar` from `src/components/content-library/`
- The `useContentLibrary` hook can be simplified — remove view mode, group-by, sort-by, platform filter state. Keep search, pagination, and the data fetching.
- Card component should be extracted as `ContentKitCard.tsx` for reuse
- Thumbnail URL resolution: check `videoUpload.thumbnailUrl` first, then `contentKit.carouselSlides[0]?.imageUrl`, then show processing spinner
- The "Earlier" collapse uses local state (`expanded: boolean`), no API change needed

## Out of Scope

- Content kit detail page redesign (separate spec)
- Bulk operations (removed from list page)
- Advanced filtering (search is sufficient for the list page)
- Keyboard navigation / accessibility improvements (follow-up)
