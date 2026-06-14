# EchoHero Tile Density Redesign

**Date:** 2026-06-14
**Surface:** EchoHero (admin-gated Create page, `user.isAdmin` at `AppContent.tsx`)
**Scope:** Frontend only (`echome-frontend`). No backend or API changes.

## Problem

EchoHero rich state stacks a nudge, three autopilot proposal tiles, a coverage meter, and the drafted-for-you tiles above the composer. The drafted-for-you tiles are the worst offender: each `DraftCard` renders a title, an "Echo drafted" badge, a 220-character preview paragraph (`line-clamp-3`), and a three-action row. At two tiles this already reads heavy. At six (the realistic autonomous-draft count) it becomes a wall of text that buries the composer the page exists to serve.

Goal: cut resting-state text density while keeping the impact that justifies the surface (the feeling that "Echo drafted something good"). Fits the operating tenets Low UI, Feature Rich Low UI, and Context Is King.

## Chosen Direction: Featured + Compact Rows

One featured draft keeps a short preview as the proof-of-quality anchor. Every other draft collapses to a single scannable row. Total text drops sharply, one rich item keeps the "wow," and the list scales to 6/10/20 without growing the text wall.

### Layout (rich state, drafts present)

```
DRAFTED FOR YOU
┌────────────────────────────────────────────────┐
│ 3 signs the market is turning      [Echo drafted]│  featured
│ Most buyers wait for a signal that never comes…  │  preview, ~120 char, line-clamp-2
│ 👁 Review   📅 Schedule              🗑 Kill       │  actions always visible
└────────────────────────────────────────────────┘
┌────────────────────────────────────────────────┐
│ in  Why I stopped doing open houses    LinkedIn  │  row, single line
│ ig  Your best 30 seconds              Instagram  │
│ in  Spring market recap                LinkedIn  │
│ x   First-time buyer myths, debunked          X  │
│ in  The one number every seller ignores LinkedIn │
└────────────────────────────────────────────────┘
```

### Featured draft

- Pick: `drafts[0]`. The list from `api.drafts.list()` is already ranked best-first; no extra selection logic.
- Renders: title (`line-clamp-2`), "Echo drafted" badge when `origin === "autonomous"`, short preview, and the full action row (Review / Schedule / Kill) always visible.
- Preview shortens from `PREVIEW_LENGTH = 220` / `line-clamp-3` to **120 chars / `line-clamp-2`**.
- This is effectively today's `DraftCard`, with the shorter preview.

### Compact rows (`DraftRow`, new variant)

Each remaining draft (`drafts.slice(1)`) renders as one row:

- **Platform glyph** (leading) — derived from the primary populated platform.
- **Title** — single line, `truncate` (no clamp-2; rows stay one line tall).
- **Meta** — primary platform name (right-aligned), e.g. "LinkedIn".
- **Actions** — Review / Schedule / Kill.

Interaction:

- **Desktop (hover-capable):** meta label is shown at rest; on row hover it swaps to the Review / Schedule / Kill icon trio. Use a CSS `@media (hover: hover)` / Tailwind `group-hover` pattern.
- **Touch (no hover):** actions are always visible as a compact icon trio (the iOS app is live and pitched in demos, so rows must be operable without hover). Meta label may yield space to the icons on narrow widths.
- **Row click / Enter:** triggers Review (primary action), reusing `handleReview` semantics (telemetry-with-timeout, 404 → "gone" handling).

### Platform glyph + meta derivation (FE-only)

`DraftProposal` carries no format or kit-type field — only `content_linkedin`, `content_instagram`, `content_twitter`. So glyph and meta derive from the **primary populated platform**, using the same priority as `pickPreview` (LinkedIn → Instagram → X):

| Primary populated field | Glyph (lucide) | Meta label |
|---|---|---|
| `content_linkedin` | `Linkedin` | LinkedIn |
| `content_instagram` | `Instagram` | Instagram |
| `content_twitter` | `Twitter` | X |
| none | `FileText` | Draft |

A new helper `pickPlatform(draft): { Icon, label }` lives next to or in `DraftCard.tsx`.

> Follow-up (out of scope, noted): to show true format labels (Carousel / Clip / Newsletter) the drafts API would need a `kit_type` / `format` field. Deferred to a backend change.

## Autopilot proposal tiles

Apply the same cut to `AutopilotProposalCard`:

- Kit label (uppercase + sparkles) and title stay visible at rest.
- `rationale` moves to hover: hidden at rest on hover-capable devices, revealed on `group-hover`. On touch, keep it visible (no hover to reveal it) but it is the single secondary line, so density stays acceptable.

This keeps the three-tile proposal grid calm without losing the "why" entirely.

## Components & data flow

- `DraftsThreadMessage` fetches `api.drafts.list()` (unchanged). It now renders `drafts[0]` via `DraftCard` (featured) and `drafts.slice(1)` via `DraftRow`. Intro copy ("I drafted N things…") unchanged. `handleDismiss` filters by id and applies to both variants; dismissing the featured draft promotes the next draft to featured automatically (it becomes the new `drafts[0]`).
- `DraftCard` keeps its telemetry-with-timeout, 404 → "gone", and inline dismiss-error handling. The shared action logic (`handleReview`, `handleSchedule`, `handleDismiss`, `recordWithTimeout`, `pickPreview`) is reused by `DraftRow`; extract the shared hooks/helpers so both variants stay in sync rather than duplicating.
- No changes to `api.drafts.*`, types, or backend.

## Error handling & states

- **No drafts / not loaded:** `DraftsThreadMessage` returns null (unchanged).
- **Single draft:** renders only the featured card, no rows.
- **404 on action (draft gone):** both variants show the "already removed" info toast and call `onDismissed` (unchanged behavior).
- **Dismiss error:** featured card keeps inline `role="alert"` message; rows surface the same inline error beneath the row.
- **thin / empty advisor states:** unchanged — those paths render no drafts section.

## Testing

- `DraftRow` unit: renders title (truncated, single line), correct platform glyph + meta for each populated-field permutation, and the action trio. Row click triggers Review path.
- `DraftsThreadMessage` unit: with N≥2 drafts, first renders as featured (preview present), rest as rows; with N=1, only featured; dismissing featured promotes next to featured.
- `DraftCard` regression: shortened preview (120 / clamp-2), badge still gated on `origin === "autonomous"`, telemetry + 404-gone + dismiss-error paths intact.
- `AutopilotProposalCard`: rationale present in DOM, hidden-at-rest class on hover-capable, title + kit label always visible.

## Files touched (`echome-frontend`)

- `src/components/dashboard/DraftCard.tsx` — shorten preview (220→120, clamp-3→clamp-2); add `pickPlatform` helper; export shared action helpers for reuse.
- `src/components/dashboard/DraftRow.tsx` — **new** compact row variant.
- `src/components/create/DraftsThreadMessage.tsx` — split render: `drafts[0]` featured + `drafts.slice(1)` rows.
- `src/components/create/AutopilotProposalCard.tsx` — rationale to hover (with touch fallback).
- Tests alongside each component per the project's test layout.

## Non-goals

- No backend/API changes (no `kit_type`/`format` on drafts).
- No change to empty/thin advisor states, the nudge block, coverage meter, composer, or the non-admin production path.
- No new ranking logic — `drafts[0]` is the featured pick.
