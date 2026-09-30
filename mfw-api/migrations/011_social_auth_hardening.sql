-- 011_social_auth_hardening.sql
-- Make OAuth/OIDC callback state atomic, single-use and short-lived.

ALTER TABLE social_auth_flows
  DROP CONSTRAINT IF EXISTS social_auth_flows_status_check;

ALTER TABLE social_auth_flows
  ADD CONSTRAINT social_auth_flows_status_check
  CHECK (status IN ('pending','processing','completed','failed','expired'));

CREATE INDEX IF NOT EXISTS idx_social_auth_flows_terminal_cleanup
  ON social_auth_flows(completed_at)
  WHERE status IN ('completed','failed','expired');
