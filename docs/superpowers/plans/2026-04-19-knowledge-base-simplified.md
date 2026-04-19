# Knowledge Base Simplified — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-card + 6-modal Knowledge Base input with a single unified input that accepts files, links, voice, and text — same pattern as the Create page.

**Architecture:** New `KBUnifiedInput` component handles all input types with smart detection. `KnowledgeContent.tsx` is rewritten as a thin layout: header + unified input + chat + sources. All import logic (MBOX parsing, file upload, URL polling, voice recording) uses the exact same hooks and API calls — only the UI wrapper changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing hooks (`useFileUpload`, `useKnowledgeBase`, `useVoiceStrength`), existing utilities (`mbox-parser.ts`, `file-utils.ts`)

**Critical constraint:** Zero changes to `mbox-parser.ts`, `file-utils.ts`, `useFileUpload.ts`, `useKnowledgeBase.ts`, `voice-recorder.tsx`, or any `api.*` methods.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/app/app/knowledge/KBUnifiedInput.tsx` | **New** — unified input with drag-drop, file attach, voice record, URL detection, MBOX handling, platform pills, inline progress |
| Create | `src/app/app/knowledge/KBChat.tsx` | **New** — extracted chat interface ("What Echo knows") from AskYourVoice.tsx |
| Rewrite | `src/app/app/knowledge/KnowledgeContent.tsx` | Thin layout: header + KBUnifiedInput + KBChat + SourcesDrawer |
| Modify | `src/app/app/knowledge/VoiceIntelligenceDashboard.tsx` | Remove dimension breakdown pills |

**Untouched (verified in audit):**
- `src/lib/mbox-parser.ts`, `src/lib/file-utils.ts`
- `src/hooks/useFileUpload.ts`, `src/hooks/useKnowledgeBase.ts`
- `src/components/voice-recorder.tsx`
- `src/app/app/knowledge/SourcesDrawer.tsx`
- All `api.kbContent.*`, `api.social.*`, `api.files.*` methods

---

### Task 1: Create KBUnifiedInput component

**Files:**
- Create: `src/app/app/knowledge/KBUnifiedInput.tsx`

This is the core component. It must handle ALL import types inline without modals.

- [ ] **Step 1: Create the component file**

The subagent should read the following files first to understand the import APIs and patterns:
- `src/app/app/knowledge/KnowledgeContent.tsx` (lines 1-210) — for `processMboxFile()` logic, file upload handling
- `src/components/voice-recorder.tsx` — for VoiceRecorder props and usage
- `src/lib/file-utils.ts` — for `validateFile()` and `isMboxFile()`
- `src/lib/api-client.ts` — search for `kbContent.paste`, `kbContent.startSocialImport`, `kbContent.getSocialImportStatus`, `social.connect`, `social.getStatus`

Then create `src/app/app/knowledge/KBUnifiedInput.tsx` with:

**Props:**
```typescript
interface KBUnifiedInputProps {
  knowledgeBaseId: string | null;
  onImportComplete: () => void; // Triggers KB refresh + voice strength refresh
}
```

**State:**
```typescript
const [text, setText] = useState('');
const [activeHint, setActiveHint] = useState<string | null>(null); // 'youtube' | 'instagram' | 'blog' | 'gmail'
const [recording, setRecording] = useState(false);
const [importing, setImporting] = useState(false);
const [importStatus, setImportStatus] = useState<string>('');
const [importProgress, setImportProgress] = useState(0);
// MBOX state
const [mboxUploading, setMboxUploading] = useState(false);
const [mboxProgress, setMboxProgress] = useState(0);
const [mboxStatus, setMboxStatus] = useState('');
```

**Layout structure:**
```
<div> (container with drag-drop zone)
  <div> (input area with border, rounded)
    <textarea placeholder="Drop a file, paste a link, or record your voice..." />
    <div> (toolbar row)
      <input type="file" hidden ref />
      <button> attach (paperclip) </button>
      <button> mic </button>
      <button> submit (arrow) </button>
    </div>
  </div>
  <div> (platform pills row)
    YouTube · Instagram · Blog · Gmail Export
  </div>
  {/* Inline progress area */}
  {importing && <ImportProgress status={importStatus} />}
  {mboxUploading && <MboxProgressInline progress={mboxProgress} status={mboxStatus} />}
  {recording && <VoiceRecorder inline ... />}
  {/* File upload progress */}
  {uploadFiles.length > 0 && <FileList files={uploadFiles} onRemove={removeFile} />}
</div>
```

**Smart detection on submit (`handleSubmit`):**
```typescript
const handleSubmit = async () => {
  const trimmed = text.trim();
  if (!trimmed) return;

  // URL detection
  const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(normalized)) {
    return handleUrlImport('youtube', normalized);
  }
  if (/^https?:\/\/(www\.)?instagram\.com/i.test(normalized)) {
    return handleUrlImport('instagram', normalized);
  }
  if (/^https?:\/\//i.test(normalized) && trimmed.includes('.')) {
    return handleUrlImport('blog', normalized);
  }

  // Plain text paste (50+ chars)
  if (trimmed.length >= 50) {
    return handlePasteText(trimmed);
  }

  // Too short
  toast.info('Enter at least 50 characters, or paste a URL');
};
```

**`handleUrlImport(platform, url)` — uses `startSocialImport` + polling:**
```typescript
const handleUrlImport = async (platform: string, url: string) => {
  setImporting(true);
  setImportStatus(`Importing from ${platform}...`);
  setText('');
  try {
    const res = await api.kbContent.startSocialImport({
      platform, url, knowledgeBaseId: knowledgeBaseId ?? undefined,
    });
    const jobId = res.jobId;
    // Poll with 5s interval, max 60
    let polls = 0;
    const poll = setInterval(async () => {
      polls++;
      try {
        const status = await api.kbContent.getSocialImportStatus(jobId);
        if (status.status === 'completed') {
          clearInterval(poll);
          setImporting(false);
          setImportStatus('');
          toast.success(`Imported ${status.contentCount || ''} items from ${platform}`);
          onImportComplete();
        } else if (status.status === 'failed') {
          clearInterval(poll);
          setImporting(false);
          toast.error(status.message || 'Import failed');
        } else {
          setImportStatus(
            polls < 12 ? 'This usually takes 1-2 minutes...'
              : polls < 36 ? 'Still processing...'
              : 'Almost there...'
          );
        }
      } catch { /* continue polling */ }
      if (polls >= 60) {
        clearInterval(poll);
        setImporting(false);
        toast.error('Import timed out. Check Sources for partial results.');
      }
    }, 5000);
  } catch (err) {
    setImporting(false);
    toast.error(`Failed to start import: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
```

**`handlePasteText(text)` — uses `api.kbContent.paste`:**
```typescript
const handlePasteText = async (content: string) => {
  setImporting(true);
  setImportStatus('Saving...');
  setText('');
  try {
    await api.kbContent.paste({
      text: content,
      sourceType: 'text',
      knowledgeBaseId: knowledgeBaseId ?? undefined,
    });
    setImporting(false);
    toast.success('Content saved');
    onImportComplete();
  } catch (err) {
    setImporting(false);
    toast.error('Failed to save content');
  }
};
```

**File handling (`handleFilesSelected`):**
```typescript
const handleFilesSelected = async (files: File[]) => {
  const mboxFiles = files.filter(f => isMboxFile(f));
  const otherFiles = files.filter(f => !isMboxFile(f));

  // Route MBOX files to processMboxFile
  for (const file of mboxFiles) {
    await processMboxFile(file);
  }

  // Queue other files via useFileUpload hook
  if (otherFiles.length > 0) {
    addFiles(otherFiles);
    if (knowledgeBaseId) {
      await doUpload(knowledgeBaseId);
      onImportComplete();
    }
  }
};
```

**`processMboxFile(file)` — lifted EXACTLY from `KnowledgeContent.tsx:151-202`:**
This function MUST be copied verbatim. It uses `parseMboxFile()` from `mbox-parser.ts` with the same options, same progress callbacks, same batch upload via `api.kbContent.ingestParsedEmails()`. The only change is calling `onImportComplete()` instead of `refresh()` + `refreshVoiceStrength()`.

**Voice recording:** Mic button toggles `recording` state. When true, render `<VoiceRecorder>` inline below the input (not a modal) with `onSaved` callback that calls `onImportComplete()`.

**Drag and drop:** The outer container has `onDragOver`, `onDrop` handlers. Dropped files go through `handleFilesSelected`. Visual drag indicator (dashed border highlight).

**Platform pills:** Four buttons below the input. Clicking sets `activeHint` which changes the textarea placeholder (e.g., "Paste a YouTube link...") and focuses the textarea. Gmail pill opens the file picker filtered to `.mbox`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/app/knowledge/KBUnifiedInput.tsx
git commit -m "feat: create KBUnifiedInput — unified import for all KB content types"
```

---

### Task 2: Extract chat interface into KBChat component

**Files:**
- Create: `src/app/app/knowledge/KBChat.tsx`

- [ ] **Step 1: Create the chat component**

Read `src/app/app/knowledge/components/AskYourVoice.tsx` lines 429-462 for the chat logic and lines 618-709 for the chat UI.

Extract into a standalone component:

**Props:**
```typescript
interface KBChatProps {
  kbId: string | null;
  hasContent: boolean;
}
```

**Features to include:**
- `echoMessages` state array `{ role: 'user' | 'assistant'; content: string }[]`
- `echoInput` text state
- `echoLoading` boolean
- `sendEchoMessage(query?)` function — calls `api.kb.chat(kbId, text, history)` or `api.help.chat(text, history)`, parses SSE response lines, appends to messages
- 3 suggestion chips when no messages: "How close is the match?", "Describe my style", "What am I missing?"
- Message display: user bubbles (right, accent bg) / assistant bubbles (left, secondary bg)
- Input field with submit button
- Clear conversation button
- Only render suggestion chips when `hasContent === true`

**SSE parsing logic** (copy from AskYourVoice.tsx lines 442-461):
```typescript
const rawResponse = kbId ? await api.kb.chat(kbId, text, history) : await api.help.chat(text, history);
let fullContent = '';
for (const line of rawResponse.split('\n')) {
  if (line.startsWith('data: ')) {
    const payload = line.slice(6);
    if (payload === '[DONE]') break;
    try {
      const parsed = JSON.parse(payload);
      if (parsed.type === 'done') break;
      if (parsed.type === 'error') { fullContent = parsed.message || 'Something went wrong.'; break; }
      if (parsed.content) fullContent += parsed.content;
      if (parsed.text) fullContent += parsed.text;
    } catch { if (payload && payload !== '[DONE]') fullContent += payload; }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/app/knowledge/KBChat.tsx
git commit -m "feat: extract KBChat component from AskYourVoice"
```

---

### Task 3: Simplify VoiceIntelligenceDashboard

**Files:**
- Modify: `src/app/app/knowledge/VoiceIntelligenceDashboard.tsx`

- [ ] **Step 1: Remove dimension breakdown pills**

Read the file (184 lines). Find the section that renders the 5 dimension pills (signaturePresence, avoidAbsence, styleAlignment, aiBlacklistAbsence, embeddingSimilarity). Remove that section. Keep:
- Overall score display (number + tier badge)
- Waveform visualization
- Contextual guidance message

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/app/knowledge/VoiceIntelligenceDashboard.tsx
git commit -m "fix: remove dimension breakdown pills from voice strength meter"
```

---

### Task 4: Rewrite KnowledgeContent as thin layout

**Files:**
- Rewrite: `src/app/app/knowledge/KnowledgeContent.tsx`

- [ ] **Step 1: Rewrite the page component**

Read the current file (493 lines) to understand the hooks and state it uses. Then rewrite it as a thin layout (~150 lines) that wires together the new components.

**Imports:**
```typescript
import { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { useVoiceContext } from '@/contexts/voice-context';
import { VoiceWaveform } from '@/components/voice-waveform';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { KBUnifiedInput } from './KBUnifiedInput';
import { KBChat } from './KBChat';
import { SourcesDrawer } from './components/SourcesDrawer';
import { Sprout, TrendingUp, Zap, Star, ChevronRight, type LucideIcon } from 'lucide-react';
```

**Layout:**
```
<div className="container mx-auto px-6 py-8 max-w-4xl">
  {/* Upgrade banner (free users) */}

  {/* Header: title + voice strength */}
  <div>
    <h1>Build Your Voice</h1>
    <div> tier badge + score + waveform </div>
    <p> strength message </p>
  </div>

  {/* Unified Input */}
  <KBUnifiedInput
    knowledgeBaseId={selectedKb}
    onImportComplete={() => { refresh(); refreshVoiceStrength(); }}
  />

  {/* Chat: What Echo Knows */}
  <KBChat kbId={selectedKb} hasContent={contentItems.length > 0} />

  {/* Sources (collapsible) */}
  <section>
    <button onClick toggle> Sources ({totalItems}) ▸ </button>
    {expanded && <SourcesDrawer ... />}
  </section>
</div>
```

**Keep from current file:**
- `TIERS` array and `getStrengthTier()` helper (lines 31-43)
- `getStrengthMessage()` helper (lines 45-50)
- `useKnowledgeBase()` hook usage
- `useVoiceStrength()` hook usage
- `useVoiceContext()` for teams

**Delete from current file:**
- All modal state (`showUploadModal`, `showVoiceModal`, `showSocialModal`, etc.)
- `handleOpenModal` callback
- `handleUpload` function
- `processMboxFile` function (moved to KBUnifiedInput)
- `handleMboxUpload` function
- All modal JSX (PasteContentModal, SocialImportModal, BlogImportModal, etc.)
- MBOX instructions modal
- File upload modal
- AskYourVoice component reference

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit and push**

```bash
git add src/app/app/knowledge/KnowledgeContent.tsx
git commit -m "feat: rewrite KnowledgeContent as thin layout with unified input"
git push
```
