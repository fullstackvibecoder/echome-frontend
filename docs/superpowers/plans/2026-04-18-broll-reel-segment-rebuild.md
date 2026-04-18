# B-Roll Reel Segment-Based Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the B-roll reel system from one-text-block-truncated-to-fit to a proper segment-based sequence where each segment is 2-5 words displayed one at a time, with an optional single-block mode.

**Architecture:** The authority hook generator is tightened to produce 2-5 word segments. The TextOverlayPreview component is rebuilt to show one segment at a time with auto-cycling. The ReelEditorModal is rebuilt with per-segment inputs and a segments/single-block mode toggle. The compose-broll endpoint is adapted to accept timed segments.

**Tech Stack:** Backend: Anthropic SDK (Claude Haiku), Node.js. Frontend: React, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-18-broll-reel-segment-rebuild.md`

**Repos:**
- Backend: `/Users/aramammo/Side Quests/echome-platform-v2`
- Frontend: `/Users/aramammo/Side Quests/echome-frontend`

---

## File Structure

### Backend

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/services/video/authority-hook-generator.ts` | Tighten to 2-5 words per segment, stricter prompt + validation |

### Frontend

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/reels/SegmentPreview.tsx` | Phone-frame preview that cycles through segments one at a time with dots |
| Create | `src/components/reels/SegmentEditor.tsx` | Per-segment input fields with word count, add/delete, mode toggle |
| Modify | `src/components/reels/ReelEditorModal.tsx` | Replace textarea with SegmentEditor, replace TextOverlayPreview with SegmentPreview |

---

### Task 1: Backend — Tighten Authority Hook Generator

**Files:**
- Modify: `echome-platform-v2/src/services/video/authority-hook-generator.ts`

- [ ] **Step 1: Read the current file completely**

Read `src/services/video/authority-hook-generator.ts`. Understand the current system prompt, the `STYLE_CONSTRAINTS` mapping, the validation function, and the fallback logic.

- [ ] **Step 2: Rewrite the system prompt for 2-5 word segments**

Replace the entire `AUTHORITY_HOOK_SYSTEM_PROMPT` with:

```
You generate text overlay segments for short-form B-roll reels.

CRITICAL RULES:
1. Each segment is EXACTLY 2-5 words. Count them. No exceptions.
2. Generate 2-4 segments total.
3. Each segment is displayed alone on screen for 3 seconds.
4. Segments are visual BEATS — each one hits independently.

SEGMENT ROLES:
- Segment 1: Hook — a question, provocation, or pattern interrupt
- Segment 2-3: Insight — the reframe or data point
- Final segment: Takeaway — what to do or think differently

GOOD EXAMPLES:
["Market's crashing?", "Data says otherwise", "Check the numbers"]
["Stop pricing to comps", "Price to psychology", "Here's why"]
["Staging works", "Not for beauty", "It kills negotiation"]
["Your knowledge base?", "Messy is fine", "Just start uploading"]

BAD EXAMPLES (DO NOT produce):
["You know what? Forget about trying to make your knowledge base look like a masterpiece"] ← 15 words, way too long
["Long story short polished is overrated"] ← 6 words, starts with filler
["Here are three tips for getting your home ready"] ← 9 words, generic level 2

RULES:
- NO filler words to start (no "You know what", "So here's the thing", "Let me tell you")
- NO emojis, NO hashtags
- First word of each segment should HIT (verbs, questions, provocative nouns)
- Write for a PHONE SCREEN in large bold text — if it won't fit in 5 words, it's too long

OUTPUT: Return ONLY a JSON array:
[{"text": "2-5 words here", "duration": 3}, ...]
```

- [ ] **Step 3: Remove `STYLE_CONSTRAINTS` — segments are always 2-5 words regardless of style**

Delete the entire `STYLE_CONSTRAINTS` record and the `textStyle` parameter handling. Style is a visual treatment, not a word count constraint. The user message no longer includes VISUAL STYLE, STYLE CONSTRAINT, or MAX WORDS PER SEGMENT sections.

Replace the user message with:
```typescript
const userMessage = `Topic: ${context.topic}
Reference caption (for angle, do NOT copy): ${context.instagramCaption}
User role: ${context.userRole || 'content creator'}
User niche: ${context.userTopics || ''}

Generate 2-4 text overlay segments. Each segment MUST be 2-5 words.`;
```

- [ ] **Step 4: Tighten validation — max 5 words per segment, strip filler**

Update `validateHookSegments`:
```typescript
function validateHookSegments(data: unknown): HookSegment[] {
  if (!Array.isArray(data)) throw new Error('Response is not an array');
  if (data.length < 2 || data.length > 4) throw new Error(`Expected 2-4 segments, got ${data.length}`);

  const segments: HookSegment[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || !item || typeof item.text !== 'string' || !item.text.trim()) {
      throw new Error('Invalid segment');
    }
    // Strip emojis and trim
    const cleaned = item.text.trim().replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount > 5) {
      throw new Error(`Segment "${cleaned.slice(0, 30)}..." is ${wordCount} words (max 5)`);
    }
    if (wordCount < 2) {
      throw new Error(`Segment "${cleaned}" is only ${wordCount} word (min 2)`);
    }
    segments.push({ text: cleaned, duration: item.duration || 3 });
  }
  return segments;
}
```

- [ ] **Step 5: Update the fallback to produce 2-5 word segments**

```typescript
function fallbackFromCaption(caption: string): HookSegment[] {
  const cleaned = caption.replace(/#\w+/g, '').replace(/\n+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [{ text: 'Watch this', duration: 3 }, { text: 'Trust me', duration: 3 }];

  // Take first 12 words, split into 3 segments of ~4 words each
  const usable = words.slice(0, 12);
  const segments: HookSegment[] = [];
  const chunkSize = Math.min(4, Math.ceil(usable.length / 3));

  for (let i = 0; i < usable.length && segments.length < 3; i += chunkSize) {
    const chunk = usable.slice(i, i + chunkSize);
    if (chunk.length >= 2) {
      segments.push({ text: chunk.join(' '), duration: 3 });
    }
  }

  return segments.length >= 2 ? segments : [
    { text: usable.slice(0, 3).join(' '), duration: 3 },
    { text: usable.slice(3, 6).join(' ') || 'Check this out', duration: 3 },
  ];
}
```

- [ ] **Step 6: Remove `textStyle` from the function signature**

The `context.textStyle` parameter is no longer used. Remove it from the interface and any references.

- [ ] **Step 7: Typecheck + commit + push**

```bash
cd "/Users/aramammo/Side Quests/echome-platform-v2" && npx tsc --noEmit
git add src/services/video/authority-hook-generator.ts
git commit -m "feat: tighten authority hook to 2-5 words per segment, remove style constraints"
git push origin main
```

---

### Task 2: Frontend — SegmentPreview Component

**Files:**
- Create: `echome-frontend/src/components/reels/SegmentPreview.tsx`

- [ ] **Step 1: Create the component**

A phone-frame preview that shows one segment at a time, cycling automatically with navigation dots.

```typescript
interface ReelSegment {
  text: string;
  duration: number;
}

interface SegmentPreviewProps {
  thumbnailUrl?: string;
  segments: ReelSegment[];
  style: string; // TextOverlayStyleId
  textScale?: number;
  /** If set, shows this single block text instead of segments */
  singleBlockText?: string;
}
```

**Segments mode behavior:**
- Shows one segment's text at a time, centered on the B-roll
- Auto-cycles via `setInterval` using each segment's `duration` (seconds)
- Fade transition between segments (opacity 0→1 over 300ms)
- Navigation dots below the phone frame: one dot per segment, active dot is filled
- Clicking a dot jumps to that segment and resets the cycle timer

**Single block mode behavior:**
- Shows `singleBlockText` as one overlay
- Text has a semi-transparent background: `bg-black/40 backdrop-blur-[2px]` — NOT opaque, B-roll is visible
- Rounded corners, padding
- No dots, no cycling

**Phone frame:**
- `aspect-[9/16]` container
- `rounded-2xl overflow-hidden` with `border-2 border-border`
- B-roll thumbnail as background `<img>` with `object-cover`
- Dark overlay `bg-black/20` for readability (lighter than before since segments are shorter)

**Text rendering:**
- Read the existing `TextOverlayPreview.tsx` to match the style rendering (bold_impact, minimal_clean, etc.) — reuse the same styling logic for each style type, but render only the current segment's text
- Since segments are 2-5 words, ALL styles work — no truncation needed

- [ ] **Step 2: Typecheck + commit**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit
git add src/components/reels/SegmentPreview.tsx
git commit -m "feat: add SegmentPreview — cycles through segments with dots navigation"
```

---

### Task 3: Frontend — SegmentEditor Component

**Files:**
- Create: `echome-frontend/src/components/reels/SegmentEditor.tsx`

- [ ] **Step 1: Create the component**

Per-segment input fields with word count, add/delete controls, and a mode toggle.

```typescript
interface ReelSegment {
  text: string;
  duration: number;
}

interface SegmentEditorProps {
  segments: ReelSegment[];
  onSegmentsChange: (segments: ReelSegment[]) => void;
  singleBlockText: string;
  onSingleBlockTextChange: (text: string) => void;
  mode: 'segments' | 'single';
  onModeChange: (mode: 'segments' | 'single') => void;
}
```

**Mode toggle:**
- Two pills at the top: `[Segments]` `[Single Block]`
- Active: `bg-primary-interactive text-white`, inactive: `border border-border text-muted-foreground`
- Switching modes preserves both states (segments array AND single block text stay in parent state)

**Segments mode UI:**
- Each segment: one `<input type="text">` with:
  - Label: `Seg 1`, `Seg 2`, etc.
  - Word count badge: `3 / 5` — green if ≤5, red if >5
  - Delete button (× icon) — only if segment count >2
  - Inputs are stacked vertically with `gap-2`
- "Add Segment" button at bottom — only if count <4
- Each input: `bg-background border border-border rounded-lg px-3 py-2 text-sm`
- Placeholder: `"2-5 punchy words..."`

**Single block mode UI:**
- One `<textarea rows={2}>` with:
  - Placeholder: `"One complete idea. 8-15 words."`
  - Word count: `12 / 15` — red if >15
  - Helper text: `"B-roll stays visible behind the text"`
- textarea: `bg-background border border-border rounded-lg px-3 py-2 text-sm`

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/reels/SegmentEditor.tsx
git commit -m "feat: add SegmentEditor — per-segment inputs with mode toggle"
```

---

### Task 4: Frontend — Rebuild ReelEditorModal

**Files:**
- Modify: `echome-frontend/src/components/reels/ReelEditorModal.tsx`

- [ ] **Step 1: Read the current modal completely**

Understand:
- How it fetches data (B-roll library, reel project)
- How it renders the preview (`TextOverlayPreview`)
- The hook text state, style state, text scale state
- The generate/render flow
- The compose API call

- [ ] **Step 2: Replace state management**

Remove:
- `hookText` (single string state)
- `regeneratingText`
- The `STYLE_MAX_WORDS` references and auto-style-selection logic

Add:
```typescript
const [segments, setSegments] = useState<Array<{ text: string; duration: number }>>([
  { text: '', duration: 3 },
  { text: '', duration: 3 },
  { text: '', duration: 3 },
]);
const [singleBlockText, setSingleBlockText] = useState('');
const [mode, setMode] = useState<'segments' | 'single'>('segments');
```

- [ ] **Step 3: Update data loading to populate segments**

In `fetchData`, when a reel project is loaded:
```typescript
if (reelProject) {
  setProjectId(reelProject.id);
  const overlays = reelProject.generatedContent?.segmentOverlays;
  if (overlays && overlays.length >= 2) {
    // Check if segments are short enough for segment mode (≤5 words each)
    const allShort = overlays.every((o: any) => o.text.split(/\s+/).length <= 5);
    if (allShort) {
      setMode('segments');
      setSegments(overlays.map((o: any) => ({ text: o.text, duration: 3 })));
    } else {
      // Old long-form text — put in single block mode
      setMode('single');
      setSingleBlockText(overlays.map((o: any) => o.text).join(' '));
    }
  } else if (reelProject.generatedContent?.hookText) {
    setMode('single');
    setSingleBlockText(reelProject.generatedContent.hookText);
  }
  if (reelProject.outputUrl) setOutputUrl(reelProject.outputUrl);
}
```

- [ ] **Step 4: Replace preview with SegmentPreview**

Replace the `TextOverlayPreview` render with:
```tsx
import { SegmentPreview } from './SegmentPreview';

// In the render:
<SegmentPreview
  thumbnailUrl={selectedClip?.thumbnailUrl}
  segments={mode === 'segments' ? segments : []}
  style={selectedStyle}
  textScale={textScale}
  singleBlockText={mode === 'single' ? singleBlockText : undefined}
/>
```

Remove the `TextOverlayPreview` import.

- [ ] **Step 5: Replace textarea with SegmentEditor**

Replace the hook text section (the textarea, word count, style-aware warnings, "Use IG Caption" button) with:
```tsx
import { SegmentEditor } from './SegmentEditor';

// In the render:
<SegmentEditor
  segments={segments}
  onSegmentsChange={setSegments}
  singleBlockText={singleBlockText}
  onSingleBlockTextChange={setSingleBlockText}
  mode={mode}
  onModeChange={setMode}
/>
```

Keep the style selector and text size slider below the editor.

- [ ] **Step 6: Update the generate/compose call**

Update `handleGenerate` to pass segments or single block text:
```typescript
const handleGenerate = async () => {
  if (!selectedClipId) return;
  setRendering(true);
  setError(null);
  setOutputUrl(null);

  try {
    const textOverlays = mode === 'segments'
      ? segments.filter(s => s.text.trim()).map((s, i) => ({
          text: s.text,
          position: 'center' as const,
          startTime: i * s.duration,
          endTime: (i + 1) * s.duration,
        }))
      : [{ text: singleBlockText, position: 'center' as const }];

    const composeRes = await api.brollReels.compose({
      brollClipIds: [selectedClipId],
      templateStyle: selectedStyle,
      contentKitId,
      generateText: false,
      textOverlays,
    });

    // ... rest of polling logic stays the same
  }
};
```

Check the `ComposeBRollReelInput` type in `src/types/index.ts` to see if `textOverlays` supports `startTime`/`endTime`. If not, adapt — the compose endpoint may handle timing differently (check `src/routes/reels.ts` compose-broll schema).

- [ ] **Step 7: Remove old code**

Remove:
- The `STYLE_OPTIONS` array's `maxWords`, `placeholder`, `hint` fields (no longer needed for word-count-based gating)
- The auto-style-selection logic based on word count
- The style-aware textarea (the IIFE with `activeStyle`, `isOverLimit`, etc.)
- Any `TextOverlayPreview` references

Keep:
- Style selector pills (they affect visual treatment)
- Text size slider
- B-roll strip
- Generate/download buttons
- All modal frame behavior (close, escape, backdrop)

- [ ] **Step 8: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/reels/ReelEditorModal.tsx
git commit -m "feat: rebuild reel editor — segment inputs + preview cycling + mode toggle"
```

---

### Task 5: Build + Push

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

- **The `TextOverlayPreview` component is NOT deleted** — it may be used elsewhere (the standalone reel maker page, the content kit card preview). It just gets replaced inside the `ReelEditorModal` by `SegmentPreview`.
- **The compose-broll endpoint** may or may not support `startTime`/`endTime` on text overlays. The implementer of Task 4 should check the backend schema (`previewTextOverlaysSchema` and `composeBRollSchema` in `src/routes/reels.ts`). If timing isn't supported, omit it — the backend's B-roll composer already spaces overlays evenly across the clip duration.
- **Old reel projects with long text** are handled in Task 4 Step 3 — they get routed to single-block mode automatically.
- **The `instagramCaption` prop** on the modal is kept. In single-block mode, it can be used as a "Use IG Caption" source. In segments mode, it's not shown.
- **Style selector stays unchanged** — all 6 styles work with 2-5 word segments. The style affects font size, weight, shadow, color treatment — NOT word count.
