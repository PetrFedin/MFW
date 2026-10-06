-- 024_capital_operator_admission.sql
-- Durable operator admission for Capital Authority.

CREATE TABLE IF NOT EXISTS capital_operator_grants (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  operator_role text NOT NULL CHECK (operator_role IN ('Organizer','Staff')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','revoked')),
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(evidence_refs)='array'),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_operator_grants_status
  ON capital_operator_grants(status,expires_at,updated_at DESC);

COMMENT ON TABLE capital_operator_grants IS
  'Server-side admission authority for human Capital Authority operators. Public demo sessions are never grants.';
