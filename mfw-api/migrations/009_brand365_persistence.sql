-- 009_brand365_persistence.sql
-- Stable public refs + production persistence for MFW Brand365 / Loyalty / Social Proof.

ALTER TABLE brands ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_brands_external_key
  ON brands(external_key) WHERE external_key IS NOT NULL;

ALTER TABLE brand_social_channels ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_social_channels_external_key
  ON brand_social_channels(external_key) WHERE external_key IS NOT NULL;

ALTER TABLE loyalty_offers ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_offers_external_key
  ON loyalty_offers(external_key) WHERE external_key IS NOT NULL;

ALTER TABLE brand_content_posts ADD COLUMN IF NOT EXISTS external_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_content_posts_external_key
  ON brand_content_posts(external_key) WHERE external_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios','android','pwa','investor_demo')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  installed_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id,installation_id)
);

CREATE TABLE IF NOT EXISTS brand_access (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  access_role text NOT NULL DEFAULT 'manager'
    CHECK (access_role IN ('owner','manager','editor','analyst')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,brand_id)
);

CREATE TABLE IF NOT EXISTS social_reverification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source text NOT NULL
    CHECK (trigger_source IN ('startup','interval','cron','admin','manual')),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','partial','failed','skipped')),
  checked_count integer NOT NULL DEFAULT 0,
  active_count integer NOT NULL DEFAULT 0,
  inactive_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_app_installations_user_status
  ON app_installations(user_id,status,last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_access_brand_status
  ON brand_access(brand_id,status);

CREATE INDEX IF NOT EXISTS idx_reverification_runs_started
  ON social_reverification_runs(started_at DESC);

-- Make one active social identity per provider per MFW user authoritative.
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_connections_user_platform_active
  ON social_connections(user_id,platform)
  WHERE status='active';
