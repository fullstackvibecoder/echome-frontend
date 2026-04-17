# Create Page Redesign — Unified Conversational Input

**Date:** 2026-04-17
**Scope:** `src/app/app/AppContent.tsx` (the `/app` dashboard/create page)
**Goal:** Replace the three-card mode selector with a single unified input that accepts any source type and auto-detects what the user gave it.

## Problem

The current create page has:
- "What are we working with?" heading + three equally-weighted input mode cards (Upload Video, Type or Paste, Record Voice)
- A mode selection step before the user can do anything
- Recent content kits section cluttering the page
- Generic SaaS template feel — no personality, no brand voice

This creates ceremony where there should be action.

## Design Direction

**"The Conversational"** — Brand-forward single input. One headline, one input area, no mode selection. The system auto-detects what the user provides and routes it.

### Page Layout

The page is JUST the input. Nothing else. Centered vertically and horizontally:

```
           What are we turning into content?
          A video, a link, a topic — whatever you've got.

    ┌─────────────────────────────────────────────┐
    │                                             │
    │  Start typing, paste a URL, or drop a file… │
    │                                             │
    ├─────────────────────────────────────────────┤
    │  📎  🔗  🎤              [→]               │
    └─────────────────────────────────────────────┘
         (Zoom passcode field appears here
          when a zoom.us URL is detected)
```

### Headline
- h2: "What are we turning into content?" — `text-foreground`, `text-[22px]`, `font-semibold`
- Subtitle: "A video, a link, a topic — whatever you've got." — `text-muted-foreground`, `text-[13px]`
- Centered, with generous whitespace above and below

### Input Component

A single `<div>` that functions as both a text area and a drop zone:

**Text area (top section):**
- Expandable div (or `<textarea>`) with placeholder: "Start typing, paste a URL, or drop a file..."
- Minimum height: ~48px, grows as user types
- Background: `bg-card`, border: `border-border`, rounded-[14px]
- Text: `text-foreground`, 15px

**Bottom toolbar (inside the input box, below the text area):**
- Separated by a subtle `border-t border-border`
- Left side: three icon buttons in a row
  - Attach file (paperclip icon) — opens native file picker
  - Paste link (link icon) — focuses the text input (hint/affordance)
  - Record voice (mic icon) — starts audio recording
- Right side: Submit button (arrow icon, circular, `bg-primary-interactive`, white icon)
- Icon buttons: 32px square, no background, `text-muted-foreground` icons, `hover:text-foreground`

**Drag and drop behavior:**
- The entire input area is a drop zone
- Default state: NO visual drop zone indicators (no dashed border)
- On `dragenter`/`dragover`: border transitions to `border-primary-interactive`, subtle `bg-accent/5` background tint
- On `dragleave`/`drop`: reverts to normal
- File dropped → same flow as file picker (detect type, start upload)

### Auto-Detection Logic

When the user submits (hits go button or presses Enter):

1. **Check if a file was selected** (via drag-and-drop or file picker) → route to video upload flow
2. **Check if input text is a URL:**
   - YouTube (`youtube.com`, `youtu.be`) → `sourceType: 'youtube'`
   - Zoom (`zoom.us/rec/`) → `sourceType: 'zoom'` + show Zoom password field if detected
   - Loom (`loom.com/share/`) → `sourceType: 'loom'`
   - Instagram (`instagram.com/reel/`, `/p/`) → `sourceType: 'instagram'`
   - Vimeo, Riverside, StreamYard, etc. → `sourceType: 'url'`
   - Route to `processVideoWithClipFinder(undefined, sourceType, url)`
3. **Check if input is plain text** → route to text generation flow (`onGenerate(input, 'text', ...)`)
4. **Voice recording** → handled by mic button starting/stopping recording, transcribing, then routing to text generation

### Zoom Password Field

When a `zoom.us` URL is detected in the input text (on keystroke/paste, not on submit):
- A small optional text input slides in below the main input: "Zoom passcode (if required)"
- Same styling as the existing implementation in generation-form.tsx
- Value passed as `zoomPassword` to the upload call

### Voice Recording

When mic button is clicked:
- Mic icon turns red, starts pulsing
- Recording indicator appears in the text area ("Recording... 0:03")
- Second click stops recording
- Audio transcribed → transcribed text appears in the text area
- User can edit the text, then submit as text generation

### What Gets Removed

- The three input mode cards (Upload Video, Type or Paste, Record Voice)
- The mode selector state (`inputType` state variable and its UI)
- The "What are we working with?" heading and "Pick your source material" subtitle
- The RECENT content kits section at the bottom
- The "How it works" 3-step process indicator
- The "You'll get" section
- All the input-specific sub-forms (URL paste mini-form, file drop zone, audio panel)

All of this collapses into the single unified input.

### What Gets Kept (from the existing generation-form.tsx)

- The `processVideoWithClipFinder` function and its entire video processing pipeline
- The `onGenerate` callback for text generation
- The video processing progress indicator (inline stages, progress bar)
- YouTube error handling and error UI
- Zoom password modal (reactive fallback if password not provided upfront)
- File size validation (>2GB error, >500MB warning)
- The `useSubscription` hook for free generation gating
- The `useGeneration` hook for text generation state
- Caption style and reel template state (these apply after processing starts)

### Processing State

When processing is active (video uploading/processing or text generating):
- The input area is replaced by the existing inline progress indicator
- Same stage-by-stage progress display that exists today
- On completion: redirect to the content kit detail page

### Responsive Behavior

- The input area has a max-width of ~520px and is centered
- On mobile: full-width with horizontal padding
- The headline/subtitle stack above at all breakpoints
- Bottom toolbar icons wrap naturally

### Empty / Auth States

- If not authenticated: redirect to login (existing middleware handles this)
- If free generations exhausted: show the input but on submit, show upgrade prompt (existing `canGenerate` check)
- No empty state needed — the page is always the input

## Implementation Notes

- The current `generation-form.tsx` is ~1750 lines. It contains all input modes, processing states, progress UI, error handling, caption/reel options, and more. The redesign doesn't rewrite that file — it changes what the RESTING state looks like (the input area), while keeping the processing/progress/error flows intact.
- The simplest implementation: modify `generation-form.tsx` to remove the mode selector cards, remove the recent kits section, and replace the resting state with the unified input. The mode detection happens on submit, not on UI selection.
- The `inputType` state variable stays internally but is set automatically based on what the user provides, not from a UI selector.
- File/drag-and-drop handling already exists in the component — just needs to be wired to the unified input area instead of the dedicated drop zone.
- Voice recording already exists in `VoiceInputPanel` — needs to be triggered from the mic button instead of a dedicated panel.

## Out of Scope

- Content kit list page (already redesigned)
- Content kit detail page (separate spec)
- Onboarding flow changes
- Voice profile / knowledge base pages
