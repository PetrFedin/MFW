-- 015_brand_cdp.sql
-- Campaign experiments, RFM lifecycle and automated journeys.

ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS control_pct numeric(5,2) NOT NULL DEFAULT 10 CHECK (control_pct>=0 AND control_pct<=50);
ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS cost_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_amount>=0);
ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS cost_currency text NOT NULL DEFAULT 'RUB';

ALTER TABLE brand_campaign_audience ADD COLUMN IF NOT EXISTS experiment_group text NOT NULL DEFAULT 'treatment'
  CHECK (experiment_group IN ('treatment','control'));

CREATE TABLE IF NOT EXISTS brand_customer_profiles (
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recency_days integer,
  frequency_365d integer NOT NULL DEFAULT 0,
  monetary_365d numeric(14,2) NOT NULL DEFAULT 0,
  r_score integer CHECK (r_score BETWEEN 1 AND 5),
  f_score integer CHECK (f_score BETWEEN 1 AND 5),
  m_score integer CHECK (m_score BETWEEN 1 AND 5),
  lifecycle text NOT NULL DEFAULT 'prospect'
    CHECK (lifecycle IN ('prospect','new','active','loyal','at_risk','churned','reactivated')),
  last_purchase_at timestamptz,
  first_purchase_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(brand_id,user_id)
);

CREATE TABLE IF NOT EXISTS brand_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  external_key text UNIQUE,
  name text NOT NULL,
  trigger jsonb NOT NULL,
  steps jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  frequency_cap jsonb NOT NULL DEFAULT '{"per_user_per_30d":3}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_journey_enrollments (
  journey_id uuid NOT NULL REFERENCES brand_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','completed','suppressed','cancelled')),
  current_step integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  last_action_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(journey_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_customer_profiles_lifecycle ON brand_customer_profiles(brand_id,lifecycle,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_customer_profiles_rfm ON brand_customer_profiles(brand_id,r_score,f_score,m_score);
CREATE INDEX IF NOT EXISTS idx_brand_journeys_brand_status ON brand_journeys(brand_id,status,created_at DESC);
