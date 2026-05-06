# TLL Methodology Enrichment — Beyond the Distillation

**Purpose.** This document captures detail from the 48 TLL training transcripts that did not survive the compression into the four `corevaluedeepdive/` specs (9-Point Conversion Engine, Outcome-Aware Filters, Authority Pipeline, Zero-Step UI). It is written for two readers: Ara (founder), who already knows the high-level frameworks and wants the deeper layer; and Echo (the runtime LLM), which can pull these as system-prompt snippets when generating or auditing posts. Anti-aggression material — the guardrails most relevant to fixing past "too aggressive" generation behavior — is flagged **[CRITICAL — anti-aggression]**. Every meaningful claim is tied to a transcript filename so it can be traced back.

---

## 1. Anti-patterns and tuning specifics

These are the things Jess and the TLL team actively warn against. Each is a candidate for a hard filter, a soft warning, or a system-prompt negative example in Echo.

- **[CRITICAL — anti-aggression] Hard CTAs on personal content are disqualifying.** *"We never want to use a hard CTA on personal content. It will come across super disingenuous and salesy... I want to tell a vulnerable story about my childhood. And hey, I'm a realtor book a call. Obviously that doesn't fit together."* (`CTAs How to When to.txt`). Echo should detect personal-content categories and strip any "book a call / download my guide" CTA, replacing with a soft engagement question.

- **[CRITICAL — anti-aggression] "Should I always use a call to action? The answer is no."** *"Once you get comfortable writing content, it becomes super clear which posts need one and which don't... You want to give value without always asking for something in return."* (`CTAs How to When to.txt`). The distillation's 9-point sequence implies every post ends in Action; this transcript explicitly says *no*. Echo should default to "no CTA" on a meaningful share of generations and especially on personal-philosophy posts.

- **[CRITICAL — anti-aggression] Authority content gets less engagement, and that is correct.** *"Your personal content will always get more engagement than the authority content... but the authority stuff is what's like in the background building, building you as authority... don't let those vanity metrics play with your head."* (`Don_t_Be_A_Secret_Agent_V1.txt`). Past aggressive systems likely over-indexed on engagement-bait. Echo should not reward or upweight high-engagement formats at the expense of authority pieces.

- **[CRITICAL — anti-aggression] "Just listed" Canva templates with heavy branding are explicitly rejected as white noise.** *"The just listed canvas templates with the heavy branding and the cut out... feel very salesy... they're just gonna become white noise to your audience. And if that's all you're posting, especially if you do a lot of that, this might be irritating to people... and they might unfollow you."* (`Think_HGTV_not_Just_Listed_V2.txt`).

- **[CRITICAL — anti-aggression] Heavy text/branding/distracting music on video makes it look like an ad.** *"Your videos shouldn't have text so there's no heavy branding and that kind of thing or distracting music in the background. We don't want it to feel like an ad"* (`Think_Outside_the_Box_V1.txt`). Subtitles are the exception.

- **[CRITICAL — anti-aggression] Don't lead with the root cause; lead with the symptom they recognize.** *"You're the doctor who can look at someone and immediately know that their headaches are caused by the fact that they've got a blood clot in the brain... If the doctor went out and someone came into their office and said, well, it's probably a blood clot. The patient is going to freak out... they just have a headache and need some aspirin"* (`M1_Message_Mapping_Training_V2.txt`). Aggressive AI tends to jump straight to the diagnosis. Always start at the headache.

- **Don't force a niche fit.** *"There's going to be the very odd post that isn't necessarily going to speak to your niche, because it's something that's going to apply to every niche... if you're trying to force it to speak to just your niche... I think it's okay to have those... don't force ones like that"* (`Think_Outside_the_Box_V1.txt`). Echo should NOT shoehorn niche language into every post.

- **Don't stuff hashtags or keywords unnaturally.** *"We don't want to make our copy sound weird by just throwing in niche and location words wherever"* (`Insta_Insights_mp4_V1.txt`). And on hashtags: *"hashtag Toronto realtor, hashtag Toronto real estate... but beyond that, don't spend a lot of time on this."* (`Posting Guidelines (2025).txt`).

- **Stock photos are a hard no on social.** *"Absolutely no stock images should be used at all on your social media. There's a time and place for stock images, but it is not on Instagram, it's not on Facebook, it's not on TikTok, it's not on LinkedIn."* (`Posting Guidelines (2025).txt`).

- **Don't overcomplicate the offer.** *"If you overcomplicate it, include tons of stuff because you want to give them lots of value, they're going to have tons of stuff on their mind when you have that commission conversation."* (`M1 Commission_Rates_Services_V2.txt`).

- **Don't post at midnight / off-hours.** *"We're not posting at midnight. That's going to kill the reach of your post."* (`Posting Guidelines (2025).txt`).

- **Don't speak only to the top-3% (ready-now buyers/sellers).** *"The majority of people in real estate are only speaking to the top 3% of their audience and those people probably already have an agent."* (`How_to_Double_your_Audience_V1.txt`). Aggressive lead-gen prompting tends to write only for the buyer-now segment. Don't.

- **Don't introduce yourself at the top of a video.** *"Introducing yourself is the waste of time. We got to just dive in"* (`Think_Outside_the_Box_V1.txt`). Reinforced in `Editing_Basics_V1.txt`: *"is my intro a little bit like repetitive... how can I just crop it so that we're really diving in".*

- **Don't repurpose seasonal/market content out of season.** *"You don't want to repurpose something seasonal in the wrong season. Likewise, you wouldn't want to repurpose something that was market specific if the market has since shifted."* (`Repurposing Content.txt`).

- **Don't go viral. Viral = wrong audience.** *"Viral content is not going to help you grow an ideal audience... anybody who found her account through that viral video was not an ideal client."* (`How_to_Double_your_Audience_V1.txt`). Echo should NOT optimize for virality, trending sounds, or trending audios as a primary objective.

- **Don't post the wrong format for the platform.** *"If you post anything in a format that's not been designed for the platform you're posting it on, it's going to signal to your audience that you don't really know what you're doing."* (`Think_HGTV_not_Just_Listed_V2.txt`). Specifically: 9:16 for video, never landscape on social.

---

## 2. Personal-story prioritization rules

Distillation captured "use faces / personal angle." It did NOT capture WHEN to surface a personal story or when to suppress one.

- **Personal stories must connect to a lesson, philosophy, or niche-relevant truth — they are not journal entries.** *"It's just insight into who you are as a human being and... mentioning those points that might be points of contention... or points of connection... to someone who could be your client."* (`Don_t_Be_A_Secret_Agent_V1.txt`).

- **The "best stories" filter — what makes a personal story post-worthy:** highlight stories from the brand-story braindump where (a) the niche will relate, (b) the story defines core values, or (c) the facts of the story led the agent toward real estate. *"Highlight those... and then if there's some stories or like here's the the facts of my life that led you to real estate."* (`M1 Q&A- Brand Story Braindump.txt`). Echo can score a candidate story against these three traceable criteria.

- **Don't force a story when none fits.** *"If you're struggling, don't force it, just still tell the story."* (`Case_Studies_vs_Just_Sold_V2.txt`, on case studies that don't fit the niche — same logic applies). And: *"What's happening in your life during those times of when you transitioned into real estate is probably more interesting... than the transition itself"* (`M1 Q&A- Brand Story Braindump.txt`).

- **Personal posts on LinkedIn must always link back to a philosophy, lesson, or business connection.** *"On LinkedIn, when you do something more personal, I would always try to connect it back to like what's a lesson that you learned. So a little bit more like personal philosophy."* (`Don_t_Be_A_Secret_Agent_V1.txt`).

- **Vulnerability is gated by experience.** *"There are always options to get a little bit vulnerable if you have something that maybe it wasn't such a good memory. But those can be generally harder to write about and if you're newer to content you might not be there. So I do recommend focusing on the kind of good things to start with."* (`M1 Q&A- Brand Story Braindump.txt`). Echo should not push vulnerability prompts on new users.

- **Lifestyle is the hardest personal category.** *"This is the category that people tend to struggle with the most when it comes to personal content... it's hard for us to think about what we do when we're not working because as agents you're you are always working"* (`M1 Q&A- Brand Story Braindump.txt`). Echo should be especially generous with prompts in the lifestyle category (delete-all-but-3-apps test, ideal day, morning/night routine).

- **Categorize each personal story before deciding placement.** People-that-shaped-you → personal philosophy; first-money-memory → personal philosophy or personal story; happy-place → personal story; favorite-kid-memory → personal story; routines → lifestyle. (`M1 Q&A- Brand Story Braindump.txt`). Echo can use this taxonomy to slot suggestions.

- **Carousel mid-slide spikes mean go deeper on that exact beat.** *"The spikes in this one are kind of unlike quite a few mine, there's quite a lot or more I should say in the middle... right after I talked about how the biggest takeaway was that I have to like get over myself and my expectations... that obviously like resonated with people on a deeper level... so that's telling me that I need to be a little bit more vulnerable"* (`IG Insights - When People Like your Content.txt`). Echo, given engagement insight data, should suggest "do more of [exact beat]" rather than a generic "post more carousels."

---

## 3. Cadence and calendar guidance

The distillation has nothing concrete on frequency, mix ratios, or sequencing. Here is what the transcripts say.

- **Daily presence ≠ daily feed posts.** *"Daily is the goal... but that's not necessarily posting on your feed every day... daily just showing up can mean just showing up in your stories."* (`Don_t_Be_A_Secret_Agent_V1.txt`).

- **Starter feed cadence: 3x/week.** *"We suggest starting off, you know, if you can post three times a week on your feed, then that's great. And then just with always the intention of building on that."* (`Don_t_Be_A_Secret_Agent_V1.txt`).

- **50/50 split between video and written.** *"We asked you to do half written half video... we want to be able to see that you can do written content properly. We want to be able to see that you can do video properly... a lot of times we'll see... it's very heavy in either written content or video"* (`Think_Outside_the_Box_V1.txt`). The 50/50 is a guideline, not magic — but the imbalance is the most common audit finding.

- **Video target length: ~60 seconds, with flex.** *"We asked that you try to keep your videos around that 60 second mark. There is definitely some flexibility there"* (`Think_Outside_the_Box_V1.txt`).

- **Written post length: 1,000–2,200 characters.** *"We asked that your written content is between a thousand characters to 2200 characters, 2200 character limit is because it's going to get cut off on Instagram"* (`Think_Outside_the_Box_V1.txt`).

- **Guide length: ≤3,000 words / ≤15 min read.** *"This should take no more than 15 minutes to read. The average reader can read about 200 words per minute so that means you shouldn't exceed 3,000 words in the guide."* (`Creating_your_Guide_V2.txt`).

- **Trust-building horizon: 7 months to build, half that to lose.** *"It takes seven months to build trust with people, and half that time to lose it."* (`High Impact Content Creation.txt`). Echo's nurture cadence should assume a multi-month arc, not a multi-week one.

- **Wait 6–12 weeks of consistent posting before reading insights.** *"We recommend really consistently posting for a good six to 12 weeks before you dive into insights."* (`Insta_Insights_mp4_V1.txt`).

- **Don't repurpose content younger than 6 months.** *"After about six months to a year of consistent weekly posting, you can consider repurposing past content."* (`Repurposing Content.txt`).

- **Hit ALL nine content categories.** *"Every audit that we do... there's been everybody's been creating in the different types of category there's usually really strong on personal or really strong on authority and a lot of times people don't talk about they shy away from talking about their process."* (`Think_Outside_the_Box_V1.txt`). Process content is the most commonly skipped. Echo should track a per-user category-coverage scorecard.

- **Sequencing rule (psychological order, NOT calendar order): Pain → Problem → Consequences → Story → Process → Proof → Objections → Vision → Action.** This is the funnel itself AND the structure within each piece. *"The nine point sequence is the funnel itself... But these nine points are also contained within each piece of your funnel."* (`M1_Message_Mapping_Training_V2.txt`). What the distillation missed: **emphasis varies by funnel stage.** *"This entire sequence is repeated through various pieces of content with different sections emphasized at different stages."* (`M1_Message_Mapping_Training_V2.txt`).

- **Stranger-to-client triangle audience mix.** Top 3% are ready-now (and likely already have an agent). The other 97% are problem-aware or info-gathering. *"The majority of people are only speaking to the top 3%... what you want to be speaking to is the entire triangle."* (`How_to_Double_your_Audience_V1.txt`). Echo's mix should skew toward the bottom 97%.

- **Vary backgrounds, outfits, and angles.** *"Vari your backgrounds, outfits, and images so that your audience recognizes each piece of content as a new piece they haven't seen before."* (`High Impact Content Creation.txt`). And: *"It's so important to switch up your photos your outfits like what you're wearing and where you're recording your videos... if all your videos are recorded in the same location, the automatic thought is that I've already seen this and they're more apt to scroll by"* (`Think_Outside_the_Box_V1.txt`). Echo should track and warn on rotation fatigue across the recent N posts.

- **Time of day: post when audience is active; not midnight; same time slot improves algo lift.** *"First thing in the morning, lunchtime after work, those tend to be high traffic times."* (`Posting Guidelines (2025).txt`).

- **Personal Facebook profile is mandatory and gets the most organic reach.** *"The algorithm on Facebook favors your followers... posting on your personal Facebook page on Instagram. You also want to be posting there."* (`Don_t_Be_A_Secret_Agent_V1.txt`). And: *"Do not skip the personal Facebook page."* (`Posting Guidelines (2025).txt`).

- **Cross-post Instagram + Facebook same day; LinkedIn only if niche fits.** (`Posting Guidelines (2025).txt`, `Leverage_LinkedIn_V1.txt`). LinkedIn is for upsizers, busy professionals, first-time buyers, attorneys/divorce niches — not retirees or downsizers.

- **Hard hierarchy of content goals: speak to niche > consistency > category mix > hooks > CTAs.** From the troubleshooting list: *"It is always one or more of these things... not being consistent... not speaking to your niche [the biggest defender]... not showing your personality... not creating in the nine different categories... [weak] hooks."* (`Think_Outside_the_Box_V1.txt`).

---

## 4. Quote-worthy examples for runtime AI prompts

Short, self-contained, drop-in-able into Echo's system prompt or auditor.

- **Niche test (subway analogy).** *"Just imagine... you're on a busy subway platform... 'Hey everybody, can I get your attention?' Everyone just keeps walking... Then you change your approach. 'There must be someone in this crowd named Bob.' So you yell 'hey Bob,' then someone in the crowd stops."* (`M1_Picking_your_Niche_Training_V2.txt`).

- **Ego framing on pricing.** *"If someone tried to sell you a private jet for $10,000, you'd wonder what was wrong with the jet. But if they tried to sell you a private jet for $3 million, you'd think that it was a really high quality jet."* (`M1 Commission_Rates_Services_V2.txt`).

- **Mind-reader test for great copy.** *"I feel like you read my mind. When I read your guide or when I read your landing page... I just feel like you really understood where I was at, like you were reading my mind or spying over my shoulder. That's what you want."* (`M1 3 Your_Avatar_V2.txt`).

- **Headache / blood clot framing.** *"They have a headache. You know it's a blood clot. Don't lead with the blood clot."* (paraphrased from `M1_Message_Mapping_Training_V2.txt`). Use as one-liner pre-prompt.

- **Vision over process.** *"People don't want the move, they want the house. Don't sell the airplane ride, sell the vacation."* (`How_to_Succeed_Listing_Presentation.txt`).

- **Sensory-specific vision.** *"We don't just want to know that you're going to sell their house... We want to know what that actually looks like... Are we going to be sitting on the beach in Tahiti without worrying anymore?"* (`M1_Message_Mapping_Training_V2.txt`).

- **Perfection as procrastination.** *"Perfection is just procrastination in a cuter outfit."* (`Welcome_to_TLL_2024_08_26_mp4_V2.txt`, `Creating_your_Guide_V2.txt`, `How_to_Use_your_Guide_2_V3.txt` — used repeatedly).

- **Soft-CTA exemplars.** *"What would you do?"; "Tell me if you've ever had this experience."; "Coffee or tea?"* (`CTAs How to When to.txt`). The most effective questions *"genuinely have nothing to do with real estate."*

- **Hook that worked.** *"Sorry to tell you guys this but..." / "Unpopular opinion..."* — example flagged as a strong hook in `Insta_Insights_mp4_V1.txt`. And: *"I'm wrong, I made a mistake — anytime you say I'm wrong, people will want to hear what you have to say"* (`IG Insights - When People Like your Content.txt`).

- **Case study micro-frame.** Catalyst → Specific Challenge → One Process Step → Sensory-Specific Outcome → Optional CTA to guide. (`Case_Studies_vs_Just_Sold_V2.txt`). One closing can spawn multiple posts — *"one case study story can create a lot of pieces of content if you're just thinking about it from that perspective, not trying to cram it all into one story."*

- **Listing-presentation telling phrase.** *"It's not really ethical for me to prescribe a solution if I don't have a clear picture of what's really going on."* (`How_to_Succeed_Listing_Presentation.txt`) — usable as an objection-handling line.

- **Naming methods, two patterns.** Process-feeling: "The Tranquility Blueprint", "The Peaceful Move method". Outcome-naming: "The Free Bird process" (for empty nesters). (`How_to_Name_Your_Core_Services_A_Fun_Gu_2024_08_08_1_V2.txt`).

- **Train of yeses.** *"By giving people moments in the presentation when they can say yes... ultimately at the end of the day, their brain is more primed to respond with an answer that they've already said multiple times."* (`How_to_Succeed_Listing_Presentation.txt`). Useful for sales-script generation but should be marked NOT for personal-content posts.

---

## 5. Gaps from the distillation

Things the four specs miss entirely or under-emphasize.

- **Emotional Cycle of Change is a real model the team teaches.** Five stages: uninformed optimism → informed pessimism → valley of despair → informed optimism → success. *"When you reach the valley of despair and you will reach this point at some time, don't stop."* (`Emotional_Cycle_of_Change_Training_V1.txt`). The Zero-Step UI spec mentions "Valley of Despair" once but doesn't ground it in the broader cycle. Echo could auto-detect which stage a user is in (drop in upload frequency = stage 2/3) and tailor encouragement.

- **The full nine content CATEGORIES (not 9-point sequence) are referenced repeatedly but never enumerated in the distillation.** *"Every real should always fit into a category of content"* and *"the nine different categories of content"* (`Instagram_Basics_Posting_on_IG_V1.txt`, `Think_Outside_the_Box_V1.txt`). The transcripts treat these as canonical: authority, personal philosophy, personal story, lifestyle, case study, testimonial, process, engagement question, and (implicitly) educational/value. Echo should categorize every output and flag underweighted categories per user.

- **Triple Threat audience-growth method.** *"Three well-crafted comments, three likes on a regular basis... almost every day on the types of people that you want to be attracting"* (`Triple_Threat_Method_V1.txt`, `How_to_Double_your_Audience_V1.txt`). This is a manual engagement protocol — Echo could surface daily Triple-Threat targets.

- **Cross-pollination / complementary-audience strategy.** Not in distillation. Find non-real-estate adjacent communities (mom groups, MLM circles, niche professional groups) and do interview swaps, guest lives, value trainings. *"We're talking about cross-pollinating audiences."* (`How_to_Double_your_Audience_V1.txt`).

- **Listing-presentation framework (full sales script).** A four-phase influence cycle: present-pain → vision → commitment → choice. Including specific lines and the "tell-ask methodology" of setting agenda in 4 steps. Entirely absent from distillation. (`How_to_Succeed_Listing_Presentation.txt`).

- **Commission-handling objections script.** Three explicit options for "your commission is too high." (`How_to_Succeed_Listing_Presentation.txt`).

- **Authority Pipeline detail the spec misses:** TV vs. podcast vs. print vs. digital. Podcasts are the recommended *first* media type because they have the lowest gatekeeping (just the podcaster, no editorial chain). TV pitches must match audience daypart (older = morning, not 11pm). Print magazines skew older/more affluent. (`PR_Types_of_Media_V1.txt`).

- **PR is NOT paid sponsorship.** *"Publicity is something that you earn, it's not something that you pay for. So if you've been thinking that you've been getting PR because you're paying to sponsor tournaments... that is a form of advertising."* (`PR_FOR_REALTORS_Why_it_s_important_V1.txt`). Echo's PR feature should never suggest paid placements as PR.

- **Method/process must be NAMED.** The signature method needs a specific brand name (Tranquility Blueprint, Compass Method, House-to-Home Method, etc.). Method names *"should be burned into people's brains by the time they've been through the 12-month nurture sequence."* (`High Impact Content Creation.txt`). Distillation has SignatureMethod as a type but not the naming requirement.

- **VPS / "I help" statement template.** *"I help [niche] to [result they need] by [name of method, OR biggest worry you address]."* (`M1 VPS_Training_V2.txt`).

- **The avatar is a living document, not a one-and-done.** *"Your avatar is never a one and done thing... your avatar is always evolving. And because it's always evolving, you should be continually refining it."* (`M1_Common_Pitfalls_to_Avoid_AVATAR_V4.txt`). Echo should periodically re-prompt to update avatar.

- **"Unicorn syndrome" warning.** *"Your business and your clients are not the exception to the rule... that's your ego getting in the way."* (`M1_Common_Pitfalls_to_Avoid_AVATAR_V4.txt`). Echo can flag this when users reject every suggestion as "doesn't apply to my market."

- **Niche evolution mindset.** *"Instead of asking who is someone we ask who are they becoming?"* (`M1_Picking_your_Niche_Training_V2.txt`). The avatar is the *desired self*, not the current self. This is a deeper framing than the distillation captures.

- **Repurposing techniques (specific recipes).** Video → transcribe → written. Written → talk-to-camera reel. Written → 10-slide carousel. Old video + new commentary spliced as "I changed my mind" piece. (`Repurposing Content.txt`).

- **Subtitles always on.** *"Subtitles are always added if the person in the video is speaking... a lot of people are watching these videos without any sound on."* (`Posting Guidelines (2025).txt`).

- **Hashtag SEO has shifted from match-count to keyword-rich copy.** *"Gone are the days of the perfect hashtag. Now it's really more of a search engine. We need to have keyword rich content."* (`Insta_Insights_mp4_V1.txt`). Echo should weave location/niche keywords into copy naturally, not into hashtag walls.

- **Permission for client stories is a real legal concern, not just a courtesy.** *"If we want permission to advertise, you have to get a completely separate consent to advertise document, or it'll never hold up if they come after [you]."* (`Case_Studies_vs_Just_Sold_V2.txt`, broker manager Calvin's correction). Echo should default to anonymized "family of four" / no-photo-without-consent framing.

- **Don't have multiple Instagram accounts.** *"You will not be able to show up fully if you have multiple pages."* (`Instagram_profile_setup_V1.txt`). Same for teams — show up as an individual, reference the team.

- **Highlight bubbles must stay current.** *"He had nothing updated from like the last, it was like four years ago... if you're going to use these, you want to make sure that you are using them and are active... Otherwise, it's almost better to not have them up there at all."* (`Instagram_Basics_Posting_on_IG_V1.txt`).

- **Engagement-question category lives in Stories, not the feed grid.** *"On Instagram you're not using that [engagement question] category in your feed so you want to use it in your story"* (`Instagram_Basics_Posting_on_IG_V1.txt`).

- **Guides are evergreen, don't constantly rev them.** *"Feeling like you always need to update it... Unless you're completely pivoting niches, just leave it as is."* (`How_to_Use_your_Guide_2_V3.txt`).

- **Saves and shares > likes and comments.** *"We really want to be paying attention to things like saves and shares because that's what's showing what's most valuable to people."* (`Insta_Insights_mp4_V1.txt`).

- **Apparent contradiction worth surfacing.** The 9-point sequence in `M1_Message_Mapping_Training_V2.txt` ends every piece on "Action," but `CTAs How to When to.txt` says many posts should have NO CTA. Resolution: the 9-point sequence is the structure of the funnel-as-a-whole, with each point also embedded as motifs in individual pieces — but on a single post, "Action" can be implicit (a soft engagement question, or simply ending without an ask). The "must end with a CTA" reading of the distillation overstates the source.

- **Apparent contradiction on "speak only to your niche."** *"You have to speak to your niche, no exception"* (`Think_Outside_the_Box_V1.txt`) vs. *"There's going to be the very odd post that isn't necessarily going to speak to your niche, because it's something that's going to apply to every niche... I think it's okay to have those... don't force ones like that"* (same transcript, later). Resolution: niche specificity is the rule; occasional generic universal posts are allowed; never force the niche language onto material that doesn't fit.

---

## 6. Echo / EchoMe-specific relevance

What the transcripts say (often implicitly) about how an AI assistant in this domain should behave.

- **Echo should reduce friction, not generate aggressively.** Most members fail because of perfectionism: *"Don't worry about it... Also, your life is more interesting than you think... Done is better than perfect."* (`M1 Brand_Story_Training_V2.txt`, `Progress_over_Perfection_V1.txt`). Echo's UX role is to lower the bar to publishing one good post, not to flood the user with options.

- **The auditor function should ask "does this fit a category and speak to niche" before "is this engaging."** Engagement is downstream of category fit and niche resonance. (`Think_Outside_the_Box_V1.txt`).

- **A 30-second voice note is Echo's preferred input modality during low-energy / valley-of-despair periods.** Already in distillation but worth emphasizing: voice → posts is the friction-reduction lever for the 50% of users who are in informed pessimism / valley.

- **Echo should warn before suggesting a post that breaks platform-format alignment** (e.g., a 16:9 video on IG, a video > 90 seconds for IG feed, > 2,200 characters for IG caption). (`Think_HGTV_not_Just_Listed_V2.txt`, `Think_Outside_the_Box_V1.txt`).

- **Echo should infer Personal-FB context and strip business branding/CTAs automatically.** The distillation has this for the FB-Personal toggle; the transcripts make clear it is a recurring failure mode the team coaches against. *"95% of the members are first when they start doing it"* are uncomfortable posting authority on personal FB. (`Don_t_Be_A_Secret_Agent_V1.txt`). Echo should make the personal-FB version feel different and friendlier.

- **Echo should not optimize for views/likes; it should optimize for category coverage, niche resonance, and process-mention frequency.** *"Don't let those vanity metrics play with your head."* (`Don_t_Be_A_Secret_Agent_V1.txt`).

- **Echo should treat method-name reinforcement as a goal across the 12-month sequence.** *"Your method names should be burned into people's brains by the time they've been through the 12-month nurture sequence."* (`High Impact Content Creation.txt`). Track per-user method-name surfacing across recent posts.

- **Echo should use the "highlight which stories the niche relates to" filter for any brand-story braindump output.** Three filter criteria: (1) niche relates, (2) defines core values, (3) led to real estate. (`M1 Q&A- Brand Story Braindump.txt`).

- **Echo should coach, not lecture.** Most transcripts are coaching transcripts that say "if you're stuck, come to a call." Echo's tone should be peer-coach, not authority-lecturer. *"Don't be afraid to show your personality. If you talk or speak or do things a certain way in front of your clients, then do that in a video."* (`Don_t_Be_A_Secret_Agent_V1.txt`).

- **Don't pretend the AI replaces creating content.** *"I never want you to think that your funnel is a replacement for creating content or distributing it. This is not either or. This is always both."* (`M1 How_to_Succeed_Your_Funnel.txt`). Echo is a co-pilot, not a substitute.

- **The "your audience isn't like you" rule.** *"Your audience isn't like you. You are growing a business... You are not your ideal client in most ways. So a lot of the stuff that you're going to be consuming on social media isn't going to be the kind of stuff that you're going to put out on social media."* (`How_to_Double_your_Audience_V1.txt`). When the user says "I'd never read this," Echo should respond: yes, because you aren't your buyer.

---

## Glossary of TLL terms used in transcripts

- **Avatar** — the ideal-client blueprint; a living document; encompasses pains, desires, problems, objections, vision; explicitly the *desired self*, not the current self.
- **Niche / niche-down** — the specific human-segment-by-life-transition the agent serves (upsizers, downsizers, first-time buyers, relocators, divorce clients, empty nesters). Defined by who they are *becoming*, not who they currently are.
- **Signature method / signature process / signature system** — the named, brand-bearing process the agent uses to deliver results (e.g., "Tranquility Blueprint," "Compass Method," "House-to-Home Method"). Required to be NAMED.
- **Brand story** — a one-page Heart → Tension → Resolution → Value structure used on About pages, presentations, and as content fuel.
- **VPS / I-Help statement** — "I help [niche] to [result] by [method-name OR worry-addressed]."
- **Funnel** — a psychological structure (Pain → Process → Solution), not a tech stack. *"It's the psychology that makes all of this work. Not the assemblage of pieces."* (`M1_What_is_a_Funnel_What_it_is_not_V4.txt`).
- **Guide** — the short (≤3,000 word) lead-magnet PDF that moves a reader from problem-awareness to process-awareness.
- **Hard CTA** — book-a-call / download-my-guide. Used selectively and never on personal content.
- **Soft CTA** — engagement question, often unrelated to real estate ("coffee or tea?"). Can be used anywhere.
- **9-point sequence / 9-point messaging** — Pain, Problem, Consequences, Story, Process, Proof, Objections, Vision, Action. The structure of the funnel-as-a-whole AND a motif within individual pieces.
- **9 categories of content** — the buckets every grid post must fit into (authority, personal philosophy, personal story, lifestyle, case study, testimonial, process, engagement question, education/value). The engagement-question category lives in Stories on Instagram.
- **Triple Threat method** — three meaningful comments + three likes per day on the public profiles of ideal-client targets, to grow the right audience.
- **Cross-pollination** — interview swaps and guest expert appearances in non-real-estate communities that share the niche (mom groups, MLMs, professional networks).
- **Train of yeses** — listing-presentation tactic of asking yes/no questions throughout to prime the close.
- **Tell-ask methodology** — setting the agenda by telling them what's about to happen, then asking permission, in four explicit steps.
- **Earned media** — publicity (TV, podcast, print, digital) and testimonials. Distinct from paid media (ads, sponsorships).
- **Emotional Cycle of Change** — five stages users move through when adopting TLL: uninformed optimism → informed pessimism → valley of despair → informed optimism → success.
- **Stranger-to-client journey** — the awareness ladder; the bottom 97% (problem-aware, info-gathering) is the target audience, not the top 3% (ready-now, already have an agent).
- **Pattern interrupt** — visual or copy variation (background change, outfit change, hook change) that prevents the audience from feeling they have seen this post before.
- **HGTV thinking** — for listings, tell the buyer's story (why this home, what life looks like in it) instead of "Just Listed" / MLS-feature-bullets.
- **Catalyst** — in case studies, the specific reason the client decided to pick up the phone *now*.
- **Bite-size** — for cold leads in nurture, content must be short and skim-friendly because they aren't yet invested.
- **Hemingway / 6th-grade reading level** — the readability constraint for all social copy.
- **Photos with faces** — the engagement-floor rule: faces (yours, family, clients with consent, pets) outperform exteriors/interiors.
- **Personal FB profile vs. Business FB page** — personal page gets organic algorithmic favor toward followers; business page is required for ad infrastructure but suppresses organic reach.
- **Highlight bubbles / highlight reels** — IG-curated story collections; must stay current or be removed.
