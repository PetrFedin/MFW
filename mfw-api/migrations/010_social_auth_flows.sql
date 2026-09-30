-- 010_social_auth_flows.sql
-- Short-lived OAuth/OIDC state authority for Telegram Login and VK ID.

CREATE TABLE IF NOT EXISTS social_auth_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('telegram','vk')),
  state text NOT NULL UNIQUE,
  code_verifier text NOT NULL,
  nonce text,
  redirect_uri text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','expired')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_social_auth_flows_user_platform
  ON social_auth_flows(user_id,platform,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_auth_flows_pending_expiry
  ON social_auth_flows(status,expires_at)
  WHERE status='pending';
