# Work Before The Work — Scoping Doc

> **Read this in ~20 minutes. Approve a build order by checking boxes. Hand sub-sections (legal, vendor selection, real-world validation) to specialists.**

This doc scopes the implementation of the **Work Before The Work (WBTW)** tenet — the founder's principle that *the system should arrive at the user's first session already knowing things about them*, not ask the user for what is publicly discoverable.

It is the unblocking dependency for several recommendations in the 2026-04-28 positioning audit (Settings auto-population, KB first-visit "here's what I read about you", `/onboarding` deletion as a strict tenet reading, the sliding influence dial starting at 35-50% on day 1 instead of 0).

This is a planning doc, not an implementation. The deliverable below is decisions to be made and a build order to follow, not code.

---

## 1. Goal + non-goals

### Goal

Given a new user's email + brand domain at signup, the system pulls structured profile data from public web sources within ~30 seconds, populates `users.profile_*` fields and `kb_content` voice samples, and lets the user confirm or correct in a single chat-shaped review screen — no manual form-filling required.

### Non-goals

- Not a sales/lead-enrichment tool. Data goes back to the same user it describes; we never sell, share, or use it for anyone else.
- Not a substitute for the user's own input. WBTW pre-populates; the user can override every field.
- Not a comprehensive person-graph. Coverage = "enough for first generation to feel personal," not "every fact about you."
- Not a one-size-fits-all crawler. v1 is realtor-shaped (US/Canada). Other industries are a v2+ question.

---

## 2. Constraints

From founder direction:

- **Realtors first** (US + Canadian). Other industries: maybe later.
- **Build-ourselves preferred.** Vendor only as fallback.
- **Cost ceiling: ≤$1/user/month at scale.** Per-lookup target ~$0.05-0.20 amortized over 30-day cache.
- **Privacy posture**: only public data; clear signup-time disclosure; per-field provenance; user can delete.
- **Architectural fit**: WBTW eventually rides on top of the chat-first redesign as a tool the chat engine can call (`lookup_user_public_data(email)`). v1 ships as a standalone service; v2+ exposes it via the chat-engine tool surface.

---

## 3. v1 source plan

Five sources, all build-ourselves, all defensible.

| Source | What we get | Legal posture | Per-lookup cost | v1 priority |
|---|---|---|---|---|
| **Realtor's own brand site** (e.g., `askjay.ca`) | Bio, services, headshot, brand voice, social links, recent blog posts | Cleanest in the list — same data subject populating their own profile, public marketing site, no third-party ToS | ~$0.02 (1 search + 1 fetch + Haiku extraction) | **P0** |
| **RE/MAX agent profile** (`remax.com`/`remax.ca`) | Name, brokerage, photo, bio, designations (incl. Hall of Fame), recent listings count, contact info | `robots.txt`-clean on both domains — `remax.ca` explicitly references `agent_sitemaps_index.xml`; want their agents indexed. Server-rendered HTML, no headless browser needed. | ~$0.015 (no proxy needed; datacenter IP fine) | **P0** |
| **NAR public directory** (`directories.apps.realtor`) | Membership status, primary brokerage, designations | Public membership data, no auth required | ~$0.005 | **P0** |
| **Public Instagram profile** (via `sociavault.ts`) | Bio, follower count, profile pic, recent post captions (for voice samples) | Defensible logged-out scraping per *Meta v. Bright Data* (N.D. Cal. Jan 2024). Sociavault takes the technical/operational risk; we just call their API. | ~$0.004 + $0.004 per page of posts | **P1** |
| **Google Business Profile** (via SERP scrape, not Places API) | Business name, rating, review count, hours, photos | Public SERP defensible. Avoiding the Places API which lost its free tier Feb 2025 | ~$0.01 (Serper search → parse) | **P1** |

**Per fresh lookup total: ~$0.05-0.10 + ~$0.05 LLM extraction across pages = ~$0.10-0.15.**

With a 30-day cache, steady-state per-user cost is dominated by *new* lookups, not re-crawls. Comfortably under the $1/user/month ceiling.

### Sources explicitly NOT in v1

- **Realtor.com / Realtor.ca** — both fight scrapers at the network layer (Akamai/Cloudflare bot challenges). Hostile ToS, expensive proxy budget to break through, CREA litigious about MLS-derived data. If needed later: **ATTOM Data** or **SimplyRETS** as licensed fallbacks ($500-2k/mo enterprise minimums).
- **MLS data** — no per-region path that fits our budget. Each regional MLS requires its own IDX/RETS feed agreement. Skip.
- **LinkedIn** — *don't*. Proxycurl was sued by LinkedIn and shut down January 2025. The whole LinkedIn-data vendor category is a falling knife. Don't depend on a vendor that may not exist in 6 months. If a user really wants LinkedIn data, let them paste their profile URL and we can scrape *with* their session cookie under our ToS — shifting contract risk to them voluntarily.
- **Other brokerages** (Coldwell Banker, Century 21, Compass, BHHS, eXp) — public profiles exist but no shared schema. v2 candidates if we expand beyond RE/MAX-heavy realtor population.
- **Hall-of-fame / "top producer" rankings** — no structured public source. RealTrends sells the data; RE/MAX hall-of-fame is announced inline on agent profiles. Treat as "nice if it's on the page we already fetched," not a separate lookup.

---

## 4. Architecture

### 4.1 Service shape

A new service: `src/services/public-data-lookup/`

```
public-data-lookup/
├── index.ts                    # PublicDataLookupService.lookup({ email, domain?, instagramHandle? })
├── sources/
│   ├── brand-site.ts           # Fetch + html-to-text + Haiku extraction
│   ├── remax-profile.ts        # Tavily search → fetch → Haiku extraction
│   ├── nar-directory.ts        # Tavily search → fetch → Haiku extraction
│   ├── instagram-public.ts     # Wraps existing sociavault.ts
│   └── google-business.ts      # Serper SERP scrape → Haiku extraction
├── orchestrator.ts             # Parallel fan-out, merge, confidence scoring
├── extractor.ts                # Shared Haiku extraction: HTML → structured profile fields
├── types.ts                    # PublicProfile, FieldConfidence, SourceTrace
└── cache.ts                    # 30-day cache via Supabase (or Redis)
```

### 4.2 Data flow

```
                  [signup completes]
                         │
                         ▼
       ┌─── PublicDataLookupService.lookup({ email }) ───┐
       │                                                  │
       ▼                                                  ▼
[parallel: 5 source fetchers]              [Tavily query: "{name} realtor {city}"]
       │                                                  │
       ▼                                                  ▼
 [raw HTML pages 1..5]                    [URLs found: brand site, RE/MAX, NAR profile, etc.]
       │                                                  │
       └────────────────────┬─────────────────────────────┘
                            ▼
              [Haiku extraction per page → structured fields]
                            │
                            ▼
            [merge + confidence scoring + provenance]
                            │
                            ▼
       ┌─── PublicProfile { fields[], sources[], confidence } ───┐
       │                                                          │
       ▼                                                          ▼
  [persist to public_profiles table]             [return to caller / frontend]
```

### 4.3 Integration with existing services

Reuse — do not reinvent:

- `src/services/external/sociavault.ts` for Instagram (existing methods `getProfile`, `getProfilePosts`)
- `src/services/external/web-search.ts` Tavily HTTP plumbing (extract a `findProfileUrls(name, city)` helper)
- `src/services/kb-content/paste-service.ts` to ingest extracted bios/captions as voice samples (`sourceType: 'writing_sample'`, `metadata.source: 'wbtw_lookup'`)
- `src/services/voice/voice-analyzer.ts` rebuilds the voice profile after WBTW writes ≥3 KB chunks (it already does this on threshold; no change needed)
- `src/services/usage/usageService` for cost tracking per lookup
- The `users.profile_role / profile_topics / profile_cta / profile_guardrails` columns already exist (added in `7c2dd36`). WBTW writes directly to these.

### 4.4 Architecture option chosen

Three options were considered:

- **(i)** Standalone `/api/lookup/profile` service called at signup
- **(ii)** Tool inside the proposed chat engine (`lookup_user_public_data`)
- **(iii)** Hybrid — minimal lookup at signup for instant value, deeper lookup as a chat-engine tool

**Recommended: (iii) hybrid.**

- v1 ships as (i) — standalone service called once at signup. Fast to build, immediate value, no chat-engine dependency.
- v2 (when chat engine ships per the shelved `project_chat_first_redesign.md`) — same service exposed as a tool. The chat engine can call it on demand: *"Hey Echo, can you check if my Re/Max profile has the new headshot yet?"*

This avoids blocking WBTW on a chat-engine timeline that doesn't exist yet, while not painting us into a corner.

---

## 5. Cost model

### Per-lookup (fresh)

| Component | Cost |
|---|---|
| Tavily search (find profile URLs) — `search_depth: 'advanced'` | $0.006 |
| Sociavault Instagram (`getProfile` + 1 page of posts) | $0.008 |
| RE/MAX HTML fetch (no proxy needed) | $0 |
| Brand site HTML fetch | $0 |
| NAR directory fetch | $0 |
| Google Business via Serper SERP | $0.001 |
| Haiku extraction × 5 pages (~10K input + 500 output tokens each) | ~$0.06 |
| **Total** | **~$0.075-0.10** |

### Steady-state per user

- Lookup happens once at signup → cached 30 days
- Re-lookup on user request (e.g., "I updated my Re/Max profile, refresh") → maybe 1-2× per year per active user
- **Steady-state ~$0.10-0.20 per user per year** — well under $1/user/month.

### Throughput at current scale

- Current: ~180 users, ~3-5 new signups/week → ~15-25 lookups/month → **<$3/month** at v1 scale.
- 10× growth (1,800 users, 30-50 new signups/week): **<$30/month**. Still trivial.

### Worst-case scenarios

- Instagram anti-bot tightens → Sociavault price increase or service degradation. Mitigation: feature-flag Instagram path, fall back to "user pastes IG handle, we'll fetch later."
- Tavily price increase → swap to Brave Search API (free 2k/mo) or Serper ($0.30-1/1k). Both already evaluated.
- Haiku price increase → use prompt caching (already supported), halves extraction cost.

---

## 6. Schema changes

### New table

```sql
CREATE TABLE public_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fields JSONB NOT NULL,            -- { full_name: "...", role: "...", bio: "...", ... }
  field_confidence JSONB NOT NULL,  -- { full_name: 0.95, role: 0.78, ... }
  source_trace JSONB NOT NULL,      -- { full_name: "remax.ca/agent/jaya-dewan", role: "askjay.ca", ... }
  raw_pages JSONB,                  -- { "remax.ca/...": "<html>...", "askjay.ca": "..." } (for debug + re-extraction)
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  user_confirmed_at TIMESTAMPTZ,    -- NULL until user reviews; set on confirm
  user_overrides JSONB,             -- { full_name: null /* accepted */, role: "Senior Realtor" /* corrected */ }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_profiles_user ON public_profiles(user_id);
CREATE INDEX idx_public_profiles_expiry ON public_profiles(expires_at) WHERE user_confirmed_at IS NULL;
```

### `users` table — no schema change required

Already has `profile_role`, `profile_topics`, `profile_cta`, `profile_guardrails`, `profile_image_url`, `bio`, `website_url`, `twitter_handle`, `instagram_handle`, `display_name`, `full_name`. WBTW writes here directly after user confirmation.

### `kb_content` — no schema change

WBTW-extracted text (bios, captions) writes via `pasteService.ingestContent({ sourceType: 'writing_sample', metadata: { source: 'wbtw_lookup', source_url: '...' } })`. Existing path.

---

## 7. API surface

### New endpoints

```
POST /api/wbtw/lookup
  Body: { email?, domain?, instagram_handle? }   // any/all optional
  Returns: { profile_id, fields, field_confidence, source_trace, ready: bool }
  Auth: authenticateUser, requireSubscription() (any paid tier; free tier: 1 lookup lifetime)
  Rate limit: 1 lookup per user per 24h

GET /api/wbtw/profile
  Returns: latest public_profile for current user, with confirmation state

POST /api/wbtw/profile/confirm
  Body: { fields_to_accept: [...], fields_to_override: { role: "...", ... } }
  Effect: writes confirmed fields to users.profile_*, marks user_confirmed_at, ingests text into KB
  Auth: authenticateUser

DELETE /api/wbtw/profile
  Effect: hard-deletes public_profiles row + any KB chunks with metadata.source = 'wbtw_lookup' for this user
  Auth: authenticateUser
```

### Reuse pattern

Follow `src/services/external/sociavault.ts` shape: typed wrapper, env-var auth, usage tracking via `usageService`. Follow `src/middleware/subscription.ts:requireTier(...)` for gating per the audit's WBTW security pattern.

---

## 8. UX integration

### 8.1 At signup

After successful signup (current `/auth/signup` → email confirmation → `/app`), instead of dropping the user at `/app` immediately, show a brief loading state:

```
[Echo avatar] Hey Jaya — give me 30 seconds. Going to look you up...

  • Reading askjay.ca ✓
  • Reading remax.ca/agent/jaya-dewan ✓
  • Reading @jayandjayahomes on Instagram ✓
  • Pulling your Google Business listing ✓

  Done. Confirm what I got right.
```

Then a single review screen — chat-shaped, not a form:

```
[Echo avatar] Here's what I have. Reply 'change [field]' if anything's wrong, 
              or hit Looks Good and we'll start.

              Name: Jaya Dewan ✓
              Role: Re/Max Real Estate Centre — Realtor (Hall of Fame) ✓
              Topics: Mississauga homes, family-focused real estate, market updates ✓
              Bio: "Helping families find their forever home since 2015..." ✓
              Brand voice: warm, direct, no jargon ✓
              Headshot: [thumbnail] ✓

              I also read 14 of your recent Instagram captions and 8 blog posts 
              from askjay.ca. Voice strength so far: 47/100 (Growing).

              [ Looks Good ]   [ Change something ]
```

Click `Looks Good` → fields written to `users.profile_*`, KB seeded, voice profile rebuilt, user dropped at `/app` with `WelcomeBanner`. **End-to-end: ~30 seconds with zero typing.**

### 8.2 In `/app/voice` (per Q5 of audit walkthrough)

The KB page renamed "Your Voice" shows:
- Voice strength dial (per Q2 — sliding influence)
- "What it knows about you so far" subhead
- Source list with a column for `source: wbtw_lookup` so the user can see at a glance: *"system found this on its own"* vs. *"I added this manually"*
- Chat at the bottom (KBChat, already shipped)

### 8.3 In `/app/settings`

Profile context fields (`role`, `topics`, `cta`, `guardrails`) move from Settings → `/app/voice` per Q3 surgery. The Settings tab becomes purely auth/billing/preferences. Auto-populated values from WBTW are visible in `/app/voice` as confirmable cards, not as a form.

### 8.4 Privacy disclosure

At signup, before the lookup runs, a one-line disclosure:

> EchoMe will read your public web presence (your brand site, public Instagram, public realtor profiles) so you don't have to fill out a profile manually. We don't share, sell, or use this data anywhere except for your own content generation. You can edit or delete anything we find at any time.

Plus a link to a longer privacy explanation.

The same disclosure appears in `/privacy` and is referenced from the Terms of Service.

---

## 9. Build order — phased

### Phase 1 — Foundation + safest sources (3-4 days)

- [ ] Create `src/services/public-data-lookup/` directory structure
- [ ] Implement `extractor.ts` (shared Haiku extraction prompt; HTML → structured profile fields)
- [ ] Implement `sources/brand-site.ts` (fetch + `html-to-text` + extractor)
- [ ] Implement `sources/remax-profile.ts` (Tavily search → fetch → extractor)
- [ ] Implement `sources/nar-directory.ts` (Tavily search → fetch → extractor)
- [ ] Implement `orchestrator.ts` (parallel fan-out, merge, confidence scoring)
- [ ] Implement `cache.ts` (Supabase `public_profiles` table writes)
- [ ] Add `public_profiles` migration
- [ ] Unit tests + 3 known-user fixtures (Ara, Jaya, one other)

**Deliverable**: backend service callable via `npm run lookup:test -- ara@thespringteam.ca` produces a structured profile.

### Phase 2 — Instagram + Google Business (2-3 days)

- [ ] Implement `sources/instagram-public.ts` wrapping existing `sociavault.ts`
- [ ] Implement `sources/google-business.ts` via Serper SERP
- [ ] Add feature flag `WBTW_INSTAGRAM_ENABLED` (default off until field validation passes)
- [ ] Add feature flag `WBTW_GOOGLE_BUSINESS_ENABLED` (default off)
- [ ] Extend orchestrator to call these when flags on

**Deliverable**: full 5-source orchestrated lookup working in test harness.

### Phase 3 — API + frontend integration (3-5 days)

- [ ] Add `/api/wbtw/*` routes with subscription + rate-limit middleware
- [ ] Frontend: signup-completion handler calls `POST /api/wbtw/lookup` and shows the loading + review UI
- [ ] Frontend: `/app/voice` shows WBTW-sourced items with source badges
- [ ] Frontend: review/confirm screen wiring
- [ ] Privacy disclosure copy + ToS link
- [ ] Backend: wire `POST /api/wbtw/profile/confirm` to write `users.profile_*` and ingest text via `pasteService`
- [ ] E2E test: signup → WBTW runs → user confirms → KB has chunks → voice strength > 0

**Deliverable**: end-to-end signup flow that produces a working voice profile in ~30 seconds with zero manual data entry, shipped behind a `WBTW_ENABLED_AT_SIGNUP` feature flag.

### Phase 4 — Validation + tuning (1-2 weeks of soak time, async)

- [ ] Run WBTW against all 180 existing users in shadow mode (no DB writes; just produce profiles for review)
- [ ] Score precision (% of pulled fields that are accurate per real user) and recall (% of fields populated per real user)
- [ ] Tune Haiku extraction prompts based on failure cases
- [ ] Decide whether to enable Instagram and Google Business flags by default
- [ ] Roll out to new signups with monitoring on `usage_logs`, `public_profiles.expires_at`, error rates

**Deliverable**: WBTW on by default for new signups; audit's NO ONBOARDING + WORK BEFORE THE WORK violations resolved.

### Phase 5 — Chat-engine convergence (when chat engine ships, deferred)

- [ ] Expose `lookup_user_public_data` as a tool in the chat engine
- [ ] Allow on-demand re-lookup via chat ("hey Echo, refresh my profile")
- [ ] Use chat to surface lookup *changes* over time (e.g., "looks like you joined a new brokerage — want me to update your bio?")

**Total v1 effort: ~10-14 days of focused backend + frontend work, plus ~2 weeks soak time before defaulting on.**

---

## 10. Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Instagram anti-bot tightens; Sociavault degrades or raises price | Medium | Medium | Feature-flag Instagram path; fall back to "paste your IG handle, we'll fetch later" |
| RE/MAX changes profile HTML structure, breaks scraper | Medium-Low | Low | Haiku extraction is structure-agnostic — re-test quarterly; alert on extraction-confidence drops below threshold |
| User has no public footprint (privacy-conscious, brand-new agent) | Low for realtors | Medium | Graceful empty-state: *"Couldn't find much yet. Drop a YouTube video or paste a post and I'll learn your voice from there."* — degrades to current onboarding, doesn't break |
| Common-name disambiguation (which "John Smith"?) | Medium | Medium | Use email domain to anchor (if user signs up as `john@johnsmithrealty.com`, prefer profiles linked to that domain). Show confidence; let user reject mismatches. |
| GDPR / PIPEDA / CCPA compliance scrutiny | Low at current scale | High if it happens | Per-field provenance + disclosure + delete endpoint already in design. Bill C-27 readiness. Get legal review before defaulting on. |
| LinkedIn dependency creep | Avoidable | High | **Don't add LinkedIn.** Period. If a future need surfaces, revisit; vendor landscape may have changed. |
| Cost overrun from Haiku extraction at scale | Low | Low | Prompt caching; per-call usage tracking; monthly cost dashboard |
| Realtor.com / Realtor.ca scraping becomes legally permissive | Low | Low | Skip in v1; revisit annually |

---

## 11. Real-world validation plan

Before defaulting WBTW on for new signups, validate against existing users:

1. **Shadow run** all 180 existing users through WBTW (no DB writes, just produce profiles).
2. **Score per-user**:
   - **Precision**: of N fields populated, how many are accurate? (Target: ≥80% precision; <80% means tune extraction or de-prioritize that source.)
   - **Recall**: of M fields possible, how many were populated? (Target: ≥60% recall on top-5 fields — name, role, bio, headshot, brand voice.)
3. **Score per-source**: which sources contribute the most accurate data per dollar? Likely ranking: brand site > RE/MAX > NAR > Instagram > Google Business. Adjust orchestrator weighting.
4. **Tune Haiku extraction prompts** based on failure modes. Common failures (predicted): outdated bio text, mismatched social handles, mistaken business location.
5. **Cost-per-user audit**: actual $ spent per lookup vs. modeled $0.075-0.10. Adjust expectations.
6. **Failure-mode audit**: how does the system behave for users with no public footprint? Users with same-name confusion? International users? Document graceful degradation.

**Output**: a 1-page validation report with go/no-go decision on enabling WBTW by default.

---

## 12. Open decisions for Ara

- [ ] **Free-tier policy**: should free-tier users get WBTW at signup? Per current rate-limit proposal: 1 lifetime lookup for free tier, 1/24h for paid. Or: gate WBTW behind any paid tier entirely. (Recommended: free tier gets 1 lookup so first-generation feels personal — that's the wedge.)
- [ ] **Privacy disclosure copy**: who writes the user-facing language? Recommend a copywriter pass on the disclosure block in §8.4 before legal review.
- [ ] **Legal review timing**: get counsel review before Phase 3 (frontend integration) or before Phase 4 (defaulting on)? Recommendation: before Phase 4, with a privacy audit checklist as the deliverable.
- [ ] **Re-lookup cadence**: how often should WBTW refresh data automatically? Default 30 days. Could be quarterly. Or only on user request.
- [ ] **Override behavior**: if WBTW pulls a bio and the user manually edits it in `/app/voice`, does the next re-lookup re-overwrite? Recommended: no — once user-edited, that field is locked from auto-update unless user explicitly clicks "Refresh from public sources."
- [ ] **Cost-per-user soft cap**: at what point do we stop running WBTW for a user this month? Recommended: $1 hard cap → block further WBTW operations until next month + alert.
- [ ] **What to do if no public footprint found**: degrade to current text-chat onboarding, or just drop them at `/app` with an empty welcome banner? Recommended: drop at `/app`; the empty-state copy already says "give me a topic, link, or video" and that works without context.
- [ ] **Convergence with chat-first redesign**: ship WBTW v1 (standalone) now, then expose as chat-engine tool when chat engine ships? Or wait for chat engine? Recommended: ship now (standalone); the chat engine has no timeline.
- [ ] **Industry expansion timing**: when should WBTW expand beyond realtors? Realistic answer: after Phase 4 validation passes for realtors. Then add per-industry source modules incrementally.

---

## 13. Appendix — Vendor fallback tiers

If/when build-ourselves becomes infeasible for a specific source, here's the fallback ladder per source. **Only invoke these if the corresponding build-ourselves source fails validation or breaks operationally.**

| Source | Build-ourselves | Tier 1 fallback | Tier 2 fallback |
|---|---|---|---|
| Brand site | Direct fetch + Haiku | Apify generic-website actor (~$0.001-0.05/page) | — |
| RE/MAX profile | Direct fetch + Haiku | Apify RE/MAX actor (if exists) | — |
| Instagram public | Sociavault | Apify Instagram-profile-scraper actor (~$0.50-2/1k profiles) | Bright Data residential proxy + own scraper |
| Google Business | Serper SERP scrape | Geoapify Places ($59/mo, 3k/day free) | TomTom Search (~$0.50/1k) |
| LinkedIn | **DO NOT** | None viable post-Proxycurl shutdown | None viable |
| Realtor.com / Realtor.ca | **Skip** | ATTOM Data (enterprise pricing) | SimplyRETS (enterprise pricing) |
| Comprehensive person-graph | Hand-built | People Data Labs ($0.20-0.28/credit, weak realtor coverage) | Clearbit/Breeze (B2B-skewed, requires HubSpot subscription) |
| Anti-bot proxy infrastructure | Bright Data residential | ScraperAPI ($0.0085/req, cheapest) | ZenRows ($69.99/mo entry) |
| Search API | Brave free tier (2k/mo) → Serper ($0.30-1/1k) | Google CSE ($5/1k, capped 10k/day) | SerpAPI ($5-15/1k, overpriced) |

**General principle**: prefer build-ourselves for clean sources (brand site, RE/MAX), prefer existing reliable vendor for hostile sources (Instagram via Sociavault), avoid taking on legal risk where vendors do it for us cheaply.

---

## 14. Summary — what this unblocks

When WBTW v1 ships (Phase 3 complete, behind feature flag), these audit recommendations become uncashable → cashable:

| Audit recommendation | Status today | Status with WBTW v1 |
|---|---|---|
| §1.9 Onboarding "let me look you up" framing | aspirational | shippable copy |
| §1.12 KB page first-visit "here's what it knows" | unbuildable | shippable |
| §1.15 Settings auto-population (replaces 11-field form) | aspirational | shippable |
| Sliding influence dial starts at 35-50% on day 1 | starts at 0% | starts at ~50% |
| Dropping `MIN_CONTENT_ITEMS = 3` gate | risky (low-quality first gen) | safe (KB pre-seeded) |
| `/onboarding` route deletable per strict NO ONBOARDING reading | depends on this | unblocked |

**WBTW is the single highest-leverage backend project in the audit. ~10-14 days of focused work ships it.**

---

*End of scoping doc.*
