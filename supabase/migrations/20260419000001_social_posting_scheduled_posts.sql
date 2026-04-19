-- Social posting: add Outstand columns to scheduled_posts table
-- Tracks scheduled/posted content with Outstand post IDs

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS outstand_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS media_urls TEXT[],
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analytics JSONB;

-- Backfill scheduled_at from existing scheduled_for where null
UPDATE scheduled_posts SET scheduled_at = scheduled_for WHERE scheduled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
ALTER TABLE scheduled_posts DISABLE ROW LEVEL SECURITY;
