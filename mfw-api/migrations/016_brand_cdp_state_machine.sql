-- 016_brand_cdp_state_machine.sql
-- Stateful journeys, prediction surfaces and acquisition-source economics.

ALTER TABLE brand_journeys ADD COLUMN IF NOT EXISTS holdout_pct numeric(5,2) NOT NULL DEFAULT 10 CHECK (holdout_pct>=0 AND holdout_pct<=50);
ALTER TABLE brand_journeys ADD COLUMN IF NOT EXISTS stop_conditions jsonb NOT NULL DEFAULT '{"on_purchase":true}'::jsonb;

ALTER TABLE brand_journey_enrollments ADD COLUMN IF NOT EXISTS experiment_group text NOT NULL DEFAULT 'treatment'
  CHECK (experiment_group IN ('treatment','holdout'));
ALTER TABLE brand_journey_enrollments ADD COLUMN IF NOT EXISTS next_run_at timestamptz;
ALTER TABLE brand_journey_enrollments ADD COLUMN IF NOT EXISTS branch_state jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE brand_customer_profiles ADD COLUMN IF NOT EXISTS churn_score numeric(6,5);
ALTER TABLE brand_customer_profiles ADD COLUMN IF NOT EXISTS predicted_clv numeric(14,2);
ALTER TABLE brand_customer_profiles ADD COLUMN IF NOT EXISTS next_best_action text;
ALTER TABLE brand_customer_profiles ADD COLUMN IF NOT EXISTS acquisition_source text;
ALTER TABLE brand_customer_profiles ADD COLUMN IF NOT EXISTS acquisition_cost numeric(14,2);

CREATE TABLE IF NOT EXISTS brand_acquisition_events (
  id bigserial PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source text NOT NULL,
  campaign_ref text,
  cost_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_amount>=0),
  currency text NOT NULL DEFAULT 'RUB',
  acquired_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_brand_journey_due ON brand_journey_enrollments(state,next_run_at)
  WHERE state='active';
CREATE INDEX IF NOT EXISTS idx_brand_customer_churn ON brand_customer_profiles(brand_id,churn_score DESC);
CREATE INDEX IF NOT EXISTS idx_brand_customer_nba ON brand_customer_profiles(brand_id,next_best_action);
CREATE INDEX IF NOT EXISTS idx_brand_acquisition_source ON brand_acquisition_events(brand_id,source,acquired_at DESC);
