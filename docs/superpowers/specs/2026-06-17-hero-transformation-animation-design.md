# Hero Transformation Animation — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design); pending implementation plan
**Owner:** Ara

## Goal

Replace the homepage hero's right-slot placeholder (`HeroDemoVideo`'s
auto-rotating screenshot carousel) with a self-drawing SVG that animates the
core EchoMe promise: **raw input → Echo learns it → output that sounds like
you.** Makes the headline "It Already Knows How You Think." visible instead of
asserted.

Built on the existing dependency-free `SketchExplainer` engine
(`src/components/sketch/SketchExplainer.tsx`) — no animation library, no asset
files, no new toolchain.

## Non-goals

- The real product walkthrough video. That is a separate, later deliverable
  that drops into the **same glass chrome** this spec preserves. Out of scope
  here.
- Warming the hero background / changing the hero's overall color register
  (the "developer-tool register" teardown finding). Logged as a separate
  follow-up. This spec keeps the dark hero and only brightens the animation
  accent. See "Open follow-ups."
- Any change to `HeroSection.tsx` layout, copy, CTAs, or social proof — except
  the one-line LCP fix below.

## Background

- Right slot today: `src/components/landing/HeroDemoVideo.tsx` — a glass
  container (`rounded-[2rem] bg-white/[0.03] backdrop-blur-xl`, decorative
  ring, two floating cards: "Voice Matched 99%" top-right, "Instagram Carousel
  Gen" bottom-left) wrapping an auto-rotating carousel of 5 screenshots from
  `/guide-screenshots/`. Its own doc comment calls it a placeholder "while a
  new product walkthrough is being shot."
- Engine: `SketchExplainer` renders coded SVG whose strokes draw themselves via
  CSS (`stroke-dashoffset` over `pathLength=1`), captions fade up on a stagger.
  Scenes are registered in a `SCENES` map and a per-scene duration in
  `SCENE_DURATIONS`. The wrapper handles: in-view gating
  (`IntersectionObserver`, threshold 0.4), looping (remount on a timer),
  `prefers-reduced-motion` (freezes on the final frame, no timer), and CSS
  scoping (per-instance class from `useId()`). Recolor is a single `accent`
  prop applied to both strokes and captions.

## Research constraints (load-bearing — from the industry teardown)

1. **One mover.** Only one thing animates in the initial viewport. The hero
   text + CTAs stay static. The self-drawing scene reveals strokes
   sequentially, which reads as a single coherent mover (not 5 competing
   elements).
2. **Static, first-paint text.** Headline and CTAs must be visible at first
   paint — never gated behind the animation.
3. **No opacity-0 LCP trap.** The hero h1 currently ships with
   `opacity-0 animate-fade-in`, i.e. the Largest Contentful Paint element is
   invisible until JS fires the fade. Fix in this pass (see "LCP fix").
4. **`transform` / `opacity` only.** No layout-thrashing animated properties.
   Engine already complies.
5. **`prefers-reduced-motion` day one.** Engine already complies (renders the
   final frame, no loop).
6. **Mid-tier Android floor.** The realtor/creator audience runs mid-range
   phones; the animation must stay cheap. Pure CSS stroke draw on a static SVG
   clears this; no canvas, no WebGL, no video decode.
7. **No abstract ambient motion.** The hero already has two static
   purple/blob glows. Do not add particle fields or gradient drift — the
   motion must *show what stillness can't* (the transformation), not decorate.

## Design

### Component changes

Keep `HeroDemoVideo` as the glass-chrome wrapper. Swap only its **innards**:
remove the screenshot carousel state/markup, render
`<SketchExplainer scene="hero-transform" accent={...} />` centered inside the
existing glass card. The floating cards ("Voice Matched 99%", "Instagram
Carousel Gen") and decorative ring stay. This preserves the drop-in point for
the future real video with zero relayout.

Rationale for keeping the wrapper instead of replacing it: the glass frame is
the reusable container; the visual it holds is swappable. Future video swap =
change the innards again, frame untouched.

### New scene: `hero-transform`

A new scene function added to `SketchExplainer.tsx` and registered in `SCENES`
+ `SCENE_DURATIONS`. Three beats, left → right, on one horizontal spine:

1. **Input** — a waveform glyph plus a small video frame (a rectangle with a
   play triangle). Reads as "your raw stuff: you, talking."
2. **Learning pulse** — an Echo node (circle) with transcript lines inside and
   a pulse ring, fed by an arrow from beat 1. Reads as "Echo reads it."
   Wordless.
3. **Output** — a stacked content card (the carousel/post motif: 2–3 offset
   rounded rects) with a check mark, fed by an arrow from beat 2. Reads as
   "finished post/carousel, in your voice."

**Captions (minimal — hero is glanceable, not a tutorial):** at most two short
lines, both single-line. Beat 1: `Your video, your voice`. Beat 3: `Comes out
sounding like you`. Beat 2 stays wordless. No sub-captions. Copy uses no em
dashes (house style).

**viewBox / aspect:** sized to sit comfortably in the glass card's square-ish
area without distorting the floating cards. Approx 4:3 landscape (e.g.
`0 0 480 360`), final numbers settled during implementation against the live
card.

**Timing:** loop length registered in `SCENE_DURATIONS` at ~8000ms (draw ~5s,
hold ~3s, then remount/redraw), matching the engine's existing detailed-scene
cadence. The engine handles the loop; no new timing code.

**`aria-label`:** one sentence describing the full transformation, e.g.
"Your video and voice go in. Echo reads them and writes a finished post that
sounds like you." (Mirrors the existing scenes' `role="img"` + `aria-label`
pattern.)

### Theming (3a — dark hero, bright accent)

The engine's default `accent` `#0077AA` is too dim on the dark hero bg. Pass a
brighter value from `HeroDemoVideo` so strokes and captions read against
`bg-gray-900`. Candidate: the brand `primary` at full strength, or a near-white
(`#E8EEF4`-ish) for the strokes-as-line-art look. Exact value settled in
implementation by eyeballing on the live dark card. No change to the hero
background or other hero colors.

### LCP fix (in-scope, one line)

In `HeroSection.tsx`, the h1 carries `opacity-0 animate-fade-in`. Drop
`opacity-0` (and its fade) **on the h1 only** so the headline — the LCP
element — paints immediately. Sub-elements (value prop, CTAs, social proof,
right slot) keep their staggered fade. This is a guardrail from the research,
not part of the animation, but ships in the same pass.

## Data flow

None. The scene is static coded SVG; no props beyond `accent`, no fetches, no
state outside the engine's existing in-view/loop/reduced-motion machinery.

## Error handling

- No `IntersectionObserver` (SSR/jsdom): engine already falls back to a static
  rendered final frame. No loop, no crash.
- `prefers-reduced-motion: reduce`: engine renders the final frame, no timer.
- The scene is self-contained SVG — no runtime failure surface (no network, no
  parsing, no external assets).

## Testing

- **Visual:** load `/` (homepage) in the dev server; confirm the scene draws,
  loops, and reads left→right inside the glass card with floating cards intact.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, confirm the final
  frame renders static (no loop).
- **In-view gating:** scroll the hero out of view; confirm the loop timer
  stops (engine behavior — sanity-check it still holds with the new scene).
- **A11y:** confirm `role="img"` + `aria-label` present on the new scene SVG.
- **LCP:** confirm the h1 is visible at first paint (no `opacity-0`) — visual
  check, optionally a Lighthouse LCP spot-check.
- **Build:** `npm run build` clean.
- Existing engine has no unit tests for scenes (scenes are static SVG); none
  added. The wrapper's in-view/reduced-motion logic is unchanged.

## Files touched

- `src/components/sketch/SketchExplainer.tsx` — add `SceneHeroTransform`,
  register in `SCENES` and `SCENE_DURATIONS`, extend the `SceneId` union.
- `src/components/landing/HeroDemoVideo.tsx` — remove carousel innards, render
  the new scene inside the kept glass chrome with a bright `accent`.
- `src/components/landing/HeroSection.tsx` — drop `opacity-0` on the h1 (LCP
  fix) only.

Note: `src/components/sketch/` is currently untracked. Promoting it to tracked
(committing it) is part of shipping this, since the hero now depends on it.

## Open follow-ups (out of scope, logged)

- **Hero register (3b):** warm/ivory hero background for the realtor/creator
  audience, per the teardown's "developer-tool register" finding. Separate
  spec.
- **Real walkthrough video:** cut from screen-recordings, drops into the same
  glass chrome. Separate deliverable.
