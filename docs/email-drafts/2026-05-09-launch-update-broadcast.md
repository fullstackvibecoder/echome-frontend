# Email — consolidated launch update + capabilities digest + thank-you grant

**To:** all users (~224)
**From:** EchoMe marketing sender (the usual broadcast address)
**Reply-To:** ara.mamourian@tryechome.com, support@tryechome.com

> Replaces the two earlier drafts (recovery broadcast + capabilities digest). Single email to everyone. Educational/update tone, not a personal apology — Daily Drafts is so new that most users don't have a baseline expectation of "drafts that sound like me" yet, so this reads as a launch update with the bug-and-fix story baked into the launch context.

---

## Subject line options

1. Daily Drafts launch update + a thank-you for being here
2. New: Daily Drafts in your inbox + a thank-you grant
3. What's new in EchoMe (and a thank-you for the early bumps)

Recommended: **#1** — leads with the new feature, hints at the gift, balanced.

## Preheader text

We launched Daily Drafts, hit a few bumps, fixed them — and unlocked a stack of features for everyone currently on the platform.

---

## Body

Hi {{first_name}},

Quick update on what's new in EchoMe over the last few weeks, plus a thank-you that doesn't require any action from you.

**Daily Drafts is now live.**

A few mornings a week, you'll find three fresh draft angles in your inbox, pulled from your knowledge base before you've had your coffee. Open the ones that hit, ignore the rest. No prompting required.

**Honest note about the launch.**

The first few weeks of Daily Drafts hit a couple of bumps that we caught and fixed this week. The biggest one: a setting in our voice analyzer was filtering out users' own writing before the system could learn from it, so for some users the early drafts came out sounding generic. We fixed the analyzer, rebuilt the affected voice profiles automatically, and tightened the guard so it can't happen again. Tomorrow's drafts will pull from what you've actually written.

**While we were in there, a few other things shipped:**

- **Carousel editor, redone.** Click any frame to swap the background photo. Pick which word in the headline pops red. Edits show up in the live preview without re-rendering. Caption is now editable directly inside the editor.
- **Talking-head teleprompter.** Pull up any generated script, hit record, your phone or laptop becomes a teleprompter. Live WPM, camera zoom, eye-line guide, pause and resume. The recording auto-attaches back to your kit.
- **Mind-Reader chip in KB chat.** Surfaces fresh angles with one-click generate buttons.
- **Hemingway-style readability hints** inside the post editors.
- **Free tier bumped from 2 to 5 content kits.**
- **A bunch of mobile and onboarding fixes** across navigation, FAQ, footer, and the post-signup flow.

**A thank-you for being here through the bumps.**

We've turned on a stack of features for everyone currently on the platform, regardless of plan: auto-posting to Instagram, LinkedIn and Facebook, deeper voice matching, the teleprompter, priority processing, the full content calendar. No expiration. Nothing for you to do, just log in and they're there. Consider it a thank-you for sticking with us through the early-launch friction.

Log in and poke around. If something doesn't make sense or you'd like to see X, just reply to this email.

Ara
EchoMe

---

## Why this version

Lens checks (per `docs/2026-05-06-tll-methodology.md`):

- ✅ Educational/update tone, not personal apology. Daily Drafts is the lead because it's the actual new thing; the bug story is folded into the launch context where it reads as "early-feature growing pains" rather than "we let you down"
- ✅ No segmentation. The 63 voice-bug-affected users see this in the context of a broader product update, not as a singled-out apology that draws attention to a problem they may not have noticed
- ✅ The thank-you grant is real and unlocks-on-login (zero friction, zero CTA confusion)
- ✅ "Honest note about the launch" subhead does the heavy lifting on accountability without requiring readers who weren't affected to feel implicated
- ✅ No em dashes in the body
- ✅ Marketing sender, with Reply-To routing to ara.mamourian@tryechome.com + support@tryechome.com so replies land in the support flow
- ✅ Single short reply CTA at the end, no upgrade pitch, no calendar link

## Mail-merge fields

- `{{first_name}}` — derived from `users.display_name` or `users.full_name`, first token. Fallback `there`.

## Suggested send context

- Send from the standard EchoMe marketing sender, NOT ara@thespringteam.ca (this is product/marketing news, not a personal note)
- Tag with `category=launch_update_202605` for tracking
- Go Tuesday or Wednesday morning (high-open windows; avoid Monday inbox flood)
- Don't BCC, don't add a giant header banner, no upgrade buttons
- The 63 voice-bug-affected users will read this and recognize their drafts will read differently going forward — that's enough acknowledgment without singling them out

## What this replaces

The two earlier drafts in this folder are now superseded:
- `2026-05-09-recovery-broadcast-affected-users.md` — was a separate apology to the 63 affected users; consolidated into this one
- `2026-05-09-capabilities-digest-broadcast.md` — was a separate "what's new" digest; consolidated into this one

Don't send those; send this one only.
