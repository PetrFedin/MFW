CREATE TABLE IF NOT EXISTS professional_organisation_credential_revocations (
  credential_sha256 text PRIMARY KEY CHECK (credential_sha256 ~ '^[a-f0-9]{64}$'),
  organisation_id uuid NOT NULL REFERENCES professional_organisations(id) ON DELETE CASCADE,
  reason text NOT NULL,
  revoked_by text NOT NULL,
  revoked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_professional_organisation_credential_revocations_org
  ON professional_organisation_credential_revocations(organisation_id,revoked_at DESC);
