# Email — Benny Wildey (onboarding recovery)

**To:** benny@wildeyrealestate.ca
**From:** ara@thespringteam.ca (or your usual personal address)
**Reply-To:** ara.mamourian@tryechome.com, support@tryechome.com

> Personal note, not a marketing send. Plain language, no em dashes, signed "Ara".

---

## Subject line options

1. Re: your video. Three answers and a thank-you offer.
2. Got your video. Here's what changed.
3. Your three questions, answered. Plus a small thank-you.

---

## Body

Hi Benny,

Got your video. Thanks for sending it, easily the most useful feedback I've had this month. Let me answer your three questions in order, then I'll explain why your drafts have been reading so generically and what we just fixed.

**1. Deleting the hashtags from the caption.**
Honest answer: when you filmed your video, the Post caption field was actually read-only in the carousel editor. You weren't doing anything wrong, the feature just didn't exist yet. We shipped the fix this evening as a direct result of your video. Open any carousel now and the Post caption field below the slides is a normal text box. Delete the hashtags or rewrite the whole thing, and it auto-saves while you type.

**2. Posting to Instagram.**
The "Open Instagram" button does two things: it copies your caption to your clipboard, and it opens Instagram in a new tab. It does NOT upload the slides for you. The honest flow today is: download the slides from the editor, open Instagram, upload the slides as a new post, then paste the caption. Three steps, not one. We're going to relabel that button so the behavior is clearer.

**3. Scheduling and auto-posting.**
This was actually available on your free account too. You just hit a step that wasn't obvious. When you imported your Instagram into EchoMe, that was for **content training** (so the AI could learn from your posts). That's different from **connecting Instagram for posting**, which is a separate one-time setup. Our app does a poor job distinguishing the two, and that's on us.

To turn on scheduling and auto-posting for your @bennywildey account:
- Go to Settings → Connections in EchoMe
- Click Connect on Instagram
- Sign in with @bennywildey when prompted

One thing worth knowing: Instagram only allows auto-posting from **Business or Creator accounts**, not personal ones. That's Instagram's rule, not ours. From the look of your profile (the "Calgary Realtor | Calgary Real Estate | Real Broker" name format), you're almost certainly already on a Business or Creator account, in which case it will just work. If for some reason it doesn't connect, switching to Business is free and takes about 30 seconds inside the IG app.

**Now the bigger thing. Those drafts in your inbox this morning.**
They sounded like every other agent, not like you. That was a bug on our end, not anything you did. You imported your Instagram posts and they landed in our system fine, but a setting in our voice analyzer was filtering out your own writing before the system could learn from it. Net effect: it had your content and acted like it didn't.

Found it today, fixed it, and rebuilt your voice profile from your actual posts. Tomorrow morning's drafts will pull from what you've actually written. If they still feel off, just reply.

**A small thank-you when you're ready to subscribe.**
Your video genuinely helped me find and fix problems that were hurting other users too, so I want to do something real to thank you. Whenever you're ready to move off the free plan, subscribe to **Echo ($37/mo)**, our entry tier. Reply and let me know once you have, and I'll bump you up to **Echo Studio** ($87/mo) at no extra cost on my end. You'd be paying $37, getting Studio features. No expiration. Just a thank-you.

No pressure or timeline. The free plan keeps working as is.

Thanks again for the video. The kind of feedback that gets things fixed instead of buried.

Ara

---

## Why this version

Lens checks (per `docs/2026-05-06-tll-methodology.md`):

- ✅ Leads with her questions in her order. She sent a Loom with three concrete asks; the email answers each before pivoting to anything else
- ✅ Demonstrates we already know her: uses her IG handle (@bennywildey) directly, references the exact bio format, doesn't ask for info we have
- ✅ Plain English, no jargon. "Click into the post caption text" not "edit the textarea"
- ✅ Honest about the limits. IG auto-posting depends on account type; doesn't oversell the schedule feature
- ✅ The voice-bug explanation is intentionally BELOW her three answers, because that's our problem to be embarrassed about, not the lead
- ✅ The thank-you is conditional and honest. She subscribes to Echo ($37); we comp the difference to Studio ($87). She gets $50/mo of value; we lock in a paying customer. Both sides win, no hand-out
- ✅ No-pressure framing on the offer. "No timeline. The free plan keeps working as is." Doesn't manufacture urgency
- ✅ No call-to-action asking her to reply with information we have, schedule a Zoom, or do anything beyond log in
- ✅ Thanks for the video at top AND bottom. The report itself was valuable
- ✅ No em dashes; signed "Ara"

---

## What's true that backs up the email

**On the voice bug:**
- 58 chunks of Benny's actual Instagram captions are in our system (ingested 2026-05-06 from `https://www.instagram.com/bennywildey/`)
- Her `voice_profiles` row was missing because `voice-analyzer.ts:267` passed `minRelevance: 0.1` while using a uniform fallback query vector (cosine scores against real embeddings cap at ~0.05, every sample filtered out)
- Fix shipped in commit `e9aea74` (echome-platform-v2)
- Voice profile rebuilt for her: 20 samples, 15 signature phrases, 8 tone markers (verified 2026-05-09 18:15 UTC)
- Tomorrow's V2 cron has a working gate that won't email anyone without a `voice_profiles` row (commit `e6899e9`)

**On her three product questions:**
- Caption editing: When she filmed the video, the carousel editor's PostCaptionBlock was rendered without `onChange`, so it was display-only (`PostCaptionBlock.tsx:130-140` only renders a `<textarea>` when `onChange` is passed). She was correct that there was no way to edit. **Fixed and shipped 2026-05-09:** backend `PATCH /content-kits/:id` now accepts `carouselSuggestedCaption` and persists to `generated_carousels.suggested_caption` (commit `949b07d` echome-platform-v2); frontend `CarouselEditorModal` now wires `onChange` with a 600ms debounced PATCH (commit `46d078c` echome-frontend). Smoke-tested against her actual carousel (DB write/clear/restore round-trip) — works. Visual treatment of the textarea unchanged for now (still uses default border); could harden affordances later.
- Open Instagram: `PostCaptionBlock.tsx:79-84` copies caption to clipboard and opens `https://www.instagram.com` in a new tab. No automated upload. Slides have to be downloaded separately and uploaded manually. The behavior is described on `src/app/guides/carousels/page.tsx:109` but the help page is not surfaced from inside the editor.
- Scheduling: `VisualPostActions.tsx` exists with full scheduling UI via `api.socialPosting.scheduleFanout` (line 144) into Outstand. But it requires a row in `user_social_accounts` first, which Benny does not have. She has 0 posting connections. Her Instagram **import** (Apify scrape) is unrelated to her Instagram **connection** for posting. Different code paths, different OAuth, different table.

**On the thank-you offer:**
- Benny is on `subscription_tier: 'free'` as of 2026-05-09 23:04 UTC (was briefly comped to studio earlier today, rolled back per direction)
- No Stripe customer record (verified against live Stripe by email + metadata + checkout history; total live customers = 50, zero benny/wildey matches)
- The offer pattern: she subscribes to Echo at $37/mo via normal checkout → Stripe webhook updates `subscription_tier` to `pro` → she replies to Ara → Ara manually updates `subscription_tier` to `studio` (the same DB-only operation we just rolled back, this time keyed off her paid Echo subscription)

**On her Instagram account type:**
- Public IG profile fetched 2026-05-09: name format "Calgary Realtor | Calgary Real Estate | Real Broker"
- The multi-descriptor naming pattern is strongly characteristic of Business or Creator accounts. Personal accounts almost never use this format
- Confidence is high but not 100%. The email hedges accordingly: "almost certainly already on a Business or Creator account, in which case it'll just work. If for some reason it doesn't connect..."

---

## Suggested send context

- Send from your personal address, not a marketing domain — this should land like a one-off note, not a campaign
- Don't BCC, don't attach screenshots, don't link to a marketing page
- If he replies, treat it like a real conversation; if he doesn't, that's fine — tomorrow's drafts should be visibly different and that may be enough
- If you want belt-and-suspenders: log in as Benny tomorrow morning after the 06:00 UTC cron, eyeball the new drafts, and confirm they actually sound like him before assuming the fix landed
