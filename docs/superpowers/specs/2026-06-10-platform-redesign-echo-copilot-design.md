# EchoMe Platform Redesign: Echo Copilot + Design Elevation

**Date:** 2026-06-10
**Status:** Approved pending final review
**Scope:** Post-login platform UI (the authenticated app). Marketing site out of scope.

## Context & Goals

Two goals, sequenced as two passes with accepted overlap:

1. **Elevate the look from generic to special.** The current app reads as a competent AI-generated SaaS: Electric Cyan sprayed as both primary and accent, secondary purple/pink/yellow accents, a single typeface doing every job, flat equal-weight panels. "Special" means the creativity typical AI-generated sites lack — achieved by method, not by borrowing any other product's style. EchoMe branding (Electric Cyan #00D4FF, Satoshi, dark theme) is maintained throughout.
2. **Simplify toward low UI by unifying intake.** WBTW validated that the voice profile (Knowledge Base / "Your Voice") is the core source of truth for all generated output. Today there are at least four places to feed the system: the Create generation form, the KB upload section, the KB chat, and Ask Your Voice. These collapse into one conversational intake.

### Method extracted from prior redesigns (Closr, BottleneckLabs)

These are the principles that produced those outcomes; we apply the principles, not the palettes:

1. Design serves a thesis, not decoration. EchoMe's thesis: **everything you make flows from your voice.**
2. Typography gets roles, not just sizes: a UI voice, a display voice for human moments, a machine voice for what the system reports.
3. The accent color is a scalpel, deployed at moments of meaning, never sprayed.
4. Atmosphere over flatness: grain, glow, depth.
5. Kill the AI-slop tells: gradient sprays, glassmorphism-everywhere, emoji-as-icons, equal-weight card grids where nothing is primary.

## Decision Log

| Decision | Choice |
|---|---|
| Merge model | One conversational intake (Echo copilot); Your Voice becomes a read-mostly review surface |
| Sequencing | Two passes: shell elevation first, Echo + merge second, accepted overlap |
| Design direction | Editorial chrome within EchoMe brand; waveform reserved as the sacred voice motif |
| Echo desktop placement | Persistent pill, bottom-center, summonable with Cmd+K |
| Echo collapsed state | Always-visible pill (not a floating orb); may demote to orb on dense pages later, once the habit exists |
| Display voice (accent typography) | All Satoshi: italic weight + cyan for accent phrases. No new typeface |
| Machine voice | JetBrains Mono |
| Copy | Existing site copy is kept verbatim during restyling. Copy improvements ship only as a separate reviewable list. No em dashes in user-facing copy |
| Outputs in chat | Never. Input is conversational; output is spatial (pages and panels) |

## Concept: Echo, the Copilot

**The chat is not a place. It is the universal intake.** Everything a user feeds EchoMe goes through one input surface — a content prompt, a video, a doc, a schedule command, a voice correction ("I'd never say 'folks'"). The system routes each input: content generation, voice training, question, or command. Outputs never come back as chat bubbles; kits, carousels, and library views stay on pages and panels.

One mouth (Echo), one memory (Your Voice), many rooms (pages).

This deliberately does not repeat the March chat-as-KB-page failure. That failed because outputs lived in a scrolling thread (action cards scrolled away; the input bar implied free text for predetermined actions). Echo never puts outputs in a thread, and pages remain the display layer.

### Echo's three states

1. **Hero** (Home only): a large centered input, waveform-alive, replacing the generation form.
2. **Docked** (every other page): the persistent bottom-center pill with breathing waveform, placeholder text, and a Cmd+K hint. Mobile: a bottom input bar.
3. **Expanded**: the exchange container opens upward from the pill. It exists for clarification and confirmation only.

### Exchange rules

- Input → intent chip ("Creating a kit" / "Adding to your voice" / "Question" / "Command") → at most a couple of clarifying turns → handoff to a panel or page for anything rich (generation progress, kit output, library results).
- The exchange is capped by design; it never becomes a transcript you live in.
- Every action ends with a **receipt** in the machine voice: mono, uppercase, letterspaced — e.g. `ADDED TO YOUR VOICE · 3 CHUNKS · STRENGTH 87→89`. Receipts are an accountability element, not flavor text.
- Files and video drag-drop directly onto the pill in any state.
- Docked Echo is context-aware: it knows the current page and focused item. On a kit detail page, "make this punchier" needs no further specification (full support for this arrives with Echo v2 tool-calling).

## Information Architecture Changes

- **`/app` (Create) becomes Home.** Echo in hero mode replaces the three input-mode cards and the generation form. Below the input: context, not controls — recent kits, voice strength, activity-aware suggested actions.
- **`/app/voice` (Your Voice) becomes read-mostly.** The WBTW review pattern is promoted to the permanent page: waveform identity, strength score, source toggles, coverage, ambiguity/"is this you?" confirmations. Intake widgets are deleted: `AddContentSection`, `KBUnifiedInput`, `KBChat`, `AskYourVoice` (its Q&A function moves into Echo), and the six source-category upload cards.
- **Library, Calendar, Radar, Toolkit, Settings: structurally untouched.** They gain the docked Echo pill and lose nothing.
- **Nav shrinks by zero items in this project.** Same destinations; two of them get radically simpler. Removing nav items is a later, earned subtraction once Echo has absorbed the habits (the April chat-as-entire-app vision becomes a deletion exercise, not a redesign).

## Design Language System (Pass 1 deliverable)

### Type roles

- **UI voice — Satoshi.** Tightened scale, fewer sizes, heavier weight contrast between levels.
- **Machine voice — JetBrains Mono.** Receipts, stats, statuses, source labels, timestamps, kickers. Uppercase, letterspaced (~0.12–0.18em), quiet gray by default.
- **Display voice — Satoshi italic + cyan** for accent phrases in page heroes, empty states, and payoff headlines. No new typeface.

### Surfaces

Depth stack replacing flat panels: page ground (near-black blue) → raised card → interactive card → overlay. A barely-there grain texture (SVG noise, ~4% opacity) on the page ground only. Cyan glow reserved for Echo's focus state.

### Accent discipline

Electric Cyan #00D4FF remains the only accent, appearing in exactly four places: Echo's waveform, the single primary CTA per view, live/ready status, and the display-voice accent phrase. Purple/pink/yellow secondaries retire from chrome (permitted in data visualization only if needed). Existing accessibility-tuned interactive cyan variants (`--primary-interactive`) are preserved.

### Waveform rules

The waveform is the signature motif and appears only at voice moments: voice strength display, Echo listening/working states, and voice-source attribution. Never decoration. Scarcity is what makes it a signature.

### Motion

One timing system: fast ~140ms, base ~180ms, a single standard ease (cubic-bezier(0.2, 0, 0, 1)). The waveform's breathing is the only ambient animation.

### Kill list

Gradient sprays, glassmorphism blur-everywhere, emoji-as-icons, equal-weight card grids where nothing is primary.

## Implementation Phasing

### Pass 1 — Shell elevation (frontend-only)

1. Token system lands in `globals.css`: type roles, surface stack, grain, motion tokens, accent discipline.
2. Chrome restyle: sidebar, app shell, page headers, cards, buttons, inputs — applied across Library, Calendar, Radar, Toolkit, Settings.
3. Create and Your Voice receive token inheritance only (they are replaced in Pass 2).
4. Per CLAUDE.md sensitive paths: `src/app/auth/`, `src/app/app/admin/`, billing components, and `src/lib/api-client.ts` are not hand-edited; they inherit tokens through shared components only.
5. Zero copy changes. Zero layout restructuring.

### Pass 2 — Echo v1 + the merge

1. **Echo v1 (thin client):** pill + exchange container + intent chips + receipts. A single new backend classify endpoint (`echome-platform-v2`) decides create / ingest / question / command, then hands off to the existing generation and KB-upload APIs. No tool-calling loop. Drag-drop uploads route by file type plus lightweight intent.
2. **Home rebuild:** Echo hero mode + context cards (recent kits, voice strength, suggested actions).
3. **Your Voice rebuild:** read-mostly WBTW-style dashboard; intake widgets deleted in the same release that flips Echo on for everyone, not before.
4. **Mobile:** bottom-bar Echo ships in the same pass, not deferred.

### Echo v2 (separate future project)

The April chat-engine spec: intent classification → tool-calling loop → SSE streaming, one `/api/chat` route for web and mobile. Unlocks context commands ("make this punchier" on a kit page) and command-driving the whole app. Not part of this project's scope; Echo v1's UI is designed so v2 is a capability upgrade, not a redesign.

## Rollout & Testing

- Every PR goes to a feature branch off `develop`; Vercel preview deployments serve as staging URLs for testing. Nothing merges to `main` (auto-deploys to production) until the founder signs off on staging.
- Echo additionally ships behind an **admin-only feature flag**: live-testable in production against real data while users still see current Create/KB pages. The flag flips for everyone only after sustained founder use.
- The old intakes are deleted in the same release that flips the flag — never earlier.
- Transition support for ~180 habituated users: an announcement plus a one-time "things moved" pointer when a user visits the old intake locations.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Intake consolidation breaks user habits | Admin-flag soak period; transition tooltips; announcement; old intakes removed only at flag-flip |
| Intent misclassification frustrates users | Intent chip is always visible and correctable before execution ("Creating a kit — switch to voice training?") |
| Echo pill overlaps dense pages (Library, Calendar) | Spacing reserved at viewport bottom; if friction persists, demote to orb on dense pages (explicitly allowed by the decision log) |
| Backend classify endpoint slips | Pass 1 has zero backend dependency and ships independently |
| March failure repeats | Structural guard: outputs never render in-thread; exchanges are capped; pages remain the display layer |

## Out of Scope

- Marketing site / logged-out pages
- Echo v2 tool-calling engine (separate spec exists from April; superseded in UI assumptions by this document)
- Nav item removal / route consolidation
- Copy rewrites (separate reviewable proposal if pursued)
- Team Voices, admin panel, billing flows beyond token inheritance
