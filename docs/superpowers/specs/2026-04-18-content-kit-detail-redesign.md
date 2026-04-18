# Content Kit Detail Page Redesign

**Date:** 2026-04-18
**Scope:** Content kit detail page (frontend), blog→Substack prompt (backend), rich text clipboard (frontend)
**Goal:** Transform the content kit detail page from a 10-screen vertical scroll into an output-first card grid where each card opens a focused modal editor. Rebrand "Blog" as "Substack" with format-optimized output and rich text clipboard copy.

## Problem

The current content kit detail page shows everything at full fidelity in a vertical stack:
- Video clips (with caption controls) — useful, well-built
- Written content cards (6 platforms) — read-only, copy-only
- Blog post (1500 words inline) — dominates the page, 4-5 scrolls alone
- Instagram carousel (two format views) — doubles the height
- B-Roll reel card — buried at the bottom

No inline editing. Plain text clipboard only. The blog section is formatted as a generic blog post, not Substack-ready. Users scroll past most content to get to the one thing they need.

## Design

### Page Layout: Card Grid → Click → Modal Editor

The page becomes a scannable grid of output cards. Each card shows a compact preview. Clicking any card opens a focused modal editor for that content type.

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Clip 1   │ │ Clip 2   │ │ Clip 3   │ │ Carousel │
│ [thumb]  │ │ [thumb]  │ │ [thumb]  │ │ [slides] │
│ 0:32     │ │ 0:45     │ │ 0:28     │ │ 6 slides │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ B-Roll   │ │ Substack │ │ LinkedIn │ │ Instagram│
│ Reel     │ │ [title]  │ │ [preview]│ │ [preview]│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Twitter  │ │ Email    │ │ TikTok   │ │ YouTube  │
│ [preview]│ │ [preview]│ │ [preview]│ │ [preview]│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Page header** stays: title, creation date, stats (clips/platforms/slides), Refresh + Schedule buttons.

**Card ordering** (visual content first):
1. Video clips (one card per clip)
2. Carousel (one card, shows first slide as thumbnail)
3. B-Roll Reel (already built as a card)
4. Substack (formerly Blog — shows title + first line)
5. Platform posts (LinkedIn, Instagram, Twitter/X, Email, TikTok, YouTube)

Each card: compact height (~160px), thumbnail or text preview, title, one-line subtitle. Click anywhere → open modal.

### Modal Editors

All modals follow the same pattern established by the ReelEditorModal:
- Fixed overlay with backdrop blur
- Max width 800px, vertically centered
- Close on ×, Escape, backdrop click
- Preview on left (or top on mobile), controls on right

#### 1. Clip Editor Modal

**Left:** Video player with live caption overlay (existing `VideoPlayer` + `CaptionOverlay` components).

**Right:**
- **Caption text editor** — list of transcript segments as editable text fields. User can fix typos directly. Each field shows the timestamp range. Changes update the overlay preview instantly.
- **Caption style picker** — existing `CaptionStylePopover` (highlight, glow, bold, shadow)
- **Caption position** — existing `CaptionPositionControl` (top, center, bottom)
- **Export section** — quality selector (1080p), "Download" button, export format options (single clip or split-screen)
- **Share/Schedule buttons**

Caption text changes persist via: `PATCH /api/clips/:uploadId/clips/:clipId` — the endpoint already exists. The transcript segments are part of the clip data. Need to verify if the PATCH accepts transcript text updates — if not, a backend endpoint addition is needed.

Phase 2: Trim start/end points, playback speed controls.
Phase 3: Opus-style AI editing (auto-cuts, highlights, etc.)

#### 2. Carousel Editor Modal

Already partially built via `CarouselStyleEditor`. Enhance to full modal:

**Left:** Slide preview strip (horizontal, scrollable) showing all slides. Click a slide to select it.

**Right:**
- **Text editor per slide** — each slide's caption text, editable
- **Style picker** — existing carousel style presets (Quote Card, Text on Color, My Image, Video Frame)
- **Format toggle** — Square (1:1) vs Portrait (9:16)
- **Download section** — "Download All" button, individual slide download

#### 3. Substack Editor Modal (formerly Blog)

**Left:** Clean article preview (rendered markdown → styled HTML). Looks like a Substack article — white/dark background, proper typography, section headers.

**Right:**
- **Section-by-section editor** — the article split into editable sections (intro, section 1, section 2, etc.). Each section is a textarea. Editing updates the preview live.
- **Header image** — existing style picker + generate button (11 styles)
- **Action buttons:**
  - **"Copy for Substack"** — copies as **rich text HTML** to clipboard using `navigator.clipboard.write()` with `ClipboardItem` containing `text/html` MIME type. When pasted into Substack's editor, formatting is preserved (headings, bold, blockquotes, lists).
  - **"Copy as Text"** — plain markdown copy (existing behavior, kept as fallback)
  - **"Regenerate"** — calls `POST /api/content-kits/:id/regenerate` with `platforms: ['blog']`

#### 4. Written Content Editor Modal (Platform Posts)

**One modal, tabbed by platform:**

```
[ LinkedIn | Instagram | Twitter/X | Email | TikTok | YouTube ]
─────────────────────────────────────────────────────────────
```

**Left:** Platform-specific preview. Shows how the post will look on that platform:
- LinkedIn: white card with profile header, post text, engagement icons
- Instagram: phone frame with caption below image area
- Twitter: tweet card with character count
- Email: email template with subject line + body
- TikTok: phone frame with caption overlay
- YouTube: description box format

**Right:**
- **Text editor** — textarea pre-filled with generated content. Editable.
- **Character/word count** with platform limit indicator (Twitter 280, LinkedIn 3000, etc.)
- **"Save"** button — calls `PATCH /api/content-kits/:id` with the updated field (e.g., `contentLinkedin: newText`)
- **"Regenerate"** button — calls `POST /api/content-kits/:id/regenerate` with `platforms: ['linkedin']` (single platform regen)
- **"Copy"** button — plain text clipboard
- **"Share"** — existing QuickShareButton
- **"Schedule"** — existing QuickScheduleModal trigger

Platform tab badges: checkmark if content exists, empty if not generated.

### Blog → Substack Prompt Change (Backend)

**File:** Backend `src/services/generation/core-prompt-system.ts` — the blog platform config.

**Current blog prompt config:**
```
Blog (1000-1500 words): Scene-based intro (250-300w), ## Section 1
(problem reframe, 200w+), ## Section 2 (framework, 250w+),
## Section 3 (implementation), ## Conclusion. Markdown formatted.
```

**New Substack prompt config:**
```
Substack Article (800-1200 words): Write a Substack newsletter post,
NOT a formal blog article. Structure:

# [Title — attention-grabbing, specific to the audience]

## [Subtitle — the "why should I read this" in one sentence]

[Personal 2-sentence hook. First person. Conversational. Start with
something that happened recently or a question someone asked you.
NO formal introductions.]

---

## [Section 1 — the insight that shifts their perspective]

[Short paragraphs, 2-3 sentences max. End key points with bold
takeaway lines.]

**Key insight:** [one bold sentence]

> "[Data point, quote, or proof that backs the insight]"

## [Section 2 — the framework or method]

[Practical, specific. Use bullet points for actionable steps.]

- Step one
- Step two
- Step three

## [Section 3 — application / what to do with this]

[How the reader applies this TODAY. Specific, not abstract.]

---

If this shifted how you think about [topic], share it with someone
who needs to hear it.

[Optional: Subscribe CTA in the reader's voice]

FORMAT RULES:
- Short paragraphs (2-3 sentences max)
- Bold for key takeaways
- Blockquotes for data/proof
- Conversational first-person tone
- NO formal conclusions ("In conclusion...")
- NO generic advice ("It's important to...")
- Sections structured as answers to questions the audience would
  ask an AI about this topic (GEO optimization)
```

**No database changes.** Same `content_blog` TEXT column. Just different formatting from the prompt.

### Rich Text Clipboard ("Copy for Substack")

Currently all copy operations use `navigator.clipboard.writeText()` (plain text). The Substack copy button needs to write rich text HTML:

```typescript
async function copyAsRichText(markdown: string) {
  // Convert markdown to HTML
  const html = markdownToHtml(markdown); // use a library like marked or remark

  // Write both HTML and plain text to clipboard
  const htmlBlob = new Blob([html], { type: 'text/html' });
  const textBlob = new Blob([markdown], { type: 'text/plain' });

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    }),
  ]);
}
```

When pasted into Substack's ProseMirror editor, the HTML is interpreted and formatting is preserved: headings become h2s, bold stays bold, blockquotes render as pullquotes, lists stay as lists. No reformatting needed.

### What Gets Removed from the Current Page

- The full inline blog text (replaced by compact card → modal)
- Duplicate carousel format views (Square AND Portrait shown simultaneously → single card, format toggle inside modal)
- The scattered Copy/Share/Schedule buttons on every element (moved inside modals)
- The vertical stack layout (replaced by grid)
- The "Blog Post" label (replaced by "Substack")

### What Gets Kept

- Page header (title, date, stats, Refresh/Schedule)
- Video player + CaptionOverlay components (moved into clip editor modal)
- Caption style/position controls (moved into clip editor modal)
- CarouselStyleEditor (moved into carousel modal)
- ReelEditorModal (already built, stays as-is)
- ExportProgressModal (stays, triggered from clip editor)
- All scheduling modals (triggered from within editor modals)
- All share functionality (triggered from within editor modals)

### Responsive Behavior

- Desktop (≥1280px): 4-column card grid
- Tablet (≥768px): 3-column grid
- Mobile (≥480px): 2-column grid
- Small mobile (<480px): 1-column list

Modals: side-by-side on desktop (≥1024px), stacked vertically on mobile.

### Data Requirements

No new API endpoints needed. Existing endpoints cover everything:
- `GET /api/content-kits/:id` — full kit data (already used)
- `PATCH /api/content-kits/:id` — update content fields (already exists, frontend just doesn't call it)
- `POST /api/content-kits/:id/regenerate` with `platforms` array — per-platform regen (already exists)
- `PATCH /api/clips/:uploadId/clips/:clipId` — caption style/position (already exists)

**One potential backend addition:** If caption TEXT editing (fixing typos in transcript) isn't supported by the existing clip PATCH endpoint, a new endpoint or field addition may be needed: `PATCH /api/clips/:uploadId/clips/:clipId` accepting `transcriptText` or `transcriptSegments` field. Needs verification against the backend clips route.

### Database Changes

**None.** All content stays in the same columns. The Substack change is a prompt change + UI label change, not a schema change.

### GEO Optimization

The Substack prompt includes: "Sections structured as answers to questions the audience would ask an AI about this topic." This naturally produces content that AI engines can extract for featured answers:

- Section headers become extractable Q&A pairs
- Bold takeaways become snippet-worthy statements
- Blockquoted data/proof provides cited evidence
- The user's specific market/niche context (from KB) provides the unique perspective that AI engines prefer over generic content

The GEO optimization is built INTO the content format, not applied as a separate layer.

## Implementation Phases

**Phase 1 (this spec):**
- Card grid layout replacing vertical stack
- Substack editor modal with rich text clipboard
- Written content editor modal (tabbed, all platforms)
- Backend prompt change (blog → Substack format)
- "Copy for Substack" rich text clipboard

**Phase 2:**
- Clip editor modal with caption TEXT editing (typo fixes)
- Carousel editor modal (full, not just style)
- Platform-specific preview layouts in written content modal

**Phase 3:**
- Clip trimming (start/end points)
- Substack direct publishing (if API becomes available)
- AI-assisted editing suggestions

## Out of Scope

- Content kit list page (already redesigned)
- Create page (already redesigned)
- Reel editor (already built)
- Blog header image generation improvements (separate task)
- Mobile app updates (follows after frontend)
- Opus-style AI clip editing (Phase 3+)
