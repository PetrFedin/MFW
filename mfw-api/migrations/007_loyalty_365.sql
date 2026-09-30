-- 007_loyalty_365.sql
CREATE TABLE IF NOT EXISTS social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_user_id text NOT NULL,
  external_handle text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked')),
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  UNIQUE(user_id,platform,external_user_id)
);

CREATE TABLE IF NOT EXISTS brand_social_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  owner_type text NOT NULL CHECK (owner_type IN ('brand','mfw')),
  platform text NOT NULL,
  external_channel_id text NOT NULL,
  handle text,
  url text,
  verification_mode text NOT NULL DEFAULT 'api_current'
    CHECK (verification_mode IN ('api_current','membership_event','provider_joined_at','manual','unsupported')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(platform,external_channel_id)
);

CREATE TABLE IF NOT EXISTS social_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES brand_social_channels(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown','active','inactive','verification_unavailable')),
  first_verified_at timestamptz,
  provider_joined_at timestamptz,
  continuous_since timestamptz,
  last_verified_at timestamptz,
  last_lost_at timestamptz,
  proof_source text,
  proof_digest text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(user_id,channel_id)
);

CREATE TABLE IF NOT EXISTS social_membership_observations (
  id bigserial PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES social_memberships(id) ON DELETE CASCADE,
  is_active boolean,
  observed_at timestamptz NOT NULL DEFAULT now(),
  provider_joined_at timestamptz,
  source text NOT NULL,
  proof_digest text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS loyalty_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  description_ru text,
  description_en text,
  reward_type text NOT NULL CHECK (reward_type IN ('discount_percent','discount_amount','gift','early_access','experience')),
  reward_value numeric(14,2),
  reward_currency text,
  min_continuous_days integer NOT NULL DEFAULT 30 CHECK (min_continuous_days >= 0),
  stock_limit integer,
  per_user_limit integer NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','paused','ended')),
  terms_ru text,
  terms_en text,
  audience_scope jsonb NOT NULL DEFAULT '{"kind":"all_mfw"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_offer_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES loyalty_offers(id) ON DELETE CASCADE,
  requirement_type text NOT NULL CHECK (requirement_type IN ('registered_user','app_installed','mfw_social_follow','brand_social_follow','brand_follow_in_mfw','event_attended')),
  channel_id uuid REFERENCES brand_social_channels(id) ON DELETE CASCADE,
  min_continuous_days integer NOT NULL DEFAULT 0 CHECK (min_continuous_days >= 0),
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS loyalty_eligibility (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES loyalty_offers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'progress' CHECK (status IN ('progress','eligible','lost','claimed','expired')),
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  qualified_at timestamptz,
  last_evaluated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,offer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES loyalty_offers(id) ON DELETE CASCADE,
  claim_token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','redeemed','revoked','expired')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS brand_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,brand_id)
);

CREATE TABLE IF NOT EXISTS brand_content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('news','event','launch','editorial','offer','campaign')),
  title_ru text NOT NULL,
  title_en text NOT NULL,
  body_ru text,
  body_en text,
  image_url text,
  cta_label_ru text,
  cta_label_en text,
  cta_url text,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  audience_scope jsonb NOT NULL DEFAULT '{"kind":"brand_followers"}'::jsonb,
  placement_scope jsonb NOT NULL DEFAULT '["brand_profile","discover_feed"]'::jsonb,
  is_paid boolean NOT NULL DEFAULT false,
  sponsor_label_ru text,
  sponsor_label_en text,
  frequency_cap jsonb NOT NULL DEFAULT '{"per_user_per_7d":2}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','rejected','paused','ended')),
  moderation_note text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_memberships_user_status ON social_memberships(user_id,status,last_verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_offers_brand_status ON loyalty_offers(brand_id,status,starts_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_claims_user_status ON loyalty_claims(user_id,status,issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_posts_status_time ON brand_content_posts(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_posts_brand_status ON brand_content_posts(brand_id,status,published_at DESC);
