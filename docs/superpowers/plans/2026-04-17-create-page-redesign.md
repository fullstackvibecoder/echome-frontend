# Create Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-card mode selector on the create page with a single unified conversational input that auto-detects URLs, files, and text.

**Architecture:** New `UnifiedCreateInput` component handles the resting-state UI (branded heading, textarea with toolbar, invisible drag-and-drop). The existing `generation-form.tsx` keeps its entire processing/progress pipeline intact — only the mode-selector early return (lines ~1070-1141) and the input-specific sub-forms are replaced. `AppContent.tsx` loses the recent kits section. Auto-detection sets `inputType` internally on submit, not via UI cards.

**Tech Stack:** React, TypeScript, Tailwind CSS with design tokens, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-17-create-page-redesign.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/UnifiedCreateInput.tsx` | Branded input: heading, expandable textarea, bottom toolbar (attach/mic/submit), invisible drag-and-drop zone, contextual Zoom password field |
| Modify | `src/components/generation-form.tsx` | Remove mode selector early return, remove mode-specific sub-forms, render UnifiedCreateInput as resting state, auto-detect input type on submit |
| Modify | `src/app/app/AppContent.tsx` | Remove recent kits section and its data fetching |

---

### Task 1: Create UnifiedCreateInput Component

**Files:**
- Create: `src/components/UnifiedCreateInput.tsx`

- [ ] **Step 1: Create the component**

The component renders:
- Centered heading: "What are we turning into content?"
- Subtitle: "A video, a link, a topic — whatever you've got."
- Expandable textarea with placeholder
- Bottom toolbar: attach (paperclip), mic, submit (arrow) icons
- The entire input area is a drag-and-drop zone (invisible until dragover)
- Contextual Zoom passcode field (appears when textarea contains a zoom.us URL)

Props:
```typescript
interface UnifiedCreateInputProps {
  onSubmit: (input: string, file?: File) => void;
  onMicClick: () => void;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  zoomPasswordValue: string;
  onZoomPasswordChange: (value: string) => void;
}
```

Implementation notes:
- Use a `<textarea>` with auto-resize (adjust height on input) for the text area
- `rows={1}` default, grows as user types, max ~6 rows
- Drag-and-drop: `onDragEnter` → set `dragActive` state → show `border-primary-interactive bg-accent/5` on the wrapper. `onDragLeave`/`onDrop` → revert. `onDrop` → extract file, call `onFileSelect`.
- Attach button opens a hidden `<input type="file" accept="video/*">` via ref click
- Mic button calls `onMicClick` prop (parent handles recording state)
- Submit button calls `onSubmit(textValue, selectedFile)` — parent determines what to do based on content
- Zoom detection: `useMemo` checking if textarea value matches `/zoom\.us/i` → shows the passcode field below the input box
- All styling uses design tokens: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary-interactive`
- The component is vertically centered using flexbox on the parent — the component itself just needs `max-w-[520px] w-full mx-auto`

- [ ] **Step 2: Run typecheck**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UnifiedCreateInput.tsx
git commit -m "feat: add UnifiedCreateInput — conversational create interface"
```

---

### Task 2: Replace Mode Selector in generation-form.tsx

**Files:**
- Modify: `src/components/generation-form.tsx`

This is the most delicate task. The file is ~1750 lines. The changes are surgical — remove specific blocks, add the unified input as the resting state.

- [ ] **Step 1: Read the current file and identify the blocks to change**

Read `src/components/generation-form.tsx` fully. Identify:
1. The `showModeSelector` state variable (~line 385)
2. The mode selector early return (~lines 1070-1141) — the "What are we working with?" + three cards
3. The URL paste mini-form (~lines 1446-1490) — inline URL input + Go button + zoom field
4. The file upload card / drop zone area (~lines 1283-1410)
5. The `handleGenerate` function (~line 944) — this is where auto-detection lives
6. The `inputType` state variable (~line 386)

- [ ] **Step 2: Make the changes**

**A. Remove `showModeSelector` state and its early return:**
- Delete the `showModeSelector` state variable (it defaults to true and shows the 3-card selector)
- Delete the entire early return block (lines ~1070-1141) that renders when `showModeSelector` is true
- The component should now always flow to the main return

**B. Add the UnifiedCreateInput as the resting state:**
- Import `UnifiedCreateInput` from `./UnifiedCreateInput`
- In the main return, BEFORE the existing input-specific UI, add a condition: when not `videoProcessing` and not `generating` and not `uploading` and no `selectedFile`, render the `UnifiedCreateInput`
- Wire the callbacks:
  - `onSubmit`: implement auto-detection logic (see below)
  - `onMicClick`: set inputType to 'audio' and trigger the existing VoiceInputPanel
  - `onFileSelect`: set `selectedFile`, set inputType to 'video', call `processVideoWithClipFinder(file, 'upload')`
  - `zoomPasswordValue` / `onZoomPasswordChange`: wire to `zoomPasswordUpfront` state (already exists)
- Hide the old mode-specific sub-forms when the unified input is showing

**C. Auto-detection in onSubmit handler:**

```typescript
const handleUnifiedSubmit = (text: string, file?: File) => {
  if (file) {
    // File was dropped or selected via attach button
    setSelectedFile(file);
    processVideoWithClipFinder(file, 'upload');
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  // Check if it's a URL
  const isYouTube = /youtube\.com|youtu\.be/.test(trimmed);
  const isInstagram = /instagram\.com/.test(trimmed);
  const isLoom = /loom\.com/.test(trimmed);
  const isZoom = /zoom\.us/.test(trimmed);
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (isYouTube || isInstagram || isLoom || isZoom || isUrl) {
    const sourceType = isYouTube ? 'youtube' : isInstagram ? 'instagram' : isLoom ? 'loom' : isZoom ? 'zoom' : 'url';
    const passcode = isZoom ? zoomPasswordUpfront.trim() || undefined : undefined;
    setVideoUrl(trimmed);
    processVideoWithClipFinder(undefined, sourceType, trimmed, passcode);
    return;
  }

  // Plain text — generate content
  setInput(trimmed);
  onGenerate(trimmed, 'text' as InputType, ALL_PLATFORMS, undefined, undefined, 'tweet-style');
};
```

**D. Remove the old URL paste mini-form and mode-specific card UI:**
- The old inline URL input (lines ~1446-1490), the old file upload card with the three mode icons (~lines 1283-1410), and the mode selector heading can all be removed since the UnifiedCreateInput replaces them
- Keep the video processing progress UI (lines ~1301-1410) — it shows DURING processing, not at rest
- Keep the YouTube error banner, file size warnings, etc.

**E. Handle the transition from resting → processing:**
- When `processVideoWithClipFinder` or `onGenerate` is called, the existing state changes (`videoProcessing`, `generating`, etc.) will cause the unified input to hide and the progress UI to show — this already works because the condition is `!videoProcessing && !generating && !uploading`

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Fix any type errors. Common ones:
- `showModeSelector` references that need to be removed
- `inputType` being set from UI that no longer exists — now set internally
- Unused imports from removed UI sections

- [ ] **Step 4: Commit**

```bash
git add src/components/generation-form.tsx
git commit -m "feat: replace mode selector with unified conversational input"
```

---

### Task 3: Remove Recent Kits from AppContent.tsx

**Files:**
- Modify: `src/app/app/AppContent.tsx`

- [ ] **Step 1: Read and identify the recent kits section**

Read `src/app/app/AppContent.tsx`. Find:
- The `recentKits` state variable and its data fetching
- The "RECENT" / "View all" section in the JSX that renders recent content kit cards
- Any related imports (e.g., `GenerationRequest` type if only used for recent kits)

- [ ] **Step 2: Remove the recent kits section**

- Delete the `recentKits` state and the `useEffect` that fetches them
- Delete the JSX block that renders the recent kits grid (the section with "RECENT" heading, "View all" link, and the kit card grid)
- Keep the `FirstGeneration` / generation form component — that stays
- Remove any imports that are now unused

The page should now render ONLY the generation form — nothing below it.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/app/AppContent.tsx
git commit -m "feat: remove recent kits section from create page"
```

---

### Task 4: Build + Push

- [ ] **Step 1: Run production build**

```bash
npm run build
```

- [ ] **Step 2: Visual check**

Verify the changes compile and the page structure is correct:
- Create page should show: heading → subtitle → unified input → nothing else
- No mode selector cards
- No recent kits
- Typing text and hitting submit should trigger generation
- Pasting a YouTube URL should trigger clip finder
- The mic and attach buttons should be present in the toolbar

- [ ] **Step 3: Final commit + push**

```bash
git add -A
git commit -m "feat: create page redesign — unified conversational input

Replace three-card mode selector with single branded input that
auto-detects URLs, files, and text. Drop zone activates on drag only.
Mic and attach buttons in toolbar. Recent kits section removed.
Processing/progress pipeline unchanged.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

git push origin main
```

---

## Notes

- `generation-form.tsx` is ~1750 lines. This plan changes the resting-state UI (~200 lines of mode selector + sub-forms) but keeps the processing pipeline (~1000 lines) completely intact. The risk surface is small.
- The `inputType` state variable is kept but set automatically instead of via UI selection. This preserves compatibility with all the downstream code that checks `inputType`.
- The `VoiceInputPanel` component (defined inline at the top of the file) stays — it's triggered by the mic button callback instead of a dedicated mode. The parent sets `inputType = 'audio'` and the existing conditional rendering shows the recording UI.
- File size validation (>2GB error, >500MB warning) stays in the `handleFileSelect` callback — it's triggered when `onFileSelect` receives a file from either the file picker or drag-and-drop.
- The `repurpose` input type (from Creator Radar) is NOT part of the unified input — it's a separate entry point triggered from the Creator Radar page. If the user arrives at `/app` with a repurpose intent, the existing flow handles it independently.
