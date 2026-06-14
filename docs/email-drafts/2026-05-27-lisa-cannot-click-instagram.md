# Reply to Lisa Turcotte — "can't click on Instagram in my library"

**To:** lisaturcottesells@gmail.com
**From:** ara.mamourian@tryechome.com
**Reply-To:** ara.mamourian@tryechome.com, support@tryechome.com
**Subject:** EchoMe — what's going on with your Instagram (and a fix I just shipped)

---

Hi Lisa,

You're not crazy and you haven't done anything wrong. I pulled your account and there are two things tangled together here. I'll be straight with you about both.

**1. The carousel editor was throwing away your edits.**

When you opened the editor to tweak a slide before posting, anything you typed could get wiped a moment later if the page refreshed in the background. From your side it would look like the text reverted on its own. If you then clicked Post Now, the original AI version went out instead of your edit. John reported the same thing this morning — different user, same bug.

I pushed a fix to production about an hour ago. It's a small change but it closes the exact gap. Could you try once more — edit a slide, give it a couple seconds for the "saving…" indicator to settle, then click Post Now from the same screen? It should hold your edits now.

**2. The Instagram tab in the kit is confusing, and that's on me.**

When you click the Instagram tab inside a content kit, you see the caption and an edit box, but there's no Post button. That's intentional but unexplained: Instagram won't accept text-only posts, so we removed that button on May 23rd. The path to actually post to IG is to open the carousel image instead — that's where the Post Now / Schedule buttons live, because the carousel carries the slides Instagram needs.

I should have left a clearer signpost on the Instagram tab pointing you to the carousel. I'm fixing that this week so this stops being a guessing game.

**What to do right now:**

1. Open any of your recent kits (the Airdrie repurpose from tonight, or any of the Hidden Gems / Calgary Housing ones).
2. Scroll to the **carousel** section (the image with the slides), not the Instagram caption tab.
3. Click the carousel to open the editor.
4. Edit whatever you want, wait a second for the save indicator.
5. Click **Post Now** at the bottom of that editor.

If anything still doesn't click or load, screenshot it and reply to this email. I'll dig in same day.

I owe you a smoother experience. Sorry this has been a slog since you paid — the platform is much better than your last couple of weeks have shown.

Ara
