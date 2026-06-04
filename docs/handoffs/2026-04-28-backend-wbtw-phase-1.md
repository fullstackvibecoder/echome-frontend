# Backend Handoff #3 — WBTW v1, Phase 1

> The Work Before The Work tenet, made functional. Public-data lookup at signup → 30-second profile auto-population. Highest-leverage backend project in the audit.

> **Hand-off note for the backend Claude**: this is a pointer to a 14-section scoping doc. Read it end-to-end before doing anything. Implement Phase 1 only.

---

## The spec

The full scoping document lives at:

**`/Users/aramammo/Side Quests/echome-frontend/docs/2026-04-28-work-before-the-work-scoping.md`**

You may want to copy it locally to `echome-platform-v2/docs/2026-04-28-work-before-the-work-scoping.md` so it's in the repo where the work is happening.

Read all 14 sections (~20 min). Don't skim — the legal posture, vendor fallback ladder, and architecture rationale are load-bearing decisions.

## Scope of this PR

**Phase 1 only** (per scoping doc §9):

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

## Out of Phase 1 scope (for later phases, do NOT implement here)

- Instagram via Sociavault (Phase 2)
- Google Business via Serper (Phase 2)
- HTTP API routes (`/api/wbtw/*`) (Phase 3)
- Frontend integration (Phase 3)
- Real-world validation against existing 180 users (Phase 4)
- Chat-engine convergence (Phase 5)

## Constraints (from founder)

- **Realtors first** (US + Canadian)
- **Build-ourselves preferred** — vendor fallback per scoping doc §13
- **Per-lookup cost ≤ $0.20**, target ~$0.10
- **Cache 30 days** to keep steady-state cost dominated by new lookups
- **Privacy-respecting** — only public data, per-field provenance, deletion endpoint (full UX in §8 of scoping doc)

## Existing services to reuse — do not reinvent

The scoping doc §4.3 lists these. Confirmed in code audit:

- `src/services/external/web-search.ts` — Tavily HTTP plumbing already exists; extract a `findProfileUrls(name, city)` helper from it
- `src/services/external/sociavault.ts` — for Phase 2 Instagram, NOT Phase 1
- `src/services/usage/usageService` — cost tracking per lookup
- The `users.profile_role / profile_topics / profile_cta / profile_guardrails` columns already exist (added in `7c2dd36`); WBTW writes here directly after user confirmation
- `html-to-text` is already in `package.json`

## Open decisions for Ara to confirm before merge

Per scoping doc §12 — surface in PR description for explicit answers:

- Free-tier policy on WBTW (recommended: 1 lifetime lookup for free, 1/24h for paid)
- Re-lookup cadence (recommended: 30 days)
- Override behavior — once user-edits a field, does next re-lookup overwrite? (recommended: no, locked unless explicit refresh)
- Cost-per-user soft cap (recommended: $1/user/month → block + alert)

## Single biggest risk to plan around

Per scoping doc §10: **Instagram is legally OK but technically the worst** (Meta's anti-bot is aggressive). Phase 1 doesn't touch Instagram, so risk is deferred to Phase 2. When you get there, build it as an optional, feature-flagged stage.

## Pre-merge checklist (Phase 1)

- [ ] Scoping doc read in full
- [ ] All 5 Phase 1 sources implemented
- [ ] `public_profiles` migration applies cleanly
- [ ] Unit tests cover at least: brand-site empty, RE/MAX HTML changed, NAR not found, orchestrator merge order, confidence scoring
- [ ] 3 known-user fixtures (Ara, Jaya, one realtor with no public footprint) — produce profiles, hand-validate accuracy
- [ ] Per-lookup cost measured; report actual vs. modeled $0.075-0.10
- [ ] No frontend work
- [ ] No HTTP routes
- [ ] Existing test suite green

## Commit message format

```
feat(wbtw): phase 1 — public-data lookup foundation

Implements the Work Before The Work tenet's foundational service per
docs/2026-04-28-work-before-the-work-scoping.md. Phase 1 covers the
three lowest-risk sources: realtor's brand site, RE/MAX agent profile,
NAR public directory. Instagram and Google Business deferred to Phase 2;
HTTP API and frontend integration deferred to Phase 3.

- New service: src/services/public-data-lookup/
- New table: public_profiles (30-day TTL, per-field provenance)
- Reuses web-search.ts Tavily plumbing for URL discovery
- Haiku extraction harness; ~$0.075-0.10 per lookup at modeled rate
- Test harness: npm run lookup:test -- {email}

Out of scope this PR: Instagram (Phase 2), HTTP routes (Phase 3),
frontend UI (Phase 3), real-world validation (Phase 4).
```
