# Screenshot Inventory — 2026-04-29

> A list of every product screenshot currently shown on the marketing surface (homepage, guides), with current age, where it's used, what it currently shows, and what a fresh shot should capture. Use this when you have a clean test account ready and want to refresh the site.

## How to read this

- **Path** — file under `public/`. Filename is internal; users don't see it.
- **Mtime** — last modified date of the file in the repo. Older = staler.
- **Used in** — every component or page that references this image.
- **What it shows now** — current visual content.
- **What a fresh shot should show** — the up-to-date version, aligned with current UI + naming decisions.
- **Priority** — H/M/L based on visibility and how stale it actually is.

## Already done in this session

- ✅ `public/showcase/platform/upload-video.png` swapped to the Apr 18 create-page screenshot showing the welcome banner, 5-verb sidebar, and chat-first input. Most-visible homepage image refreshed.
- ✅ Dead hero variants deleted (`HeroShowcase`, `HeroShowcaseV2-V4`, `HeroProductDemo`) along with their orphan images and stale `IMAGE-MAPPING.md`. Subtraction; no replacement needed.

## /showcase/platform/* — all Mar 31, in homepage `OutputShowcase` + `KnowledgeBaseSection`

| Path | Used in | What it shows now | What a fresh shot should show | Priority |
|---|---|---|---|---|
| `build-voice.png` | `HowItWorks` (homepage) + `OutputShowcase` slide | Old KB page UI with "Connect Socials / Import Writing / Record Voice" | The new `/app/voice` page (renamed today): voice strength dial, sources list with `wbtw_lookup` tags, KBChat. Should feel like the system's brain, not a setup form. | **H** |
| `build-voice-expanded.png` | `OutputShowcase` slide | Old expanded import options (YouTube / Instagram / blogs / PDFs / email exports) | Either drop this slide (the expanded view doesn't exist as a separate UI in the new design) OR replace with a screenshot of the WBTW signup-time review screen. | **H** |
| `record-voice.png`, `record-voice-modal.png` | `OutputShowcase` "Knowledge Base" tab slides | Old voice recording UI | Current voice recorder modal (verify it hasn't changed; if same, just re-shoot for resolution) | M |
| `written-content.png` | `KnowledgeBaseSection` slide + `OutputShowcase` "Written" tab | 6-platform grid of content cards with old per-platform layout | Current content kit detail page's Written Content section — `InlineWrittenContent` tabbed editor with the FeedbackThumbs widget visible. | **H** |
| `instagram-carousel.png` | `KnowledgeBaseSection` slide + `OutputShowcase` "Instagram" tab | Old Instagram carousel preview | Current carousel preview with style picker (Quote Card / Text on Color / etc.) | M |
| `carousel-slide-1.png` through `carousel-slide-5.png` | `KnowledgeBaseSection` slide 5 + `OutputShowcase` 5 carousel slides | Tweet-box carousel slides from one example | Update if new carousel templates have shipped (e.g., gradient backgrounds, different layouts); otherwise leave | L |
| `blog-post.png` | `KnowledgeBaseSection` slide 4 + `OutputShowcase` "Written" tab | Old blog generator with header image picker | Current Substack editor (`SubstackEditorModal`) — the platform-update email shipped this redesign | **H** |
| `reel-maker.png` | `KnowledgeBaseSection` slide 3 + `OutputShowcase` "Video" tab | Clip editor with split-screen toggle | Either keep current (clip editor still exists) OR add a NEW slide for the B-Roll Reel Editor (which is a different feature). See `email-screenshot-reel-editor-filled.png` for the BR reel UI. | M |
| `creator-radar.png` | `OutputShowcase` slide | Old "Following" page UI with feeds and Repurpose | New "Creator Radar" page (renamed yesterday) — page H1 should now read "Creator Radar" not "Following" | **H** |
| `repurpose-content.png` | `OutputShowcase` slide | Repurpose modal with platform picker | Current repurpose modal (verify if structure changed) | L |
| `team-voices.png` | `OutputShowcase` slide | Team Voices management UI | Current `/app/team-voices` page (this got grouped under "Your Voice" verb in the sidebar refactor; verify) | M |
| `creator-library.png` | `OutputShowcase` slide | Old creator library / monthly B-roll | Current `/app/library` (which is the curated B-roll, NOT the user's content library — naming will change in Tier 3 IA surgery so wait until then) | L (defer) |
| `processing-timeline.png`, `processing-full.png`, `processing-full-2.png`, `processing-widget.png` | `OutputShowcase` 4 slides | Old processing UI with step timeline | Current processing UI (the floating progress banner + step indicators in `ContentKitDetailContent`); verify if visual changed | M |
| `type-or-paste.png` | search for usage if any | (need check) | Probably dead — superseded by the unified create input | check / drop |

## /guide-screenshots/* — most are Apr 19-24, mostly recent enough

| Path | Used in | Mtime | Notes |
|---|---|---|---|
| `create-page.png` | 5 guides (getting-started, platform-overview, video-content, youtube-to-content, knowledge-base) | Apr 19 | Recent. Same image is reused across 5 guides — each guide should arguably have a UNIQUE screenshot showing what it specifically describes. Lower-priority but a polish opportunity. |
| `content-kit-detail.png`, `content-kit-detail-full.png`, `content-kit-list.png` | content-kits guide | Apr 19 | Recent. Keep. |
| `following.png` | creator-radar guide | Apr 19 | ⚠️ **Page was renamed to "Creator Radar" yesterday (commit `e7a58f9`).** Old screenshot likely shows H1 "Following". Re-shoot to capture the new title. **H priority — visible inconsistency.** |
| `reel-maker.png` | reels-and-captions guide | Apr 19 | Recent. Keep. |
| `carousel-editor.png` | carousels guide | Apr 23 | Recent. Keep. |
| `build-your-voice.png` | knowledge-base + build-your-voice guides | Apr 19 | ⚠️ Page H1 was renamed "Your Voice" yesterday (commit `e7a58f9`). Likely shows old "Build Your Voice" title. Re-shoot for the rename, OR rename the file to match the current page title for clarity. **H priority — visible inconsistency.** |
| `creator-library.png` | (search for usage) | Apr 19 | If unused, drop |
| `scheduling-clip-post-actions.png`, `scheduling-post-buttons.png`, `scheduling-preparing-media.png` | scheduling-posts guide | Apr 24 | Most recent. Keep. |

## Newer screenshots at repo root — what's available, what they cover

```
email-screenshot-*.png      (9 files, Apr 18, marketing-grade)
   ✓ create-page.png            ← USED for the swap above
   ✓ content-kit-detail.png     ← could update homepage OutputShowcase
   ✓ content-kit-list.png       ← could update content-kits guide
   ✓ detail-bottom/full/top.png ← multiple detail views
   ✓ detail-written.png         ← shows the new Written Content section
   ✓ reel-editor.png            ← B-Roll Reel Editor (new feature)
   ✓ reel-editor-filled.png     ← B-Roll Reel filled in

test-*.png                  (9 files, Apr 19, Playwright artifacts)
   ⚠️  Contain test data, may have visual artifacts. Don't use for marketing
       without a clean re-shoot.
```

## Recommended re-shoot session

When you have ~30 minutes with a clean test account:

**Tier H (visible inconsistency or major staleness)** — re-shoot first:
1. `build-voice.png` — for `HowItWorks` homepage section. Show the renamed "Your Voice" page.
2. `written-content.png` — for the homepage `KnowledgeBaseSection` slide. Show the new tabbed editor with thumbs widget.
3. `blog-post.png` — for `KnowledgeBaseSection` slide and `OutputShowcase`. Show the Substack editor.
4. `creator-radar.png` — for `OutputShowcase`. Show the new "Creator Radar" page header.
5. `following.png` (in guides) — re-shoot for the "Creator Radar" rename.
6. `build-your-voice.png` (in guides) — re-shoot for the "Your Voice" rename.

**Tier M** — re-shoot when you have time:
- `instagram-carousel.png`, `team-voices.png`, `record-voice*.png`, `processing-*.png`, `reel-maker.png` (or add B-Roll reel as a new slide)

**Tier L** — defer:
- `carousel-slide-1-5.png` — only update if templates changed
- `creator-library.png` — defer until the Library/Content Kit IA name swap (Tier 3)
- `repurpose-content.png` — verify if needed

## Naming convention going forward

Recommendation: rename images to match the page they show, not the feature name. Examples:
- `upload-video.png` → `create-page.png` (matches `/app` route purpose)
- `build-voice.png` → `your-voice.png` (matches new H1)
- `following.png` → `creator-radar.png` (matches new H1)
- `reel-maker.png` → keep (matches `/app/reels` purpose)
- `creator-library.png` → after IA swap, becomes `library-toolkit.png` or similar

Done in batches. Updating the import paths is a small refactor; can happen alongside re-shoots.
