-- 021_made_in_moscow_partner_program.sql
-- Verified programme affiliation and bounded cross-programme service moderation.

CREATE TABLE IF NOT EXISTS partner_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO partner_programs(external_key,name,status,metadata)
VALUES(
  'made_in_moscow',
  'Сделано в Москве',
  'active',
  '{"authority":"external_programme_roster","platform_role":"institutional_growth_partner"}'::jsonb
)
ON CONFLICT (external_key) DO UPDATE
SET name=EXCLUDED.name,status=EXCLUDED.status,metadata=partner_programs.metadata||EXCLUDED.metadata,updated_at=now();

CREATE TABLE IF NOT EXISTS brand_program_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES partner_programs(id) ON DELETE CASCADE,
  external_ref text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','revoked')),
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','suspended','revoked')),
  source_url text,
  source_snapshot_hash text,
  verified_at timestamptz,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id,program_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_program_membership_external_ref
  ON brand_program_memberships(program_id,external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brand_program_membership_status
  ON brand_program_memberships(program_id,status,moderation_status,updated_at DESC);

CREATE TABLE IF NOT EXISTS partner_service_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES partner_programs(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  applicant_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service_code text NOT NULL,
  event_brand text
    CHECK (event_brand IS NULL OR event_brand IN ('mfw','bfs','made_in_moscow')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','pending_review','approved','rejected','revoked','cancelled')),
  canonical_ref text,
  submitted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  moderation_note text,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_service_applications_program_status
  ON partner_service_applications(program_id,status,service_code,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_service_applications_brand
  ON partner_service_applications(brand_id,updated_at DESC)
  WHERE brand_id IS NOT NULL;
