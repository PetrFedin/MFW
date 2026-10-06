-- 022_persistent_organisation_registry.sql
-- Persistent cross-event organisation identity for MFW / BFS / Made in Moscow.

CREATE TABLE IF NOT EXISTS professional_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  normalized_name text NOT NULL,
  organisation_type text NOT NULL DEFAULT 'brand'
    CHECK (organisation_type IN ('brand','buyer','media','institution','service_provider','education','government','other')),
  country_code char(2),
  city text,
  website text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','archived')),
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','submitted','verified','rejected','expired')),
  verification_source text,
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(normalized_name)
);

CREATE TABLE IF NOT EXISTS professional_organisation_memberships (
  organisation_id uuid NOT NULL REFERENCES professional_organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_title text,
  relationship_role text NOT NULL DEFAULT 'representative'
    CHECK (relationship_role IN ('owner','representative','buyer','speaker','delegate','media','staff','service_provider')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','revoked')),
  source text NOT NULL DEFAULT 'self_claim',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(organisation_id,user_id)
);

CREATE TABLE IF NOT EXISTS professional_organisation_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES professional_organisations(id) ON DELETE CASCADE,
  event_brand text NOT NULL CHECK (event_brand IN ('mfw','bfs','made_in_moscow')),
  event_ref text NOT NULL,
  participation_type text NOT NULL,
  status text NOT NULL DEFAULT 'recorded'
    CHECK (status IN ('recorded','verified','revoked')),
  source text NOT NULL,
  evidence_ref text,
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id,event_brand,event_ref,participation_type)
);

ALTER TABLE platform_registrations
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES professional_organisations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professional_organisations_type_status
  ON professional_organisations(organisation_type,status,canonical_name);
CREATE INDEX IF NOT EXISTS idx_professional_organisation_memberships_user
  ON professional_organisation_memberships(user_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_professional_organisation_participation_org
  ON professional_organisation_participation(organisation_id,event_brand,occurred_at DESC);

-- Backfill unique free-text organisation names from approved/submitted registrations.
-- They remain unverified until reviewed; this migration never upgrades a claim into verified truth.
INSERT INTO professional_organisations(canonical_name,normalized_name,organisation_type,metadata)
SELECT
  min(trim(organisation)) AS canonical_name,
  lower(regexp_replace(trim(organisation),'\s+',' ','g')) AS normalized_name,
  CASE
    WHEN lower(registration_type) LIKE '%buyer%' THEN 'buyer'
    WHEN lower(registration_type) LIKE '%media%' THEN 'media'
    WHEN lower(registration_type) LIKE '%speaker%' OR lower(registration_type) LIKE '%delegate%' THEN 'institution'
    ELSE 'brand'
  END AS organisation_type,
  jsonb_build_object('backfilledFrom','platform_registrations')
FROM platform_registrations
WHERE organisation IS NOT NULL AND length(trim(organisation)) >= 2
GROUP BY lower(regexp_replace(trim(organisation),'\s+',' ','g')),
  CASE
    WHEN lower(registration_type) LIKE '%buyer%' THEN 'buyer'
    WHEN lower(registration_type) LIKE '%media%' THEN 'media'
    WHEN lower(registration_type) LIKE '%speaker%' OR lower(registration_type) LIKE '%delegate%' THEN 'institution'
    ELSE 'brand'
  END
ON CONFLICT(normalized_name) DO NOTHING;

UPDATE platform_registrations pr
SET organisation_id=org.id
FROM professional_organisations org
WHERE pr.organisation_id IS NULL
  AND pr.organisation IS NOT NULL
  AND org.normalized_name=lower(regexp_replace(trim(pr.organisation),'\s+',' ','g'));
