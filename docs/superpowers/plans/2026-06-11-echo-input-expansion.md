# Echo Input Expansion Implementation Plan (files + mic + telemetry)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Echo accepts every input type — dropped/attached files (video, audio, text docs), mic voice input, and typed text — and logs intent-correction telemetry, making the pill the real "one ingestion point" and producing the soak data that gates the flag-flip.

**Architecture:** All execution reuses existing APIs; Echo grows zero upload infrastructure. Files route by type: video → kit creation (handed to the Create form via an in-memory module store, the same pattern as `echoPrompt` but for File objects); audio → classified with `hasAttachment` context (create → Create form audio mode via the same store; ingest → `api.kbContent.ingestVoice`); `.txt/.md` → read client-side → `api.kbContent.paste`. Mic records via MediaRecorder → `api.kbContent.transcribeVoice` → transcript enters the normal classify flow as text. Telemetry emits `echo_*` events to the existing `POST /api/telemetry/event` (funnel_events) — no backend changes in this plan.

**Tech Stack:** Existing `api` client methods (`kbContent.transcribeVoice`, `kbContent.ingestVoice`, `kbContent.paste`), `classifyEchoInput` with the already-supported `context.hasAttachment`, MediaRecorder API, module-level file-handoff store.

**Constraints:** `src/lib/api-client.ts` untouched (telemetry + new calls go through existing methods or `src/lib/echo-client.ts`). No em dashes in new strings. Admin gate unchanged. Branch `feat/echo-input-expansion` off develop. PR to develop; ship to main per the established flow.

**Parallel-work fence (Pass 2c runs in another terminal):** this plan OWNS `src/components/echo/**`, `src/lib/echo-client.ts`, and the seed/preload block of `src/components/generation-form.tsx`. The 2c terminal must NOT touch those; it owns `src/app/app/voice/**`. Home hero mode waits until both merge.

---

### Task 0: Branch

- [ ] `git checkout develop && git pull && git checkout -b feat/echo-input-expansion`

---

### Task 1: Intent telemetry (frontend-only)

**Files:**
- Modify: `src/lib/echo-client.ts` (add a fire-and-forget event helper)
- Modify: `src/components/echo/useEcho.ts` (emit at the three moments)

- [ ] **Step 1:** Check whether the frontend api client already exposes a telemetry method (`grep -n "telemetry" src/lib/api-client.ts`). If yes, use it from useEcho directly and skip the helper. If no, add to `src/lib/echo-client.ts`:

```ts
/** Fire-and-forget Echo telemetry. Never throws, never blocks UX. */
export function recordEchoEvent(eventName: string, data: Record<string, unknown>): void {
  apiClient.post('/telemetry/event', { event_name: eventName, event_data: data }).catch(() => {});
}
```

- [ ] **Step 2:** Emit from `useEcho.ts`:
  - after classification resolves: `recordEchoEvent('echo_classified', { intent, confidence, source, text_length: text.length, has_attachment })`
  - when the user selects a different chip than detected: `recordEchoEvent('echo_intent_corrected', { detected, corrected, confidence, source })`
  - after successful execution: `recordEchoEvent('echo_executed', { intent, corrected: boolean })`
  Never include the raw input text in event_data (privacy; length only).

- [ ] **Step 3:** `npm run build` → PASS. Commit: `feat(echo): intent telemetry via funnel events`

---

### Task 2: File handoff store + drop/attach on the pill

**Files:**
- Create: `src/components/echo/file-handoff.ts`
- Modify: `src/components/echo/EchoPill.tsx` (drop target + attach button + attachment chip UI)
- Modify: `src/components/echo/useEcho.ts` (attachment state + routing)
- Modify: `src/components/echo/intent-meta.ts` (file-kind helpers)

- [ ] **Step 1: `file-handoff.ts`** — a tiny module store for passing a File to the Create form across SPA navigation (File objects cannot ride a URL):

```ts
/**
 * In-memory handoff for files Echo passes to the Create form.
 * Same idea as the ?echoPrompt= seed but for File objects, which
 * cannot survive a URL. Single-slot, consumed-on-read, SPA-session only.
 */
let pending: { file: File; note?: string } | null = null;

export function stashEchoFile(file: File, note?: string): void {
  pending = { file, note };
}

/** Returns and clears the pending file (consume-once). */
export function takeEchoFile(): { file: File; note?: string } | null {
  const f = pending;
  pending = null;
  return f;
}
```

- [ ] **Step 2: file-kind routing** in `intent-meta.ts`:

```ts
export type EchoFileKind = 'video' | 'audio' | 'text' | 'unsupported';

export function classifyFile(file: File): EchoFileKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type === 'text/plain' || file.type === 'text/markdown' || /\.(txt|md)$/i.test(file.name)) return 'text';
  return 'unsupported';
}

export const MAX_ECHO_AUDIO_BYTES = 250 * 1024 * 1024; // backend KB ingest cap
export const MAX_ECHO_TEXT_BYTES = 1 * 1024 * 1024;
```

- [ ] **Step 3: pill UI** (`EchoPill.tsx`): the pill and the expanded panel are drop targets (dragover highlight using the existing focus-glow token); a paperclip attach button (lucide `Paperclip`) opens a file input (`accept="video/*,audio/*,.txt,.md"`). A selected file renders as a removable attachment chip (mono filename + size + X). Dropping/attaching auto-expands the pill. Unsupported type → inline error `That file type isn't supported yet. Video, audio, and text files work.` Oversize → inline error naming the limit.

- [ ] **Step 4: routing in `useEcho.ts`** — attachment changes submit behavior:
  - Attachment present: call `classifyEchoInput(text || file.name, { page, hasAttachment: true })`. Forced overrides BEFORE showing the chip: video file → intent `create`; text file → intent `ingest` (classifier text intent kept only if it returned create/ingest; question/command make no sense with a file — coerce to the file-kind default). Audio → trust the classifier between create/ingest (the chip is there to correct; default to `ingest` when there is no typed text, `create` when the text asks for content).
  - Execution with attachment:
    - `create` + video/audio file → `stashEchoFile(file, text)` → navigate `/app?echoFile=1` → receipt `HANDED TO CREATE · <FILENAME>`
    - `ingest` + audio → `api.kbContent.ingestVoice(...)` (read its exact signature in api-client.ts first; it is multipart) → receipt `ADDED TO YOUR VOICE · AUDIO`
    - `ingest` + text file → `file.text()` → `api.kbContent.paste({ text, sourceType: 'writing_sample', title: file.name })` → receipt `ADDED TO YOUR VOICE · <FILENAME>`
  - Attachment cleared on reset/collapse-after-done.

- [ ] **Step 5:** `npm run build && npx eslint src/components/echo src/lib/echo-client.ts --max-warnings=0` → clean. Commit: `feat(echo): file drop + attach with type routing`

---

### Task 3: Create form accepts the file handoff

**Files:**
- Modify: `src/components/generation-form.tsx` (extend the existing echoPrompt seed block ONLY)

- [ ] **Step 1:** Read the form's video and audio input-mode state first: how a chosen File enters the upload flow (state setter for the selected file and the mode switch; find where the file input's onChange lands). This is the task's judgment area — match the exact internal state transitions a manual file pick performs.
- [ ] **Step 2:** Extend the existing seed `useEffect` (it already watches `searchParams`): when `echoFile=1` is present, call `takeEchoFile()`; if non-null, switch to the video mode for video files / the audio mode for audio files, inject the File via the same state path as a manual pick, seed the text input with `note` if the form supports accompanying text, and strip the param via `router.replace`. If `takeEchoFile()` returns null (refresh after consume), just strip the param.
- [ ] **Step 3:** `npm run build` → PASS. Manual verify in dev if practical. Commit: `feat(echo): create form accepts echo file handoff`

---

### Task 4: Mic input

**Files:**
- Create: `src/components/echo/useEchoMic.ts`
- Modify: `src/components/echo/EchoPill.tsx` / `EchoExchange.tsx` (mic button + recording state UI)

- [ ] **Step 1: `useEchoMic.ts`** — MediaRecorder hook: `start()` requests `getUserMedia({ audio: true })`, records webm/opus chunks; `stop()` resolves a Blob. States: `idle | recording | transcribing | error`. Permission-denied → friendly inline error `Microphone access is blocked. Allow it in your browser settings to talk to Echo.` Hard cap 120s with auto-stop. Clean up tracks on stop/unmount.
- [ ] **Step 2: UI** — mic button (lucide `Mic`) beside the attach button. While recording: the pill's Waveform switches to `animated` (this is literally Echo listening — the sanctioned voice moment) + elapsed mono timer + stop button. After stop: `api.kbContent.transcribeVoice(blob)` (read its return shape in api-client.ts: it returns the transcript text) → put the transcript into the input textarea (editable) → user submits normally through the classify flow. Transcription failure → inline error, recording discarded.
- [ ] **Step 3: a11y** — mic button `aria-label="Talk to Echo"`, recording state announced via `aria-live="polite"`, reduced-motion: timer only, no waveform animation (Waveform already handles this).
- [ ] **Step 4:** `npm run build` + lint clean. Commit: `feat(echo): mic input - record, transcribe, classify`

---

### Task 5: Verification gate + PR

- [ ] `npm run lint && npm run build && npm run test:unit` — no new issues vs develop.
- [ ] frontend-gate skill pass.
- [ ] Manual e2e (admin account, dev server): drop video → Create video mode preloaded; drop audio with "make content from this" → create chip; drop audio with no text → ingest chip → receipt; drop .md → KB receipt; mic → transcript → classify; chip correction events visible in funnel_events.
- [ ] Push, PR to develop. PR notes: telemetry event names for the soak dashboard query (`echo_classified`, `echo_intent_corrected`, `echo_executed`).

## Self-review notes
- PDFs/docx deliberately unsupported in v1 (no client-side extractor); inline error names what works. Follow-up if soak demands it.
- The audio-default rule (no text → ingest, content-ask → create) matches the classifier prompt's existing guidance; the chip remains the correction layer either way.
- The file-handoff store is consume-once and SPA-session only; a hard refresh between stash and consume loses the file — acceptable (the user just re-drops), noted here so it is not "discovered" as a bug.
