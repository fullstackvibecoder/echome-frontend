# EchoMe — New User Onboarding Flow

*Snapshot: 2026-04-30 · Print landscape if the diagrams clip*

---

## 1. The path, end to end

```
                    /auth/signup
                         │
                  api.auth.signup()
                  → JWT, user state
                         │
                         ▼
              router.push('/onboarding/lookup')
                         │
                         ▼
       ┌────────────────────────────────────────┐
       │  /onboarding/lookup                    │
       │  Privacy disclosure                    │
       │  ────────────────────────────────────  │
       │  "EchoMe is going to read your public  │
       │   sources to populate your profile..." │
       │                                        │
       │  [Accept]               [Decline]      │
       └─────┬────────────────────────┬─────────┘
             │                        │
             │ accept                 │ decline
             ▼                        ▼
   POST /api/wbtw/lookup            /app  (no banner)
   Animated checklist:
     · Reading your brand site
     · Reading remax.ca
     · Reading realtor.ca
     · Reading your Instagram*

   Backend races a 3-sec fast-path window:
     │
     ├── fast + fields found ────────► /onboarding/lookup/review
     │
     ├── fast + empty result ────────► toast "couldn't find
     │                                       much yet..."   ► /app
     │
     ├── slow (>3s) ─────────────────► /app  (lookup keeps
     │                                       running in BG,
     │                                       writes to
     │                                       public_profiles
     │                                       when done)
     │
     └── 402 / 404 / 429 / 5xx ──────► /app  (silent)
        (cost cap | flag off |
         rate limit | error)


       /onboarding/lookup/review
       ─────────────────────────
       GET /api/wbtw/profile  → cached fields
       User reviews each field.
       Edits = override (locked from re-lookups).
       Accept-as-found = stays unlocked.

       POST /api/wbtw/profile/confirm:
         1. Write users.profile_* columns
              full_name, display_name, profile_role,
              profile_topics, website_url,
              instagram_handle, bio
         2. Mark public_profiles.user_confirmed_at
         3. Record overrides → user_overrides
         4. Ingest bio + voice_samples[i] (≥50 chars)
            as KB writing_sample entries
            (title prefix "WBTW: ")

                         │
                         ▼
                       /app
       Dashboard renders GenerationForm.
       No gate, no minimum.
       Voice profile lazy-builds on first generate.
```

\* Instagram source disabled in prod (`WBTW_INSTAGRAM_ENABLED=false`).
   The UI line still appears for now.

---

## 2. Production state (what's live right now)

| Knob                              | Value     | Effect                                                |
|-----------------------------------|-----------|-------------------------------------------------------|
| WBTW_ENABLED_AT_SIGNUP            | true      | Lookup runs for every new signup                      |
| WBTW_COST_CAP_USD                 | $1.00     | Per-lookup spend ceiling. Over → 402 → silent skip    |
| WBTW_INSTAGRAM_ENABLED            | false     | IG source skipped (UI line still shown)               |
| WBTW_APIFY_FALLBACK_ENABLED       | true      | Cloudflare-protected sites escalate to Apify          |
| WBTW_APIFY_PLAYWRIGHT_ENABLED     | true      | Headless-blocked sites escalate further to Playwright |
| Lookup cache TTL                  | 30 days   | Per-user; re-lookups hit cache unless forced          |
| MIN_CONTENT_ITEMS (frontend gate) | 0         | No source-count gate before generation                |
| OFFICE_HOURS_AUTO_RECAP           | true      | Wed recap auto-broadcast (separate flow)              |

---

## 3. Six paths land at /app — only one seeds the KB

| #  | Path                                          | KB seeded? |
|----|-----------------------------------------------|------------|
| 1  | User declines disclosure                      | No         |
| 2  | WBTW lookup returns empty result              | No         |
| 3  | WBTW slow path (>3s) — runs in background     | Maybe later (BG) |
| 4  | WBTW hits 402 / 404 / 429 / 5xx               | No         |
| 5  | WBTW review page error / no profile           | No         |
| 6  | User clicks Confirm on review page            | **Yes**    |

Only path 6 leaves the user at /app with KB pre-populated.
Paths 1–5 land them with an empty KB; first-gen falls into
"limited" voice mode (softer prompt mandate).

---

## 4. What lands in the KB if confirmed

For each field with content ≥ 50 chars, one entry:

```
title:        "WBTW: bio"          OR    "WBTW: sample-1"   ...
sourceType:   writing_sample
metadata:
  source:     wbtw_lookup
  source_url: <bio source URL or null>
  field:      bio | voice_samples
  index:      i (for voice_samples)
```

Voice profile is NOT pre-built at this point. First generation
triggers `voiceAnalyzer.getVoiceProfile()`, which:
  - reads the WBTW-ingested KB entries
  - extracts signature phrases (GPT-4o-mini + local regex)
  - extracts tone markers
  - computes voice centroid (1024-dim, L2 normalized)
  - caches in `voice_profiles` table for 7 days

---

## 5. Quiet-failure modes worth thinking through

There are 5 paths to /app that produce no user-facing signal
about what happened:

  · WBTW slow path  (lookup ran fine but >3s; user sees no toast)
  · 402 cost cap    (user sees no toast)
  · 404 flag off    (user sees no toast)
  · 429 rate limit  (user sees no toast)
  · 5xx error       (user sees no toast)

A new user landing at /app with an empty KB cannot tell:
  - Did the lookup run and find nothing?
  - Did the lookup never run?
  - Did the lookup error?

Empty-result is the only case that gets a toast ("couldn't
find much yet"). The other four look identical to the user.

Possible next moves:
  · Log a `wbtw_outcome` on each user at signup time
    (confirmed / empty / declined / capped / errored)
  · Surface "want me to retry the lookup?" in /app/voice
    for users with `wbtw_outcome IN (capped, errored)`

---

## 6. Things to think through

  1. The legacy `/onboarding` wizard (750 LOC) is reachable
     only from 5 BillingContent.tsx links. No signup path
     leads to it. Delete + redirect to /app/voice?

  2. Should the disclosure be skippable? Currently a hard
     gate — user MUST click Accept or Decline. Is that the
     right friction at signup?

  3. Instagram is in the UI checklist but disabled. Either
     remove the line OR enable the flag. Both are 1-flag
     changes.

  4. WBTW cache TTL is 30 days. If a user joins a new
     brokerage in week 2, EchoMe is generating with stale
     context. Worth a manual "refresh my profile" button
     in /app/voice?

  5. Voice profile lazy-builds on first generation. A
     brand-new user pressing Generate immediately may wait
     ~5–10s longer for that first build. Worth pre-building
     in the background after WBTW confirm?

  6. Path 3 (slow lookup, BG continues) writes to
     public_profiles but never tells the user it finished.
     Worth a quiet toast on next /app load: "We finished
     reading your sources — review what we found"?

---

*Generated for paper review. When you've thought through it,
mark up the gaps and bring back the list.*
