-- 014_brand_crm_hardening.sql
-- Dynamic segments, scheduling, consent/frequency caps, POS imports and customer economics.

CREATE TABLE IF NOT EXISTS brand_saved_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  external_key text UNIQUE,
  name text NOT NULL,
  definition jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS saved_segment_id uuid REFERENCES brand_saved_segments(id) ON DELETE SET NULL;
ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS frequency_cap jsonb NOT NULL DEFAULT '{"per_user_per_7d":2}'::jsonb;
ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS require_marketing_consent boolean NOT NULL DEFAULT true;
ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE brand_campaigns ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE TABLE IF NOT EXISTS brand_order_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  import_source text NOT NULL DEFAULT 'manual' CHECK (import_source IN ('manual','csv','pos','api')),
  external_batch_ref text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','partial','failed')),
  row_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE brand_purchases ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES brand_order_imports(id) ON DELETE SET NULL;
ALTER TABLE brand_purchases ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE brand_purchases ADD COLUMN IF NOT EXISTS gross_amount numeric(14,2);
ALTER TABLE brand_purchases ADD COLUMN IF NOT EXISTS discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE brand_purchases ADD COLUMN IF NOT EXISTS sku_count integer NOT NULL DEFAULT 1 CHECK (sku_count > 0);

CREATE INDEX IF NOT EXISTS idx_brand_saved_segments_brand ON brand_saved_segments(brand_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_campaigns_schedule ON brand_campaigns(status,scheduled_at) WHERE status IN ('scheduled','sending');
CREATE INDEX IF NOT EXISTS idx_brand_order_imports_brand ON brand_order_imports(brand_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_purchases_user_time ON brand_purchases(user_id,purchased_at DESC) WHERE user_id IS NOT NULL;
