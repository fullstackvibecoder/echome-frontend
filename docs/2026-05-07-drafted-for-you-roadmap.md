# Drafted For You — proactive content drafting

Three-phase roadmap for shifting EchoMe from reactive (open app → prompt → generate) to proactive (open app → curate drafts already in your voice). This doc supersedes the chat sketch and is the canonical reference for V1/V2/V3 scope.

## Why this matters

Most AI content tools sell "content in seconds." But agents who can't keep a posting cadence don't open the app to begin with. The bottleneck isn't generation speed — it's getting started today. Drafted For You inverts that: the work is done before the user wakes up. They just curate.

This is also the operational payoff of every TLL primitive we've shipped: the same TLL prompts, voice profile, Mind-Reader scorecard, and provenance work whether the user *requested* a generation or Echo *initiated* it.

## V1 — manual trigger (this session)

User-visible behavior:
- A "Drafted for you" panel on the dashboard (above the Outcome Chips, below the welcome message)
- Empty state: a "Draft today's content" button
- Click → backend orchestrates a multi-call drafting flow → 2-3 platform-ready drafts return as cards
- Each card has Review (opens kit detail) / Schedule (opens schedule modal) / Kill (deletes + telemetry)
- Drafts persist as `content_kits` rows with `is_draft_proposal: true`

Backend flow:
1. Endpoint: `POST /api/drafts/generate`
2. Calls `kb-chat-service` with the TLL Mind-Reader prompt to surface 2-3 angles from the user's KB
3. For each angle: kicks the existing generation pipeline to produce LinkedIn + Instagram + Twitter content
4. Persists each as a `content_kit` row with `is_draft_proposal=true, origin='user'`
5. Returns the kit IDs

Telemetry (V3 foundation):
- New table `draft_outcomes` logs every Review / Schedule / Kill / Edit / Post action
- V1 collects but doesn't read this data; V3 mines it

Rate limiting:
- Free tier: 1 click per day (gated server-side)
- Paid tiers: unlimited (still cost-bounded by the existing generation quota)

## V2 — autonomous daily drafting

User-visible behavior:
- Drafts appear on the dashboard each morning without the user clicking anything
- Email notification: "Your drafts are ready" with a deep link to the dashboard
- Notification preference toggle on the user profile (default: on)

Backend changes:
- Activate the V1 stub: `src/cron/daily-draft-generator.ts` (V1 ships the file as a no-op handler)
- 6am UTC cron iterates active users (subscribed + last activity within 14 days)
- Reuses V1's `draft-orchestrator.ts` per user
- Sends `drafts-ready.ts` email (template ships in V1, fires in V2)

Cost guards:
- Skip users who already have ≥3 unreviewed drafts in their inbox
- Skip users below the activity threshold
- Hard cap: 1 batch per user per day regardless

What ships in V1 to make V2 cheap:
- Cron stub already wired into the cron init list (no-op handler)
- Email template scaffolded
- `users.daily_draft_notifications` column already in place
- `is_draft_proposal` + `origin='autonomous'` schema already supports the new path

## V3 — voice refinement loop

User-visible behavior:
- "Echo learned 3 things about your voice this week" weekly summary card
- Future generations measurably more aligned with user's actual edits over time

Backend changes:
- Read `draft_outcomes` history per user
- Compute edit-deltas: `original_text` (what Echo drafted) vs `final_posted_text` (what the user posted)
- Identify recurring patterns: "user removes industry jargon," "user adds personal asides," "user shortens hooks"
- Inject learned patterns as a per-user prompt suffix in `core-prompt-system.ts`
- Surface the learning back to the user (transparency) so they can correct

What ships in V1 to make V3 cheap:
- Telemetry from day 1 — every kill / edit / post is timestamped + diffable
- Schema includes `original_draft_text` snapshot for diff calculations later

## Schema decisions (locked)

Migration: `migrations/2026_05_07_drafted_for_you.sql`

```sql
-- Mark some content_kits as drafts in the inbox (vs. user-initiated kits)
ALTER TABLE content_kits
  ADD COLUMN is_draft_proposal BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'user'
    CHECK (origin IN ('user', 'autonomous'));

-- Per-user notification pref for V2 daily emails (default on)
ALTER TABLE users
  ADD COLUMN daily_draft_notifications BOOLEAN NOT NULL DEFAULT TRUE;

-- Telemetry: every action a user takes on a drafted kit
CREATE TABLE draft_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_kit_id UUID NOT NULL REFERENCES content_kits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL
    CHECK (action IN ('reviewed', 'scheduled', 'killed', 'edited', 'posted')),
  metadata JSONB,
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_draft_outcomes_user_action ON draft_outcomes(user_id, action_at DESC);
CREATE INDEX idx_draft_outcomes_kit ON draft_outcomes(content_kit_id);
```

Why a separate `draft_outcomes` table over columns on `content_kits`:
- Action history is one-to-many with kits (a kit can be reviewed, then edited, then scheduled, then posted)
- Time-series queries for V3 are cleaner with rows-per-action than denormalized columns
- Doesn't bloat `content_kits` with fields most users will never see

## File-level cross-references

### Frontend (NEW unless marked)

| File | Purpose |
|---|---|
| `src/components/dashboard/DraftedForYou.tsx` | Panel container, fetches drafts, renders cards |
| `src/components/dashboard/DraftCard.tsx` | Individual draft card with Review/Schedule/Kill |
| `src/app/app/AppContent.tsx` (modify) | Mount `<DraftedForYou />` above `<OutcomeChips />` |
| `src/lib/api-client.ts` (modify) | Add `drafts.{generate, list, dismiss, recordAction}` namespace |
| `src/types/index.ts` (modify) | `DraftProposal` type, `DraftAction` enum |

### Backend (NEW unless marked)

| File | Purpose |
|---|---|
| `src/routes/drafts.ts` | `POST /api/drafts/generate`, `GET /api/drafts`, `POST /api/drafts/:id/dismiss`, `POST /api/drafts/:id/action` |
| `src/services/drafts/draft-orchestrator.ts` | Composes kb-chat + generation pipeline; produces N platform-ready content_kits |
| `src/cron/daily-draft-generator.ts` | V1: no-op handler. V2: real iteration over active users. |
| `src/services/email/templates/drafts-ready.ts` | V1: scaffold HTML. V2: fired by daily-draft-generator. |
| `migrations/2026_05_07_drafted_for_you.sql` | Schema additions |

## Open questions for review

These are the only decisions I'd flag before code lands. Defaults in italics if no answer; flag if you want to flip:

1. **Dashboard panel vs dedicated `/app/drafts` route.** *Default: panel above the Outcome Chips.* Reason: panel = visible every login = high engagement. Route = focused experience but easier to ignore.

2. **Drafts per click: one multi-platform kit or N single-platform cards.** *Default: 2-3 ANGLES, each angle becomes its own kit with all 3 platforms (LinkedIn + Instagram + Twitter) attached.* Same flow as user-initiated generation. Cards visualize per-angle, not per-platform.

3. **Echo's voice when delivering drafts.** *Default: a small "Echo drafted these from your knowledge base this morning" header with provenance pills on each angle.* Sets the Mind-Reader expectation (these came from your work, not generic).

4. **Rate limit on the manual "Draft for me" button.** *Default: 1 click per day for free tier; unlimited for paid (still bounded by existing generation quota).*

## Out of scope for V1

- Multi-user / team approval workflows on drafts
- Auto-posting drafts without review (will never ship — defeats curation)
- Cross-creator drafting (Mind-Reader from someone else's KB)
- Mobile push notifications (V2 considers email only)
- Browser web-push (V2 considers email only)
- A/B testing of draft variations within a single angle

## Maintenance

Update this doc when:
- A V1 implementation choice diverges from what's specified
- A new V2/V3 element gets pulled forward into V1 (note the rationale)
- An "open question" gets answered (move from question list to a locked decision)

Cross-reference: `docs/2026-05-06-implementation-manifest.md` for the broader Zero-Step Utility roadmap. This doc covers the proactive-content slice specifically.
