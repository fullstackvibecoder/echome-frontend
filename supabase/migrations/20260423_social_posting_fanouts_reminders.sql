-- Social posting: fanouts + reminders + provenance + status richness
--
-- Phase 1 of the scheduling build:
-- 1. fanout_id groups posts that share the same content across platforms
--    (e.g., one carousel posted to IG + LI + FB = 3 rows, same fanout_id).
-- 2. created_via + is_ai_suggested enable analytics on which schedule path
--    users choose most (AI suggestion vs manual vs bulk).
-- 3. source_output_id ties a scheduled post back to a specific kit output
--    (carousel slide, clip, written post) for kit-completion tracking and
--    the "From kit: X" provenance link on calendar events.
-- 4. platform_post_url stores the live URL after successful posting.
-- 5. social_post_reminders is the lower-tier (non-Studio) path: manual
--    post reminders that don't touch Outstand.

-- ==========================================================================
-- 1. Extend scheduled_posts
-- ==========================================================================

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS fanout_id UUID,
  ADD COLUMN IF NOT EXISTS created_via TEXT CHECK (created_via IN ('ai_suggest', 'manual_inline', 'manual_bulk', 'downgrade_conversion')),
  ADD COLUMN IF NOT EXISTS is_ai_suggested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_output_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT;

-- Backfill fanout_id: each existing row gets its own unique fanout_id (group of 1)
UPDATE scheduled_posts SET fanout_id = gen_random_uuid() WHERE fanout_id IS NULL;

-- Now enforce non-null going forward
ALTER TABLE scheduled_posts ALTER COLUMN fanout_id SET NOT NULL;
ALTER TABLE scheduled_posts ALTER COLUMN fanout_id SET DEFAULT gen_random_uuid();

-- Index for grouping lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_fanout ON scheduled_posts(fanout_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_kit ON scheduled_posts(content_kit_id) WHERE content_kit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at) WHERE status IN ('scheduled', 'publishing');

-- ==========================================================================
-- 2. social_post_reminders (lower-tier manual-post reminder path)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS social_post_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_kit_id UUID,
  source_output_id TEXT,
  fanout_id UUID NOT NULL DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  text TEXT,
  media_urls TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'acknowledged', 'expired', 'cancelled')),
  created_via TEXT CHECK (created_via IN ('ai_suggest', 'manual_inline', 'manual_bulk', 'downgrade_conversion')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON social_post_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON social_post_reminders(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_kit ON social_post_reminders(content_kit_id) WHERE content_kit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_fanout ON social_post_reminders(fanout_id);

ALTER TABLE social_post_reminders DISABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 3. Status values — document expected states (CHECK is additive / optional)
-- ==========================================================================
-- scheduled_posts.status used values: 'draft', 'scheduled', 'publishing', 'posted', 'failed', 'cancelled'
-- Not enforced via CHECK to preserve backwards compatibility with any legacy rows.

COMMENT ON COLUMN scheduled_posts.fanout_id IS 'UUID shared across rows that represent the same content fanned out to multiple platforms';
COMMENT ON COLUMN scheduled_posts.created_via IS 'Origin of this schedule: ai_suggest | manual_inline | manual_bulk | downgrade_conversion';
COMMENT ON COLUMN scheduled_posts.is_ai_suggested IS 'True if the AI Suggestion engine proposed this time (sticky — stays true even if user edits)';
COMMENT ON COLUMN scheduled_posts.source_output_id IS 'Reference to the kit output this post came from (carousel slide id, clip id, etc.)';
COMMENT ON COLUMN scheduled_posts.platform_post_url IS 'Live URL of the published post, set after successful posting';

COMMENT ON TABLE social_post_reminders IS 'Non-Studio tier: manual-post reminders. When scheduled_at hits, user receives notification with copyable content. No Outstand involvement.';
