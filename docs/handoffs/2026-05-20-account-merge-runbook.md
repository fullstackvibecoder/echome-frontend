# Account merge runbook — Lisa Turcotte, with Gloria lessons baked in

**Date:** 2026-05-20
**Status:** ready to execute pending 4 decisions (see "Open decisions" below)
**Existing tool:** `echome-platform-v2/src/scripts/_merge-accounts.ts` (uncommitted, lives on Ara's laptop)
**Reference merge:** Gloria, 2026-05-14, backup tag `_gloria_20260514`

---

## Lessons from the Gloria merge (post-mortem)

Six follow-up fix/inspect scripts were needed after Gloria's merge. Each one is a thing to either fix in the script OR handle as a documented post-step for Lisa.

### 1. `content_kits.voice_id` was NULL on all 56 kits

**Symptom:** the library's voice toggle didn't filter anything because every kit's `voice_id` was NULL even though `knowledge_base_id` was set correctly.

**Cause:** `_merge-accounts.ts` reassigns `content_kits.user_id` but never tags the kits with the new `team_voices.id`.

**Pre-empt for Lisa:** before running `--apply`, patch the script to also set `content_kits.voice_id` per source-account during the reassign. Mapping: each source account's kits get tagged with the team_voice that corresponds to that source. Same approach should apply to any other table that grew a `voice_id` column since Gloria (check: `files`, `social_import_jobs`, `chunks`, `scheduled_posts`).

Or: accept the gap and run a `_fix-lisa-voice-ids.ts` script after.

### 2. `team_voices.display_name` desynced from `name`

**Symptom:** the Edit Voice form pre-filled the old label after a rename.

**Cause:** label-swap script only updated `name`. The form reads `display_name`.

**Status for Lisa:** `_merge-accounts.ts` lines 297, 302 already set both `name` and `display_name` together for FRESH team_voices inserts. **Not a risk for Lisa unless we rename team_voices after the fact.**

### 3. Voice labels were inverted from the content

**Symptom:** Gloria's "Homes" KB contained 45 mortgage/lender kits, "Lender" KB contained 8 selling kits. The merge labeled by source-account-email which didn't match how Gloria actually used the accounts.

**Cause:** the script labels source vs target by the email-derived assumption (`Lender` from one account, `Homes` from the other). Real users don't always organize content by which email they signed in with.

**Pre-empt for Lisa:** **DO NOT INFER LABELS FROM EMAILS.** Ask Lisa (or Ara) explicitly what label each source account's content should carry, BEFORE running. If unknowable upfront, run with neutral labels (`Voice 1`, `Voice 2`, `Voice 3`) and rename in the UI after Lisa eyeballs the content.

### 4. `subscriptions` row ordering can hide the tier upgrade

**Symptom:** `isTeamsUser` returned false in the frontend even though the script ran the tier upgrade.

**Cause:** backend `getSubscriptionStatus()` reads:
```sql
SELECT * FROM subscriptions
 WHERE user_id = X
 ORDER BY created_at DESC LIMIT 1
```
So whichever row is NEWEST wins. If the destination has multiple subscription rows (e.g., from earlier Stripe lifecycle events) and the script only updates one, the NEWEST might still hold the old tier.

**Pre-empt for Lisa:** after `upgradeTier()`, run a verification query:
```sql
SELECT id, tier, status, created_at FROM subscriptions
 WHERE user_id = :dest ORDER BY created_at DESC;
```
Confirm the NEWEST row has `tier = echo_teams` (or whatever target tier we decide). If not, update the newest one specifically, or delete the stale rows.

### 5. `users.voice_count` and other cached fields need explicit update

**Symptom:** `_check-gloria-vc.ts` exists, which means voice_count had to be re-derived after merge.

**Pre-empt for Lisa:** post-merge, run a recompute query for `public.users.voice_count` based on the actual `team_voices` count for that user.

### 6. End-to-end verification didn't happen automatically

**Symptom:** Ara had to manually mint a Supabase session and call `/api/team-voices` against prod to confirm the feature gate worked end-to-end. `_probe-gloria-voices.ts` is that script.

**Pre-empt for Lisa:** after `verify()` passes, mint a session for `lisaturcottesells@gmail.com` and exercise:
- `GET /api/team-voices` (multi-voice config visible)
- `GET /api/content-kits?voice_id=X` (filter works)
- `GET /api/voice/strength` (recomputes correctly)
- `GET /api/scheduling` (paused-for-merge posts visible, re-armable)

### 7. The script handles ONE source → ONE target. Lisa has 3 sources.

**Options:**
- Run `--apply` three times in sequence, target stays the same, source rotates.
  - Each run gets its own `--backup-tag` (e.g., `lisa_20260520_a`, `lisa_20260520_b`, `lisa_20260520_c`).
  - Each run creates its OWN team_voices, so we'd end up with 4 voices on destination (1 native + 3 from sources). That may or may not be what we want.
- Patch the script to take `--source` as a comma-separated list and create N team_voices in one pass. Lower-risk but requires code change.

**Pre-empt for Lisa:** decide the topology before running (see Open decisions #1).

### 8. Source `auth.users` is BANNED, not DELETED

This is GOOD. The script does `UPDATE auth.users SET banned_until = 'infinity'`, not `DELETE`. Rollback is just an UNBAN, no FK cascade risk. Confirmed in `_merge-accounts.ts:418`.

### 9. Snapshot lives in `_<backup_tag>` schema, OUTSIDE the migration transaction

Also good. Rollback uses the snapshot tables, not a full-DB restore.

---

## Open decisions (need Ara's call before executing)

1. **Topology — single voice or multi-voice (echo_teams)?**
   Gloria became echo_teams with 2 voices. Lisa has 3 source accounts. Does she want:
   - **(a)** Single voice on destination — merge all content into ONE KB / one voice. Simpler. Lisa pays one tier.
   - **(b)** echo_teams with 3 voices — one per source account. Like Gloria but bigger. Lisa pays per-voice.
   - **(c)** echo_teams with custom topology Lisa specifies (e.g., 2 voices, some merging).

2. **Labels for each voice (if multi-voice).**
   Don't infer from email — Gloria's labels were wrong by the email-derived heuristic. Either get them from Lisa or run with `Voice A / Voice B / Voice C` and rename after.

3. **Billing — Option A or B?**
   - **Option A (current script default):** source billing kept alive on source accounts (banned but billing untouched). Destination gets a tier change. Lisa may end up paying twice if a source is still billing.
   - **Option B:** transfer Stripe customer to destination, cancel source subs.

   **Recommendation:** Option B for Lisa. She explicitly said "close all the others." Option A leaves Stripe billing on a closed account, which will eventually fail and create a Stripe drama.

4. **Source emails and user_ids.**
   Confirmed sources:
   - `roxynbear@gmail.com` → `20c70bb3-e5f8-4337-b8bd-8dcf68e6566c` (known from `_fix-lisa-broken-creator.ts`)
   - 2nd source email: __________ → uid: __________
   - 3rd source email: __________ → uid: __________
   Destination:
   - `lisaturcottesells@gmail.com` → uid: __________

---

## Execution plan (assumes Open decisions resolved)

### Phase 0 — pre-flight (do today, before running anything)

```bash
cd echome-platform-v2

# 1. Confirm the 3 sources + destination exist and inventory their data
npx tsx src/scripts/_probe-lisa-cols.ts   # already exists
npx tsx src/scripts/_probe-lisa-jobs.ts   # already exists

# 2. Run merge script DRY-RUN against staging (NOT prod)
#    This exercises the script end-to-end against fake users.
#    Make sure /tmp/staging.env exists with staging Supabase + Pinecone keys.
npx tsx src/scripts/_merge-accounts.ts --dry-run
# → must end with "DRY-RUN PASSED ✓"
```

If dry-run fails: fix before continuing. Do not run --apply if dry-run is red.

### Phase 1 — pre-clean Lisa's known dead rows

```bash
# Delete the dead monitored_creators row from the YouTube watch?v= paste
npx tsx src/scripts/_fix-lisa-broken-creator.ts

# Clear the stuck Mux video upload causing the spinning wheel
npx tsx src/scripts/_fix-lisa-stuck-upload.ts
```

Both scripts are idempotent and abort with "Row not found" if already run.

### Phase 2 — run the merge per source

Per decision #1's topology:

**If single-voice (recommended for Lisa):**
Patch `_merge-accounts.ts` to skip `createTeamVoices` and `upgradeTier`, OR pass `--target-voice-label=` empty and skip the team_voices creation. Simpler: write a Lisa-specific wrapper.

**If multi-voice (Gloria-style):**
```bash
# First source — creates team_voices on destination
npx tsx src/scripts/_merge-accounts.ts --apply \
  --source=<roxynbear_uid> \
  --target=<lisaturcottesells_uid> \
  --source-voice-label="<label-for-roxynbear-content>" \
  --target-voice-label="<label-for-destination-content>" \
  --backup-tag=lisa_20260520_a

# Second source — script's createTeamVoices wipes existing team_voices first;
# this is a problem for multi-source. NEEDS A PATCH before second run.
```

**This is the multi-source landmine.** `_merge-accounts.ts:292` does `DELETE FROM team_voices WHERE user_id = target` at the start of every run. Running twice will delete the team_voices from the first merge. **Patch this before any second run** OR consolidate to single-voice topology.

### Phase 3 — Stripe (only if Option B)

In Stripe dashboard:
1. For each source customer, update `customer.email` to destination email and `customer.metadata.user_id` to destination uid.
2. Cancel any duplicate subscriptions to avoid double-billing.

Then in DB:
```sql
UPDATE stripe_customers SET user_id = :dest WHERE user_id IN (:sources);
UPDATE subscriptions    SET user_id = :dest WHERE user_id IN (:sources);
```

### Phase 4 — post-merge fixups (Gloria-style)

```sql
-- Backfill content_kits.voice_id per source
-- (if multi-voice; for single-voice the column stays NULL and that's fine
--  if the library filter doesn't require it. CONFIRM before running.)
UPDATE content_kits SET voice_id = :voice_a_id WHERE user_id = :dest AND <content-from-source-A-criteria>;

-- Verify subscription tier on destination
SELECT id, tier, status, created_at FROM subscriptions
 WHERE user_id = :dest ORDER BY created_at DESC;
-- newest row must have the right tier; if not, update it

-- Recompute users.voice_count
UPDATE public.users
   SET voice_count = (SELECT COUNT(*) FROM team_voices WHERE user_id = :dest)
 WHERE id = :dest;

-- Sanity check: any orphan KB references in files/social_import_jobs/chunks?
SELECT 'orphan files', COUNT(*) FROM files
  WHERE knowledge_base_id NOT IN (SELECT id FROM knowledge_bases WHERE user_id = :dest)
    AND user_id = :dest
UNION ALL SELECT 'orphan import jobs', COUNT(*) FROM social_import_jobs
  WHERE knowledge_base_id NOT IN (SELECT id FROM knowledge_bases WHERE user_id = :dest)
    AND user_id = :dest
UNION ALL SELECT 'orphan chunks', COUNT(*) FROM chunks
  WHERE knowledge_base_id NOT IN (SELECT id FROM knowledge_bases WHERE user_id = :dest)
    AND user_id = :dest;
```

### Phase 5 — end-to-end verify

Mint a session for `lisaturcottesells@gmail.com` (admin generateLink) and exercise:
- Log in successfully
- Library shows all merged content kits
- Voice toggle works (if multi-voice)
- KB page shows all merged sources
- Voice strength score recomputed
- Calendar shows paused-for-merge scheduled posts, re-armable

### Phase 6 — unfreeze scheduled posts

```sql
UPDATE scheduled_posts
   SET status = 'scheduled'
 WHERE user_id = :dest
   AND status = 'paused_for_merge'
   AND scheduled_for > NOW();
```

### Phase 7 — send confirmation email to Lisa

(Already drafted at `docs/email-drafts/2026-05-20-lisa-spinning-wheel-and-merge.md`.)

---

## Rollback

If Phase 5 verification fails:
1. Each merge run created a `_<backup_tag>` schema with the original rows.
2. To revert: TRUNCATE the affected destination tables, then INSERT INTO `public.<table>` SELECT * FROM `_<backup_tag>.<table>`.
3. UN-ban the source: `UPDATE auth.users SET banned_until = NULL WHERE id = :source`.
4. Stripe — if you transferred customers in Phase 3, revert customer.email and metadata in the Stripe dashboard, then revert `stripe_customers`/`subscriptions` rows.

---

## Things to clean up afterwards (not blocking Lisa)

- Commit `_merge-accounts.ts` to git. Right now it only exists on Ara's laptop. If the laptop dies, the next merge starts from scratch.
- Patch `_merge-accounts.ts` to fix items #1, #4, #5, #7 from the Gloria post-mortem so the next merge doesn't need post-fix scripts.
- Decide whether ad-hoc one-off scripts in `src/scripts/_*` should be `.gitignore`d or committed. Right now they're untracked, which is fragile.
