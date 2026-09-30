-- 019_platform_registrations.sql
-- Separate event-brand application from registration to individual programme items.

CREATE TABLE IF NOT EXISTS platform_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_brand text NOT NULL CHECK (event_brand IN ('mfw','bfs')),
  registration_type text NOT NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','pending_review','approved','rejected','revoked','cancelled')),
  organisation text,
  job_title text,
  purpose text,
  confirmed_at timestamptz,
  submitted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,event_brand)
);

CREATE INDEX IF NOT EXISTS idx_platform_registrations_brand_status
  ON platform_registrations(event_brand,status,registration_type);
CREATE INDEX IF NOT EXISTS idx_platform_registrations_user
  ON platform_registrations(user_id,updated_at DESC);
