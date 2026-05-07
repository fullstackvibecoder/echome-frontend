# Carousel Design Guardrails

**Purpose:** Single canonical reference for Instagram carousel generation in EchoMe. The carousel prompt (in `core-prompt-system.ts`) and the renderer (in `src/services/image/`, backend) both consult this document. When they disagree with each other, this doc wins.

**Last updated:** 2026-05-07
**Owner:** Ara

## Source materials

These rules are derived from, and cite directly:

1. **Jess Lenouvel — "How to Customize the Carousel Template"** (training SRT, ingested 2026-05-07). Direct teaching on the specific carousel design pattern targeted here.
2. **Jess Lenouvel — "Posting a Carousel to Your Personal FB Page"** (training SRT). Caption + engagement rules.
3. **Sample carousel** at `Desktop/Screenshots/IG Carousel New Style/` — four slides (cover, two body, CTA) from one cohesive 10-slide post. The visual reference.
4. **TLL anti-aggression rules** — already encoded in `core-prompt-system.ts` sections 6 and 7. This doc is consistent with them, not a replacement.

The rules below are universal across users (not user-specific), so they live as a static prompt block, not a Pinecone retrieval. If per-user variation becomes a need later, ingestion is straightforward and this doc becomes the seed corpus.

---

## 1. Slide taxonomy

Every carousel has exactly three slide roles, regardless of total slide count:

| Role | Position | Purpose |
|---|---|---|
| **Cover** | Slide 1 | Stop the scroll. Promise the payoff. Tell them to swipe. |
| **Body** | Slides 2 through N-1 | Deliver the teaching. One idea per slide. |
| **Last** | Slide N | Signal the end visually. Land the soft CTA. |

**Slide count:** 10. This matches Jess's sample carousel exactly (cover + 8 body + last). 7-9 is acceptable if the topic is genuinely thin, but 10 is the default. Below 7 feels skimpy; above 10 loses people.

> *"Most of these templates have something like an intro slide that's the first one people are gonna see. Then we have kind of body slides... And then on the last side, kept this more bolder font only... just to signal to people, like this is the last slide."* — Jess

The current LLM prompt is hardcoded to 6 slides in two places (`core-prompt-system.ts:1301`, `generator.ts:1517-1574`). Bump to 10.

---

## 2. Visual rules

### 2.1 Universal — applies to every slide

**Aspect ratio:** 1080 × 1350 (4:5 portrait). This is the IG carousel native ratio. The renderer currently only supports 1:1 and 9:16; 4:5 is a required addition.

**Photography:** A single hero photo of the creator, used across all slides, with varying transparency overlays to differentiate slide roles. **The creator's face is always present** — never plain-color slides.

Multi-photo carousels are valid (Jess teaches both) but explicitly out of scope for this work — they require an asset upload library that doesn't exist. V1 is single-photo only.

**Photo source chain** (in priority order):
1. If a video is the content trigger, extract a frame from it (existing pipeline)
2. Else, use the user's profile image
3. If neither is available, render a solid-color slide with larger typography

> *"Try to keep the eyes clear so people can see that. Because they are looking at the text, but they'll also look at the image. They might look at eyes first, text next, text then eyes."* — Jess

**Safe zones (text positioning):** IG UI overlays the right edge and bottom of every slide. Body text must avoid both.
- ❌ Right edge: heart, comment, share, save icons
- ❌ Bottom strip: "See more", caption preview, profile chrome (~80px tall)
- ✅ Vertical center is the safest zone
- ✅ Slight bottom-bias is fine if text clears the bottom 80px

**Avatar bar:** Three small circular avatar images at bottom-left of every slide. Stamped into the design (not real engagement UI), reads as social proof. **Sources from the user's team avatars only** (e.g., EchoTeams accounts). If the user has no team, **skip the bar entirely** — do not fall back to repeated copies of the user's own avatar. Pagination dots stay regardless.

**Pagination dots:** Bottom-center, indicating slide position in the set.

**Color palette (locked):**
- Background: dark teal/navy `#0E2734` (the photo overlay color)
- Text primary: white `#FFFFFF`
- Accent (highlight): red `#E63946`
- Overlay opacity for body slides: 55-65% over the photo
- Overlay opacity for cover: 25-35% (photo more visible, text bottom-anchored)
- Overlay opacity for last slide: 65-75% (most opaque, signals end)

### 2.2 Cover slide

Layout: portrait photo dominant, headline bottom-anchored.

- **Headline:** 2-3 lines max, bold sans-serif, white text
- **One keyword in red** (the "stop-the-scroll device"). Pick the most concrete or surprising word in the headline.
- **Subtitle:** "(Swipe through to read them...)" or equivalent, lighter weight, in parentheses
- **Photo overlay:** light (25-35%) — the creator should be highly visible
- **Text position:** lower third of the slide, above the avatar bar

> *"How did I do the one word? I just selected it, text color, change the color, I want it more red... it helped pop and stop the scroll."* — Jess

### 2.3 Body slides

Layout: large number, bold takeaway headline, paragraph body. Photo background visible but heavily overlaid.

- **Number:** Large numeral (e.g., "1.", "2.") at the top of the text block. This is the dominant visual element after the photo.
- **Takeaway headline:** Bold sans-serif, white. The one-sentence punchline of this slide. Must be a complete idea, not a tease.
- **Body paragraph:** 2-4 sentences, regular weight. Teaches the takeaway.
- **No red highlight on body slides** — the red is reserved for cover and CTA
- **Photo overlay:** dark (55-65%) — text legibility wins
- **Text position:** vertical center

> *"This transparent, darker transparency over the body ones, I think going to help the text pop... having a bit of variety like this creates just some dimension in your post."* — Jess

### 2.4 Last slide

Layout: minimalist, centered text only. Heavier overlay than body slides.

- **No body paragraph** — bolder typography only
- **Soft CTA**, not a hard sell. Examples (from sample): "Want in? Drop 'VIRTUAL' below"
- **One keyword in red** in the CTA line (re-invoking the cover's emphasis pattern)
- **Optional dates/details** above the CTA line, smaller weight
- **Photo overlay:** heavy (65-75%) — most opaque slide in the set
- **Text position:** vertical center

> *"On the last side, I kept the transparent background just cause I felt like the text popped more here. But I kept this more bolder font only. I didn't use any of this small font here. Just to signal to people, this is the last slide."* — Jess

---

## 3. Copy rules

The LLM produces 10 slides (cover + 8 body + last). Word budgets per slide:

| Role | Word budget | Structure |
|---|---|---|
| Cover headline | ≤ 18 words | Lead with the symptom/promise. Mark one word for red emphasis with `**word**`. |
| Cover subtitle | ≤ 8 words | "(Swipe through...)" pattern. Optional. |
| Body headline | ≤ 14 words | Self-contained takeaway. Not a tease. |
| Body paragraph | ≤ 50 words | Teaches the headline. Concrete, not abstract. |
| Last CTA line | ≤ 16 words | Soft engagement ask. Mark one word for red emphasis with `**word**`. |
| Last details | ≤ 20 words | Optional dates/event details above the CTA. |

**Red emphasis convention:** Use double-asterisk markdown around exactly one word per cover and last slide. The renderer extracts these and renders them in `#E63946`. Body slides must NOT contain double-asterisk emphasis.

**Anti-patterns (NEVER produce):**
- Generic IG hooks: "Did you know...", "POV:", "Plot twist:"
- Industry-trend commentary not anchored in the user's KB content
- A made-up SignatureMethod or process name (already enforced by section 6 of core prompt)
- A hard CTA on a personal-philosophy post (already enforced by section 6)
- Repeating the cover headline as a body slide
- Closing with a question that has an obvious yes/no answer

**Required:**
- Cover slide must promise a payoff and tell them to swipe
- Each body slide must be self-contained — a reader who only sees that one slide should still get a complete idea
- Last slide must signal closure (different visual + softer ask)

---

## 4. Caption rules (the IG post body, separate from slides)

> *"You never want to leave this blank. You want to give people something to read and then possibly engage with. Ask them an engagement question. Ask them to save the post. If it's something where you're sending them to the guide, you're going to tell them to do that."* — Jess

Required elements (in order):
1. **Hook** (1-2 sentences): re-state the cover slide's promise in caption form, but with new framing.
2. **Why this matters** (2-4 sentences): the body of the caption. Personal angle if the KB supports it.
3. **One CTA**, exactly one of:
   - Engagement question ("Which of these do you struggle with most?")
   - Save instruction ("Save this for the next time you...")
   - Lead-magnet pointer ("Comment 'GUIDE' for the full breakdown")

The caption is a separate generation from the slides but should reference the cover slide's promise to land coherently.

---

## 5. Renderer requirements (extension points)

This section is the spec for the backend renderer rebuild. Maps directly to the gap analysis in the pipeline audit.

### 5.1 Aspect ratio
Add `'4:5'` to `AspectRatio` type at `src/services/image/carousel-templates.ts:14`. Add `{ width: 1080, height: 1350 }` branch in `getDimensions()` at `:66`.

### 5.2 Per-slide-type variants
Currently `selectTemplate()` at `src/services/image/canvas-renderer.ts:107` ignores slide role. Replace with a switch that returns a `branded-overlay-cover`, `branded-overlay-body`, or `branded-overlay-last` template based on `slideConfig.slideType` (which is already typed for `'hook' | 'content' | 'cta'`).

### 5.3 New template module
Add `src/services/image/canvas-branded-overlay-template.ts` exporting three render functions:
- `renderCover(ctx, slide, design)` — bottom-anchored headline with red span, subtitle, photo, light overlay
- `renderBody(ctx, slide, design)` — large numeral + headline + paragraph, dark overlay
- `renderLast(ctx, slide, design)` — centered CTA with red span, heavy overlay

### 5.4 Red keyword span primitive
Reuse the word-by-word measure-and-fill technique from `captioning.ts:1004-1037`. Parse the headline for `**word**` tokens, render those words in `#E63946`, the rest in white. New helper in `canvas-text-compositor.ts`.

### 5.5 Large numeral primitive
New helper that renders a numeral at 96-128pt with the same typography family as the headline. Body slides only.

### 5.6 Multi-avatar bar primitive
New helper that draws three circular avatars at bottom-left with slight horizontal overlap. Sources from the user's profile image + optional team avatars.

### 5.7 New design system preset
Add to `createDesignSystem()` at `canvas-renderer.ts:122`. Token names:
- `primaryColor` = `#0E2734` (overlay)
- `accentColor` = `#E63946` (red highlight)
- `textColor` = `#FFFFFF`
- `fontFamily.body` = Inter Regular (locked)
- `fontFamily.heading` = Inter Bold (locked for V1 — see §8 for why a picker is out of scope)
- `headingWeight` = 700 (Bold)
- `bodyWeight` = 400 (Regular)

### 5.8 Slide count
Bump default from 6 to 10. Update `PLATFORM_CONFIGS['instagram-carousel']` in `core-prompt-system.ts:118-137` and the inline prompt in `generator.ts:1517-1574`.

---

## 6. Future

- **Pinecone ingestion** of this document is optional. Static system prompt is fine for v1 since rules are universal. If users ever override (e.g., "I don't want the red highlight"), per-user overrides via Pinecone become useful.
- **Post-gen editor (Ship 2)** must respect these rules. The drag-to-position safe zones in 2.1 should constrain where text can be moved.
- **A/B testing** the red highlight on/off would be a clean validation of Jess's "stop the scroll" claim. Worth instrumenting once the renderer ships.

---

## 7. Decisions log

| Question | Decision | Date |
|---|---|---|
| Slide count | 10 (matches Jess's sample carousel). | 2026-05-07 |
| Multi-photo vs single | V1 single-photo. Multi-photo and asset uploads are explicitly out of scope. | 2026-05-07 |
| Headline font | Inter Bold locked. No font picker in V1. | 2026-05-07 |
| Avatar bar fallback | Skip the bar entirely when no team. No fallback. | 2026-05-07 |

---

## 8. Scope

This work is **one ship**: the carousel visual restyle described in §1-§6. Everything else is explicitly out of scope.

### In scope

1. Prompt block injecting these guardrails into `core-prompt-system.ts` (LLM produces 10 slides with cover/body/last roles + `**word**` red emphasis markdown).
2. Renderer rebuild per §5: 4:5 aspect, three template variants (cover/body/last), red keyword span primitive, large numeral primitive, multi-avatar bar primitive.
3. Photo source chain per §2.1 — video frame extraction (existing pipeline) or profile image, with solid-color fallback.

### Explicitly NOT in scope

These are real future work, but **not part of this ship**:

- **Visual asset uploads** (image/B-roll uploads to a brand-asset library). Defer until users actually ask. The current photo source chain is good enough for V1.
- **Font picker** (user-selectable display fonts). Inter Bold is the locked V1 choice. The picker can ship later if users complain.
- **Per-slide photo override** in a post-gen editor. Belongs to the Ship 2 carousel editor, not this ship.
- **Vision captioning + embedding for smart slide-to-image matching.** Speculative V3 territory.

If any of these surface during the build, file them as separate work items. Don't expand scope mid-ship.

---

## 9. TLL ethos inheritance

This doc covers the **visual style** rules from Jess's training. It does NOT replace the broader TLL voice and content rules already encoded in the generation pipeline.

Carousel generation MUST inherit:
- **Anti-aggression rules** from `core-prompt-system.ts` §6 (lead with the symptom not the diagnosis, never invent a SignatureMethod, soft engagement question vs hard CTA discrimination, fail honestly when KB is thin).
- **9-Point structure inheritance** where the topic warrants (Pain → Problem → Consequences → Story → Method → Proof → Objection → Vision → Action). Not every carousel maps to all 9; the cover establishes Pain/Problem and the body slides do the rest.
- **Voice rules** from the user's analyzed voice profile (the existing voice match gate at `generator.ts:934, 979` still runs per-slide content).

In other words: the rules in this doc tell the renderer what to draw and the LLM what *shape* of text to produce. The rules in `core-prompt-system.ts` tell the LLM what *substance* the text should have. Both apply.
