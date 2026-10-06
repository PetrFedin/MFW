-- 023_capital_authority.sql
-- Append-only programme capital authority with tamper-evident hash chain.

CREATE TABLE IF NOT EXISTS capital_ledger_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_key text NOT NULL,
  aggregate_type text NOT NULL
    CHECK (aggregate_type IN ('programme','portfolio_proposal','business_case','pilot')),
  aggregate_id text NOT NULL,
  aggregate_seq bigint NOT NULL CHECK (aggregate_seq > 0),
  event_type text NOT NULL
    CHECK (event_type IN (
      'REQUEST_RECORDED',
      'APPROVAL_RECORDED',
      'COMMITMENT_RECORDED',
      'RELEASE_RECORDED',
      'SPEND_RECORDED',
      'MEASUREMENT_RECORDED',
      'DECISION_RECORDED'
    )),
  actor_subject text NOT NULL,
  actor_role text NOT NULL,
  auth_method text NOT NULL DEFAULT 'session'
    CHECK (auth_method IN ('session','system')),
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  points numeric(14,2) CHECK (points IS NULL OR points >= 0),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(evidence_refs) = 'array'),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key text NOT NULL UNIQUE,
  request_id text,
  previous_event_hash text
    CHECK (previous_event_hash IS NULL OR previous_event_hash ~ '^[0-9a-f]{64}$'),
  event_hash text NOT NULL UNIQUE
    CHECK (event_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT uq_capital_ledger_aggregate_seq
    UNIQUE(programme_key,aggregate_type,aggregate_id,aggregate_seq)
);

CREATE INDEX IF NOT EXISTS idx_capital_ledger_aggregate
  ON capital_ledger_events(programme_key,aggregate_type,aggregate_id,aggregate_seq);

CREATE INDEX IF NOT EXISTS idx_capital_ledger_programme_time
  ON capital_ledger_events(programme_key,recorded_at,id);

CREATE INDEX IF NOT EXISTS idx_capital_ledger_event_type
  ON capital_ledger_events(event_type,recorded_at);

CREATE INDEX IF NOT EXISTS idx_capital_ledger_evidence_refs
  ON capital_ledger_events USING gin(evidence_refs);

CREATE OR REPLACE FUNCTION reject_capital_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'capital_ledger_is_append_only'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_capital_ledger_immutable ON capital_ledger_events;
CREATE TRIGGER trg_capital_ledger_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON capital_ledger_events
FOR EACH STATEMENT EXECUTE FUNCTION reject_capital_ledger_mutation();

COMMENT ON TABLE capital_ledger_events IS
  'Append-only capital authority. UPDATE/DELETE/TRUNCATE are rejected; projections are derived from events.';
COMMENT ON COLUMN capital_ledger_events.event_hash IS
  'SHA-256 hash over canonical event envelope including previous_event_hash.';
COMMENT ON COLUMN capital_ledger_events.evidence_refs IS
  'Immutable references/digests supporting this capital event; no mutable evidence payload is stored here.';
