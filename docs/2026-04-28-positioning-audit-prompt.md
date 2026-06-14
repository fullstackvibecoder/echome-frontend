# EchoMe Frontend Positioning Audit — Prompt for Frontend Terminal Session

> **Read this entire document before doing anything.** You are picking up strategic positioning work that started in a backend session. Your job is to ground the strategic conversation in factual evidence from the frontend codebase, not assumptions. Specifically: do not paraphrase copy — quote it verbatim with file:line citations.

## Why this audit exists

A paying customer (Jaya Dewan, Re/Max realtor, hall-of-fame producer, mentored by Jess Lenouvel) churned at the end of her first month. Email thread is at `~/Downloads/Echo Me Mail - Re_ Echo Me.pdf`. The signal:

- After 30 days + multiple office hours sessions + emails + guides, she compared EchoMe to **Canva** and **Capcut** — two video/design production tools.
- She used EchoMe **only** to extract captions for videos she'd already finished editing externally.
- 23 generated content kits sat in her library unused.
- She asked, in writing: "how is it better than Canva."

That mental model — "EchoMe is a captions/video tool" — is the failure. EchoMe is a context-first multiplication engine that should arrive at the user's first session already knowing things about them and should let them get value without ceremony. The customer never grasped that, despite a month of touchpoints. The hypothesis is that the current frontend betrays the founder's operating tenets in ways that systematically produce Jaya-shaped mental models.

## The six operating tenets (the canonical framework for this audit)

These are the founder's actual operating tenets for EchoMe as of 2026-04-28. Use these, **not** the older trio in `copy_refractor.md`. (See "About `copy_refractor.md`" below for what's still valid and what isn't.)

1. **CONTEXT IS KING** — lead with what the product knows about the user, not what it produces. Knowledge base, voice pipeline, RAG retrieval are the thesis made functional. Copy that leads with output volume, platform count, or generation speed is wrong. Copy that leads with context, history, and personalization is right.
2. **LOW UI** — minimal interface chrome. Visual simplicity over visual density.
3. **FEATURE RICH, LOW UI** (corollary of #2) — power deep, surface simple. Pack capability, hide complexity. The product should feel less complicated than its competitors despite doing more.
4. **CHAT FIRST** — conversational interaction is the primary mode of using the product. Not forms, not modals, not multi-step wizards. When a user wants to do something, they should be able to ask.
5. **NO ONBOARDING** — no gating ceremony before the user gets value. No "configure your voice profile before you begin." No "complete your profile to continue." Drop them into output, not configuration.
6. **WORK BEFORE THE WORK** — proactively gather public/discoverable context (LinkedIn, brand website, social handles, Google business profile, public listings, etc.) and pre-populate fields. **Never ask the user for what the system can find on its own.** The product should arrive at the user's first session already knowing things about them.

**This audit is not asking "what should the positioning be?"** That is decided — the six tenets above. The audit is asking: **does the current frontend surface area embody those tenets, or does it betray them, surface by surface, with quoted evidence?**

## About `copy_refractor.md` at the frontend repo root

That document captured CONTEXT IS KING accurately. Its other two stated theses ("Everything is bullshit" and "Affordability is not solvable") are **not** EchoMe operating tenets. Those came from a different context (a YOLO moment and Ara's prior real estate business respectively) and should not drive an EchoMe audit. The doc may have informed earlier copy refactors, but it is partial historical context, not the authoritative tenet list. Read it for tone-of-voice (direct, a little blunt, no impressing adjectives) — not for tenet evaluation.

## How the Jaya signal maps to the tenets (use these as concrete tests)

Run her arc against the six tenets. Several violations should jump out before you even open the homepage:

- **NO ONBOARDING violated** — she had to attend "countless office hours sessions" and read multiple emails before the product made sense. The product itself failed to onboard her. Ara had to do it manually.
- **WORK BEFORE THE WORK violated** — she has a public Re/Max profile, a hall-of-fame designation, a personal site at ASKJAY.ca, an Instagram presence at @jayandjayahomes, a co-branded "Jay & Jaya" team identity. None of this appears to have been pre-populated for her. The product asked her to bring its understanding of her, instead of going to find what was already public.
- **CHAT FIRST violated (likely)** — she filled out forms and uploaded videos, not had a conversation. If `/create` is form-driven instead of chat-driven, that's a tenet failure.
- **CONTEXT IS KING violated (likely)** — she described the captions output, not the system's understanding of her. Output language won.

Use these as the lens for every surface: would a Jaya-shaped customer landing here for the first time encounter the tenets in action, or experience their absence?

## What you should produce

A single markdown deliverable at `docs/2026-04-28-positioning-audit-report.md` containing:

1. **Surface inventory** — every user-facing surface evaluated, with quoted verbatim copy and a tenet-by-tenet observation. Don't paraphrase. Use file:line citations.
2. **Tenet-by-tenet verdict** — for each of the six tenets, a clear rating (embodied / partial / betrayed) supported by quoted evidence from at least 3 surfaces.
3. **The Jaya test, applied** — for each major surface, answer: would landing here on day 1 lead a Jaya-shaped customer to the right mental model, or to "this is a captions tool"? Be honest. If a surface fails the test, name which specific tenet violation produces the failure.
4. **Specific change list** — files and line numbers, with the current copy verbatim and a proposed replacement, for every surface where one or more tenets is betrayed. Match the founder's tone: direct, a little blunt, no impressing adjectives, no marketing fluff.
5. **IA / structural changes** — if a feature's *name* or *placement* betrays the thesis (e.g., "Following" sounds passive when the feature is industrial; the default input on `/create` may be wrong), propose specific renames or reorganization. Justify each with the tenet it serves.
6. **Work-before-the-work proposals** — for each onboarding surface and each form field, list public data sources that could pre-populate it (e.g., realtor profile from MLS / Re/Max, brand assets from website crawl, voice samples from public socials, headshot from LinkedIn, etc.). This becomes the spec for upstream backend work.
7. **Chat-first proposals** — flag every multi-step form, modal, or wizard flow and propose how it could be a single conversational interaction instead. This is exploratory; don't try to design every flow, but do identify the top 3-5 candidates.
8. **Open questions for Ara** — anything where the right answer requires a founder decision rather than a copy fix.

## How to do it

### Use `/corereview` as a partial input, not the canonical evaluation

There's a `/corereview` skill in this environment. Its description says it audits against three theses (Context is King, Everything is Bullshit, Affordability is not Solvable). Two of those are not EchoMe operating tenets. So:

- **Run `/corereview` and capture its output**, but only use the CONTEXT IS KING findings from it.
- Discard the "Everything is Bullshit" and "Affordability is not Solvable" findings as out-of-scope for this audit.
- Evaluate the remaining five tenets (Low UI, Feature Rich Low UI, Chat First, No Onboarding, Work Before The Work) **manually**, against the same surfaces.
- Combine into a single report organized by tenet, not by skill output.

### Surfaces to audit explicitly

| Surface | Files |
|---|---|
| **Homepage / landing** | `packages/web/src/app/page.tsx` and any marketing-only pages outside the `(base)` layout |
| **Hero copy + sub-hero** | wherever the unauthenticated landing hero lives |
| **Sign-up / sign-in flow** | auth pages |
| **Onboarding flow (if any)** | check for any `/onboarding` route or first-run flow gating. **If onboarding exists, that itself is a tenet violation** (NO ONBOARDING). Document what it asks for, what it gates, and how much of it could be eliminated. |
| **`/create` page** | the most consequential single surface. What input is offered first? Video upload, YouTube link, topic input, or a chat box? Which is the visual default? Does the order of options match the founder thesis or does it lead with video? Is it form-driven or chat-driven? |
| **Empty states across the app** | particularly Library empty state, Create empty state, Schedule empty state, Knowledge Base empty state. These are what a new user sees before they have data. |
| **`/library` and `/library/[jobId]`** | does the language describe what was *generated* or what the product *understood about the user*? |
| **`/auto-clone` and `/quick-personalization`** | naming and copy. Do these reinforce CONTEXT IS KING or do they sound like ceremony the user has to perform? |
| **The "Following" feature** | the name, the page header, the empty state, the feature description anywhere it's marketed. The founder believes this is "horribly represented." Verify by quoting what's there. |
| **`/knowledge-base`** | this is literally the CONTEXT IS KING thesis incarnate. Does the copy treat it as the product's brain, or as a file-management chore the user has to maintain? |
| **`/settings`** | anything that asks the user for information that could plausibly be discovered (company name, website, social handles, brand colors, headshot, expertise). Each item is a candidate for WORK BEFORE THE WORK. |
| **Pricing page** | does it use any language at all that violates CONTEXT IS KING (leading with feature lists / output volume vs leading with what the product knows)? |
| **All marketing emails in `docs/email-drafts/`** | sample these for tenet conformance. The outbound voice must match the home page voice. |
| **Demo video script at `docs/demo-video-script.md`** | does the demo lead with what the product knows or what it produces? |

### Specific factual questions you must answer with evidence

Each answer must include a verbatim quote and a file:line citation. No paraphrasing.

1. On `/create`, what is the **default** input mode when the page first loads? Video upload, YouTube link, topic text, or a chat input? Which is visually emphasized?
2. Does the homepage hero mention "video," "captions," "clips," "editing," or "generate" in the first viewport? Quote it.
3. Does the homepage hero mention "voice," "context," "knowledge," "you," or "yours"? Quote it.
4. What is the literal label on the primary CTA button on the homepage?
5. What does the empty state on `/library` say to a brand-new user with zero kits?
6. What does the "Following" feature page say above the fold? Does the page describe "creators I follow" or "content automatically generated from sources I subscribe to" or something else?
7. Is there an onboarding flow at all? If yes, what does each step ask for? List every form field across every onboarding step.
8. For each onboarding/settings field, is the value already publicly discoverable (LinkedIn, website, socials, MLS/Re/Max profile, Google business profile)? If yes, mark it as a WORK BEFORE THE WORK candidate.
9. How does the product describe the voice profile to the user? Is it positioned as work the user does, or as something the product extracts from what they've already made?
10. Where in the app can the user have a conversation (chat) with the product, vs. fill out a form? Quote the surfaces. If chat is absent or buried, that's the CHAT FIRST violation.
11. How many distinct UI elements (buttons, dropdowns, fields, panels) appear in the first viewport of `/create`? This is a rough LOW UI sniff test.

## Resources you should read before starting

In this order:

1. **The auto-memory entry `feedback_echome_operating_tenets.md`** in this Claude Code project's memory. That's the canonical tenet definition. (If the memory doesn't auto-load, tell Ara — that's a separate problem.)
2. `copy_refractor.md` (frontend repo root) — for tone-of-voice reference only. Two of its three theses are out of scope. Don't import them.
3. `~/Side Quests/EchoMe Platform Frontend Audit Report.md` — existing IA inventory. Reference, don't redo.
4. `~/Downloads/Echo Me Mail - Re_ Echo Me.pdf` — the customer thread driving this audit.

## What NOT to do

- **Do not change any user-facing copy or code.** This is a read-only audit. The deliverable is the report. Implementation comes after Ara reviews.
- **Do not propose a new positioning.** The positioning is settled (the six tenets). Your job is to measure conformance, not redesign.
- **Do not import the "Everything is bullshit" or "Affordability is not solvable" theses from `copy_refractor.md`.** Those are not EchoMe tenets.
- **Do not paraphrase copy.** Quote it verbatim with file:line.
- **Do not include subjective design feedback** ("the colors feel cold," "the layout feels cramped"). Stick to tenet conformance.
- **Do not duplicate the existing `EchoMe Platform Frontend Audit Report.md`.** Reference it.
- **Do not deal in "probably" or "presumably."** If you don't know, look at the file. If you can't determine, list it as an open question.

## Context that may be useful

- The product backend is at `~/Side Quests/echome-platform-v2`. Don't audit it — the question is purely frontend positioning.
- A separate Closr migration is in flight (different product). Ignore.
- The reel editor today supports caption **position only** (top/center/bottom). Caption text, color, and timing are not user-editable. If any frontend copy claims otherwise, flag it as a factual error in addition to the tenet evaluation.
- The product is a Turborepo monorepo with the web app at `packages/web`.

## When you finish

The audit report should be self-contained enough that Ara can:
- Read it in 15 minutes
- Approve specific copy/IA changes by checking boxes
- Hand the approved subset to a copywriter or to a follow-up Claude session for execution
- Hand the WORK BEFORE THE WORK proposals to a backend session as the spec for upstream context-gathering features

Save it at `docs/2026-04-28-positioning-audit-report.md`. When done, paste the file path back to Ara and stop. Do not begin the implementation pass on your own.
