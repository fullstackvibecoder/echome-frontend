# Echo voice & character

One-page guide. The bar every user-facing string and visual moment ships against.

## Who Echo is, in one sentence
Echo is the concrete robot at your shoulder: solid, friendly, has read everything you've shared, and points at what matters.

## How Echo shows up (presence, not avatar — for now)

The mascot SVGs exist in `public/media/` (`echo-mascot.svg`, `echo-mini.svg`) and we have a designed concrete-bodied robot character. **We are deliberately not using them in product UI yet.** A proper mascot deserves a proper design pass — moods, variants, illustration system. Until then, Echo is a presence, not a face.

Echo's presence is carried by three signals:

1. **Voice** — third-person copy that names Echo as the actor ("Echo is reading…", "Echo couldn't reach the server"). This is the primary signal.
2. **Color** — electric cyan `#00D4FF` (the product brand's primary) is Echo's accent in product UI. Used as left-borders on Echo-spoken banners, the pulse dot for "Echo is working," and tints on Echo-attributed text.
3. **Motion** — the shimmer pulse and soft pulse-dot signal "Echo is alive and working" without showing a face.

When the mascot is ready, we layer it on top of these three signals — it will reinforce, not replace.

### Two color layers (don't conflate them)

**Product brand palette** — defined in `src/app/globals.css`. This is what the *app UI* runs on. Use these for "Echo speaks here" moments inside product surfaces:
- Primary: electric cyan `#00D4FF` (Tailwind: `bg-primary`, `text-primary`)
- Accent purple: `#B794F6`
- Accent pink: `#FF6B9D`
- Accent yellow: `#FFD93D`

**Character palette** — defined inside the mascot SVGs at `public/media/`. Used only when the *mascot itself* is rendered (deferred until proper design pass):
- Concrete body: `#D4C4B0`
- Mascot teal: `#3A8E9C`
- Lavender chest badge: `#B8A4D4`
- Sound-wave detail: `#5BADB8`

**The two are deliberately separate.** Product UI runs on cyan; the mascot has its own palette. When the character eventually shows up in product UI, both coexist — like Mailchimp's chimp doesn't pixel-match Mailchimp's UI. Both are still "Echo," at different layers.

## Five adjectives

1. **Familiar** — speaks like someone who knows your work
2. **Direct** — never wastes the user's time
3. **Warm and grounded** — kind, never twee; concrete-bodied, not bouncy
4. **Specific** — references the user's actual content, never generic praise
5. **Quiet** — present when needed, invisible when not

## What Echo is NOT

- Cartoony or chatty. The smile is small, the body is solid. No bouncing, no winking.
- An assistant. Echo is a partner, not a subordinate.
- A guru. Echo doesn't lecture.
- A salesperson. Real estate agents already are one.
- A "✨ AI ✨" gimmick. Never refer to Echo as "AI" in user-facing copy.

## Person & address

**Default: third person.** Echo is a referenced presence; the user is the protagonist.

- Echo found three places this sentence could land harder.
- Your voice is sharper today than last week.
- Echo pulled this from your March email.

**First person allowed only at peak emotion** (celebrations, apologies). Set off as direct quotes.

- Echo says: clean work. This is your sharpest week.
- Echo couldn't run the check this time. Trying again.

## Where Echo's presence shows up

Voice + teal accent + motion at the high-touch moments. No avatar yet.

| Moment | Presence signal |
|---|---|
| Receipt Card pending pulse | Cyan pulse dot before "Echo is reading…", plus the shimmer bar |
| Receipt Card "Echo speaking" banner | Cyan left-border, cyan-tinted background, Echo named in copy |
| Hemingway nudge in editor | Echo named in the copy ("Echo flagged this one…"); no separate icon |
| Onboarding banner | Cyan left-border banner, Echo named in copy |
| Voice-strength milestone | Echo named in the copy; cyan accent |
| Error toast where Echo is responsible | "Echo couldn't reach…" copy; cyan accent if we want to brand it |
| Settings, billing, plain navigation | No Echo. Echo is a presence at chosen moments, not a watermark. |

When we eventually design and add the full character, slot it INTO these moments — don't replace the voice/color/motion that's already carrying the load.

## Where Echo speaks

**High-touch only:**
1. Receipt Cards (all states)
2. Pending audit pulses
3. Hemingway nudges in the editor
4. Outcome Chips empty / loading states
5. Error toasts where Echo is responsible
6. Onboarding moments (welcome, first generation, voice milestones)

**Echo stays silent in:**
- Settings forms
- Billing
- Plain navigation
- Standard form validation ("This field is required")
- Anywhere Echo's voice would add a beat the user doesn't want

## Voice rules

**Do:**
- Reference provenance: "from your YouTube transcript", "in your last newsletter"
- Plain words: 6th-grade reading level (Hemingway middleware enforces this)
- Lead with the user's win: "Your post hit three of four moves."
- Apologize plainly when something failed: "Echo couldn't run the check this time."
- Be specific: "Pulled from your March email" beats "based on your data."

**Don't:**
- No em dashes in user-facing copy. Periods or colons instead.
- No starting sentences with "I" unless it's a peak-emotion quote.
- No praise without specifics. ("Great job!" → no.)
- No exclamation points in feedback copy. The welcome message is the only exception.
- Never refer to Echo as "AI." Echo is Echo.

## Examples (real strings, before → after)

| Surface | Before | After |
|---|---|---|
| Receipt Card pending | Expert is checking your post structure… | Echo is reading your post structure… |
| Hemingway sentence nudge | This sentence is a bit complex for social media. Try splitting it in two. | Echo flagged this one. It might be a mouthful for social. Try splitting it. |
| Hemingway disclaimer | Note: Industry terms (e.g., FollowUpBoss) can inflate this score. Focus on simplifying your sentences first. | Echo's read can inflate around industry terms like FollowUpBoss or MLS. Focus on simplifying sentences first. |
| Wall-of-text nudge | This is a wall of text. Try using bullets to make it scannable for busy professionals. | Echo: this is a wall of text. Try bullets so busy professionals can scan. |
| Outcome chip (Pre) | Pull in your Instagram, YouTube, or LinkedIn to seed your knowledge base | Show Echo where you already publish: Instagram, YouTube, LinkedIn. |
| Outcome chip (Pre) | Drop a topic and see what Echo can do | Drop a topic. Echo will draft something in your voice. |
| Outcome chip (Full) | See what's been generated and ready to ship | What Echo has built for you so far. |
| Error fallback | Failed to load integrations | Echo couldn't reach your integrations. Try again in a moment. |
| Audit failed alert | Couldn't run the structure check this time | Echo couldn't run the structure check this time |

## When in doubt

Read it aloud. If it sounds like a chatbot, it isn't Echo. If it sounds like LinkedIn marketing, it isn't Echo. If it sounds like a thoughtful colleague who's read your work and has ten seconds to say one true thing — that's Echo.

If a moment calls for visual presence, ask: would Echo's mini head feel right here, or would it be a watermark? If watermark, no Echo.
