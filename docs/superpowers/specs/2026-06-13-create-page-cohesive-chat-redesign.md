# Create Page Cohesive Chat Redesign (SP1.5)

**Date:** 2026-06-13
**Status:** Design, pending founder review
**Repos:** echome-frontend (primary), echome-platform-v2 (one small advisor change)

## Why

SP1 shipped the adaptive Create surface and the KB advisor backend, but it mounted the new surface ON TOP of the legacy Create page. Result: three competing tile systems, ~6 stacked sections, no shared type scale. The founder critique is structurally correct: "lots of small text, different widths, different sizes, not cohesive."

This is the most important page on the platform. It is the one source of truth and the one content generation path. It must be a single cohesive surface that:
1. Reads as one thing, not six stacked blocks.
2. Leads every user up the voice-match value ladder, not flat equal choices.
3. Routes every ingestion path (voice, video, email, paste, docs, links) AND the advisor through the one Echo pill we already built.

This is an EVOLUTION of SP1, not a new path. No re-architecture of the engine. We re-compose the surface and wire the advisor into the thread.

## Scope

IN:
- Re-compose `/app` resting state into one cohesive chat owned by `EchoHero`.
- Retire/fold the redundant stacked sections into the thread.
- Apply the locked copy (value-ladder, literal action spots).
- Wire the advisor (`api.kb.advisor`) into the chat so coverage, nudges, and proposals render as Echo messages.
- Wire the two TODO(SP1) stubs: `onStartVoice`, `onOpenIngest`.
- Small BE change: advisor ranks gaps by voice-match leverage, not just raw coverage score.

OUT (separate spec cycles, unchanged):
- SP2 long-form video library deferred-ingestion backend. The Stockpile UI default already waits for it. The chat shows the "save to library, clip later" message but the durable backend is SP2.
- SP3 autopilot kit engine.

## Architecture

The Create page resting state (`!hasResults && !generating`) becomes a single column:

```
[ Echo chat thread (EchoHero) ]
   - greeting (casual)
   - pitch (casual, concrete: "fastest way to sound like you is to talk")
   - advisor message: coverage + the value-ladder actions OR the single gap nudge
   - proposal messages (advisor-driven kits) when KB is populated
[ persistent composer: attach + mic + send, literal placeholder + tooltips ]
[ source line ]
```

`EchoHero` (src/components/echo/EchoHero.tsx) is already the inline, always-expanded copilot variant, same `useEcho` engine as the floating pill. It is already the resting hero. We make it own the page and feed advisor data into the thread.

The current sibling blocks in `AppContent.tsx` resting branch are removed or folded:
- `GetStartedChecklist` (line ~439): fold its intent into the advisor ladder message. Remove the separate component from this surface.
- `AdaptiveCreateSurface` (lines ~441-453): its three jobs (coverage, nudge, proposals) move INTO the thread as Echo messages. The standalone card wrapper is retired. Sub-components (`AdvisorNudgeCard`, `AutopilotProposalCard`, `CoverageMeter`, `CapabilityTiles`, `VideoLibraryDrop`) are either re-skinned to render inside a chat bubble or replaced by thread-native message renderers.
- `DraftedForYou` (lines ~454-456): proposals now come from the advisor in-thread. Remove from resting surface.
- `OutcomeChips` (lines ~457-461): replaced by the value-ladder action chips inside the advisor message.
- `GenerationForm`/`EchoHero` (lines ~462-474): EchoHero stays, becomes the spine of the page.

Net: one column, one type scale, one chip system.

## Data Flow

1. Page loads resting state. `EchoHero` mounts expanded (already calls `open()` on mount).
2. New: the surface calls `api.kb.advisor` (GET /api/kb/advisor). The copilot does NOT call this today. This is the key new wire-up.
3. Advisor returns `{state, coverage, nudge{headline, subhead, actions}, proposals}`.
4. The thread renders:
   - `state === 'empty'`: greeting + concrete pitch + the full value ladder as ranked action chips (record voice [default], add video, bring emails, paste writing, published work [dimmed], cold-topic [demoted]).
   - `state === 'thin'`: the single highest-leverage gap nudge as one Echo message + ladder actions.
   - `state === 'rich'`: proposal messages (advisor kits) + a slim coverage line + a "what would sharpen me most" nudge.
5. Action chips map to existing `useEcho` ingestion paths:
   - Record voice -> existing voice path (mic).
   - Add video -> existing video path (`?echoFile=1` / link import).
   - Bring emails -> existing `api.kbContent.ingestParsedEmails` / mbox flow.
   - Paste writing -> existing `api.kbContent.paste`.
   - Published work -> existing files upload / blog import.
   - Cold topic -> existing create text path.
6. `onStartVoice` and `onOpenIngest` stubs (AppContent.tsx ~445-451) get wired to the corresponding `useEcho` triggers instead of TODO no-ops.
7. `onPrefill` stops doing the `?topic=` URL round-trip and calls `EchoHero`'s `setInputText` directly.

## Copy (locked)

Source: copy deck v3, approved 2026-06-13.

Pitch: "The fastest way to sound like you is to talk to me. Two minutes of your voice teaches me more than a stack of documents."

Value ladder (ordered, each is action + what-happens):
1. Record your voice (best way to start). Tap to record, talk for two minutes about your work. I transcribe it and learn how you actually sound. Nothing teaches me faster.
2. Add a video of you talking. Paste a YouTube, Zoom, Loom, or Vimeo link, or upload a file. A podcast, a talk, a webinar. I pull the words and learn from them.
3. Bring your emails. Upload your sent-mail file. Hundreds of things you have already written, in your own words. I learn your voice in bulk.
4. Paste something you wrote. A LinkedIn post, a newsletter, anything in your own words. Paste it in the box below.
5. Add your published work (PDF, blog link). Great for context on what you know. Polished, formal writing shows less of your real voice than talking does, so do this after the steps above.

Demoted cold-topic path: "In a hurry? Just tell me what to post about and I'll draft it. Heads up: I do my best work after you have fed me a few things above, so it sounds like you and not generic AI."

Action-spot tooltips (icon buttons): "Attach a video, PDF, or document" / "Record your voice" / "Send to Echo".

Composer placeholder: "Type here. Paste a link, or use the buttons on the left to attach a video or record your voice."

Source line: "You can paste a link, upload a file, or record your voice. I work with YouTube, Zoom, Loom, and Vimeo links."

Coverage meter label: "How well I know you".

Populated confirms:
- Video to library (SP2): "Got it. Stored in your library. I'll clip the best moments when they're ready, no rush."
- Link/text ingested: "Learned that. I picked up your take on hiring and two product stories."
- Coverage inline: "You're at 58%. Your work and voice are strong now."

Constraint: no em dashes or en dashes anywhere in user-facing copy.

## Backend Change (echome-platform-v2)

Advisor gap ranking. Today the advisor nudges the lowest-strength coverage dimension and always pairs it with a voice action (nudge.ts). Enhancement: rank gaps by voice-match LEVERAGE, so an audio-missing profile (user has only formal/written content) is nudged toward voice ahead of a merely-thin dimension. The retrieval layer already weights conversational content 1.3x; the advisor should reflect that priority in which gap it surfaces first.

Read-only contract of `GET /api/kb/advisor` is unchanged. Only the gap-selection logic inside the nudge service changes. This is not a sensitive path (kb-advisor, not auth/stripe/middleware).

## Components

Create / re-skin (echome-frontend):
- Thread-native renderers for advisor coverage, ladder actions, gap nudge, and proposals (replace the standalone card wrappers). One bubble component, one chip component.
- `EchoHero`: accept advisor data and render the advisor messages in-thread; expose `setInputText` for prefill.

Modify:
- `src/app/app/AppContent.tsx`: remove the stacked sibling blocks from the resting branch; mount the single EchoHero-owned column; wire `onStartVoice`/`onOpenIngest`/`onPrefill`.
- `src/components/echo/useEcho.ts`: add the `api.kb.advisor` call and expose advisor state to the hero; add `setInputText`.
- Advisor sub-components: retire standalone wrappers or convert to in-thread renderers.

Backend:
- `src/services/kb-advisor/nudge.ts` (and coverage.ts if needed): gap leverage ranking.

## Testing

FE (Vitest):
- Advisor empty/thin/rich states each render the correct thread messages.
- Value-ladder actions appear in priority order; cold-topic is demoted (not a peer chip).
- Each ladder action triggers the correct `useEcho` ingestion path.
- `onStartVoice`/`onOpenIngest` invoke real triggers, not no-ops.
- `onPrefill` sets input text without a URL round-trip.
- Copy strings match the locked deck; assert no em/en dashes in rendered copy.
- Legacy stacked blocks no longer render in the resting branch.

BE (existing advisor test suite):
- Gap ranking: audio-missing profile surfaces voice gap ahead of a thin non-voice dimension.
- Existing advisor contract tests still pass (response shape unchanged).

## Rollout

develop -> staging smoke -> founder soak -> main. Do not push main autonomously. Staging has no real KB data, so empty-state is the only live-testable branch on staging; thin/rich validated by unit tests and on prod after main (known staging gap).
