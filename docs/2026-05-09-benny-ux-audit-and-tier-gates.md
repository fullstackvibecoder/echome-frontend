# Benny incident — UX issues, user-error patterns, and tier gating mismatches

**Date:** 2026-05-09
**Trigger:** Benny Wildey (free → comp Studio) sent a Loom video walking through three confusions plus received generic-sounding daily drafts.
**Outcome of investigation:** one shipped product bug (voice analyzer), several real UI/UX gaps, several user-error patterns the product fails to redirect, and a marketing/code tier-gating mismatch that affects every Echo customer.

---

## 1. Voice analyzer bug — SHIPPED FIX

- File: `src/services/voice/voice-analyzer.ts:267`
- Bug: `minRelevance: 0.1` passed to `getVoiceSamples` while using a uniform fallback query vector. Cosine scores cap ~0.05 with a uniform query, so every sample got filtered out.
- Blast radius: 60 users had chunks but no `voice_profiles` row. After today's fix + backfill + re-vectorize: 64 users now have working profiles, 3 genuinely-too-thin users skipped, 1 (Lion King script) intentionally skipped.
- Commits: `e9aea74` (analyzer fix), `e6899e9` (V2 cron gate fix).

---

## 2. UI/UX issues — REAL PRODUCT FIXES NEEDED

These are not user error. The product is failing the user.

### 2a. Carousel caption was read-only — SHIPPED FIX 2026-05-09
- File: `src/components/content-kit/CarouselEditorModal.tsx:609`
- Original behavior: `<PostCaptionBlock caption={...} fallback={...} />` was rendered without `onChange`, which per `PostCaptionBlock.tsx:48` (`const editable = !!onChange`) makes it a read-only `<div>`. The clip editor wired `onChange` correctly; the carousel editor didn't.
- Benny's symptom: "it's not letting me delete that, because I just don't want any, quote, like, uhm, hashtags." She was correct. There was no way to edit.
- Fix shipped:
  - Backend `PATCH /content-kits/:id` now accepts `carouselSuggestedCaption` and persists to `generated_carousels.suggested_caption` — commit `949b07d` (echome-platform-v2)
  - Frontend `CarouselEditorModal` wires local draft state + 600ms debounced PATCH on every keystroke — commit `46d078c` (echome-frontend)
  - VisualPostActions reads the live draft so "Post now" / "Schedule" use the user's edits, not the stale prop
  - Smoke-tested against carousel `fdd4bf4b` (Benny's): DB round-trip update/null-clear/restore all confirmed
- Followup (also shipped 2026-05-09): the reel editor (`ReelEditorModal.tsx:356`) had the same pattern. Now wired the same way:
  - Backend: `reelPostCaption` PATCH field, read-modify-writes `content_kits.content_reels.post_caption` JSONB. Commit `861eb6a` (echome-platform-v2). Smoke-tested against an existing kit with content_reels — JSONB merge preserves all sibling keys (cta_text, hook_text, generated_at, caption_script, segment_overlays, suggested_template), null-clear works, restore round-trips byte-for-byte.
  - Frontend: `ReelEditorModal` wires onChange + debounced PATCH. Commit `b5b7965` (echome-frontend).
- Followup (also shipped 2026-05-09): PostCaptionBlock affordance polish.
  - "(click to edit)" hint replaced with "(auto-saves while you type)" — the textarea is always rendered when editable so the old hint was misleading.
  - Saving indicator gets a Loader2 spinner. Save completion now shows a brief "Saved ✓" in success-green for 1.5s before fading back to the auto-save hint. Quieter reassurance than a "saving…" that just disappears.
  - Same commit `b5b7965` (echome-frontend), affects clip, carousel, and reel editors via the shared component.

### 2b. "Open Instagram" button reads like auto-publish
- File: `src/components/content-kit/PostCaptionBlock.tsx:79-84`
- Behavior: copies caption to clipboard, opens instagram.com in a new tab. Brightest button on the page (purple-red-orange gradient with 📸).
- Benny's symptom: "I clicked open Instagram, and it takes me now to my account here, but how do I, like, I thought, like, does it automatically transfer over, or do I have to copy and paste."
- Recommended fix: relabel to "Copy caption & open Instagram" OR show a one-time tooltip on first click: "We'll copy the caption and open Instagram. You'll upload the slides yourself."

### 2c. Schedule UI is invisible when no accounts connected
- File: `src/components/content-kit/VisualPostActions.tsx:230-246`
- Behavior: Schedule/Post panel renders even with zero connected accounts, but the platform picker is empty so all controls are disabled. There's no "Connect an account to enable scheduling" prompt.
- Benny's symptom: "this post option is not an op, like, on here, it would be great to schedule it."
- Recommended fix: when `connectedAccounts.length === 0`, show an inline prompt: "No accounts connected yet. Connect Instagram, LinkedIn, or Facebook in **Settings → Connections** to enable scheduling and auto-posting."

### 2d. No "what now?" panel after a kit is generated
- Benny generated a carousel and stared at it not knowing what to do next.
- Recommended fix: post-generation, show three side-by-side cards: **Edit** (caption + slides), **Post now** (with the IG copy-paste flow set up honestly), **Schedule** (with the Connections nudge if not connected).

---

## 3. User-error patterns — but the product *also* failed to redirect

These are the items where the user did something wrong, but the product missed an opportunity to catch and redirect them.

### 3a. Confused Instagram *import* with Instagram *connection*
- Benny did the Instagram IMPORT (Apify scrapes public posts → chunks for voice training). That established zero posting capability.
- He never visited Settings → Connections to do the Outstand OAuth flow that creates a `user_social_accounts` row and enables auto-posting.
- This is partly user error (he didn't explore the settings) but mostly a product failure — nothing in the import flow tells him "this is for content training, NOT for posting; for posting, also connect your account here."
- Recommended fix: after a successful Instagram import, surface a banner/toast: "Your Instagram content is now part of your voice profile. To post to Instagram from EchoMe, also connect your account in **Settings → Connections** (1 minute, separate from this import)."

### 3b. Didn't know free tier's auto-post had a quota gate
- Per code: `canAutoPost = freeGenerationsRemaining > 0` for free users (`useSubscription.ts:188-193`).
- Per marketing screenshot: Free lists "Auto-post to Instagram, LinkedIn & Facebook" as a flat feature with no caveat.
- The mismatch will bite any free user who exhausts their 5 free kits and then expects auto-post to keep working.
- Recommended fix: make the marketing copy match reality (e.g., "Auto-post to Instagram, LinkedIn & Facebook *during your 5 free kits*") OR change the code so free users keep auto-post indefinitely.

### 3c. Didn't read the carousel guide page
- File: `src/app/guides/carousels/page.tsx:109` — explicitly explains the copy-paste flow.
- He went straight to the editor without consulting docs. Reasonable behavior. The product has guide content but doesn't surface it contextually.
- Recommended fix: link a small "How to post this" inline help link inside the editor next to the Open Instagram button.

### 3d. May have a personal Instagram account (auto-post won't work even after connecting)
- Outstand limitation: only Business and Creator IG accounts can be auto-posted to. Personal accounts are blocked by Instagram itself, not us.
- Recommended fix: surface this caveat at connection time, not at first failed post. The Connections page should say "Instagram requires a Business or Creator account for auto-posting" before the OAuth click.

---

## 4. Tier-gating mismatches — marketing vs code

The marketing pricing page screenshot (taken 2026-05-09) and the actual gate code disagree in two material places.

| Feature | Free (page) | Free (code) | Echo $37 (page) | Echo $37 (code) |
|---|---|---|---|---|
| Auto-post to IG/LinkedIn/FB | ✅ listed | ⚠️ allowed only while `freeGenerationsRemaining > 0` | ✅ listed | ❌ explicitly blocked: *"Auto-posting requires Echo Studio. Your Echo plan can still schedule posts and receive email reminders."* |

**The Echo case is the worst.** Echo customers pay $37/mo, see auto-post in the feature list on the pricing page, then get a 403 error when they try to use it.

Code references:
- Backend gate: `src/middleware/subscription.ts:179-231` (`requireAutoPostAccess`)
- Frontend gate: `src/hooks/useSubscription.ts:188-202` (`canAutoPost`, `autoPostBlockedReason`)
- Tier ladder: `subscription.ts:18-27` (`TIER_LEVELS`)

**Recommendation:** marketing-as-truth. Relax the Echo gate so paying customers get what the page promises. Two options for Free:
- Option A: drop the quota gate entirely, let Free users auto-post indefinitely (matches the page literally)
- Option B: add a marketing footnote ("during your 5 free kits") to make the existing code match the page

This decision should be made deliberately. It affects revenue (Echo → Studio upgrade incentive partly relies on the auto-post gate).

---

## 5. What Benny's Studio comp upgrade actually unlocks

Per the screenshot, comparing his original Free state → comp'd Studio state:

| Feature | Free | Studio | Net change for Benny |
|---|---|---|---|
| Auto-post to IG/LinkedIn/FB | ✅ (with quota gate) | ✅ (no quota gate) | Removes the "until 5 free kits used up" caveat |
| Voice profile (basic) | ✅ | ✅ | Same |
| Deep voice matching with thumbs feedback | ❌ | ✅ | NEW |
| Reads YouTube/IG/blog/email/voice notes/PDFs | ❌ | ✅ | NEW |
| Reads full email history | ❌ | ✅ | NEW |
| Creator Radar with deeper insights | ❌ | ✅ | NEW |
| Built-in teleprompter | ❌ | ✅ | NEW |
| Priority processing | ❌ | ✅ | NEW |
| Content calendar with email reminders | ❌ | ✅ (implied) | NEW |

**BUT** — none of these auto-unlock the actual posting. He still has to go to Settings → Connections and OAuth his social accounts. The tier gate is one layer; the connection is a separate, mandatory step.

---

## Action items for the team

**Engineering (this week):**
1. Fix 2a (caption editability affordance) — small, high-value
2. Fix 2b (Open Instagram button labeling) — small, high-value
3. Fix 2c (Schedule UI empty state) — small, high-value
4. Add post-Instagram-import banner per 3a — small, prevents future Bennys

**Engineering (this month):**
5. Decide and ship the Echo auto-post gate fix per section 4
6. Build the post-generation "what now?" panel per 2d
7. Surface Business-vs-Personal IG caveat at connection time per 3d

**Comms:**
- Benny gets a personal email (separate doc) reflecting the corrected understanding
- The 63-user recovery broadcast is unaffected; the gating mismatch isn't tied to the voice bug
