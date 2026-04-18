# Content Kit Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 10-screen vertical scroll content kit detail page with a compact card grid where each output opens a focused modal editor. Rebrand blog as Substack with format-optimized prompt and rich text clipboard.

**Architecture:** The 1404-line `ContentKitDetailContent.tsx` gets a new render layout (card grid) with its existing data fetching and hooks preserved. Four new modal components handle editing (clips, carousel, Substack, platform posts). The backend prompt config for blog changes to Substack formatting. A `copyAsRichText` utility enables HTML clipboard for Substack paste.

**Tech Stack:** Frontend: React, TypeScript, Tailwind CSS, ReactMarkdown, `navigator.clipboard.write()`. Backend: OpenAI gpt-4o prompts in `core-prompt-system.ts`.

**Spec:** `docs/superpowers/specs/2026-04-18-content-kit-detail-redesign.md`

**Repos:**
- Frontend: `/Users/aramammo/Side Quests/echome-frontend`
- Backend: `/Users/aramammo/Side Quests/echome-platform-v2`

---

## File Structure

### Backend

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/services/generation/core-prompt-system.ts` | Change blog platform config to Substack format |

### Frontend

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/clipboard.ts` | Rich text (HTML) clipboard utility for Substack copy |
| Create | `src/components/content-kit/SubstackEditorModal.tsx` | Modal: article preview + section editor + copy for Substack |
| Create | `src/components/content-kit/WrittenContentModal.tsx` | Modal: tabbed platform post editor with save/regen/copy per tab |
| Create | `src/components/content-kit/ClipEditorModal.tsx` | Modal: video player + caption text editor + style/position + export |
| Create | `src/components/content-kit/OutputCard.tsx` | Compact card for the grid (thumbnail/preview + title + subtitle) |
| Modify | `src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` | Replace vertical stack with card grid, wire modals |

---

### Task 1: Backend — Blog → Substack Prompt

**Files:**
- Modify: `echome-platform-v2/src/services/generation/core-prompt-system.ts`

- [ ] **Step 1: Read the current blog platform config**

Read `src/services/generation/core-prompt-system.ts` fully. Find the blog platform config — it's in a `PLATFORM_CONFIGS` object or similar structure with platform-specific prompt instructions. The current blog config specifies "1000-1500 words, scene-based intro, ## sections, markdown formatted."

- [ ] **Step 2: Replace the blog config with Substack format**

Change the blog platform's prompt instructions to:

```
Substack Article (800-1200 words): Write a Substack newsletter post,
NOT a formal blog article.

# [Title — attention-grabbing, specific to the audience]

## [Subtitle — the "why should I read this" in one sentence]

[Personal 2-sentence hook. First person. Conversational. Start with
something that happened this week or a question someone asked. NO
formal introductions.]

---

## [Section 1 — the insight]
[Short paragraphs, 2-3 sentences max.]
**Key insight:** [one bold sentence]
> "[Data point or quote that proves the insight]"

## [Section 2 — the framework]
[Practical, specific. Use bullet points for actionable steps.]
- Step one
- Step two
- Step three

## [Section 3 — application]
[How the reader applies this TODAY. Specific, not abstract.]

---

If this shifted how you think about [topic], share it with someone
who needs to hear it.

FORMAT RULES:
- Short paragraphs (2-3 sentences max)
- Bold for key takeaways using **text**
- Blockquotes (>) for data and proof
- Conversational first-person tone
- NO formal conclusions ("In conclusion...")
- NO generic advice ("It's important to...")
- Sections structured as answers to questions the audience would
  ask an AI about this topic
- Output as markdown
```

Also update any label that says "Blog" or "blog" to "Substack" in this config — check for display names, descriptions, or comments.

Do NOT change the database column name (`content_blog` stays).
Do NOT change the API field name (`contentBlog` stays).

- [ ] **Step 3: Run typecheck + commit + push**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx tsc --noEmit
git add src/services/generation/core-prompt-system.ts
git commit -m "feat: blog → Substack prompt — conversational format with GEO optimization"
git push origin main
```

---

### Task 2: Frontend — Rich Text Clipboard Utility

**Files:**
- Create: `echome-frontend/src/lib/clipboard.ts`

- [ ] **Step 1: Create the clipboard utility**

```typescript
// src/lib/clipboard.ts

/**
 * Copy content as rich text HTML to clipboard. When pasted into
 * editors like Substack (ProseMirror-based), formatting is preserved:
 * headings, bold, blockquotes, lists, links.
 *
 * Falls back to plain text if the Clipboard API isn't available.
 */
export async function copyAsRichText(markdown: string): Promise<boolean> {
  try {
    // Dynamic import to avoid bundling on pages that don't need it
    const { marked } = await import('marked');

    // Configure marked for clean HTML output
    const html = await marked(markdown, {
      breaks: false,
      gfm: true,
    });

    // Write both HTML and plain text to clipboard
    const htmlBlob = new Blob([html as string], { type: 'text/html' });
    const textBlob = new Blob([markdown], { type: 'text/plain' });

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      }),
    ]);

    return true;
  } catch (err) {
    // Fallback to plain text
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Copy plain text to clipboard (existing pattern, centralized).
 */
export async function copyAsPlainText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
```

Check if `marked` is already in `package.json`. If not, install it: `npm install marked`. If there's already a markdown-to-HTML library in the project (check for `remark`, `unified`, `markdown-it`), use that instead.

- [ ] **Step 2: Typecheck + commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit
git add src/lib/clipboard.ts package.json package-lock.json
git commit -m "feat: add rich text clipboard utility for Substack copy"
```

---

### Task 3: Frontend — OutputCard Component

**Files:**
- Create: `echome-frontend/src/components/content-kit/OutputCard.tsx`

- [ ] **Step 1: Create the compact output card**

A reusable card component for the grid. Shows a thumbnail or text preview with a title and subtitle. Clicking opens the relevant modal.

```typescript
interface OutputCardProps {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  thumbnailFallback?: React.ReactNode; // icon or text for non-image cards
  aspectRatio?: '16/9' | '9/16' | '1/1'; // thumbnail shape
  onClick: () => void;
  badge?: string; // e.g., "3 clips", "6 slides"
  statusColor?: string; // dot color for processing/ready status
}
```

Layout:
- Thumbnail area (flexible aspect ratio, default 16/9) — shows image, icon, or text preview
- Below: title (text-sm font-medium, 1-line clamp) + subtitle (text-xs text-muted-foreground)
- Optional badge (top-right corner, small pill)
- Hover: `border-primary-interactive` transition
- Click: calls `onClick`
- Design tokens: `bg-card`, `border-border`, `rounded-xl`, `overflow-hidden`
- Max height: ~180px including thumbnail + text

For platform post cards (no thumbnail), the thumbnail area shows a 3-line text preview of the content in muted foreground with the platform icon.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/content-kit/OutputCard.tsx
git commit -m "feat: add OutputCard — compact card for content kit grid"
```

---

### Task 4: Frontend — SubstackEditorModal

**Files:**
- Create: `echome-frontend/src/components/content-kit/SubstackEditorModal.tsx`

- [ ] **Step 1: Create the modal**

Props:
```typescript
interface SubstackEditorModalProps {
  open: boolean;
  onClose: () => void;
  content: string; // markdown content from content_blog
  title: string;
  contentKitId: string;
  onContentUpdate: (newContent: string) => void; // called after save
}
```

Layout (desktop side-by-side, mobile stacked):

**Left (50%):** Article preview — render the markdown as styled HTML using ReactMarkdown. Style it like a Substack article: max-w-prose, clean typography, proper heading sizes, blockquote styling. Wrap in a container with `prose` class if Tailwind typography plugin is available, otherwise style manually.

**Right (50%):**
- Header: "Substack Article" + × close
- Section-by-section editor: split the markdown at `## ` headers into sections. Each section is a textarea with the header as a label. Editing any section updates the full markdown string and the preview re-renders.
- Action buttons row:
  - "Copy for Substack" (primary) — calls `copyAsRichText(content)` from `src/lib/clipboard.ts`. Shows "Copied!" feedback for 2s.
  - "Copy as Markdown" (secondary) — calls `copyAsPlainText(content)`
  - "Save" — calls `api.contentKits.update(contentKitId, { contentBlog: fullMarkdown })` via the existing PATCH endpoint. The `onContentUpdate` callback refreshes the parent.
  - "Regenerate" — calls `api.contentKits.regenerate(contentKitId, { platforms: ['blog'] })`. Shows loading state. On completion, refreshes content via `onContentUpdate`.

Modal frame: same pattern as ReelEditorModal (fixed overlay, max-w-[900px] for wider content, backdrop blur, close on ×/Escape/backdrop).

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/content-kit/SubstackEditorModal.tsx
git commit -m "feat: add SubstackEditorModal — section editor with rich text copy"
```

---

### Task 5: Frontend — WrittenContentModal

**Files:**
- Create: `echome-frontend/src/components/content-kit/WrittenContentModal.tsx`

- [ ] **Step 1: Create the tabbed platform editor modal**

Props:
```typescript
interface WrittenContentModalProps {
  open: boolean;
  onClose: () => void;
  contentKitId: string;
  content: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    email?: string;
    tiktok?: string;
    youtube?: string;
    videoScript?: string;
  };
  onContentUpdate: (platform: string, newContent: string) => void;
}
```

Layout:

**Top:** Platform tabs — horizontal row of tab buttons:
`[ LinkedIn | Instagram | Twitter/X | Email | TikTok | YouTube ]`
Active tab: `bg-primary-interactive text-white`. Inactive: `border border-border text-muted-foreground`.
Each tab shows a dot indicator if content exists for that platform.

**Body (below tabs):**
- Textarea pre-filled with the active platform's content. Full height, editable.
- Character count below the textarea with platform limit: Twitter 280, LinkedIn 3000, Instagram 2200, others no hard limit.
- If over limit: count turns red.

**Bottom action row:**
- "Save" — calls `api.contentKits.update(contentKitId, { [fieldName]: text })` where fieldName maps platform tab to API field (`linkedin` → `contentLinkedin`, `twitter` → `contentTwitter`, etc.)
- "Regenerate" — calls `api.contentKits.regenerate(contentKitId, { platforms: [activePlatform] })`. Loading state. On completion, updates the textarea.
- "Copy" — `copyAsPlainText(text)`
- "Share" — existing QuickShareButton (import from `@/components/share-buttons`)

Field name mapping (platform tab → API field):
```typescript
const FIELD_MAP: Record<string, string> = {
  linkedin: 'contentLinkedin',
  twitter: 'contentTwitter',
  instagram: 'contentInstagram',
  email: 'contentEmail',
  tiktok: 'contentTiktok',
  youtube: 'contentYoutube',
  videoScript: 'contentVideoScript',
};
```

Read the existing `api.contentKits.update()` and `api.contentKits.regenerate()` methods in `src/lib/api-client.ts` to confirm the exact method signatures and field names before implementing.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/content-kit/WrittenContentModal.tsx
git commit -m "feat: add WrittenContentModal — tabbed platform editor with save/regen"
```

---

### Task 6: Frontend — ClipEditorModal

**Files:**
- Create: `echome-frontend/src/components/content-kit/ClipEditorModal.tsx`

- [ ] **Step 1: Create the clip editor modal**

Props:
```typescript
interface ClipEditorModalProps {
  open: boolean;
  onClose: () => void;
  clip: VideoClip; // from the content kit detail data
  uploadId: string;
  captionSegments: CaptionSegment[]; // transcript segments for this clip's time range
  onCaptionUpdate: () => void; // refresh parent after caption changes
}
```

Layout (desktop side-by-side):

**Left (45%):** Video player — reuse the existing `VideoPlayer` component with `CaptionOverlay`. Import both from `@/components/content-kit`. The player shows the clip with live caption overlay.

**Right (55%):**
- Header: clip title + × close
- **Caption text segments** — list of editable text fields, one per transcript segment within the clip's time range. Each shows:
  - Timestamp label: `0:02 - 0:05`
  - Editable text input (the transcribed word/phrase)
  - Editing updates the `CaptionOverlay` preview instantly
- **Caption style** — reuse `CaptionStylePopover` component
- **Caption position** — reuse `CaptionPositionControl` component
- **Export section:**
  - "Download 1080p" button — triggers `api.clips.exportClip()` and opens `ExportProgressModal`
  - Format options if applicable (single view, split-screen)

Caption text save: Check if `PATCH /api/clips/:uploadId/clips/:clipId` accepts transcript text updates. Read the backend route `src/routes/clips.ts` for the `updateClipSchema` to see what fields are accepted. If transcript text editing isn't supported, add `transcriptText` to the schema. If it IS supported, call the existing endpoint.

For Phase 1, if the backend doesn't support saving edited transcript text, show the caption segments as READ-ONLY with a note "Caption text editing coming soon" and keep the style/position/export controls functional.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/content-kit/ClipEditorModal.tsx
git commit -m "feat: add ClipEditorModal — video preview with caption controls and export"
```

---

### Task 7: Frontend — Rewrite ContentKitDetailContent Page

**Files:**
- Modify: `echome-frontend/src/app/app/content-kit/[id]/ContentKitDetailContent.tsx`

This is the biggest task. The 1404-line file gets a new render layout while keeping its data fetching, hooks, and state management.

- [ ] **Step 1: Read the current file completely**

Understand:
- All imports (which ones to keep, which to remove)
- The data fetching hook (`useContentKitDetail`)
- All state variables (which are still needed)
- The existing modal renders at the bottom (keep ScheduleModal, QuickScheduleModal, ExportProgressModal, ReelEditorModal)
- How content fields are accessed (e.g., `detail.contentKit.contentLinkedin`)

- [ ] **Step 2: Add imports for new components**

```typescript
import { OutputCard } from '@/components/content-kit/OutputCard';
import { SubstackEditorModal } from '@/components/content-kit/SubstackEditorModal';
import { WrittenContentModal } from '@/components/content-kit/WrittenContentModal';
import { ClipEditorModal } from '@/components/content-kit/ClipEditorModal';
```

- [ ] **Step 3: Add modal state variables**

```typescript
const [substackModalOpen, setSubstackModalOpen] = useState(false);
const [writtenContentModalOpen, setWrittenContentModalOpen] = useState(false);
const [clipEditorOpen, setClipEditorOpen] = useState(false);
const [activeClipForEditor, setActiveClipForEditor] = useState<VideoClip | null>(null);
```

- [ ] **Step 4: Replace the main render with the card grid**

Keep the page header (title, date, stats, Refresh/Schedule buttons). Replace everything below it with a card grid:

```tsx
{/* Output Grid */}
<div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-6">
  {/* Clip cards */}
  {detail.clips.map((clip, index) => (
    <OutputCard
      key={clip.id}
      title={clip.title || `Clip ${index + 1}`}
      subtitle={formatDuration(clip.duration)}
      thumbnailUrl={clip.thumbnailUrl}
      aspectRatio="9/16"
      onClick={() => { setActiveClipForEditor(clip); setClipEditorOpen(true); }}
    />
  ))}

  {/* Carousel card */}
  {detail.carousel && (
    <OutputCard
      title="Carousel"
      subtitle={`${detail.carousel.slideCount} slides`}
      thumbnailUrl={detail.carousel.slides?.[0]?.publicUrl}
      onClick={() => { /* open carousel modal when built */ }}
      badge={`${detail.carousel.slideCount} slides`}
    />
  )}

  {/* B-Roll Reel card (already exists) */}
  <OutputCard
    title="B-Roll Reel"
    subtitle="Authority hook overlay"
    thumbnailFallback={<Play className="w-8 h-8 text-muted-foreground/30" />}
    aspectRatio="9/16"
    onClick={() => setReelEditorOpen(true)}
  />

  {/* Substack card (formerly Blog) */}
  {detail.contentKit?.contentBlog && (
    <OutputCard
      title="Substack Article"
      subtitle={detail.contentKit.title}
      thumbnailFallback={
        <div className="p-3 text-[11px] text-muted-foreground/60 leading-relaxed line-clamp-4">
          {detail.contentKit.contentBlog.slice(0, 150)}...
        </div>
      }
      onClick={() => setSubstackModalOpen(true)}
    />
  )}

  {/* Platform post cards */}
  {['linkedin', 'instagram', 'twitter', 'email', 'tiktok', 'youtube'].map((platform) => {
    const fieldMap: Record<string, string> = {
      linkedin: 'contentLinkedin', instagram: 'contentInstagram',
      twitter: 'contentTwitter', email: 'contentEmail',
      tiktok: 'contentTiktok', youtube: 'contentYoutube',
    };
    const content = (detail.contentKit as any)?.[fieldMap[platform]];
    if (!content) return null;
    return (
      <OutputCard
        key={platform}
        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
        subtitle="Post"
        thumbnailFallback={
          <div className="p-3 text-[11px] text-muted-foreground/60 leading-relaxed line-clamp-4">
            {content.slice(0, 120)}...
          </div>
        }
        onClick={() => setWrittenContentModalOpen(true)}
      />
    );
  })}
</div>
```

- [ ] **Step 5: Remove the old vertical sections**

Delete the inline rendering of:
- Video clips section (moved to ClipEditorModal)
- Written content cards grid (moved to WrittenContentModal)
- BlogPostSection (moved to SubstackEditorModal)
- Inline carousel section (moved to carousel modal — Phase 2, for now keep a simplified version or link to the existing carousel editor)
- The old B-Roll Reel card (replaced by OutputCard)

Keep: the page header, loading/error states, the modal renders at the bottom.

- [ ] **Step 6: Render the new modals at the bottom**

```tsx
{/* Modals */}
<SubstackEditorModal
  open={substackModalOpen}
  onClose={() => setSubstackModalOpen(false)}
  content={detail.contentKit?.contentBlog || ''}
  title={detail.contentKit?.title || 'Untitled'}
  contentKitId={detail.contentKit?.id || id}
  onContentUpdate={(newContent) => {
    // Optimistic update or refresh
    refresh();
  }}
/>

<WrittenContentModal
  open={writtenContentModalOpen}
  onClose={() => setWrittenContentModalOpen(false)}
  contentKitId={detail.contentKit?.id || id}
  content={{
    linkedin: detail.contentKit?.contentLinkedin,
    twitter: detail.contentKit?.contentTwitter,
    instagram: detail.contentKit?.contentInstagram,
    email: detail.contentKit?.contentEmail,
    tiktok: detail.contentKit?.contentTiktok,
    youtube: detail.contentKit?.contentYoutube,
    videoScript: detail.contentKit?.contentVideoScript,
  }}
  onContentUpdate={() => refresh()}
/>

{activeClipForEditor && (
  <ClipEditorModal
    open={clipEditorOpen}
    onClose={() => { setClipEditorOpen(false); setActiveClipForEditor(null); }}
    clip={activeClipForEditor}
    uploadId={detail.upload?.id || id}
    captionSegments={captionSegments}
    onCaptionUpdate={() => refresh()}
  />
)}

{/* Keep existing modals */}
<ReelEditorModal ... />
<ExportProgressModal ... />
<ScheduleModal ... />
<QuickScheduleModal ... />
```

- [ ] **Step 7: Update "Blog Post" labels to "Substack"**

Search the file for any remaining "Blog" labels and change to "Substack". This includes:
- The BlogPostSection import (remove it)
- Any `PLATFORM_CONFIG` reference that labels blog as "Blog Post"
- The page header stats if they mention blog

- [ ] **Step 8: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/app/content-kit/[id]/ContentKitDetailContent.tsx
git commit -m "feat: rewrite content kit detail page — card grid with modal editors"
```

---

### Task 8: Build + Push

- [ ] **Step 1: Production build**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
npm run build
```

- [ ] **Step 2: Push**

```bash
git push origin HEAD:main
```

---

## Notes

- **No database migrations.** The `content_blog` column stays. "Substack" is a UI label + prompt change only.
- **Existing API contracts are sufficient.** `PATCH /api/content-kits/:id` accepts all content fields. `POST /:id/regenerate` accepts `platforms` array. No new endpoints needed.
- **The carousel editor modal is deferred to Phase 2.** For now, the carousel OutputCard can open the existing `CarouselStyleEditor` inline or as a simple modal wrapper. Don't build a full carousel editor in this plan.
- **Caption text editing (typo fixing)** is included in ClipEditorModal as read-only if the backend doesn't support transcript text updates via the existing PATCH endpoint. The agent implementing Task 6 should check the backend `updateClipSchema` in `src/routes/clips.ts` and adapt accordingly.
- **`marked` library** for markdown→HTML conversion in the clipboard utility: check if it's already in package.json (the project uses ReactMarkdown which depends on `remark`, but `marked` is simpler for a one-shot conversion). If not installed, add it.
- **The WrittenContentModal field mapping** uses the camelCase field names from the frontend types (`contentLinkedin`, `contentTwitter`, etc.) which match the PATCH endpoint's accepted fields.
- **Mobile app** is not updated in this plan. It will need a follow-up to adopt the same card grid + modal pattern (or a simpler tabbed view given mobile constraints).
