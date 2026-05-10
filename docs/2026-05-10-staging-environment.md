# Staging environment — workflow + setup

**Updated:** 2026-05-10. Phase 3a complete, Phase 3b deferred.

## What exists

| Layer | Production | Staging |
|---|---|---|
| Frontend | `https://www.tryechome.com` (`main` branch) | `https://echome-frontend-git-develop-bottlenecklabs.vercel.app` (`develop` branch) |
| Backend | `https://echome-backend-production.up.railway.app` (`main` branch, prod env) | `https://echome-backend-staging.up.railway.app` (`develop` branch, staging env) |
| Supabase | `bbsrpkjwuujuszjqwnul` (`echome-prod`) | `hyabkdefcojbkohxuxjc` (`echome-staging`) |
| Stripe | live keys | test keys (`STRIPE_MODE=test`) |
| Resend | sends real emails | **all sends suppressed** (`STAGING_MODE=true` in backend) |
| Outstand | live posting | **disabled** (constructor stub, cron jobs short-circuit) |

## Branch convention

- `main` → production. Pushes deploy to prod (Vercel + Railway).
- `develop` → long-lived staging branch. Pushes deploy to staging (Vercel preview alias + Railway staging env). Tracks `main` most of the time.
- `feature/*` → per-PR Vercel preview. Currently inherits production env vars by default; needs the per-branch override step below to point at staging.

## Daily workflow

**Low-risk changes:**
1. Branch from `main`, work, open PR to `main`
2. Vercel auto-deploys preview at `echome-frontend-{hash}-bottlenecklabs.vercel.app`
3. Test the preview (note: defaults to prod APIs unless you override per-branch — see "Per-PR previews against staging" below)
4. Merge to `main` → prod deploys

**Risky changes:**
1. Branch from `main`, work, open PR to `develop`
2. Merge → Vercel + Railway both auto-deploy to staging
3. Test on `https://echome-frontend-git-develop-bottlenecklabs.vercel.app` against staging APIs
4. When happy: PR `develop` → `main`, merge → prod deploys
5. After release: rebase `develop` on `main` to keep them aligned

## Staging Mode (backend)

The Railway staging environment sets `STAGING_MODE=true`. Backend services check this flag and skip destructive external calls:

- `email-service.sendEmail()` returns `true` without hitting Resend
- `outstand-service` constructor uses a stub apiKey; cron jobs short-circuit at the top
- `STRIPE_MODE=test` routes all Stripe calls through test keys

If you add a new external integration that should NOT run on staging, import `isStagingMode()` from `src/services/social-posting/outstand-service.ts` and short-circuit at the top of your code path.

## Manual setup that must remain done

These were configured during the Phase 3a rollout. If you spin up another staging-equivalent or rebuild from scratch, redo these:

### 1. Staging Supabase auth allowlist *(MANUAL DASHBOARD STEP — pending)*

Open https://supabase.com/dashboard/project/hyabkdefcojbkohxuxjc/auth/url-configuration and set:

- **Site URL:** `https://echome-frontend-git-develop-bottlenecklabs.vercel.app`
- **Redirect URLs (allowlist):**
  - `https://echome-frontend-git-develop-bottlenecklabs.vercel.app/**`
  - `https://echome-frontend-*-bottlenecklabs.vercel.app/**` *(per-PR previews — wildcard supported)*

Without these, OAuth and magic-link redirects from the staging frontend are rejected by Supabase before reaching our app.

### 2. Test users (optional — for QA flows)

Staging Supabase starts empty. Create at least one user via the dashboard or:

```bash
# Use the staging service-role key (saved out-of-band)
curl https://hyabkdefcojbkohxuxjc.supabase.co/auth/v1/admin/users \
  -H "apikey: <STAGING_SERVICE_KEY>" \
  -H "Authorization: Bearer <STAGING_SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@tryechome.com","password":"<pw>","email_confirm":true}'
```

## Known limitations (Phase 3a → 3b followups)

- **Per-PR previews still default to prod APIs.** The Vercel CLI (v51 + v53) won't auto-confirm "set env var for all preview branches" non-interactively. Workaround for now: scope env vars to the `develop` branch only, and accept that ad-hoc PR previews hit prod. Phase 3b will fix this.
- **Vercel deployment protection** is on for previews (Pro plan default). Anonymous testers get 401 unless you disable protection in Vercel project settings or share a one-time skip link.
- **No automated migration sync** between prod and staging Supabase. If you run a new migration, manually apply it to both. Or set up `supabase db push --linked` against the staging project.
- **No seed data on staging.** If a flow needs realistic content_kits or carousels, copy a few rows manually or write a small seed script.

## Phase 3b backlog

When the team grows or you have multiple parallel branches in flight:

1. Enable **Railway PR Environments** (toggle in Railway dashboard → Settings) — each PR gets its own backend deployment
2. Enable **Supabase Branching** (paid: ~$0.32/branch/day) — each PR gets its own DB branch with auto-applied migrations
3. CI step that updates Vercel preview env vars per PR to point at the PR-specific Railway URL + Supabase branch URL (workaround for the Vercel CLI all-branches bug)
4. Document the rollout/teardown lifecycle so PRs don't accumulate idle-but-billed environments

Phase 3a covers ~80% of the safety value. Phase 3b is worth the additional setup once you have 2+ engineers shipping in parallel or once the cost of a single PR being able to corrupt staging data outweighs the incremental setup cost.
