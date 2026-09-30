-- 013_brand_crm.sql
CREATE TABLE IF NOT EXISTS brand_favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,brand_id)
);

CREATE TABLE IF NOT EXISTS brand_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  external_key text UNIQUE,
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'invitation' CHECK (campaign_type IN ('invitation','reward','showroom','market','launch')),
  segment jsonb NOT NULL DEFAULT '{"kind":"all_followers"}'::jsonb,
  channel text NOT NULL DEFAULT 'push' CHECK (channel IN ('push','in_app','email','mixed')),
  message_ru text NOT NULL DEFAULT '',
  message_en text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_campaign_audience (
  campaign_id uuid NOT NULL REFERENCES brand_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_reason jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshotted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(campaign_id,user_id)
);

CREATE TABLE IF NOT EXISTS brand_campaign_events (
  id bigserial PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES brand_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('queued','sent','opened','visit','qr_scan','claim','redeemed','purchase')),
  claim_id uuid REFERENCES loyalty_claims(id) ON DELETE SET NULL,
  location_type text CHECK (location_type IS NULL OR location_type IN ('market','showroom','event','online')),
  location_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES brand_campaigns(id) ON DELETE SET NULL,
  claim_id uuid REFERENCES loyalty_claims(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'RUB',
  location_type text NOT NULL DEFAULT 'market' CHECK (location_type IN ('market','showroom','event','online')),
  location_ref text,
  external_order_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_favorites_brand ON brand_favorites(brand_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_campaigns_brand ON brand_campaigns(brand_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_campaign_audience_campaign ON brand_campaign_audience(campaign_id,snapshotted_at);
CREATE INDEX IF NOT EXISTS idx_brand_campaign_events_campaign_type ON brand_campaign_events(campaign_id,event_type,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_purchases_brand_time ON brand_purchases(brand_id,purchased_at DESC);
