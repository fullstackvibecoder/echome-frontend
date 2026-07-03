# Create Page Fold Discipline — Design Spec

**Date:** 2026-07-03
**Status:** Approved direction (founder reviewed interactive mockup 2026-07-03); spec pending founder review
**Scope:** Frontend only (`echome-frontend`). Zero backend changes. No new endpoints, no schema changes.
**Reference:** Riverside.fm dashboard (founder-supplied screenshots). Interactive mockup: claude.ai/code/artifact/2f93f912 (session artifact).

## Thesis

The Create page's first viewport should contain exactly three things: a personalized question, the composer, and suggestion chips. Everything else (recents, coverage, Teams onboarding) moves below the fold. Riverside's simplicity is not fewer features; it is fold discipline. EchoHero currently stacks banners, helper paragraphs, card grids, and meters inside the first viewport.

This aligns with founder tenets: Low UI, Chat First, No Onboarding. It is a reorganization of existing surfaces, not new product.

## Current State (verified in code)

- `src/app/app/AppContent.tsx:365` — `showCreateRedesign = true` (GA). Renders, in order: Teams onboarding banner, free-quota counter banner, `<EchoHero />`, hidden `<GenerationForm />`.
- `src/components/echo/EchoHero.tsx` — empty-state header + SketchExplainer, then `AdvisorThread` + `DraftsThreadMessage` above the composer, then composer with machine caption ("VIDEO · AUDIO · DOCS...") and a 3-sentence helper paragraph below it, then `VoiceLearningChip`, then `EchoHeroTour`.
- `src/components/create/AdvisorThread.tsx` — empty: null; thin: NudgeBlock card; rich: NudgeBlock (suppressed when proposals exist) + `AutopilotProposalCard` grid + `CoverageMeter`.
- `src/components/create/DraftsThreadMessage.tsx` — renders only when Echo-drafted proposals exist; DraftCard + DraftRows.
- Rich state has **no headline at all** (empty-state header is gated off).
- `api.contentKits.list(limit, offset)` already returns `id, title, thumbnailUrl, clipsGenerated, createdAt, has_*` platform flags. Recents strip is data-complete today.
- `useAuth` user carries `full_name` (optional).

## The Six Changes

### 1. Personalized H1, all states

- **Empty state:** "Teach Echo to write in your voice." + subhead. SketchExplainer animation REMOVED (founder call 2026-07-03, post-staging review): it dominated the viewport and pushed the composer below the fold. Component survives for the public homepage (HeroDemoVideo) and /sketch-preview.
- **Thin + rich states:** new H1 "What do you want to create, {firstName}?" where `firstName = user.full_name?.split(' ')[0]`. When `full_name` is absent: "What do you want to create?" (no comma, no dangling name).
- Same type treatment as the existing empty-state H1 (`clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem)`, weight 600, centered, balanced).

### 2. Nudge becomes one line under the H1

- The `NudgeBlock` card (bordered box with headline + subhead) is replaced by a single centered muted line under the H1, rendered from `advisor.nudge.headline` only. Subhead is dropped from this surface.
- Shown in thin and rich states whenever `nudge.headline` is non-empty. The current "suppress nudge when proposals exist" rule is removed: the line is quiet enough to coexist with chips.
- No card chrome. `text-sm`, `text-muted-foreground`, centered, max-width matches composer.

### 3. Composer stripped to one placeholder line

- **Remove** the machine caption row content ("VIDEO · AUDIO · DOCS · LINKS · TOPIC. TALK, TYPE, OR DROP") and **remove** the 3-sentence helper paragraph below the composer (`EchoHero.tsx:362-364`).
- **New placeholder** on the textarea: "Talk, type, or drop a file. A video, a link, or just a topic." (Note: period, not em dash. House rule: no em dashes in copy.)
- **Keep:** waveform motif, paperclip attach, mic button, drag-and-drop over the hero, attachment card, recording/transcribing states, all `data-tour` attributes (EchoHeroTour depends on them), all `useEcho`/`useEchoMic` behavior. Chrome goes; affordances and the state machine do not.
- The bottom toolbar keeps its layout (waveform left, attach + mic right); only the machine-caption span between them is removed (the flex spacer replaces it).

### 4. Quota banner becomes a quiet line under the composer

- The free-quota counter banner in `AppContent.tsx:397-424` no longer renders above the hero for the redesign path.
- Instead, EchoHero accepts new optional props: `quota?: { remaining: number; limit: number; exhausted: boolean }`. AppContent passes it for free users only.
- Rendered as one line directly under the composer: `{remaining} of {limit} free content kits left · Upgrade` in `text-xs text-muted-foreground`, with "Upgrade" linking to `/app/billing`.
- Last-kit state: line flips to amber text with "Subscribe" link (preserves the existing urgency signal at lower visual cost). Exhausted state: "Free content kits used up · Upgrade".
- The existing quota banner JSX is retained for the non-redesign rollback branch (dead code, same policy as the rest of that branch).

### 5. Proposals become chips below the composer

- `AutopilotProposalCard` grid (above composer) is replaced by a horizontal wrap of pill chips **below** the composer (below the quota line), matching Riverside's pattern.
- Chip = proposal.title, pill border, `text-[0.8125rem]`, tap prefills the composer via the existing `handleProposalSelect` path and focuses the textarea. Max 3 proposals shown (advisor already caps; if it returns more, slice to 3).
- The first (top) proposal gets the cyan-accent border; all others neutral. Cyan stays reserved: focus glow, waveform, top pick only.
- Caption line under chips, machine style: "SUGGESTED FROM YOUR KNOWLEDGE BASE" (rich/thin only, only when chips exist).
- **Empty state chips (new):** three starter chips under the composer: "Talk for one minute" (starts mic), "Drop a Zoom recording" (opens file picker), "Paste a YouTube link" (focuses composer). These reuse existing handlers (`startMic`, file input click, textarea focus). No new logic.
- `AdvisorThread.tsx` is retired from EchoHero; its responsibilities split into the nudge line (change 2), chips (this change), and the coverage strip (change 6). The component file stays until nothing imports it, then is deleted in the same PR.
- `DraftsThreadMessage` **stays above the composer**, unchanged. Drafts are actionable work Echo prepared; they earn above-fold placement and render only when drafts exist.

### 6. Below the fold: Recents strip, coverage strip, Teams note

Rendered inside EchoHero (or a sibling section in AppContent) below the hero block, in this order:

**Recents (new):**
- Header row: "Recent" + "View all in Library →" (links `/app/library`).
- `api.contentKits.list(4)` on mount. Grid of up to 4 kit cards: thumbnail (`thumbnailUrl`, fallback to a neutral waveform placeholder), title (1-line clamp), detail line built from available fields (`{clipsGenerated} clips · {platformCount} platforms · {relative time}`), status pill (Ready when `contentGenerated` is true, Processing otherwise; `contentGenerated` is already on the list item).
- Section renders nothing when the list is empty or the fetch fails (silent, non-blocking; no skeleton taller than 1 card row).
- Card click navigates into the content kit at `/app/library/{kitId}` (existing kit detail route, `src/app/app/library/[id]/`). Founder-confirmed 2026-07-03.

**Voice strength strip (absorbs both CoverageMeter and VoiceLearningChip — merged down, not retired):**
- One horizontal strip combining the two existing voice surfaces:
  - **Ring + tier** from `useVoiceStrength().overallStrength` (VoiceLearningChip's data source): conic-gradient ring with the score, label "Voice profile: {Seed|Growing|Strong|Signature}" using the chip's existing tier thresholds (0-25/26-50/51-75/76+). WBTW-pending state shows "Learning your voice..." with the spinner, same as the chip today.
  - **Subline** from `advisor.coverage` (CoverageMeter's data source): strong/thin topic areas when available, omitted otherwise.
  - **CTA** "Teach Echo more" focuses the composer.
- The ring + label area links to `/app/voice` (preserving the chip's navigation) and carries the chip's `data-tour="echo-hero-voice"` anchor so EchoHeroTour keeps working.
- Voice-scope rule preserved from the chip: voice = written posts only; never say clips "sound like you".
- `VoiceLearningChip.tsx` is deleted. `CoverageMeter.tsx` is NOT deleted: `AdaptiveCreateSurface.tsx` still imports it. Only its EchoHero-path usage goes away. (Amended during implementation planning.)
- The strength ring uses brand cyan (conic-gradient on --primary), per the founder-approved mockup. This is an approved addition to the cyan allow-list (focus glow, waveform, top-pick chip, strength ring). (Amended during implementation.)
- Rendered in thin/rich states only.

**Teams onboarding note:**
- The gradient Teams banner (`AppContent.tsx:370-392`) demotes to a single dashed-border row below the fold: "EchoTeams: your account supports up to {n} voices. Set up team voices →". Same dismiss + localStorage behavior, same gating.

## Layout Order (final)

Rich/thin: H1 → nudge line → DraftsThreadMessage (when present) → composer → quota line (free users) → proposal chips + caption → [fold] → Recents → voice strength strip → Teams note.

Empty: H1 (teach-first) → subhead → SketchExplainer → composer → quota line → starter chips → nothing below the fold.

## Explicitly Unchanged

- `useEcho` state machine, `EchoExchange`, intent chips inside the exchange flow, confirm/receipt UX.
- Hidden `GenerationForm` engine and its mount contract (`display:none`, effects keep running).
- `SketchExplainer`, `EchoHeroTour` (all `data-tour` anchors preserved), mobile app, non-redesign rollback branch.
- All backend routes and the advisor API contract.

## Error / Degraded Behavior

- Advisor fetch fails or in flight: H1 still renders (name from auth, not advisor). No nudge line, no chips; composer fully functional. Existing loading-flash guard (wait for `advisorLoading` before deciding empty) is preserved for the empty-state header + SketchExplainer.
- Recents fetch fails: section absent. Never blocks the hero.
- `full_name` missing: nameless H1 variant.

## Testing

- Unit tests updated/added for: H1 per state (empty/thin/rich, with and without full_name), nudge-line rendering rules, chip rendering + prefill wiring, quota line variants (normal/last/exhausted/paid-hidden), Recents (renders 4, hides on empty/error), Teams note demotion, helper-paragraph and machine-caption removal (assert absence).
- Existing suites touched: `AdvisorThread.test.tsx` (retired with component), `AppContent.resting.test.tsx`, EchoHero-related tests.
- Staging smoke before main promote, per release policy.

## Resolved Questions (founder, 2026-07-03)

1. **VoiceLearningChip** — merged into the voice strength strip below the fold (moved down, not retired). Tier data, /app/voice link, WBTW pending state, and tour anchor all carry over. See "Voice strength strip" above.
2. **Recents card click** — navigates into the content kit (`/app/library/{kitId}`).
3. **Nudge line copy** — ship `nudge.headline` as-is, review on staging; adjust FE-side (single-line clamp) if it reads badly. Founder delegated.
