# Feature Launch Process

**Audience:** Ara + future collaborators
**Last updated:** 2026-05-13
**Status:** Standing reference

## Why this exists

Until 2026-05-12 we shipped features by typechecking locally, pushing to `main`, and waiting for a user to surface bugs. That worked at 1 user. It does not work at 40 paying users + active scheduled posts going to real Instagram accounts. The 4 stuck Outstand posts on Mark Fruend's account this morning are the receipt.

This doc is the minimum process to catch the bugs that hurt, without slowing down the cadence.

---

## Branches → environments

| Branch | Auto-deploys to | Use for |
|---|---|---|
| `develop` | Vercel preview `echome-frontend-git-develop-bottlenecklabs.vercel.app` + Railway staging backend + Supabase staging (`hyabkdefcojbkohxuxjc`) | Feature work, smoke tests, anything not trivial |
| `main` | Vercel prod `www.tryechome.com` + Railway prod backend + Supabase prod (`bbsrpkjwuujuszjqwnul`) | Tested, verified, ready for real users |

**Backend repo** (`echome-platform-v2`) follows the same convention.

---

## When to go staging-first

| Change type | Process |
|---|---|
| Typo, doc-only, copy tweak | Ship straight to `main` |
| Anything else | **`develop` → smoke-test → `main`** |

"Anything else" means: new template, new endpoint, schema migration, refactor of an existing path, change to data persistence, change to billing/auth/posts/crons.

---

## Standard workflow

```bash
# 1. Start from a clean develop
git checkout develop
git pull origin develop

# 2. Build the feature (commit small, often)
# ...

# 3. Push to develop → triggers staging deploy
git push origin develop

# 4. Wait ~2 min for Vercel + Railway to redeploy.
# Open the staging URL and CLICK THROUGH the feature.
# Not just typecheck — actually use it.
#   https://echome-frontend-git-develop-bottlenecklabs.vercel.app

# 5. Fast-forward main once verified
git checkout main
git merge develop
git push origin main

# 6. Open prod and smoke-test the same flow within 5 min of deploy.
# Watch Railway prod logs for unexpected errors.
#   railway logs --service echome-backend  (after `railway environment production`)

# 7. Set a mental 1-hour clock. Don't close the laptop yet.
```

---

## Higher-stakes adjustments

| Touches | Extra step |
|---|---|
| **Stripe / billing** | Run a test checkout in staging with `STRIPE_MODE=test`. Confirm the dollar amount in Stripe checkout matches what's advertised. Never deploy a Stripe change Friday afternoon. |
| **Auth / sessions** | After deploy, log out and log back in *in a private window*. Don't trust your own logged-in browser. |
| **Post pipeline** (carousel/clip finalizer, scheduling, reminders) | Schedule a real test post to your own account 2 min in the future. Watch it land on Instagram. |
| **Schema migrations** | Apply to staging first. Confirm the API still works. Apply to prod inside a `BEGIN; ... COMMIT;` block with a rollback script ready. Always apply to **both** Supabase projects when adding shared infra (e.g., the cron-lock function). |
| **Crons** | After deploy, tail Railway logs for **one full tick interval** (1 min for the finalizer, 15 min for drip executor, etc.). Silent failures here are the worst kind — `try_acquire_cron_lock` missing in staging cost ~5h of cron no-ops we didn't notice. |
| **Anything with retries** (post-finalizer, webhooks) | Force a failure on staging (bad price ID, missing arg). Confirm the retry → max-attempts → mark-failed path works without spamming logs. |

---

## Pre-deploy checklist (30 seconds, every time)

Before `git push origin main`, ask out loud:

1. **Did I open the affected screen and click through?** Not just type-checked — actually used it.
2. **What's the rollback?** A revert commit + push? A SQL undo? Know the answer *before* you push.
3. **`git diff --stat origin/main..HEAD`** — does the file list match what I think I built? Anything snuck in?
4. **Any hardcoded values that should be env vars?** Grep for `localhost`, `test_`, `TODO`, `XXX`, personal email, personal user ID.
5. **What happens if the network/DB/Stripe is slow?** Long-running operations: did I set timeouts? Surface errors?

---

## Common failure modes (learned the hard way)

- **Pixel-level breakage hidden behind passing tests.** Backend renderer works in isolation but the generator pipeline routes it through the wrong code path (Quote Card single-pass bug, 2026-05-12). *Antidote:* end-to-end click-through, not just unit rendering.
- **Wiring touched but not verified.** Switched `validPlans` and price IDs without confirming Stripe still routed correctly. *Antidote:* run the actual checkout flow end-to-end in staging Stripe-test-mode.
- **Schema migration applied to one Supabase project but not the other.** `try_acquire_cron_lock` existed in prod but not staging. *Antidote:* always apply schema changes to both projects when they're shared infra. Treat staging like prod.
- **Silent fallthroughs.** `needsTwoPhase` returned `true` (the "default" behavior) for unknown templates — no error, just blank slides. *Antidote:* prefer explicit allowlists with a `throw new Error('unknown template')` default. Loud failure beats silent corruption.
- **No retry-error visibility.** Outstand posts failed 5x and ended at `status='failed'` with nobody notified. *Antidote (real followup):* hook `scheduled_posts.status='failed'` transitions to an admin email/Slack.
- **Outdated Railway CLI session.** Auth expires silently; you read staging logs while thinking they're prod. *Antidote:* `railway status` before pulling logs to confirm linked env.

---

## Staging Supabase: redirect URLs to allowlist

If you ever fully sign in / sign up on staging (vs reusing an existing JWT), make sure these are added under **staging Supabase → Auth → URL Configuration**:

- Site URL: `https://echome-frontend-git-develop-bottlenecklabs.vercel.app`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/reset-password`
  - `https://echome-frontend-git-develop-bottlenecklabs.vercel.app/auth/callback`
  - `https://echome-frontend-git-develop-bottlenecklabs.vercel.app/auth/reset-password`

Dashboard: https://supabase.com/dashboard/project/hyabkdefcojbkohxuxjc/auth/url-configuration

Without these, Google OAuth + password-reset flows fail silently in staging.

---

## What Claude does differently going forward

1. **Default to `develop` for feature work.** When you say "ship it," I push to `develop` first unless the change is trivial (typo, copy, doc). I surface the staging URL after the push lands; we verify together; then I merge to `main`.
2. **Surface the rollback plan** in every commit footer when the change is risky.
3. **Run the existing `.claude/skills/pre-deploy-review` skill** on changes touching billing, auth, post-pipeline, or crons before pushing to `main`.
4. **Tail Railway logs after every backend deploy** for one full cron interval if the change touches a scheduled job.
5. **Verify env vars end-to-end** (Stripe price IDs, OAuth keys, etc.) when wiring is changed, not just when adding new vars.

---

## Tooling shortcuts

```bash
# After pushing develop, get the staging URL
echo "Staging: https://echome-frontend-git-develop-bottlenecklabs.vercel.app"

# Latest Vercel prod deploy status
vercel ls | head -3

# Tail Railway prod logs (after `railway login` + `railway environment production`)
railway logs --service echome-backend

# Probe an env var for trailing whitespace (Vercel)
vercel env pull /tmp/v.env --environment=production --yes && \
  python3 -c "import re; [print(f'{k}: {repr(v)}') for line in open('/tmp/v.env') for m in [re.match(r'(\w+)=\"?(.*?)\"?$', line.strip())] if m for k, v in [m.groups()]]"

# Probe Railway env var (after `railway environment production`)
railway variables --service echome-backend --environment production --kv | grep VAR_NAME
```
