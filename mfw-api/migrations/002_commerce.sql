-- 002_commerce.sql
CREATE TABLE IF NOT EXISTS line_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'RUB',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, collection_id, version)
);

CREATE TABLE IF NOT EXISTS buyer_shortlist (
  buyer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_user_id, brand_id)
);

CREATE TABLE IF NOT EXISTS commerce_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  buyer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source text NOT NULL,
  stage text NOT NULL DEFAULT 'interest' CHECK (stage IN ('interest','shortlisted','meeting','follow_up','qualified','closed_won','closed_lost')),
  value_hint numeric,
  currency text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_sheets_brand_status ON line_sheets(brand_id,status);
CREATE INDEX IF NOT EXISTS idx_shortlist_buyer_created ON buyer_shortlist(buyer_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_leads_brand_stage ON commerce_leads(brand_id,stage);
CREATE INDEX IF NOT EXISTS idx_commerce_leads_buyer_stage ON commerce_leads(buyer_user_id,stage);
