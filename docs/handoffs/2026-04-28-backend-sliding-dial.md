# Backend Handoff #2 — Wire the sliding influence dial

> Couples `MIN_SAMPLES_FOR_ANALYSIS` floor + source-count-aware prompt grammar. **Required** to make today's frontend `MIN_CONTENT_ITEMS = 0` (commit `7d1af4a`) ship coherent output.

> **Hand-off note for the backend Claude**: read everything below the divider as a self-contained spec. Verify diagnoses with verbatim citations before changing code.

---

## Context

Frontend just shipped `MIN_CONTENT_ITEMS = 0` (commit `7d1af4a`) — the onboarding 3-source gate is gone. But the backend still gives up at 3 samples (`voice-analyzer.ts:35: MIN_SAMPLES_FOR_ANALYSIS = 3`) and the generation prompt grammar **does not vary** with source count. Result today: a user with 0-2 sources hits Claude with a system prompt that says *"YOUR #1 PRIORITY: The voice signature provided below takes precedence over everything else"* — but no voice signature is provided. Incoherent instructions, mediocre output.

This task: make the dial real on the backend so the frontend can honestly display it.

## Verify diagnosis first (don't change code yet)

1. Read `src/services/voice/voice-analyzer.ts:134-139` — confirm `getVoiceProfile()` returns `null` when `samples.length < MIN_SAMPLES_FOR_ANALYSIS`.
2. Read `src/services/generation/generator.ts` lines around 386-388 and 899 — confirm `analyzedProfile = null` skips voice consistency scoring + retry pipeline.
3. Read `src/services/generation/core-prompt-system.ts:1081-1223` (`buildUnifiedPrompt`) — confirm the system prompt's "voice signature takes precedence" statement is unconditional, even when no voice signature is being injected.
4. Check `src/routes/voice.ts` (the `/api/voice/strength` handler around line 287-453) — confirm `overallStrength` is computed from `completenessScore`, `centroidConfidence`, `avgVoiceScore`, `embComponent`. We need this score to drive prompt-mode selection.

If any of this differs from the description, **stop and report what's actually true** before proceeding.

## The change

### Step 1 — Lower the analysis threshold

In `voice-analyzer.ts:35`: change `MIN_SAMPLES_FOR_ANALYSIS = 3` to `MIN_SAMPLES_FOR_ANALYSIS = 1`. With 1+ samples we have a meaningful (if noisy) profile. With 0 we still return `null` — generation falls through to "limited context" mode (Step 2).

Update the warning log at line 134-139 to reflect that 1 is the new floor and add a notice that <3 samples produces a low-confidence profile.

### Step 2 — Add three prompt modes to `core-prompt-system.ts:buildUnifiedPrompt`

Introduce a `voiceMode` derived from source count + voice strength:

```ts
type VoiceMode = 'limited' | 'learning' | 'locked';

function deriveVoiceMode(opts: {
  sourceCount: number;
  voiceStrength: number; // 0-100 from /api/voice/strength
}): VoiceMode {
  if (opts.sourceCount === 0 || opts.voiceStrength < 25) return 'limited';
  if (opts.voiceStrength < 75) return 'learning';
  return 'locked';
}
```

In `buildUnifiedPrompt`, the system prompt's voice mandate should vary by mode:

- **`limited`**: prepend `"You're working with very limited context about this user. Approximate their voice as best you can from any samples below; don't overcommit to specific phrasings. Aim for category-typical content (e.g., real estate professional) with neutral first-person voice. The user expects a starting point they can refine, not a perfect match."`
- **`learning`**: prepend `"You have a partial voice profile for this user. Lean on the voice signature and samples below; for anything they're not covered, default to clean professional first-person rather than inventing characterization."`
- **`locked`** (current behavior, no prepend): keep the existing "voice signature takes precedence over everything else."

### Step 3 — Plumb `voiceMode` into the generation pipeline

Wherever `buildUnifiedPrompt` is called from `generator.ts`, compute `voiceMode` from:
- `sourceCount` = `kbContentCount` from `voice_profiles.metadata` (or live count from `kb_content`)
- `voiceStrength` = call the same logic that `/api/voice/strength` uses (refactor that score computation into a reusable function if it isn't already)

Pass `voiceMode` to `buildUnifiedPrompt` and use it inside `buildCoreSystemPrompt` to vary the mandate.

### Step 4 — Persist the voice mode used per generation

In `generator.ts:1300-1321` where per-platform `generated_content` rows are inserted, add `voice_mode` to the metadata. Useful for observability and for the frontend dial to display "this was generated in 'learning' mode" if helpful.

### Step 5 — Expose the mode + boundary thresholds in `/api/voice/strength`

Extend the response with:
```json
{
  "overallStrength": 47,
  "tier": "Growing",
  "voiceMode": "learning",
  "thresholds": { "limited": 25, "learning": 75 }
}
```
So the frontend dial can show the breakpoints.

## What NOT to change in this PR

- **No changes to retrieval logic** — the existing `voice-sample-service.ts` / `retrieval.ts` work is fine; the dial only changes the prompt mandate and the threshold for profile-build.
- **No `VOICE_EMBEDDING_WEIGHT` change** — that's intentionally observe-only per `934fc2a`; revisit separately.
- **No frontend work** — frontend will consume the new `voiceMode` field in a follow-up.

## Testing

1. Run a generation for a user with 0 sources — confirm `limited` mode is selected, system prompt prepend is present, output is coherent (not generic AI slop, not pretending to know a voice it doesn't have).
2. Run a generation for a user with 5 sources, voice strength ~40 — confirm `learning` mode.
3. Run a generation for a user with 30+ sources, voice strength 80+ — confirm `locked` mode (current behavior).
4. Verify `/api/voice/strength` response includes the new fields.
5. Existing test suite still green.

## Commit message

```
feat(voice): source-count-aware prompt grammar + lower MIN_SAMPLES floor

Make the sliding influence dial real on the backend. Three voice modes
(limited / learning / locked) selected by source count + voice strength,
each with its own system-prompt mandate. With 0 sources Claude no longer
gets "voice signature takes precedence" while seeing no voice signature.

- voice-analyzer.ts: MIN_SAMPLES_FOR_ANALYSIS 3 → 1; voice profile builds
  from a single sample (low confidence flagged in metadata).
- core-prompt-system.ts: deriveVoiceMode + per-mode system-prompt prepend
  in buildCoreSystemPrompt.
- generator.ts: plumb voiceMode through; persist in generated_content.metadata.
- routes/voice.ts: /api/voice/strength now returns voiceMode + thresholds
  so the frontend dial can display them.
```

## Pre-merge checklist

- [ ] Diagnosis verified with file:line citations
- [ ] `MIN_SAMPLES_FOR_ANALYSIS = 1` and warning log reflects the new floor
- [ ] Three voice modes wired into `buildUnifiedPrompt`
- [ ] `voiceMode` plumbed end-to-end through generator
- [ ] `/api/voice/strength` exposes `voiceMode` + `thresholds`
- [ ] `generated_content.metadata.voice_mode` populated per row
- [ ] Manual test of all three modes passes coherence check
- [ ] Existing tests green
