-- 006_role_workflows.sql
-- event_registrations is created in 001_init.sql. Reconcile additive fields here
-- instead of relying on CREATE TABLE IF NOT EXISTS, which would silently skip them.
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';


CREATE TABLE IF NOT EXISTS press_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  release_text text,
  credits text,
  contact_email text,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

CREATE TABLE IF NOT EXISTS designer_collection_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  profile_complete boolean NOT NULL DEFAULT false,
  look_order_complete boolean NOT NULL DEFAULT false,
  media_complete boolean NOT NULL DEFAULT false,
  commercial_data_complete boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','ready','locked','published')),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id,collection_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_status ON event_registrations(event_id,status);
CREATE INDEX IF NOT EXISTS idx_press_kits_event_status ON press_kits(event_id,status);
CREATE INDEX IF NOT EXISTS idx_designer_readiness_brand_status ON designer_collection_readiness(brand_id,status);
