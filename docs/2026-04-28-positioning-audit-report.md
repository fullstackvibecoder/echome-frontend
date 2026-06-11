# EchoMe Frontend Positioning Audit — 2026-04-28

> **Read this first.** This is a read-only audit of how the EchoMe frontend conforms to the founder's six operating tenets. The report quotes copy verbatim with `file:line` citations. It does not change code. Approve specific items by checking boxes; hand approved subsets to a copywriter or to a follow-up Claude session for execution.

## TL;DR

The homepage and demo video script ship the thesis well. The in-app surfaces betray it the moment the user opens them. A Jaya-shaped customer would read context-first marketing, then meet a video-privileged form, an output-volume welcome message, a ceremony-gated onboarding, and feature surfaces named after production verbs ("Repurpose", "Library", "Reel Maker"). The mental-model failure is overdetermined; this audit names every contributor with quoted evidence and proposes specific fixes.

The single most consequential finding: **the product asks the user to teach it everything it could discover on its own** (LinkedIn, public socials, brand site, MLS profile). WORK BEFORE THE WORK is barely attempted anywhere in the surface area. Settings has 11 manually-entered fields per user, every one of them publicly discoverable for someone like Jaya.

## How to read this

- **Section 1** is the surface-by-surface inventory with quotes and tenet observations.
- **Section 2** is the tenet-by-tenet verdict and rating.
- **Section 3** applies the Jaya test to each major surface.
- **Section 4** is the actionable copy/IA change list with checkboxes.
- **Section 5** is structural/IA renames.
- **Section 6** is the WORK-BEFORE-THE-WORK proposals (becomes the spec for backend context-gathering features).
- **Section 7** is the chat-first proposals.
- **Section 8** is the open questions for Ara.

---

## Pre-flight notes

Before starting:

1. **The auto-memory entry `feedback_echome_operating_tenets.md` does not exist.** The prompt instructed me to flag this. The closest existing memory is `feedback_context_is_king.md`. If the canonical six-tenet definition should be in auto-memory, it needs to be saved.
2. **Repo is a single Next.js app, not a Turborepo monorepo.** The prompt and the existing `EchoMe Platform Frontend Audit Report.md` reference paths under `packages/web/src/app/...`. Those paths do not exist. The current path prefix is `src/app/`. All citations in this report use the actual paths.
3. **Some routes referenced in the prompt do not exist as standalone routes** in the current codebase: `/create`, `/auto-clone`, `/quick-personalization`, `/pricing`, `/schedule`, `/help`, `/team`, `/library/[jobId]`. They were valid in the older monorepo audit report but have been restructured. Where the prompt asks about them, this report cites the *current* surfaces that occupy those concepts (e.g., `/create` is now the `/app` dashboard's `GenerationForm`; pricing is an in-page `#pricing` anchor on `/`).
4. **Per the prompt, `/corereview` was scoped to CONTEXT IS KING only.** Two of its three theses ("Everything is bullshit", "Affordability is not solvable") are out of scope per the prompt. Rather than run the skill and discard two-thirds of its output, I evaluated CONTEXT IS KING manually against the same surfaces it would target, with verbatim citations below. If Ara wants the skill's framing as a sanity check, it can be run as a follow-up.

---

## 1. Surface inventory (verbatim, with citations)

### 1.1 Homepage hero — `src/components/landing/HeroSection.tsx`

| Line | Verbatim copy |
|---|---|
| `HeroSection.tsx:27` | `Content Transformation` *(badge above headline)* |
| `HeroSection.tsx:35-38` | `It Already Knows How You Think.` |
| `HeroSection.tsx:46-47` | `Stop starting from zero. EchoMe transforms your raw videos into a full week of social media posts in your unique voice.` |
| `HeroSection.tsx:61` | `Start Free` *(primary CTA)* |
| `HeroSection.tsx:68` | `See Examples` *(secondary CTA)* |
| `HeroSection.tsx:84-85` | `250+ Creators / Scaling their voice effortlessly` |
| `HomeContent.tsx:59` | `Try Free` *(top-nav CTA)* |

**Tenet read:**
- **CONTEXT IS KING** — Headline ✅ (the strongest possible expression of the thesis, verbatim). But the badge "Content Transformation" and the subhead's "transforms your raw videos into a full week of social media posts" defect into output-volume language inside the same viewport. The Jaya-shaped reader scanning in 2 seconds reads "Content Transformation" + "raw videos → full week of social media posts" + "Start Free" and gets a video-to-content production tool, not a context engine.
- **LOW UI** — fine; clean hero.
- **CHAT FIRST** — n/a in marketing context.
- **NO ONBOARDING** — n/a here.
- **WORK BEFORE THE WORK** — n/a here.

### 1.2 Homepage "How It Works" — `src/components/landing/HowItWorks.tsx`

| Line | Verbatim copy |
|---|---|
| `HowItWorks.tsx:21` | `Core Belief` *(badge)* |
| `HowItWorks.tsx:24-29` | `Context is King.` |
| `HowItWorks.tsx:31-33` | `Most AI tools start from zero every time you open them. You write a prompt, cross your fingers, and hope it doesn't sound like a robot.` |
| `HowItWorks.tsx:35-37` | `EchoMe starts from everything you've already made. Your videos, your posts, your emails, your voice. That context is why the output sounds like you — not like AI.` |
| `HowItWorks.tsx:60-62` | Step 01: `Feed it your history` — `YouTube, Instagram, blog posts, emails, PDFs, or just your voice. The more context, the better it knows you.` |
| `HowItWorks.tsx:64-67` | Step 02: `Drop in any video` — `A podcast, a Zoom call, a phone recording. Raw and unedited is fine. EchoMe does the rest.` |
| `HowItWorks.tsx:69-72` | Step 03: `Get a full content kit` — `Clips, carousels, social posts, blog drafts, captions — all grounded in your voice and your ideas.` |

**Tenet read:**
- **CONTEXT IS KING** — Strongest tenet-conformant section in the entire repo. Embodied. ✅
- **WORK BEFORE THE WORK** — Step 1 says "Feed it your history" — frames the user as the source of context. The tenet says the system should *find* the user's history. PARTIAL.
- **Step 2 ("Drop in any video")** privileges video as the only input mode. Inconsistent with the founder's own `feedback_create_page_equal_weight.md` ("Video is not privileged. 3 equal input mode cards."). PARTIAL.

### 1.3 Homepage "Knowledge Base" section *(actually input→output demo)* — `src/components/landing/KnowledgeBaseSection.tsx`

| Line | Verbatim copy |
|---|---|
| `KnowledgeBaseSection.tsx:39-43` | `One Video In. Everything Out.` |
| `KnowledgeBaseSection.tsx:45-47` | `Drop a video, get a week of content. Every piece is grounded in your voice because the system already knows how you think.` |
| `KnowledgeBaseSection.tsx:54-67` | "What goes in" / `Any video. YouTube link, file upload, or paste a URL.` |
| `KnowledgeBaseSection.tsx:131-133` | `Posts, carousels, clips, blog drafts, captions — all in your voice.` |
| `KnowledgeBaseSection.tsx:142` | Stat: `6 platforms` — `LinkedIn, Twitter/X, Instagram, TikTok, Blog, Email` |
| `KnowledgeBaseSection.tsx:143` | Stat: `15+ content pieces` — `Posts, carousels, clips, captions, blog drafts` |
| `KnowledgeBaseSection.tsx:144` | Stat: `1 video` — `That's all it takes. Your voice does the rest.` |

**Tenet read:**
- **CONTEXT IS KING** — `the system already knows how you think` ✅. But the headline "One Video In. Everything Out." privileges video as the canonical input and uses pure output-volume framing ("Everything Out"). And the stats panel — "6 platforms / 15+ content pieces / 1 video" — is exactly the output-volume grammar `copy_refractor.md` warned against (line 8: *"Language that leads with output volume, platform count, or generation speed is wrong."*). The component is named `KnowledgeBaseSection` but the content is an input→output demo. **The label betrays the content.** BETRAYED.

### 1.4 Homepage "Creator Radar" *(this is the marketing for the Following feature)* — `src/components/landing/CreatorRadarSection.tsx`

| Line | Verbatim copy |
|---|---|
| `CreatorRadarSection.tsx:40-44` | `Turn Other People's Ideas Into Your Content` |
| `CreatorRadarSection.tsx:47-49` | `Follow creators in your space. Their ideas get filtered through your knowledge base and come out in your voice.` |
| `CreatorRadarSection.tsx:9-26` | Steps: `Follow Creators` / `Get Notified` / `Hit Repurpose` / `Your Voice, Not Theirs` |
| `CreatorRadarSection.tsx:78` | `Same ideas, your words. Always.` |

**Tenet read:**
- **CONTEXT IS KING** — Excellent. ✅ This is industrial repurposing positioned correctly — others' ideas filtered through *your* knowledge base.
- **The marketing name is "Creator Radar." The in-app route is "Following."** Two different names for the same feature, with the marketing name being the strong industrial framing and the in-app name being the weak passive social-network framing. This is the exact betrayal the founder flagged. See §1.10 for the in-app surface.

### 1.5 Homepage "Not ChatGPT" — `src/components/landing/NotChatGPTSection.tsx`

| Line | Verbatim copy |
|---|---|
| `NotChatGPTSection.tsx:17-22` | `Not ChatGPT` |
| `NotChatGPTSection.tsx:24-26` | `ChatGPT writes from prompts. Echo writes from context - your history, your voice, your ideas. No prompt engineering. No "act like me" instructions.` |
| `NotChatGPTSection.tsx:68` | EchoMe column: `You upload video` |
| `NotChatGPTSection.tsx:74` | `Output grounded in your history` |
| `NotChatGPTSection.tsx:80` | `Learns from everything you've created` |
| `NotChatGPTSection.tsx:86` | `Sounds like you wrote it` |
| `NotChatGPTSection.tsx:95-99` | `The system already knows your voice. / Upload your work. It handles the rest.` |

**Tenet read:**
- **CONTEXT IS KING** — Excellent. ✅
- One blemish: the EchoMe column's first row says `You upload video` (line 68). Equivalent column on the ChatGPT side says `You write prompts`. The asymmetric framing makes "video upload" the canonical EchoMe action. Should be `You feed it your history` or `You give it any input`. PARTIAL.

### 1.6 Homepage Pricing — `src/app/HomeContent.tsx:120-537`

| Line | Verbatim copy (selected) |
|---|---|
| `HomeContent.tsx:126-129` | `Choose Your Plan` |
| `HomeContent.tsx:130-134` | `Start with 2 free generations - no credit card required. Then choose a plan that works with your creative rhythm.` |
| `HomeContent.tsx:172` | Free tier description: `See if it gets your voice right` |
| `HomeContent.tsx:209` | Echo tier: `For creators with a body of work to draw from` |
| `HomeContent.tsx:260` | Echo Studio: `For creators who publish frequently and take their output seriously` |
| `HomeContent.tsx:310` | Echo Pro: `For agencies and teams managing multiple voices` |
| `HomeContent.tsx:230,231,232,233` | Feature pills: `2 hours of video processing` / `5 clips per video` / `1 Knowledge Base (your voice profile)` / `3 Creator Radar slots` |
| `HomeContent.tsx:281,282,287` | Studio features: `Up to 5 hours of video processing` / `Up to 10 clips per video` / `750MB file upload limit` |
| `HomeContent.tsx:331,332,337` | Pro features: `Unlimited video processing` / `Up to 15 clips per video` / `5GB file upload limit` |

**Tenet read:**
- **CONTEXT IS KING** — Tier descriptions are good (`body of work to draw from`, `take their output seriously`). But the feature pills are pure production-tool grammar: video minutes, clip counts, MB upload limits, export resolutions. This is the language of a captions/video tool. BETRAYED in the feature lists.
- **AFFORDABILITY/HONEST POSITIONING** — `take their output seriously` (Echo Studio) ✅ — matches Ara's "serious tool for serious creators" framing per `copy_refractor.md`.

### 1.7 Homepage "Free Tools — Free Video Compressor" — `src/app/HomeContent.tsx:540-561`

| Line | Verbatim copy |
|---|---|
| `HomeContent.tsx:543-545` | `Free Tools — No Signup Required` |
| `HomeContent.tsx:547` | `Free Video Compressor` |
| `HomeContent.tsx:549-551` | `Reduce your video file size without losing quality. No account, no email, no watermark. Just drop your file and download.` |
| `HomeContent.tsx:557` | `Compress a Video — Free` *(CTA)* |

**Tenet read:**
- **CONTEXT IS KING** — Major BETRAYAL. A standalone video utility on the homepage tells visitors the brand stands for video production utilities. This is the Jaya trap, fully formed: a visitor lands here, sees "Free Video Compressor," and concludes EchoMe is in the same category as Capcut. The compressor may be a useful SEO/lead-gen play, but its placement on the main marketing page anchors the wrong category.

### 1.8 Sign-up — `src/app/auth/signup/SignupContent.tsx`

| Line | Verbatim copy |
|---|---|
| `SignupContent.tsx:43` | `Create Your Echo` |
| `SignupContent.tsx:44-46` | `Start generating content that sounds like you wrote it` |
| `SignupContent.tsx:50-63` | Benefits list: `2 free generations, no credit card` / `Learns from your existing content` / `Output grounded in your voice and ideas` |
| `SignupContent.tsx:86,99` | Field: `Full Name` (placeholder `John Doe`) |
| `SignupContent.tsx:108,123` | Field: `Email` (placeholder `you@example.com`) |
| `SignupContent.tsx:133,149` | Field: `Password` |
| `SignupContent.tsx:205,218` | Field: `Confirm Password` |
| `SignupContent.tsx:243-252` | Terms-of-service checkbox required |
| `SignupContent.tsx:258-266` | Cloudflare Turnstile CAPTCHA |
| `SignupContent.tsx:279` | Submit: `Create Account` |

**Tenet read:**
- **CONTEXT IS KING** — Headline `Create Your Echo` is interesting — frames the system as an extension of self ✅. Benefits list is mostly tenet-conformant.
- **WORK BEFORE THE WORK** — `Full Name` is asked in a form before any OAuth has been used. If the user signs up via OAuth later in the form, the name is collected twice. The OAuth path should auto-fill or replace the form. PARTIAL.
- **NO ONBOARDING** — Sign-up itself is fine (auth is not onboarding). But the gating happens immediately after — see §1.9.

### 1.9 Onboarding — `src/app/onboarding/OnboardingContent.tsx`

| Line | Verbatim copy / behavior |
|---|---|
| `OnboardingContent.tsx:22` | `MIN_CONTENT_ITEMS = 3` *(constant)* |
| `OnboardingContent.tsx:118-124` | Auto-redirects to `/app` only when `existingCompleted >= MIN_CONTENT_ITEMS` |
| `OnboardingContent.tsx:143` | Echo: `I'm Echo. I learn how you write, speak, and think, then I use that to generate content in your actual voice. The more you feed me, the better the match gets. Let's set you up.` |
| `OnboardingContent.tsx:215` | Echo: `First, what should I call you?` |
| `OnboardingContent.tsx:233` | Echo: `Got it, [Name]. Now let's teach me your voice.` |
| `OnboardingContent.tsx:181` | Echo: `Do you have a YouTube channel or videos? Transcripts are great for capturing how you naturally speak.` |
| `OnboardingContent.tsx:184` | Echo: `How about Instagram? Your captions and posts show how you talk to your audience.` |
| `OnboardingContent.tsx:187` | Echo: `Do you have a blog or Substack? Long-form writing is the best way for me to learn your depth.` |
| `OnboardingContent.tsx:190` | Echo: `Would you like to paste some writing? An email, a post, a draft. Anything works.` |
| `OnboardingContent.tsx:193` | Echo: `Want to record a quick voice note? Nothing captures tone like your actual voice.` |
| `OnboardingContent.tsx:200-201` | Echo: `I have N source(s) so far. I need M more to get started. Want to add more?` |
| `OnboardingContent.tsx:439-440` | Header progress: `[N]/3 sources` |
| `OnboardingContent.tsx:447-453` | `Skip` button (top-right) — escapes to `/app` |
| `OnboardingContent.tsx:206` | Echo: `You're all set. Let's go create something that sounds like you.` |
| `OnboardingContent.tsx:523` | Profile field: `X handle (optional)` |
| `OnboardingContent.tsx:533` | Profile field: `instagram (optional)` |

**Tenet read:**
- **NO ONBOARDING** — Onboarding exists. By itself this is the violation. The flow soft-gates value behind 3 sources before redirecting to `/app`. The Skip button mitigates but doesn't eliminate. The chat-style UI is generous but the existence of a guided multi-step setup is the core tenet failure. BETRAYED.
- **CHAT FIRST** — The flow IS chat-driven (Echo speaks, the user replies, Echo asks the next thing). Excellent in form. ✅
- **WORK BEFORE THE WORK** — Asks the user for: their name, their X handle, their Instagram handle, a YouTube channel URL, an Instagram URL, a blog URL, pasted writing, a voice recording, an email export. **Every one of these is publicly discoverable** for a typical user (LinkedIn, brand site, Re/Max profile, MLS profile, public socials, Google business profile). The product asks the user to bring its understanding of them rather than going to find what's already public. BETRAYED.
- **CONTEXT IS KING** — Echo's opening message (`I'm Echo. I learn how you write, speak, and think...`) is strong context-first framing. ✅ But line 233 (`Now let's teach me your voice`) frames the user as teacher and the system as learner-pupil. `copy_refractor.md` line 11: *"If copy implies that the user needs to do significant work before the product becomes useful, rewrite it to imply the opposite — the product learns from what they've already made."* This violates that. PARTIAL.

### 1.10 The "Following" feature in-app — `src/app/app/following/FollowingContent.tsx`

| Line | Verbatim copy |
|---|---|
| `FollowingContent.tsx:326-328` | `Following` *(page title)* |
| `FollowingContent.tsx:329-331` | `See what top creators are talking about. One click turns their ideas into content written in your voice — not theirs.` |
| `FollowingContent.tsx:352` | Input placeholder: `Paste a YouTube channel or Instagram profile URL...` |
| `FollowingContent.tsx:401-403` | Empty state: `Follow a creator to see their latest content here. Paste a YouTube or Instagram URL above to get started.` |
| `FollowingContent.tsx:554` | Per-item CTA: `Repurpose →` |
| `FollowingContent.tsx:571` | Modal title: `Repurpose Content` |
| `FollowingContent.tsx:733` | Modal CTA: `Generate for [N] Platform[s]` |
| `FollowingContent.tsx:738` | `Usually takes 30-60 seconds` |

**Tenet read:**
- The page title is `Following`, the marketing name is `Creator Radar`. The same feature has two names — the in-app one (passive social-media-style "Following") undersells the industrial repurposing thesis the marketing name conveys. **This is the founder's stated grievance, and the evidence confirms it.** BETRAYED.
- The subheading copy (line 329-331) is actually strong. The page-level naming is the problem.
- The CTA `Repurpose` is industrial-correct, but the modal title `Repurpose Content` is generic ("Content" being the word `copy_refractor.md` flags as a tell that copy is about output, not context).

### 1.11 The "/create" surface — `src/app/app/AppContent.tsx` + `src/components/UnifiedCreateInput.tsx`

The dashboard at `/app` is the "create" surface. There is no separate `/create` route. The dashboard renders `GenerationForm`, which renders `UnifiedCreateInput`.

#### Dynamic welcome message — `src/app/app/AppContent.tsx:26-68`

| Line | Verbatim copy |
|---|---|
| `AppContent.tsx:37-39` | `[Name], you're on fire 🔥 / [N] pieces created this month and counting. Let's keep the momentum going.` |
| `AppContent.tsx:44-46` | `Welcome back, [Name]! / You've created [N] pieces this month. Ready to add more?` |
| `AppContent.tsx:51-54` | `Good morning, [Name]! / Ready to turn some footage into content?` |
| `AppContent.tsx:58-61` | `Working late, [Name]? / Let's make it count. Upload and we'll handle the rest.` |
| `AppContent.tsx:64-67` | `Welcome back, [Name]! / What would you like to create today?` |

**Tenet read:**
- **CONTEXT IS KING** — `Ready to turn some footage into content?` and `Upload and we'll handle the rest.` lead with the production-tool frame. **This is the literal first sentence a returning Jaya-shaped customer reads.** BETRAYED.
- All five message variants count *output volume* ("pieces created", "pieces this month"). The system has voice-strength, source counts, and freshness signals to draw from instead — none used. BETRAYED.

#### `WelcomeBanner` (first-time users) — `src/components/welcome-banner.tsx`

| Line | Verbatim copy |
|---|---|
| `welcome-banner.tsx:31-33` | `Ready to go[, Name]` |
| `welcome-banner.tsx:44-46` | `The system has your context. Generate something and see how it sounds.` |
| `welcome-banner.tsx:58-64` | Card 1 — `Generate` / `Pick a topic. The system writes it in your voice.` |
| `welcome-banner.tsx:75-81` | Card 2 — `Knowledge Base` / `More context means better output. Add more of your work.` |
| `welcome-banner.tsx:92-97` | Card 3 — `Content Kit` / `Everything generated lives here.` |

**Tenet read:**
- **CONTEXT IS KING** — Strongest in-app surface. `The system has your context.` ✅ All three cards lead with what the system knows or how context flows. EMBODIED.
- This banner is the **model** for what the rest of the in-app copy should sound like.

#### The input itself — `src/components/UnifiedCreateInput.tsx`

| Line | Verbatim copy |
|---|---|
| `UnifiedCreateInput.tsx:143-145` | `What are we turning into content?` |
| `UnifiedCreateInput.tsx:146-148` | `A video, a link, a topic — whatever you've got.` |
| `UnifiedCreateInput.tsx:168` | Textarea placeholder: `Paste a link, type a topic, or drop a video...` |
| `UnifiedCreateInput.tsx:184` | Button title: `Upload a video file` *(paperclip)* |
| `UnifiedCreateInput.tsx:191` | Button title: `Record a voice note` *(mic)* |
| `UnifiedCreateInput.tsx:234` | Source hints: `YouTube`, `Zoom`, `Loom`, `Vimeo`, `Upload` |
| `UnifiedCreateInput.tsx:240` | `or just type a topic` *(muted)* |
| `UnifiedCreateInput.tsx:247-249` | `One input becomes all of this` |
| `UnifiedCreateInput.tsx:260-261` | Output cards: `Clips / With captions`, `Carousel / Slides`, `Blog / Draft`, `Email / Newsletter` |
| `UnifiedCreateInput.tsx:268-271` | `+ LinkedIn, Instagram, Twitter/X, TikTok, YouTube posts` |
| `UnifiedCreateInput.tsx:274-275` | `All in your voice. All from one input.` |
| `UnifiedCreateInput.tsx:38-63` | Below the input, four guides: `YouTube to Content`, `Video Content Guide`, `Build Your Voice`, `Compress Video` |

**Answer to prompt question 1** (default input mode): The default is a **single text input** that accepts a paste/type/drop. The textarea placeholder lists three options in equal weight (`Paste a link, type a topic, or drop a video`), and the heading `What are we turning into content?` is conversational. **Functionally, the input is chat-first and equal-weight** — strong tenet conformance.

**Answer to prompt question 11** (LOW UI sniff test, distinct elements in first viewport):

1. Free-user quota counter banner (`AppContent.tsx:395-409`) when `isFreeUser`
2. Possibly Teams-onboarding banner (`AppContent.tsx:370-392`) for teams users
3. Heading
4. Subhead
5. Textarea
6. Paperclip button (upload)
7. Mic button (voice note)
8. Submit button
9. Source-hints row (5 service names + "or just type a topic")
10. "One input becomes all of this" label
11. 4 output cards
12. Platform list line
13. Tagline
14. 4 guide cards (`YouTube to Content`, `Video Content Guide`, `Build Your Voice`, `Compress Video`)
15. App sidebar (left rail)
16. Voice context indicator
17. (Possibly) Welcome banner if first-time

**~17–20 distinct UI elements in the first viewport. Borderline LOW UI.** The input itself is restrained. The "what you'll get" preview, guides grid, and sidebars together push the surface toward visually busy. PARTIAL.

**Tenet read on the create input:**
- **CONTEXT IS KING** — `What are we turning into content?` is a question, not a command — context-first phrasing. `All in your voice. All from one input.` ✅. But the output preview ("Clips / Carousel / Blog / Email") is output-volume grammar, and the source hints lean video-heavy (4 of 5 services are video; "or just type a topic" is in muted-color trailing position).
- **CHAT FIRST** — single-line input with paperclip/mic/submit reads as a chat composer, not a form. ✅
- **LOW UI** — the textarea+toolbar is clean; the surrounding scaffolding (output preview + guides) is what makes the page feel busy. PARTIAL.
- The four guides at the bottom include `Compress Video` — which is the same homepage trap §1.7. A guide for a free utility tool sitting at the bottom of the create surface re-anchors the wrong category.

### 1.12 Knowledge Base — `src/app/app/knowledge/KnowledgeContent.tsx`

| Line | Verbatim copy |
|---|---|
| `KnowledgeContent.tsx:120` | Page title: `Build Your Voice` |
| `KnowledgeContent.tsx:127` | Score format: `[N]/100` (Seed → Growing → Strong → Signature) |
| `KnowledgeContent.tsx:35` | 0-30: `Add your writing, social posts, or voice recordings below. The more Echo learns, the more your generated content sounds like you — not AI.` |
| `KnowledgeContent.tsx:36` | 31-60: `Echo is learning your style. Add more of your best content — blog posts, LinkedIn posts, or emails you're proud of. Quality over quantity.` |
| `KnowledgeContent.tsx:37` | 61-80: `Your generated content already sounds like you. Try asking Echo what it knows about your voice below.` |
| `KnowledgeContent.tsx:38` | 81+: `Echo has a strong read on your voice. Everything you generate will carry your tone, phrasing, and perspective.` |
| `KnowledgeContent.tsx:165-171` | First-visit teaching: `Teach Echo how you write. / Paste your best writing, drop a YouTube link, or upload a file. The more Echo learns, the more your generated content sounds like you — not AI.` |
| `KnowledgeContent.tsx:173` | Source pills: `Blog posts`, `LinkedIn posts`, `Past emails`, `YouTube channel`, `Voice recordings`, `PDFs` |
| `KnowledgeContent.tsx:213-215` | Sources list link: `Sources ([N])` |
| `KnowledgeContent.tsx:197-204` | KBChat — present and visible once content exists |

**Tenet read:**
- **CONTEXT IS KING** — Voice-strength UI (Seed/Growing/Strong/Signature with waveform and score) ✅. The score messages get progressively more context-first as strength grows.
- **CHAT FIRST** — `KBChat` is present on the KB page. ✅
- **NO ONBOARDING** — `Teach Echo how you write.` (line 165) is exactly the user-as-teacher framing the founder's tenets reject. The system should arrive having read what the user already made. The KB page is the page that has the most reason to *show off* what the system already knows — instead it prompts the user to teach. BETRAYED.
- **WORK BEFORE THE WORK** — The first-visit pills (`Blog posts / LinkedIn posts / Past emails / YouTube channel / Voice recordings / PDFs`) all imply manual user upload. None imply auto-discovery. BETRAYED.
- **The page title `Build Your Voice` is imperative addressed to the user.** "Build" frames the work as the user's. The page is the system's brain. The label betrays the content (same pattern as §1.3).

### 1.13 Content Kits list — `src/app/app/content-kit/ContentKitContent.tsx`

| Line | Verbatim copy |
|---|---|
| `ContentKitContent.tsx:154` | Page title: `Content Kits` |
| `ContentKitContent.tsx:155` | Summary line: `[N] kit[s] · [N] post[s] · [N] clip[s]` |
| `ContentKitContent.tsx:129-134` | Empty state: `No content kits yet / A Content Kit is a week's worth of content from one input. Drop a YouTube link, upload a video, or type a topic — Echo turns it into clips, carousels, captions, a Substack article, and an email newsletter.` |
| `ContentKitContent.tsx:136` | Empty CTA: `Create your first kit` |
| `ContentKitContent.tsx:139-143` | `See a sample kit →` *(link)* |
| `ContentKitContent.tsx:209,215,221,227` | Status sections: `Ready to Publish`, `Processing`, `Failed`, `Earlier` |

**Tenet read:**
- **CONTEXT IS KING** — Empty-state explanation packs heavy output-volume vocabulary (`clips, carousels, captions, a Substack article, and an email newsletter`). It tells the user what the kit *contains* rather than how the system *understood* their input. BETRAYED.
- The summary line (`N kits · N posts · N clips`) is the third place the same output-counting grammar appears. CONSISTENT BETRAYAL.

### 1.14 "Library" page — `src/app/app/library/CreatorLibraryContent.tsx`

This is the **Creator Library** of curated B-roll/captions/scripts — *not* the user's content library. The naming is confusing; users will look here for their generated content and find a stock-asset toolkit instead.

| Line | Verbatim copy |
|---|---|
| `CreatorLibraryContent.tsx:93` | Page title: `Creator Library` |
| `CreatorLibraryContent.tsx:95` | `Fresh content drops every month.` |
| `CreatorLibraryContent.tsx:16-19` | Tabs: `B-Roll`, `Caption Templates`, `Reel Scripts` |
| `CreatorLibraryContent.tsx:104-107` | Free-user gate: `Upgrade to access the Creator Library / Get curated B-roll, caption templates, and reel scripts every month.` |
| `CreatorLibraryContent.tsx:192-193` | Empty state: `No assets for this month yet / Check back soon!` |

**Tenet read:**
- **CONTEXT IS KING** — Heavy production-tool framing (`B-Roll`, `Caption Templates`, `Reel Scripts`) — exactly the vocabulary Jaya used in her email. This page is unambiguously a "captions/video toolkit." If a Jaya-shaped user wandered to /library expecting their generated content, they'd find this and have their wrong mental model confirmed. BETRAYED.
- **IA CRITICAL FAILURE** — The page named "Library" is a stock-asset library. The page named "Content Kits" (§1.13) is what most users would call "my library." Both names need to change. See §5.

### 1.15 Settings — `src/app/app/settings/SettingsContent.tsx`

The Settings page has a "Profile" tab that asks the user to fill in 11 distinct pieces of public information.

| Line | Field | Placeholder |
|---|---|---|
| `SettingsContent.tsx:348-352` | Display Name | `How you want to appear on carousels` |
| `SettingsContent.tsx:363-367` | Full Name | `Your legal name` |
| `SettingsContent.tsx:383-387` | X (Twitter) handle | `username` |
| `SettingsContent.tsx:403-407` | Instagram handle | `username` |
| `SettingsContent.tsx:419-423` | Website URL | `https://yourwebsite.com` |
| `SettingsContent.tsx:433-436` | Bio | `A short bio about yourself...` |
| `SettingsContent.tsx:459-463` | Profile Role | `e.g., Leadership coach for mid-career women in tech` |
| `SettingsContent.tsx:477-481` | Profile Topics | `e.g., Confidence, career transitions, executive presence` |
| `SettingsContent.tsx:495-499` | Profile CTA | `e.g., Confident Leader OS - my $497 self-paced course` |
| `SettingsContent.tsx:513-516` | Profile Guardrails | `e.g., Never say hustle or grind. No bro-marketing. Warm but authoritative.` |
| `SettingsContent.tsx:562,587` | Profile Image | upload |

**Tenet read:**
- **WORK BEFORE THE WORK** — Total betrayal. **Every single one of these fields is publicly discoverable for a Jaya-shaped customer.** From a Re/Max realtor profile alone you can derive: full name, display name, role, brokerage, headshot, bio, website, often Instagram, often LinkedIn. From LinkedIn: headshot, full bio, role, topics from About + recent posts. From a brand website crawl: CTA, voice/tone (guardrails), brand colors. The product asks the user to do data entry the system could finish before they arrive. BETRAYED.

### 1.16 Marketing email — `docs/email-drafts/2026-04-18-platform-update.md`

| Line | Verbatim copy |
|---|---|
| `2026-04-18-platform-update.md:4-6` | Subject options: `Your content just got a visual upgrade` / `New: B-Roll Reels, Substack export, and a cleaner content kit` / `Less clicking, more publishing — EchoMe April update` |
| `2026-04-18-platform-update.md:16` | `We've been heads-down building, and this week's updates are some of our biggest yet.` |
| `2026-04-18-platform-update.md:20-26` | Section header: `Your Content Kit page got a makeover` ... |
| `2026-04-18-platform-update.md:30` | Section header: `B-Roll Reel Maker` |
| `2026-04-18-platform-update.md:42` | Section header: `Substack-ready articles` |
| `2026-04-18-platform-update.md:52` | Section header: `Platform posts, all in one place` |

**Tenet read:**
- **CONTEXT IS KING** — Pure feature-changelog format. Every section announces a shipped artifact (B-Roll Reel, Substack article, tabbed editor, Zoom support) without connecting any of it back to the user's voice/context/history. A Jaya-shaped reader scans this email and is reinforced in her mental model: EchoMe is a feature factory for video/captions production utilities. BETRAYED.

### 1.17 Demo video script — `docs/demo-video-script.md`

| Line | Verbatim copy |
|---|---|
| `demo-video-script.md:13` | `you give EchoMe one input — a video, a link, a topic, whatever you've got — and it gives you a full week of content. Clips, carousels, captions, articles, reels. All in your voice, not generic AI voice.` |
| `demo-video-script.md:21-23` | `This is the Create page. One input. That's it. / You can paste a YouTube link, drop a video file, type a topic, or even record a voice note. EchoMe figures out what you gave it and turns it into content.` |
| `demo-video-script.md:133-137` | `This is Build Your Voice. This is how EchoMe learns to sound like you. / One input. Paste your best writing, drop a PDF...` |
| `demo-video-script.md:153-157` | `Following is where content inspiration comes from. ... The magic is the Repurpose button. ... EchoMe takes their idea — not their words — and creates content in YOUR voice about that topic.` |

**Tenet read:**
- **CONTEXT IS KING** — Better than the in-app surfaces. Leads with "one input → full week, all in your voice." Mixed: still leans on output-volume listing.
- Segment §1.10's correct framing of Following as industrial repurposing in the script confirms the founder-thinking is right; only the in-app naming/surfaces betray it.

---

## 2. Tenet-by-tenet verdict

Each verdict cites at least three surfaces with quoted evidence.

### Tenet 1 — CONTEXT IS KING — **PARTIAL** (high in marketing, low in app)

**Embodied**: HeroSection.tsx:35-38 (`It Already Knows How You Think.`), HowItWorks.tsx:24-37 (`Context is King. EchoMe starts from everything you've already made.`), NotChatGPTSection.tsx:24-26, welcome-banner.tsx:44-46 (`The system has your context.`), KnowledgeContent.tsx voice-strength UI.

**Betrayed**: HomeContent.tsx:543-561 (free video compressor anchors the wrong category), KnowledgeBaseSection.tsx:39-43 + 142-144 (`One Video In. Everything Out.` + 6/15+/1 output stats), HomeContent.tsx pricing feature pills (video minutes, clip counts, MB limits), AppContent.tsx:51-67 (welcome message asks "Ready to turn some footage into content?"), ContentKitContent.tsx:130-134 (empty state lists outputs not understanding), CreatorLibraryContent.tsx whole page, marketing email feature-changelog format.

### Tenet 2 — LOW UI — **PARTIAL**

**Embodied**: UnifiedCreateInput's central composer is restrained — single textarea + 3 buttons. KnowledgeContent's KB page is also calmly laid out (header → unified input → chat → collapsible sources).

**Partial / busy**: AppContent.tsx (free-user banner + teams banner + form + welcome banner + sidebar can stack to >15 elements). HomeContent.tsx pricing section has 7 distinct plan cards plus billing toggle plus enterprise CTA. SettingsContent.tsx profile tab has 11 fields plus image uploader plus delete-account flow.

### Tenet 3 — FEATURE RICH, LOW UI — **PARTIAL**

The product has deep capability (voice pipeline, RAG, KB, repurposing, scheduling, carousel generation, reel maker, B-roll library). Some surfaces hide that depth well (the central /app composer); other surfaces stack capability into visible chrome (Settings tabs, Library tabs, multiple distinct in-app pages each with their own concept). The number of distinct destinations in the sidebar — checking `src/app/app/` reveals 17 routes — is itself a "feature rich" admission. Whether the user *feels* less complicated than competitors when they hit /app for the first time is the open question; the welcome banner suggests the design intent is right, but the surrounding surface ("Library", "Following", "Reels", "Clips", "Descript", "Knowledge", "Trends", "Calendar", "Integrations", "Team Voices", "Profile", "Settings", "Billing", "Developers") communicates a wide product.

### Tenet 4 — CHAT FIRST — **PARTIAL** (better than expected)

**Embodied**: OnboardingContent.tsx (the entire flow is a chat between Echo and the user — well-executed), KnowledgeContent.tsx renders KBChat once content exists, UnifiedCreateInput.tsx feels like a chat composer.

**Form-driven (where chat could replace it)**:
- SettingsContent.tsx — 11 fields in a classic form. A chat ("Hi — I went to find your details. Quick check on these — is this right?") could collapse the entire profile tab into a single conversational confirmation.
- FollowingContent.tsx Repurpose modal — multi-section form (platforms checkbox grid, carousel-style picker, file upload). A chat ("I see you saved this video from @creator. Want LinkedIn, Instagram, and a blog post in your voice? I'll pick a carousel style — say 'change it' if you want different.") could replace it.
- Onboarding profile step (lines 504-547) — name + X handle + Instagram handle as three separate inputs. Could be one chat reply.

### Tenet 5 — NO ONBOARDING — **BETRAYED**

The route `/onboarding` exists with explicit gating logic (`MIN_CONTENT_ITEMS = 3` at OnboardingContent.tsx:22). Even soft-gated with a Skip button, the page's *existence* is the violation per the tenet's own wording: "no gating ceremony before the user gets value... drop them into output, not configuration."

### Tenet 6 — WORK BEFORE THE WORK — **BETRAYED**

Three independent pieces of evidence: SettingsContent.tsx asks for 11 publicly-discoverable fields (§1.15); OnboardingContent.tsx asks for handles, URLs, and writing samples without making any auto-discovery attempt; signup asks for Full Name when OAuth or LinkedIn-from-email-domain could derive it. Nowhere in the auditable surface area does the system show evidence of having tried to find anything on its own before asking the user for it.

---

## 3. The Jaya test, applied surface-by-surface

For each surface: would landing here on day 1 lead a Jaya-shaped customer (Re/Max realtor, public profile on remax.ca, ASKJAY.ca website, @jayandjayahomes Instagram, hall-of-fame designation, mentored by Jess Lenouvel) toward the right mental model — *EchoMe knows me, generates in my voice* — or toward "this is a captions tool"?

| Surface | Jaya-test result | Tenet violation that produces failure |
|---|---|---|
| Homepage hero (`HeroSection.tsx`) | **PASS-ish.** "It Already Knows How You Think" lands the thesis. But subhead and badge defect to video-to-output framing. | CONTEXT IS KING (subhead) |
| Homepage HowItWorks | **PASS.** "Context is King" headline + "starts from everything you've already made" lands the thesis. | — |
| Homepage KB section | **FAIL.** "One Video In. Everything Out." + the 6/15+/1 stats panel fully cement the production-tool category. | CONTEXT IS KING |
| Homepage Pricing | **FAIL.** Feature pills are video minutes, clip counts, upload limits, export resolutions. Reads as a video utility. | CONTEXT IS KING |
| Free Video Compressor section | **FAIL.** Standalone video utility on the homepage anchors the brand to Capcut/Canva. | CONTEXT IS KING |
| Sign-up | **PASS-ish.** Benefits list is tenet-conformant. | — |
| Onboarding | **FAIL.** A Jaya-shaped customer with public Re/Max profile, public Instagram, and public website is asked to manually paste those URLs as if the system has never heard of her. The product begins by ignoring everything publicly known about her. | NO ONBOARDING + WORK BEFORE THE WORK |
| `/app` welcome message | **FAIL.** "Ready to turn some footage into content?" / "Upload and we'll handle the rest." Production-tool category, fully formed, in the first sentence she'd read on return visits. | CONTEXT IS KING |
| `/app` UnifiedCreateInput | **PASS-ish.** Central input is chat-first and equal-weight. But surrounding output preview + guides reinforce production framing. | LOW UI |
| `/app/knowledge` ("Build Your Voice") | **FAIL.** Page imperative `Teach Echo how you write` instead of `Here's what I figured out — confirm or correct.` The system surrenders its smartest use-case (showing what it knows) and instead prompts the user to teach it. | WORK BEFORE THE WORK + CONTEXT IS KING |
| `/app/library` ("Creator Library") | **FAIL.** Tabs literally named B-Roll, Caption Templates, Reel Scripts. If Jaya found this, "captions tool" is confirmed. | CONTEXT IS KING + IA betrayal |
| `/app/content-kit` (Content Kits list) | **FAIL.** Empty state lists outputs (clips, carousels, captions, articles, newsletters), not what the system knows. Reinforces output-volume frame. | CONTEXT IS KING |
| `/app/following` ("Following") | **FAIL.** Page name "Following" reads as passive social-network feed; the in-app surface inverts the marketing's industrial framing. | IA betrayal |
| `/app/settings` Profile tab | **FAIL.** 11 fields the system could have populated. Asks her to type "Re/Max realtor in [city]" when remax.ca says it. | WORK BEFORE THE WORK |
| Marketing email (April 2026) | **FAIL.** Pure feature-changelog. Confirms feature-factory mental model. | CONTEXT IS KING |
| Demo video script | **PASS-ish.** Better than the in-app surfaces. | — |

**Jaya signal summary**: she came in (homepage = pass-ish), opened the app (pass-ish), filled in some onboarding fields (FAIL), generated a few times via the create input (pass-ish), navigated to /library (FAIL — wrong "library"), to /following (FAIL — passive name), to /settings/profile (FAIL — manual data entry). The product had her right in marketing and lost her every time she touched the in-app surface area. **The entire mental-model failure is reproduced from the surface evidence.**

---

## 4. Specific change list (file:line, current, proposed)

Each item has a checkbox so Ara can approve subsets and hand them to a copywriter or follow-up Claude session.

### 4.1 Homepage hero subhead defects to output language

- [ ] `src/components/landing/HeroSection.tsx:46-47`
  - **Current**: `Stop starting from zero. EchoMe transforms your raw videos into a full week of social media posts in your unique voice.`
  - **Proposed**: `Stop starting from zero. EchoMe reads what you've already made — your videos, your posts, your voice — so the next post is already 80% you.`
  - **Tenet served**: CONTEXT IS KING (lead with what the system knows, not what it produces)

- [ ] `src/components/landing/HeroSection.tsx:27`
  - **Current** (badge): `Content Transformation`
  - **Proposed**: `Context-First AI` *or* `It already knows your voice` *or remove the badge entirely.*
  - **Tenet served**: CONTEXT IS KING

### 4.2 "Knowledge Base" homepage section is misnamed and uses output-volume stats

- [ ] `src/components/landing/KnowledgeBaseSection.tsx:39-43`
  - **Current**: `One Video In. Everything Out.`
  - **Proposed**: `It already read your last hundred posts. Now drop the next one.`
  - **Tenet served**: CONTEXT IS KING

- [ ] `src/components/landing/KnowledgeBaseSection.tsx:141-144` (the 6 platforms / 15+ pieces / 1 video stats panel)
  - **Current** stats = `6 platforms / 15+ content pieces / 1 video`
  - **Proposed** stats grounded in context, e.g.: `Your voice / read across every platform / from one input` *or* show three real signal-side numbers: `signature phrases learned`, `sources read`, `voice match score`. Output volume should not be the headline number.
  - **Tenet served**: CONTEXT IS KING

- [ ] Component file is named `KnowledgeBaseSection.tsx` but its content is an input→output demo. Either rename the component to match content (`InputOutputSection.tsx`) or rewrite the content to actually be about the knowledge base.

### 4.3 Free Video Compressor on homepage — relocate or recategorize

- [ ] `src/app/HomeContent.tsx:540-561`
  - **Action**: Move the Free Video Compressor below the affiliate program (or to a separate `/tools` page only). The homepage reads as a video-utility brand with a free compressor in the middle of it.
  - **Tenet served**: CONTEXT IS KING (do not anchor brand to video utilities)
  - *Open question for Ara: is the SEO play strong enough to keep it on the homepage? See §8.*

### 4.4 `/app` returning-user welcome message leads with production-tool framing

- [ ] `src/app/app/AppContent.tsx:53` (morning greeting fallback)
  - **Current**: `Ready to turn some footage into content?`
  - **Proposed**: `What's on your mind? It already knows your voice — just give it a topic, link, or video.`
- [ ] `src/app/app/AppContent.tsx:60` (working-late greeting)
  - **Current**: `Let's make it count. Upload and we'll handle the rest.`
  - **Proposed**: `Late session. Drop a thought, link, or video — it already knows your style.`
- [ ] `src/app/app/AppContent.tsx:38` (heavy-user greeting)
  - **Current**: `[N] pieces created this month and counting. Let's keep the momentum going.`
  - **Proposed**: `Your voice profile keeps getting sharper — [N] pieces shipped, [voice score] match.` (use voice-strength signal instead of raw output count)
  - **Tenet served**: CONTEXT IS KING

### 4.5 Knowledge Base page betrays its own thesis

- [ ] `src/app/app/knowledge/KnowledgeContent.tsx:120`
  - **Current** (page title): `Build Your Voice`
  - **Proposed**: `What it knows about you` *or* `Your voice profile`
  - **Tenet served**: CONTEXT IS KING + WORK BEFORE THE WORK (the page is the system's brain, not user homework)

- [ ] `src/app/app/knowledge/KnowledgeContent.tsx:165-171` (first-visit teaching block)
  - **Current**: `Teach Echo how you write. / Paste your best writing, drop a YouTube link, or upload a file. The more Echo learns, the more your generated content sounds like you — not AI.`
  - **Proposed**: `Here's what it figured out about your writing so far. Confirm what's right, fix what's wrong, or add a source if it's missing.` (paired with a backend feature that pre-populates a "first read" by crawling whatever the user gave at signup — see §6).
  - **Tenet served**: WORK BEFORE THE WORK + CONTEXT IS KING

### 4.6 Onboarding "let's teach me your voice" frame

- [ ] `src/app/onboarding/OnboardingContent.tsx:233`
  - **Current**: `Got it, [Name]. Now let's teach me your voice.`
  - **Proposed**: `Got it, [Name]. While you were typing I went to look you up — give me 30 seconds.` (paired with backend public-data lookup — see §6)
  - **Tenet served**: WORK BEFORE THE WORK

- [ ] `src/app/onboarding/OnboardingContent.tsx:200-201`
  - **Current**: `I have N source(s) so far. I need M more to get started. Want to add more?`
  - **Proposed**: Remove the gate entirely. The system should never tell the user it "needs" something to "get started." If the system has fewer sources than is ideal, mention it as a quality signal *after* the first generation: `That came out 60% you. Want to feed me one more source — your latest YouTube would push that to 85%.`
  - **Tenet served**: NO ONBOARDING

- [ ] `src/app/onboarding/OnboardingContent.tsx:22`
  - **Current**: `const MIN_CONTENT_ITEMS = 3;`
  - **Proposed**: `const MIN_CONTENT_ITEMS = 0;` — there should be no minimum. The product generates with whatever it has and improves as more is added.
  - **Tenet served**: NO ONBOARDING

### 4.7 Empty states across the app

- [ ] `src/app/app/content-kit/ContentKitContent.tsx:129-134`
  - **Current**: `No content kits yet / A Content Kit is a week's worth of content from one input. Drop a YouTube link, upload a video, or type a topic — Echo turns it into clips, carousels, captions, a Substack article, and an email newsletter.`
  - **Proposed**: `Nothing here yet. Give it a link, file, or topic on the home page — it already knows your voice; the kits show up here when they're ready.`
  - **Tenet served**: CONTEXT IS KING (don't enumerate outputs in the empty state)

- [ ] `src/app/app/following/FollowingContent.tsx:401-403`
  - **Current**: `Follow a creator to see their latest content here. Paste a YouTube or Instagram URL above to get started.`
  - **Proposed**: `Add a creator and any new video they post gets filtered through your knowledge base. Their idea, your voice. Paste a YouTube channel or Instagram profile.`
  - **Tenet served**: CONTEXT IS KING (lead with what the system does to inputs, not the user's action)

- [ ] `src/app/app/library/CreatorLibraryContent.tsx:192-193`
  - **Current**: `No assets for this month yet / Check back soon!`
  - **Proposed**: depends on what this page is renamed to (see §5).

### 4.8 Marketing email — feature changelog → context narrative

- [ ] `docs/email-drafts/2026-04-18-platform-update.md`
  - **Action**: Rewrite the entire email so each shipped capability is framed as "what the system can now do *with* the context it has about you," not "we built X." Example for B-Roll Reel: instead of "EchoMe now generates a short-form B-Roll reel for every content kit — complete with text overlays..." write "EchoMe now reads your existing posts and generates a short-form reel hook in your voice — pick a B-roll, the text is already yours."
  - **Subject lines**: drop all three. Current options are output-changelog ("visual upgrade", "B-Roll Reels, Substack export, and a cleaner content kit", "Less clicking, more publishing"). Replace with something that names the user's ongoing relationship with the product: e.g. `Your voice profile got smarter` or `EchoMe now reads more of you`.
  - **Tenet served**: CONTEXT IS KING

### 4.9 Pricing feature pills are pure production-tool grammar

- [ ] `src/app/HomeContent.tsx:230-237` (Echo plan), `:281-290` (Studio), `:331-341` (Pro)
  - **Action**: For each tier, lead the feature list with one *context-side* line and de-emphasize production limits. Example for Echo:
    - **Current first three**: `2 hours of video processing / 5 clips per video / 1 Knowledge Base (your voice profile)`
    - **Proposed first three**: `Your voice profile (1 KB, 0-100 strength) / Reads YouTube, Instagram, blog, email, voice / Up to 5 clips per video, 2 hrs of processing`
  - **Tenet served**: CONTEXT IS KING

### 4.10 NotChatGPTSection — `You upload video` is asymmetric

- [ ] `src/components/landing/NotChatGPTSection.tsx:68`
  - **Current**: `You upload video`
  - **Proposed**: `You give it any input` *or* `You give it your work`
  - **Tenet served**: CONTEXT IS KING (don't privilege video as canonical EchoMe action)

### 4.11 Reel-editor caption-control claims to verify

The audit prompt notes: *"The reel editor today supports caption position only (top/center/bottom). Caption text, color, and timing are not user-editable. If any frontend copy claims otherwise, flag it as a factual error."*

- I did not exhaustively audit the reel editor surfaces in this pass (it sits under `src/app/app/reels/` and was outside the prompt's listed surfaces). The demo video script (`demo-video-script.md:65`) says: `you've got options — Color Pop, Modern, Karaoke, Word by Word. Pick the one that matches your brand.` That implies users can pick caption *styles* (which may be legitimate — pre-set styles, not free-form editing) but nowhere does it claim text/color/timing are editable. I flag this as a follow-up: someone with a recent build should verify the in-product reel-editor copy against the prompt's note.

---

## 5. IA / structural changes (renames + reorganization)

### 5.1 Rename "Following" → "Creator Radar"

- [ ] **In-app route**: `/app/following` → `/app/radar` (keep an alias on the old path for back-compat).
- [ ] **Page title** (`FollowingContent.tsx:326-328`): `Following` → `Creator Radar`.
- [ ] **Sidebar label**: same.
- **Why**: The marketing already uses "Creator Radar" (CreatorRadarSection on homepage). The in-app passive label "Following" undersells the industrial repurposing thesis. Founder identified this as "horribly represented"; evidence in this audit confirms the diagnosis.
- **Tenet served**: CONTEXT IS KING (industrial framing) + IA consistency.

### 5.2 Resolve "Library" name collision

The current `/app/library` is **not** the user's library of generated content — it's a curated B-roll/caption/script asset toolkit. The user's library of generated content is at `/app/content-kit`. This is the most confusing IA in the product.

- [ ] **Rename `/app/library` → `/app/toolkit`** (or `/app/assets`, `/app/curated`).
- [ ] **Rename `/app/content-kit` → `/app/library`** (the place where users' generated content lives — what they'd intuitively look for under "library").
- [ ] Update all sidebar labels and cross-page references.
- **Why**: Currently users will look at "Library" expecting their stuff, find a stock-asset toolkit, and conclude EchoMe is a stock-content production tool. Worst-case Jaya signal.

### 5.3 Rename Knowledge Base page header

- [ ] **`/app/knowledge` page title** (`KnowledgeContent.tsx:120`): `Build Your Voice` → `Your voice profile` *or* `What it knows about you` *or* simply `Your context`.
- **Why**: "Build Your Voice" frames the page as user homework. The page is the system's brain; the title should make that obvious.

### 5.4 `/onboarding` route — eliminate or convert to optional "wizard"

- [ ] Either:
  - (a) Delete `/onboarding` entirely. After signup, drop the user directly at `/app` with the WelcomeBanner. Pre-populate KB from a public-data crawl in the background (§6) — the user sees a banner that says "I went to look you up — here's what I found" and can confirm/edit.
  - (b) Keep the chat-driven flow but mark it as *optional* up front (Echo's first message becomes "I went to look you up. Want to confirm what I found, or just start creating? Either's fine.").
- **Why**: NO ONBOARDING tenet. (a) is the strict reading. (b) is the pragmatic compromise.

### 5.5 Settings → Connected Accounts as the default profile tab

- [ ] Reorder the Settings tabs so `Connections` (which presumably handles social/auth integrations) is the prominent path. The Profile tab's 11 manual fields should be hidden or collapsed behind "Adjust details" — not the first thing the user sees.
- **Why**: Reframes settings from "fill in your info" to "manage what the system already knows."

---

## 6. WORK BEFORE THE WORK proposals (spec for backend context-gathering)

Each item: the existing form field, the public sources the system could read instead, and the implication.

### 6.1 At signup-time (`src/app/auth/signup/SignupContent.tsx`)

| Field | Currently | Public sources | Notes |
|---|---|---|---|
| Full Name | typed | OAuth provider profile (Google, Apple, LinkedIn), email-domain WHOIS, brand-website crawl | If user signs up via OAuth, name should auto-fill before email even resolves. |
| Avatar | not asked | OAuth profile picture, Gravatar (from email hash), brand-website headshot, LinkedIn headshot | Let the user see a headshot the moment they sign up. |
| Brand domain | not asked | Email domain (`@askjay.ca` → `askjay.ca`) | Single most valuable inferable signal. Open this and the rest cascades. |

### 6.2 At onboarding (`src/app/onboarding/OnboardingContent.tsx`)

Replace the multi-step interrogation with a single backend pre-fetch on the first paint of `/onboarding` (or `/app` if §5.4 path-a is taken). Sources to crawl, given an email or a brand domain:

- **Brand website** (e.g., ASKJAY.ca) — extract: bio paragraphs, services, headshot, brand colors, social links, recent blog posts.
- **LinkedIn profile** (from email hash or brand domain About page) — extract: headline, About section, current title, recent activity (posts).
- **Public Instagram profile** (from brand site link or LinkedIn bio) — extract: bio, last 12 posts (captions for voice training).
- **Public YouTube channel** (from brand site link) — extract: latest 10 video titles + descriptions; queue transcripts for voice training.
- **Google Business Profile / Re/Max profile / MLS** (industry-specific lookups) — extract: business name, role, location, headshot, hall-of-fame designations.
- **Public-domain post archives** (Substack, Medium) if linked from brand site.

The user lands on `/app` to: *"I read your remax.ca profile, ASKJAY.ca, your last 14 Instagram captions, and your 8 most recent YouTube videos. Voice strength is at 47/100 (Growing). Generate something or add another source."*

This is the WORK BEFORE THE WORK tenet, made functional. **This is the single highest-leverage feature the platform could ship to fix the Jaya class of failure.**

### 6.3 In Settings Profile (`src/app/app/settings/SettingsContent.tsx:340-540`)

Every field currently asked manually has a lookup path. The Settings UI should show: *"Here's what I have. Edit anything that's wrong."* — pre-populated from the §6.2 pre-fetch.

| Field | Public source |
|---|---|
| Display Name | LinkedIn `Name` |
| Full Name | LinkedIn `Name` (canonical), legal-name OAuth |
| X handle | LinkedIn `Contact info`, brand-website footer, public link in IG bio |
| Instagram handle | brand-website footer, LinkedIn `Contact info` |
| Website URL | email domain (if not gmail/hotmail) |
| Bio | LinkedIn `About` section, brand-website "About" page |
| Profile Role | LinkedIn current `Title` |
| Profile Topics | LinkedIn `About` + last 30 posts (LDA) |
| Profile CTA | brand-website primary CTA (button/link in hero) |
| Profile Guardrails | tone analysis of last 30 posts |
| Profile Image | LinkedIn headshot, brand-website hero photo, Gravatar |

### 6.4 In the Knowledge Base (`src/app/app/knowledge/KnowledgeContent.tsx`)

The first-visit state should not say "Teach Echo how you write." It should show a card per public source the system *already read*: "Read 14 Instagram captions from @jayandjayahomes (5 days ago). Confirm or remove."

This is the strongest single demo of WORK BEFORE THE WORK in the product — the page that exists to be the system's brain should *display* the brain on first visit, not ask the user to start one.

### 6.5 New "Public sources crawler" backend service (the spec)

To enable §6.1–§6.4, the backend would need:

- A service that given `{email}` or `{email_domain}` returns a normalized public-profile object: `{ name, headline, bio, role, website, socials: {...}, headshot_url, recent_posts: [...] }`.
- Source ranking + de-duplication (LinkedIn-About usually wins for bio over brand-site About; brand-site current-CTA wins for `profile_cta`).
- Privacy-respecting: only public data; no scraping behind logins.
- Confidence per field: shown in the UI as "we're 90% sure this is your role; click to confirm."

This is a new service to be specified separately. The audit's contribution is: **the frontend's empty state assumes this service does not exist. Once it does, every WORK BEFORE THE WORK violation in this report collapses.**

---

## 7. Chat-first proposals (top 5 candidates)

The product has chat-first DNA in the right places (onboarding, KB) and form-driven debt in the wrong places. The five highest-leverage form→chat conversions:

### 7.1 Settings Profile tab → "Confirm what I found" chat

- **Current**: 11 fields in a vertical form (`SettingsContent.tsx:340-540`).
- **Proposed**: A chat where Echo says: *"I found these for you. Reply 'change [field]' if anything's wrong."* — followed by a single message containing the pre-populated values. User says "change role to Senior Realtor with Re/Max" and Echo updates. Drops 11 inputs to 0 in the common case.
- **Tenets served**: CHAT FIRST + WORK BEFORE THE WORK + LOW UI.

### 7.2 Following Repurpose modal → conversational repurpose

- **Current**: `FollowingContent.tsx:564-741` — multi-section modal with platform checkboxes, carousel-style picker, file upload.
- **Proposed**: From the feed item itself: *"Repurpose this for LinkedIn + Instagram, your usual voice?"* with a single Yes button and a "different platforms / different style" follow-up. Default to the user's last successful repurpose preset.
- **Tenets served**: CHAT FIRST + LOW UI.

### 7.3 Onboarding profile step → single chat reply

- **Current**: `OnboardingContent.tsx:504-547` — three inputs (name, X handle, IG handle).
- **Proposed**: After §6.2 backend exists, this step disappears entirely. Until then, condense to one Echo question: *"What should I call you? (And if you have a website or LinkedIn, drop the link — I'll grab the rest from there.)"* — single reply parsed for name + URL.
- **Tenets served**: CHAT FIRST + WORK BEFORE THE WORK + NO ONBOARDING.

### 7.4 Generation regenerate / refinement loop

- **Current**: After a generation completes, the user sees a content kit page with copy buttons. To regenerate or refine, they navigate back and re-run the form.
- **Proposed**: Inside the content kit detail, a chat anchored to the bottom of every platform tab: "*This LinkedIn post sound like you?*" → user says "make it shorter, less self-promotional" → Echo regenerates that one platform inline.
- **Tenets served**: CHAT FIRST + CONTEXT IS KING (the chat is grounded in *this* post + the KB).

### 7.5 Knowledge Base "ask Echo what it knows" — promote to first-class

- **Current**: `KnowledgeContent.tsx:197-204` — KBChat appears only after user adds content.
- **Proposed**: After §6.2 backend exists, KBChat appears *immediately on first visit*, pre-seeded with: *"Ask me anything about your voice. I just read your last [N] posts — try 'what do I sound like'."*
- **Tenets served**: CHAT FIRST + CONTEXT IS KING.

---

## 8. Open questions for Ara

Items where the right answer requires founder judgment, not a copy fix.

- [ ] **Free Video Compressor on the homepage.** Per the SEO/lead-gen logic this might earn its placement. But it actively reinforces the wrong category. Should it (a) move to a dedicated `/tools` page and stay off the homepage, (b) move below the affiliate program (de-prioritized), or (c) stay where it is and be reframed as *"free utility we built while building the real product"*?

- [ ] **`MIN_CONTENT_ITEMS = 3` gate in onboarding.** I propose dropping it to 0 (§4.6). But there may be a quality reason — generations with 0 sources may produce embarrassingly bad output that loses users *more* than the gate does. Open question: what does generation quality look like at 0/1/2 sources? If unacceptable, the right fix is generating with public-data fallback context (§6.2) rather than a user-facing gate.

- [ ] **The product has 17 in-app routes.** This audit treats that as a "feature rich, low UI" pressure point but doesn't recommend specific consolidation. Is the founder open to merging routes (e.g., merge `Reels`, `Clips`, `Descript` into a single video-output destination) or is the surface area locked in?

- [ ] **"Build Your Voice" vs. "Your voice profile."** Both are defensible names for the KB page. "Build" is action-oriented and motivational; "Your voice profile" is content-accurate and tenet-conformant. Which framing does the founder prefer? The tenets favor the latter, but the marketing voice has historically used the former.

- [ ] **Renaming Library ↔ Content Kit.** §5.2 proposes swapping these names. This is a high-leverage IA fix but breaks back-compat for existing users (URLs, bookmarks, muscle memory). Worth the disruption?

- [ ] **`/onboarding` route — delete or keep optional?** §5.4 offers two paths. Path (a) deletes the route entirely; path (b) keeps it as optional. Founder choice.

- [ ] **The homepage hero badge `Content Transformation`.** Removing it cleans the viewport (LOW UI) and removes a betrayal (CONTEXT IS KING). Replacing it with `Context-First AI` adds a tenet-conformant signal but more visual noise. Or remove the badge entirely?

- [ ] **WORK BEFORE THE WORK is a backend feature.** §6 specifies the frontend's expectation. Who's building the public-sources crawler service, and what's the timeline? This audit's biggest single recommendation depends on it existing.

---

## Appendix A — Quick reference: where each tenet is best embodied

If you only have time to look at one example of what a tenet-conformant surface looks like in this codebase, here:

- **CONTEXT IS KING**: `src/components/landing/HowItWorks.tsx:24-37` (`Context is King.` + the two-paragraph follow-up).
- **LOW UI**: `src/components/UnifiedCreateInput.tsx` central composer (lines 150-243). One textarea, three buttons.
- **FEATURE RICH, LOW UI**: `src/app/app/knowledge/KnowledgeContent.tsx` does this best — voice strength + unified input + chat + collapsible sources, all on one calm page.
- **CHAT FIRST**: `src/app/onboarding/OnboardingContent.tsx` is unambiguously chat-first. Use this flow's structural pattern as the template for §7's proposals.
- **NO ONBOARDING**: This tenet has no positive embodiment in the current code (the existence of `/onboarding` is the violation). The closest positive is the dashboard's `WelcomeBanner` — value visible immediately without configuration ceremony.
- **WORK BEFORE THE WORK**: This tenet has *no* positive embodiment in the current code. Section 6 is the spec for the first surface that would embody it.

## Appendix B — Files inspected

Marketing / public:
- `src/app/page.tsx` (wrapper)
- `src/app/HomeContent.tsx` (631 lines)
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/KnowledgeBaseSection.tsx`
- `src/components/landing/CreatorRadarSection.tsx`
- `src/components/landing/NotChatGPTSection.tsx`
- `src/components/landing/TestimonialStrip.tsx`

Auth:
- `src/app/auth/login/LoginContent.tsx`
- `src/app/auth/signup/SignupContent.tsx`

Onboarding & app:
- `src/app/onboarding/OnboardingContent.tsx` (752 lines)
- `src/app/app/AppContent.tsx` (663 lines)
- `src/components/welcome-banner.tsx`
- `src/components/UnifiedCreateInput.tsx`
- `src/app/app/content-kit/ContentKitContent.tsx`
- `src/app/app/library/CreatorLibraryContent.tsx`
- `src/app/app/following/FollowingContent.tsx` (745 lines)
- `src/app/app/knowledge/KnowledgeContent.tsx`
- `src/app/app/settings/SettingsContent.tsx` (1271 lines, audited via greps + first 200 lines)

Marketing assets:
- `docs/email-drafts/2026-04-18-platform-update.md`
- `docs/demo-video-script.md`

Reference (not audited but read for context):
- `copy_refractor.md`
- `HOMEPAGE_REDESIGN_PLAN.md` *(historical — pre-current-hero)*
- `HOMEPAGE_REDESIGN_SUMMARY.md` *(historical)*
- `~/Side Quests/EchoMe Platform Frontend Audit Report.md` *(based on the older `packages/web/` monorepo structure; current paths diverge)*

Surfaces NOT audited in this pass (flag for follow-up):
- The Reel Editor / Caption Editor copy (per the prompt's note about caption-control claims)
- `/app/clips`, `/app/reels`, `/app/descript`, `/app/calendar`, `/app/integrations`, `/app/team-voices`, `/app/trends`, `/app/profile`, `/app/billing`
- The full SettingsContent surface beyond the Profile tab (Account, Connections, Preferences, Billing, Referral)
- Marketing pages outside the homepage (`/realtors`, `/affiliates`, `/community`, `/developers`, `/faq`, `/guides/*`, `/examples`)
- Help widget (`HelpWidget`) public/authenticated copy

---

*End of audit.*
