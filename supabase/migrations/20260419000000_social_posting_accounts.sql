-- Social posting: user_social_accounts table
-- Maps EchoMe users to Outstand social account IDs

CREATE TABLE user_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outstand_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_username TEXT,
  platform_avatar_url TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_social_accounts_user ON user_social_accounts(user_id);
ALTER TABLE user_social_accounts DISABLE ROW LEVEL SECURITY;
