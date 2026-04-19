# Knowledge Base Simplified — Design Spec

**Goal:** Replace the 3-card + 6-modal Knowledge Base input system with a single unified input — same pattern as the Create page. One place to drop anything, the system figures out what it is.

**Scope:** Frontend redesign only. All backend endpoints stay the same. We're changing how users provide input, not how the system processes it.

---

## The Problem

The current Build Your Voice page has 3 input cards (Connect my Socials / Import my Writing / Record a Voice Note), each expanding into sub-choices, each opening different modals with different UIs. That's 6 separate modals for what is fundamentally one action: "give Echo something to learn from."

This violates the output-first / low-UI philosophy. The Create page already solved this — one text box that accepts a link, a file, a topic, or a voice recording. The Knowledge Base should work the same way.

---

## New Page Layout

```
┌─ Build Your Voice
│  Voice strength: Strong (73/100)  [waveform]
│
├─ [unified input area]
│  "Drop a file, paste a link, or record your voice..."
│  [attach] [mic] [→]
│  YouTube · Instagram · Blog · Gmail Export
│
├─ What Echo knows (expanded by default)
│  [chat interface — "See what Echo learned about you"]
│
└─ Sources (N items)  ▸  (collapsed, expandable)
```

Three sections total. That's it.

---

## Section 1: Voice Strength Header

Keep as-is. The strength meter (score + waveform + tier badge) is output, not input. This stays at the top unchanged.

One simplification: remove the 5-dimension breakdown pills (Phrases, Clean, Style, Natural, Voice Match). Just show the overall score + tier.

---

## Section 2: Unified Input

A single input area that accepts everything, modeled after the Create page's `UnifiedCreateInput`:

**Text input:** A textarea with placeholder "Drop a file, paste a link, or record your voice..."

**Toolbar:** Three buttons:
- **Attach** (paperclip icon) — opens file picker. Accepts: PDF, DOCX, TXT, MP3, M4A, WAV, MBOX. Files up to 500MB (MBOX: no limit).
- **Mic** (microphone icon) — starts voice recording inline (same `VoiceRecorder` component). After recording, shows transcription preview with Save/Discard — same two-step flow as current.
- **Submit** (arrow icon) — processes whatever is in the input

**Platform shortcut pills** below the input (same pattern as Create page):
- **YouTube** — focuses the input with "Paste a YouTube link..." placeholder
- **Instagram** — focuses the input with "Paste an Instagram link..." placeholder
- **Blog** — focuses the input with "Paste a blog URL..." placeholder
- **Gmail Export** — shows brief inline instructions ("Export your Sent folder from Google Takeout, then drag the .mbox file here") and opens the file picker filtered to .mbox

**Drag and drop:** The entire input area accepts file drops. Uses existing `validateFile()` from `file-utils.ts` for type/size validation. Videos rejected with same message ("Use the Clip Finder to process videos").

**Smart detection on submit:**
- Starts with `https://youtube.com` or `https://youtu.be` → YouTube import via `api.kbContent.startSocialImport({ platform: 'youtube', url })`
- Starts with `https://instagram.com` → Instagram import via `api.kbContent.startSocialImport({ platform: 'instagram', url })`
- Starts with `https://` (other) → Blog import via `api.kbContent.startSocialImport({ platform: 'blog', url })`
- File with `.mbox` extension → Route to `processMboxFile()` (NOT regular upload)
- File (PDF/DOCX/TXT/audio) → Upload via `api.files.upload()` with `useFileUpload` hook
- Voice recording blob → `api.kbContent.ingestVoice()` (after preview/confirm)
- Plain text (50+ chars) → `api.kbContent.paste({ text, sourceType: 'text' })`

---

## Critical Import Paths to Preserve

### MBOX Email Import (highest risk)

The MBOX flow has complex client-side processing that MUST be preserved exactly:

1. **Detection**: `isMboxFile()` from `file-utils.ts` — checks `.mbox` extension or filename == 'mbox', accepts `application/mbox`, `application/octet-stream`, `text/plain`
2. **Client-side parsing**: `parseMboxFile()` from `mbox-parser.ts` — reads in 50MB streaming chunks, splits on RFC 5322 "From " separators, handles multipart, base64, quoted-printable decoding
3. **Filtering**: `shouldSkipEmail()` — filters empty, too short (<50 chars), duplicates (content hash), wrong sender
4. **Batch splitting**: API client splits into batches of 10 emails per request to avoid server chunk overflow
5. **Two-phase progress**: Parsing 0-70%, uploading 70-100%
6. **API**: `api.kbContent.ingestParsedEmails()` — 30s timeout per batch, partial success if 50%+ batches complete
7. **No size limit**: MBOX files bypass the 500MB file size limit

**In the unified input:** When a dropped/attached file is detected as MBOX, the `KBUnifiedInput` component calls `processMboxFile()` directly (lifted from `KnowledgeContent.tsx:150-202`). The two-phase progress UI renders inline below the input — same progress bar and status messages as current.

### File Upload

1. **Validation**: `validateFile()` from `file-utils.ts` — PDF, DOCX, DOC, TXT, JPG, PNG, WAV, MP3, WebM, M4A. Max 500MB (no limit for MBOX). Videos rejected.
2. **Queue**: `useFileUpload` hook manages multi-file queue with per-file progress
3. **Upload**: `api.files.upload(kbId, file, onProgress)` — 5-minute timeout, continuous progress via `onUploadProgress`
4. **Progress UI**: Per-file progress bar with status icons (spinner/check/error)

**In the unified input:** Drag-and-drop and attach button both feed files into `useFileUpload` hook. Progress shown inline below the input per-file. MBOX files intercepted before they reach the regular upload queue.

### Voice Recording

1. **Record**: `VoiceRecorder` component — `getUserMedia({ audio: true })`, MediaRecorder with `audio/webm;codecs=opus`, data collected every 100ms
2. **Transcribe**: `api.kbContent.transcribeVoice(blob)` — 60s timeout, returns text
3. **Preview**: User sees transcription, chooses Save or Discard
4. **Save**: `api.kbContent.ingestVoice({ audio, title, knowledgeBaseId })` — 120s timeout, includes re-transcription + embedding

**In the unified input:** Mic button triggers `VoiceRecorder` inline (not a modal). The preview step (transcription → Save/Discard) renders below the input. Same two-step flow preserved.

### Social URL Import (YouTube / Instagram / Blog)

1. **Submit**: `api.kbContent.startSocialImport({ platform, url, knowledgeBaseId })` — returns `jobId`
2. **Poll**: `api.kbContent.getSocialImportStatus(jobId)` — 5s interval, max 60 polls (5 minutes)
3. **OAuth**: If not connected, `api.social.connect(platform)` returns `authUrl` → opens in new window
4. **Status messages**: <12 polls = "This usually takes 1-2 minutes", <36 = "Still processing...", ≥36 = "Almost there..."

**In the unified input:** URL detection on submit triggers `startSocialImport`. Polling + progress messages render inline below the input. If OAuth needed, an inline "Connect YouTube to import" prompt appears with a Connect button (opens new window, same as current).

### Paste Text

1. **Validate**: Min 50 chars, max 500,000 chars
2. **Submit**: `api.kbContent.paste({ text, sourceType: 'text', knowledgeBaseId })` — 15s timeout

**In the unified input:** When the textarea content is plain text (no URL, no file), submit calls `paste()`. Source type defaults to `'text'` — no type selector needed (the backend analyzes content regardless).

---

## Section 3: What Echo Knows

The existing chat interface promoted from the bottom to a prominent section.

**Always visible** (not hidden behind a collapsible). Shows:
- 3 suggestion chips on first visit ("How close is the match?", "Describe my style", "What am I missing?")
- Chat messages after interaction
- Streaming responses via SSE via `api.kb.chat(kbId, query, history)`

Below the chat: a collapsible "Sources (N items)" section using existing `SourcesDrawer` content. Collapsed by default.

---

## What Gets Removed

1. **The 3 input cards** — replaced by unified input
2. **6 separate modals** — all replaced by inline behavior
3. **AskYourVoice.tsx** (714 lines) — action cards + sub-choices. Chat code extracted and kept.
4. **AddContentSection.tsx** (113 lines) — replaced by unified input
5. **SourceCategoryCards.tsx** (200 lines) — replaced by platform pills
6. **Recent Activity log** — absorbed into Sources section

---

## What Gets Kept (no changes)

1. **`mbox-parser.ts`** — client-side MBOX parsing (untouched)
2. **`file-utils.ts`** — `validateFile()`, `isMboxFile()` (untouched)
3. **`useFileUpload` hook** — file queue + upload logic (untouched)
4. **`useKnowledgeBase` hook** — KB fetching + auto-polling (untouched)
5. **`VoiceRecorder` component** — reused inline (untouched)
6. **`SourcesDrawer.tsx`** — content list with filtering/deletion (untouched, used inline)
7. **VoiceIntelligenceDashboard.tsx** — simplified (remove dimension pills)
8. **All `api.kbContent.*` methods** — untouched
9. **All `api.social.*` methods** — untouched
10. **All `api.files.*` methods** — untouched

---

## File Changes

| Action | File | What |
|--------|------|------|
| Rewrite | `src/app/app/knowledge/KnowledgeContent.tsx` | New layout: header + unified input + chat + sources. Lift `processMboxFile()` logic into the new input component. |
| Create | `src/app/app/knowledge/KBUnifiedInput.tsx` | **New** — unified input with smart detection, drag-and-drop, file attach, voice record, platform pills, MBOX handling, URL import polling, inline progress |
| Modify | `src/app/app/knowledge/VoiceIntelligenceDashboard.tsx` | Remove dimension breakdown pills |
| Keep | `src/app/app/knowledge/SourcesDrawer.tsx` | Used as collapsible inline section |
| Keep | `src/lib/mbox-parser.ts` | MBOX parsing (untouched) |
| Keep | `src/lib/file-utils.ts` | File validation (untouched) |
| Keep | `src/hooks/useFileUpload.ts` | Upload queue (untouched) |
| Keep | `src/hooks/useKnowledgeBase.ts` | KB data fetching (untouched) |
| Keep | `src/components/voice-recorder.tsx` | Voice recording (untouched) |
| Delete | `src/app/app/knowledge/AskYourVoice.tsx` | Replaced (chat code extracted) |
| Delete | `src/app/app/knowledge/AddContentSection.tsx` | Replaced |
| Delete | `src/app/app/knowledge/SourceCategoryCards.tsx` | Replaced |

---

## What This Does NOT Include

- Backend changes (all endpoints stay the same)
- New import types (no new sources)
- Voice strength algorithm changes
- OAuth flow changes (still opens new window)
- Changes to mbox-parser.ts, file-utils.ts, or any hooks
- Mobile-specific layout (responsive follows naturally)
