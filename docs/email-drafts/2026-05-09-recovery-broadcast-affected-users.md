# SUPERSEDED — DO NOT SEND
# Replaced by: 2026-05-09-launch-update-broadcast.md
#
# Original framing was a separate apology to the 63 voice-bug-affected
# users. Consolidated into a single all-users launch update per direction
# 2026-05-09 — "education/update moment, not something the user should
# know they were affected by." Sending both this and the launch update
# would be too much comms.
#
# ---
#
# Email — recovery note to 63 users with rebuilt voice profiles

**To:** 63 users with `voice_profiles.updated_at` >= 2026-05-09 00:00 UTC, excluding `benny@wildeyrealestate.ca` (gets his own personal note)
**From:** ara@thespringteam.ca (personal address, not marketing domain)
**Reply-To:** ara.mamourian@tryechome.com, support@tryechome.com

> Personal-ish broadcast. Same voice as the Benny note — honest, brief, signed "Ara". Use mail-merge for first name only.

---

## Subject line options

1. Your drafts just got smarter (and a quick honest note)
2. About the drafts you've been getting from us
3. Found a bug, fixed it — your drafts will read differently tomorrow

Recommended: **#3** — leads with action and warm honesty without being apologetic.

---

## Body

Hi {{first_name}},

Quick honest note. If the drafts EchoMe has been sending you lately have felt generic, that wasn't you. That was a bug on our end.

The short version: you imported your content, but a setting in our voice analyzer was filtering it out before the system could learn from it. It had your material and acted like it didn't, so generation pulled generic real-estate copy to fill the gap.

Found it today, fixed it, and rebuilt your voice profile from your actual content. Tomorrow's drafts will pull from what you've already given us. They should sound more like you and less like a template. If they don't, just reply and tell me.

If you want them to get sharper faster, any one of these helps:

- Paste two or three of your recent posts into the app (any platform)
- Type a short paragraph in your own words about how you talk to clients
- Record a quick voice memo on your phone (2-3 minutes, anything real-estate) and email it to me, I'll get it in for you

Sorry for the noise the last few weeks. The fix is live now and your next draft batch will be the proof.

Ara

---

## Mail-merge fields

- `{{first_name}}` — derived from `users.display_name` or `users.full_name`, first token. Fallback: `there` if neither is set.

## Why this version

- ✅ Lead with the symptom they may have noticed (generic drafts), then own the cause
- ✅ Plain, no jargon (no "knowledge base", "voice profile", "Pinecone")
- ✅ Doesn't gaslight ("you may have noticed") and doesn't over-apologize
- ✅ Honest about the timing ("the last few weeks") without being precise enough to alarm anyone
- ✅ Three concrete actions, framed as "sharper faster" not "do this or it won't work"
- ✅ Closes with a verifiable promise (next batch will be the proof)
- ✅ No em dashes; signed "Ara"

## Suggested send context

- Send via Resend with the same domain/from-address you use for personal correspondence, NOT the EchoMe marketing sender
- Reply-To routes to ara.mamourian@tryechome.com + support@tryechome.com so replies land in the support flow
- Send Monday morning (2026-05-12) if possible — gives users a chance to log in after weekend, see fresh drafts, then receive the email explaining why those drafts read differently
- If sending tonight or tomorrow, the Saturday cron run should produce visibly different drafts before they read this. That's actually ideal — proof first, explanation second.
- Tag the send with `category=voice-recovery` in Resend metadata so you can track open/reply rates separately from the marketing digest

## Who to EXCLUDE from this send

These users are technically in the "had no voice profile yesterday" cohort but should NOT receive this recovery email:

- **benny@wildeyrealestate.ca** — has his own personal email already drafted (`2026-05-09-benny-onboarding-recovery.md`)
- **brendonandshannonjones@gmail.com** — KB content totals 345 chars across 5 onboarding stubs; calling tomorrow's drafts "your voice" would be dishonest
- **therdkagency@gmail.com** — single 18-char chunk; same issue
- **saraauclair@videotron.ca** — single 88-char WBTW bio; same issue
- **nileshchilka1@gmail.com** — KB is the Lion King script he uploaded as a "writing sample"; tomorrow's drafts would read like Mufasa

The 4 above are better served by a separate "looks like your KB is empty, here's how to populate it" nudge — not in scope for this batch.
