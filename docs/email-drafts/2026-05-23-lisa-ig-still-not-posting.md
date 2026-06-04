# Reply to Lisa Turcotte — IG posts still not going through (real diagnosis)

**To:** lisaturcottesells@gmail.com
**From:** ara.mamourian@tryechome.com
**Reply-To:** ara.mamourian@tryechome.com, support@tryechome.com
**Subject:** EchoMe — what's actually happening with your Instagram posts

---

Hi Lisa,

I dug into your account just now and you're right, something is off. Two different things are happening and I want to be straight with you about both.

**1. Three of today's posts never made it to your Instagram.**

Between roughly 11:00 and 11:35 your time this morning, we sent four carousels to Instagram. Outstand (our posting partner) confirms Instagram accepted all four and returned post IDs. But when I query Instagram directly just now, your account only has ONE post from today. The other three don't exist on your timeline.

The most likely cause is Instagram's duplicate filter. Two of those carousels were the Hidden Gems kit, two were the Finding Your Perfect Real Estate kit, and they went out within minutes of each other. When the same content gets reposted that quickly, Instagram's spam systems drop the duplicates without telling our posting partner. Our calendar still reads "Posted" because we never get a "we removed it" signal back.

The one that did survive is here: https://www.instagram.com/p/DYr7NzpDjqG/

**2. A real bug on our end, now fixed.**

Four other posts today (and one from yesterday) failed with "media file required". I traced these to a button in EchoMe that shouldn't have existed: under each Instagram caption, there was a "Post to Instagram" option that sent only the text. Instagram doesn't accept text-only posts, so every click became a failed row a few minutes later. That's our bug, not yours.

I just pushed a fix. The button is gone, and a second guard on the backend rejects this shape upfront if it ever sneaks back. Going live within the hour. To post Instagram content going forward, use the Post / Schedule buttons under the carousel itself (which carry the slides), not the ones under the caption text.

**What I'd like you to do:**

Wait an hour, then refresh. Once the fix is live, post Instagram content using the Post / Schedule buttons under the carousel section of each kit, not under the caption text. The phantom-failed rows you saw today shouldn't repeat.

If you want fresh content on Instagram before that, I can manually push one of your kits from my side this afternoon. Tell me which one (Hidden Gems, Finding Your Perfect Real Estate, Real Estate Market Navigation Guide, or the Airdrie one) and I'll handle it personally. And please don't repost the same kit twice in a short window. Instagram's dupe filter will eat one of the two even when the technical post succeeds.

**The 3 old Airdrie failures from 2026-05-20:**

Cleared. They were stuck on a bug we already fixed but the old rows kept showing red. Refresh your calendar and they're gone.

I owe you a working integration. Sorry this has been such a slog.

Ara
