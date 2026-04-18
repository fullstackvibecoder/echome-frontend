# B-Roll Reel Segment-Based Rebuild

**Date:** 2026-04-18
**Scope:** Authority hook generator, reel editor modal, text overlay preview, reel rendering
**Goal:** Rebuild the B-roll reel system from "one text block truncated to fit" to a proper segment-based sequence where each segment is 2-5 words, displayed one at a time, with an optional single-block mode for users who want one complete message.

## Problem

The current system generates one text block (often 15-30+ words) and tries to fit it into visual styles designed for 2-6 words. Truncation produces meaningless fragments ("YOU KNOW WHAT? FORGET ABOUT TRYING"). Every leader in the space (Mojo, CapCut, Captions) uses segments — short phrases cycling one at a time. Our approach is fundamentally wrong.

## Design

### Two Modes

**1. Segments Mode (default, auto-generated)**
- 2-4 segments, each 2-5 words
- One segment shows at a time on the B-roll
- Segments cycle every 3-5 seconds with transitions
- Each segment is styled independently with the selected text style
- This is what the authority hook generator produces

```
Segment 1 (3s): "Knowledge base?"
Segment 2 (3s): "Stop overthinking it"
Segment 3 (3s): "Just upload everything"
```

**2. Single Block Mode (user opt-in)**
- One message, 8-15 words max
- Displayed as a text overlay on the B-roll
- B-roll video is VISIBLE behind the text (no opaque card)
- Semi-transparent text background or strong text shadow for readability
- The complete idea fits in one screen

```
Single: "Your knowledge base doesn't need to be perfect. Just start."
```

### Authority Hook Generator Changes

The generator currently allows 5-15 words per segment depending on style. It needs to produce 2-5 words per segment ALWAYS, regardless of style. Style affects visual treatment, not word count.

**Updated segment rules:**
```
- EXACTLY 2-5 words per segment. No exceptions.
- 2-4 segments total
- Segment 1: the hook (question, provocative statement, or pattern interrupt)
- Segment 2-3: the insight or reframe
- Final segment: the takeaway or CTA
- Each segment must stand alone as a complete visual beat
- NO connecting words between segments (no "and", "but", "so" starting a segment)
```

**Examples of good segments:**
```
["Market's crashing?", "Data says otherwise", "Check the numbers"]
["Stop pricing to comps", "Price to psychology", "Here's why"]
["Staging works", "Not because it's pretty", "It removes negotiation"]
```

**Examples of bad segments (current output):**
```
["You know what? Forget about trying to make your knowledge base look like a masterpiece"]  ← 15 words, one segment
["Long story short, polished is overrated"]  ← 6 words but starts with filler
```

### Reel Editor Modal Changes

**Current:** One big textarea for all text. One preview showing all text at once.

**New:** Segment-based editor with a mode toggle.

```
┌─────────────────────────────────────────────────────┐
│  Edit B-Roll Reel                              [×]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────┐    Mode: [Segments] [Single Block]    │
│   │         │                                       │
│   │  Phone  │    Segments:                          │
│   │  Frame  │    ┌─ Seg 1 ──────────────────────┐   │
│   │ Preview │    │ Market's crashing?            │   │
│   │         │    └──────────────────────────────┘   │
│   │ (shows  │    ┌─ Seg 2 ──────────────────────┐   │
│   │  one    │    │ Data says otherwise           │   │
│   │  segment│    └──────────────────────────────┘   │
│   │  at a   │    ┌─ Seg 3 ──────────────────────┐   │
│   │  time)  │    │ Check the numbers             │   │
│   │         │    └──────────────────────────────┘   │
│   └─────────┘    [+ Add Segment]                    │
│                                                     │
│                  B-Roll: [strip of clips]           │
│                  Style:  [Bold] [Min] [Grad] [...]  │
│                  Size:   [──────●──────]            │
│                                                     │
│                  [Generate Reel]                     │
└─────────────────────────────────────────────────────┘
```

**Segments mode editor:**
- Each segment is a small text input (one line, not a textarea)
- Word count per segment: `3 / 5 words` — turns red over 5
- "Add Segment" button (max 4)
- Delete button per segment (min 2)
- Drag to reorder (nice-to-have, not required for v1)

**Single block mode editor:**
- One textarea (2-3 rows)
- Word count: `12 / 15 words`
- Helper: "One complete idea. 8-15 words. B-roll stays visible behind the text."

**Preview:**
- Segments mode: cycles through segments automatically (3s each) with a simple fade transition. Navigation dots below the phone frame show which segment is active. Click a dot to jump to that segment.
- Single block mode: shows the text overlaid on B-roll with semi-transparent background

### TextOverlayPreview Changes

**Current:** Shows all text at once, truncated to maxWords.

**New:** Two rendering modes.

**Segments mode props:**
```typescript
interface SegmentPreviewProps {
  thumbnailUrl?: string;
  segments: Array<{ text: string; duration: number }>;
  activeSegmentIndex: number;
  style: OverlayStyle;
  textScale?: number;
}
```
- Shows ONE segment at a time based on `activeSegmentIndex`
- The segment text is 2-5 words — ALWAYS fits any style
- Auto-cycles via `setInterval` in the editor, or controlled by clicking dots

**Single block mode props:**
```typescript
interface SingleBlockPreviewProps {
  thumbnailUrl?: string;
  text: string; // 8-15 words
  style: OverlayStyle;
  textScale?: number;
}
```
- Shows text with semi-transparent background (NOT opaque card)
- Background: `rgba(0,0,0,0.4)` or similar — B-roll video visible through it
- Text sized to fit within the phone frame with padding

### Reel Rendering (Backend)

The existing `broll-composer.ts` already supports multiple text overlay segments with timing. The segment data just needs to come from the new format.

**Current compose-broll input:** `textOverlays: [{ text, position }]`
**New compose-broll input:** `textOverlays: [{ text, position, startTime, endTime }]`

Each segment gets a time range:
- Segment 1: 0s - 3s
- Segment 2: 3s - 6s
- Segment 3: 6s - 9s

The B-roll clip loops to fill the total duration. FFmpeg already handles this.

### What Gets Removed

- The one-big-textarea approach in the reel editor
- The fixed-12-word truncation in TextOverlayPreview
- The `STYLE_MAX_WORDS` mapping that tries to truncate per style
- The auto-style-selection based on word count (no longer needed — segments always fit)

### What Gets Kept

- BRollStrip (clip picker)
- Style selector (Bold Impact, Minimal Clean, etc.)
- Text size slider
- The compose-broll endpoint (adapted for timed segments)
- The rendering pipeline (FFmpeg)

## Implementation Notes

**Phase 1 (this spec):**
- Rebuild authority hook generator to produce 2-5 word segments
- Rebuild editor with segment inputs + single block toggle
- Rebuild preview to show one segment at a time
- Wire compose endpoint with timed segments

**Phase 2:**
- Segment transitions (fade, zoom, slide) as selectable options
- Per-segment style (different style per segment)
- Music beat sync (segments align to music beats)

## Out of Scope
- Carousel editor (separate spec)
- Caption text editing in clips (separate feature)
- Source video frame extraction for custom B-roll (Phase 2 of original spec)
