# CI followups — Node/Actions hygiene

**Date:** 2026-05-11
**Trigger:** Frontend CI failed on every push to main 2026-05-10 → 2026-05-11 (`npm ci`: "Missing @floating-ui/dom@1.7.6 from lock file"). Fixed in `ba230cc` by regenerating the lock under Node 20. While diagnosing, two related hygiene items surfaced — neither blocks shipping but both prevent the same class of recurrence.

## 1. Pin Node 20 with `.nvmrc` + `package.json#engines`

**Problem:** `.github/workflows/ci.yml` builds on Node 20.x. Anyone running `npm install` locally on a different Node version (I was on 22) silently produces a lockfile that CI's stricter `npm ci` rejects. The peer-dep resolution behavior changed across npm 10 → 11, so the local-vs-CI drift is invisible until push.

**Fix:** Add `.nvmrc` containing `20` at repo root, plus `"engines": { "node": ">=20.0.0 <21.0.0" }` in `package.json`. nvm/fnm/volta users get auto-switched; vanilla npm prints a warning. Optional: add a one-line `preinstall` script that warns if Node major ≠ 20.

**Cost:** 5 min.

## 2. Bump GitHub Actions off Node 20 runtime

**Problem:** CI annotation from today:

> Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/checkout@v4, actions/setup-node@v4. Actions will be forced to run with Node.js 24 by default starting June 2nd, 2026. Node.js 20 will be removed from the runner on September 16th, 2026.

**Fix:** Check for newer major versions of `actions/checkout` and `actions/setup-node` that ship a Node 24 runtime. As of writing, `@v5` is the candidate. Bump both in `.github/workflows/ci.yml` and re-validate one push.

**Cost:** 10 min including a validation push.

**Important distinction:** This is the *action runtime* (Node 24), separate from the project's *build Node version* (`node-version: 20.x`, which is what item 1 above pins). Don't conflate the two.

## 3. Triage the 16 dependabot vulnerabilities

**Problem:** Regenerating the lock under Node 20 (item that fixed CI) bumped some transitive resolutions; GitHub now reports 16 vulnerabilities (9 high, 5 moderate, 2 low) up from 3. Most are likely build-time-only postcss / dev-dep CVEs that don't expose runtime, but worth a real triage pass.

**Fix:** Run `npm audit` locally under Node 20, sort high-severity items by whether they touch runtime code, fix what's safe (`npm audit fix`), defer/document anything that requires a major framework downgrade.

**Cost:** 30 min for triage + audit fix; longer if any high-severity item touches runtime and requires a real version bump.

## Why log instead of doing now

User is on a higher-priority item (admin campaign editor). These three are infra hygiene — they bite next time we ship, not today.
