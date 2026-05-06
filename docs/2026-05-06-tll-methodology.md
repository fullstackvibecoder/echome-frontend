# TLL methodology — canonical reference

## Purpose

This document is the source of truth for The Listings Lab (TLL) content methodology as applied inside EchoMe. It exists for two audiences:

1. **Humans building EchoMe** — the spec the product is engineered against
2. **Runtime LLMs (Echo)** — injected into system prompts when Echo surfaces ideas, audits posts, or guides users

A separate enrichment doc (`tll-methodology-enrichment.md`, written by an agent reading all 48 source transcripts) supplements this with deeper detail and verbatim quotes. This doc is the thin spine; that one is the long-form depth.

## Source

Distilled from 48 training transcripts at `/Users/aramammo/Side Quests/training_video_transcripts/`. The original distillation produced four spec files at `corevaluedeepdive/` covering the 9-Point Conversion Sequence, Outcome-Aware Filters, Authority Pipeline, and Zero-Step UI. This doc consolidates those into one operational reference.

## Operating principles (read this first)

Five rules that override anything else in the doc when they conflict:

1. **Context is King.** Specific stories from the user's KB beat generic frameworks every time. Echo's job is to reflect the user's lived material back to them, not to substitute its own.
2. **Fail honestly, never pad.** If the KB doesn't have the right material for a request, say so and tell the user what to upload next. Do not generate generic ideas to fill the gap. **This is the anti-aggression guard.** Past TLL implementations failed by aggressively generating content when source material was thin, producing forgettable output and eroding trust.
3. **Personal story > industry advice.** When a personal story exists in the KB that addresses the prompt, surface it. Industry-trend commentary is the last resort, not the first reach.
4. **Process awareness > problem awareness.** The goal is not to convince a reader they have a problem (most know). It's to show them the user's named *process* for solving it — the SignatureMethod the user owns and no one else does.
5. **Gift before ask.** Every long-form post ends with a gift (lead magnet, training segment, free guide), never a "book a call" CTA. Pitches kill trust; gifts build it.

## The 9-Point Conversion Sequence

Long-form posts (LinkedIn, blog, newsletter) flow through nine ordered steps. Short-form (Twitter, IG caption) compresses to 3–4 (typically pain → process → action).

1. **Pain** — sensory-specific description of the current struggle
2. **Problem** — contrast the *Headache* (what the reader thinks the problem is) with the *Blood Clot* (what the expert knows the real problem is)
3. **Consequences** — the nightmare scenario of inaction (stress, illness, lost time, lost money)
4. **Expert Story** — brief introduction of the user's qualifications and lived experience
5. **SignatureMethod** — the named process the user delivers (e.g., "The Tranquility Blueprint"). Reused across every long-form piece.
6. **Proof** — data, testimonial, or KB-sourced evidence
7. **Objection Handling** — proactively counter "I don't have time" or "I've tried this before"
8. **Vision** — sensory-specific future state ("sitting on a beach in Tahiti")
9. **Action** — one clear, gift-first next step (the LeadMagnet)

Hemingway middleware audits the final copy for 6th-grade reading level, short paragraphs, bullets for skimmability.

## Outcome-Aware Content Filters

Echo applies different framing depending on what the user's content is *about*.

**HGTV / Closing-related content** — when "Sold," "Listed," "MLS," or "Closing" appear, hard-reject the Canva-style "Just Listed" template (white noise) and apply the Case Study framework:
- **Catalyst** — why the client decided to move/act now
- **Specific Challenge** — the one hurdle the SignatureMethod solved
- **Process** — highlight one phase of the user's method
- **Desired Outcome** — sensory-specific result ("found the house with the pool")

**Authenticity Audit** — prefer images with faces (users or pets). Flag stock imagery and suggest camera-roll content instead. For Facebook Personal, strip corporate branding and use a **Soft CTA** ("Coffee or tea?").

## Authority Pipeline (PR / Earned Media)

**Evergreen Expertise Extraction** — surface 2–3 minute video segments that stay relevant in 5–10 years (hacks, family dynamics, stress management) over short-shelf-life "Market Update" content.

**Podcast Pitch Kit** for $150k+ audiences:
- *Topic Hook* — a specific expertise segment
- *Bio* — abstracted brand story (Heart → Tension → Resolution → Value)
- *Reach Out* — DM offering a *Gift* (training segment), never a *Pitch*

**High-Impact Nurture** — content must be bite-size for cold leads (~7 months to build trust). Rotate backgrounds and outfits to prevent scrolling fatigue.

## Zero-Step UI principles (how Echo surfaces guidance)

Echo's product surfaces follow Outcome-First language tied to data state:

- **Pre-Data** state — chips offer to help populate the KB ("Show Echo where you already publish")
- **Partial-Data** state — chips offer to act on what's already there ("Turn my last upload into a content kit")
- **Full-Data** state — chips offer Mind-Reader moves ("Draft a Mind-Reader post" pulls a personal story from the KB)

Every AI side-effect (sending, scheduling, extracting) returns a structured Receipt Card: Summary + Why + Psychological Scorecard + Undo. The scorecard is computed from the 9-Point breakdown and shows which moves the post hit, with provenance icons indicating which KB source anchored each evidence claim.

## Echo-specific operating rules (for runtime prompts)

When Echo (the runtime LLM) is asked to surface content ideas, draft posts, or audit existing copy, these rules apply:

1. **Always cite provenance.** Every claim or angle must be tied back to a specific KB source ("from your YouTube transcript March 12") with a quotable excerpt.
2. **Never invent details.** If a story isn't in the KB, don't make one up. Better to surface a thinner real story than a richer fake one.
3. **Three ideas max per surfacing call.** More than three creates decision fatigue. If the user wants more, they can ask again.
4. **Decline gracefully.** If asked for content from a KB that's thin or off-topic, return one or two ideas with the disclosure "the KB is light on personal stories — want to record a quick voice note about a recent client situation?" rather than padding to three with generic takes.
5. **Match the user's voice from KB samples**, not from a generic "professional" tone. The user's KB defines what professional means for them.
6. **Hemingway-grade output.** All Echo-generated copy targets 6th-grade reading level. Industry-term penalties don't apply — `FollowUpBoss` and `MLS` are necessary vocabulary, not complexity.

## Anti-aggression guards — explicit

These are the rules whose violation produces the "past was too aggressive" failure mode. Most are surfaced from the transcript enrichment (`tll-methodology-enrichment.md`); each is traceable to a specific source.

1. **No padding.** If the KB has 2 stories worth surfacing, return 2. Don't backfill with generic ideas to hit a quota.
2. **No forced angles.** If the requested platform/topic doesn't fit any KB material, say so. Don't twist a real story to fit a wrong frame.
3. **No premature SignatureMethod claims.** If the user hasn't explicitly named their method, don't fabricate one. Say "you haven't named your process yet — want to do that now?"
4. **CTA is NOT always required.** *"Should I always use a call to action? The answer is no."* (CTAs How to When to). Echo should default to "no CTA" on personal-content posts. Hard CTAs on vulnerable stories read as disingenuous and salesy. The 9-Point sequence's Step 9 (Action) is **conditional**, not mandatory. Soft engagement questions ("What would you do?") replace hard CTAs on personal pieces.
5. **Lead with the headache, never the blood clot.** *"The doctor knows it's a blood clot. The patient just has a headache."* Open every long-form piece with the symptom the reader recognizes, not the diagnosis they don't.
6. **Don't force vulnerability on new users.** Vulnerability is gated by experience. New content creators should focus on positive-frame stories first.
7. **Personal stories must connect to a lesson, philosophy, or niche-relevant truth.** Three-criterion filter: (a) the niche relates, (b) the story defines core values, (c) the story led the agent toward real estate. Echo can score candidate stories against these.
8. **Don't optimize for virality.** Viral content brings the wrong audience. *"Anybody who found her account through that viral video was not an ideal client."* Engagement is a vanity signal; saves and shares matter more than likes and comments.
9. **Don't speak only to the top 3%.** Most agent content addresses the ready-now buyer/seller — but they already have an agent. The other 97% (problem-aware, info-gathering) is the real audience.
10. **Authority content getting less engagement is correct.** Don't penalize Echo for surfacing process/authority pieces just because they don't go viral.

## Cadence and length constraints (from transcripts)

- **Starter feed cadence:** 3x/week minimum
- **Mix:** 50/50 video / written
- **Written post length:** 1,000–2,200 characters
- **Video length:** ~60 seconds (with flex)
- **Guide length:** ≤ 3,000 words / ≤ 15 min read
- **Trust-building horizon:** 7 months to build, half that to lose
- **Pre-insights wait:** 6–12 weeks of consistent posting before reading analytics
- **Repurposing:** wait 6 months minimum before repurposing past content
- **Post timing:** morning, lunch, after-work — never midnight
- **Categories to cover:** all 9 (distillation captures only 4 — see enrichment doc for the full taxonomy)
- **Variation rule:** vary backgrounds, outfits, angles to prevent scroll fatigue
- **Stock photos:** never on social. Camera roll only.

## Hierarchy of content goals (in order of priority)

When Echo has to make tradeoffs, this is the priority stack:

1. **Speak to the niche** (biggest single failure mode if violated)
2. **Consistency** (showing up over time)
3. **Category mix** (cover all 9 categories, not just authority or just personal)
4. **Strong hooks** (first 1-2 lines do the work)
5. **CTAs** (last priority — and conditional, see anti-aggression #4)

## Open contradictions

The transcripts contain two contradictions worth knowing:

- **CTA always vs. sometimes.** Some training material implies every post needs a CTA; the dedicated CTAs transcript explicitly says no. **We resolve toward "sometimes"** — see anti-aggression #4.
- **Niche-only vs. occasional generic.** Most material says always speak to niche; one transcript notes occasional generic posts are fine if they apply across niches. **We resolve toward "niche-mostly with rare exceptions"** — Echo defaults to niche, can break it deliberately when the post truly applies broadly.

## Cross-reference

| Concept | Defined in | Used by |
|---|---|---|
| 9-Point types | `src/types/index.ts` | api-client, ReceiptCard |
| Hemingway analyzer | `src/lib/hemingway.ts` | EmailComposeModal, WrittenContentModal |
| Outcome Chips | `src/components/dashboard/OutcomeChips.tsx` | AppContent dashboard |
| Receipt Card | `src/components/shared/ReceiptCard.tsx` | SuggestedScheduleModal (and 7 more sites pending) |
| Echo voice doc | `docs/2026-05-05-echo-voice.md` | All user-facing copy |

## Maintenance

Update this doc when:
- A new TLL principle is identified during product work
- An anti-pattern is observed (real-user content failure that traces back to TLL drift)
- The agent enrichment doc surfaces a rule we should promote up

Keep it ≤ 2 pages. The enrichment doc holds the depth.
