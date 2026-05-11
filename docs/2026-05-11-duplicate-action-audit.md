# Duplicate-action / double-fire audit

**Date:** 2026-05-11
**Trigger:** 2026-05-10 daily-draft-generator fired twice at 06:00 UTC. Two users (rdavid, andrebarnes) got 2× their intended autonomous drafts. Same pattern likely exists elsewhere — this audit identifies and hardens.

## The pattern that caused it

Every check-then-act idempotency guard in a concurrent execution context is racy. The cron was structured:

```ts
const recentBatchCount = await db.from('content_kits').count(...).gte('created_at', cutoff);
if (recentBatchCount > 0) skip;  // <-- check
await generateDraftsForUser(user);  // <-- act
```

Two concurrent invocations both read `recentBatchCount = 0` before either completed `generateDraftsForUser`. Both proceeded. Result: 2× the side effects.

**Fix pattern:** atomic operation that combines the check and the act. We landed on `INSERT ON CONFLICT DO UPDATE WHERE stale` against a new `cron_runs` table — first concurrent caller wins, the rest exit. Implementation in `supabase/migrations/20260511_cron_runs_lock.sql` (functions `try_acquire_cron_lock`, `complete_cron_lock`) and `echome-platform-v2/src/cron/lock.ts` (wrapper helper `withCronLock`).

## Findings

### Crons — FIXED in this audit (commits `7100a50`, `4aa6f5f` on `main`)

| Cron | Schedule | Side effects | Grace |
|---|---|---|---|
| `daily-draft-generator` | daily 06:00 UTC | LLM calls, emails | 60min |
| `social-post-reconciler` | every 5 min | Outstand API calls | 5min |
| `social-post-finalizer` | every 1 min | media compose + Outstand post creation | 5min |
| `reminder-notifier` | every 1 min | sends reminder emails | 5min |
| `downgrade-expired-trials` | daily 09:00 UTC | DB writes + emails | 15min |
| `trial-reminder` | daily 10:00 UTC | sends trial-expiry emails | 15min |

All six now go through `withCronLock(jobName, graceMinutes, handler)`. First concurrent caller wins; the rest exit at warn-level. Stale entries auto-release on the next tick if the previous run crashed.

### Crons — left as-is (already safe)

| Cron | Why safe |
|---|---|
| `office-hours-sweep` | Has explicit "already_sent" check in its body; idempotent at the row level |
| `drip-executor` | Claims rows by status update; atomic at the row level |
| `recover-stuck-jobs` | Pure recovery; all writes are idempotent |
| `tune-scoring-weights` | Weekly analytics inserts; over-insert is fine |
| `purge-old-logs` | Weekly delete; over-delete is impossible |

### Cron — INTENTIONALLY DISABLED, needs investigation

**`sync-subscription-tiers`** — commented out since 2026-04-17. Last time it ran it mass-downgraded 31 paying users to free because it used a test-mode Stripe key against live-mode subscriptions. Root cause (why `getStripeSecretKey()` resolved to the test key despite `STRIPE_MODE=live`) is still unconfirmed. The cron stays disabled until that's understood and verified in Railway logs. See `scheduler.ts:173-190`.

This is the single highest-risk dormant footgun in the codebase. Re-enabling without a clear root-cause analysis would be irresponsible. Adding to the followup backlog.

### Webhooks — duplicate-delivery analysis

| Handler | Idempotency | Risk |
|---|---|---|
| Stripe (`/api/stripe/webhook`) | `checkIfProcessed(event.id)` then `markEventProcessed` | Check-then-act window between the two — concurrent webhook delivery in the millisecond window before mark could double-process. Failed events get `processed=false` and re-run all side effects on retry (incl. emails). Mostly OK because Stripe typically delivers webhooks serially per endpoint, but tighter per-action idempotency would be safer. |
| Outstand (`/api/webhooks/outstand`) | No event-ID dedupe | Side effects are idempotent UPDATEs on `scheduled_posts` (same fields written) — safe under duplicate delivery. |
| Mux (`/api/webhooks/mux`) | Logs event ID, no dedupe | Side effects are status updates + transcription triggers gated by status — idempotent at the row level. |
| Zoom (`/api/webhooks/zoom`) | No event-ID dedupe | File storage downloads + DB updates; idempotent at the storage layer. |
| Descript | No event-ID dedupe | Similar to Mux. |

### User-facing routes — double-click / cross-tab races

| Path | Server-side guard | Client-side guard | Verdict |
|---|---|---|---|
| Manual "Draft for me" (`POST /api/drafts/generate`) | `checkManualDraftRateLimit` at 3/day (also check-then-act, but bounded) | Button disabled while submitting | Acceptable — at worst the user gets 1 extra draft if they double-click across tabs. |
| Schedule fanout (`POST /api/social-posting/schedule-fanout`) | None | Button disabled while submitting | **Real risk** if user opens two tabs and double-schedules same kit. Server-side idempotency key would harden. Not done in this audit. |
| Post now (`POST /api/social-posting/schedule`) | None | Button disabled while submitting | Same risk as fanout. |
| Stripe checkout | Protected by Stripe's session idempotency upstream | Button disabled while submitting | Safe. |

## Followups (not done, ranked by risk)

1. **Investigate `sync-subscription-tiers` root cause.** Read what env vars were set on 2026-04-17, why `STRIPE_MODE=live` didn't route to live keys. Until this is understood, re-enabling the cron is dangerous. **Highest priority.**
2. **Idempotency-key pattern for `/schedule-fanout` and `/schedule`.** Client generates a UUID per attempt, server stores it and rejects duplicates. Mirrors Stripe's `Idempotency-Key` header. Prevents cross-tab double-schedule from creating duplicate Outstand posts.
3. **Per-action idempotency inside Stripe webhook handlers.** When a webhook retry fires because the previous attempt errored after some side effects (e.g., DB update succeeded, email send failed), the retry shouldn't re-send the email. Track "this action fired for this event_id" at the action level, not just the event level.
4. **Inbox-backlog gate tuning.** The current `INBOX_BACKLOG_LIMIT=3` means a user with 3 unreviewed drafts gets zero new ones forever until they review/dismiss. That's correct for now, but worth thinking about whether the limit should be configurable per user.

## How to verify the fix works

The next 06:00 UTC daily-draft-generator tick (tomorrow morning) is the first natural test. If two ticks somehow fire concurrently:
- One acquires the lock and runs normally
- The other logs `[daily-draft-generator] concurrent run detected — skipping this tick` at warn-level
- Expected outcome in DB: at most one batch of ≤3 kits per eligible user, regardless of how many times the cron fired

To verify manually: run `SELECT * FROM cron_runs ORDER BY started_at DESC` after the cron has fired. Each row records when a job started and (if it finished cleanly) when it completed.
