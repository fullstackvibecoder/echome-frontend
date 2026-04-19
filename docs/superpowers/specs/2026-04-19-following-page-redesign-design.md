# Following Page Redesign — Design Spec

**Goal:** Simplify the Following page UI — remove the modal, inline the follow input, tighten the feed, make Repurpose the hero action, and write copy that explains the value.

**Scope:** Frontend redesign only. No backend changes. Trends integration is a future addition once the Trends feature is verified and stabilized — this spec does NOT include it.

---

## The Problem

The Following page works but doesn't explain itself. A new user lands here and sees:
- "Follow a Creator" button → modal → pick platform → paste URL. Four steps for one action.
- A feed of videos with small "Repurpose" buttons that don't explain what repurposing means.
- "Pull Fresh Content" button with no context.
- No messaging about *why* following creators matters.

The feature is powerful — you follow creators you admire, their new content appears in your feed, and one click turns their ideas into content written in *your* voice. But the page doesn't communicate any of that.

**Future: Trends integration.** The Trends feature (currently admin-only, needs stabilization) will eventually surface trending topics in the user's niche on this page. This spec prepares the layout for that addition but does NOT include it.

---

## New Page Layout

```
┌─ Following
│  "See what top creators are talking about. One click turns their
│   ideas into content written in your voice — not theirs."
│
├─ [inline follow input]
│  "Paste a YouTube channel or Instagram profile URL..."  [Follow]
│  Following 3 creators · Manage
│
├─ [creator filter pills]
│  All (24) · Tom Stoney (10) · Jess Lenouvel (8) · ...
│
├─ [compact feed]
│  [thumb] Creator · Title · Date · Views          [Repurpose →]
│  [thumb] Creator · Title · Date · Views          [Repurpose →]
│  ...
```

---

## Section 1: Header + Copy

**Title:** "Following"

**Subtitle:** "See what top creators are talking about. One click turns their ideas into content written in your voice — not theirs."

This tells a new user:
1. What they'll see (creator content)
2. The action (one click to repurpose)
3. The outcome (content in your voice, not a copy)

---

## Section 2: Inline Follow Input (replaces modal)

Compact inline input on the page. No modal, no platform selector.

**Input:** Single text field, placeholder: "Paste a YouTube channel or Instagram profile URL..."

**Button:** "Follow" — primary styled.

**Auto-detection:** Backend detects YouTube vs Instagram from the URL.

**Below:** "Following 3 creators · Manage" — dynamic count, Manage links to unfollow UI.

**On success:** Toast "Now following [Creator Name]" + feed refreshes.

**On error:** Inline error below input.

---

## Section 3: Creator Filter Pills

Keep the current pattern — works well.

"All (24)" + one pill per followed creator with their video count.

Same pill styling: `bg-primary-interactive text-white` for active, `border border-border text-muted-foreground` for inactive.

---

## Section 4: Compact Feed

One item per row. Tighter than current layout.

**Each row:**

```
[Thumbnail 120px]  Creator Name              [Repurpose →]
                   Video Title (1 line, truncated)
                   Mar 5, 2026 · 5,017 views
```

**Thumbnail:** 120px wide, 16:9 aspect, rounded-lg.

**Creator name:** Small, muted, above title.

**Title:** Bold, single line, truncated.

**Date + views:** Small, muted.

**Repurpose button:** Right-aligned, primary styled. "Repurpose →"

**What Repurpose does (unchanged):** Opens Create page with the video's content pre-loaded. System generates content in the user's voice using the video's transcript/topic as inspiration.

---

## Section 5: Empty States

**No creators followed:**
"Follow a creator to see their latest content here. Paste a YouTube or Instagram URL above to get started."

**Creators followed but no videos yet:**
"Waiting for fresh content from your creators. We'll check for new videos automatically."

---

## What Gets Removed

1. **"Follow a Creator" modal** — replaced by inline input
2. **Platform selector** (YouTube/Instagram toggle) — auto-detected
3. **"Pull Fresh Content" button** — removed

---

## What Gets Kept

1. **Creator filter pills** — same pattern
2. **Repurpose action** — same backend, better-styled button
3. **"Manage Creators" link** — moved below follow input
4. **Feed data fetching** — same API

---

## Copy Summary

| Element | Current | New |
|---------|---------|-----|
| Page subtitle | "Track YouTube creators and repurpose their ideas in your voice" | "See what's trending and what top creators are talking about. One click turns any idea into content written in your voice." |
| Follow input | Modal with platform picker | Inline: "Paste a YouTube channel or Instagram profile URL..." |
| Follow helper | None | "Following 3 creators · Manage" |
| Repurpose button | Small cyan pill | Primary styled "Repurpose →" |
| Empty state | None | "Follow a creator to see their latest content here..." |

---

## File Changes

| Action | File | What |
|--------|------|------|
| Rewrite | `src/app/app/following/FollowingContent.tsx` | New layout: header copy + inline follow input + creator pills + compact feed |

**No backend changes.** All follow, sync, and repurpose endpoints already exist.

---

## What This Does NOT Include

- Trends integration (future — needs Trends feature stabilization first)
- New follow sources (TikTok, Twitter)
- Batch repurpose (multi-select)
- Feed sorting/filtering beyond creator pills
- Backend modifications
