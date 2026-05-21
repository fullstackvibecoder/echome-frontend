# EchoMe Feature Quick Reference

One-pager. Mirrors the in-app sidebar so nothing gets missed in a demo, sales call, investor convo, or onboarding chat.

**Tier shorthand:** F=Free · P=Echo Pro · S=Echo Studio · T=Echo Teams · A=Admin-only · ●=in current sidebar
**Surfaces:** Frontend at `echome-frontend` (Next.js, Vercel) · Backend at `echome-platform-v2` (Node, Railway)

> ⚠ **All features are currently open to all paid users** while we observe usage and gather feedback. The tier columns below reflect the **intended** gating, not what's enforced today.

---

## CREATE — turn anything into a content kit

| Feature | Route | What it does | Tier |
|---|---|---|---|
| **Create (Dashboard)** | `/app` | One input box → full content kit. Live progress, multi-output preview. | F (5/mo) → P+ unlimited |
| **Your Library** | `/app/library` | Searchable gallery of all generated kits. Filter by status, voice (T), schedule indicators. | F+ |
| **Content Viewer** | `/app/library/[id]` | Full-screen kit editor: edit slides/captions/scripts, schedule, export. | F+ |

**Input modes (all funnel through one box):** topic/text · link (YouTube, blog, article) · video upload · voice note (recorded in-app) · Zoom URL (with password) · Repurpose from Creator Radar.

**Outputs per kit:** short-form clips with burnt-in captions · Instagram carousel slides · blog draft · email newsletter · video script for teleprompter · per-platform copy (IG, LinkedIn, TikTok, Twitter, FB, YouTube description, etc.).

---

## YOUR VOICE — train EchoMe to sound like you

| Feature | Route | What it does | Tier |
|---|---|---|---|
| **Your Voice (KB)** | `/app/voice` | Add content via YouTube, blog RSS, paste, voice record, PDF, MBOX email archive, Instagram/SociaVault, social handles. Pinecone-backed RAG. | F+ |
| **Voice Strength** | inside `/app/voice` | 0–100 score across 5 dimensions + unique waveform. Tiers: Seed / Growing / Strong / Signature. | F+ |
| **WBTW auto-import** | inside `/app/voice` | "Who Better To Write" — auto-pulls public content from your handles. Refresh button. | F+ |
| **Chat with KB** | inside `/app/voice` | Conversational Q&A over your own voice corpus. | F+ (rate-limited) |
| **Saved prompts & voice notes** | Create page / voice chat | Name and recall snippets later ("the one called Chili"). Survives across sessions. | F+ |
| **Team Voices** | `/app/voice?tab=team` | Multiple voice profiles per workspace, each with own KB, role, topics, CTA, guardrails, handles. | T only |
| **Toolkit** | `/app/toolkit` | Curated, monthly-refreshed B-roll, caption templates, reel scripts. | F (gated when generations exhaust) → P+ |

---

## DISCOVER — find inputs + plan distribution

| Feature | Route | What it does | Tier |
|---|---|---|---|
| **Guides** | `/guides` (external) | YouTube→Content, Video Content Guide, Build Your Voice, Compress Video. | Public |
| **Creator Radar** | `/app/radar` | Follow YouTube / Instagram creators; detect new posts; repurpose to your voice. | F (3 slots) → P (10) → T (unlimited) |
| **Calendar** | `/app/calendar` | Week / month / list views. Drag-to-reschedule. AI suggested posting times. Email reminders. Auto-post status. | F+ (auto-post needs S/T) |
| **Community** | external | Community forum. | Public |

---

## DISTRIBUTION — get content out the door

| Capability | Where | What it does | Tier |
|---|---|---|---|
| **Manual schedule + email reminders** | Calendar / kit viewer | Schedule a post for date/time/platforms; we email you when to post. | F+ |
| **Auto-post via Outstand** | Calendar / kit viewer | We post for you to Facebook, LinkedIn, Instagram, YouTube. **Personal LinkedIn is the standout — most tools can't do this.** | S, T |
| **Social connections** | `/app/settings` → Connections | OAuth: YouTube, Instagram, LinkedIn, Twitter, Spotify, Facebook, Google. | F+ to connect |
| **Mark as posted** | Calendar | Track manually-posted items to keep history clean. | F+ |

---

## TOOLS

| Tool | Route | Notes |
|---|---|---|
| **Video Compressor** | `/tools/compress-video` | Public, badged FREE. Pre-upload size reduction. |
| **Built-in Teleprompter** | modal from clips/scripts | Fullscreen scroll, resizable font, play/pause, download script. |

---

## ACCOUNT

| Feature | Route | Notes |
|---|---|---|
| **Billing** | `/app/billing` | Plan compare, monthly/annual toggle, manage sub, pending downgrades, usage. Stripe Customer Portal. Cancellation with win-back coupon. |
| **Developers** | `/app/developers` | API keys (scopes, rate limits) · API credit packs + auto-reload · transactions · quickstart code. |
| **Settings** | `/app/settings` | Profile (name, bio, handles, avatar) · Account (password, export/delete data) · Connections (OAuth) · Preferences (theme, notifications) · Referral · usage view. |

---

## ADMIN (A — sidebar appears only when `isAdmin`)

| Feature | Route | What it does |
|---|---|---|
| **Admin Dashboard** | `/app/admin/dashboard` | MRR/ARR, tier breakdown, trial expirations, spend by service (OpenAI / Anthropic / ElevenLabs / Deepgram / Mux / Dumpling), error logs (Sentry), audience segments, feedback review. |
| **Campaigns** | `/app/admin/campaigns` | Multi-step email drips. Targeted broadcasts (waitlist, studio-trial, trial-expiring, activation, segments). |
| **Descript Studio** | `/app/descript` | Send clips/URLs to Descript, run AI edits (remove fillers, pacing), job queue. |
| **Curated Asset Library** | admin pages | Manage Toolkit B-roll / scripts / templates served to users. |
| **Voice Similarity Report** | admin API | Voice strength distribution, weak-profile flagging. |
| **Trend-to-Reel** | admin pipeline | Auto-build a reel from a trending creator post for review. |

---

## INTEGRATIONS & PLUMBING (not user-visible features but worth naming)

- **Stripe** — checkout, portal, plan switch, webhooks (subscription lifecycle).
- **Resend inbound email → KB** — forward emails to a magic address; they land in your KB.
- **Mux** — video upload / asset readiness webhook for clip processing.
- **Pinecone + reranker** — KB retrieval for chat and voice-matched generation.
- **Sentry** — error tracking, client + server. Outage banner auto-shows when backend unreachable.
- **Plugins (Enterprise)** — generation/RAG via WhatsApp, Discord, Slack, etc. (`echome-whatsapp-handler` is the live one.)
- **Meta data-deletion webhook** — Instagram privacy compliance.

---

## TIER LIMITS AT A GLANCE

| Plan | Price | Kits | Video | KBs | Radar | Auto-post | Notable |
|---|---|---|---|---|---|---|---|
| **Free** | $0 | 5/mo | — | 1 | 3 | ✗ | Dashboard, KB chat, scheduling w/ email reminders |
| **Echo Pro** | $37/mo | Unlimited | 120 min/mo | 1 | 10 | ✗ | Teleprompter, email reminders, priority queue |
| **Echo Studio** | $87/mo | Unlimited | 300 min/mo | 3 | deeper | ✓ | Auto-post, email-history import, blog header image gen, carousels |
| **Echo Teams** | $47/voice (2 min) | Unlimited per voice | Unlimited | 99 | Unlimited | ✓ | Per-voice profiles, shared pool, priority support |
| **Admin** | — | — | — | — | — | — | Reel Maker, Descript, Campaigns, full dashboard |

> `echo_teams` is the only live teams tier. `teams_2/5/10` are a single-customer artifact (Jay) — do not pitch them.

---

## THINGS TO MENTION THAT PEOPLE OFTEN FORGET

1. **Voice strength is scored, not counted.** 0–100 across 5 dimensions with a unique waveform. Don't say "chunks."
1a. **Voice training loop is layered.** Edits to *video-derived* content feed back into your KB. Edits to *prompt-derived* content do NOT. (i.e. your real videos teach the model; prompted text doesn't.)
2. **Carousel styling is automatic** — derived from input (e.g. video → video frames). No pre-select UI.
3. **Outstand is the auto-post engine** under the hood. Supported platforms today: Facebook, LinkedIn, Instagram, YouTube.
4. **Schedule ≠ auto-post.** Free/Pro get scheduling + email reminders; Studio/Teams post for you.
5. **WBTW is opt-in but on by default** for handles you've added — it's why new users see content fast.
6. **Inbound email → KB** is a quiet superpower: forward newsletters, drafts, replies into your voice corpus.
7. **Developers tier exists.** EchoMe has a public API + credit packs.
8. **Mobile-first direction.** `echome-mobile` is the next surface; current frontend is responsive but desktop-first.
9. **AI-detection answer.** "Will IG/FB penalize this as AI content?" → No. Raw AI gets flagged; EchoMe output is platform-customized + voice-filtered, so it isn't treated the same.
10. **Personal LinkedIn auto-post is the differentiator.** Most tools can't do this. Lead with it.
11. **Substack-formatted blog output** is a real feature, not a side effect. Worth mentioning to anyone who blogs.
