# Create-page Empty State = "Teach Echo your voice" — Design

**Date:** 2026-06-15
**Status:** Approved (founder), pending spec review
**Repo:** echome-frontend (FE only; no backend changes)

## Problem

The Create-page empty state is 34.9% of users (121/347 prod census, 2026-06-15).
Today it renders a single sentence (`PITCH`) that conflates two distinct jobs:

- **Job A** — build the voice profile: study *how the user communicates* across
  situations (sent email, blogs, posts, IG/YT scrape, voice notes, WBTW). Output =
  KB chunks → `voice_profiles`.
- **Job B** — make content: clip a video, write a post, schedule it.

The empty state's job is **Job A only**. The current copy ("talk to me… two minutes
of your voice teaches me more than a stack of documents") leans Job-B/voice-note and
buries the higher-quality written signals. That conflation is the user confusion the
founder flagged.

**Fix:** the empty state surfaces the ingest menu that *already exists* on `/app/voice`
(`KBUnifiedInput`), under a Job-A heading. Reuse, do not rebuild. The composer (Job B)
stays below, unchanged.

## Principles / constraints

- **Voice = written signal.** Ranking: written email/blogs/posts > scrape (YT/IG) >
  voice note (fast on-ramp, spoken-transcribed = weaker written signal). Never claim
  clips "sound like you" in Job-A surfaces.
- **User-facing name = "your voice"**, never "knowledge base".
- **No em/en dashes** in user-facing copy.
- **Do NOT touch scrape plumbing** (SociaVault / Apify / Tavily). `KBUnifiedInput`
  already calls these; we mount the component, not its internals.
- Reuse existing components and handlers. Minimal new surface area.

## What changes (3 files)

### 1. `src/components/create/AdvisorThread.tsx` — empty branch

Replace the lone `PITCH` paragraph in the `advisor.state === 'empty'` branch with:

- Heading: **"Teach Echo your voice"**
- Subhead: **"Echo learns how you write from what you share. The more you give it, the more every post sounds like you."**
- `<KBUnifiedInput knowledgeBaseId={kbId} onImportComplete={onImportComplete} />`

`KBUnifiedInput` carries its own placeholder + helper line listing the full menu
(YouTube links · Instagram profiles · blog URLs · PDFs · text you wrote · voice
recordings · Gmail exports). No need to duplicate that copy in AdvisorThread.

New props on `AdvisorThread`:

```ts
interface AdvisorThreadProps {
  advisor: AdvisorResponse;
  onNudgeAction: (action: NudgeAction) => void;
  onProposalSelect: (proposal: Proposal) => void;
  kbId: string | null;            // NEW
  onImportComplete: () => void;   // NEW
}
```

Null-kbId window: `useKnowledgeBase` auto-creates + auto-selects a default KB, but
that is async. On first paint `kbId` may be null for a beat. The empty branch renders
a quiet stub ("Setting up your voice...") while `kbId == null`, then swaps to
`KBUnifiedInput` once it resolves. This avoids `KBUnifiedInput`'s "No knowledge base
selected" toast firing on the transient null.

`PITCH` export is removed (no longer used). Thin and rich branches unchanged.

### 2. `src/components/echo/EchoHero.tsx` — owns the plumbing

- Add `const { selectedKb } = useKnowledgeBase();` (no args → default KB resolves).
- `const { advisor, refetch } = useAdvisor();` (refetch is new — see #3).
- Pass `kbId={selectedKb}` and `onImportComplete={refetch}` to `<AdvisorThread />`.
- Empty-state static h1/subhead shift from Job B to Job A:
  - h1: **"Teach Echo to write in your voice."**
  - sub: **"Share how you already communicate. Echo learns your voice from it. Then it writes posts that sound like you."**
  - (Gating unchanged: shown only when `!advisor || advisor.state === 'empty'`.)
- Composer + bottom toolbar + source helper line below: **unchanged** (Job B path).

### 3. `src/components/echo/useAdvisor.ts` — add refetch

Extract the mount fetch into a `useCallback` and expose it:

```ts
return { advisor, loading, error, refetch };
```

`onImportComplete` → `refetch` flips empty → thin/rich in place after a successful
import. No navigation, menu stays available for more signals.

## Data flow

```
EchoHero
  ├─ useKnowledgeBase() ──► selectedKb (auto-created/selected default KB)
  ├─ useAdvisor() ────────► { advisor, refetch }
  └─ <AdvisorThread kbId={selectedKb} onImportComplete={refetch} ... />
        └─ empty branch ──► <KBUnifiedInput knowledgeBaseId={kbId}
                                            onImportComplete={onImportComplete} />
              user pastes/drops/records/scrapes
                 └─ existing api.kbContent.* calls (SociaVault etc, untouched)
                       └─ onImportComplete() → refetch() → advisor state advances
```

## Job A vs Job B separation (the core fix)

- **Empty state (top) = Job A.** "Teach Echo your voice" + ingest menu. No clip CTA up top.
- **Composer (below, always) = Job B.** "Paste a link, drop a video" — make content.

## What we do NOT touch

- SociaVault / Apify / Tavily scrape plumbing (read-only).
- Thin / rich AdvisorThread branches.
- Composer, mic, file-attach, drag-drop in EchoHero.
- `useKnowledgeBase` internals.

## Testing

- **AdvisorThread.test.tsx**: empty-branch tests rewritten — mock `KBUnifiedInput`,
  assert heading "Teach Echo your voice" + mounted menu (and that it receives `kbId`
  / `onImportComplete`); assert the null-kbId stub renders when `kbId == null`. Remove
  `PITCH` assertions. Thin/rich tests unchanged.
- **EchoHero.advisor.test.tsx**: mock `useKnowledgeBase` → `{ selectedKb: 'kb1' }`;
  assert AdvisorThread receives `kbId` and that `onImportComplete` calls advisor refetch.
- **useAdvisor**: new test — `refetch()` re-hits `api.kb.advisor()`.

## Release path

develop → staging smoke → founder soak → main. Not pushing main autonomously.

## Out of scope (follow-ups)

- WBTW funnel investigation (48.1% never run it) — second phase of "Both, empty-state first".
- SP2 deferred video library / SP3 autopilot engine.
