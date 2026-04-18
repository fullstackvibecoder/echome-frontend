# B-Roll Reel as Content Kit Output

**Date:** 2026-04-18
**Scope:** Content kit detail page + new reel editor modal + backend reel auto-generation
**Goal:** Make B-roll reels a first-class content kit output, auto-generated with the IG caption as text overlay, editable via a modal editor without leaving the content kit page.

## Problem

The Reel Maker is a standalone 3-step wizard disconnected from the content kit flow. Users who just generated a full content kit have to navigate to a separate page, re-enter their topic, manually browse 30+ B-roll clips, and pick a text style — all of which the content kit already knows. The result: almost no one uses it.

Meanwhile, every content kit already generates an Instagram caption that's perfect for a text overlay reel. The B-roll and caption should come together automatically.

## Design

### What changes

1. **Every content kit auto-generates a B-roll reel** as part of the pipeline (alongside clips, posts, carousel)
2. **The content kit detail page shows the reel** as a card in the output grid
3. **Clicking the reel card opens a modal editor** (not a page navigation)
4. **The standalone Reel Maker page stays** as a secondary path for "quick reel from scratch" — but is NOT the primary workflow

### Auto-Generation (Backend)

When a content kit is generated, the pipeline adds one more step:

1. **Select B-roll clip** — match the content kit's topic/category to a curated B-roll clip. Use keyword matching against the clip tags (abstract, realistic, lifestyle, etc.). Default to the most versatile category if no strong match. The user can swap this later.

2. **Generate Level 3 authority hook text** — this is NOT a reformatted Instagram caption. The text overlay is purpose-built for scroll-stopping using the Authority Content Framework (see below). The IG caption is a reference input, not the source.

3. **Select text style** — default to "Bold Impact" (the most popular style based on current usage). User can change in the editor.

4. **Store the reel config** — save to the existing `reel_projects` table (already exists, linked via `content_kit_id`):
   - `broll_clip_id` — which curated clip was selected
   - `text_segments` — array of `{ text, duration, style }`
   - `text_style` — the style preset name
   - `status` — 'draft' (auto-generated, not yet rendered into video)

The reel is NOT rendered into a video file at generation time — it's stored as a config. Rendering happens when the user clicks "Download" or "Generate" in the editor. This keeps the pipeline fast.

### Authority Content Framework — Text Overlay Prompting

The co-founder's content strategy defines three levels of content:

- **Level 1 (Entertainment):** Funny, trendy, POV. Good for reach, NOT for authority.
- **Level 2 (Education — common):** "3 tips for X." Helpful but overdone. 90% of creators post this.
- **Level 3 (Authority — transformational):** Perspective-shifting, data-backed, challenges assumptions. THIS is what converts and what EchoMe should generate.

The reel text overlay LLM prompt must enforce Level 3 content. System prompt:

```
You are generating a scroll-stopping text overlay for a short-form
B-roll reel. The user runs a content creation platform that emphasizes
authority content — content that builds trust through unique perspective,
not generic tips.

RULES:

1. PERSPECTIVE-SHIFTING, not educational.
   BAD:  "3 tips for first-time home buyers"
   GOOD: "The media says the market is crashing. Here's what the data
          actually shows in [location] right now."

2. Start with the INSIGHT. No fluffy intros. The first segment must
   stop the scroll in under 3 seconds.
   BAD:  "Buying your dream home is exciting"
   GOOD: "Homes priced at $999K get 42% more traffic. Here's why I
          still list at $1M."

3. Include WHO and WHERE when possible. Pull from the user's profile
   and knowledge base to make hooks hyper-specific.
   BAD:  "Staging helps homes sell faster"
   GOOD: "If you're selling a condo in [user's market], staging
          removes the visual negotiation."

4. SHIFT from brag to breakdown. Explain thinking, not just results.
   BAD:  "Just sold in 3 days! So happy for my client!"
   GOOD: "We listed 3% under comp average to spark bidding urgency.
          9 offers. 48 hours. Sold 47K above asking."

5. Challenge assumptions. Authority comes from taking a stand.
   BAD:  "The market is always changing."
   GOOD: "Everyone prices to comps. I price to psychology. Here's why."

6. FORMAT for visual impact:
   - 2-4 text segments, 3-5 seconds each
   - Short punchy phrases (5-12 words per segment)
   - Segment 1 = the scroll-stopping hook
   - Segment 2-3 = the insight/data/reframe
   - Final segment = the takeaway or CTA
   - Use line breaks for readability on a phone screen

7. Use the USER'S VOICE — match their tone, vocabulary, and style
   from their voice profile and knowledge base. If they use contractions,
   use contractions. If they're direct, be direct.

8. Pull from the user's knowledge base for:
   - Actual data and numbers they've shared
   - Their unique frameworks or methods
   - Their market/niche specifics (location, audience type)
   - Real stories and results (anonymized if needed)

OUTPUT: Return 2-4 text segments as a JSON array:
[
  { "text": "Toronto condos dropped 15%", "duration": 3 },
  { "text": "but nobody's talking about this", "duration": 3 },
  { "text": "Here's what the data actually shows", "duration": 4 }
]
```

**Prompt inputs** (provided as context to the LLM):
- Content kit topic (from the generation request)
- Instagram caption (already generated — used as reference for topic/angle, NOT copied directly)
- User's voice profile (tone, style, vocabulary patterns)
- User's knowledge base context (data, frameworks, market specifics)
- User's profile fields: `profile_role`, `profile_topics`, `profile_cta`

**Why NOT just use the IG caption:** The IG caption is optimized for reading in a feed. A reel text overlay is optimized for stopping a scroll in 3 seconds with bold, short text on a visual background. Different format, different intent, different writing. The IG caption provides the ANGLE; the overlay prompt generates the HOOK.

### "Use IG Caption" Fallback

The modal editor includes a "Use IG Caption" button that replaces the generated Level 3 hook with the raw Instagram caption, split into segments. This is the escape hatch for users who prefer their own caption. But the DEFAULT is always the authority-framework-generated hook.

### Content Kit Detail Page — Reel Card

A new card in the content kit output grid:

```
┌─────────────────────┐
│                     │
│   Phone-frame       │  Aspect ratio 9:16, ~120px tall
│   preview with      │  Shows first B-roll frame + first text segment
│   text overlay      │
│                     │
├─────────────────────┤
│ B-Roll Reel          │  Title
│ Bold Impact · 1 seg  │  Style + segment count
│ Edit                 │  Link that opens the modal
└─────────────────────┘
```

- Clicking anywhere on the card opens the reel editor modal
- If the reel hasn't been auto-generated yet (older kits), the card shows "Create a Reel" with a + icon instead of a preview
- If the reel is rendered (video file exists), show a download button on the card directly

### Reel Editor Modal

A modal overlay (not a route change) that opens over the content kit detail page:

```
┌──────────────────────────────────────────────────┐
│  Edit B-Roll Reel                           [×]  │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌─────────┐    B-Roll                          │
│   │         │    ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐       │
│   │  Phone  │    │  ││  ││  ││  ││  ││  │       │
│   │  Frame  │    └──┘└──┘└──┘└──┘└──┘└──┘       │
│   │  Preview│    < abstract  realistic  lifestyle │
│   │         │                                    │
│   │         │    Text                            │
│   │         │    ┌────────────────────────┐      │
│   │         │    │ Toronto condos dropped │      │
│   │         │    │ 15% but nobody's...    │      │
│   └─────────┘    └────────────────────────┘      │
│                                                  │
│                  Style                           │
│                  [Bold] [Minimal] [Gradient] ... │
│                                                  │
│                  ┌──────────────────────┐        │
│                  │   Generate Reel      │        │
│                  └──────────────────────┘        │
└──────────────────────────────────────────────────┘
```

**Left side: Phone frame preview**
- 9:16 aspect ratio in a phone-shaped frame
- Shows the selected B-roll clip as background (static frame or short loop)
- Text overlay rendered live with the selected style
- Updates in real-time as the user changes B-roll, text, or style

**Right side: Controls (stacked vertically)**

1. **B-Roll picker** — horizontal scrollable strip of thumbnail options, NOT the full grid
   - Small squares (~64px) showing clip previews
   - Category tabs above (abstract, realistic, lifestyle, creative, vintage)
   - Selected clip has a cyan border
   - ~6 clips visible at a time, scroll for more
   - This replaces the overwhelming full-page grid from the current wizard

2. **Text editor** — pre-filled textarea with the Instagram caption (or auto-generated text overlay)
   - Editable — user can modify the text
   - Character/word count indicator
   - If multiple segments: segment tabs (Segment 1, Segment 2, etc.)
   - "Use IG Caption" button to reset to the original generated caption

3. **Style selector** — horizontal row of style pills
   - Bold Impact, Minimal Clean, Brand Gradient, Story Cards, Outlined, Auto-Caption, Neon
   - Selected style is highlighted
   - Clicking a style updates the preview immediately

4. **Generate Reel button** — renders the reel into a downloadable video file
   - Shows progress while rendering
   - On completion: "Download Reel" replaces the button
   - The reel video is stored and linked to the content kit

**Modal behavior:**
- Opens with CSS animation (fade + slide up)
- Closes on × button, Escape key, or clicking the backdrop
- Closing returns to the content kit detail page — no navigation change
- State persists while the modal is open (unsaved changes warn before close)
- Max width: ~800px, max height: ~600px, vertically centered

### What Gets Removed / Changed

**Standalone Reel Maker page (`/app/reels`):**
- NOT removed — stays as a secondary path for "reel from scratch"
- But the primary flow is now: Content Kit → Reel Card → Modal Editor
- The turned-off "Make a Reel" button in content kit detail gets replaced by the new reel card

**Current Reel Maker wizard:**
- Step 1 (overwhelming B-roll grid) → replaced by the compact horizontal strip in the modal
- Step 2 (topic input + style selector) → topic comes from the content kit, style selector moves to modal
- Step 3 (review + generate) → integrated into the modal's generate button

### Data Flow

```
Content Kit Generation Pipeline:
  ... existing steps (transcribe, analyze, extract, caption, generate) ...
  → NEW: Auto-create reel_project row:
      - broll_clip_id: auto-selected from curated library
      - text_segments: derived from content_instagram field
      - text_style: 'bold-impact' (default)
      - status: 'draft'

Content Kit Detail Page:
  GET /api/clips/:id → returns { upload, clips, contentKit }
  → Also fetch: GET /api/reels/by-kit/:kitId → returns reel_project (if exists)
  → Render reel card in the output grid

Reel Editor Modal:
  GET /api/reels/broll-library → returns curated clips by category
  PATCH /api/reels/:reelId → save changes (broll_clip_id, text, style)
  POST /api/reels/:reelId/render → trigger video rendering
  GET /api/reels/:reelId/status → poll rendering progress
```

### Responsive Behavior

- Desktop (≥1024px): side-by-side layout (preview left, controls right)
- Tablet/Mobile (<1024px): stacked layout (preview top, controls below, scrollable)
- The modal takes nearly full screen on mobile (with padding)

## Out of Scope (Phase 2)

- Extracting source video frames as custom B-roll options
- AI-powered B-roll selection (auto-matching visual mood to content tone)
- Multi-clip reels (stitching multiple B-roll clips into one reel)
- Music/audio overlay
- Direct publishing to Instagram/TikTok from the modal

## Implementation Notes

- The reel editor modal is a new component: `ReelEditorModal.tsx`
- The B-roll strip component should be extracted as `BRollStrip.tsx` (reusable in both the modal and the standalone Reel Maker)
- The phone frame preview component already exists (`TextOverlayPreview.tsx` in `src/components/reels/`) — reuse it
- The content kit detail page needs a new card type for the reel output
- Backend: the auto-generation step hooks into the existing `runProcessingPipeline` in `clip-finder-service.ts`, after the content generation step
- The `reel_projects` table already exists — check if it has all the fields needed, add `broll_clip_id` and `text_segments` if missing
