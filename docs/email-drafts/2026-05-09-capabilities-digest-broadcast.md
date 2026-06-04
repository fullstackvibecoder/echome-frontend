# SUPERSEDED — DO NOT SEND
# Replaced by: 2026-05-09-launch-update-broadcast.md
#
# This standalone capabilities digest was consolidated into the launch
# update broadcast — see that file for the version that actually ships.
# Sending both would be too much comms for the same week.
#
# ---
#
# Email — capabilities digest to all users

**To:** all `users` rows where `email_marketing_consent` (or equivalent) is true. ~180 users.
**From:** EchoMe marketing sender (the usual one)
**Reply-To:** ara.mamourian@tryechome.com, support@tryechome.com

> Marketing send, not personal. Celebratory tone, brief, no apology, no admission of bugs. Replies still come to a real human. The recovery email goes out separately to the affected 63.

---

## Subject line options

1. What's new in EchoMe (last few weeks)
2. Three new things in EchoMe + a bunch of polish
3. EchoMe got faster, smarter, and more yours

Recommended: **#3** — concrete, three-beat rhythm, "yours" lands for the agent audience.

---

## Body

Hi {{first_name}},

Quick rundown of what's shipped in EchoMe in the last few weeks. If you haven't logged in lately, this is a good week to.

**Drafted For You — your inbox, every morning**
Three fresh draft angles pulled from your knowledge base, sitting in your dashboard before you've had your coffee. Open the ones that hit, ignore the ones that don't. No prompting required.

**Carousel editor, completely redone**
The new branded-overlay style is the default. Click any frame to swap the background photo. Pick which word in the headline pops red. Edits show up in the live preview without you having to hit re-render. Faster, less fiddly, and the output looks more like Instagram-native design.

**Talking-head teleprompter**
Pull up any generated script, hit record, and your phone or laptop becomes a teleprompter. Live WPM, camera zoom, eye-line guide, pause and resume. The recording auto-attaches back to your kit so you can post or schedule it directly. No second app, no copy-pasting scripts into Notes.

**More free runs**
We bumped the free tier from 2 generations to 5 content kits. If you've been hitting the wall early in the month, that wall just moved.

**Plus a bunch of smaller stuff:**
- Mind-Reader chip in KB chat suggests angles with one-click generate buttons
- Hemingway-style readability hints inside the post editors
- Drag-to-position captions and editable transcripts in the clip editor
- Cleaner pricing pages, simpler positioning, faster onboarding for returning users
- Mobile fixes across navigation, FAQ, footer

Log in and poke around. If something doesn't make sense or you'd like to see X, just reply.

Ara
EchoMe

---

## Why this version

- ✅ Lead with three concrete capabilities, not a bullet list of 12 things
- ✅ Each headline is one short paragraph that explains the *why*, not just the *what*
- ✅ "More free runs" lands without any defensive language about pricing
- ✅ "Plus a bunch of smaller stuff" handles the long tail without padding
- ✅ Closes with an invitation, not a CTA — agents respond to "poke around" better than "click here"
- ✅ No bug acknowledgment — that's the recovery email's job, not this one
- ✅ Signed "Ara" + "EchoMe" so it feels personal but obviously a broadcast

## Mail-merge fields

- `{{first_name}}` — same logic as recovery email. Fallback `there`.

## Suggested send context

- Send Tuesday or Wednesday morning, NOT Monday — Monday inboxes are flooded; mid-week opens are higher
- Send AFTER the recovery email lands (so affected users have already had the personal note land first)
- Use the Resend marketing template if you have one with hero image; otherwise plain HTML is fine and arguably more personal
- Tag with `category=capabilities-digest-202605` for tracking
- Don't BCC. Don't add a giant header banner. Don't link to a "schedule a call" button — this is a re-engagement nudge, not a sales push.

## Suggested order of operations this week

1. **Tonight or tomorrow morning (Sat 2026-05-10):** Send Benny's personal email
2. **Saturday 06:00 UTC:** First V2 cron run with fixed analyzer + working gate. Eyeball Benny's resulting drafts in the admin view to verify they sound like him before any broadcast goes out.
3. **Sunday or Monday morning:** Send the 63-user recovery email
4. **Tuesday or Wednesday morning:** Send the capabilities digest to everyone (~180 users)

That sequencing means: Benny gets a personal note first, the affected cohort gets warmer follow-up while the proof is still fresh in their drafts, then the broader celebration goes to everyone without overlap.
