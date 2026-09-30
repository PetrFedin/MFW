-- 003_sponsors.sql
CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'partner',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  season text NOT NULL,
  name text NOT NULL,
  objective text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  placement_type text NOT NULL,
  surface text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_interactions (
  id bigserial PRIMARY KEY,
  campaign_id uuid REFERENCES sponsor_campaigns(id) ON DELETE SET NULL,
  placement_id uuid REFERENCES sponsor_placements(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL,
  value numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_sponsor_status ON sponsor_campaigns(sponsor_id,status);
CREATE INDEX IF NOT EXISTS idx_sponsor_interactions_campaign_time ON sponsor_interactions(campaign_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_interactions_type_time ON sponsor_interactions(interaction_type,occurred_at DESC);
