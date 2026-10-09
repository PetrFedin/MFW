-- 027_outbox_pg_boss_bridge.sql
-- Transactional outbox between MFW authorities and asynchronous pg-boss consumers.

CREATE TABLE IF NOT EXISTS authority_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  topic text NOT NULL,
  aggregate_type text,
  aggregate_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','dispatching','dispatched','failed')),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  pg_boss_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authority_outbox_pending_idx
  ON authority_outbox(status,available_at,created_at)
  WHERE status IN ('pending','failed');

CREATE INDEX IF NOT EXISTS authority_outbox_topic_idx
  ON authority_outbox(topic,created_at DESC);

CREATE TABLE IF NOT EXISTS authority_delivery_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL REFERENCES authority_outbox(id) ON DELETE RESTRICT,
  event_key text NOT NULL UNIQUE,
  topic text NOT NULL,
  consumer text NOT NULL,
  pg_boss_job_id uuid,
  payload_digest text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(outbox_id,consumer)
);

CREATE INDEX IF NOT EXISTS authority_delivery_receipts_topic_idx
  ON authority_delivery_receipts(topic,processed_at DESC);

ALTER TABLE authority_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_delivery_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON authority_outbox FROM anon, authenticated;
REVOKE ALL ON authority_delivery_receipts FROM anon, authenticated;

COMMENT ON TABLE authority_outbox IS
  'Transactional handoff written in the same DB transaction as authoritative domain mutations.';
COMMENT ON TABLE authority_delivery_receipts IS
  'Idempotent evidence that an async consumer processed an outbox event.';
