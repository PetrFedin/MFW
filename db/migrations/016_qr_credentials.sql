BEGIN;

CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    pass_type TEXT NOT NULL,
    entitlements JSONB NOT NULL DEFAULT '[]'::jsonb,
    token_version INTEGER NOT NULL DEFAULT 1,
    nonce TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (valid_until > valid_from),
    UNIQUE(event_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_credentials_user_event
  ON credentials(user_id, event_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS access_scans (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    credential_id UUID REFERENCES credentials(id),
    gate_code TEXT NOT NULL,
    result TEXT NOT NULL,
    reason TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_scans_event_time
  ON access_scans(event_id, scanned_at DESC);

COMMIT;
