# Clip Auto-Clean at Creation + Scoped Descript Roles — Design

**Date:** 2026-06-18
**Status:** Draft for review
**Author:** Ara + Claude (brainstorming session)
**Repos touched:** `echome-frontend` (this repo) + EchoMe backend (Railway) — most of Phase 1 is backend.

---

## 1. Problem

Users' #1 recurring complaint is wanting to "make slight changes to the outputs." Our only video output is the **captioned clip**. We explored bolting Descript's AI editor onto clips (a chat pill) and rejected it: nudging a caption through a 60-90s async Descript round-trip is strictly worse than our existing instant, precise FFmpeg caption editor.

The investigation reframed the real opportunity:

- The genuinely valuable, always-wanted edit is **removing filler words and dead pauses** — making raw talking-head footage not sound amateur.
- We already hold the data to do that ourselves, instantly and for free.
- Descript's real niche is much narrower than "video editing": the things word-timestamps **can't** give us — audio enhancement (Studio Sound) and AI highlight selection.

## 2. Guiding principle

```
INSTANT + PRECISE      → our own pipeline   (captions, filler/pause removal — we have the data)
WORTH-THE-WAIT (heavy) → Descript           (audio DSP, AI highlight cut-downs)
```

If an edit is almost-always-wanted and not a creative judgment, it is a **default at creation**, not a button.

## 3. Verified facts (this session — not assumptions)

- **Word-level transcripts are present in production.** `GET /api/clips` returns `transcriptSegments[].words[]` with `{word, start, end, confidence}` per word (Deepgram). Confirmed live on real uploads (e.g. `{word:"i'll", start:108.69, end:108.93, confidence:0.85}`). Type: `TranscriptSegment` at `src/lib/api-client.ts:4880`.
- **Captions are SRT-based, segment-level.** `parseSRT()` returns `words: []` — *"SRT doesn't have word-level timing"* (`src/lib/caption-parser.ts:83`). Word-level data rides on `transcriptSegments`, not the SRT.
- **Descript export is real and GA.** Live end-to-end test against the production Descript token (`DESCRIPT_API_KEY`, Railway): `import → agent → publish` returned a signed `download_url` → HEAD `200`, `content-type: video/mp4`, 25 MB. Agent edit ("remove filler + captions") applied successfully (9 AI credits). This was the May-2026 blocker; it is resolved.

## 4. Phase 1 — In-house Auto-Clean at clip creation (the build)

### 4.1 What it does
During clip processing, automatically remove obvious filler words and over-long silences from each generated clip, then regenerate that clip's captions from the trimmed transcript. The user does nothing; clips are simply born cleaner.

### 4.2 Where it runs
**Backend (Railway) clip-processing pipeline.** Today: `upload → transcribing → analyzing → extracting → captioning → generating`. The auto-clean step slots in **after word-level transcription, before/within clip extraction + SRT generation**, so the cut and the captions are derived from the same trimmed timeline.

### 4.3 Algorithm (deterministic, no AI call)
Inputs: `transcriptSegments[].words[]` (word, start, end, confidence).
1. **Filler detection** — match a conservative lexicon (`um, uh, er, ah, hmm, mm`) as standalone words; optionally flag very-low-confidence single-syllable disfluencies. (Conservative by default — see open decisions for "like / you know".)
2. **Silence detection** — any gap where `nextWord.start - word.end > PAUSE_MAX` (default `0.7s`) is trimmed down to `PAUSE_KEEP` (default `0.25s`).
3. **Build cut list** — merge adjacent cut ranges; never cut across a sentence boundary mid-word.
4. **Apply cut** — FFmpeg removes the time ranges from the clip media (concat of kept segments).
5. **Rebuild timeline** — shift remaining `words[]` to the new timeline; regenerate the SRT/segments from the trimmed words.
6. **Caption sync is preserved by construction** — captions come from the same trimmed word array, so they line up. No re-transcription needed.

### 4.4 Non-destructive
Keep the **original** clip media + transcript. Store the cleaned version alongside (e.g. `clip.cleanedUrl` + `clip.autoCleanApplied: boolean` + `clip.cleanReport: { fillerRemoved, pausesTrimmed, secondsSaved }`). User can **Restore original** in the clip editor. This protects against over-aggressive cuts and makes the feature reversible.

### 4.5 Frontend changes (this repo — minimal)
- **Clip editor (`ClipEditorModal`)**: a small, honest line — *"Auto-cleaned: removed N filler words, trimmed M pauses (-Xs)"* — plus a **Restore original** / **Re-clean** control. Reads `cleanReport`.
- **Settings (optional)**: a single toggle *"Auto-clean my clips"* (default ON), and a sensitivity choice (Light / Standard) if we expose it.
- **Types**: extend `VideoClip` with `cleanedUrl?`, `autoCleanApplied?`, `cleanReport?` in `src/lib/api-client.ts` / `src/types`.
- No new pipeline, no chat, no Descript call in Phase 1.

### 4.6 Cross-repo split
| Concern | Owner |
|---|---|
| Filler/silence detection, FFmpeg cut, SRT regen, storage | **Backend (Railway)** |
| `cleanReport` contract, clip-editor surfacing, Restore/Re-clean, settings toggle, types | **Frontend (this repo)** |

## 5. Phase 2 — Descript for audio enhancement + AI highlights (documented, NOT built now)

Reserved, narrowly, for what we can't derive from timestamps. Built on the verified `import → agent → publish` spine.

- **Studio Sound / audio cleanup** and **AI highlight cut-down** — run **upstream on the raw uploaded video** (where a minute's wait is obviously worth it), or as an explicit, clearly-async action — never as a fake-instant button on a finished caption.
- **Gating:** Studio+ (controls per-job AI-credit cost; aligns with current entitlement direction).
- **Caption ownership:** for any Descript-touched media, captions are re-derived by our pipeline afterward (Descript does content/audio only; we keep caption styling). Or, if Descript adds captions, they are stripped/ignored in favor of ours.
- This phase gets its **own** spec before any build.

## 6. Non-goals (explicit)
- ❌ Chat pill / conversational editor on clips.
- ❌ Descript for caption styling or positioning (our editor wins — instant + precise).
- ❌ Descript for filler removal (we own the word data; doing it via Descript is slower, costs credits, and desyncs captions).
- ❌ A manual timeline editor (not available via Descript API; only via app handoff).

## 7. Cleanup (do alongside Phase 1)
Retire the crashing admin **Descript Studio** surface — it currently throws into an error boundary at `/app/descript` and serves no user. Remove `src/app/app/descript/` + the nav entry (`src/hooks/useAppNavigation.ts:92`) + the now-unused `api.descript.*` methods/types (`src/lib/api-client.ts:4079-4110`, `5006-5046`). The backend project/job model can be reused later for Phase 2.

## 8. Risks
- **Over-aggressive cuts** → mitigated by conservative defaults, non-destructive original, Restore control, and `cleanReport` transparency.
- **Word-timestamp gaps** (Deepgram leaves small gaps) → cut on silence *thresholds*, not raw gaps; never trim below `PAUSE_KEEP`.
- **Cross-repo coordination** → backend must land the cut + `cleanReport` contract before the frontend surfacing is meaningful; frontend can ship behind the contract.

## 9. Open decisions to confirm (in spec review)
1. **Default ON for everyone**, or gated / opt-in? (Recommend: ON for all, it's baseline polish.)
2. **Aggressiveness**: include `like` / `you know` as filler, or only `um/uh/er/ah`? (Recommend: only the safe set v1; "Standard vs Light" toggle later.)
3. **`PAUSE_MAX` / `PAUSE_KEEP`** defaults — `0.7s` / `0.25s` reasonable? Tune on real clips.
4. **Restore granularity** — restore whole clip only, or per-cut undo? (Recommend: whole-clip restore v1.)
5. Surface the `cleanReport` to users at all, or keep it silent? (Recommend: show it briefly — builds trust, "we made it better".)

## 10. Verification already completed
- Word-level transcript presence — confirmed against live prod `GET /api/clips`.
- Descript `import → agent → publish → download_url` — confirmed live (HEAD 200, video/mp4, 25MB).
- These de-risk the factual assumptions behind both phases.
