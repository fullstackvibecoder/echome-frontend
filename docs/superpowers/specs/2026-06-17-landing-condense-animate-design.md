# Landing Page Condense + Animate — Design

**Date:** 2026-06-17
**Status:** Approved (pending user spec review)
**Author:** Ara + Claude

## Goal

Cut landing-page scroll fatigue by removing the one duplicated section, re-ordering the survivors around buyer objections, evolving the hero into a multi-input animation, resurrecting the persona section, and instrumenting scroll-depth so the next iteration is data-driven.

## Why (rationale + metrics)

The home page tells the *input → Echo → output* story 3-4 times (hero, HowItWorks, KnowledgeBase, OutputShowcase). On a **mobile-first** product targeting **real estate agents** (~180 users, 40 paid, $20K ARR), a ~10-section scroll is the friction.

Decision basis: **objection-coverage**, not redundancy-count or ship-risk. Every section must kill one buyer objection; cut what kills none or duplicates a kill. No product analytics exist today (only Sentry), so this pass acts on audience reasoning AND adds instrumentation for the next pass.

Objection → section map:

| Realtor objection | Section |
|---|---|
| "No time, can't do content" | Hero promise |
| "How does it even work?" | Hero animation + KnowledgeBase (concrete) |
| "AI sounds generic/fake" | NotChatGPT (= Context is King) |
| "Prove it's real, not mockups" | OutputShowcase (proof) |
| "Is it for someone like me?" | UseCases (persona) + Testimonials |
| "Cost? Locked in?" | Pricing |
| "Am I alone in this?" | Community / office hours |

## Architecture

Re-sequence + dedup + animate the existing `HomeContent.tsx` section tree. No rebuild — the content (real screenshots, voice-match proof, realtor testimonials) is strong; the problem is sequence and repetition. Reuse the `SketchExplainer` animation engine for the hero.

## New section spine

Order in `HomeContent.tsx`:

1. **HeroSection** — animated multi-input transformation. "Context is King" eyebrow.
2. **KnowledgeBaseSection** — kept. The concrete "what goes in / what comes out" + stats bar (`0 prompts / 10+ sources / 1 voice`). Now the detailed how-it-works (HowItWorks is gone).
3. **NotChatGPTSection** — kept. Core differentiator ("context not prompts").
4. **OutputShowcase** — kept strong (NOT tightened). Proof: real screenshots, no mockups.
5. **UseCasesSection** — resurrected (currently orphaned). Persona fit for realtors. Requires dark restyle.
6. **TestimonialStrip** — kept. Anonymized realtor quotes.
7. **CreatorRadarSection** — kept. Bonus differentiator (repurpose others' content).
8. **Inline pricing block** — kept.
9. **CommunitySection** — kept. Office hours + FAQ.
10. **SiteFooter** — kept.

## Cuts

- **HowItWorks** — only duplicate. Answers "how does it work," now owned by hero + KnowledgeBase. **Unmount, leave file in repo** (FeaturesSection precedent) for easy revert. Do NOT delete.

## Component changes

### Hero (evolve #93's `SceneHeroTransform`)
- Single scene, 3 beats. Beat 1 shows **3 input chips converging** — video + voice note + link → Echo → finished post card.
- Kills "I don't have video" visually (the #1 office-hours misconception).
- **"Context is King" eyebrow** above the H1. H1 stays "It Already Knows How You Think" (LCP-friendly). The belief currently lives in the HowItWorks headline being cut — this rescues it.
- Constraints: transform/opacity only; `prefers-reduced-motion` freezes the final frame; no new runtime deps; reuse SketchExplainer engine.

### UseCasesSection (resurrect)
- Currently `bg-white` (light) — clashes with the dark page. **Restyle to dark** before mounting (match KnowledgeBase / OutputShowcase dark palette).
- Verify content (4 persona cards, input→output badges) still accurate.

### Analytics instrumentation (next-iteration data)
- Add `@vercel/analytics` (native to the Vercel deploy, lightweight).
- IntersectionObserver per section fires a `section_view` event with section id when it enters viewport.
- Track primary CTA clicks (`Start Free` / `Try Free`).
- Goal: next pass decides keep/cut from real scroll-depth + drop-off data.

## Dependencies / constraints

- **#93 dependency RESOLVED:** PR #93 squash-merged to main (`dd9c902`, 2026-06-18). `SceneHeroTransform` / SketchExplainer hero scene is now on main. Branch the restructure off **main**.
- Do not start on `content/office-hours-jun17` (that's the FAQ/testimonial PR #94).
- Sensitive paths untouched: `src/app/auth/`, `src/app/app/admin/`, `src/lib/api-client.ts`, billing components. (Inline pricing block is presentational copy only — re-order, no billing logic changes.)
- No em dashes in any new/edited user-facing copy.

## Testing

- Unit (Vitest): hero renders all 3 input chips; `prefers-reduced-motion` path renders final frame; `section_view` fires once per section (IntersectionObserver mock); HowItWorks no longer in the rendered tree; UseCases renders with dark classes.
- Manual: Vercel preview visual check on mobile + desktop; confirm scroll length dropped; confirm no light-bg flash from UseCases.

## Out of scope

- Cutting KnowledgeBase (user chose to keep).
- Cycling hero through multiple scenes (single multi-input scene chosen).
- Pricing/billing logic changes.
- Acting on analytics data (this pass only instruments).

## Open risks

- KnowledgeBase + OutputShowcase still both show output screenshots — mild residual overlap, accepted per user decision to keep KB.
- UseCases dark restyle could surface palette mismatches; budget time for visual polish.
